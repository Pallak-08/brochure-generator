"""Gemini calls with model fallback + retry. Owns prompts."""
import json
import os
import time
from functools import lru_cache
from google import genai

from app.scraper import Website
from app.design import extract_palette

MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]

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
2. EXTRACTED COLORS from the actual site's CSS
3. EXTRACTED FONT NAMES used on the site

Your job has two parts:

A) **Write the brochure copy** — concrete, brand-true facts. No marketing fluff.

B) **Design a brochure that matches THIS specific company's vibe.**
   Anthropic is calm, scholarly, beige/cream/black with warm accents — NOT loud or playful.
   Stripe is bold, technical, indigo + black + white — clean and engineering-led.
   Etsy is warm, hand-crafted, orange + cream — friendly and organic.
   Linear is dark, minimal, near-monochrome with violet — premium and quiet.

   Use the EXTRACTED COLORS as your primary inspiration. Pick the ones that genuinely \
represent the brand. If the site is mostly beige and black, the brochure must be beige and black.

   The "vibe" you choose controls layout: choose ONE of:
   - "minimal":   lots of whitespace, mono/sans typography, restrained accents (Linear, Notion)
   - "editorial": serif display, magazine layout, premium feel (Anthropic, The Browser Company)
   - "playful":   bold blocks, vibrant colors, geometric shapes (Figma, Replit, Vercel)
   - "corporate":clean sans, structured grid, navy/grey palette (Stripe, AWS, IBM)
   - "warm":     cream + earthy accents, soft serifs, organic shapes (Etsy, Substack)

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
    "background": "#hex — main paper color (often near-white or cream)",
    "primary":    "#hex — dominant brand color used for headings and key blocks",
    "accent":     "#hex — secondary color for highlights and CTAs",
    "ink":        "#hex — body text color (usually near-black or deep brown)",
    "muted":      "#hex — captions and dividers",
    "display_font": "serif | sans | mono",
    "reasoning":  "one sentence on why these choices match the brand"
  }
}

Use real hex codes from the extracted palette when possible. If the palette is empty or thin, pick colors that match the brand vibe based on the scraped content."""


@lru_cache(maxsize=1)
def _client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set in environment")
    return genai.Client(api_key=api_key)


def llm_json(prompt_parts: list) -> dict:
    """Call Gemini with JSON mode. Falls back through MODELS and retries on 503."""
    last_err = None
    for model in MODELS:
        for attempt in range(3):
            try:
                r = _client().models.generate_content(
                    model=model,
                    contents=list(prompt_parts),
                    config={"response_mime_type": "application/json"},
                )
                return json.loads(r.text)
            except Exception as e:
                last_err = e
                if "503" in str(e) or "UNAVAILABLE" in str(e):
                    time.sleep(2 + attempt * 2)
                    continue
                break  # non-retryable: try next model
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
