"""Generate the Athangudi-inspired tile artwork used on the landing page.

Each tile is a 200x200 SVG: a pressed-cement field, quarter-medallions in the
corners (so neighbouring tiles read as one continuous floor, as real Athangudi
tiles do), a thin inlaid border, and an individual central motif. Bold ink
outlines and a fine speckle texture borrow from retro manga print.

Run:  python3 tools/make_tiles.py   (writes assets/tiles/*.svg)
"""
from math import cos, sin, radians
from pathlib import Path

INK = "#15121C"
VIOLET = "#7045D5"
DEEP = "#3B2470"   # violet pressed into ink, for fields
LILAC = "#B99AEF"
IVORY = "#F1DFAD"

OUT = Path(__file__).resolve().parent.parent / "assets" / "tiles"


def ring(shape, n, offset=0.0):
    step = 360 / n
    return "".join(f'<g transform="rotate({offset + i * step:.2f})">{shape}</g>' for i in range(n))


def petal(r0, r1, w, fill, stroke=INK, sw=2.4):
    """Pointed petal pointing up (negative y) from radius r0 to r1."""
    L = r1 - r0
    d = (f"M0 {-r0:.1f} C{w:.1f} {-r0 - L*0.25:.1f} {w*0.85:.1f} {-r1 + L*0.3:.1f} 0 {-r1:.1f} "
         f"C{-w*0.85:.1f} {-r1 + L*0.3:.1f} {-w:.1f} {-r0 - L*0.25:.1f} 0 {-r0:.1f}Z")
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"/>'


def round_petal(r0, r1, w, fill, sw=2.4):
    L = r1 - r0
    d = (f"M0 {-r0:.1f} C{w:.1f} {-r0 - L*0.1:.1f} {w:.1f} {-r1:.1f} 0 {-r1:.1f} "
         f"C{-w:.1f} {-r1:.1f} {-w:.1f} {-r0 - L*0.1:.1f} 0 {-r0:.1f}Z")
    return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"/>'


def circle(r, fill, cx=0, cy=0, sw=2.4, stroke=INK):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def frame(field, corner, corner_inner, line):
    """Field, inlaid border line and four corner quarter-medallions."""
    c = []
    for (x, y) in [(0, 0), (200, 0), (200, 200), (0, 200)]:
        c.append(circle(34, corner, x, y, 2.6))
        c.append(circle(20, corner_inner, x, y, 2))
        c.append(circle(7, line, x, y, 1.6))
    return (f'<rect width="200" height="200" fill="{field}"/>'
            f'<rect x="12" y="12" width="176" height="176" rx="2" fill="none" stroke="{line}" stroke-width="1.4" opacity=".75"/>'
            + "".join(c))


TEXTURE = f"""
<defs>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="SEED" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.07  0 0 0 0 0.11  0 0 0 -2.4 1.35"/>
  </filter>
  <filter id="mottle" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="SEED" result="m"/>
    <feColorMatrix in="m" type="matrix" values="0 0 0 0 0.95  0 0 0 0 0.88  0 0 0 0 0.75  0 0 0 0.9 -0.32"/>
  </filter>
</defs>"""


def svg(body, seed, mottle=.28, grain=.55):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400">'
            + TEXTURE.replace("SEED", str(seed))
            + body
            + (f'<rect width="200" height="200" filter="url(#mottle)" opacity="{str(mottle).lstrip('0')}"/>' if mottle else "")
            + f'<rect width="200" height="200" filter="url(#grain)" opacity="{str(grain).lstrip('0')}"/>'
            + f'<rect x="1.5" y="1.5" width="197" height="197" fill="none" stroke="{INK}" stroke-width="3"/>'
            + "</svg>")


def centre(inner):
    return f'<g transform="translate(100 100)">{inner}</g>'


# ---------------------------------------------------------------- motifs ----

def sampangi():
    """Four-petal champak bloom with leaf points on the diagonals."""
    return frame(DEEP, IVORY, VIOLET, LILAC) + centre(
        ring(petal(14, 52, 13, LILAC, sw=2.2), 4, 45)
        + ring(round_petal(10, 74, 34, IVORY), 4)
        + ring(petal(12, 56, 15, VIOLET), 4)
        + ring(petal(14, 40, 6, LILAC, sw=1.6), 4)
        + circle(15, IVORY) + circle(6, VIOLET, sw=1.8)
    )


def kolam():
    """Pulli-kolam knot: interlaced loops drawn around a dot grid."""
    loops = "".join(
        f'<circle cx="{x}" cy="{y}" r="30" fill="none" stroke="{INK}" stroke-width="11"/>'
        f'<circle cx="{x}" cy="{y}" r="30" fill="none" stroke="{IVORY}" stroke-width="6"/>'
        for (x, y) in [(0, -30), (30, 0), (0, 30), (-30, 0)]
    )
    dots = "".join(circle(4, LILAC, x, y, 1.6) for x in (-30, 0, 30) for y in (-30, 0, 30))
    outer = ring(petal(64, 80, 7, IVORY, sw=2), 4, 45)
    return frame(VIOLET, IVORY, DEEP, IVORY) + centre(
        circle(66, DEEP, sw=2.6) + outer + loops + dots
    )


def nakshatra():
    """Eight-point star rosette, an eight-fold Athangudi centrepiece."""
    def star(ro, ri, fill, sw=2.6):
        pts = []
        for i in range(16):
            r = ro if i % 2 == 0 else ri
            a = radians(i * 22.5)
            pts.append(f"{r*sin(a):.1f},{-r*cos(a):.1f}")
        return f'<polygon points="{" ".join(pts)}" fill="{fill}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"/>'
    return frame(IVORY, VIOLET, IVORY, VIOLET) + centre(
        star(82, 46, VIOLET)
        + star(64, 40, IVORY, 2.2)
        + circle(36, DEEP, sw=2.4)
        + ring(round_petal(4, 30, 9, LILAC, sw=1.8), 8, 22.5)
        + circle(9, IVORY, sw=2)
    )


def maanga():
    """Four mango (paisley) forms spiralling round a bindu."""
    mango = (f'<path d="M0 -18 C26 -22 40 -48 26 -70 C16 -84 -6 -80 -8 -64 C-10 -52 4 -48 6 -56 '
             f'C-14 -50 -24 -30 0 -18Z" fill="{IVORY}" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>'
             f'<path d="M6 -28 C20 -34 28 -50 20 -62" fill="none" stroke="{VIOLET}" stroke-width="3" stroke-linecap="round"/>'
             f'<circle cx="8" cy="-64" r="3.4" fill="{VIOLET}"/>')
    return frame(DEEP, LILAC, IVORY, LILAC) + centre(
        circle(80, "none", sw=1.4, stroke=LILAC)
        + f'<g transform="scale(.92)">{ring(mango, 4, 10)}</g>'
        + ring(petal(20, 44, 5, LILAC, sw=1.6), 4, 55)
        + circle(14, VIOLET) + circle(6, IVORY, sw=1.6)
    )


def thamarai():
    """Lotus seen from above: two whorls of petals and a seed-pod centre."""
    return frame(IVORY, DEEP, LILAC, VIOLET) + centre(
        ring(petal(20, 80, 22, LILAC), 8, 22.5)
        + ring(petal(16, 64, 20, VIOLET), 8)
        + ring(petal(14, 44, 12, IVORY, sw=2), 8, 22.5)
        + circle(18, IVORY)
        + "".join(circle(2.6, VIOLET, 10*cos(radians(a)), 10*sin(radians(a)), 0) for a in range(0, 360, 60))
        + circle(3, VIOLET, sw=0)
    )


def malli():
    """Jasmine strings crossing on the diagonals, tied with a central knot."""
    flower = lambda s: ring(round_petal(2, 11*s, 5*s, IVORY, sw=1.6), 5) + circle(3*s, LILAC, sw=1.4)
    bloom_at = lambda x, y, s: f'<g transform="translate({x:.1f} {y:.1f})">{flower(s)}</g>'
    strings = ""
    for k in range(-2, 3):
        if k == 0:
            continue
        d = k * 28
        strings += bloom_at(d, d, 1.05) + bloom_at(d, -d, 1.05)
    return frame(VIOLET, IVORY, LILAC, IVORY) + centre(
        f'<path d="M-78 -78 L78 78 M-78 78 L78 -78" stroke="{INK}" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>'
        + strings
        + ring(petal(8, 30, 11, LILAC, sw=2), 4)
        + ring(petal(8, 26, 9, IVORY, sw=2), 4, 45)
        + circle(7, VIOLET, sw=2)
    )


def jaali():
    """Diamond lattice with quatrefoils at the joints (a jaali screen)."""
    lines = ""
    for i in range(-4, 5):
        o = i * 50
        lines += f'<path d="M{o-120} -120 L{o+120} 120 M{o+120} -120 L{o-120} 120" stroke="{LILAC}" stroke-width="2.2"/>'
    quatre = lambda x, y, s: (f'<g transform="translate({x} {y})">'
                              + ring(round_petal(0, 12*s, 7*s, IVORY, sw=1.8), 4)
                              + circle(3*s, VIOLET, sw=1.4) + "</g>")
    joints = "".join(quatre(x, y, 1) for (x, y) in [(0, -50), (50, 0), (0, 50), (-50, 0)])
    return frame(DEEP, IVORY, VIOLET, LILAC) + (
        '<clipPath id="in"><rect x="14" y="14" width="172" height="172"/></clipPath>'
        f'<g clip-path="url(#in)"><g transform="translate(100 100)">{lines}</g></g>'
    ) + centre(
        joints
        + f'<rect x="-26" y="-26" width="52" height="52" transform="rotate(45)" fill="{VIOLET}" stroke="{INK}" stroke-width="2.4"/>'
        + ring(round_petal(0, 22, 11, IVORY, sw=2), 4)
        + circle(6, LILAC, sw=1.8)
    )


def chakram():
    """Sixteen-spoke wheel ringed with teardrops."""
    spokes = ring(f'<path d="M0 -20 L0 -50" stroke="{INK}" stroke-width="2.4"/>', 16)
    return frame(IVORY, VIOLET, IVORY, VIOLET) + centre(
        ring(petal(60, 82, 7, VIOLET, sw=2), 16, 11.25)
        + circle(60, LILAC, sw=2.6)
        + circle(50, IVORY, sw=2.2)
        + spokes
        + ring(round_petal(22, 46, 4.6, VIOLET, sw=1.6), 16, 11.25)
        + circle(20, DEEP, sw=2.4)
        + ring(round_petal(4, 16, 5, IVORY, sw=1.4), 8)
        + circle(3.5, LILAC, sw=1.2)
    )


def gopuram():
    """Stepped diamond rising in tiers, like a temple-tower silhouette."""
    def stepped(n, step, fill):
        r = n * step
        quad = []
        for i in range(n):
            quad += [(i * step, -(r - i * step)), ((i + 1) * step, -(r - i * step))]
        path = []
        for rot in range(4):
            a = radians(rot * 90)
            path += [(x * cos(a) - y * sin(a), x * sin(a) + y * cos(a)) for (x, y) in quad]
        d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in path) + "Z"
        return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="2.4"/>'
    return frame(VIOLET, DEEP, LILAC, IVORY) + centre(
        stepped(6, 13, IVORY)
        + stepped(5, 12, DEEP)
        + stepped(4, 11, LILAC)
        + stepped(3, 9, IVORY)
        + circle(7, VIOLET, sw=2)
    )


def valaivu():
    """Overlapping arcs from the edge midpoints: a four-petal vesica floor, a classic Athangudi layout."""
    mids = [(100, 0), (200, 100), (100, 200), (0, 100)]
    petals = "".join(
        f'<g transform="rotate({r} 100 100)"><path d="M100 100 A100 100 0 0 0 200 0 A100 100 0 0 0 100 100Z" '
        f'fill="{VIOLET}" stroke="{INK}" stroke-width="2.6"/></g>' for r in (0, 90, 180, 270))
    arcs = "".join(f'<circle cx="{x}" cy="{y}" r="100" fill="none" stroke="{INK}" stroke-width="2.6"/>' for x, y in mids)
    buds = "".join(f'<g transform="translate({x} {y})">' + ring(petal(4, 18, 6, LILAC, sw=1.8), 4) + circle(5, IVORY, sw=1.6) + '</g>' for x, y in mids)
    corners = "".join(circle(22, DEEP, x, y, 2.4) + circle(10, LILAC, x, y, 1.8) for (x, y) in [(0, 0), (200, 0), (200, 200), (0, 200)])
    return (f'<rect width="200" height="200" fill="{IVORY}"/>' + petals + arcs + buds + corners
            + centre(circle(22, IVORY, sw=2.4) + ring(petal(4, 20, 7, LILAC, sw=1.8), 4, 45) + circle(5, DEEP, sw=1.4)))


TILES = {
    "sampangi": sampangi, "kolam": kolam, "nakshatra": nakshatra, "maanga": maanga, "thamarai": thamarai,
    "malli": malli, "jaali": jaali, "chakram": chakram, "gopuram": gopuram, "valaivu": valaivu,
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for i, (name, fn) in enumerate(TILES.items()):
        (OUT / f"{name}.svg").write_text(svg(fn(), seed=i * 7 + 3))
        print("wrote", name)

    # Light-theme variant: a clean cream in place of the warm ivory, no mottle
    # and a finer grain, so the tiles stay crisp on a pale page.
    IVORY = "#FCF4D8"
    light = OUT / "light"
    light.mkdir(exist_ok=True)
    for i, (name, fn) in enumerate(TILES.items()):
        (light / f"{name}.svg").write_text(svg(fn(), seed=i * 7 + 3, mottle=0, grain=.22))
        print("wrote light/", name)
