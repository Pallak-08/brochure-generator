"""Gemini calls with model fallback + retry. Owns prompts."""
import json
import os
import time
from functools import lru_cache
from google import genai

from app.scraper import Website
from app.design import extract_palette

# Order matters: try the most capable first, fall back to lighter models
# that get hit less and almost never 503 under normal load.
MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite-001",
]

LINK_FILTER_PROMPT = """You are given a list of links found on a company website.
Decide which links are most relevant for building a marketing brochure about the company.

KEEP links like: About, Team, Careers, Products, Services, Mission, Customers, Case Studies.
SKIP links like: Terms of Service, Privacy, Login, Sign up, social media (twitter/linkedin/etc), \
individual blog posts, anchor links (#section), email/tel links.

Respond ONLY with JSON:
{ "links": [ {"type": "about page", "url": "https://full.url/about"} ] }

Absolute URLs. At most 5 links."""

BROCHURE_AND_DESIGN_PROMPT = """You are a senior brand designer and copywriter. You are given:
1. SCRAPED CONTENT from a company's website
2. EXTRACTED COLORS from the actual site's CSS (frequency-ordered)
3. EXTRACTED FONT NAMES used on the site

Your job has two parts:

A) **Write the brochure copy** — concrete, brand-true facts. No marketing fluff.

B) **Design a brochure that is unmistakably THIS specific company.**

CRITICAL DESIGN RULES — read carefully, this is where AI usually fails:

1. **YOU MUST USE THE EXTRACTED COLORS.** They are the brand's actual hex codes
   from the site's CSS. Do NOT invent generic schemes. Do NOT default to navy +
   coral pink just because it "looks safe". If the palette gives you `["#d97757",
   "#e8e6dc", "#b0aea5"]`, your brochure MUST use those exact codes as
   primary/accent/background. Inventing your own colors when the palette has
   real ones is the #1 failure mode — don't do it.

2. **MAP EXTRACTED COLORS TO ROLES EXPLICITLY:**
   - The most saturated chromatic color in the extracted palette → `accent`
     (used for CTAs, eyebrows, splash shapes — must POP)
   - The next chromatic color OR a brand dark → `primary` (heading + key blocks)
   - The lightest near-white or cream in the palette → `background`
   - A near-black tint of the brand → `ink` (NEVER a light grey like #5d6c7b)

3. **EXAMPLES with real extracted palettes:**
   - Anthropic palette `["#3898ec","#d97757","#e8e6dc","#b0aea5"]` →
     bg `#e8e6dc`, primary `#1B1612` (dark on cream), accent `#d97757` (their orange),
     ink `#2A211B`. NEVER pick the blue #3898ec as primary — it's not the brand.
   - Stripe palette `["#635bff","#5469d4"]` → primary `#635bff` (full indigo),
     bg white, ink near-black.
   - StudyByU (educational, blues + warm coral) → use their actual blue + coral
     from extracted palette, NOT invented navy + pink.

4. **BACKGROUND COLOR SETS THE MOOD.**
   - Cream/warm sites → cream background (#F5EFE3-ish)
   - Tech/clean sites → pure white or very light grey
   - Dark mode brands (Linear, Vercel) → near-black background, light ink
   - Bold/playful brands → can use a saturated background

5. **PICK VIBE BASED ON THE BRAND**, not on what you think looks nice. Each vibe TOTALLY changes the layout:
   - "minimal":   no cover page, all content on one page, lots of whitespace, mono/sans (Linear, Notion, Vercel)
   - "editorial": magazine layout, big serif display, drop cap feel (Anthropic, The Browser Company, Stripe Press)
   - "playful":   full-bleed vivid color cover with multiple geometric shapes (Figma, Replit, Framer)
   - "corporate":structured grid, clean sans, no decoration (Stripe, AWS, IBM, banks)
   - "warm":     organic blob shapes, cream paper, soft serif (Etsy, Substack, Mailchimp)

Respond ONLY with JSON:
{
  "brochure": {
    "company_name": "...",
    "tagline": "one punchy sentence",
    "about": "2-3 sentences",
    "what_we_do": ["bullet", "bullet", "bullet"],
    "why_us": ["bullet", "bullet", "bullet"],
    "culture": "2-3 sentences",
    "careers": "1-2 sentences",
    "call_to_action": "one sentence"
  },
  "design": {
    "vibe": "minimal | editorial | playful | corporate | warm",
    "background": "#hex (paper / page background)",
    "primary":    "#hex (dominant brand color — headings + key blocks)",
    "accent":     "#hex (highlight color — CTAs, eyebrows, splash shapes)",
    "ink":        "#hex (body text — near-black, NEVER a light grey)",
    "muted":      "#hex (captions and dividers)",
    "display_font": "serif | sans | mono",
    "reasoning":  "one sentence on why these choices make it FEEL like this brand"
  }
}

USE COLORS FROM THE EXTRACTED PALETTE when they exist — they are the brand's actual colors. Pick them BOLDLY. If the palette is empty, infer from the brand's category and copy tone."""


@lru_cache(maxsize=1)
def _client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set in environment")
    return genai.Client(api_key=api_key)


def llm_json(prompt_parts: list) -> dict:
    """Call Gemini with JSON mode. Falls back through MODELS and retries on 503.

    Strategy: 2 attempts per model with 3s, 6s backoff, then move to next model
    in MODELS. Worst case across 5 models = ~45s before giving up. The lighter
    models near the end of the list almost never 503 under peak load so we
    usually succeed within a few seconds.
    """
    last_err = None
    for model in MODELS:
        for attempt in range(2):
            try:
                r = _client().models.generate_content(
                    model=model,
                    contents=list(prompt_parts),
                    config={"response_mime_type": "application/json"},
                )
                return json.loads(r.text)
            except Exception as e:
                last_err = e
                msg = str(e)
                if "503" in msg or "UNAVAILABLE" in msg or "overloaded" in msg.lower():
                    time.sleep(3 * (attempt + 1))  # 3s, 6s
                    continue
                break  # non-retryable error — skip to next model
    raise last_err


def pick_links(site: Website) -> dict:
    user_prompt = (
        f"Website: {site.url}\n\n"
        "Links found on this page:\n" + "\n".join(site.links)
    )
    return llm_json([LINK_FILTER_PROMPT, user_prompt])


def gather_content(root_url: str) -> str:
    """Scrape landing + LLM-picked relevant pages. Return one big string."""
    site = Website(root_url)
    parts = [f"=== Landing page ===\n{site.contents()}"]
    picked = pick_links(site)
    for link in picked.get("links", []):
        try:
            page = Website(link["url"])
            parts.append(f"\n=== {link['type']} ===\n{page.contents()}")
        except Exception as e:
            print(f"  skipped {link['url']}: {e}")
    return "\n".join(parts)


def generate_brochure_with_design(url: str) -> dict:
    """Returns {'brochure': {...}, 'design': {...}, 'palette_extracted': {...}}."""
    content = gather_content(url)[:20000]
    palette = extract_palette(url)

    palette_summary = (
        f"Extracted background: {palette['background']}\n"
        f"Extracted chromatic colors (most-used first): {', '.join(palette['palette']) or 'none'}\n"
        f"Fonts spotted on site: {', '.join(palette['fonts']) or 'none'}\n"
    )

    result = llm_json([
        BROCHURE_AND_DESIGN_PROMPT,
        f"=== SCRAPED CONTENT ===\n{content}\n\n=== SITE DESIGN HINTS ===\n{palette_summary}",
    ])

    # Always include what we extracted — useful for debugging and for the frontend.
    result["palette_extracted"] = palette
    return result
