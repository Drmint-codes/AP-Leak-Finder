"""The What It Checks page's 3D: one object per check, each acting out what the check catches.
Orthographic and transparent, so they sit on the page's coloured panels. Each loop starts and ends at rest.

  "$B" -b --factory-startup --python wc_models.py -- scene=exact out=out/wc/exact fps=30 frames=1,60 res=640 spp=24 device=METAL

scene: exact | near | over | bank | outlier | shared | unclaimed | missed | closing (a still) | free | growth | flat (the Pricing page).
See render_wc.sh for the full set.
"""
import bpy, math, os, shutil, sys
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import looklib as K
from exhibit_common import A, stage, bake, out_dir, frames_in, ftime   # pass fps=30: it is read on import

A.setdefault('sun', '-.35,.55,.95')
A.setdefault('sunA', '24')
A.setdefault('fill', '.32')
A.setdefault('shade', '.42')
SCENE = A.get('scene', 'exact')
DUR = 5.0
OUT = out_dir(f'out/wc/{SCENE}')
INK, GREEN, PAPER, LEAK, STONE = '#0B1511', '#00E487', '#F3EFE6', '#E5482B', '#C9C5B8'

sc, floor, _ = stage('mint', DUR)
res = int(A.get('res', 800))
sc.render.resolution_x = sc.render.resolution_y = res
floor.visible_diffuse = False

MATS = {}
def mat(c):
    if c not in MATS:
        MATS[c] = K.plain(c, c, {INK: .5, PAPER: .62}.get(c, .42), spec=.22 if c == INK else .45)
    return MATS[c]


def rrect(w, d, r, n=10):
    r = min(r, w / 2 - 1e-4, d / 2 - 1e-4)
    pts = []
    for cx, cy, a0 in ((w / 2 - r, -d / 2 + r, -90), (w / 2 - r, d / 2 - r, 0), (-w / 2 + r, d / 2 - r, 90), (-w / 2 + r, -d / 2 + r, 180)):
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append(Vector((cx + r * math.cos(a), cy + r * math.sin(a))))
    return pts


def finish(ob, rnd):
    me = ob.data
    wt = me.attributes.new('bevel_weight_edge', 'FLOAT', 'EDGE')
    for e in me.edges:
        za, zb = (me.vertices[i].co.z for i in e.vertices)
        if abs(za - zb) < 1e-6:
            wt.data[e.index].value = 1.0
    bv = ob.modifiers.new('round', 'BEVEL')
    bv.width, bv.segments, bv.limit_method = rnd, 4, 'WEIGHT'
    bv.harden_normals = True
    return ob


def block(name, c, w, d, h, r=.06, rnd=.016, at=(0, 0, 0)):
    """A rounded block standing on z=at[2], at x, y."""
    ob, _ = K.prism(name, rrect(w, d, r, 32 if r > .14 else 8), h, {'m': mat(c)}, 'm', bevel=0, smooth=True)
    finish(ob, rnd)
    ob.location = (at[0], at[1], at[2] + h / 2)
    return ob


def bar_on(parent, h, c, w, d, x, y):
    o, _ = K.prism(parent.name + '_mark', rrect(w, d, min(w, d) * .45, 3), .002, {'m': mat(c)}, 'm', bevel=0)
    o.parent = parent
    o.location = (x, y, h / 2 + .001)
    return o


def smooth(a, b, t):
    x = max(0.0, min(1.0, (t - a) / (b - a)))
    return x * x * x * (x * (6 * x - 15) + 10)


def pulse(a, b, c, d, t):
    return smooth(a, b, t) - smooth(c, d, t)


def receipt(name, tab=None):
    """A long paper record: rows, and a total in green. Its page runs along x."""
    h = .05
    ob = block(name, PAPER, 1.35, .9, h, r=.07, rnd=.012)
    for k, (x, w) in enumerate(((-.48, .5), (-.3, .68), (-.12, .68), (.06, .68))):
        bar_on(ob, h, '#A39E91', .03, w, x, (w - .68) / 2).name = f'{name}_row{k}'
    bar_on(ob, h, GREEN, .09, .4, .36, .14).name = f'{name}_total'
    return ob


moving = []
def move(o):
    moving.append(o)
    return o


if SCENE == 'exact':
    # the same record, twice: the copy slides out from under it, every detail the same
    back = move(receipt('copy'))
    front = move(receipt('first'))
    base = block('base', INK, 1.55, 1.1, .07, r=.1)
    def pose(t):
        s = pulse(.5, 1.6, 3.5, 4.5, t)
        back.location = (.0, .46 * s, .095)
        front.location = (.0, -.46 * s, .095 + .055 * (1 - s) + .002)
        base.location = (0, 0, .035)
    aim_z, scale = .1, 2.5
elif SCENE == 'near':
    # nearly the same record: a red tab marks the one thing that differs
    back = move(receipt('second'))
    tab = block('tab', LEAK, .3, .17, .05, r=.04, rnd=.01)
    tab.parent = back
    tab.location = (-.78, .22, 0)
    front = move(receipt('first'))
    base = block('base', INK, 1.55, 1.1, .07, r=.1)
    def pose(t):
        s = pulse(.5, 1.6, 3.5, 4.5, t)
        back.location = (-.1 * s, .46 * s, .095)
        front.location = (.03 * s, -.46 * s, .095 + .055 * (1 - s) + .002)
        base.location = (0, 0, .035)
    aim_z, scale = .1, 2.6
elif SCENE == 'over':
    # blocks fill up to what was billed, marked by a frame; the ones that land above it are the overpayment
    block('plate', INK, 1.3, 1.3, .08, r=.12)
    H = .15
    blocks = [move(block(f'b{i}', LEAK if i >= 4 else GREEN, .7, .7, H - .012, r=.09, rnd=.016)) for i in range(6)]
    level = .08 + 4 * H
    for i, (w, d, x, y) in enumerate(((1.0, .08, 0, -.46), (1.0, .08, 0, .46), (.08, .84, -.46, 0), (.08, .84, .46, 0))):
        block(f'frame{i}', INK, w, d, .05, r=.03, rnd=.01, at=(x, y, level - .03))
    for i, (x, y) in enumerate(((-.46, -.46), (.46, -.46), (-.46, .46), (.46, .46))):
        block(f'post{i}', INK, .08, .08, level - .08, r=.03, rnd=.008, at=(x, y, .08))
    def pose(t):
        for i, o in enumerate(blocks):
            drop = 1 - smooth(.3 + i * .36, .75 + i * .36, t)
            rise = smooth(3.9 + (5 - i) * .1, 4.5 + (5 - i) * .1, t)
            o.location = (0, 0, .08 + H * i + H / 2 + 2.2 * (drop + rise))
    aim_z, scale = .45, 2.5
elif SCENE == 'bank':
    # a vendor's payments go to one account, then a coin lands in a new one
    left = block('old', INK, .95, .95, .2, r=.14, at=(0, -.62, 0))
    right = block('new', INK, .95, .95, .2, r=.14, at=(0, .62, 0))
    block('oldslot', PAPER, .5, .5, .012, r=.25, rnd=.004, at=(0, -.62, .2))
    block('newslot', LEAK, .5, .5, .012, r=.25, rnd=.004, at=(0, .62, .2))
    coin = move(block('coin', GREEN, .42, .42, .07, r=.21, rnd=.018))
    def pose(t):
        s = pulse(1.0, 2.2, 3.4, 4.5, t)
        arc = math.sin(math.pi * s)
        coin.location = (0, -.62 + 1.24 * s, .25 + .55 * arc)
    aim_z, scale = .2, 2.6
elif SCENE == 'outlier':
    # a vendor's usual payments, and the one that stands far above them
    block('plate', INK, 2.0, .86, .06, r=.1)
    heights = (.24, .3, .2, .27, .24, .3)
    bars = []
    for i, hh in enumerate(heights):
        tall = i == 4
        o = block(f'bar{i}', LEAK if tall else PAPER, .24, .44, 1.0, r=.05, rnd=.014)
        if tall:
            move(o)
            bars.append(o)
        else:
            o.scale.z = hh
            o.location = (-.75 + i * .3, 0, .06 + hh / 2)
    tall = bars[0]
    def pose(t):
        hh = .24 + 1.0 * pulse(.7, 1.8, 3.4, 4.4, t)
        tall.scale = (1, 1, hh)
        tall.location = (-.75 + 4 * .3, 0, .06 + hh / 2)
    aim_z, scale = .42, 2.5
elif SCENE == 'shared':
    # two different vendors, and one invoice number laid across both
    block('a', INK, .78, .78, .42, r=.1, at=(0, -.6, 0))
    block('b', PAPER, .78, .78, .42, r=.1, at=(0, .6, 0))
    beam = move(block('beam', GREEN, .3, 1.75, .07, r=.05, rnd=.014))
    bar_on(beam, .07, INK, .05, .9, 0, 0)
    def pose(t):
        z = .42 + .035 + 1.7 * (1 - pulse(.6, 1.5, 3.6, 4.5, t))
        beam.location = (0, 0, z)
    aim_z, scale = .25, 2.6
elif SCENE == 'unclaimed':
    # the full price, and the slice of it that was on offer
    def sector(a0, a1, r=.85, n=64):
        pts = [Vector((0, 0))]
        for k in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * k / n)
            pts.append(Vector((r * math.cos(a), r * math.sin(a))))
        return pts
    h = .2
    whole, wc = K.prism('price', sector(35, 360), h, {'m': mat(INK)}, 'm', bevel=0, smooth=True)
    whole.location = (wc.x, wc.y, h / 2)
    wedge, gc = K.prism('discount', sector(0, 35), h, {'m': mat(GREEN)}, 'm', bevel=0, smooth=True)
    move(wedge)
    d = Vector((math.cos(math.radians(17.5)), math.sin(math.radians(17.5))))
    def pose(t):
        s = pulse(.7, 1.7, 3.4, 4.4, t)
        wedge.location = (gc.x + d.x * .42 * s, gc.y + d.y * .42 * s, h / 2 + .1 * s)
    aim_z, scale = .1, 3.0
elif SCENE == 'free':
    # Free: every finding runs, and the three smallest open up while the rest stay closed
    block('plate', INK, 1.05, 1.62, .07, r=.12)
    t_, g = .29, .05
    cells = []
    for i in range(8):
        r_, c_ = i // 4, i % 4
        x, y = -.17 + r_ * (t_ + g), -.51 + c_ * (t_ + g)
        cells.append((x, y))
    # all the lids sit on paper tiles; only the first three lift away
    for i, (x, y) in enumerate(cells):
        block(f'tile{i}', GREEN if i < 3 else STONE, t_, t_, .03, r=.05, rnd=.008, at=(x * 1.0 - .0, y, .07))
    lids = [move(block(f'lid{i}', PAPER, t_ + .012, t_ + .012, .05, r=.055, rnd=.012)) for i in range(8)]
    def pose(t):
        for i, (o, (x, y)) in enumerate(zip(lids, cells)):
            lift = pulse(.6 + i * .25, 1.2 + i * .25, 3.5, 4.3, t) if i < 3 else 0
            o.location = (x, y, .1 + .025 + .6 * lift)
    aim_z, scale = .12, 2.5
elif SCENE == 'growth':
    # Growth: a stack of what came back, and one thin tenth of it lifting off as the fee
    def ring_sector(a0, a1, r=.8, n=64):
        pts = [Vector((0, 0))]
        for k in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * k / n)
            pts.append(Vector((r * math.cos(a), r * math.sin(a))))
        return pts
    h = .3
    whole, wc = K.prism('kept', ring_sector(36, 360), h, {'m': mat(GREEN)}, 'm', bevel=0, smooth=True)
    whole.location = (wc.x, wc.y, h / 2)
    fee, gc = K.prism('fee', ring_sector(0, 36), h, {'m': mat(INK)}, 'm', bevel=0, smooth=True)
    move(fee)
    dd = Vector((math.cos(math.radians(18)), math.sin(math.radians(18))))
    def pose(t):
        s_ = pulse(.7, 1.7, 3.4, 4.4, t)
        fee.location = (gc.x + dd.x * .4 * s_, gc.y + dd.y * .4 * s_, h / 2 + .14 * s_)
    aim_z, scale = .15, 2.6
elif SCENE == 'flat':
    # Flat: one fixed slab, and however much comes back, it all stays in the pile on top
    block('slab', INK, 1.5, 1.5, .16, r=.16)
    coins = [move(block(f'coin{i}', GREEN, .62, .62, .085, r=.31, rnd=.018)) for i in range(7)]
    def pose(t):
        for i, o in enumerate(coins):
            rest = .16 + .085 * i
            drop = 1 - smooth(.3 + i * .36, .75 + i * .36, t)
            rise = smooth(3.9 + (6 - i) * .1, 4.5 + (6 - i) * .1, t)
            o.location = (0, 0, rest + .0425 + 2.0 * (drop + rise))
    aim_z, scale = .3, 2.4
elif SCENE == 'closing':
    # money coming back: one chunky arrow that turns around and heads home
    BLUE, CORAL, CREAM = '#5B6CFF', '#FF7A59', '#FFF4E6'
    block('disc', CREAM, 2.0, 2.0, .1, r=1.0, rnd=.03)
    R_, half = .46, .15
    def world(sx, sy):
        return Vector(((sx - sy) * .707, (sx + sy) * .707))
    centre = [(.0 + R_ * math.cos(math.radians(a)), .12 + R_ * math.sin(math.radians(a))) for a in range(-90, 91, 6)]
    outer = [(x + (x) / R_ * half, .12 + (y - .12) / R_ * half + (y - .12)) for x, y in centre]
    inner = [(x - (x) / R_ * half, .12 - (y - .12) / R_ * half + (y - .12)) for x, y in centre]
    stem = .42
    shape = [(-stem, -.34 - half), (0, -.34 - half)] + outer[1:] + [(-.28, .12 + R_ + half), (-.28, .12 + R_ + half + .2), (-.72, .12 + R_), (-.28, .12 + R_ - half - .2), (-.28, .12 + R_ - half)] + inner[::-1][1:-1] + [(0, -.34 + half), (-stem, -.34 + half)]
    ob, c = K.prism('arrow', [world(x, y) for x, y in shape], .26, {'m': mat(BLUE)}, 'm', bevel=0)
    ob.location = (c.x, c.y, .1 + .13)
    finish(ob, .03)
    p0 = world(-.13, .17)                        # the money, home: the arrow curves around it
    for i in range(4):
        block(f'coin{i}', CORAL, .4, .4, .105, r=.2, rnd=.022, at=(p0.x, p0.y, .1 + .11 * i))
    def pose(t):
        pass
    aim_z, scale = .15, 2.6
else:
    # thirty days: the discount window in green, and the payment landing after it closed
    block('plate', INK, 1.95, 1.65, .07, r=.12)
    t_, g = .27, .05
    tiles = {}
    for i in range(30):
        r, c = i // 6, i % 6
        x = -.64 + r * (t_ + g)
        y = -.8 + c * (t_ + g)
        tiles[i] = block(f'day{i}', GREEN if i < 10 else PAPER, t_, t_, .05, r=.05, rnd=.01, at=(x, y, .07))
    r, c = 21 // 6, 21 % 6
    pin = move(block('payment', LEAK, .2, .2, .11, r=.1, rnd=.016))
    px, py = -.64 + r * (t_ + g), -.8 + c * (t_ + g)
    def pose(t):
        pin.location = (px, py, .12 + .055 + 1.7 * (1 - pulse(1.0, 1.9, 3.7, 4.5, t)))
    aim_z, scale = .1, 2.85

# ---------------------------------------------------------------- the view
EL, AZ = math.radians(34), math.radians(-52)
target = Vector((0, 0, aim_z))
d_ = Vector((math.cos(EL) * math.cos(AZ), math.cos(EL) * math.sin(AZ), math.sin(EL)))
cd = bpy.data.cameras.new('cam')
cd.type = 'ORTHO'
cd.ortho_scale = float(A.get('scale', scale))
cam = bpy.data.objects.new('cam', cd)
sc.collection.objects.link(cam)
cam.location = target + d_ * 20
cam.rotation_mode = 'QUATERNION'
cam.rotation_quaternion = (-d_).to_track_quat('-Z', 'Y')
cd.clip_end = 100
sc.camera = cam
sc.render.use_motion_blur = False
sc.render.film_transparent = True

pose(0.0)
if moving:
    bake(sc, moving, pose, DUR)


def sig(f):
    pose(ftime(f))
    return tuple(round(v, 5) for o in moving for v in tuple(o.location) + tuple(o.scale))


if 'frames' in A:
    for f in (int(x) for x in A['frames'].split(',')):
        sc.frame_set(f)
        sc.render.filepath = os.path.join(OUT, f'f_{f:04d}.png')
        bpy.ops.render.render(write_still=True)
else:
    n = frames_in(DUR)
    last, last_path, made = None, None, 0
    for f in range(1, n + 1):
        path = os.path.join(OUT, f'f_{f:04d}.png')
        s = sig(f)
        if os.path.exists(path) and A.get('overwrite') != '1':
            pass
        elif s == last and last_path:
            shutil.copyfile(last_path, path)
        else:
            sc.frame_set(f)
            sc.render.filepath = path
            bpy.ops.render.render(write_still=True)
            made += 1
        last, last_path = s, path
    print(f'FILM DONE {SCENE}: {made} rendered of {n}', flush=True)
