"""10 design presets — each mapped to one of 5 truly distinct template layouts.

The 5 templates are structurally different (not just color swaps):
- magazine  → drop-cap, 2-column body, ornaments, page numbers (Atlantic vibe)
- report    → diagonal cover, sidebar stats, mono numerics (Annual report vibe)
- bold      → vivid shapes cover, big colored sections, big numbered bullets (Brand deck)
- minimal   → no cover, single-page mono, hairline dividers (Linear/Notion doc)
- organic   → blob shapes, soft rounded cards, italic serifs (Etsy/Substack)

Same data → completely different look. Color variations within each template
family make the 10 presets feel distinct.
"""

DESIGN_PRESETS: dict[str, dict] = {
    # ============ MAGAZINE family ============
    "editorial_cream": {
        "name": "Editorial Cream",
        "tagline": "Magazine serif, warm earth tones",
        "template": "magazine",
        "vibe": "editorial",
        "background": "#F2EDE3",
        "primary": "#1B1612",
        "accent": "#C2410C",
        "ink": "#2A211B",
        "muted": "#8B7E70",
        "display_font": "serif",
        "reasoning": "Magazine-style serif with warm earth tones",
    },
    "magazine_burgundy": {
        "name": "Magazine Burgundy",
        "tagline": "Old-world serif, deep red",
        "template": "magazine",
        "vibe": "editorial",
        "background": "#F7F1E8",
        "primary": "#7F1D1D",
        "accent": "#B45309",
        "ink": "#1C0F0A",
        "muted": "#8B7E70",
        "display_font": "serif",
        "reasoning": "Old-world magazine with deep red and antique gold",
    },

    # ============ REPORT family ============
    "corporate_indigo": {
        "name": "Corporate Indigo",
        "tagline": "Clean sans, professional indigo",
        "template": "report",
        "vibe": "corporate",
        "background": "#FFFFFF",
        "primary": "#1E1B4B",
        "accent": "#6366F1",
        "ink": "#0F172A",
        "muted": "#6B7280",
        "display_font": "sans",
        "reasoning": "Clean sans with professional indigo accent",
    },
    "premium_noir": {
        "name": "Premium Noir",
        "tagline": "Black + gold, luxury brand",
        "template": "report",
        "vibe": "minimal",
        "background": "#0A0A0A",
        "primary": "#FFFFFF",
        "accent": "#D4AF37",
        "ink": "#F5F5F0",
        "muted": "#737373",
        "display_font": "serif",
        "reasoning": "Pure black + gold for a premium luxury feel",
    },

    # ============ BOLD family ============
    "playful_violet": {
        "name": "Playful Violet",
        "tagline": "Vibrant pop, bold contrast",
        "template": "bold",
        "vibe": "playful",
        "background": "#FFFCEE",
        "primary": "#7C3AED",
        "accent": "#EC4899",
        "ink": "#1A0033",
        "muted": "#9F7AEA",
        "display_font": "sans",
        "reasoning": "Vibrant violet + pink, energetic startup",
    },
    "studio_yellow": {
        "name": "Studio Yellow",
        "tagline": "High-contrast black + yellow",
        "template": "bold",
        "vibe": "playful",
        "background": "#FACC15",
        "primary": "#000000",
        "accent": "#000000",
        "ink": "#000000",
        "muted": "#525252",
        "display_font": "sans",
        "reasoning": "Bold black on saturated yellow with strong type",
    },
    "startup_lime": {
        "name": "Startup Lime",
        "tagline": "Dark mode + neon lime",
        "template": "bold",
        "vibe": "playful",
        "background": "#0A0F0A",
        "primary": "#84CC16",
        "accent": "#FACC15",
        "ink": "#F0FDF4",
        "muted": "#65A30D",
        "display_font": "sans",
        "reasoning": "Dark mode with neon lime — energetic startup",
    },

    # ============ MINIMAL family ============
    "minimal_mono": {
        "name": "Minimal Mono",
        "tagline": "Monospace, maximum whitespace",
        "template": "minimal",
        "vibe": "minimal",
        "background": "#FAFAFA",
        "primary": "#0A0A0A",
        "accent": "#525252",
        "ink": "#171717",
        "muted": "#A3A3A3",
        "display_font": "mono",
        "reasoning": "Terminal-inspired monospace, lots of breathing room",
    },
    "tech_dark": {
        "name": "Tech Dark",
        "tagline": "Terminal cyan on near-black",
        "template": "minimal",
        "vibe": "minimal",
        "background": "#0A0A0F",
        "primary": "#06B6D4",
        "accent": "#22D3EE",
        "ink": "#F1F5F9",
        "muted": "#64748B",
        "display_font": "mono",
        "reasoning": "Dark terminal vibes with neon cyan accent",
    },

    # ============ ORGANIC family ============
    "warm_terracotta": {
        "name": "Warm Terracotta",
        "tagline": "Earthy clay, organic shapes",
        "template": "organic",
        "vibe": "warm",
        "background": "#FBEEE3",
        "primary": "#7C2D12",
        "accent": "#EA580C",
        "ink": "#431407",
        "muted": "#A8826D",
        "display_font": "serif",
        "reasoning": "Earthy terracotta tones with organic blob shapes",
    },
}


def get_preset(key: str) -> dict | None:
    """Return a design dict for a preset key, or None if invalid."""
    p = DESIGN_PRESETS.get(key)
    if not p:
        return None
    return {k: v for k, v in p.items() if k not in ("name", "tagline")}


def get_preset_template(key: str) -> str | None:
    """Return the template filename for a preset (or None for default)."""
    p = DESIGN_PRESETS.get(key)
    if not p:
        return None
    tpl = p.get("template")
    return f"presets/{tpl}.html" if tpl else None
