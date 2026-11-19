"""Dev helper: plot side (z-y) silhouette of brain.glb meshes to check proportions."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from process_brain import read_glb, extract_mesh_data, OUT_GLB

out = sys.argv[1] if len(sys.argv) > 1 else "profile.png"
gltf, binb = read_glb(OUT_GLB)
fig, ax = plt.subplots(figsize=(8, 7))
for node in gltf["nodes"]:
    if "mesh" not in node:
        continue
    v, _ = extract_mesh_data(gltf, binb, node["mesh"])
    n = node["name"]
    if "cerebellum" in n:
        c = "#7a4"
    elif any(k in n for k in ("midbrain", "pons", "medulla", "colliculus")):
        c = "#47a"
    elif any(k in n for k in ("gyrus", "lobe", "cortex", "lobule")):
        c = "#d88"
    else:
        continue
    ax.scatter(-v[:, 2], v[:, 1], s=0.3, c=c)
ax.set_aspect("equal")
ax.grid(True)
fig.savefig(out, dpi=80)
print("saved", out)
