"""Render a brochure dict + design spec to PDF via WeasyPrint.

Two paths:
- Default (no preset): use the adaptive `brochure.html` template that morphs
  based on vibe class — used by the AI-design option.
- Preset specified: pick one of the 5 distinct preset templates
  (magazine/report/bold/minimal/organic) based on the preset name.

Each preset template has a totally different layout — they're not just
color swaps, they're structurally different brochures.
"""
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

TEMPLATE_DIR = Path(__file__).parent / "templates"

DEFAULT_DESIGN = {
    "vibe": "corporate",
    "background": "#FFFFFF",
    "primary":    "#0F172A",
    "accent":     "#EA580C",
    "ink":        "#111111",
    "muted":      "#6B7280",
    "display_font": "sans",
    "reasoning":  "",
}

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape(["html"]),
)


def render_pdf(
    brochure: dict,
    design: dict,
    source_url: str,
    output_path: Path,
    template_name: str | None = None,
) -> Path:
    """Render brochure + design spec to a PDF file.

    Args:
        brochure: JSON dict from the LLM (company_name, tagline, etc.)
        design:   JSON dict from the LLM (vibe, palette, display_font)
        source_url: original URL — printed in headers/footers
        output_path: where to write the PDF
        template_name: e.g. "presets/bold.html" for a specific preset template,
            or None to use the adaptive default template
    """
    merged = {**DEFAULT_DESIGN, **(design or {})}
    tpl_name = template_name or "brochure.html"
    tpl = _env.get_template(tpl_name)
    html_str = tpl.render(
        company_name=brochure.get("company_name", "Untitled"),
        tagline=brochure.get("tagline", ""),
        about=brochure.get("about", ""),
        what_we_do=brochure.get("what_we_do", []),
        why_us=brochure.get("why_us", []),
        culture=brochure.get("culture", ""),
        careers=brochure.get("careers", ""),
        call_to_action=brochure.get("call_to_action", ""),
        source_url=source_url,
        **merged,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    HTML(string=html_str).write_pdf(str(output_path))
    return output_path
