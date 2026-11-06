"""The How It Works page's step models, one small scene per part, all from the same kit (ink slabs, green,
paper sheets). Near-isometric and orthographic. Each loop starts and ends at rest. The page's logo is hero_stack.py.

  "$B" -b --factory-startup --python hiw_models.py -- scene=records out=out/hiw/records frames=1,60 res=720 spp=32 device=METAL
  "$B" -b --factory-startup --python hiw_models.py -- scene=records out=out/hiw/records res=960 spp=48 device=METAL

scene: records | checks | evidence | recover. See render_hiw.sh for the full set.
"""
import bpy, bmesh, math, os, shutil, sys
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import looklib as K
from exhibit_common import A, FPS, stage, bake, out_dir, frames_in, ftime   # pass fps=30: it is read on import

A.setdefault('sun', '-.05,.8,.95')
A.setdefault('sunA', '20')
A.setdefault('fill', '.34')
A.setdefault('shade', '.34')
SCENE = A.get('scene', 'records')
DUR = {'records': 6.0, 'checks': 6.0, 'evidence': 6.0, 'recover': 6.0}[SCENE]
OUT = out_dir(f'out/hiw/{SCENE}')

INK, GREEN, PAPER, LEAK = '#0B1511', '#00E487', '#EFEBE1', '#E5482B'
S = 1.0                  # a slab's side
R0 = .13                 # its corner radius
sc, floor, _ = stage('mint', DUR)
res = int(A.get('res', 1200))
sc.render.resolution_x = sc.render.resolution_y = res
sc.render.fps = int(A['fps'])
sc['bg'] = 'ebe7de'
floor.visible_diffuse = False

MATS = {}
def mat(c):
    if c not in MATS:
        rough = {INK: .5, GREEN: .42, PAPER: .6, LEAK: .45}.get(c, .5)
        MATS[c] = K.plain(c, c, rough, spec=.22 if c == INK else .45)
    return MATS[c]


def rrect(w, d, r, n=10):
    pts = []
    for cx, cy, a0 in ((w / 2 - r, -d / 2 + r, -90), (w / 2 - r, d / 2 - r, 0), (-w / 2 + r, d / 2 - r, 90), (-w / 2 + r, -d / 2 + r, 180)):
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append(Vector((cx + r * math.cos(a), cy + r * math.sin(a))))
    return pts


def slab(name, c, h, w=S, d=S, r=R0, rnd=.022):
    ob, _ = K.prism(name, rrect(w, d, r, 32 if r > .15 else 10), h, {'m': mat(c)}, 'm', bevel=0, smooth=True)
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


def smooth(a, b, t):
    x = max(0.0, min(1.0, (t - a) / (b - a)))
    return x * x * x * (x * (6 * x - 15) + 10)


def inlay(parent, h, shapes, c=PAPER, depth=.02):
    """Sets flat shapes into the top of a slab: each is cut in, and the cut's faces take colour c."""
    cuts = bpy.data.collections.new(parent.name + '_cuts')
    sc.collection.children.link(cuts)
    for i, (pts, x, y, rot) in enumerate(shapes):
        o, _ = K.prism(f'{parent.name}_cut{i}', pts, depth * 2, {'m': mat(c)}, 'm', bevel=0, coll=cuts)
        o.location = (x, y, h / 2)
        o.rotation_euler = (0, 0, rot)
        o.parent = parent
        o.hide_render = True
        o.display_type = 'WIRE'
    bo = parent.modifiers.new('cuts', 'BOOLEAN')
    bo.operation, bo.operand_type, bo.collection, bo.solver = 'DIFFERENCE', 'COLLECTION', cuts, 'EXACT'
    bo.material_mode = 'TRANSFER'
    parent.modifiers.move(1, 0)


def ruled(parent, h, lines=4, w=.74):
    for k in range(lines):
        L = w * (.5 if k == lines - 1 else 1)
        o, _ = K.prism(f'{parent.name}_line{k}', rrect(.024, L, .011, 3), .002, {'m': mat('#A39E91')}, 'm', bevel=0)
        o.parent = parent
        o.location = (-.28 + k * .17, (L - w) / 2, h / 2 + .001)


objs = []
def add(o):
    objs.append(o)
    return o


TH, GAP = .135, .0
if SCENE == 'records':
    # a loop that starts empty: the last frame and the first both show the bare slab
    base = add(slab('base', INK, TH))
    colours = [PAPER, '#C2F1D4', PAPER, '#F4B99E', PAPER]
    sheets = [add(slab(f'sheet{i}', c, .05, r=.1, rnd=.012)) for i, c in enumerate(colours)]
    ruled(sheets[-1], .05)
    def pose(t):
        base.location = (0, 0, TH / 2)
        for i, o in enumerate(sheets):
            rest = TH + .05 * i + .025
            drop = 1 - smooth(.35 + i * .42, .95 + i * .42, t)         # falls in, the lowest first
            rise = smooth(4.5 + (4 - i) * .18, 5.3 + (4 - i) * .18, t)       # and lifts away again, the top first
            o.location = (0, 0, rest + 1.7 * (drop + rise))
    frame_h = .3
elif SCENE == 'checks':
    colours = [PAPER, PAPER, LEAK, PAPER, PAPER, PAPER]
    sheets = [add(slab(f'sheet{i}', c, .07, r=.1, rnd=.014)) for i, c in enumerate(colours)]
    ruled(sheets[-1], .07)
    t_, l_ = .075, 1.3
    bars = [add(slab(f'bar{i}', GREEN, .07, *wh, r=.03, rnd=.012)) for i, wh in enumerate(((l_, t_), (l_, t_), (t_, l_), (t_, l_)))]
    def pose(t):
        for i, o in enumerate(sheets):
            pull = smooth(2.5, 3.2, t) - smooth(4.1, 4.8, t) if i == 2 else 0
            o.location = (.3 * pull, 0, .035 + .07 * i + (.02 if i > 2 else 0) * pull)
        top, low = .5, .03
        d = smooth(.4, 2.3, t) - smooth(3.7, 5.5, t)
        z = top + (low - top) * d
        for o, (x, y) in zip(bars, ((0, -.6125), (0, .6125), (-.6125, 0), (.6125, 0))):
            o.location = (x, y, z)
    frame_h = .25
elif SCENE == 'evidence':
    left, right = add(slab('left', PAPER, .06, r=.1, rnd=.013)), add(slab('right', PAPER, .06, r=.1, rnd=.013))
    ruled(left, .06)
    ruled(right, .06)
    base = add(slab('base', INK, .09, 1.2, 1.2))
    badge = add(slab('badge', GREEN, .08, .42, .42, r=.21, rnd=.016))
    # a check mark as it reads on screen, turned onto the badge's top
    tick = [Vector(((x - y) * .707, (x + y) * .707)) for x, y in ((-.025, -.11), (.125, .06), (.09, .095), (-.025, -.03), (-.08, .03), (-.115, -.005))]
    mark, c = K.prism('tick', tick, .002, {'m': mat(PAPER)}, 'm', bevel=0)
    mark.parent = badge
    mark.location = (c.x, c.y, .041)
    def pose(t):
        base.location = (0, 0, .045)
        apart = smooth(.5, 1.5, t) - smooth(4.4, 5.3, t)
        left.location = (0, -.03 - .57 * apart, .12)
        right.location = (0, .03 + .57 * apart, .12 + .06 * (1 - apart))
        drop = 1 - smooth(1.6, 2.3, t) + smooth(4.0, 4.6, t)
        badge.location = (.0, 0, .2 + 1.7 * drop)
    frame_h = .25
else:
    base = [add(slab('b0', INK, TH)), add(slab('b1', INK, TH))]
    def coin(i):
        ob = add(slab(f'coin{i}', GREEN, .075, .5, .5, r=.25, rnd=.018))
        return ob
    coins = [coin(i) for i in range(5)]
    def pose(t):
        for i, o in enumerate(base):
            o.location = (0, 0, TH / 2 + i * TH)
        for i, o in enumerate(coins):
            rest = 2 * TH + .0375 + .075 * i
            drop = 1 - smooth(.4 + i * .42, .9 + i * .42, t)
            rise = smooth(4.6 + (4 - i) * .18, 5.3 + (4 - i) * .18, t)
            o.location = (0, 0, rest + 1.9 * (drop + rise))
    frame_h = .4


# ---------------------------------------------------------------- the view: orthographic, the mark's angle
EL, AZ = math.radians(30), math.radians(-45)
target = Vector((0, 0, frame_h))
d = Vector((math.cos(EL) * math.cos(AZ), math.cos(EL) * math.sin(AZ), math.sin(EL)))
cd = bpy.data.cameras.new('cam')
cd.type = 'ORTHO'
cd.ortho_scale = float(A.get('scale', 2.8 if SCENE == 'evidence' else 2.3))
cam = bpy.data.objects.new('cam', cd)
sc.collection.objects.link(cam)
cam.location = target + d * 20
cam.rotation_mode = 'QUATERNION'
cam.rotation_quaternion = (-d).to_track_quat('-Z', 'Y')
cd.clip_end = 100
sc.camera = cam
sc.render.use_motion_blur = False

pose(0.0)
bake(sc, objs, pose, DUR)
sc.render.film_transparent = True


def sig(f):
    pose(ftime(f))
    return tuple(round(v, 5) for o in objs for v in o.location)


if 'frames' in A:
    for f in (int(x) for x in A['frames'].split(',')):
        sc.frame_set(f)
        sc.render.filepath = os.path.join(OUT, f'f_{f:04d}.png')
        bpy.ops.render.render(write_still=True)
        print('WROTE', sc.render.filepath, flush=True)
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
