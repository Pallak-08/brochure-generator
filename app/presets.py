"""10 hand-tuned design presets the user can pick instead of letting the AI choose.

Each preset is a complete `design` dict ready to drop into render_pdf().
Different vibes, color combos, and typography pairings — the goal is for
each preset to feel like a meaningfully different brochure.
"""

DESIGN_PRESETS: dict[str, dict] = {
    "editorial_cream": {
        "name": "Editorial Cream",
        "tagline": "Magazine serif, warm earth tones",
        "vibe": "editorial",
        "background": "#F2EDE3",
        "primary": "#1B1612",
        "accent": "#C2410C",
        "ink": "#2A211B",
        "muted": "#8B7E70",
        "display_font": "serif",
        "reasoning": "Magazine-style serif with warm earth tones",
    },
    "corporate_indigo": {
        "name": "Corporate Indigo",
        "tagline": "Clean sans, professional indigo",
        "vibe": "corporate",
        "background": "#FFFFFF",
        "primary": "#1E1B4B",
        "accent": "#6366F1",
        "ink": "#0F172A",
        "muted": "#6B7280",
        "display_font": "sans",
        "reasoning": "Clean sans with professional indigo accent",
    },
    "playful_violet": {
        "name": "Playful Violet",
        "tagline": "Vibrant pop, bold contrast",
        "vibe": "playful",
        "background": "#FFFCEE",
        "primary": "#7C3AED",
        "accent": "#EC4899",
        "ink": "#1A0033",
        "muted": "#9F7AEA",
        "display_font": "sans",
        "reasoning": "Vibrant violet + pink, energetic startup",
    },
    "minimal_mono": {
        "name": "Minimal Mono",
        "tagline": "Monospace, maximum whitespace",
        "vibe": "minimal",
        "background": "#FAFAFA",
        "primary": "#0A0A0A",
        "accent": "#525252",
        "ink": "#171717",
        "muted": "#A3A3A3",
        "display_font": "mono",
        "reasoning": "Terminal-inspired monospace, lots of breathing room",
    },
    "warm_terracotta": {
        "name": "Warm Terracotta",
        "tagline": "Earthy clay, organic shapes",
        "vibe": "warm",
        "background": "#FBEEE3",
        "primary": "#7C2D12",
        "accent": "#EA580C",
        "ink": "#431407",
        "muted": "#A8826D",
        "display_font": "serif",
        "reasoning": "Earthy terracotta tones with organic blob shapes",
    },
    "tech_dark": {
        "name": "Tech Dark",
        "tagline": "Terminal cyan on near-black",
        "vibe": "minimal",
        "background": "#0A0A0F",
        "primary": "#06B6D4",
        "accent": "#22D3EE",
        "ink": "#F1F5F9",
        "muted": "#64748B",
        "display_font": "mono",
        "reasoning": "Dark terminal vibes with neon cyan accent",
    },
    "studio_yellow": {
        "name": "Studio Yellow",
        "tagline": "High-contrast black + yellow",
        "vibe": "playful",
        "background": "#FFFFFF",
        "primary": "#000000",
        "accent": "#FACC15",
        "ink": "#000000",
        "muted": "#525252",
        "display_font": "serif",
        "reasoning": "Bold black + yellow with editorial serif type",
    },
    "magazine_burgundy": {
        "name": "Magazine Burgundy",
        "tagline": "Old-world serif, deep red",
        "vibe": "editorial",
        "background": "#F7F1E8",
        "primary": "#7F1D1D",
        "accent": "#B45309",
        "ink": "#1C0F0A",
        "muted": "#8B7E70",
        "display_font": "serif",
        "reasoning": "Old-world magazine with deep red and antique gold",
    },
    "startup_lime": {
        "name": "Startup Lime",
        "tagline": "Dark mode + neon lime",
        "vibe": "playful",
        "background": "#0A0F0A",
        "primary": "#84CC16",
        "accent": "#FACC15",
        "ink": "#F0FDF4",
        "muted": "#65A30D",
        "display_font": "sans",
        "reasoning": "Dark mode with neon lime — energetic startup",
    },
    "premium_noir": {
        "name": "Premium Noir",
        "tagline": "Black + gold, luxury brand",
        "vibe": "minimal",
        "background": "#000000",
        "primary": "#FFFFFF",
        "accent": "#D4AF37",
        "ink": "#FFFFFF",
        "muted": "#A1A1AA",
        "display_font": "serif",
        "reasoning": "Pure black + gold for a premium luxury feel",
    },
}


def get_preset(key: str) -> dict | None:
    """Return a design dict for a preset key, or None if invalid."""
    p = DESIGN_PRESETS.get(key)
    if not p:
        return None
    # Strip frontend-only fields when returning for render
    return {k: v for k, v in p.items() if k not in ("name", "tagline")}
