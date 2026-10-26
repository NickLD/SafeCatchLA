"""Generate the SafeCatchLA sticker SVGs (rectangle and die-cut fish) plus HTML wrappers for rendering.

Usage: python3 build_stickers.py <qr_path.txt> <out_dir>
qr_path.txt = first line module count, second line an SVG path of 1x1 modules (QR for https://safecatchla.com).
"""
import pathlib
import sys

NAVY, BLUE, YELLOW, CORAL, GOLD, WHITE = "#0d3b66", "#1b6ca8", "#ffc93c", "#ff6b5b", "#ffb347", "#ffffff"
FISH = ('<path d="M96 256c40-70 110-110 190-110 70 0 120 40 150 110-30 70-80 110-150 110-80 0-150-40-190-110z"/>'
        '<path d="M96 256 40 196v120z"/>')


def qr_group(n, path, x, y, size, color=NAVY):
    s = size / n
    return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.5f})" fill="{color}"><path d="{path}"/></g>'


def qr_card(n, path, x, y, box, radius=30):
    pad = 4 * box / (n + 8)  # 4-module quiet zone on each side
    return (f'<rect x="{x}" y="{y}" width="{box}" height="{box}" rx="{radius}" fill="{WHITE}"/>'
            + qr_group(n, path, x + pad, y + pad, box - 2 * pad))


def rectangle(n, path):
    box, bx, by = 360, 790, 190
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="4in" height="3in">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{GOLD}"/><stop offset="1" stop-color="{CORAL}"/></linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{BLUE}"/><stop offset="1" stop-color="{NAVY}"/></linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity=".28"/></filter>
    <clipPath id="card"><rect width="1200" height="900" rx="70"/></clipPath>
  </defs>
  <g clip-path="url(#card)">
    <rect width="1200" height="900" fill="url(#sky)"/>
    <circle cx="560" cy="610" r="250" fill="#ffe08a" opacity=".55"/>
    <path d="M0 600 C 200 560 400 640 600 600 S 1000 560 1200 600 V900 H0Z" fill="url(#water)"/>
    <path d="M0 640 C 200 600 400 680 600 640 S 1000 600 1200 640" stroke="{WHITE}" stroke-opacity=".25" stroke-width="6" fill="none"/>
    <path d="M0 700 C 220 665 420 735 620 700 S 1020 665 1200 700" stroke="{WHITE}" stroke-opacity=".15" stroke-width="5" fill="none"/>

    <g transform="translate(64 50) scale(0.2)" fill="{NAVY}">{FISH}<circle cx="370" cy="236" r="16" fill="{GOLD}"/></g>
    <text x="176" y="122" font-family="Montserrat" font-weight="900" font-size="56" fill="{NAVY}">SafeCatch<tspan fill="{WHITE}">LA</tspan></text>

    <g filter="url(#shadow)">
      <text font-family="Montserrat" font-weight="900" font-size="100" fill="{WHITE}" letter-spacing="-2">
        <tspan x="64" y="262">WHAT'S IN</tspan><tspan x="64" y="366">THE WATER</tspan><tspan x="64" y="470" fill="{NAVY}">HERE?</tspan>
      </text>
    </g>
    <rect x="64" y="500" width="640" height="62" rx="31" fill="{NAVY}"/>
    <text x="384" y="542" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="29" fill="{WHITE}">Fish mercury · water quality · trends</text>

    <text x="{bx + box / 2}" y="160" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="40" fill="{NAVY}" letter-spacing="5">SCAN ME</text>
    <g filter="url(#shadow)">{qr_card(n, path, bx, by, box, 36)}</g>
    <path d="M712 478 C 730 440 750 425 772 418" stroke="{NAVY}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M772 418 l-26 -10 m26 10 l-14 24" stroke="{NAVY}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

    <text x="600" y="790" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="88" fill="{YELLOW}" letter-spacing="1">safecatchla.com</text>
    <text x="600" y="858" text-anchor="middle" font-family="Montserrat" font-weight="600" font-size="26" fill="{WHITE}" opacity=".85">Free · Independent · Data from Louisiana DEQ</text>
  </g>
</svg>'''


def diecut(n, path):
    # Fish-shaped die-cut, facing right; transparent outside the shape so the printer cuts around it.
    body = "M300 390 C 410 140, 780 80, 1010 165 C 1120 205, 1180 300, 1185 390 C 1180 480, 1120 575, 1010 615 C 780 700, 410 640, 300 390 Z"
    tail = "M340 390 L 70 160 Q 150 390 70 620 Z"
    fin = "M600 128 Q 690 30 820 112 Z"
    box, bx, by = 262, 770, 300
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 50 1170 620" width="4in" height="2.12in">
  <defs>
    <linearGradient id="bodyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{BLUE}"/><stop offset="1" stop-color="{NAVY}"/></linearGradient>
  </defs>
  <g stroke="{WHITE}" stroke-width="22" stroke-linejoin="round">
    <path d="{fin}" fill="{YELLOW}"/><path d="{tail}" fill="{YELLOW}"/><path d="{body}" fill="url(#bodyg)"/>
  </g>
  <path d="{fin}" fill="{YELLOW}"/><path d="{tail}" fill="{YELLOW}"/><path d="{body}" fill="url(#bodyg)"/>
  <circle cx="1095" cy="335" r="26" fill="{WHITE}"/><circle cx="1102" cy="333" r="12" fill="{NAVY}"/>

  <text x="725" y="232" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="58" fill="{WHITE}">SafeCatch<tspan fill="{YELLOW}">LA</tspan></text>
  <text font-family="Montserrat" font-weight="800" font-size="40" fill="{WHITE}">
    <tspan x="420" y="372">What's in</tspan><tspan x="420" y="422">the water</tspan><tspan x="420" y="472" fill="{YELLOW}">here?</tspan>
  </text>
  {qr_card(n, path, bx, by, box, 26)}
  <text x="{bx + box / 2}" y="{by - 14}" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="26" fill="{YELLOW}" letter-spacing="3">SCAN ME</text>
  <text x="745" y="612" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="38" fill="{WHITE}">safecatchla.com</text>
</svg>'''


def main():
    n, path = pathlib.Path(sys.argv[1]).read_text().split("\n", 1)
    n = int(n)
    out = pathlib.Path(sys.argv[2])
    for name, svg, size in (("safecatchla-sticker-4x3", rectangle(n, path), ("4in", "3in")),
                            ("safecatchla-sticker-diecut-fish", diecut(n, path), ("4in", "2.12in"))):
        (out / f"{name}.svg").write_text(svg)
        (out / f"{name}.html").write_text(
            f"<!doctype html><html><head><meta charset='utf-8'><style>@page{{size:{size[0]} {size[1]};margin:0}}"
            f"html,body{{margin:0;background:transparent}}svg{{display:block}}</style></head><body>{svg}</body></html>")


if __name__ == "__main__":
    main()
