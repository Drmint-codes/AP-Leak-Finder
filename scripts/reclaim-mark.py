"""Writes the Reclaim mark (stacked ledger slabs, R cut through the top, recovered layer in green)
into every static file that carries it. The React copy lives in src/components/ReclaimLogo.tsx.
Run: python3 scripts/reclaim-mark.py"""
import pathlib, re

VIEWBOX = '7 7 106 98'
R = 'M29 80V22h22a15.5 15.5 0 0 1 0 31H29m20 0 22 27'
FACE = 'M10 35 60 10l50 25-50 25Z'
BANDS = ['M10 45 60 70l50-25v4L60 74 10 49Z', 'M10 59 60 84l50-25v4L60 88 10 63Z', 'M10 73 60 98l50-25v4L60 102 10 77Z']
GREEN = '#00E487'
INK = '#0B1511'

def body(mid, ink='currentColor', green=GREEN, solid=False):
    g = ink if solid else green
    return (f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120"><rect width="120" height="120" fill="#fff"/>'
            f'<path transform="matrix(.5 -.25 .5 .25 10 35)" d="{R}" fill="none" stroke="#000" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/></mask>'
            f'<g stroke-width="5" stroke-linejoin="round" mask="url(#{mid})">'
            f'<path d="{FACE}" fill="{ink}" stroke="{ink}"/><path d="{BANDS[0]}" fill="{ink}" stroke="{ink}"/>'
            f'<path d="{BANDS[1]}" fill="{g}" stroke="{g}"/><path d="{BANDS[2]}" fill="{ink}" stroke="{ink}"/></g>')

if __name__ == '__main__':
    root = pathlib.Path(__file__).resolve().parent.parent
    sprite = root / 'landing-site/src/partials/sprite.html'
    s = re.sub(r'<symbol id="hx-wheel".*?</symbol>\n(  <symbol id="hx-wheel-solid".*?</symbol>\n)?',
               '<symbol id="hx-wheel" viewBox="' + VIEWBOX + '">\n    <!-- Reclaim mark: three stacked ledger slabs, the R cut through the top, the recovered layer in green. scripts/reclaim-mark.py -->\n    ' + body('hx-wheel-r') + '\n  </symbol>\n'
               '  <symbol id="hx-wheel-solid" viewBox="' + VIEWBOX + '">\n    <!-- the same mark in one colour, for the green splash on hover -->\n    ' + body('hx-wheel-solid-r', solid=True) + '\n  </symbol>\n',
               sprite.read_text(), count=1, flags=re.S)
    sprite.write_text(s)
    plain = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + VIEWBOX + '"{size}>\n  ' + body('r', INK) + '\n</svg>\n'
    (root / 'public/favicon.svg').write_text(plain.format(size=''))
    (root / 'landing-site/assets/favicon.svg').write_text(plain.format(size=''))
    (root / 'public/reclaim-mark.svg').write_text(plain.format(size=' width="256" height="237"'))
    (root / 'public/reclaim-logo.svg').write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="256" viewBox="0 0 960 256" fill="none">\n'
        '  <svg x="40" y="28" width="216" height="200" viewBox="' + VIEWBOX + '">' + body('r', INK) + '</svg>\n'
        f'  <text x="290" y="170" fill="{INK}" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="130" font-weight="650" letter-spacing="-6">Reclaim</text>\n</svg>\n')
