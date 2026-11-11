# Bridge job template: launch the headless rig run and return immediately (bridge rule: never wait on a process).
# Copy to asset_creation/bridge/jobs/<n>_rig.py; edit ARGS. Progress: asset_creation/char-glb/rigged/anim_run.log
import subprocess, os
ROOT = r"D:\Codes\TheLastHouse_Assetbuild\TheLastHouseonMapleStreet"
BLENDER = bpy.app.binary_path
ARGS = globals().get("ARGS", [])
log = open(os.path.join(ROOT, "asset_creation", "char-glb", "rigged", "anim_run.log"), "w")
subprocess.Popen([BLENDER, "--background", "--factory-startup", "--python",
                  os.path.join(ROOT, "scripts", "pipeline", "animate_characters.py"), "--"] + ARGS,
                 stdout=log, stderr=subprocess.STDOUT, cwd=ROOT, creationflags=0x08000000)
print("launched", BLENDER, ARGS)
