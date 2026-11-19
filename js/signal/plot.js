// Canvas plotting helpers in the NeuroLAB style (ink lines on graph paper).

export const INK = '#1F2A44';
export const GRID = 'rgba(31,42,68,.08)';
export const GRID_STRONG = 'rgba(31,42,68,.18)';
export const MONO = '600 11px "JetBrains Mono", ui-monospace, monospace';
export const HEAD = '600 12px "Anuphan", "IBM Plex Sans Thai", sans-serif';

/**
 * Make a canvas crisp on HiDPI and keep it sized to its CSS box.
 * Returns { ctx, get w(), get h(), dispose() }. onResize is called after each resize.
 */
export function fitCanvas(canvas, onResize) {
  const ctx = canvas.getContext('2d');
  const state = { ctx, w: 0, h: 0, dpr: 1 };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(10, Math.round(r.width)), hh = Math.max(10, Math.round(r.height));
    if (w === state.w && hh === state.h && dpr === state.dpr) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.w = w; state.h = hh; state.dpr = dpr;
    onResize && onResize(state);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  state.dispose = () => ro.disconnect();
  return state;
}

/** Graph-paper background grid. */
export function drawGrid(ctx, w, h, { step = 20, major = 5, bg = '#FFFEFB' } = {}) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 1;
  let i = 0;
  for (let x = 0.5; x < w; x += step, i++) {
    ctx.strokeStyle = i % major === 0 ? GRID_STRONG : GRID;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  i = 0;
  for (let y = 0.5; y < h; y += step, i++) {
    ctx.strokeStyle = i % major === 0 ? GRID_STRONG : GRID;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
}

/**
 * Draw a trace into a rectangle.
 * opts: { x, y, w, h, min, max, color, lw, start, count }
 * If min/max omitted, auto-scales symmetric around 0.
 */
export function drawTrace(ctx, data, opts = {}) {
  const { x = 0, y = 0, w, h, color = INK, lw = 1.8, start = 0 } = opts;
  const count = opts.count ?? data.length - start;
  let { min, max } = opts;
  if (min == null || max == null) {
    let m = 1e-9;
    for (let i = start; i < start + count; i++) m = Math.max(m, Math.abs(data[i]));
    min = -m * 1.1; max = m * 1.1;
  }
  const sx = w / Math.max(1, count - 1);
  const sy = h / (max - min);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const px = x + i * sx;
    const py = y + h - (data[start + i] - min) * sy;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Spectrum plot with frequency axis.
 * opts: { maxF = 45, maxY, color, fill, bands: true, markers: [{f, label, color}], log: false }
 */
export function drawSpectrum(ctx, w, h, { freqs, mags }, opts = {}) {
  const { maxF = 45, color = INK, fill = 'rgba(255,107,74,.18)', pad = { l: 34, r: 10, t: 10, b: 24 }, bands = true, markers = [] } = opts;
  drawGrid(ctx, w, h);
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  let maxY = opts.maxY;
  if (!maxY) { maxY = 1e-9; for (let i = 0; i < freqs.length; i++) if (freqs[i] <= maxF) maxY = Math.max(maxY, mags[i]); maxY *= 1.15; }
  const X = (f) => pad.l + (f / maxF) * pw;
  const Y = (v) => pad.t + ph - Math.min(1, v / maxY) * ph;

  if (bands) {
    const B = [[0.5, 4, '#7F9CC2', 'δ'], [4, 8, '#9C8FD6', 'θ'], [8, 13, '#1FA39A', 'α'], [13, 30, '#F2B632', 'β'], [30, 45, '#FF6B4A', 'γ']];
    for (const [lo, hi, c, l] of B) {
      if (lo > maxF) continue;
      ctx.fillStyle = c + '1F';
      ctx.fillRect(X(lo), pad.t, X(Math.min(hi, maxF)) - X(lo), ph);
      ctx.fillStyle = c; ctx.font = MONO; ctx.textAlign = 'center';
      ctx.fillText(l, (X(lo) + X(Math.min(hi, maxF))) / 2, pad.t + 12);
    }
  }
  // area
  ctx.beginPath();
  ctx.moveTo(X(0), Y(0));
  for (let i = 0; i < freqs.length && freqs[i] <= maxF; i++) ctx.lineTo(X(freqs[i]), Y(mags[i]));
  ctx.lineTo(X(Math.min(maxF, freqs[freqs.length - 1])), Y(0));
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < freqs.length && freqs[i] <= maxF; i++) i ? ctx.lineTo(X(freqs[i]), Y(mags[i])) : ctx.moveTo(X(freqs[i]), Y(mags[i]));
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

  for (const m of markers) {
    ctx.strokeStyle = m.color || '#FF6B4A'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(m.f), pad.t); ctx.lineTo(X(m.f), pad.t + ph); ctx.stroke(); ctx.setLineDash([]);
    if (m.label) { ctx.fillStyle = m.color || '#FF6B4A'; ctx.font = MONO; ctx.textAlign = 'left'; ctx.fillText(m.label, X(m.f) + 4, pad.t + 26); }
  }
  // axes
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ph); ctx.lineTo(pad.l + pw, pad.t + ph); ctx.stroke();
  ctx.fillStyle = INK; ctx.font = MONO; ctx.textAlign = 'center';
  const step = maxF > 60 ? 20 : maxF > 25 ? 10 : 5;
  for (let f = 0; f <= maxF; f += step) ctx.fillText(String(f), X(f), h - 7);
  ctx.textAlign = 'right';
  ctx.fillText('Hz', w - 2, h - 7);
  return { X, Y };
}

/**
 * Scrolling multi-channel oscilloscope.
 *  const s = new Scope(canvas, { channels: 3, fs: 250, seconds: 4, labels: ['Fz','Cz','Pz'], range: 60 });
 *  s.push([v0, v1, v2]); // one sample frame
 *  s.draw();             // call each animation frame
 */
export class Scope {
  constructor(canvas, { channels = 1, fs = 250, seconds = 4, labels = [], colors = [], range = 50, labelWidth = 44, unit = 'µV' } = {}) {
    this.canvas = canvas;
    this.fit = fitCanvas(canvas);
    this.ch = channels; this.fs = fs; this.seconds = seconds;
    this.len = Math.round(fs * seconds);
    this.buf = Array.from({ length: channels }, () => new Float32Array(this.len));
    this.head = 0;
    this.labels = labels; this.colors = colors;
    this.range = range; // ± µV per channel lane
    this.labelWidth = labels.length ? labelWidth : 0;
    this.unit = unit;
    this.marks = []; // { at: sampleIndex, color, label }
    this.total = 0;
  }
  push(frame) {
    for (let c = 0; c < this.ch; c++) this.buf[c][this.head] = frame[c] ?? 0;
    this.head = (this.head + 1) % this.len;
    this.total++;
  }
  /** Draw a vertical event marker at the current time. */
  mark(label = '', color = '#FF6B4A') { this.marks.push({ at: this.total, label, color }); }
  clear() { this.buf.forEach((b) => b.fill(0)); this.marks = []; }
  get data() {
    // channels unrolled oldest→newest
    return this.buf.map((b) => { const out = new Float32Array(this.len); out.set(b.subarray(this.head), 0); out.set(b.subarray(0, this.head), this.len - this.head); return out; });
  }
  draw() {
    const { ctx, w, h } = this.fit;
    drawGrid(ctx, w, h);
    const lane = h / this.ch;
    const x0 = this.labelWidth, pw = w - x0 - 8;
    const data = this.data;
    for (let c = 0; c < this.ch; c++) {
      const y = c * lane;
      if (c) { ctx.strokeStyle = 'rgba(31,42,68,.25)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(w, y + .5); ctx.stroke(); ctx.setLineDash([]); }
      drawTrace(ctx, data[c], { x: x0, y: y + 4, w: pw, h: lane - 8, min: -this.range, max: this.range, color: this.colors[c] || INK, lw: 1.6 });
      if (this.labels[c]) {
        ctx.fillStyle = this.colors[c] || INK; ctx.font = MONO; ctx.textAlign = 'left';
        ctx.fillText(this.labels[c], 8, y + lane / 2 + 4);
      }
    }
    // markers
    const oldest = this.total - this.len;
    this.marks = this.marks.filter((m) => m.at > oldest);
    for (const m of this.marks) {
      const px = x0 + ((m.at - oldest) / this.len) * pw;
      ctx.strokeStyle = m.color; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke(); ctx.setLineDash([]);
      if (m.label) { ctx.fillStyle = m.color; ctx.font = HEAD; ctx.textAlign = 'left'; ctx.fillText(m.label, px + 4, 14); }
    }
    // scale bar
    ctx.fillStyle = 'rgba(31,42,68,.6)'; ctx.font = MONO; ctx.textAlign = 'right';
    ctx.fillText(`±${this.range} ${this.unit}`, w - 10, h - 8);
  }
  dispose() { this.fit.dispose(); }
}
