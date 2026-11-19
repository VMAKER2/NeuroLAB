// Top-down 2D head (nose up) with 10-20 electrodes, shared by several widgets.
import { ELECTRODES } from '../data/electrodes.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

/** Convert electrode xy (-1..1, +y nose) to SVG coords for a head of radius R centred at (cx, cy). */
export const toSvg = (xy, R = 100, cx = 130, cy = 130) => [cx + xy[0] * R, cy - xy[1] * R];

/**
 * headTop({ size = 260, showElectrodes = true, labels = true, only = null, onPick })
 * Returns { svg, dots: Map(name → circle), labels: Map(name → text), R, cx, cy, layer }
 * - `only`: array of names to show (others hidden)
 * - `layer`: <g> behind electrodes where callers can paint (e.g. topomaps)
 */
export function headTop({ size = 260, showElectrodes = true, labels = true, only = null, onPick } = {}) {
  const R = 100, cx = 130, cy = 132;
  const svg = s('svg', { viewBox: '0 0 260 270', width: size, class: 'head2d', role: 'img', 'aria-label': 'ศีรษะมองจากด้านบน จมูกอยู่ด้านบน' });
  // ears
  svg.append(s('path', { d: `M${cx - R} ${cy - 18}c-14 2-14 34 0 36`, fill: '#FFE1D8', stroke: '#1F2A44', 'stroke-width': 2.5 }));
  svg.append(s('path', { d: `M${cx + R} ${cy - 18}c14 2 14 34 0 36`, fill: '#FFE1D8', stroke: '#1F2A44', 'stroke-width': 2.5 }));
  // nose
  svg.append(s('path', { d: `M${cx - 14} ${cy - R + 3}L${cx} ${cy - R - 18}L${cx + 14} ${cy - R + 3}`, fill: '#FFE1D8', stroke: '#1F2A44', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
  // scalp
  svg.append(s('circle', { cx, cy, r: R, fill: '#FFF4EC', stroke: '#1F2A44', 'stroke-width': 2.5 }));
  const layer = s('g', { class: 'paint' });
  svg.append(layer);
  // guide lines: midline, coronal, 72° ring
  const guides = s('g', { stroke: 'rgba(31,42,68,.22)', 'stroke-width': 1.2, fill: 'none', 'stroke-dasharray': '3 4' });
  guides.append(s('line', { x1: cx, y1: cy - R, x2: cx, y2: cy + R }));
  guides.append(s('line', { x1: cx - R, y1: cy, x2: cx + R, y2: cy }));
  guides.append(s('circle', { cx, cy, r: R * 0.8 }));
  guides.append(s('circle', { cx, cy, r: R * 0.4 }));
  svg.append(guides);

  const dots = new Map(), texts = new Map();
  if (showElectrodes) {
    for (const e of ELECTRODES) {
      if (only && !only.includes(e.name)) continue;
      const [x, y] = toSvg(e.xy, R, cx, cy);
      const g = s('g', { class: 'el', 'data-name': e.name, tabindex: onPick ? 0 : -1, role: onPick ? 'button' : 'img', 'aria-label': e.name });
      const c = s('circle', { cx: x, cy: y, r: 9, fill: '#FFFDF9', stroke: '#1F2A44', 'stroke-width': 2 });
      g.append(c);
      if (labels) {
        const t = s('text', { x, y: y + 3.5, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace', 'font-size': 7.5, 'font-weight': 600, fill: '#1F2A44', 'pointer-events': 'none' });
        t.textContent = e.name;
        g.append(t);
        texts.set(e.name, t);
      }
      if (onPick) {
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => onPick(e.name, g));
        g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(e.name, g); } });
      }
      svg.append(g);
      dots.set(e.name, c);
    }
  }
  return { svg, dots, labels: texts, R, cx, cy, layer };
}

/**
 * Paint a smooth scalp map (topomap) into a head's paint layer using inverse-distance
 * interpolation. values: { C3: -1, C4: 0.5, ... } in range -1..1.
 * Negative = cool (teal) = power DROP (ERD); positive = warm (coral) = power RISE (ERS).
 */
export function paintTopomap(head, values, { res = 46 } = {}) {
  const { layer, R, cx, cy } = head;
  layer.innerHTML = '';
  const pts = ELECTRODES.filter((e) => values[e.name] != null).map((e) => ({ x: e.xy[0], y: e.xy[1], v: values[e.name] }));
  const cell = (2 * R) / res;
  const clip = `topo-clip-${Math.random().toString(36).slice(2, 8)}`;
  const defs = s('defs');
  const cp = s('clipPath', { id: clip });
  cp.append(s('circle', { cx, cy, r: R - 1.5 }));
  defs.append(cp);
  layer.append(defs);
  const g = s('g', { 'clip-path': `url(#${clip})` });
  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      const x = -1 + (i + 0.5) * (2 / res), y = 1 - (j + 0.5) * (2 / res);
      if (x * x + y * y > 1.05) continue;
      let num = 0, den = 0;
      for (const p of pts) {
        const d2 = (x - p.x) ** 2 + (y - p.y) ** 2 + 1e-4;
        const w = 1 / (d2 * d2);
        num += w * p.v; den += w;
      }
      const v = den ? num / den : 0;
      g.append(s('rect', { x: cx - R + i * cell, y: cy - R + j * cell, width: cell + 0.6, height: cell + 0.6, fill: topoColor(v) }));
    }
  }
  layer.append(g);
}

/** -1 → teal, 0 → paper, +1 → coral */
export function topoColor(v) {
  const t = Math.max(-1, Math.min(1, v));
  const paper = [255, 247, 238], teal = [31, 163, 154], coral = [255, 107, 74];
  const target = t < 0 ? teal : coral;
  const k = Math.abs(t);
  const c = paper.map((p, i) => Math.round(p + (target[i] - p) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
