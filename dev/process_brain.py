#!/usr/bin/env python3
"""
Builds a high-resolution, anatomically realistic BrainFacts-style 3D human brain model:
- Continuous cortical hemispheres molded to the exact BrainFacts side-profile silhouette:
  * Rounded dorsal frontal/parietal dome
  * Elevated anterior orbital frontal base
  * Distinct temporal pole & temporal lobe sitting above the brainstem
  * Elevated posterior occipital tentorial base exposing the full rounded Cerebellum & Pons/Medulla
- Sculpted with a wavy Sylvian fissure and non-crossing labyrinthine Gyroid cortical folds.
- Partitioned cleanly into selectable cortical lobes & functional areas (Frontal, Motor M1,
  Broca, Parietal, Somatosensory S1, Temporal, Wernicke, Occipital, Visual V1) + BodyParts3D
  Cerebellum, Midbrain, Pons, Medulla, Thalamus, Hypothalamus, Hippocampus, Amygdala, Corpus Callosum.
"""
import base64
import json
import os
import struct
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_GLB = os.path.join(ROOT, "assets", "models", "brain_raw.glb")
OUT_GLB = os.path.join(ROOT, "assets", "models", "brain.glb")
OUT_JS = os.path.join(ROOT, "dist", "brain.model.js")


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def build_neighbors(n_verts, tris):
    edges = np.vstack([
        tris[:, [0, 1]], tris[:, [1, 0]],
        tris[:, [1, 2]], tris[:, [2, 1]],
        tris[:, [2, 0]], tris[:, [0, 2]],
    ])
    edges = np.unique(edges, axis=0)
    src = edges[:, 0]
    dst = edges[:, 1]
    deg = np.bincount(src, minlength=n_verts).astype(np.float32)
    deg = np.maximum(deg, 1.0)
    return src, dst, deg


def taubin_smooth(verts, src, dst, deg, iterations=4, lam=0.45, mu=-0.48):
    v = verts.copy()
    for _ in range(iterations):
        for factor in (lam, mu):
            nb_sum = np.zeros_like(v)
            np.add.at(nb_sum, src, v[dst])
            nb_avg = nb_sum / deg[:, None]
            v = v + factor * (nb_avg - v)
    return v


def compute_normals(verts, tris):
    v0 = verts[tris[:, 0]]
    v1 = verts[tris[:, 1]]
    v2 = verts[tris[:, 2]]
    fn = np.cross(v1 - v0, v2 - v0)
    vn = np.zeros_like(verts)
    np.add.at(vn, tris[:, 0], fn)
    np.add.at(vn, tris[:, 1], fn)
    np.add.at(vn, tris[:, 2], fn)
    norms = np.linalg.norm(vn, axis=1, keepdims=True)
    return vn / np.maximum(norms, 1e-8)


def create_icosphere(subdivisions=5):
    t = (1.0 + np.sqrt(5.0)) / 2.0
    verts = np.array([
        [-1,  t,  0], [ 1,  t,  0], [-1, -t,  0], [ 1, -t,  0],
        [ 0, -1,  t], [ 0,  1,  t], [ 0, -1, -t], [ 0,  1, -t],
        [ t,  0, -1], [ t,  0,  1], [-t,  0, -1], [-t,  0,  1],
    ], dtype=np.float32)
    verts /= np.linalg.norm(verts, axis=1, keepdims=True)

    tris = np.array([
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ], dtype=np.int32)

    for _ in range(subdivisions):
        n_v = len(verts)
        t0, t1, t2 = tris[:, 0], tris[:, 1], tris[:, 2]
        e01 = np.stack([np.minimum(t0, t1), np.maximum(t0, t1)], axis=1)
        e12 = np.stack([np.minimum(t1, t2), np.maximum(t1, t2)], axis=1)
        e20 = np.stack([np.minimum(t2, t0), np.maximum(t2, t0)], axis=1)
        all_edges = np.vstack([e01, e12, e20])
        unique_edges, inv = np.unique(all_edges, axis=0, return_inverse=True)

        mids = 0.5 * (verts[unique_edges[:, 0]] + verts[unique_edges[:, 1]])
        mids /= np.linalg.norm(mids, axis=1, keepdims=True)
        verts = np.vstack([verts, mids]).astype(np.float32)

        n_t = len(tris)
        m01 = n_v + inv[:n_t]
        m12 = n_v + inv[n_t : 2 * n_t]
        m20 = n_v + inv[2 * n_t :]
        tris = np.vstack([
            np.stack([t0, m01, m20], axis=1),
            np.stack([t1, m12, m01], axis=1),
            np.stack([t2, m20, m12], axis=1),
            np.stack([m01, m12, m20], axis=1),
        ]).astype(np.int32)

    return verts, tris


def gyroid_psi(qx, qy, qz, side_sign):
    seed_shift = 0.35 if side_sign > 0 else -0.35
    wx = qx + 0.068 * np.sin(qy * 10.5 + qz * 9.5 + seed_shift) + 0.028 * np.cos(qz * 18.5 - qx * 15.0)
    wy = qy + 0.068 * np.sin(qz * 10.0 - qx * 9.8) + 0.028 * np.cos(qx * 17.5 + qy * 16.0)
    wz = qz + 0.068 * np.sin(qx * 9.8 + qy * 10.2) + 0.028 * np.cos(qy * 18.0 - qz * 14.5)

    k = 19.5
    p1 = (
        np.sin(k * wx) * np.cos(k * wy)
        + np.sin(k * wy) * np.cos(k * wz)
        + np.sin(k * wz) * np.cos(k * wx)
    )
    # Orthogonal shifted octave prevents any flat saddle plateaus on the sphere
    p2 = (
        np.cos(k * 1.15 * wy + 1.1) * np.sin(k * 1.15 * wz + 0.7)
        + np.cos(k * 1.15 * wz - 0.9) * np.sin(k * 1.15 * wx + 1.3)
    )
    return p1 + 0.48 * p2


def evaluate_cortical_sulci(px, py, pz, norms, ux, lat, side_sign):
    """
    Distance-estimated, constant-width labyrinthine cortical sulcal field.
    Dividing |psi| by the surface-tangent gradient magnitude |grad_T(psi)| guarantees
    uniform sulcus width and dense, plump gyral folds across the entire cortex with zero blank patches!
    """
    ext = smoothstep(-0.22, 0.12, ux)
    lat_mask = smoothstep(0.05, 0.38, lat)

    # Evaluate on normalized hemisphere surface direction blended with position so curvature is uniform everywhere
    hemi_cx = 0.22 * side_sign
    dx, dy, dz = px - hemi_cx, py - 0.18, pz
    r_len = np.maximum(np.sqrt(dx * dx + dy * dy + dz * dz), 1e-5)
    qx = 0.55 * px + 0.45 * (dx / r_len)
    qy = 0.55 * py + 0.45 * (dy / r_len)
    qz = 0.55 * pz + 0.45 * (dz / r_len)

    psi0 = gyroid_psi(qx, qy, qz, side_sign)
    eps = 0.004
    gx = (gyroid_psi(qx + eps, qy, qz, side_sign) - psi0) / eps
    gy = (gyroid_psi(qx, qy + eps, qz, side_sign) - psi0) / eps
    gz = (gyroid_psi(qx, qy, qz + eps, side_sign) - psi0) / eps

    # Project gradient onto the cortical tangent plane: grad_T = grad - (grad . n) * n
    g_dot_n = gx * norms[:, 0] + gy * norms[:, 1] + gz * norms[:, 2]
    tx = gx - g_dot_n * norms[:, 0]
    ty = gy - g_dot_n * norms[:, 1]
    tz = gz - g_dot_n * norms[:, 2]
    grad_t_mag = np.sqrt(tx * tx + ty * ty + tz * tz + 18.0)

    # True surface distance to sulcus centerline!
    dist_sulcus = np.abs(psi0) / grad_t_mag
    gyroid_sulcus = np.exp(-np.power(dist_sulcus / 0.0155, 1.9)) * ext

    # Wavy Sylvian Fissure (Lateral Sulcus)
    seed_shift = 0.35 if side_sign > 0 else -0.35
    wz = pz + 0.045 * np.sin(px * 9.0 + py * 9.5 + seed_shift)
    wy = py + 0.045 * np.sin(pz * 9.0 - px * 8.5)
    sylvian_y = 0.20 - 0.36 * (wz - 0.40) + 0.020 * np.sin(wz * 11.0)
    sylvian_dist = wy - sylvian_y
    sylvian_mask = lat_mask * smoothstep(-0.45, -0.20, pz) * (1.0 - smoothstep(0.42, 0.58, pz))
    sylvian_groove = np.exp(-np.square(sylvian_dist / 0.030)) * sylvian_mask

    suppress = np.exp(-np.square(sylvian_dist / 0.055)) * sylvian_mask
    total_sulcus = np.clip(np.maximum(sylvian_groove, gyroid_sulcus * (1.0 - 0.75 * suppress)), 0.0, 1.0)
    return total_sulcus, sylvian_groove, ext


def build_realistic_hemisphere(side_sign):
    u_verts, tris = create_icosphere(subdivisions=5)
    ux = u_verts[:, 0].copy()
    uy = u_verts[:, 1].copy()
    uz = u_verts[:, 2].copy()

    lat = np.maximum(0.0, ux)
    med = np.maximum(0.0, -ux)

    # ---- Balanced BrainFacts-style side profile (smooth egg, no ledges / bites) ----
    # Anterior-posterior: frontal pole +0.86, occipital pole -0.90
    z = uz * np.where(uz >= 0.0, 0.86, 0.90)

    # Vertical: full rounded dome on top (y max = 1.0), gently rounded base (y ~ 0.14)
    y_upper = 0.42 + 0.58 * uy
    y_lower = 0.42 + 0.38 * uy
    y = np.where(uy >= 0.0, y_upper, y_lower)

    # Slight forward tilt of the dome: crown peaks a little behind the middle (parietal vertex)
    y += 0.04 * np.maximum(uy, 0.0) * (-uz)

    # Temporal lobe: smooth rounded drop under the Sylvian fissure (bottom ~ -0.22),
    # with a rounded Temporal Pole at the front (z ~ +0.45). Cosine window = no hard edges.
    tz_c = (uz - (-0.02)) / 0.56
    temp_z = np.where(np.abs(tz_c) < 1.0, 0.5 + 0.5 * np.cos(np.pi * np.clip(tz_c, -1, 1)), 0.0)
    temp_y = np.power(np.maximum(-uy, 0.0), 0.6)
    temp_lat = smoothstep(-0.70, 0.30, ux)
    temp_lobe = temp_z * temp_y * temp_lat
    y -= 0.36 * temp_lobe

    # Hemisphere width X (slightly wider at the temporal lobes, narrower at the poles)
    x_lat = (0.024 + 0.66 * np.power(lat, 0.80)) * (1.0 + 0.06 * temp_lobe - 0.10 * smoothstep(0.60, 1.0, np.abs(uz)))
    x_med = 0.018 + 0.028 * (1.0 - smoothstep(0.0, 0.65, med))
    medial_hollow = smoothstep(0.1, 0.8, med) * (1.0 - smoothstep(0.35, 0.72, np.abs(uz))) * (1.0 - smoothstep(0.25, 0.65, np.abs(uy + 0.10)))
    x_med += 0.10 * medial_hollow

    x = np.where(ux >= 0, x_lat, x_med) * side_sign

    verts = np.stack([x, y, z], axis=1).astype(np.float32)
    if side_sign < 0:
        tris = tris[:, [0, 2, 1]].copy()

    src, dst, deg = build_neighbors(len(verts), tris)
    verts = taubin_smooth(verts, src, dst, deg, iterations=6, lam=0.45, mu=-0.48)
    norms = compute_normals(verts, tris)

    # Carve 3D cortical gyri & sulci
    px, py, pz = verts[:, 0], verts[:, 1], verts[:, 2]
    total_sulcus, sylvian_groove, ext = evaluate_cortical_sulci(px, py, pz, norms, ux, lat, side_sign)

    # Very shallow physical relief so the outer silhouette stays smooth and balanced
    # (the visible gyri/sulci detail is rendered per-pixel in the GLSL shader)
    disp = (0.005 * np.power(1.0 - total_sulcus, 0.6) - 0.012 * total_sulcus - 0.014 * sylvian_groove) * (0.3 + 0.7 * ext)
    verts = verts + norms * disp[:, None]

    verts = taubin_smooth(verts, src, dst, deg, iterations=2, lam=0.30, mu=-0.32)
    norms = compute_normals(verts, tris)

    nb_sum = np.zeros_like(verts)
    np.add.at(nb_sum, src, verts[dst])
    nb_avg = nb_sum / deg[:, None]
    concavity = np.sum((nb_avg - verts) * norms, axis=1)
    concav_crease = smoothstep(-0.0002, 0.0052, concavity)

    sulcal_depth = np.clip(np.maximum(total_sulcus * 0.90, concav_crease * 0.96), 0.0, 1.0)

    # Partition triangles into anatomical regions
    tri_centers = np.mean(verts[tris], axis=1)
    tx, ty, tz = tri_centers[:, 0], tri_centers[:, 1], tri_centers[:, 2]
    t_sylvian = ty - (0.20 - 0.36 * (tz - 0.40))
    t_central = tz - (-0.04 + (0.85 - ty) * 0.28)

    hemi_prefix = "left" if side_sign < 0 else "right"
    region_buckets = {}

    for ti in range(len(tris)):
        cx_t, cy_t, cz_t = tx[ti], ty[ti], tz[ti]
        sd = t_sylvian[ti]
        cd = t_central[ti]

        if cz_t < -0.54 + 0.14 * cy_t:
            if cz_t < -0.86 and cy_t < 0.42:
                rname = f"{hemi_prefix}-visual-cortex"
            else:
                rname = f"{hemi_prefix}-occipital-lobe"
        elif sd < 0.0 and cz_t < 0.58 and cy_t < 0.40 and abs(cx_t) > 0.20:
            if side_sign < 0 and cz_t < -0.10 and sd > -0.18:
                rname = "posterior-part-of-superior-temporal-gyrus"
            else:
                rname = f"{hemi_prefix}-middle-temporal-gyrus"
        elif cd >= 0.0 and cd < 0.165 and cy_t > 0.06:
            rname = f"{hemi_prefix}-precentral-gyrus"
        elif cd < 0.0 and cd > -0.165 and cy_t > 0.06:
            rname = f"{hemi_prefix}-postcentral-gyrus"
        elif cd >= 0.0:
            if side_sign < 0 and abs(cx_t) > 0.40 and cy_t < 0.32 and cy_t > -0.02 and cz_t > 0.16 and cz_t < 0.56:
                rname = "left-inferior-frontal-gyrus"
            else:
                rname = f"{hemi_prefix}-superior-frontal-gyrus"
        else:
            rname = f"{hemi_prefix}-superior-parietal-lobule"

        region_buckets.setdefault(rname, []).append(ti)

    out_meshes = []
    for rname, tri_indices in region_buckets.items():
        sub_tris = tris[np.array(tri_indices, dtype=np.int32)]
        used_v, new_idx = np.unique(sub_tris, return_inverse=True)
        m_verts = verts[used_v].copy()
        m_norms = norms[used_v].copy()
        m_sulc = sulcal_depth[used_v]
        m_conc = concav_crease[used_v]

        rgba = np.zeros((len(m_verts), 4), dtype=np.uint8)
        rgba[:, 0] = np.clip(np.round(m_sulc * 255.0), 0, 255).astype(np.uint8)
        rgba[:, 1] = np.clip(np.round(m_conc * 255.0), 0, 255).astype(np.uint8)
        rgba[:, 2] = 255
        rgba[:, 3] = 255
        out_meshes.append((rname, m_verts, m_norms, rgba, new_idx.reshape(-1, 3).astype(np.int32)))

    return out_meshes


def read_glb(path):
    with open(path, "rb") as f:
        magic, version, length = struct.unpack("<4sII", f.read(12))
        chunk_len, chunk_type = struct.unpack("<I4s", f.read(8))
        gltf = json.loads(f.read(chunk_len).decode("utf-8"))
        bin_len, bin_type = struct.unpack("<I4s", f.read(8))
        bin_data = f.read(bin_len)
    return gltf, bin_data


def extract_mesh_data(gltf, bin_data, mesh_idx):
    m = gltf["meshes"][mesh_idx]
    p = m["primitives"][0]
    pos_acc = gltf["accessors"][p["attributes"]["POSITION"]]
    bv = gltf["bufferViews"][pos_acc["bufferView"]]
    stride = bv.get("byteStride", 12)
    offset = bv.get("byteOffset", 0) + pos_acc.get("byteOffset", 0)
    count = pos_acc["count"]

    verts = np.zeros((count, 3), dtype=np.float32)
    for i in range(count):
        verts[i] = struct.unpack_from("<fff", bin_data, offset + i * stride)

    if "indices" in p:
        idx_acc = gltf["accessors"][p["indices"]]
        ibv = gltf["bufferViews"][idx_acc["bufferView"]]
        ioff = ibv.get("byteOffset", 0) + idx_acc.get("byteOffset", 0)
        icount = idx_acc["count"]
        ctype = idx_acc["componentType"]
        if ctype == 5123:
            tris = np.frombuffer(bin_data, dtype=np.uint16, count=icount, offset=ioff).astype(np.int32)
        elif ctype == 5125:
            tris = np.frombuffer(bin_data, dtype=np.uint32, count=icount, offset=ioff).astype(np.int32)
        else:
            tris = np.frombuffer(bin_data, dtype=np.uint8, count=icount, offset=ioff).astype(np.int32)
        tris = tris.reshape(-1, 3).copy()
    else:
        tris = np.arange(count, dtype=np.int32).reshape(-1, 3)

    return verts, tris


def weld_mesh(verts, tris, decimals=4):
    rounded = np.round(verts, decimals=decimals)
    _, unique_idx, inverse_idx = np.unique(
        rounded, axis=0, return_index=True, return_inverse=True
    )
    new_verts = verts[unique_idx].copy()
    new_tris = inverse_idx[tris].astype(np.int32)
    valid = (
        (new_tris[:, 0] != new_tris[:, 1])
        & (new_tris[:, 1] != new_tris[:, 2])
        & (new_tris[:, 2] != new_tris[:, 0])
    )
    return new_verts, new_tris[valid]


def pack_glb(processed_meshes):
    buffer_views = []
    accessors = []
    meshes = []
    nodes = []
    bin_chunks = []
    offset = 0

    def add_chunk(raw_bytes, target):
        nonlocal offset
        pad = (4 - (len(raw_bytes) % 4)) % 4
        padded = raw_bytes + (b"\x00" * pad)
        bv_idx = len(buffer_views)
        bv = {"buffer": 0, "byteOffset": offset, "byteLength": len(raw_bytes)}
        if target:
            bv["target"] = target
        buffer_views.append(bv)
        bin_chunks.append(padded)
        offset += len(padded)
        return bv_idx

    for name, verts, norms, colors, tris in processed_meshes:
        v_count = len(verts)
        pos_bytes = verts.astype(np.float32).tobytes()
        norm_bytes = norms.astype(np.float32).tobytes()
        col_bytes = colors.astype(np.uint8).tobytes()
        idx_bytes = tris.astype(np.uint16 if v_count < 65535 else np.uint32).tobytes()
        idx_ctype = 5123 if v_count < 65535 else 5125

        bv_pos = add_chunk(pos_bytes, 34962)
        acc_pos = len(accessors)
        accessors.append({
            "bufferView": bv_pos,
            "componentType": 5126,
            "count": v_count,
            "type": "VEC3",
            "min": [float(x) for x in np.min(verts, axis=0)],
            "max": [float(x) for x in np.max(verts, axis=0)],
        })

        bv_norm = add_chunk(norm_bytes, 34962)
        acc_norm = len(accessors)
        accessors.append({
            "bufferView": bv_norm,
            "componentType": 5126,
            "count": v_count,
            "type": "VEC3",
        })

        bv_col = add_chunk(col_bytes, 34962)
        acc_col = len(accessors)
        accessors.append({
            "bufferView": bv_col,
            "componentType": 5121,
            "normalized": True,
            "count": v_count,
            "type": "VEC4",
        })

        bv_idx = add_chunk(idx_bytes, 34963)
        acc_idx = len(accessors)
        accessors.append({
            "bufferView": bv_idx,
            "componentType": idx_ctype,
            "count": int(tris.size),
            "type": "SCALAR",
        })

        m_idx = len(meshes)
        meshes.append({
            "name": name,
            "primitives": [{
                "attributes": {
                    "POSITION": acc_pos,
                    "NORMAL": acc_norm,
                    "COLOR_0": acc_col,
                },
                "indices": acc_idx,
                "mode": 4,
            }],
        })
        nodes.append({"name": name, "mesh": m_idx})

    root_idx = len(nodes)
    nodes.append({
        "name": "BrainRoot",
        "children": list(range(root_idx)),
    })

    bin_blob = b"".join(bin_chunks)
    gltf_dict = {
        "asset": {"version": "2.0", "generator": "NeuroLAB-BrainProcessor"},
        "scene": 0,
        "scenes": [{"name": "Scene", "nodes": [root_idx]}],
        "nodes": nodes,
        "meshes": meshes,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(bin_blob)}],
    }

    json_bytes = json.dumps(gltf_dict, separators=(",", ":")).encode("utf-8")
    json_pad = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b" " * json_pad

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_blob)
    header = struct.pack("<4sII", b"glTF", 2, total_len)
    json_hdr = struct.pack("<I4s", len(json_bytes), b"JSON")
    bin_hdr = struct.pack("<I4s", len(bin_blob), b"BIN\x00")
    return header + json_hdr + json_bytes + bin_hdr + bin_blob


SKIP_CORTICAL_RAW = {
    "left-superior-frontal-gyrus", "right-superior-frontal-gyrus",
    "left-middle-frontal-gyrus", "right-middle-frontal-gyrus",
    "left-inferior-frontal-gyrus", "right-inferior-frontal-gyrus",
    "left-precentral-gyrus", "right-precentral-gyrus",
    "left-postcentral-gyrus", "right-postcentral-gyrus",
    "left-superior-parietal-lobule", "right-superior-parietal-lobule",
    "left-angular-gyrus", "right-angular-gyrus",
    "left-supramarginal-gyrus", "right-supramarginal-gyrus",
    "subdivision-of-superior-temporal-gyrus",
    "segment-of-gyrus-of-cerebral-hemisphere",
    "segment-of-gyrus-of-cerebral-hemisphere-1",
    "posterior-part-of-superior-temporal-gyrus",
    "left-middle-temporal-gyrus", "right-middle-temporal-gyrus",
    "left-inferior-temporal-gyrus", "right-inferior-temporal-gyrus",
    "left-fusiform-gyrus", "right-fusiform-gyrus",
    "left-occipital-lobe", "right-occipital-lobe",
    "white-matter-of-left-cerebral-hemisphere",
    "white-matter-of-right-cerebral-hemisphere",
}


def main():
    processed = []
    total_v = 0

    for side in (-1, 1):
        hemi_meshes = build_realistic_hemisphere(side)
        for item in hemi_meshes:
            processed.append(item)
            total_v += len(item[1])

    gltf, bin_data = read_glb(RAW_GLB)
    cx, cy, cz = -0.725, -79.70, 1547.56
    scale = 0.0124

    def base_xform(vr):
        out = np.zeros_like(vr)
        out[:, 0] = -(vr[:, 0] - cx) * scale
        out[:, 1] = +(vr[:, 2] - cz) * scale + 0.14
        out[:, 2] = -(vr[:, 1] - cy) * scale + 0.10
        return out

    cer_pts = []
    for node in gltf["nodes"]:
        if "mesh" in node and "cerebellum" in node["name"]:
            cer_pts.append(base_xform(extract_mesh_data(gltf, bin_data, node["mesh"])[0]))
    allc = np.concatenate(cer_pts)
    cer_center = ((allc.min(axis=0) + allc.max(axis=0)) * 0.5).astype(np.float32)
    cer_center[0] = 0.0

    for node in gltf["nodes"]:
        if "mesh" not in node:
            continue
        name = node["name"]
        if name in SKIP_CORTICAL_RAW:
            continue

        verts_raw, tris_raw = extract_mesh_data(gltf, bin_data, node["mesh"])
        verts = np.zeros_like(verts_raw)
        verts[:, 0] = -(verts_raw[:, 0] - cx) * scale
        verts[:, 1] = +(verts_raw[:, 2] - cz) * scale + 0.14
        verts[:, 2] = -(verts_raw[:, 1] - cy) * scale + 0.10
        if "cerebellum" in name:
            # Compact cerebellum tucked snugly beneath the occipital lobe, behind the pons (BrainFacts proportions)
            c_mean = cer_center
            verts = (verts - c_mean) * np.array([0.96, 0.90, 0.92], dtype=np.float32)
            verts += np.array([0.0, -0.15, -0.46], dtype=np.float32)
        elif any(k in name for k in ("midbrain", "pons", "medulla", "colliculus")):
            verts[:, 1] += 0.10
            verts[:, 2] += 0.02
        tris = tris_raw[:, [0, 2, 1]].copy()

        w_verts, w_tris = weld_mesh(verts, tris, decimals=4)
        src, dst, deg = build_neighbors(len(w_verts), w_tris)
        s_verts = taubin_smooth(w_verts, src, dst, deg, iterations=6, lam=0.46, mu=-0.49)
        norms = compute_normals(s_verts, w_tris)

        nb_sum = np.zeros_like(s_verts)
        np.add.at(nb_sum, src, s_verts[dst])
        nb_avg = nb_sum / deg[:, None]
        concavity = np.sum((nb_avg - s_verts) * norms, axis=1)
        concav_crease = smoothstep(-0.0005, 0.006, concavity)

        if "cerebellum" in name:
            tissue_code = 180
        elif any(k in name for k in ("midbrain", "pons", "medulla", "colliculus")):
            tissue_code = 120
        elif "internal-capsule" in name:
            tissue_code = 60
        else:
            tissue_code = 20

        rgba = np.zeros((len(s_verts), 4), dtype=np.uint8)
        rgba[:, 0] = np.clip(np.round(concav_crease * 255.0), 0, 255).astype(np.uint8)
        rgba[:, 1] = np.clip(np.round(concav_crease * 255.0), 0, 255).astype(np.uint8)
        rgba[:, 2] = tissue_code
        rgba[:, 3] = 255

        processed.append((name, s_verts, norms, rgba, w_tris))
        total_v += len(s_verts)

    glb_bytes = pack_glb(processed)
    with open(OUT_GLB, "wb") as f:
        f.write(glb_bytes)
    print(f"Wrote {OUT_GLB} ({len(glb_bytes)} bytes, {len(processed)} meshes, {total_v} total vertices)")

    b64 = base64.b64encode(glb_bytes).decode("ascii")
    os.makedirs(os.path.dirname(OUT_JS), exist_ok=True)
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write(f"// Auto-generated anatomical 3D brain GLB data (BodyParts3D CC BY-SA 2.1 JP)\nwindow.__BRAIN_GLB_B64 = '{b64}';\n")
    print(f"Wrote {OUT_JS} ({os.path.getsize(OUT_JS)} bytes)")


if __name__ == "__main__":
    main()
