# Animate the auto-rigged characters and export game GLBs. HEADLESS ONLY:
#   blender --background --factory-startup --python scripts/pipeline/animate_characters.py -- [name ...] [--no-render]
# Input: asset_creation/char-glb/rigged/chr_<rig>.blend (from rig_characters.py).
# Output: apps/client/public/assets/models/<name>.glb (validated; rejects go to rigged/_rejected/),
#         rigged/anim_report.json, rigged/_anim_preview/<name>_*.png.
# Clips are procedural keyframes (30 fps), one NLA track per clip, names the game maps FSM states to:
#   all: idle, walk, run, windup, strike, stagger, stunned, purified; bipeds also slam_windup, slam;
#   gartner: idle_scared, talk; felix: asleep_float.
# Corrupted characters get empties eye_L / eye_R parented to the Head bone (the game hangs the red glow on them).
# Pose notation: per bone (rx, ry, rz) degrees = extra rotation in armature (world) axes on top of the parent,
# applied Y, then X, then Z. Model faces -Y (glTF +Z); character's left is +X. 'loc' = Hips offset in metres.
import bpy, os, sys, math, json, struct
import numpy as np
from mathutils import Vector, Matrix

ROOT = r"D:\Codes\TheLastHouse_Assetbuild\TheLastHouseonMapleStreet"
RIG = os.path.join(ROOT, "asset_creation", "char-glb", "rigged")
PUB = os.path.join(ROOT, "apps", "client", "public", "assets", "models")
PREV = os.path.join(RIG, "_anim_preview")
REJ = os.path.join(RIG, "_rejected")
for d in (PREV, REJ):
    os.makedirs(d, exist_ok=True)
FPS = 30
MAX_MB = 3.0

# game name: (rig name, kind, style, corrupted, out dir)
CHARS = {
    "felix":   ("felix",   "biped", "felix",   False, PUB),
    "gartner": ("gartner", "biped", "gartner", False, PUB),
    "briggs":  ("briggs",  "biped", "briggs",  True,  PUB),
    "watcher": ("corwin",  "biped", "watcher", True,  PUB),
    "fox":     ("fox",     "quad",  "fox",     True,  PUB),
    "cat":     ("cat",     "quad",  "cat",     True,  PUB),
    "hound":   ("hound",   "quad",  "hound",   True,  PUB),
    "elena":   ("elena",   "biped", "generic", False, RIG),
    "rosalind": ("rosalind", "biped", "generic", False, RIG),
}
EYE_F = {"fox": 0.40, "cat": 0.26, "hound": 0.42}     # quads: eye distance back from the snout tip, as a fraction of the head length
_ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ONLY = [a for a in _ARGS if not a.startswith("--")] or None
NO_RENDER = "--no-render" in _ARGS
assert bpy.app.background, "run headless"

TAU = 2 * math.pi
S = math.sin
C = math.cos


def smooth(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def pos(x):
    return max(0.0, x)


# ------------------------------------------------------------------ pose helpers
class P(dict):
    """Pose: bone -> [rx, ry, rz]; 'loc' -> [x, y, z]. sym() writes a left value and its mirror."""

    def add(self, b, rx=0.0, ry=0.0, rz=0.0):
        v = self.setdefault(b, [0.0, 0.0, 0.0])
        v[0] += rx; v[1] += ry; v[2] += rz
        return self

    def sym(self, b, rx=0.0, ry=0.0, rz=0.0):
        """b is the left name (LeftArm or FrontUpper_L); right gets (rx, -ry, -rz)."""
        self.add(b, rx, ry, rz)
        rb = ("Right" + b[4:]) if b.startswith("Left") else b[:-2] + "_R"
        return self.add(rb, rx, -ry, -rz)

    def loc(self, x=0.0, y=0.0, z=0.0):
        return self.add("loc", x, y, z)


def lerp_pose(a, b, s):
    out = P()
    for k in set(a) | set(b):
        va, vb = a.get(k, [0, 0, 0]), b.get(k, [0, 0, 0])
        out[k] = [va[i] + (vb[i] - va[i]) * s for i in range(3)]
    return out


def keyed(keys, t):
    """keys: [(t, pose)], smoothstep between them."""
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, p0), (t1, p1) in zip(keys, keys[1:]):
        if t <= t1:
            return lerp_pose(p0, p1, smooth((t - t0) / (t1 - t0)))
    return keys[-1][1]


# ------------------------------------------------------------------ biped clips
class Ch:
    pass


def b_base(c):
    p = P()
    p.add("LeftArm", 0, c.a, 0).add("RightArm", 0, -c.a, 0)
    p.sym("LeftForeArm", -10)
    if c.style == "briggs":
        p.add("Spine1", 8).add("Neck", 6)
    if c.style == "watcher":
        p.add("Spine2", 6).add("Head", 8, 0, 6)
    return p


def b_idle(c, t):
    p = b_base(c)
    p.add("Spine", 1.5 * S(TAU * t)).add("Spine2", 1.2 * S(TAU * t + 0.5)).add("Head", 0, 0, 4 * S(TAU * t))
    p.sym("LeftArm", 2 * S(TAU * t))
    if c.corrupt:
        p.add("Head", 0, 0, 3 * S(TAU * 3 * t))                     # small twitch
    return p


def b_walk(c, t, amp=1.0):
    q = TAU * t
    p = b_base(c)
    th = 24 * amp
    p.add("LeftUpLeg", -th * S(q)).add("RightUpLeg", th * S(q))
    kl = 6 + 34 * amp * pos(C(q)); kr = 6 + 34 * amp * pos(-C(q))
    p.add("LeftLeg", kl).add("RightLeg", kr)
    p.add("LeftFoot", -0.6 * (-th * S(q) + kl)).add("RightFoot", -0.6 * (th * S(q) + kr))
    p.add("LeftArm", 18 * amp * S(q)).add("RightArm", -18 * amp * S(q))
    p.sym("LeftForeArm", -12 * amp)
    p.add("Spine", 0, 0, 4 * S(q)).add("Hips", 0, 0, -4 * S(q)).add("Spine1", 4 * amp).add("Head", 0, 0, -3 * S(q))
    p.loc(z=0.008 * c.H * C(2 * q))
    if c.style == "watcher":
        p.add("Spine2", 6).add("Head", 0, 0, 8 * S(q))              # lurching, head lolls
    return p


def b_run(c, t):
    p = b_walk(c, t, 1.6)
    p.add("Spine1", 10).sym("LeftForeArm", -50)
    p.loc(z=0.01 * c.H * C(2 * TAU * t))
    return p


def b_windup_pose(c):
    p = b_base(c)
    if c.style == "watcher":                                        # grab: both arms reach out slowly
        p.add("LeftArm", -75, -c.a * 0.8, 0).add("RightArm", -75, c.a * 0.8, 0)
        p.sym("LeftForeArm", 10).add("Spine1", 10).add("Head", 10)
    else:                                                           # swipe: right arm up and back
        p.add("RightArm", 30, c.a + 40, 0).add("RightForeArm", -50).add("Spine", 0, 0, -20).add("Head", 6, 0, 10)
    p.add("LeftUpLeg", -10).add("LeftLeg", 12).add("RightLeg", 6)
    return p


def b_strike_pose(c):
    p = b_base(c)
    if c.style == "watcher":
        p.add("LeftArm", -92, -c.a * 0.9, -8).add("RightArm", -92, c.a * 0.9, 8)
        p.add("Spine1", 22).add("Spine2", 8).loc(y=-0.06 * c.H)
    else:
        p.add("RightArm", -80, c.a - 10, 35).add("RightForeArm", -10).add("Spine", 0, 0, 25).add("Spine1", 15)
    p.add("LeftUpLeg", -20).add("LeftLeg", 20).add("RightUpLeg", 10)
    return p


def b_windup(c, t):
    return keyed([(0, b_base(c)), (1, b_windup_pose(c))], t)


def b_strike(c, t):
    return keyed([(0, b_windup_pose(c)), (0.3, b_strike_pose(c)), (0.55, b_strike_pose(c)), (1, b_base(c))], t)


def b_slam_up(c):
    p = b_base(c)
    p.add("LeftArm", -150, -c.a * 0.85, 0).add("RightArm", -150, c.a * 0.85, 0).sym("LeftForeArm", -10)
    return p.add("Spine", -10).add("Spine1", -6).add("Head", -10).sym("LeftUpLeg", -6).sym("LeftLeg", 12)


def b_slam_down(c):
    p = b_base(c)
    p.add("LeftArm", -50, -c.a * 0.6, 0).add("RightArm", -50, c.a * 0.6, 0)
    p.add("Spine", 30).add("Spine1", 15).add("Neck", 10).sym("LeftUpLeg", -35).sym("LeftLeg", 55).sym("LeftFoot", -20)
    return p.loc(z=-0.09 * c.H)


def b_slam_windup(c, t):
    return keyed([(0, b_base(c)), (1, b_slam_up(c))], t)


def b_slam(c, t):
    return keyed([(0, b_slam_up(c)), (0.25, b_slam_down(c)), (0.6, b_slam_down(c)), (1, b_base(c))], t)


def b_stagger(c, t):
    hit = b_base(c).add("Spine", -16).add("Spine1", -8).add("Head", -20).loc(y=0.04 * c.H)
    hit.add("LeftArm", 15, -c.a * 0.4, 0).add("RightArm", 15, c.a * 0.4, 0).add("RightUpLeg", 15).add("RightLeg", 12)
    return keyed([(0, b_base(c)), (0.2, hit), (1, b_base(c))], t)


def b_stunned(c, t):
    p = b_base(c)
    p.loc(z=c.thigh - c.P)                                          # right knee on the ground
    p.add("LeftUpLeg", -85).add("LeftLeg", 85).add("RightUpLeg", 5).add("RightLeg", 95).add("RightFoot", 30)
    p.add("Spine", 18 + 2 * S(TAU * t)).add("Spine1", 10).add("Neck", 10).add("Head", 18 + 3 * S(TAU * t), 0, 6)
    p.sym("LeftArm", -10, 8).sym("LeftForeArm", -20)
    return p


def b_sit(c):
    p = b_base(c)
    hip = max(0.06 * c.H, c.shin * C(math.radians(15)) - c.thigh * S(math.radians(35)))
    p.loc(z=hip - c.P)
    p.sym("LeftUpLeg", -125, 0, -8).sym("LeftLeg", 110).sym("LeftFoot", 15)
    p.sym("LeftArm", -45, -c.a * 0.15).sym("LeftForeArm", -40)
    return p.add("Spine", 22).add("Spine1", 10).add("Head", 18)


def b_purified(c, t):
    p = b_sit(c)
    if c.style == "watcher":
        p.add("Spine", 10 * S(TAU * 2 * t))                         # sit_rocking
    else:
        p.add("Head", 0, 0, 8 * S(TAU * t)).add("Spine1", 2 * S(TAU * t))   # sit_dazed
    return p


def b_idle_scared(c, t):
    p = b_base(c)
    p.add("Spine", 12).add("Spine2", 8).add("Neck", 6).add("Head", 8, 0, 18 * S(TAU * t))
    p.add("Spine1", 0, 0, 1.5 * S(TAU * 6 * t))                      # shiver
    p.sym("LeftArm", -45, -8).sym("LeftForeArm", -70, 0, -55)        # hugging himself
    return p.sym("LeftUpLeg", -5).sym("LeftLeg", 9)


def b_talk(c, t):
    p = b_idle(c, t)
    p.add("Head", 6 * S(TAU * 2 * t)).add("RightArm", -25, -10).add("RightForeArm", -50 + 15 * S(TAU * 2 * t), 0, 20)
    return p.add("Spine", 6)


def b_asleep(c, t):
    p = b_base(c)
    p.add("Spine", 22 + 2 * S(TAU * t)).add("Spine1", 10).add("Neck", 12).add("Head", 20, 0, 18)
    p.sym("LeftArm", -25, 5).sym("LeftForeArm", -60).sym("LeftUpLeg", -50).sym("LeftLeg", 75).sym("LeftFoot", 20)
    return p.loc(z=0.03 * c.H * S(TAU * t))


B_CLIPS = {  # name: (fn, seconds, loop)
    "idle": (b_idle, 3.0, True), "walk": (b_walk, 1.1, True), "run": (b_run, 0.7, True),
    "windup": (b_windup, 1.0, False), "strike": (b_strike, 0.7, False),
    "slam_windup": (b_slam_windup, 1.2, False), "slam": (b_slam, 0.9, False),
    "stagger": (b_stagger, 0.6, False), "stunned": (b_stunned, 2.0, True), "purified": (b_purified, 3.0, True),
}
B_EXTRA = {"gartner": {"idle_scared": (b_idle_scared, 2.0, True), "talk": (b_talk, 2.0, True)},
           "felix": {"asleep_float": (b_asleep, 4.0, True)}}


# ------------------------------------------------------------------ quadruped clips
LEGS = ("FrontUpper_L", "FrontUpper_R", "BackUpper_L", "BackUpper_R")


def leg(p, b, amp, s, cc):
    """Swing one leg: s, cc = sin/cos of its phase."""
    front = b.startswith("Front")
    sd = b[-2:]
    p.add(b, -amp * s)
    if front:
        p.add("FrontLower" + sd, 0.4 * amp * pos(cc)).add("FrontCannon" + sd, 1.8 * amp * pos(cc))
    else:
        p.add("BackLower" + sd, 1.2 * amp * pos(cc)).add("BackCannon" + sd, -1.2 * amp * pos(cc))


def tail(p, t, amp=12, up=0.0):
    for i, n in enumerate(("Tail1", "Tail2", "Tail3")):
        p.add(n, up if i == 0 else 0, 0, amp * S(TAU * t - 0.7 * i))


def q_idle(c, t):
    p = P()
    p.add("Spine1", 1.5 * S(TAU * t)).add("Neck", 3 * S(TAU * t)).add("Head", 0, 0, 10 * S(TAU * t * 0.5))
    tail(p, t, 10)
    if c.corrupt:
        p.add("Head", 0, 0, 4 * S(TAU * 4 * t))
    return p


def q_walk(c, t):
    p = P()
    for b, ph in zip(LEGS, (0.25, 0.75, 0.0, 0.5)):
        leg(p, b, 20, S(TAU * (t + ph)), C(TAU * (t + ph)))
    p.add("Spine1", 0, 0, 3 * S(TAU * t)).add("Neck", 12).add("Head", -8, 0, -3 * S(TAU * t))   # prowl: head low
    tail(p, t, 12)
    return p.loc(z=-0.03 * c.H + 0.01 * c.H * C(2 * TAU * t))


def q_run(c, t):
    p = P()
    for b, ph in zip(LEGS, (0.0, 0.08, 0.5, 0.58)):
        leg(p, b, 40, S(TAU * (t + ph)), C(TAU * (t + ph)))
    p.add("Spine1", 10 * S(TAU * t)).add("Chest", -6 * S(TAU * t)).add("Neck", -8 * S(TAU * t)).add("Head", 6 * S(TAU * t))
    tail(p, t, 6, up=10)
    return p.loc(z=0.04 * c.H * S(TAU * t))


def q_crouch(c):
    p = P().loc(y=0.03 * c.H, z=-0.12 * c.H)
    p.sym("FrontUpper_L", 20).sym("FrontLower_L", -35).sym("FrontCannon_L", 15)
    p.sym("BackUpper_L", -30).sym("BackLower_L", 55).sym("BackCannon_L", -40)
    p.add("Neck", -10).add("Head", 10).add("Tail1", -15)
    return p


def q_lunge(c):
    p = P().loc(y=-0.3 * c.H, z=0.05 * c.H)
    p.sym("FrontUpper_L", -60).sym("FrontLower_L", -10).sym("BackUpper_L", 45).sym("BackLower_L", -10).sym("BackCannon_L", 30)
    return p.add("Neck", -5).add("Head", 15).add("Tail1", 10)


def q_windup(c, t):
    p = keyed([(0, P()), (1, q_crouch(c))], t)
    p.add("Tail3", 0, 0, 25 * S(TAU * 3 * t) * t)
    return p


def q_strike(c, t):
    return keyed([(0, q_crouch(c)), (0.3, q_lunge(c)), (0.5, q_lunge(c)), (1, P())], t)


def q_stagger(c, t):
    hit = P().loc(y=0.08 * c.H).add("Neck", -25).add("Head", -10).add("Spine1", -8).sym("FrontUpper_L", 20)
    return keyed([(0, P()), (0.2, hit), (1, P())], t)


def q_stunned(c, t):
    p = P().add("Hips", 0, 80, 0).loc(z=-(c.spine - 0.14 * c.H))    # on its side
    p.sym("FrontUpper_L", -10).sym("FrontLower_L", 20).sym("BackUpper_L", -15).sym("BackLower_L", 25)
    p.add("Chest", 2 * S(TAU * t)).add("Neck", 15).add("Tail1", 0, 0, 20)
    return p


def q_purified(c, t):
    p = P().loc(z=-0.5 * c.spine)                                   # lying down, calm
    p.sym("FrontUpper_L", -55).sym("FrontLower_L", -40).sym("FrontCannon_L", -10)
    p.sym("BackUpper_L", -80, 0, -10).sym("BackLower_L", 140).sym("BackCannon_L", -70)
    p.add("Neck", -12 + 2 * S(TAU * t)).add("Tail1", 0, 0, 45).add("Tail2", 0, 0, 30).add("Tail3", 0, 0, 20)
    return p


Q_CLIPS = {
    "idle": (q_idle, 3.0, True), "walk": (q_walk, 1.2, True), "run": (q_run, 0.5, True),
    "windup": (q_windup, 1.0, False), "strike": (q_strike, 0.6, False), "stagger": (q_stagger, 0.5, False),
    "stunned": (q_stunned, 2.0, True), "purified": (q_purified, 3.0, True),
}


# ------------------------------------------------------------------ keying
def drot(r):
    return (Matrix.Rotation(math.radians(r[2]), 3, "Z") @ Matrix.Rotation(math.radians(r[0]), 3, "X")
            @ Matrix.Rotation(math.radians(r[1]), 3, "Y"))


def apply_pose(arm, pose):
    W = {}
    prev = {}
    for b in arm.data.bones:                                        # bones come parent-first
        Wp = W[b.parent.name] if b.parent else Matrix.Identity(3)
        D = drot(pose.get(b.name, (0, 0, 0)))
        Wb = D @ Wp
        W[b.name] = Wb
        R = b.matrix_local.to_3x3()
        q = (R.inverted() @ Wp.inverted() @ Wb @ R).to_quaternion()
        pb = arm.pose.bones[b.name]
        pb.rotation_mode = "QUATERNION"
        last = pb.get("_q")
        if last is not None and Vector(last).dot(Vector(q)) < 0:
            q.negate()
        pb.rotation_quaternion = q
        pb["_q"] = list(q)
        pb.location = (0, 0, 0)
    hips = arm.pose.bones["Hips"]
    loc = pose.get("loc", (0, 0, 0))
    hips.location = hips.bone.matrix_local.to_3x3().inverted() @ Vector(loc)


def make_clip(arm, name, fn, c, seconds, loop, step=2):
    n = max(2, round(seconds * FPS))
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    ad = arm.animation_data or arm.animation_data_create()
    ad.action = act
    for pb in arm.pose.bones:
        if "_q" in pb:
            del pb["_q"]
    stepped = c.style == "watcher" and name == "walk"               # the Watcher steps at 12 fps
    frames = list(range(0, n + 1, step))
    if frames[-1] != n:
        frames.append(n)
    if stepped:
        frames = sorted(set([round(i * FPS / 12) for i in range(int(seconds * 12) + 1)] + [n]))
    for f in frames:
        t = f / n
        apply_pose(arm, fn(c, 0.0 if (loop and f == n) else t) if not loop else fn(c, t % 1.0))
        for pb in arm.pose.bones:
            pb.keyframe_insert("rotation_quaternion", frame=f + 1, group=pb.name)
            if pb.name == "Hips":
                pb.keyframe_insert("location", frame=f + 1, group=pb.name)
    if stepped:
        for fc in fcurves_of(act):
            for k in fc.keyframe_points:
                k.interpolation = "CONSTANT"
    ad.action = None
    tr = ad.nla_tracks.new()
    tr.name = name
    st = tr.strips.new(name, 1, act)
    if hasattr(st, "action_slot") and st.action_slot is None and len(getattr(act, "slots", [])):
        st.action_slot = act.slots[0]
    tr.mute = False
    return n + 1


def fcurves_of(act):
    try:
        return list(act.fcurves)
    except Exception:
        out = []
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    out += list(cb.fcurves)
        return out


# ------------------------------------------------------------------ eyes
def verts_world(me):
    a = np.empty(len(me.data.vertices) * 3); me.data.vertices.foreach_get("co", a)
    V = a.reshape(-1, 3)
    M = np.array(me.matrix_world)
    return V @ M[:3, :3].T + M[:3, 3]


def eye_points(c, arm, me):
    V = verts_world(me)
    hb = arm.data.bones["Head"]
    h0, h1 = Vector(hb.head_local), Vector(hb.tail_local)
    if c.kind == "biped":
        hh = h1.z - h0.z                                            # Head bone runs chin/neck -> crown
        ez = h0.z + 0.36 * hh                                       # (front-most point fails on glasses)
        ex = 0.14 * hh
        pts = []
        for sx in (1, -1):
            near = V[(np.abs(V[:, 0] - sx * ex) < 0.03 * hh) & (np.abs(V[:, 2] - ez) < 0.03 * hh)]
            ey = float(near[:, 1].min()) - 0.004 if len(near) else h0.y - 0.4 * hh
            pts.append(Vector((sx * ex, ey, ez)))
        front = min(p.y for p in pts)                                # sparse patches can miss the face on one side
        for p in pts:
            p.y = front
        return pts
    # Quadrupeds: the head may be turned (Meshy fox looks sideways), so find the snout instead of trusting the bone.
    L = (h1 - h0).length
    n0 = Vector(arm.data.bones["Neck"].head_local)
    cand = V[(np.linalg.norm(V - np.array(h0), axis=1) < 1.3 * L) & (V[:, 2] > h0.z - 0.4 * L)]
    dh = np.linalg.norm(cand[:, :2] - np.array(n0[:2]), axis=1)
    sn = cand[int(np.argmax(dh))]
    d = np.array([sn[0] - n0.x, sn[1] - n0.y]); d /= np.linalg.norm(d)
    pp = np.array([-d[1], d[0]])
    Lh = 0.6 * float(np.dot(sn[:2] - np.array(n0[:2]), d))
    ec = sn[:2] - d * EYE_F.get(c.style, 0.4) * Lh
    rel = cand[:, :2] - ec
    along, u = rel @ d, rel @ pp
    slab = (np.abs(along) < 0.1 * Lh)
    zs = cand[slab, 2]
    zlo, zhi = np.percentile(zs, 5), np.percentile(zs, 95)
    ez = zlo + 0.68 * (zhi - zlo)
    band = slab & (np.abs(cand[:, 2] - ez) < 0.12 * Lh)
    pts = []
    for sx in (1, -1):
        us = u[band] * sx
        w = float(us.max()) + 0.004 if len(us) and us.max() > 0 else 0.2 * Lh
        xy = ec + pp * sx * w + d * 0.02 * Lh
        pts.append(Vector((float(xy[0]), float(xy[1]), float(ez))))
    if pts[0].x < pts[1].x:                                         # eye_L is the character's left (+X when facing -Y)
        pts.reverse()
    return pts


def add_eyes(sc, c, arm, me):
    out = []
    for nm, p in zip(("eye_L", "eye_R"), eye_points(c, arm, me)):
        e = bpy.data.objects.new(nm, None)
        e.empty_display_size = 0.01
        sc.collection.objects.link(e)
        e.parent = arm; e.parent_type = "BONE"; e.parent_bone = "Head"
        bpy.context.view_layer.update()
        e.matrix_world = Matrix.Translation(p)
        out.append(e)
    return out


# ------------------------------------------------------------------ export / validate / preview
def export(sc, objs, path):
    for o in sc.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    kw = dict(filepath=path, export_format="GLB", use_selection=True, export_apply=False, export_animations=True,
              export_animation_mode="NLA_TRACKS", export_force_sampling=True, export_skins=True, export_yup=True,
              export_image_format="JPEG", export_cameras=False, export_lights=False, export_morph=False,
              export_extras=False, export_tangents=False, export_anim_slide_to_zero=True)
    try:
        bpy.ops.export_scene.gltf(export_image_quality=85, **kw)
    except TypeError:
        bpy.ops.export_scene.gltf(**kw)


def validate(path, clips, eyes, budget_tris):
    d = open(path, "rb").read()
    n = struct.unpack("<I", d[12:16])[0]
    j = json.loads(d[20:20 + n])
    prims = [p for m in j.get("meshes", []) for p in m["primitives"]]
    tris = sum(j["accessors"][p["indices"]]["count"] // 3 for p in prims)
    names = sorted(a.get("name", "") for a in j.get("animations", []))
    nodes = {nd.get("name") for nd in j["nodes"]}
    r = dict(file_mb=round(len(d) / 2 ** 20, 2), tris=tris, draw_calls=len(prims), clips=names, eyes=bool({"eye_L", "eye_R"} <= nodes))
    fails = []
    if r["file_mb"] >= MAX_MB: fails.append(f"file {r['file_mb']} MB >= {MAX_MB}")
    if tris > budget_tris: fails.append(f"tris {tris} > {budget_tris}")
    if len(prims) >= 3: fails.append(f"draw calls {len(prims)}")
    miss = sorted(set(clips) - set(names))
    if miss: fails.append(f"missing clips {miss}")
    if eyes and not r["eyes"]: fails.append("missing eye_L/eye_R")
    if not j.get("skins"): fails.append("no skin")
    r["fails"] = fails
    return r


def setup_render(sc):
    try:
        sc.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        sc.render.engine = "BLENDER_EEVEE"
    sc.eevee.taa_render_samples = 8
    sc.render.resolution_x, sc.render.resolution_y = 240, 300
    w = bpy.data.worlds.new("W"); w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.3, 0.31, 0.34, 1)
    sc.world = w
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3
    sun.rotation_euler = (math.radians(50), 0, math.radians(-30)); sc.collection.objects.link(sun)
    em = bpy.data.materials.new("EYE"); em.use_nodes = True
    bs = em.node_tree.nodes["Principled BSDF"]
    bs.inputs["Emission Color"].default_value = (1, 0.05, 0.02, 1); bs.inputs["Emission Strength"].default_value = 30
    return cam, em


def look(cam, target, frm, lens=50):
    cam.data.lens = lens
    cam.location = frm
    cam.rotation_euler = (target - frm).to_track_quat("-Z", "Y").to_euler()


def render(sc, path):
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def previews(sc, cam, em, name, c, arm, eyes, clips):
    H = c.H
    side = Vector((-1, -0.25, 0.15)) if c.kind == "quad" else Vector((0.7, -1, 0.15))
    tgt = Vector((0, 0, H * 0.45))
    look(cam, tgt, tgt + side.normalized() * H * (3.2 if c.kind == "quad" else 2.6))
    ad = arm.animation_data
    for tr in ad.nla_tracks:
        tr.mute = True
    for tr in ad.nla_tracks:
        if tr.name not in clips:
            continue
        tr.mute = False
        st = tr.strips[0]
        f = st.frame_start + (st.frame_end - st.frame_start) * (0.5 if clips[tr.name][2] else 0.45)
        sc.frame_set(int(f))
        render(sc, os.path.join(PREV, f"{name}__{tr.name}.png"))
        tr.mute = True
    sc.frame_set(0)
    for pb in arm.pose.bones:                                       # muted tracks leave the last pose behind
        pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    bpy.context.view_layer.update()
    if eyes:                                                        # close-up of the face with stand-in glowing eyes
        balls = []
        for e in eyes:
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.006 * H if c.kind == "biped" else 0.012 * H, location=e.matrix_world.translation)
            b = bpy.context.active_object; b.data.materials.append(em); balls.append(b)
        hd = arm.data.bones["Head"]
        hc = (hd.head_local + hd.tail_local) / 2
        frm = hc + (Vector((0, -1, 0.05)) if c.kind == "biped" else Vector((-0.5, -1, 0.2))).normalized() * H * (0.7 if c.kind == "biped" else 1.4)
        look(cam, hc, frm, 50)
        render(sc, os.path.join(PREV, f"{name}__eyes.png"))
        for b in balls:
            bpy.data.objects.remove(b, do_unlink=True)


# ------------------------------------------------------------------ main
def run():
    sc = bpy.context.scene
    for o in list(sc.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    sc.render.fps = FPS
    cam = em = None
    if not NO_RENDER:
        cam, em = setup_render(sc)
    rep_path = os.path.join(RIG, "anim_report.json")
    report = json.load(open(rep_path)) if os.path.exists(rep_path) else {}
    rig_rep = json.load(open(os.path.join(RIG, "rig_report.json")))
    for name, (rig, kind, style, corrupt, outdir) in CHARS.items():
        if ONLY and name not in ONLY:
            continue
        print("==", name)
        with bpy.data.libraries.load(os.path.join(RIG, f"chr_{rig}.blend")) as (src, dst):
            dst.objects = list(src.objects)
        objs = [o for o in dst.objects if o]
        for o in objs:
            sc.collection.objects.link(o)
        arm = next(o for o in objs if o.type == "ARMATURE")
        me = next(o for o in objs if o.type == "MESH")
        arm.name = name; me.name = f"{name}_mesh"
        c = Ch()
        c.kind, c.style, c.corrupt, c.H = kind, style, corrupt, rig_rep[rig]["height_m"]
        bones = arm.data.bones
        c.P = bones["Hips"].head_local.z
        if kind == "biped":
            v = bones["LeftArm"].tail_local - bones["LeftArm"].head_local
            droop = math.degrees(math.atan2(-v.z, abs(v.x)))
            c.a = 74 - droop
            c.thigh, c.shin = bones["LeftUpLeg"].length, bones["LeftLeg"].length
            clips = dict(B_CLIPS); clips.update(B_EXTRA.get(style, {}))
        else:
            c.spine = c.P
            clips = dict(Q_CLIPS)
        if arm.animation_data:
            for tr in list(arm.animation_data.nla_tracks):
                arm.animation_data.nla_tracks.remove(tr)
        for cn, (fn, secs, loop) in clips.items():
            make_clip(arm, cn, fn, c, secs, loop)
        for pb in arm.pose.bones:
            pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
        for m in me.data.materials:                                 # 1024 textures (the .blend keeps the 2048 source)
            for nd in (m.node_tree.nodes if m and m.use_nodes else []):
                if nd.type == "TEX_IMAGE" and nd.image and max(nd.image.size) > 1024:
                    nd.image.scale(1024, 1024)
        for tr in arm.animation_data.nla_tracks:                   # place the eyes against the REST head
            tr.mute = True
        bpy.context.view_layer.update()
        eyes = add_eyes(sc, c, arm, me) if corrupt else []
        for tr in arm.animation_data.nla_tracks:
            tr.mute = False
        out = os.path.join(outdir, f"{name}.glb")
        export(sc, [arm, me] + eyes, out)
        val = validate(out, list(clips), corrupt, rig_rep[rig]["glb_tris"] + 10)
        if val["fails"]:
            os.replace(out, os.path.join(REJ, f"{name}.glb"))
            print("  REJECTED", val["fails"])
        if cam:
            previews(sc, cam, em, name, c, arm, eyes, clips)
        report[name] = dict(rig=rig, out=out, corrupted=corrupt, arm_down_deg=round(getattr(c, "a", 0), 1),
                            eye_pos=[[round(v, 3) for v in e.matrix_world.translation] for e in eyes], **val)
        print("  ", json.dumps(report[name]))
        for o in objs + eyes:
            bpy.data.objects.remove(o, do_unlink=True)
        for a in list(bpy.data.actions):
            bpy.data.actions.remove(a)
    json.dump(report, open(rep_path, "w"), indent=2)


run()
