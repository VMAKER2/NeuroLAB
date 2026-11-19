// Interactive 3D Brain Viewer (Three.js + OrbitControls)
// Uses the 67-mesh anatomical brain model (BodyParts3D CC BY-SA 2.1 JP) with a custom
// per-pixel GLSL Biological Tissue & Sulcal Fissure Shader modeled after BrainFacts 3D Brain.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { BRAIN_REGIONS, REGION_MAP, resolveRegionId } from '../data/regions.js';
import { buildProceduralBrain, buildEEGCap } from './proceduralBrain.js';
import { clamp, easeInOutCubic, prefersReducedMotion } from '../util.js';
import { t } from '../i18n.js';

const GHOST_COLOR = new THREE.Color('#D8CFC6');
const WHITE = new THREE.Color('#FFFFFF');
const BLACK = new THREE.Color('#000000');

/** Map every mesh name inside our anatomical brain.glb to our 21 BRAIN_REGIONS ids */
export const GLB_MESH_TO_REGION = {
  // Frontal Lobe
  'left-superior-frontal-gyrus': 'frontal',
  'right-superior-frontal-gyrus': 'frontal',
  'left-middle-frontal-gyrus': 'frontal',
  'right-middle-frontal-gyrus': 'frontal',
  'right-inferior-frontal-gyrus': 'frontal',
  // Broca's Area (Left IFG)
  'left-inferior-frontal-gyrus': 'broca',
  // Primary Motor Cortex (Precentral Gyrus)
  'left-precentral-gyrus': 'motor',
  'right-precentral-gyrus': 'motor',
  // Primary Somatosensory Cortex (Postcentral Gyrus)
  'left-postcentral-gyrus': 'somatosensory',
  'right-postcentral-gyrus': 'somatosensory',
  // Parietal Lobe
  'left-superior-parietal-lobule': 'parietal',
  'right-superior-parietal-lobule': 'parietal',
  'left-angular-gyrus': 'parietal',
  'right-angular-gyrus': 'parietal',
  'left-supramarginal-gyrus': 'parietal',
  'right-supramarginal-gyrus': 'parietal',
  // Temporal Lobe
  'subdivision-of-superior-temporal-gyrus': 'temporal',
  'segment-of-gyrus-of-cerebral-hemisphere': 'temporal',
  'segment-of-gyrus-of-cerebral-hemisphere-1': 'temporal',
  'left-middle-temporal-gyrus': 'temporal',
  'right-middle-temporal-gyrus': 'temporal',
  'left-inferior-temporal-gyrus': 'temporal',
  'right-inferior-temporal-gyrus': 'temporal',
  'left-fusiform-gyrus': 'temporal',
  'right-fusiform-gyrus': 'temporal',
  // Wernicke's Area (Posterior STG)
  'posterior-part-of-superior-temporal-gyrus': 'wernicke',
  // Occipital Lobe & Primary Visual Cortex (V1)
  'left-occipital-lobe': 'occipital',
  'right-occipital-lobe': 'occipital',
  'left-visual-cortex': 'visual',
  'right-visual-cortex': 'visual',
  // Cerebellum
  'cerebellum': 'cerebellum',
  'cerebellum2': 'cerebellum',
  // Brainstem: Midbrain, Pons, Medulla
  'midbrain': 'midbrain',
  'midbrain2': 'midbrain',
  'left-superior-colliculus': 'midbrain',
  'right-superior-colliculus': 'midbrain',
  'inferior-colliculus': 'midbrain',
  'right-inferior-colliculus': 'midbrain',
  'pons': 'pons',
  'pons2': 'pons',
  'medulla-oblongata': 'medulla',
  'medulla-oblongata2': 'medulla',
  // Deep & Limbic Structures
  'thalamus': 'thalamus',
  'thalamus-1': 'thalamus',
  'habenula': 'thalamus',
  'pineal-body': 'thalamus',
  'hypothalamus': 'hypothalamus',
  'hypothalamus2': 'hypothalamus',
  'pituitary-gland': 'hypothalamus',
  'left-hippocampus': 'hippocampus',
  'right-hippocampus': 'hippocampus',
  'left-parahippocampal-gyrus': 'amygdala',
  'right-parahippocampal-gyrus': 'amygdala',
  'left-cingulate-gyrus': 'limbic',
  'right-cingulate-gyrus': 'limbic',
  'left-insula': 'limbic',
  'right-insula': 'limbic',
  'third-ventricle': 'limbic',
  'fourth-ventricle': 'limbic',
  'left-lateral-ventricle': 'limbic',
  'right-lateral-ventricle': 'limbic',
  'choroid-plexus-of-cerebral-hemisphere': 'limbic',
  'choroid-plexus-of-cerebral-hemisphere-1': 'limbic',
  // White matter & internal capsule
  'white-matter-of-left-cerebral-hemisphere': 'corpus-callosum',
  'white-matter-of-right-cerebral-hemisphere': 'corpus-callosum',
  'left-internal-capsule': 'corpus-callosum',
  'right-internal-capsule': 'corpus-callosum',
};

const DEEP_REGION_IDS = new Set([
  'limbic', 'thalamus', 'hypothalamus', 'hippocampus', 'amygdala', 'corpus-callosum',
  'midbrain', 'pons', 'medulla', 'brainstem',
]);

let cachedArrayBuffer = null;
function getEmbeddedGlbBuffer() {
  if (cachedArrayBuffer) return cachedArrayBuffer;
  const b64 = typeof window !== 'undefined' ? window.__BRAIN_GLB_B64 : null;
  if (!b64) return null;
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  cachedArrayBuffer = bytes.buffer;
  return cachedArrayBuffer;
}

/**
 * Custom per-pixel BrainFacts Biological Tissue Material.
 * Evaluates smooth meandering cortical sulcal fissures, cerebellar folia, and brainstem
 * fiber tracts per-pixel in GLSL with screen-space derivative normal bump mapping.
 */
function makeBrainTissueMaterial(regionColorHex) {
  const uniforms = {
    uRegionColor: { value: new THREE.Color(regionColorHex) },
    uTintStrength: { value: 0.0 },
    uIsGhost: { value: 0.0 },
  };

  const mat = new THREE.MeshStandardMaterial({
    color: WHITE.clone(),
    vertexColors: true,
    roughness: 0.54,
    metalness: 0.02,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
  });

  mat.userData.uniforms = uniforms;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRegionColor = uniforms.uRegionColor;
    shader.uniforms.uTintStrength = uniforms.uTintStrength;
    shader.uniforms.uIsGhost = uniforms.uIsGhost;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vBrainPos;
varying vec3 vBrainNorm;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vBrainPos = position;
vBrainNorm = normalize(normal);`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vBrainPos;
varying vec3 vBrainNorm;
uniform vec3 uRegionColor;
uniform float uTintStrength;
uniform float uIsGhost;

float gyroidPsi(vec3 q, float seedShift) {
  vec3 w;
  w.x = q.x + 0.078 * sin(q.y * 9.5 + q.z * 8.5 + seedShift) + 0.032 * cos(q.z * 16.5 - q.x * 14.0);
  w.y = q.y + 0.078 * sin(q.z * 9.2 - q.x * 9.0) + 0.032 * cos(q.x * 16.0 + q.y * 14.5);
  w.z = q.z + 0.078 * sin(q.x * 9.0 + q.y * 9.5) + 0.032 * cos(q.y * 16.5 - q.z * 13.5);
  float k = 23.0;
  float p1 = sin(k * w.x) * cos(k * w.y) + sin(k * w.y) * cos(k * w.z) + sin(k * w.z) * cos(k * w.x);
  float p2 = cos(k * 1.12 * w.y + 0.8) * sin(k * 1.12 * w.z + 0.5);
  return p1 + 0.24 * p2;
}`
      )
      .replace(
        '#include <color_fragment>',
        `float vWall = vColor.r;
float vConc = vColor.g;
float vType = vColor.b;
float bSulcusDepth = 0.0;

if (uIsGhost > 0.5) {
  diffuseColor.rgb = mix(vec3(0.86, 0.82, 0.79), uRegionColor, uTintStrength);
} else {
  vec3 p = vBrainPos;
  vec3 nObj = normalize(vBrainNorm);
  vec3 tissueRgb = vec3(0.95, 0.80, 0.72);

  if (vType > 0.85) {
    // Distance-estimated constant-width cortical sulcal field (zero blank plateaus, uniform gyri!)
    float lat = clamp((abs(p.x) - 0.08) / 0.35, 0.0, 1.0);
    float ext = clamp((abs(p.x) - 0.025) / 0.10, 0.0, 1.0);
    float sideSign = p.x >= 0.0 ? 1.0 : -1.0;
    float seedShift = sideSign * 0.35;

    vec3 dHemi = p - vec3(0.22 * sideSign, 0.18, 0.0);
    vec3 q = 0.55 * p + 0.45 * normalize(dHemi);

    float psi0 = gyroidPsi(q, seedShift);
    float eps = 0.0035;
    vec3 gPsi = vec3(
      gyroidPsi(q + vec3(eps, 0.0, 0.0), seedShift) - psi0,
      gyroidPsi(q + vec3(0.0, eps, 0.0), seedShift) - psi0,
      gyroidPsi(q + vec3(0.0, 0.0, eps), seedShift) - psi0
    ) / eps;

    // Tangent-plane gradient normalization ensures every sulcus has identical millimeter width!
    vec3 gTan = gPsi - dot(gPsi, nObj) * nObj;
    float distSulcus = abs(psi0) / sqrt(dot(gTan, gTan) + 24.0);
    float gyroidSulcus = exp(-pow(distSulcus / 0.0115, 2.0)) * ext;
    // Broad 3D pillow profile across the full width of each gyrus for realistic 3D curvature shading
    float gyrusPillow = pow(1.0 - smoothstep(0.0, 0.036, distSulcus), 1.35);

    // Wavy Sylvian Fissure (Lateral Sulcus)
    float wz = p.z + 0.045 * sin(p.x * 9.0 + p.y * 9.5 + seedShift);
    float wy = p.y + 0.045 * sin(p.z * 9.0 - p.x * 8.5);
    float sylvianY = 0.20 - 0.36 * (wz - 0.40) + 0.020 * sin(wz * 11.0);
    float sylvianDist = wy - sylvianY;
    float sylvianMask = lat * smoothstep(-0.45, -0.20, p.z) * (1.0 - smoothstep(0.42, 0.58, p.z));
    float sylvianGroove = exp(-pow(sylvianDist / 0.025, 2.0)) * sylvianMask;

    float suppress = exp(-pow(sylvianDist / 0.052, 2.0)) * sylvianMask;
    float sulcus = clamp(max(sylvianGroove, gyroidSulcus * (1.0 - 0.78 * suppress)), 0.0, 1.0);
    bSulcusDepth = clamp(sulcus * 0.65 + gyrusPillow * 0.55 * ext, 0.0, 1.0);

    // BrainFacts 3D Brain biological cortical palette (matched to user's screenshot):
    vec3 crownCol = vec3(0.965, 0.815, 0.735); // luminous warm peach-pink gyrus crown
    vec3 slopeCol = vec3(0.885, 0.665, 0.595); // soft warm peach slope of gyrus
    vec3 lipCol   = vec3(0.815, 0.465, 0.475); // rosy sulcal lip
    vec3 deepCol  = vec3(0.545, 0.125, 0.220); // deep vascular crimson-rose sulcus center

    float mottle = 0.011 * sin(p.x * 62.0 + cos(p.y * 56.0)) * cos(p.z * 58.0);
    crownCol += vec3(mottle, mottle * 0.7, mottle * 0.5);
    crownCol = mix(crownCol, uRegionColor, uTintStrength);
    slopeCol = mix(slopeCol, uRegionColor * 0.90, uTintStrength);
    lipCol   = mix(lipCol, uRegionColor * 0.75, uTintStrength * 0.7);

    tissueRgb = mix(crownCol, slopeCol, gyrusPillow * 0.65);
    float t1 = smoothstep(0.08, 0.52, sulcus);
    float t2 = smoothstep(0.42, 0.94, sulcus);
    tissueRgb = mix(tissueRgb, lipCol, t1);
    tissueRgb = mix(tissueRgb, deepCol, t2);

  } else if (vType > 0.60) {
    // Cerebellum: fine horizontal folia striations in warm dusty rose
    float foliaWave = sin(p.y * 195.0 + p.z * 26.0 + 0.4 * sin(p.x * 30.0));
    float folia = pow(0.5 - 0.5 * foliaWave, 1.7);
    float wall = smoothstep(0.18, 0.85, vWall);
    float sulcus = clamp(wall * 0.52 + folia * 0.68, 0.0, 1.0);
    bSulcusDepth = sulcus * 0.55;

    vec3 baseCol = mix(vec3(0.875, 0.628, 0.600), uRegionColor, uTintStrength);
    vec3 grooveCol = vec3(0.605, 0.315, 0.335);
    tissueRgb = mix(baseCol, grooveCol, sulcus);

  } else if (vType > 0.40) {
    // Brainstem (Midbrain, Pons, Medulla): longitudinal fibrous tracts
    float ang = atan(p.x, p.z + 0.12);
    float tractWave = sin(ang * 30.0 + p.y * 14.0);
    float tract = pow(0.5 - 0.5 * tractWave, 1.6);
    float wall = smoothstep(0.18, 0.84, vWall);
    float sulcus = clamp(wall * 0.58 + tract * 0.36, 0.0, 1.0);
    bSulcusDepth = sulcus * 0.45;

    vec3 baseCol = mix(vec3(0.895, 0.725, 0.685), uRegionColor, uTintStrength);
    vec3 grooveCol = vec3(0.585, 0.325, 0.340);
    tissueRgb = mix(baseCol, grooveCol, sulcus);

  } else if (vType > 0.18) {
    // Inner cerebral core floor underneath inter-gyral crevices
    tissueRgb = mix(vec3(0.560, 0.145, 0.225), uRegionColor * 0.7, uTintStrength);
  } else {
    // Deep limbic & diencephalon nuclei
    float wall = smoothstep(0.18, 0.85, vWall);
    vec3 baseCol = mix(vec3(0.910, 0.710, 0.650), uRegionColor, uTintStrength);
    vec3 grooveCol = vec3(0.590, 0.275, 0.305);
    tissueRgb = mix(baseCol, grooveCol, wall * 0.65);
  }

  diffuseColor.rgb = tissueRgb;
}`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
if (uIsGhost < 0.5 && bSulcusDepth > 0.001) {
  vec3 dPdx = dFdx(vViewPosition);
  vec3 dPdy = dFdy(vViewPosition);
  float dSdx = dFdx(bSulcusDepth);
  float dSdy = dFdy(bSulcusDepth);
  vec3 tX = cross(dPdy, normal);
  vec3 tY = cross(normal, dPdx);
  float lenX = max(length(tX), 1e-5);
  float lenY = max(length(tY), 1e-5);
  vec3 grad = (tX / lenX) * dSdx + (tY / lenY) * dSdy;
  normal = normalize(normal - grad * 0.92);
}`
      );
  };

  return mat;
}

export function getActiveRegionSet(targetId) {
  if (!targetId || targetId === 'brain') {
    return new Set(BRAIN_REGIONS.map((r) => r.id));
  }
  const set = new Set([targetId]);
  for (const r of BRAIN_REGIONS) {
    if (r.parent === targetId) set.add(r.id);
  }
  return set;
}

export function createBrainViewer(container, {
  mode = 'explorer', // 'explorer' | 'hero'
  initialFocus = 'brain',
  initialCap = false,
  initialColorMode = 'realistic', // 'realistic' | 'lobes'
  onSelectRegion = () => {},
  onSelectElectrode = () => {},
  onHover = () => {},
} = {}) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  // Exact side-profile camera orientation matching the BrainFacts 3D Brain screenshot
  // (+X camera looks at right hemisphere with Frontal lobe (+Z) on the LEFT and Cerebellum (-Z) on the RIGHT)
  const DEFAULT_CAM = [3.75, 0.32, 0.06];
  const DEFAULT_LOOK = [0, 0.14, -0.02];
  camera.position.set(...DEFAULT_CAM);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.inset = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  container.append(renderer.domElement);

  // Soft anatomical studio lighting (warm, bright, non-muddy shadows matching BrainFacts)
  const hemiLight = new THREE.HemisphereLight(0xfffaf6, 0xd8b2a6, 1.38);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfffcf8, 0.82);
  keyLight.position.set(4.5, 4.5, 3.5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffece2, 0.55);
  fillLight.position.set(-4.5, 1.5, -2.5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xf5eef8, 0.30);
  rimLight.position.set(0, -3.5, -4);
  scene.add(rimLight);

  // Floor shadow disc
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128; shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(31,42,68,0.15)');
  grad.addColorStop(1, 'rgba(31,42,68,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 2.5),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.12;
  scene.add(shadowPlane);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.35;
  controls.maxDistance = 6.0;
  controls.maxPolarAngle = Math.PI * 0.88;
  controls.target.set(...DEFAULT_LOOK);
  if (mode === 'hero') {
    controls.enableZoom = false;
    controls.enablePan = false;
  }

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);
  let brainGroup = new THREE.Group();
  let meshes = [];
  rootGroup.add(brainGroup);

  const { capGroup, electrodes } = buildEEGCap();
  capGroup.visible = initialCap;
  rootGroup.add(capGroup);

  let currentFocus = resolveRegionId(initialFocus);
  let colorMode = initialColorMode; // 'realistic' | 'lobes'
  let hoveredMesh = null;
  let selectedElectrodeName = null;
  let explodeAmount = 0;
  let explodeTarget = 0;
  let cutaway = false;
  const hiddenRegions = new Set();
  let autoRotate = mode === 'hero' && !prefersReducedMotion();
  let camAnim = null;

  function applyVisualState() {
    const activeSet = getActiveRegionSet(currentFocus);
    const isWholeBrain = currentFocus === 'brain';
    const highlightedElectrodes = new Set(REGION_MAP[currentFocus]?.electrodes || []);

    for (const m of meshes) {
      const rid = m.userData.regionId;
      const hemi = m.userData.hemi;
      const isWhiteMatterFiller = m.userData.isWhiteMatterFiller;

      const hideFiller = isWhiteMatterFiller && !isWholeBrain && currentFocus !== 'corpus-callosum';
      const isHidden = hideFiller || hiddenRegions.has(rid) || (cutaway && hemi === 'R' && (m.userData.isCortical || isWhiteMatterFiller));
      m.visible = !isHidden;
      if (!m.visible) continue;

      const isFocused = activeSet.has(rid);
      const isHovered = hoveredMesh === m || (hoveredMesh && hoveredMesh.userData?.regionId === rid && !isWholeBrain);
      const baseCol = new THREE.Color(m.userData.baseColor);
      const u = m.material.userData?.uniforms;

      if (isWholeBrain) {
        if (u) {
          u.uIsGhost.value = 0.0;
          u.uRegionColor.value.copy(baseCol);
          if (colorMode === 'lobes') {
            u.uTintStrength.value = hoveredMesh === m ? 0.85 : 0.65;
          } else {
            u.uTintStrength.value = hoveredMesh === m ? 0.42 : 0.0;
          }
        }
        m.material.emissive.copy(hoveredMesh === m ? baseCol : BLACK);
        m.material.emissiveIntensity = hoveredMesh === m ? 0.14 : 0.0;
        m.material.opacity = 1.0;
        m.material.depthWrite = true;
        m.renderOrder = 0;
      } else if (isFocused) {
        if (u) {
          u.uIsGhost.value = 0.0;
          u.uRegionColor.value.copy(baseCol);
          u.uTintStrength.value = colorMode === 'lobes' ? 0.78 : (isHovered ? 0.48 : 0.30);
        }
        m.material.emissive.copy(baseCol);
        m.material.emissiveIntensity = isHovered ? 0.18 : 0.08;
        m.material.opacity = 1.0;
        m.material.depthWrite = true;
        m.renderOrder = 2;
      } else {
        // BrainFacts-style Structure Isolation ghosting (~14% translucent)
        if (u) {
          u.uIsGhost.value = 1.0;
          u.uRegionColor.value.copy(baseCol);
          u.uTintStrength.value = hoveredMesh === m ? 0.45 : 0.0;
        }
        m.material.color.copy(GHOST_COLOR);
        m.material.emissive.copy(hoveredMesh === m ? baseCol : BLACK);
        m.material.emissiveIntensity = hoveredMesh === m ? 0.12 : 0.0;
        m.material.opacity = hoveredMesh === m ? 0.42 : 0.14;
        m.material.depthWrite = false;
        m.renderOrder = 1;
      }
    }

    for (const puck of electrodes) {
      const e = puck.userData.electrode;
      const isMatch = selectedElectrodeName === e.name || (!isWholeBrain && highlightedElectrodes.has(e.name));
      const isHovered = hoveredMesh === puck;
      puck.scale.setScalar(isMatch || isHovered ? 1.38 : 1.0);
      puck.material.color.set(isMatch ? '#FF6B4A' : isHovered ? '#F2B632' : '#FFFDF9');
    }
  }

  function ingestGlbScene(gltfScene) {
    const loadedMeshes = [];
    gltfScene.traverse((child) => {
      if (!child.isMesh) return;
      const rawName = child.name || child.parent?.name || '';
      const rid = GLB_MESH_TO_REGION[rawName] || resolveRegionId(rawName);
      const meta = REGION_MAP[rid] || REGION_MAP.frontal;

      child.geometry.computeBoundingBox();
      const box = child.geometry.boundingBox;
      const center = box ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3();

      child.material = makeBrainTissueMaterial(meta.color);

      const hemi = center.x < -0.04 ? 'L' : center.x > 0.04 ? 'R' : 'M';
      const isCortical = !DEEP_REGION_IDS.has(rid);
      const isWhiteMatterFiller = rawName.startsWith('white-matter-of-');
      const expDir = center.clone();
      if (expDir.lengthSq() < 1e-4) expDir.set(0, 0.2, 0);
      const explodeVec = expDir.normalize().multiplyScalar(isCortical ? 0.48 : 0.25);

      child.userData = {
        regionId: rid,
        rawName,
        hemi,
        isCortical,
        isWhiteMatterFiller,
        baseColor: meta.color,
        basePos: child.position.clone(),
        explodeVec,
        center,
      };
      loadedMeshes.push(child);
    });

    if (loadedMeshes.length) {
      rootGroup.remove(brainGroup);
      brainGroup = gltfScene;
      meshes = loadedMeshes;
      rootGroup.add(brainGroup);
      applyVisualState();
      return true;
    }
    return false;
  }

  const embeddedBuf = getEmbeddedGlbBuffer();
  if (embeddedBuf) {
    const loader = new GLTFLoader();
    loader.parse(
      embeddedBuf,
      '',
      (gltf) => {
        ingestGlbScene(gltf.scene);
      },
      (err) => {
        console.warn('Embedded GLB parse fallback:', err);
        const proc = buildProceduralBrain();
        rootGroup.remove(brainGroup);
        brainGroup = proc.brainGroup;
        meshes = proc.meshes;
        rootGroup.add(brainGroup);
        applyVisualState();
      }
    );
  } else {
    const proc = buildProceduralBrain();
    rootGroup.remove(brainGroup);
    brainGroup = proc.brainGroup;
    meshes = proc.meshes;
    rootGroup.add(brainGroup);
  }

  async function tryLoadExternalGLB(url = './assets/models/brain.glb') {
    if (getEmbeddedGlbBuffer()) return true;
    if (location.protocol === 'file:') return false;
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (!head.ok) return false;
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
      loader.setDRACOLoader(draco);
      const gltf = await loader.loadAsync(url);
      return ingestGlbScene(gltf.scene);
    } catch {
      return false;
    }
  }

  function startCameraTween(posArr, lookArr, duration = 0.78) {
    if (prefersReducedMotion()) {
      camera.position.set(...posArr);
      controls.target.set(...lookArr);
      controls.update();
      return;
    }
    camAnim = {
      t: 0,
      dur: duration,
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(...posArr),
      fromTarget: controls.target.clone(),
      toTarget: new THREE.Vector3(...lookArr),
    };
  }

  function focusRegion(id, { animate = true, notify = true } = {}) {
    const resolved = resolveRegionId(id);
    currentFocus = resolved;
    const meta = REGION_MAP[resolved] || REGION_MAP.brain;
    if (animate && meta.cameraPos && meta.lookAt) {
      const targetCam = resolved === 'brain' ? DEFAULT_CAM : meta.cameraPos;
      const targetLook = resolved === 'brain' ? DEFAULT_LOOK : meta.lookAt;
      startCameraTween(targetCam, targetLook);
    }
    applyVisualState();
    if (notify) onSelectRegion(meta);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downXY = null;

  function getInteractiveTargets() {
    const list = [];
    if (capGroup.visible) list.push(...electrodes);
    for (const m of meshes) {
      if (m.visible) list.push(m);
    }
    return list;
  }

  function updatePointer(ev) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(getInteractiveTargets(), true);
    let hitObj = null;
    if (hits.length) {
      for (const h of hits) {
        let obj = h.object;
        while (obj.parent && !obj.userData?.regionId && !obj.userData?.isElectrode) {
          obj = obj.parent;
        }
        if (obj.userData?.isElectrode || obj.userData?.regionId) {
          hitObj = obj;
          break;
        }
      }
    }

    if (hitObj !== hoveredMesh) {
      hoveredMesh = hitObj;
      renderer.domElement.style.cursor = hitObj ? 'pointer' : 'grab';
      applyVisualState();
    }

    if (hitObj) {
      if (hitObj.userData.isElectrode) {
        const e = hitObj.userData.electrode;
        onHover({
          type: 'electrode',
          titleTh: t(`อิเล็กโทรด ${e.name}`, `Electrode ${e.name}`),
          titleEn: `${e.letter.th} · ${e.side.th}`,
          x: ev.clientX,
          y: ev.clientY,
        });
      } else {
        const meta = REGION_MAP[hitObj.userData.regionId];
        if (meta) {
          onHover({
            type: 'region',
            titleTh: meta.nameTh,
            titleEn: meta.nameEn,
            color: meta.color,
            x: ev.clientX,
            y: ev.clientY,
          });
        }
      }
    } else {
      onHover(null);
    }
  }

  const onPointerMove = (ev) => updatePointer(ev);
  const onPointerDown = (ev) => {
    downXY = [ev.clientX, ev.clientY];
    autoRotate = false;
  };
  const onPointerUp = (ev) => {
    if (!downXY) return;
    const dist = Math.hypot(ev.clientX - downXY[0], ev.clientY - downXY[1]);
    downXY = null;
    if (dist > 6) return;
    updatePointer(ev);
    if (!hoveredMesh) return;

    if (hoveredMesh.userData.isElectrode) {
      const e = hoveredMesh.userData.electrode;
      selectedElectrodeName = e.name;
      focusRegion(e.region, { animate: true, notify: true });
      onSelectElectrode(e);
    } else if (hoveredMesh.userData.regionId) {
      selectedElectrodeName = null;
      const rid = hoveredMesh.userData.regionId;
      focusRegion(rid === currentFocus ? 'brain' : rid, { animate: true, notify: true });
    }
  };
  const onPointerLeave = () => {
    hoveredMesh = null;
    applyVisualState();
    onHover(null);
  };

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);

  const resize = () => {
    const r = container.getBoundingClientRect();
    const w = Math.max(100, r.width);
    const h = Math.max(100, r.height);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  focusRegion(currentFocus, { animate: false, notify: false });

  let rafId = 0;
  let lastTime = performance.now();
  let elapsed = 0;

  function tick(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    elapsed += dt;

    if (camAnim) {
      camAnim.t += dt / camAnim.dur;
      const k = easeInOutCubic(clamp(camAnim.t, 0, 1));
      camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, k);
      controls.target.lerpVectors(camAnim.fromTarget, camAnim.toTarget, k);
      if (camAnim.t >= 1) camAnim = null;
    }

    if (Math.abs(explodeAmount - explodeTarget) > 0.001) {
      explodeAmount += (explodeTarget - explodeAmount) * Math.min(1, dt * 8);
      for (const m of meshes) {
        m.position.copy(m.userData.basePos).addScaledVector(m.userData.explodeVec, explodeAmount);
      }
    }

    if (autoRotate) {
      rootGroup.rotation.y += dt * 0.25;
      if (mode === 'hero' && capGroup.visible) {
        capGroup.position.y = Math.sin(elapsed * 1.6) * 0.02;
      }
    } else if (Math.abs(rootGroup.rotation.y) > 0.001 && mode === 'explorer') {
      rootGroup.rotation.y *= 0.9;
    }

    controls.update();
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  return {
    focusRegion,
    getFocus: () => currentFocus,
    setColorMode(m) {
      colorMode = m || (colorMode === 'realistic' ? 'lobes' : 'realistic');
      applyVisualState();
      return colorMode;
    },
    getColorMode: () => colorMode,
    resetView() {
      selectedElectrodeName = null;
      explodeTarget = 0;
      cutaway = false;
      hiddenRegions.clear();
      focusRegion('brain', { animate: true, notify: true });
    },
    setExplode(val) {
      explodeTarget = typeof val === 'boolean' ? (val ? 1 : 0) : clamp(Number(val), 0, 1);
      return explodeTarget > 0;
    },
    getExplode: () => explodeTarget > 0.05,
    setCutaway(val) {
      cutaway = val === undefined ? !cutaway : !!val;
      applyVisualState();
      return cutaway;
    },
    getCutaway: () => cutaway,
    setEEGCap(val) {
      capGroup.visible = val === undefined ? !capGroup.visible : !!val;
      applyVisualState();
      return capGroup.visible;
    },
    getEEGCap: () => capGroup.visible,
    toggleHideRegion(id = currentFocus) {
      if (!id || id === 'brain') return false;
      if (hiddenRegions.has(id)) hiddenRegions.delete(id);
      else hiddenRegions.add(id);
      applyVisualState();
      return hiddenRegions.has(id);
    },
    isRegionHidden: (id = currentFocus) => hiddenRegions.has(id),
    selectElectrode(name) {
      selectedElectrodeName = name;
      const e = electrodes.find((p) => p.userData.electrode.name === name)?.userData.electrode;
      if (e) {
        capGroup.visible = true;
        focusRegion(e.region, { animate: true, notify: true });
        onSelectElectrode(e);
      }
    },
    tryLoadExternalGLB,
    dispose() {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);
      renderer.domElement.addEventListener('pointerleave', onPointerLeave);
      renderer.dispose();
    },
  };
}
