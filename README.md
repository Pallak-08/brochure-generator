# AI Brochure Generator

> Paste any company URL. Get a styled PDF brochure that actually looks like the brand.

**[Try the live demo →](https://brochure-generator-silk.vercel.app)**

The brochure isn't picked from a template gallery. The system scrapes the target site's CSS for real hex codes, asks Gemini to pick a vibe and assign colors to roles (background / primary / accent / text), and renders a PDF with those choices baked in. Same one-paragraph prompt, totally different output per brand.

| Anthropic | Stripe | Linear |
| --- | --- | --- |
| cream + warm orange + serif | indigo + white + clean sans | dark mode + violet + monospace |

Built in ~24 hours as a portfolio project. Costs $0 to run (all free tiers).

---

## What it does

1. You paste a company URL
2. Pick a design preset (10 hand-tuned options) **or** let the AI choose based on the brand
3. Backend scrapes the homepage, extracts the real CSS color palette, asks Gemini to write brochure copy and pick a design spec
4. WeasyPrint renders a styled A4 PDF in those exact brand colors
5. PDF embedded inline in a preview pane on the result page
6. Edit any text field, swap the vibe / font / colors, hit "Apply changes" → re-renders in seconds
7. Download the PDF

---

## Stack

| Layer | Tech | Why |
| --- | --- | --- |
| Scraping | `requests` + `BeautifulSoup` | stdlib-friendly, no JS rendering needed for marketing sites |
| Palette extraction | regex over fetched CSS | turns LLM guessing into selection from real hex codes |
| LLM | Google Gemini 2.5 Flash | free tier, JSON-mode for structured output, 5-model fallback list for 503s |
| Backend | FastAPI + Uvicorn (Docker) | fast to ship, automatic OpenAPI, fits Render free tier |
| PDF rendering | WeasyPrint | pure Python, no bundled Chromium, fits Render free tier RAM |
| Storage | Supabase Storage | private bucket + 7-day signed URLs, survives Render's ephemeral filesystem |
| Frontend | Next.js 16 + React 19 + Tailwind 4 | App Router, server component for layout + one client component for the editor |
| Backend host | Render free tier | Docker deploys, $0, sleeps after 15 min idle (~30 s cold start) |
| Frontend host | Vercel free tier | first-class Next.js, auto-deploy on `git push` |

---

## Architecture

```
  User browser
        │
        │  POST /generate { url, preset? }
        ▼
┌────────────────────────────┐
│  Vercel (Next.js)          │   static, fast
│  brochure-generator-silk   │
└────────────────────────────┘
        │
        │  CORS POST
        ▼
┌─────────────────────────────────────────┐
│  Render (FastAPI + Docker)              │
│                                         │
│  1. scrape homepage (BeautifulSoup)     │
│  2. LLM picks 5 relevant links          │
│  3. scrape those linked pages too       │
│  4. extract CSS palette from all CSS    │
│  5. Gemini → brochure copy + design     │
│  6. WeasyPrint → A4 PDF                 │
│  7. upload PDF to Supabase Storage      │
│  8. return signed URL + JSON            │
└─────────────────────────────────────────┘
        │                       │
        ▼                       ▼
┌──────────────┐    ┌────────────────────┐
│  Gemini API  │    │  Supabase Storage  │
│  2.5 Flash   │    │  brochures/        │
└──────────────┘    └────────────────────┘
```

---

## Key features

### Real palette extraction

The biggest design decision in the project. The first version asked Gemini "design a brochure for $COMPANY" and got generic navy + coral every time. The fix:

```python
# app/design.py — actual code, simplified
HEX_RE = re.compile(r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")
RGB_RE = re.compile(r"rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})...\)")

def extract_palette(url):
    css = fetch_homepage_and_all_linked_stylesheets(url)
    colors = Counter()
    for m in HEX_RE.findall(css):  colors[normalize(m)] += 1
    for r,g,b in RGB_RE.findall(css): colors[rgb_to_hex(r,g,b)] += 1
    # filter near-greyscale, dedupe near-neighbors, return top 8 chromatic
```

The LLM then gets those exact hex codes in its prompt with an instruction: "USE THESE COLORS. Map the most saturated chromatic one to `accent`. Pick the lightest near-white as `background`. Do not invent generic schemes." Anthropic now reliably comes out as the cream + warm orange you'd recognize from anthropic.com.

### Five distinct template layouts

Each preset doesn't just swap colors — it picks one of 5 fundamentally different HTML layouts:

| Template | Cover | Body | Used by |
| --- | --- | --- | --- |
| `magazine` | Centered serif italic title, ornaments | 2-col drop-cap body, numbered serif lists | editorial_cream, magazine_burgundy |
| `report` | Diagonal split, massive ghost year number | § markers, 3-stat strip, side-by-side blocks | corporate_indigo, premium_noir |
| `bold` | Full-bleed vibrant cover with 3 shapes | Dark "About" hero, big circle-numbered bullets | playful_violet, studio_yellow, startup_lime |
| `minimal` | No cover page | Single-page, mono labels, hairline dividers, dash bullets | minimal_mono, tech_dark |
| `organic` | Irregular border-radius blob shapes | Soft rounded cards, petal bullets, dashed dividers | warm_terracotta |

### Live editor

Left column: design controls (vibe, font, color pickers, palette swatches you can click to assign as primary/accent) + text editors for every brochure field. Right column: live PDF preview iframe. "Apply changes" POSTs the current state to `/runs/{id}/rerender`, gets back a fresh signed URL, and the iframe key bumps to force a remount with the new PDF. The backend stays stateless — the client owns the brochure state and sends it back on each re-render.

### Five-model Gemini fallback

```python
MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite-001",
]
```

On `503 UNAVAILABLE` (Gemini overload spikes), retry the same model twice with 3 s and 6 s backoff, then fall through to the next. The lighter models near the end of the list rarely hit overload, so we usually succeed within a few seconds even under peak Gemini load.

---

## Real bugs and what I learned

A curated subset — the full catalog (11 bugs) is in the [Notion technical guide](https://app.notion.com/p/37a35bb32c538196bb91c389cd59605b).

1. **`gemini-2.0-flash: limit 0`** — Google quietly removed `gemini-2.0-flash` from the free tier. `limit: 0` is the giveaway for tier issues, not usage issues. Fixed by switching to `gemini-2.5-flash` as primary.
2. **PDF iframe blank in Safari** — FastAPI's `FileResponse(..., filename="x.pdf")` sets `Content-Disposition: attachment`, which Safari interprets as "don't render inline." Fixed by manually setting `Content-Disposition: inline`.
3. **Cross-origin `<a download>` ignored** — browsers silently drop the `download` attribute for cross-origin URLs. Our PDFs are on `supabase.co`, the page is on `vercel.app`. Fixed by fetching the PDF as a blob and triggering download via `URL.createObjectURL`.
4. **Title hidden behind decorative blob** — the cover title had `z-index: 3` but no `position` set. `z-index` only applies to positioned elements. Fixed by adding `position: relative`. Classic CSS gotcha.
5. **Vercel 404 after deploy** — build succeeded but the framework preset was still "Other" (not Next.js). Vercel had no idea how to route the build output. Fixed in project settings, redeployed.
6. **WeasyPrint can't find libgobject** — on macOS the Homebrew libs live at `/opt/homebrew/lib`, which Python's cffi doesn't check by default. Fixed by setting `DYLD_FALLBACK_LIBRARY_PATH` in `run.sh`. On Render's Linux, apt-installed libs are in standard paths.

---

## Local setup

```bash
# Backend
git clone https://github.com/Pallak-08/brochure-generator.git
cd brochure-generator
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# macOS only — WeasyPrint system deps:
brew install pango cairo gdk-pixbuf

# Create .env at the project root with:
#   GEMINI_API_KEY=your_key            (free at aistudio.google.com/apikey)
#   SUPABASE_URL=https://...supabase.co
#   SUPABASE_SERVICE_KEY=eyJ...        (service_role JWT, not anon)

./run.sh                # starts FastAPI on :8000

# Frontend (separate terminal)
cd web
npm install
npm run dev             # starts Next.js on :3000
```

Open `http://localhost:3000`. Paste any URL, pick a preset, generate.

---

## Project structure

```
brochure_generator/
├── app/
│   ├── main.py            FastAPI routes
│   ├── scraper.py         BeautifulSoup Website class
│   ├── design.py          CSS palette extraction
│   ├── llm.py             Gemini wrapper + prompts + model fallback
│   ├── pdf.py             WeasyPrint renderer + template picker
│   ├── storage.py         Supabase Storage wrapper
│   ├── presets.py         10 hand-tuned design presets → 5 templates
│   └── templates/
│       ├── brochure.html         adaptive template for AI option
│       └── presets/
│           ├── magazine.html
│           ├── report.html
│           ├── bold.html
│           ├── minimal.html
│           └── organic.html
├── web/                   Next.js frontend
│   └── app/
│       ├── layout.tsx
│       ├── globals.css
│       └── page.tsx       state machine + landing + editor (one file)
├── Dockerfile             Render deploy
├── render.yaml            Render service config
├── requirements.txt
├── run.sh                 local dev launcher (sets DYLD path for WeasyPrint)
└── brochure_generator.ipynb   the original phase 1 Jupyter prototype
```

---

## What I'd do with more time

- **Pixel-sample the actual rendered page** for palette extraction. Catches inline-style colors set by JS that CSS parsing misses.
- **Let an LLM generate the HTML/CSS itself**, not just the design spec. With a stronger model (Claude Sonnet, GPT-4) I could ask for a custom WeasyPrint-compatible document per brand — truly one-of-a-kind output.
- **Real Postgres for runs** instead of JSON files. Build a "recent brochures" gallery, anonymous user accounts.
- **Logo extraction** from favicon / `<img>` with `logo` in the class name, place on the cover.
- **Caching by URL** — same URL within 24 h returns the same result without re-running the pipeline.
- **Tests** — `pytest` for the LLM wrapper (mocked) + Playwright smoke test for the frontend.

---

## Heads up

The backend lives on Render's free tier, which sleeps after 15 minutes of inactivity. **The first request after idle takes ~30 seconds to cold-start.** The loading screen narrates 7 steps over ~20 seconds to cover this — by the time the "Render is rendering the PDF…" message shows, the backend is usually awake.

---

Built by [Pallak Khullar](https://github.com/Pallak-08).
