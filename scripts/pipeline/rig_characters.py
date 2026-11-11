# Auto-rig the Meshy character GLBs in asset_creation/char-glb (biped T-poses + quadrupeds).
# HEADLESS ONLY (switching scenes inside the GUI bridge crashed Blender 4.5):
#   blender --background --factory-startup --python scripts/pipeline/rig_characters.py -- [name ...] [--no-render]
# From the bridge use asset_creation/bridge/jobs template rig_launch (Popen, log to char-glb/rigged/rig_run.log).
# Idempotent: overwrites its own outputs only.
# Per character: import -> bake transforms -> scale to real height, feet at 0, facing -Y (glTF +Z)
#   -> merge doubles -> decimate to the asset-manifest budget -> joints measured from the mesh
#   -> armature (Mixamo-style names, no dots so three.js keeps them) -> heat weights (fallback: bone-distance)
#   -> limit 4 influences -> textures 1024 -> GLB -> validation -> EEVEE previews (rest + test pose) + .blend.
import bpy, bmesh, os, json, math, struct, time
import numpy as np
from mathutils import Vector, Matrix

ROOT = r"D:\Codes\TheLastHouse_Assetbuild\TheLastHouseonMapleStreet"
SRC = os.path.join(ROOT, "asset_creation", "char-glb")
OUT = os.path.join(SRC, "rigged")
PREV = os.path.join(OUT, "_preview")
REJ = os.path.join(OUT, "_rejected")
for d in (OUT, PREV, REJ):
    os.makedirs(d, exist_ok=True)

# name: (source, kind, height m incl. ears/hair, triangle budget from asset-manifest; 12k where unlisted)
CHARS = {
    "felix":       ("tpose_felix.glb",    "biped", 1.28, 10000),
    "gartner":     ("tpose_gartner.glb",  "biped", 1.33, 10000),
    "briggs":      ("tpose_briggs.glb",   "biped", 1.78, 15000),
    "elena":       ("tpose_elena.glb",    "biped", 1.66, 12000),
    "corwin":      ("tpose_corwin.glb",   "biped", 1.78, 12000),
    "rosalind":    ("rosalind-tpose.glb", "biped", 1.62, 12000),
    "rosalind_v1": ("tpose_rosalind.glb", "biped", 1.62, 12000),
    "fox":         ("pose_fox.glb",       "quad",  0.50, 5000),
    "cat":         ("pose_cat.glb",       "quad",  0.32, 5000),
    "hound":       ("pose_hound.glb",     "quad",  0.78, 6000),
}
TEX = 1024
MAX_FILE_MB = 3.0      # copy-to-main.ps1 rejects >= 3 MB
MAX_TEX_MB = 10.0
MAX_DRAW = 3
import sys
_ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ONLY = [a for a in _ARGS if not a.startswith("--")] or None
NO_RENDER = "--no-render" in _ARGS
assert bpy.app.background, "run headless: blender --background --python rig_characters.py"


def ctx(sc, **kw):
    return bpy.context.temp_override(scene=sc, view_layer=sc.view_layers[0], **kw)


def verts(o):
    a = np.empty(len(o.data.vertices) * 3, dtype=np.float64)
    o.data.vertices.foreach_get("co", a)
    return a.reshape(-1, 3)


def med(a, d):
    return float(np.median(a)) if len(a) else float(d)


def ids_snapshot():
    return {k: set(getattr(bpy.data, k)) for k in ("meshes", "armatures", "materials", "images", "textures", "actions", "cameras", "lights", "worlds")}


def purge_new(before):
    for k, old in before.items():
        coll = getattr(bpy.data, k)
        for idb in list(coll):
            if idb not in old and idb.users == 0:
                coll.remove(idb)


# ---------------------------------------------------------------- import / prep
def import_mesh(sc, path):
    before = set(bpy.data.objects)
    with ctx(sc):
        bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.data.transform(mw)
        o.matrix_world = Matrix.Identity(4)
    for o in new:
        if o.type != "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
    if len(meshes) > 1:
        vl = sc.view_layers[0]
        vl.objects.active = meshes[0]
        with ctx(sc, active_object=meshes[0], object=meshes[0], selected_objects=meshes, selected_editable_objects=meshes):
            bpy.ops.object.join()
    return meshes[0]


def prep(sc, o, H, kind):
    me = o.data
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(me); bm.free()
    V = verts(o)
    zmin, zmax = V[:, 2].min(), V[:, 2].max()
    s = H / (zmax - zmin)
    me.transform(Matrix.Scale(s, 4) @ Matrix.Translation((0, 0, -zmin)))
    V = verts(o)
    # facing: front must be -Y (glTF +Z, game convention)
    if kind == "biped":
        # toes stick out in front of the shins; needs a clear margin, Meshy exports already face glTF +Z
        toes = V[(V[:, 2] < 0.025 * H) & (np.abs(V[:, 0]) < 0.15 * H)]
        shin = V[(V[:, 2] > 0.08 * H) & (V[:, 2] < 0.14 * H) & (np.abs(V[:, 0]) < 0.15 * H)]
        dy = med(toes[:, 1], 0) - med(shin[:, 1], 0)
        print("  facing check toes-shins dy/H = %.3f" % (dy / H))
        flip = dy > 0.02 * H
    else:
        y = V[:, 1]; L = y.max() - y.min()
        a = V[y < y.min() + 0.25 * L]; b = V[y > y.max() - 0.25 * L]
        flip = b[:, 2].max() > a[:, 2].max()                          # head end is the higher end
    if flip:
        me.transform(Matrix.Rotation(math.pi, 4, "Z"))
    V = verts(o)
    foot = V[V[:, 2] < 0.06 * H]
    cx = (foot[:, 0].min() + foot[:, 0].max()) / 2
    cy = (foot[:, 1].min() + foot[:, 1].max()) / 2
    me.transform(Matrix.Translation((-cx, -cy, 0)))
    try:
        with ctx(sc, active_object=o, object=o):
            bpy.ops.mesh.customdata_custom_splitnormals_clear()
    except Exception as e:
        print("  normals clear skipped:", e)
    me.shade_smooth()
    return flip


def tri_count(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def decimate(sc, o, budget):
    t = tri_count(o)
    if t > budget:
        m = o.modifiers.new("dec", "DECIMATE")
        m.decimate_type = "COLLAPSE"; m.ratio = budget / t * 0.98; m.use_collapse_triangulate = True
        sc.view_layers[0].objects.active = o
        with ctx(sc, active_object=o, object=o):
            bpy.ops.object.modifier_apply(modifier="dec")
    return tri_count(o)


# ---------------------------------------------------------------- joints
def biped_bones(V, H):
    x, y, z = V[:, 0], V[:, 1], V[:, 2]
    span = np.abs(x).max()
    torso = V[(np.abs(x) < 0.12 * H) & (z > 0.45 * H) & (z < 0.7 * H)]
    cy = med(torso[:, 1], 0)
    top = z.max()
    apose = span < 0.42 * H                                         # arms hang down at an angle
    if apose:
        ws = []
        for zz in np.arange(top - 0.02 * H, 0.5 * H, -0.005 * H):
            b = V[(z >= zz) & (z < zz + 0.01 * H)]
            ws.append((zz, np.percentile(np.abs(b[:, 0]), 95) if len(b) > 5 else 0))
        headW = np.median([w for zz, w in ws if zz > top - 0.1 * H])
        shTop = next((zz for zz, w in ws if zz < top - 0.12 * H and w > 1.8 * headW), 0.82 * H)
        armZ = shTop - 0.03 * H
    else:
        arm = V[np.abs(x) > 0.6 * span]
        armZ = med(arm[:, 2], 0.8 * H)

    def arm_at(xj, side, zlo=0.12, zhi=0.1):
        sel = V[(np.abs(x - side * xj) < 0.02 * H) & (z > armZ - zlo * H) & (z < armZ + zhi * H)]
        return Vector((side * xj, med(sel[:, 1], cy), med(sel[:, 2], armZ)))

    best = None                                                     # neck = narrowest band just above the arm line
    for zz in np.arange(armZ + 0.01 * H, min(top - 0.12 * H, armZ + 0.12 * H), 0.004 * H):
        b = V[(z >= zz) & (z < zz + 0.01 * H)]
        if len(b) < 10:
            continue
        w = np.percentile(np.abs(b[:, 0]), 90)
        if best is None or w < best[0]:
            best = (w, zz)
    neckZ = best[1] if best else armZ + 0.06 * H
    head = V[z > neckZ + 0.03 * H]
    hy = med(head[:, 1], cy)

    tb = V[(z > armZ - 0.16 * H) & (z < armZ - 0.09 * H)]
    tw = np.percentile(np.abs(tb[:, 0]), 90) if len(tb) else 0.1 * H
    shX = float(np.clip(tw * 0.9, 0.06 * H, 0.13 * H))
    wrX = span - 0.085 * H
    elX = shX + 0.56 * (wrX - shX)

    hipZ = None                                                     # crotch = lowest z where the centre fills in
    for zz in np.arange(0.15 * H, 0.62 * H, 0.005 * H):
        b = V[(z >= zz) & (z < zz + 0.01 * H) & (np.abs(y - cy) < 0.1 * H)]
        if len(b) and (np.abs(b[:, 0]) < 0.012 * H).any():
            hipZ = zz
            break
    dress = hipZ is None or hipZ < 0.3 * H
    if dress:
        hipZ = (0.47 if H < 1.45 else 0.5) * H
    P = hipZ + 0.04 * H
    feet = V[z < 0.06 * H]

    bones = {"Root": (Vector((0, 0, 0)), Vector((0, -0.1 * H, 0)), None, False)}
    neckBase = neckZ - 0.02 * H
    s1 = P + 0.08 * H
    sp = [s1 + k * (neckBase - s1) / 3 for k in range(4)]
    bones["Hips"] = (Vector((0, cy, P)), Vector((0, cy, s1)), "Root", True)
    for i, n in enumerate(("Spine", "Spine1", "Spine2")):
        bones[n] = (Vector((0, cy, sp[i])), Vector((0, cy, sp[i + 1])), ("Hips", "Spine", "Spine1")[i], True)
    nt = Vector((0, (cy + hy) / 2, neckZ + 0.03 * H))
    bones["Neck"] = (Vector((0, cy, neckBase)), nt, "Spine2", True)
    bones["Head"] = (nt, Vector((0, hy, top)), "Neck", True)
    for side, S in ((1, "Left"), (-1, "Right")):                    # facing -Y: character's left is +X
        if apose:
            hand = V[(x * side) > 0.93 * span]
            tip = Vector(hand.mean(axis=0)); tip.z = float(hand[:, 2].min()) + 0.3 * float(np.ptp(hand[:, 2]))
            sh = Vector((side * shX, cy, armZ))
            L = (tip - sh).length
            wr = sh + (tip - sh) * ((L - 0.085 * H) / L)
            el = sh + (wr - sh) * 0.56; el.y += 0.01 * H
        else:
            sh = arm_at(shX + 0.03 * H, side); sh.x = side * shX
            el = arm_at(elX, side); el.y += 0.01 * H                # tiny back-bend so IK knows the elbow direction
            wr = arm_at(wrX, side)
            tip = Vector((side * span, wr.y, wr.z))
        bones[S + "Shoulder"] = (Vector((side * 0.03 * H, cy, sh.z)), sh, "Spine2", True)
        bones[S + "Arm"] = (sh, el, S + "Shoulder", True)
        bones[S + "ForeArm"] = (el, wr, S + "Arm", True)
        bones[S + "Hand"] = (wr, tip, S + "ForeArm", True)
        fs = feet[feet[:, 0] * side > 0]
        fx = med(np.abs(fs[:, 0]), 0.07 * H)
        toeY = float(fs[:, 1].min()) if len(fs) else cy - 0.1 * H
        heelY = float(fs[:, 1].max()) if len(fs) else cy + 0.05 * H
        hx = float(np.clip(fx, 0.045 * H, 0.1 * H))
        hip = Vector((side * hx, cy, P))
        ank = Vector((side * fx, heelY + 0.25 * (toeY - heelY), 0.045 * H))
        knee = (hip + ank) / 2; knee.z += 0.01 * H; knee.y -= 0.012 * H
        ball = Vector((side * fx, heelY + 0.72 * (toeY - heelY), 0.015 * H))
        toe = Vector((side * fx, toeY, 0.012 * H))
        bones[S + "UpLeg"] = (hip, knee, "Hips", True)
        bones[S + "Leg"] = (knee, ank, S + "UpLeg", True)
        bones[S + "Foot"] = (ank, ball, S + "Leg", True)
        bones[S + "ToeBase"] = (ball, toe, S + "Foot", True)
    info = dict(apose=bool(apose), armZ=armZ / H, neckZ=neckZ / H, hipZ=hipZ / H, dress_or_no_leg_gap=bool(dress), span=span / H)
    return bones, info


def quad_bones(V, H):
    x, y, z = V[:, 0], V[:, 1], V[:, 2]
    Lt = y.max() - y.min()
    bot = V[z < 0.05 * H]
    ym = med(bot[:, 1], 0)
    feet = {}
    for side, S in ((1, "L"), (-1, "R")):
        for end, E in ((-1, "Front"), (1, "Back")):
            q = bot[(bot[:, 0] * side > 0) & ((bot[:, 1] - ym) * end > 0)]
            feet[(E, S)] = (abs(med(q[:, 0], 0.06 * H)), med(q[:, 1], ym + end * 0.25 * Lt))
    yf = (feet[("Front", "L")][1] + feet[("Front", "R")][1]) / 2
    yb = (feet[("Back", "L")][1] + feet[("Back", "R")][1]) / 2

    def spine_z(yy):
        b = V[(np.abs(x) < 0.05 * H) & (np.abs(y - yy) < 0.04 * Lt) & (z > 0.2 * H)]
        if len(b) < 5:
            return 0.6 * H
        lo, hi = np.percentile(b[:, 2], 10), np.percentile(b[:, 2], 95)
        return float(lo + 0.6 * (hi - lo))

    y0 = yb + 0.03 * Lt
    pts = [Vector((0, y0 + k * (yf - y0) / 4, 0)) for k in range(5)]
    for p in pts:
        p.z = spine_z(p.y)
    bones = {"Root": (Vector((0, 0, 0)), Vector((0, -0.25 * H, 0)), None, False)}
    names = ("Hips", "Spine", "Spine1", "Chest")
    for i, n in enumerate(names):
        bones[n] = (pts[i], pts[i + 1], "Root" if i == 0 else names[i - 1], True)

    hi = V[z > 0.5 * H]
    iS = int(np.argmin(hi[:, 1]))
    yS = float(hi[iS, 1])
    hr = V[(y < yS + 0.12 * Lt) & (z > 0.4 * H)]
    zH = med(hr[:, 2], hi[iS, 2])
    hb = Vector((0, min(yS + 0.14 * Lt, pts[4].y - 0.02 * Lt), zH))
    bones["Neck"] = (pts[4], hb, "Chest", True)
    bones["Head"] = (hb, Vector((0, yS, zH - 0.03 * H)), "Neck", True)

    tail = V[y > pts[0].y + 0.06 * Lt]
    tinfo = len(tail)
    if len(tail) > 30:
        d = np.linalg.norm(tail - np.array(pts[0]), axis=1)
        order = np.argsort(d)
        n = len(order)
        T0 = Vector(tail[order[: max(5, n // 10)]].mean(axis=0)); T0.x = 0
        tip = Vector(tail[order[-max(3, n // 50):]].mean(axis=0))
        c1 = Vector(tail[order[n // 3 - n // 20: n // 3 + n // 20]].mean(axis=0))
        c2 = Vector(tail[order[2 * n // 3 - n // 20: 2 * n // 3 + n // 20]].mean(axis=0))
        bones["Tail1"] = (T0, c1, "Hips", True)
        bones["Tail2"] = (c1, c2, "Tail1", True)
        bones["Tail3"] = (c2, tip, "Tail2", True)
        bones["Hips"] = (T0 if False else pts[0], pts[1], "Root", True)

    for (E, S), (fx, fy) in feet.items():
        side = 1 if S == "L" else -1
        top = spine_z(fy) * (0.92 if E == "Front" else 0.95)
        X = side * fx
        if E == "Front":
            a = Vector((X * 0.8, fy + 0.01 * H, top)); b = Vector((X, fy + 0.03 * H, 0.58 * top))
            c = Vector((X, fy, 0.2 * top)); d = Vector((X, fy - 0.01 * H, 0.04 * H)); e = Vector((X, fy - 0.06 * H, 0.01 * H))
            par = "Chest"
        else:
            a = Vector((X * 0.8, fy - 0.03 * H, top)); b = Vector((X, fy - 0.08 * H, 0.6 * top))
            c = Vector((X, fy + 0.07 * H, 0.27 * top)); d = Vector((X, fy + 0.01 * H, 0.04 * H)); e = Vector((X, fy - 0.05 * H, 0.01 * H))
            par = "Hips"
        bones[f"{E}Upper_{S}"] = (a, b, par, True)
        bones[f"{E}Lower_{S}"] = (b, c, f"{E}Upper_{S}", True)
        bones[f"{E}Cannon_{S}"] = (c, d, f"{E}Lower_{S}", True)
        bones[f"{E}Paw_{S}"] = (d, e, f"{E}Cannon_{S}", True)
    info = dict(len=Lt / H, front_y=yf / H, back_y=yb / H, tail_verts=int(tinfo), has_tail="Tail1" in bones)
    return bones, info


# ---------------------------------------------------------------- armature + weights
def build_armature(sc, name, bones):
    arm = bpy.data.armatures.new(name + "_rig")
    ob = bpy.data.objects.new(name, arm)
    sc.collection.objects.link(ob)
    ob.show_in_front = True
    vl = sc.view_layers[0]; vl.objects.active = ob
    with ctx(sc, active_object=ob, object=ob):
        bpy.ops.object.mode_set(mode="EDIT")
        for bn, (h, t, par, deform) in bones.items():
            eb = arm.edit_bones.new(bn)
            eb.head, eb.tail, eb.use_deform = h, t, deform
            d = (t - h).normalized()
            eb.align_roll(Vector((0, 0, 1)) if abs(d.y) > 0.7 else Vector((0, -1, 0)))
        for bn, (h, t, par, deform) in bones.items():
            if par:
                eb = arm.edit_bones[bn]; eb.parent = arm.edit_bones[par]
                eb.use_connect = (eb.parent.tail - eb.head).length < 1e-5
        bpy.ops.object.mode_set(mode="OBJECT")
    return ob


def seg_dist(P, A, B):
    AB = B - A
    t = np.clip(((P[:, None, :] - A[None]) * AB[None]).sum(-1) / np.maximum((AB * AB).sum(-1), 1e-12)[None], 0, 1)
    C = A[None] + t[..., None] * AB[None]
    return np.linalg.norm(P[:, None, :] - C, axis=-1)


def distance_weights(me_ob, arm_ob, only=None):
    """Two-nearest-bone falloff weights. only = vertex indices to (re)weight, else all."""
    deform = [b for b in arm_ob.data.bones if b.use_deform]
    A = np.array([b.head_local for b in deform]); B = np.array([b.tail_local for b in deform])
    V = verts(me_ob)
    idx = np.arange(len(V)) if only is None else np.asarray(only)
    if not len(idx):
        return
    D = seg_dist(V[idx], A, B)
    o2 = np.argsort(D, axis=1)[:, :2]
    d1 = np.take_along_axis(D, o2[:, :1], 1)[:, 0]; d2 = np.take_along_axis(D, o2[:, 1:2], 1)[:, 0]
    w1 = d2 ** 4 / np.maximum(d1 ** 4 + d2 ** 4, 1e-12)
    for g in list(me_ob.vertex_groups):
        if only is None:
            me_ob.vertex_groups.remove(g)
    groups = {b.name: me_ob.vertex_groups.get(b.name) or me_ob.vertex_groups.new(name=b.name) for b in deform}
    if only is not None:
        for g in groups.values():
            g.remove([int(i) for i in idx])
    for k, vi in enumerate(idx):
        groups[deform[o2[k, 0]].name].add([int(vi)], float(w1[k]), "REPLACE")
        if w1[k] < 0.999:
            groups[deform[o2[k, 1]].name].add([int(vi)], float(1 - w1[k]), "REPLACE")


def weight_stats(me_ob, arm_ob):
    names = {b.name for b in arm_ob.data.bones if b.use_deform}
    gname = {g.index: g.name for g in me_ob.vertex_groups}
    un, used = [], set()
    for v in me_ob.data.vertices:
        s = 0.0
        for g in v.groups:
            n = gname.get(g.group)
            if n in names and g.weight > 1e-3:
                s += g.weight; used.add(n)
        if s < 1e-3:
            un.append(v.index)
    return un, sorted(names - used)


def skin(sc, me_ob, arm_ob):
    vl = sc.view_layers[0]
    for o in sc.objects:
        o.select_set(False, view_layer=vl)
    me_ob.select_set(True, view_layer=vl); arm_ob.select_set(True, view_layer=vl); vl.objects.active = arm_ob
    with ctx(sc, active_object=arm_ob, object=arm_ob, selected_objects=[me_ob, arm_ob], selected_editable_objects=[me_ob, arm_ob]):
        bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    un, empty = weight_stats(me_ob, arm_ob)
    n = len(me_ob.data.vertices)
    method = "heat"
    if len(un) > 0.05 * n or len(empty) > 2:
        distance_weights(me_ob, arm_ob); method = "distance (heat failed: %d unweighted, empty bones %s)" % (len(un), empty)
    elif un:
        distance_weights(me_ob, arm_ob, only=un); method = "heat + distance fill for %d verts" % len(un)
    vl.objects.active = me_ob
    with ctx(sc, active_object=me_ob, object=me_ob):
        bpy.ops.object.vertex_group_limit_total(group_select_mode="BONE_DEFORM", limit=4)
        bpy.ops.object.vertex_group_normalize_all(group_select_mode="BONE_DEFORM", lock_active=False)
    un2, empty2 = weight_stats(me_ob, arm_ob)
    return method, len(un2), empty2


# ---------------------------------------------------------------- export + validation
def shrink_textures(me_ob):
    tex_bytes = 0
    for m in me_ob.data.materials:
        if not (m and m.use_nodes):
            continue
        for nd in m.node_tree.nodes:
            if nd.type == "TEX_IMAGE" and nd.image:
                im = nd.image
                if max(im.size) > TEX:
                    im.scale(TEX, TEX)
                tex_bytes += im.size[0] * im.size[1] * 4
    return tex_bytes


def export(sc, arm_ob, me_ob, path):
    vl = sc.view_layers[0]
    for o in sc.objects:
        o.select_set(False, view_layer=vl)
    arm_ob.select_set(True, view_layer=vl); me_ob.select_set(True, view_layer=vl); vl.objects.active = arm_ob
    kw = dict(filepath=path, export_format="GLB", use_selection=True, export_apply=False, export_animations=False,
              export_skins=True, export_yup=True, export_image_format="JPEG", export_cameras=False, export_lights=False,
              export_morph=False, export_extras=False, export_tangents=False)
    with ctx(sc, active_object=arm_ob, object=arm_ob, selected_objects=[arm_ob, me_ob]):
        try:
            bpy.ops.export_scene.gltf(export_image_quality=85, **kw)
        except TypeError:
            bpy.ops.export_scene.gltf(**kw)


def validate(path, budget, tex_bytes):
    d = open(path, "rb").read()
    n = struct.unpack("<I", d[12:16])[0]
    j = json.loads(d[20:20 + n])
    prims = [p for m in j.get("meshes", []) for p in m["primitives"]]
    tris = sum(j["accessors"][p["indices"]]["count"] // 3 for p in prims)
    skins = j.get("skins", [])
    weighted = all("JOINTS_0" in p["attributes"] and "WEIGHTS_0" in p["attributes"] for p in prims)
    r = dict(file_mb=round(len(d) / 2 ** 20, 2), glb_tris=tris, draw_calls=len(prims), joints=len(skins[0]["joints"]) if skins else 0,
             tex_mb=round(tex_bytes / 2 ** 20, 1), skinned=bool(skins) and weighted)
    fails = []
    if r["file_mb"] >= MAX_FILE_MB: fails.append(f"file {r['file_mb']} MB >= {MAX_FILE_MB}")
    if tris > budget * 1.05: fails.append(f"tris {tris} > budget {budget}")
    if r["draw_calls"] >= MAX_DRAW: fails.append(f"draw calls {r['draw_calls']} >= {MAX_DRAW}")
    if r["tex_mb"] > MAX_TEX_MB: fails.append(f"textures {r['tex_mb']} MB > {MAX_TEX_MB}")
    if not r["skinned"]: fails.append("no skin / joint attributes")
    r["fails"] = fails
    return r


# ---------------------------------------------------------------- previews
def setup_render(sc):
    try:
        sc.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        sc.render.engine = "BLENDER_EEVEE"
    sc.eevee.taa_render_samples = 16
    sc.render.resolution_x, sc.render.resolution_y = 480, 600
    sc.render.film_transparent = False
    w = bpy.data.worlds.new("RIG_world"); w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.32, 0.33, 0.36, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    sc.world = w
    cam = bpy.data.objects.new("RIG_cam", bpy.data.cameras.new("RIG_cam")); sc.collection.objects.link(cam); sc.camera = cam
    sun = bpy.data.objects.new("RIG_sun", bpy.data.lights.new("RIG_sun", "SUN")); sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(50), 0, math.radians(-30)); sc.collection.objects.link(sun)
    return cam


def shot(sc, cam, me_ob, H, path, d):
    V = verts(me_ob)
    c = Vector(((V[:, 0].min() + V[:, 0].max()) / 2, (V[:, 1].min() + V[:, 1].max()) / 2, H * 0.5))
    r = max(V[:, 0].ptp(), V[:, 1].ptp(), H)
    cam.data.lens = 50
    cam.location = c + Vector(d).normalized() * r * 2.3
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = path
    with ctx(sc):
        bpy.ops.render.render(write_still=True)


def rot(arm_ob, bn, axis, deg):
    pb = arm_ob.pose.bones.get(bn)
    if not pb:
        return
    B = pb.bone.matrix_local.to_3x3()
    q = (B.inverted() @ Matrix.Rotation(math.radians(deg), 3, axis) @ B).to_quaternion()
    pb.rotation_mode = "QUATERNION"
    pb.rotation_quaternion = q @ pb.rotation_quaternion


def test_pose(arm_ob, kind):
    if kind == "biped":
        rot(arm_ob, "LeftArm", "Y", 65); rot(arm_ob, "RightArm", "Y", -65)
        rot(arm_ob, "LeftForeArm", "Z", -40); rot(arm_ob, "RightForeArm", "Z", 40)
        rot(arm_ob, "LeftUpLeg", "X", -30); rot(arm_ob, "LeftLeg", "X", 45)
        rot(arm_ob, "RightUpLeg", "X", 20)
        rot(arm_ob, "Head", "Z", 25); rot(arm_ob, "Spine1", "Z", -10)
    else:
        rot(arm_ob, "FrontUpper_L", "X", -45); rot(arm_ob, "FrontLower_L", "X", 75)
        rot(arm_ob, "FrontUpper_R", "X", -45); rot(arm_ob, "FrontLower_R", "X", 75)
        rot(arm_ob, "BackUpper_L", "X", 35); rot(arm_ob, "BackUpper_R", "X", 35)
        rot(arm_ob, "Neck", "X", 25)
        for t in ("Tail1", "Tail2", "Tail3"):
            rot(arm_ob, t, "X", -25)


def clear_pose(arm_ob):
    for pb in arm_ob.pose.bones:
        pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0)


# ---------------------------------------------------------------- main
def run():
    sc = bpy.context.scene
    for o in list(sc.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    snap = ids_snapshot()
    report = {}
    try:
        cam = None if NO_RENDER else setup_render(sc)
        for name, (src, kind, H, budget) in CHARS.items():
            if ONLY and name not in ONLY:
                continue
            t0 = time.time()
            print(f"== {name} ({kind})")
            before = ids_snapshot()
            me_ob = import_mesh(sc, os.path.join(SRC, src))
            me_ob.name = f"chr_{name}_mesh"; me_ob.data.name = f"chr_{name}_mesh"
            HW = 1.7                                                    # working height for heat weighting
            flipped = prep(sc, me_ob, HW, kind)
            t_src = tri_count(me_ob)
            tris = decimate(sc, me_ob, budget)
            V = verts(me_ob)
            bones, info = biped_bones(V, HW) if kind == "biped" else quad_bones(V, HW)
            arm_ob = build_armature(sc, f"chr_{name}", bones)
            method, unweighted, empty = skin(sc, me_ob, arm_ob)
            S = Matrix.Scale(H / HW, 4)
            me_ob.data.transform(S); arm_ob.data.transform(S)
            tex_bytes = shrink_textures(me_ob)
            out = os.path.join(OUT, f"chr_{name}.glb")
            export(sc, arm_ob, me_ob, out)
            val = validate(out, budget, tex_bytes)
            if val["fails"]:
                os.replace(out, os.path.join(REJ, f"chr_{name}.glb"))
                print("  REJECTED:", "; ".join(val["fails"]))
            try:
                bpy.data.libraries.write(os.path.join(OUT, f"chr_{name}.blend"), {arm_ob, me_ob}, fake_user=True)
            except Exception as e:
                print("  blend save failed:", e)
            if cam:
                fr = (0, -1, 0.12) if kind == "biped" else (-1, -0.35, 0.25)
                tq = (0.8, -1, 0.25) if kind == "biped" else (-1, -0.15, 0.15)
                shot(sc, cam, me_ob, H, os.path.join(PREV, f"{name}_rest.png"), fr)
                test_pose(arm_ob, kind)
                shot(sc, cam, me_ob, H, os.path.join(PREV, f"{name}_pose.png"), tq)
                clear_pose(arm_ob)
            report[name] = dict(source=src, kind=kind, height_m=H, flipped_180=bool(flipped), tris_source=t_src, tris=tris,
                                bones=len(bones), weights=method, unweighted_after=unweighted, bones_without_verts=empty,
                                detect={k: (round(v, 3) if isinstance(v, float) else v) for k, v in info.items()},
                                **val, seconds=round(time.time() - t0, 1))
            print("  ", json.dumps(report[name]))
            for o in (me_ob, arm_ob):
                bpy.data.objects.remove(o, do_unlink=True)
            purge_new(before)
    finally:
        old = {}
        rp = os.path.join(OUT, "rig_report.json")
        if os.path.exists(rp):
            old = json.load(open(rp))
        old.update(report)
        json.dump(old, open(rp, "w"), indent=2)
    return report


run()
