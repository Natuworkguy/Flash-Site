#!/usr/bin/env python3
"""Regenerate assets/images/og-image.png from assets/images/logo.svg.

    python3 scripts/generate-og-image.py

The card's lockup is read out of logo.svg itself: the bolt's <rect> grid, the
<g> transform, and the <text> position/size/tracking. Restyling the lockup is
therefore a matter of editing logo.svg and rerunning this.

The bolt is pixel art, so it is rasterized by drawing each <rect> at an integer
scale rather than resampling: no soft edges, no blur, exact palette. Background,
glows, grid and grain mirror the tokens in assets/css/style.css so the card
matches the site.

Needs Pillow. The OFL fonts are downloaded on first run into scripts/.fonts/
(gitignored): Inter and JetBrains Mono for the tagline and URL, Cormorant
Garamond for the wordmark named by logo.svg's font-family.
"""
import math
import random
import re
import urllib.request
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LOCKUP_SVG = ROOT / "assets/images/logo.svg"   # bolt + FLASH wordmark
OUT = ROOT / "assets/images/og-image.png"
FONT_DIR = Path(__file__).resolve().parent / ".fonts"
FONT_URLS = {
    "Inter.ttf":
        "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf",
    "JetBrainsMono.ttf":
        "https://github.com/google/fonts/raw/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf",
    "CormorantGaramond.ttf":
        "https://github.com/google/fonts/raw/main/ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf",
}

W, H = 1200, 630           # must match og:image:width/height in index.html
BG = (8, 9, 11)            # --bg
FG = (244, 241, 234)       # --fg
ACCENT = (255, 138, 61)    # --accent
TAGLINE_FG = (214, 210, 201)

TAGLINE = "Local AI CLI for Ollama. No cloud. No black box."
URL = "flashproject.dev"

MARK_CY = 244              # vertical centre of the lockup
CELL = 14                  # px per logo-grid cell; integer keeps the pixel art hard-edged
NOISE_SEED = 7


# ---------- fonts ----------

def font_path(name):
    p = FONT_DIR / name
    if not p.exists():
        FONT_DIR.mkdir(parents=True, exist_ok=True)
        print(f"downloading {name}...")
        urllib.request.urlretrieve(FONT_URLS[name], p)
    return str(p)


def inter(size, weight):
    f = ImageFont.truetype(font_path("Inter.ttf"), size)
    f.set_variation_by_axes([min(32, max(14, size)), weight])  # opsz, wght
    return f


def mono(size, weight):
    f = ImageFont.truetype(font_path("JetBrainsMono.ttf"), size)
    f.set_variation_by_axes([weight])
    return f


def cormorant(size, weight):
    """The wordmark face named by logo.svg's <text font-family>."""
    f = ImageFont.truetype(font_path("CormorantGaramond.ttf"), size)
    f.set_variation_by_axes([weight])
    return f


def tracked_width(draw, text, font, tracking):
    return sum(draw.textlength(c, font=font) for c in text) + tracking * (len(text) - 1)


def draw_tracked(draw, x, y, text, font, fill, tracking, anchor="ls"):
    for c in text:
        draw.text((x, y), c, font=font, fill=fill, anchor=anchor)
        x += draw.textlength(c, font=font) + tracking


# ---------- logo ----------

def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def parse_lockup(path):
    """Pull the bolt rects and the wordmark spec straight out of logo.svg.

    The card is laid out from the SVG's own geometry rather than duplicating
    it, so editing logo.svg and rerunning is enough to restyle the lockup.
    """
    src = Path(path).read_text()

    vb_m = re.search(r'viewBox="([-\d.\s]+)"', src)
    if not vb_m:
        raise SystemExit(f"{path}: no viewBox")
    vb = [float(v) for v in vb_m.group(1).split()]

    g = re.search(r'<g[^>]*transform="translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)'
                  r'\s*scale\(\s*([-\d.]+)\s*\)"', src)
    if not g:
        raise SystemExit(f"{path}: expected a <g transform='translate(..) scale(..)'>")
    tx, ty, gs = (float(v) for v in g.groups())

    rects = []
    for tag in re.findall(r"<rect\b[^>]*>", src):
        a = dict(re.findall(r'([\w-]+)\s*=\s*"([^"]*)"', tag))
        rects.append((float(a["x"]), float(a["y"]),
                      float(a["width"]), float(a["height"]), a["fill"]))
    if not rects:
        raise SystemExit(f"no <rect> found in {path}")

    t = re.search(r"<text\b([^>]*)>(.*?)</text>", src, re.S)
    if not t:
        raise SystemExit(f"no <text> found in {path}")
    ta = dict(re.findall(r'([\w-]+)\s*=\s*"([^"]*)"', t.group(1)))

    return {
        "vb": vb, "tx": tx, "ty": ty, "gs": gs, "rects": rects,
        "text": t.group(2).strip(),
        "text_x": float(ta["x"]), "text_y": float(ta["y"]),
        "font_size": float(ta["font-size"]),
        "tracking": float(ta.get("letter-spacing", 0)),
        "weight": float(ta.get("font-weight", 400)),
        "fill": hex2rgb(ta["fill"]),
    }


def render_icon(spec, cell):
    """Draw the bolt at `cell` px per grid square, cropped to its inked bounds.

    Returns the image plus its offset in viewBox units from the viewBox origin.
    """
    rects = spec["rects"]
    gx0 = min(r[0] for r in rects)
    gy0 = min(r[1] for r in rects)
    gx1 = max(r[0] + r[2] for r in rects)
    gy1 = max(r[1] + r[3] for r in rects)
    img = Image.new("RGBA", (round((gx1 - gx0) * cell), round((gy1 - gy0) * cell)), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for x, y, rw, rh, fill in rects:
        d.rectangle([round((x - gx0) * cell), round((y - gy0) * cell),
                     round((x - gx0 + rw) * cell) - 1, round((y - gy0 + rh) * cell) - 1],
                    fill=hex2rgb(fill) + (255,))
    return img, (spec["tx"] + spec["gs"] * gx0, spec["ty"] + spec["gs"] * gy0)


# ---------- lighting ----------

_RADIAL = ImageChops.invert(Image.radial_gradient("L"))  # 255 centre -> 0 edge


def glow(base, centre, radius, color, intensity, falloff=2.4, squash=1.0):
    m = _RADIAL.point(lambda v: int(255 * (v / 255.0) ** falloff * intensity))
    m = m.resize((radius * 2, int(radius * 2 * squash)), Image.LANCZOS)
    mask = Image.new("L", (W, H), 0)
    mask.paste(m, (centre[0] - m.width // 2, centre[1] - m.height // 2))
    layer = Image.new("RGB", (W, H), (0, 0, 0))
    layer.paste(color, (0, 0, W, H), mask)
    return ImageChops.screen(base, layer)


def grid_mask():
    """The site's .grid-overlay: 64px rules under a radial ellipse from the top."""
    g = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(g)
    for x in range(0, W, 64):
        d.line([(x, 0), (x, H)], fill=255)
    for y in range(0, H, 64):
        d.line([(0, y), (W, y)], fill=255)
    mw, mh = W // 4, H // 4          # built small, then upscaled: the mask is smooth
    m = Image.new("L", (mw, mh), 0)
    px = m.load()
    rx, ry, cx = 0.80 * mw, 0.60 * mh, mw / 2
    for yy in range(mh):
        for xx in range(mw):
            t = math.hypot((xx - cx) / rx, yy / ry)
            px[xx, yy] = 255 if t <= 0.40 else 0 if t >= 0.90 else int(255 * (1 - (t - 0.40) / 0.50))
    return ImageChops.multiply(g, m.resize((W, H), Image.BICUBIC))


def add_noise(img, amount=0.03):
    """.noise-overlay, near enough: grain keeps the big gradients from banding.

    Seeded so reruns are byte-identical, and an unchanged logo doesn't produce
    a 400KB diff.
    """
    n = Image.frombytes("L", (W, H), random.Random(NOISE_SEED).randbytes(W * H))
    return Image.blend(img, ImageChops.overlay(img, Image.merge("RGB", (n, n, n))), amount)


# ---------- compose ----------

def main():
    spec = parse_lockup(LOCKUP_SVG)
    k = CELL / spec["gs"]                      # card px per viewBox unit
    logo, (icon_vx, icon_vy) = render_icon(spec, CELL)

    f_mark = cormorant(round(spec["font_size"] * k), spec["weight"])
    f_tag = inter(41, 500)
    f_url = mono(30, 600)

    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    tracking = spec["tracking"] * k
    text_w = tracked_width(probe, spec["text"], f_mark, tracking)

    # Lay the lockup out in viewBox space, then centre its inked width. The
    # SVG's own viewBox has slack on the right (the <text> stops short of it),
    # so measuring the drawn text is what actually centres the card.
    left_v = min(icon_vx, spec["text_x"])
    lockup_w = (spec["text_x"] - left_v) * k + text_w
    lockup_h = spec["vb"][3] * k
    ox = (W - lockup_w) / 2 - left_v * k
    oy = MARK_CY - lockup_h / 2

    lx, ly = round(ox + icon_vx * k), round(oy + icon_vy * k)
    tx = ox + spec["text_x"] * k

    img = Image.new("RGB", (W, H), BG)
    # warm core behind the lockup, cool kickers echoing the bolt's blue/green tail
    img = glow(img, (W // 2 - 40, MARK_CY - 10), 560, (255, 122, 0), 0.44, falloff=2.7, squash=0.88)
    img = glow(img, (960, 470), 400, (63, 184, 232), 0.15)
    img = glow(img, (270, 500), 360, (51, 192, 106), 0.10)
    img.paste((255, 255, 255), (0, 0, W, H), grid_mask().point(lambda v: int(v * 0.055)))

    # halo cast by the mark itself
    halo_a = Image.new("L", (W, H), 0)
    halo_a.paste(logo.getchannel("A"), (lx, ly))
    halo_a = halo_a.filter(ImageFilter.GaussianBlur(34)).point(lambda v: int(v * 0.5))
    halo = Image.new("RGB", (W, H), (0, 0, 0))
    halo.paste((255, 145, 40), (0, 0, W, H), halo_a)
    img = ImageChops.screen(img, halo)

    img.paste(logo, (lx, ly), logo)

    d = ImageDraw.Draw(img)
    draw_tracked(d, tx, oy + spec["text_y"] * k, spec["text"], f_mark, spec["fill"], tracking)
    d.text((W // 2, 432), TAGLINE, font=f_tag, fill=TAGLINE_FG, anchor="mm")
    d.text((W // 2, 497), URL, font=f_url, fill=ACCENT, anchor="mm")

    # Stays truecolor on purpose: quantizing to a palette merges the bolt's
    # blue and green rows into one teal.
    add_noise(img).save(OUT, optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)} ({W}x{H}, {OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
