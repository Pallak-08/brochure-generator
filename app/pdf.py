"""Render a brochure dict + design spec to PDF via WeasyPrint.

The template is parametric — all colors and the vibe/font choice come from the
LLM-generated design spec (which itself was driven by colors extracted from
the actual company's CSS). One template, many faces.
"""
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

TEMPLATE_DIR = Path(__file__).parent / "templates"

# Safety defaults if the LLM omits a field.
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
) -> Path:
    """Render brochure + design spec to a PDF file.

    Args:
        brochure: JSON dict from the LLM (company_name, tagline, etc.)
        design:   JSON dict from the LLM (vibe, palette, display_font)
        source_url: original URL — printed in headers/footers
        output_path: where to write the PDF
    """
    merged = {**DEFAULT_DESIGN, **(design or {})}
    tpl = _env.get_template("brochure.html")
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
