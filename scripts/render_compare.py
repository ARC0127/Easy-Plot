#!/usr/bin/env python3
import io
import json
import re
import sys
from typing import Optional, Tuple

import cairosvg
from PIL import Image


def extract_inline_svg(html: str) -> Optional[str]:
    m = re.search(r'<svg\b[\s\S]*?</svg>', html, re.IGNORECASE)
    return m.group(0) if m else None


def render_markup(markup: str, kind: str) -> Tuple[Optional[Image.Image], str]:
    svg_text: Optional[str] = None
    mode = 'unsupported'

    if kind == 'svg':
        svg_text = markup
        mode = 'rendered_svg_cairosvg'
    elif kind == 'html':
        extracted = extract_inline_svg(markup)
        if extracted is not None:
            svg_text = extracted
            mode = 'rendered_html_inline_svg_cairosvg'

    if svg_text is None:
        return None, mode

    png_bytes = cairosvg.svg2png(bytestring=svg_text.encode('utf-8'))
    image = Image.open(io.BytesIO(png_bytes)).convert('RGBA')
    return image, mode


def compare_images(a: Image.Image, b: Image.Image) -> float:
    width = max(a.width, b.width)
    height = max(a.height, b.height)
    canvas_a = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    canvas_b = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    canvas_a.paste(a, (0, 0))
    canvas_b.paste(b, (0, 0))

    pa = canvas_a.load()
    pb = canvas_b.load()

    total = 0.0
    count = 0
    for y in range(height):
        for x in range(width):
            r1, g1, b1, a1 = pa[x, y]
            r2, g2, b2, a2 = pb[x, y]
            if a1 == 0 and a2 == 0:
                continue
            total += (abs(r1 - r2) + abs(g1 - g2) + abs(b1 - b2) + abs(a1 - a2)) / (255.0 * 4.0)
            count += 1

    if count == 0:
        return 0.0
    return total / count


def main() -> int:
    payload = json.load(sys.stdin)
    markup_a = payload['markupA']
    markup_b = payload['markupB']
    kind_a = payload['kindA']
    kind_b = payload['kindB']

    image_a, mode_a = render_markup(markup_a, kind_a)
    image_b, mode_b = render_markup(markup_b, kind_b)

    if image_a is None or image_b is None:
        json.dump({
            'ok': False,
            'comparisonMode': 'render_fallback_required',
            'normalizedPixelDiff': 1.0,
            'warning': f'render unsupported for kinds: {kind_a}, {kind_b}; modes={mode_a},{mode_b}'
        }, sys.stdout)
        return 0

    normalized = compare_images(image_a, image_b)
    json.dump({
        'ok': True,
        'comparisonMode': mode_a if mode_a == mode_b else f'{mode_a}_vs_{mode_b}',
        'normalizedPixelDiff': normalized,
        'warning': None,
    }, sys.stdout)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
