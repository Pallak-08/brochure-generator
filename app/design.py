"""Extract a real color palette from a website's CSS.

Strategy: fetch homepage HTML + any linked stylesheets, regex out all color
values, normalize to hex, count frequency, drop near-white/black duplicates,
return the top colors. The LLM then assigns these to brochure roles
(background, accent, text, etc.).
"""
import re
from collections import Counter
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}

HEX_RE = re.compile(r"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")
RGB_RE = re.compile(r"rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)")


def _hex3_to_hex6(h: str) -> str:
    return "#" + "".join(c * 2 for c in h)


def _normalize_hex(match: str) -> str:
    body = match.lstrip("#")
    if len(body) == 3:
        return _hex3_to_hex6(body).lower()
    return ("#" + body).lower()


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def _is_grayscale(hex_color: str, tol: int = 6) -> bool:
    """True for pure-ish grays/whites/blacks — we want chromatic colors."""
    r = int(hex_color[1:3], 16)
    g = int(hex_color[3:5], 16)
    b = int(hex_color[5:7], 16)
    return max(abs(r - g), abs(g - b), abs(r - b)) <= tol


def _is_near(hex_color: str, target: str, tol: int = 10) -> bool:
    r1, g1, b1 = int(hex_color[1:3], 16), int(hex_color[3:5], 16), int(hex_color[5:7], 16)
    r2, g2, b2 = int(target[1:3], 16), int(target[3:5], 16), int(target[5:7], 16)
    return abs(r1 - r2) <= tol and abs(g1 - g2) <= tol and abs(b1 - b2) <= tol


def _collect_css(url: str, html: str) -> str:
    """Concatenate all CSS sources: <style> blocks + linked .css files."""
    soup = BeautifulSoup(html, "html.parser")
    chunks = []

    for style_tag in soup.find_all("style"):
        chunks.append(style_tag.get_text(""))

    for el in soup.find_all(style=True):
        chunks.append(str(el.get("style", "")))

    for link in soup.find_all("link", rel=lambda v: v and "stylesheet" in v):
        href = link.get("href")
        if not href:
            continue
        full = urljoin(url, href)
        try:
            r = requests.get(full, headers=HEADERS, timeout=8)
            if r.ok:
                chunks.append(r.text)
        except Exception:
            pass

    return "\n".join(chunks)


def extract_palette(url: str, max_colors: int = 8) -> dict:
    """Return {'palette': [list of hex], 'background': str, 'all_text': bool}.

    `palette` is ordered by frequency, chromatic colors first, near-greys filtered.
    `background` is the most common near-white or near-black (likely page bg).
    """
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        html = r.text
    except Exception:
        return {"palette": [], "background": "#ffffff", "fonts": []}

    css = _collect_css(url, html)

    counter: Counter[str] = Counter()
    for m in HEX_RE.findall(css):
        counter[_normalize_hex(m)] += 1
    for r_, g_, b_ in RGB_RE.findall(css):
        try:
            counter[_rgb_to_hex(int(r_), int(g_), int(b_))] += 1
        except ValueError:
            continue

    # Pick a likely background — most-common grayscale that's very light or very dark.
    bg_candidates = [
        (c, n) for c, n in counter.most_common() if _is_grayscale(c)
        and (sum(int(c[i:i+2], 16) for i in (1, 3, 5)) > 600
             or sum(int(c[i:i+2], 16) for i in (1, 3, 5)) < 90)
    ]
    background = bg_candidates[0][0] if bg_candidates else "#ffffff"

    # Chromatic palette — non-grayscale, dedupe near-neighbors.
    chromatic: list[str] = []
    for color, _ in counter.most_common():
        if _is_grayscale(color, tol=10):
            continue
        if any(_is_near(color, c) for c in chromatic):
            continue
        chromatic.append(color)
        if len(chromatic) >= max_colors:
            break

    # Extract dominant font-family hints from CSS (just family names, not weight).
    fonts = re.findall(r"font-family\s*:\s*([^;\}]+)", css, flags=re.IGNORECASE)
    font_summary: list[str] = []
    seen = set()
    for f in fonts:
        # Take the first font name in each declaration
        first = f.split(",")[0].strip().strip("'\"")
        if first and first.lower() not in seen and len(first) < 40:
            seen.add(first.lower())
            font_summary.append(first)
        if len(font_summary) >= 5:
            break

    return {
        "palette": chromatic,
        "background": background,
        "fonts": font_summary,
    }
