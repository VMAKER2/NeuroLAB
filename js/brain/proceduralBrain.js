// Procedural 3D anatomical brain + 10-20 EEG cap generator for Three.js.
// Creates folded cortical hemispheres (gyri & sulci), functional areas,
// cerebellum with folia ridges, brainstem (midbrain/pons/medulla), and
// deep limbic structures (corpus callosum, thalamus, hypothalamus,
// hippocampus, amygdala) — each tagged with `userData.regionId`.
import * as THREE from 'three';
import { BRAIN_REGIONS, REGION_MAP } from '../data/regions.js';
import { ELECTRODES } from '../data/electrodes.js';

/** Smooth 3D trigonometric gyri/sulci folding field */
function gyriNoise(x, y, z) {
  const f1 = Math.sin(x * 13.5 + Math.cos(y * 11.0)) * Math.cos(z * 12.5 + Math.sin(x * 9.5));
  const f2 = Math.sin(y * 19.0 - z * 16.5) * Math.cos(x * 17.5 + y * 14.0);
  const f3 = Math.cos(z * 25.0 + x * 21.0) * Math.sin(y * 23.0);
  // Sulci are sharp inward creases; gyri are rounded outward bulges
  const raw = 0.55 * f1 + 0.3 * f2 + 0.15 * f3;
  return Math.tanh(raw * 1.9) * 0.042;
}

/** Classify a point on the unit sphere (in brain space: +z front, +y up, +-x sides) into a cortical regionId. */
function classifyCortex(nx, ny, nz) {
  const ax = Math.abs(nx);
  // Central sulcus runs from top-slightly-back (z ~ -0.05 at y=1) tilted forward-down (z ~ +0.22 at y=0.1)
  const centralZ = -0.06 + (1.0 - ny) * 0.25;
  const distCentral = nz - centralZ;

  // Temporal lobe: lateral lower side, below Sylvian fissure
  if (ax > 0.44 && ny < 0.24 && nz > -0.58 && nz < 0.48) {
    // Wernicke's area: posterior superior temporal on LEFT hemisphere (nx < 0)
    if (nx < -0.52 && ny > -0.02 && nz < -0.12 && nz > -0.48) return 'wernicke';
    return 'temporal';
  }

  // Occipital lobe: posterior pole
  if (nz < -0.52 && ny > -0.38) {
    if (nz < -0.82 && Math.abs(ny) < 0.32) return 'visual';
    return 'occipital';
  }

  // Precentral & Postcentral strips around central sulcus (upper/lateral convexity)
  if (ny > 0.08 && ax > 0.08) {
    if (distCentral >= 0 && distCentral < 0.21) return 'motor';
    if (distCentral < 0 && distCentral > -0.21) return 'somatosensory';
  }

  // Frontal vs Parietal
  if (distCentral >= 0) {
    // Broca's area: left inferior frontal gyrus
    if (nx < -0.52 && ny > -0.06 && ny < 0.34 && nz > 0.25 && nz < 0.65) return 'broca';
    return 'frontal';
  }
  return 'parietal';
}

/** Deform a unit-sphere vertex into a realistic cerebral hemisphere point */
function deformCortexVertex(u, v, w) {
  let x = u, y = v, z = w;
  const ax = Math.abs(x);

  // Overall brain proportions: longer front-to-back (z), wider at parietal/temporal, flatter base
  x *= 0.88;
  y *= 0.78;
  z *= 1.12;

  // Flatten inferior base & hollow out slightly for brainstem/cerebellum
  if (y < 0) {
    y *= 0.62;
    if (z < -0.15) y += 0.16 * Math.min(1, (-z - 0.15) * 1.4);
  }

  // Bulge temporal pole forward & outward
  if (ax > 0.4 && y < 0.15 && z > -0.35 && z < 0.42) {
    x += Math.sign(x) * 0.08 * (1 - Math.abs(z - 0.05));
    y -= 0.06;
  }

  // Longitudinal fissure (medial gap between left & right hemispheres)
  const medialFactor = Math.exp(-ax * 14);
  if (y > -0.25) {
    x += Math.sign(x || 1) * 0.028 * (1 - medialFactor);
    y -= medialFactor * 0.07 * Math.max(0, y);
  }

  // Major anatomical sulci grooves (Central sulcus & Sylvian fissure)
  const centralZ = -0.06 + (1.0 - v) * 0.25;
  const centralGroove = Math.exp(-Math.pow((w - centralZ) / 0.055, 2)) * Math.max(0, v);
  const sylvianGroove = ax > 0.45 ? Math.exp(-Math.pow((v - 0.18) / 0.05, 2)) * Math.max(0, 0.5 - Math.abs(w - 0.05)) : 0;

  // Gyri/sulci surface displacement (reduced on medial wall)
  const fold = gyriNoise(u, v, w) * (1 - 0.65 * medialFactor) - 0.025 * centralGroove - 0.028 * sylvianGroove;
  const len = Math.hypot(x, y, z) || 1;
  x += (x / len) * fold;
  y += (y / len) * fold + 0.12; // shift cerebrum slightly up
  z += (z / len) * fold;

  return [x, y, z];
}

function makeMaterial(colorHex) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.62,
    metalness: 0.04,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
  });
}

/** Build partitioned cortical meshes so each lobe/area is an independent Three.js Mesh */
function buildCorticalMeshes() {
  const baseGeo = new THREE.SphereGeometry(1, 96, 72);
  const pos = baseGeo.attributes.position;
  const idx = baseGeo.index.array;

  // Deform all vertices while storing their unit-sphere direction for classification
  const unitDirs = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i), v = pos.getY(i), w = pos.getZ(i);
    unitDirs[i * 3] = u;
    unitDirs[i * 3 + 1] = v;
    unitDirs[i * 3 + 2] = w;
    const [x, y, z] = deformCortexVertex(u, v, w);
    pos.setXYZ(i, x, y, z);
  }
  baseGeo.computeVertexNormals();
  const norm = baseGeo.attributes.normal;

  // Bucket triangles by (regionId, hemisphere 'L'|'R')
  const buckets = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const ux = (unitDirs[a * 3] + unitDirs[b * 3] + unitDirs[c * 3]) / 3;
    const uy = (unitDirs[a * 3 + 1] + unitDirs[b * 3 + 1] + unitDirs[c * 3 + 1]) / 3;
    const uz = (unitDirs[a * 3 + 2] + unitDirs[b * 3 + 2] + unitDirs[c * 3 + 2]) / 3;
    // Skip tiny deep underside hole where brainstem enters
    if (uy < -0.78 && Math.hypot(ux, uz) < 0.45) continue;

    const regionId = classifyCortex(ux, uy, uz);
    const hemi = ux <= 0 ? 'L' : 'R';
    const key = `${regionId}:${hemi}`;
    if (!buckets.has(key)) buckets.set(key, { regionId, hemi, tris: [] });
    buckets.get(key).tris.push(a, b, c);
  }

  const meshes = [];
  for (const { regionId, hemi, tris } of buckets.values()) {
    const g = new THREE.BufferGeometry();
    const vArr = new Float32Array(tris.length * 3);
    const nArr = new Float32Array(tris.length * 3);
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < tris.length; i++) {
      const vi = tris[i];
      const vx = pos.getX(vi), vy = pos.getY(vi), vz = pos.getZ(vi);
      vArr[i * 3] = vx; vArr[i * 3 + 1] = vy; vArr[i * 3 + 2] = vz;
      nArr[i * 3] = norm.getX(vi); nArr[i * 3 + 1] = norm.getY(vi); nArr[i * 3 + 2] = norm.getZ(vi);
      cx += vx; cy += vy; cz += vz;
    }
    cx /= tris.length; cy /= tris.length; cz /= tris.length;
    g.setAttribute('position', new THREE.BufferAttribute(vArr, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nArr, 3));

    const meta = REGION_MAP[regionId] || REGION_MAP.frontal;
    const mesh = new THREE.Mesh(g, makeMaterial(meta.color));
    mesh.name = `${meta.meshName}_${hemi}`;
    const explodeVec = new THREE.Vector3(cx * 1.15, Math.max(0.1, cy) * 0.9, cz * 1.1).normalize().multiplyScalar(0.55);
    mesh.userData = {
      regionId,
      hemi,
      isCortical: true,
      baseColor: meta.color,
      basePos: new THREE.Vector3(0, 0, 0),
      explodeVec,
      center: new THREE.Vector3(cx, cy, cz),
    };
    meshes.push(mesh);
  }
  return meshes;
}

/** Build Cerebellum with horizontal folia ridges */
function buildCerebellum() {
  const group = [];
  for (const side of [-1, 1]) {
    const geo = new THREE.SphereGeometry(0.36, 48, 36);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i) * 1.18;
      let y = pos.getY(i) * 0.78;
      let z = pos.getZ(i) * 0.95;
      const folia = Math.sin(y * 55) * 0.012;
      x += Math.sign(x || side) * folia;
      z += folia;
      pos.setXYZ(i, x + side * 0.28, y - 0.44, z - 0.56);
    }
    geo.computeVertexNormals();
    const meta = REGION_MAP.cerebellum;
    const mesh = new THREE.Mesh(geo, makeMaterial(meta.color));
    mesh.name = `Cerebellum_${side < 0 ? 'L' : 'R'}`;
    mesh.userData = {
      regionId: 'cerebellum',
      hemi: side < 0 ? 'L' : 'R',
      baseColor: meta.color,
      basePos: new THREE.Vector3(0, 0, 0),
      explodeVec: new THREE.Vector3(side * 0.22, -0.28, -0.52),
    };
    group.push(mesh);
  }
  return group;
}

/** Build Brainstem: Midbrain, Pons, Medulla */
function buildBrainstem() {
  const parts = [];
  const addPart = (id, geo, x, y, z, rx = 0, sx = 1, sy = 1, sz = 1, exp = [0, -0.35, 0]) => {
    geo.scale(sx, sy, sz);
    geo.rotateX(rx);
    geo.translate(x, y, z);
    geo.computeVertexNormals();
    const meta = REGION_MAP[id];
    const m = new THREE.Mesh(geo, makeMaterial(meta.color));
    m.name = meta.meshName;
    m.userData = {
      regionId: id,
      hemi: 'M',
      baseColor: meta.color,
      basePos: new THREE.Vector3(0, 0, 0),
      explodeVec: new THREE.Vector3(...exp),
    };
    parts.push(m);
  };

  // Midbrain
  addPart('midbrain', new THREE.CylinderGeometry(0.18, 0.16, 0.24, 28), 0, -0.32, -0.05, 0.18, 1.1, 1, 0.95, [0, -0.2, 0.12]);
  // Pons (bulbous bridge)
  addPart('pons', new THREE.SphereGeometry(0.22, 32, 24), 0, -0.56, -0.04, 0.15, 1.15, 0.85, 1.05, [0, -0.38, 0.16]);
  // Medulla
  addPart('medulla', new THREE.CylinderGeometry(0.15, 0.10, 0.36, 28), 0, -0.86, -0.11, 0.22, 1, 1, 0.95, [0, -0.58, 0.1]);

  return parts;
}

/** Build Deep & Limbic structures (Corpus Callosum, Thalamus, Hypothalamus, Hippocampus, Amygdala) */
function buildDeepStructures() {
  const list = [];

  // 1. Corpus Callosum — arched C-shape bridge across the midline
  const ccCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.04, 0.42),
    new THREE.Vector3(0, 0.23, 0.24),
    new THREE.Vector3(0, 0.27, -0.05),
    new THREE.Vector3(0, 0.16, -0.34),
  ]);
  const ccGeo = new THREE.TubeGeometry(ccCurve, 36, 0.085, 16, false);
  ccGeo.scale(2.4, 0.65, 1.0);
  ccGeo.computeVertexNormals();
  const ccMeta = REGION_MAP['corpus-callosum'];
  const ccMesh = new THREE.Mesh(ccGeo, makeMaterial(ccMeta.color));
  ccMesh.name = ccMeta.meshName;
  ccMesh.userData = {
    regionId: 'corpus-callosum',
    hemi: 'M',
    isDeep: true,
    baseColor: ccMeta.color,
    basePos: new THREE.Vector3(0, 0, 0),
    explodeVec: new THREE.Vector3(0, 0.42, 0),
  };
  list.push(ccMesh);

  // 2. Thalamus (paired egg-shaped nuclei)
  for (const side of [-1, 1]) {
    const thGeo = new THREE.SphereGeometry(0.18, 28, 22);
    thGeo.scale(0.85, 0.82, 1.25);
    thGeo.translate(side * 0.15, 0.02, -0.04);
    const meta = REGION_MAP.thalamus;
    const m = new THREE.Mesh(thGeo, makeMaterial(meta.color));
    m.name = `${meta.meshName}_${side < 0 ? 'L' : 'R'}`;
    m.userData = {
      regionId: 'thalamus',
      hemi: side < 0 ? 'L' : 'R',
      isDeep: true,
      baseColor: meta.color,
      basePos: new THREE.Vector3(0, 0, 0),
      explodeVec: new THREE.Vector3(side * 0.18, 0.12, 0.15),
    };
    list.push(m);
  }

  // 3. Hypothalamus
  const hyGeo = new THREE.SphereGeometry(0.11, 24, 18);
  hyGeo.scale(0.95, 0.9, 1.1);
  hyGeo.translate(0, -0.14, 0.14);
  const hyMeta = REGION_MAP.hypothalamus;
  const hyMesh = new THREE.Mesh(hyGeo, makeMaterial(hyMeta.color));
  hyMesh.name = hyMeta.meshName;
  hyMesh.userData = {
    regionId: 'hypothalamus',
    hemi: 'M',
    isDeep: true,
    baseColor: hyMeta.color,
    basePos: new THREE.Vector3(0, 0, 0),
    explodeVec: new THREE.Vector3(0, -0.1, 0.35),
  };
  list.push(hyMesh);

  // 4. Hippocampus (paired curved seahorse horns) & 5. Amygdala (almond tips in front)
  for (const side of [-1, 1]) {
    const hcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.32, -0.22, 0.14),
      new THREE.Vector3(side * 0.38, -0.16, -0.06),
      new THREE.Vector3(side * 0.30, -0.02, -0.24),
      new THREE.Vector3(side * 0.18, 0.08, -0.28),
    ]);
    const hcGeo = new THREE.TubeGeometry(hcCurve, 28, 0.062, 14, false);
    const hcMeta = REGION_MAP.hippocampus;
    const hcMesh = new THREE.Mesh(hcGeo, makeMaterial(hcMeta.color));
    hcMesh.name = `${hcMeta.meshName}_${side < 0 ? 'L' : 'R'}`;
    hcMesh.userData = {
      regionId: 'hippocampus',
      hemi: side < 0 ? 'L' : 'R',
      isDeep: true,
      baseColor: hcMeta.color,
      basePos: new THREE.Vector3(0, 0, 0),
      explodeVec: new THREE.Vector3(side * 0.38, -0.12, -0.12),
    };
    list.push(hcMesh);

    const amGeo = new THREE.SphereGeometry(0.082, 22, 18);
    amGeo.scale(1.0, 0.9, 1.25);
    amGeo.translate(side * 0.31, -0.21, 0.22);
    const amMeta = REGION_MAP.amygdala;
    const amMesh = new THREE.Mesh(amGeo, makeMaterial(amMeta.color));
    amMesh.name = `${amMeta.meshName}_${side < 0 ? 'L' : 'R'}`;
    amMesh.userData = {
      regionId: 'amygdala',
      hemi: side < 0 ? 'L' : 'R',
      isDeep: true,
      baseColor: amMeta.color,
      basePos: new THREE.Vector3(0, 0, 0),
      explodeVec: new THREE.Vector3(side * 0.35, -0.18, 0.32),
    };
    list.push(amMesh);
  }

  return list;
}

/** Build the 10-20 EEG Cap overlay (translucent scalp + electrode pucks + meridian wires) */
export function buildEEGCap() {
  const capGroup = new THREE.Group();
  capGroup.name = 'EEG_Cap';

  // Project unit-sphere electrode position onto scalp surface matching the realistic BrainFacts cortical contour
  const toScalp = ([ux, uy, uz], scale = 1.045) => {
    const sx = Math.sign(ux) * Math.pow(Math.abs(ux), 0.84) * 0.75 * scale;
    const sy = (uy >= 0 ? Math.pow(uy, 0.90) * 0.62 : uy * 0.40) * scale + 0.44;
    const sz = Math.sign(uz) * Math.pow(Math.abs(uz), 0.88) * 0.95 * scale;
    return new THREE.Vector3(sx, sy, sz);
  };

  // Subtle translucent scalp dome
  const domeGeo = new THREE.SphereGeometry(1, 36, 26, 0, Math.PI * 2, 0, Math.PI * 0.56);
  const dPos = domeGeo.attributes.position;
  for (let i = 0; i < dPos.count; i++) {
    const v = toScalp([dPos.getX(i), dPos.getY(i), dPos.getZ(i)], 1.03);
    dPos.setXYZ(i, v.x, v.y, v.z);
  }
  domeGeo.computeVertexNormals();
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0xfff6ea,
    transparent: true,
    opacity: 0.16,
    roughness: 0.8,
    depthWrite: false,
  });
  capGroup.add(new THREE.Mesh(domeGeo, domeMat));

  // Cap strap rings
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1f2a44, transparent: true, opacity: 0.35 });
  const addArc = (fn) => {
    const pts = [];
    for (let i = 0; i <= 48; i++) pts.push(toScalp(fn(i / 48), 1.038));
    capGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  };
  // Sagittal midline arc (nasion -> inion)
  addArc((t) => {
    const a = (t - 0.5) * Math.PI * 0.85;
    return [0, Math.cos(a), Math.sin(a)];
  });
  // Coronal ear-to-ear arc (T7 -> Cz -> T8)
  addArc((t) => {
    const a = (t - 0.5) * Math.PI * 0.85;
    return [Math.sin(a), Math.cos(a), 0];
  });
  // Circumferential 10% ring
  addArc((t) => {
    const a = t * Math.PI * 2;
    const th = 72 * (Math.PI / 180);
    return [Math.sin(th) * Math.sin(a), Math.cos(th), Math.sin(th) * Math.cos(a)];
  });

  // Electrode pucks
  const electrodes = [];
  for (const e of ELECTRODES) {
    const p = toScalp(e.pos, 1.048);
    const regColor = REGION_MAP[e.region]?.color || '#FF6B4A';
    const puckGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.028, 20);
    puckGeo.rotateX(Math.PI / 2);
    const puckMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFFDF9'),
      roughness: 0.35,
      metalness: 0.1,
    });
    const puck = new THREE.Mesh(puckGeo, puckMat);
    puck.position.copy(p);
    puck.lookAt(0, 0.12, 0);

    // Inner coloured dot + dark rim
    const dotGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.032, 18);
    dotGeo.rotateX(Math.PI / 2);
    const dotMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(regColor), roughness: 0.4 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    puck.add(dot);

    puck.userData = {
      isElectrode: true,
      electrode: e,
      baseColor: regColor,
    };
    capGroup.add(puck);
    electrodes.push(puck);
  }

  return { capGroup, electrodes };
}

/** Assemble the complete procedural brain Group */
export function buildProceduralBrain() {
  const brainGroup = new THREE.Group();
  brainGroup.name = 'Procedural_Brain';

  const meshes = [
    ...buildCorticalMeshes(),
    ...buildCerebellum(),
    ...buildBrainstem(),
    ...buildDeepStructures(),
  ];
  for (const m of meshes) brainGroup.add(m);

  return { brainGroup, meshes };
}
