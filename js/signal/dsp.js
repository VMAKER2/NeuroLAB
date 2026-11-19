// Signal toolkit: synthetic EEG, biquad filters, FFT / spectra.
// Everything runs in plain JS so widgets can process signals live in the browser.
import { seeded } from '../util.js';
import { bilingual } from '../i18n.js';

/* ---------------------------------------------------------------
   EEG frequency bands (Hz). Mu shares the alpha range but lives
   over the sensorimotor cortex (C3/Cz/C4).
---------------------------------------------------------------- */
export const BANDS = {
  delta: bilingual({ lo: 0.5, hi: 4, th: 'เดลตา', en: 'Delta', color: '#7F9CC2' }),
  theta: bilingual({ lo: 4, hi: 8, th: 'ทีตา', en: 'Theta', color: '#9C8FD6' }),
  alpha: bilingual({ lo: 8, hi: 13, th: 'อัลฟา', en: 'Alpha', color: '#1FA39A' }),
  beta: bilingual({ lo: 13, hi: 30, th: 'เบตา', en: 'Beta', color: '#F2B632' }),
  gamma: bilingual({ lo: 30, hi: 45, th: 'แกมมา', en: 'Gamma', color: '#FF6B4A' }),
};

/* ---------------------------------------------------------------
   Noise sources
---------------------------------------------------------------- */
/** Gaussian (Box–Muller) generator */
export function gaussian(rng = Math.random) {
  let spare = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0, v = 0;
    while (u === 0) u = rng();
    v = rng();
    const m = Math.sqrt(-2 * Math.log(u));
    spare = m * Math.sin(2 * Math.PI * v);
    return m * Math.cos(2 * Math.PI * v);
  };
}

/** Pink (1/f) noise via Paul Kellet's filter. Returns () => sample (~unit variance). */
export function pinkNoise(rng = Math.random) {
  const g = gaussian(rng);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const w = g();
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    return out * 0.11;
  };
}

/* ---------------------------------------------------------------
   Band oscillator: a narrow-band rhythm whose frequency wanders
   inside the band and whose amplitude waxes and wanes — this is
   what makes synthetic EEG look "alive" instead of a pure sine.
---------------------------------------------------------------- */
export class BandOscillator {
  constructor(lo, hi, fs, rng = Math.random) {
    this.lo = lo; this.hi = hi; this.fs = fs; this.rng = rng;
    this.f = lo + (hi - lo) * rng();
    this.phase = rng() * Math.PI * 2;
    this.env = 0.7; this.envTarget = 1;
    this.t = 0;
  }
  next() {
    const { rng } = this;
    // slow frequency random walk
    this.f += (rng() - 0.5) * 0.02 * (this.hi - this.lo);
    if (this.f < this.lo) this.f = this.lo; if (this.f > this.hi) this.f = this.hi;
    // amplitude envelope (waxing / waning "spindles")
    if (++this.t % Math.round(this.fs * 0.25) === 0) this.envTarget = 0.35 + rng() * 0.9;
    this.env += (this.envTarget - this.env) * (2.5 / this.fs);
    this.phase += (2 * Math.PI * this.f) / this.fs;
    return Math.sin(this.phase) * this.env;
  }
}

/**
 * Multi-band EEG synthesiser for one channel.
 *  const s = new EEGSynth({ fs: 250, amps: { alpha: 20, beta: 5 }, noise: 4, line: 0 });
 *  s.next() → microvolts
 * amps are in µV (rough peak amplitude of each rhythm).
 * line = 50 Hz mains interference amplitude (Thailand uses 50 Hz).
 */
export class EEGSynth {
  constructor({ fs = 250, amps = {}, noise = 4, line = 0, lineFreq = 50, seed = 1 } = {}) {
    this.fs = fs;
    this.rng = seeded(seed);
    this.amps = { delta: 8, theta: 5, alpha: 8, beta: 4, gamma: 1, ...amps };
    this.osc = {};
    for (const [k, b] of Object.entries(BANDS)) this.osc[k] = new BandOscillator(b.lo, b.hi, fs, this.rng);
    this.pink = pinkNoise(this.rng);
    this.noise = noise;
    this.line = line; this.lineFreq = lineFreq; this.linePhase = 0;
    this.extra = []; // transient events: { fn(t), t, dur }
    this.n = 0;
  }
  /** Smoothly change band amplitudes, e.g. setAmps({ alpha: 30 }) */
  setAmps(a) { Object.assign(this.amps, a); }

  /** Add a transient event (artifact or ERP). shape(t, dur) → µV, t in seconds since start. */
  addEvent(shape, dur) { this.extra.push({ shape, t: 0, dur }); }

  next() {
    let v = 0;
    for (const k in this.osc) v += this.osc[k].next() * (this.amps[k] || 0);
    v += this.pink() * this.noise * 3;
    if (this.line) {
      this.linePhase += (2 * Math.PI * this.lineFreq) / this.fs;
      v += Math.sin(this.linePhase) * this.line;
    }
    for (let i = this.extra.length - 1; i >= 0; i--) {
      const e = this.extra[i];
      v += e.shape(e.t, e.dur);
      e.t += 1 / this.fs;
      if (e.t > e.dur) this.extra.splice(i, 1);
    }
    this.n++;
    return v;
  }
  block(n) { const out = new Float32Array(n); for (let i = 0; i < n; i++) out[i] = this.next(); return out; }
}

/* Common artifact / ERP shapes (t in s, returns µV) */
export const shapes = {
  /** Eye blink: big slow positive bump at frontal sites, ~300 ms */
  blink: (amp = 120) => (t, d) => amp * Math.exp(-Math.pow((t - d / 2) / (d / 5), 2)),
  /** Muscle (EMG) burst: high-frequency noise */
  emg: (amp = 30, rng = Math.random) => (t, d) => {
    const env = Math.sin(Math.PI * t / d);
    return env * amp * (rng() * 2 - 1);
  },
  /** Heartbeat (ECG) spike */
  ecg: (amp = 25) => (t) => amp * (Math.exp(-Math.pow((t - 0.05) / 0.008, 2)) - 0.25 * Math.exp(-Math.pow((t - 0.2) / 0.04, 2))),
  /** P300: positive deflection peaking ~300 ms after stimulus (with N1/P2 before) */
  p300: (amp = 10, latency = 0.3) => (t) =>
    -3 * Math.exp(-Math.pow((t - 0.1) / 0.025, 2)) +
    3 * Math.exp(-Math.pow((t - 0.18) / 0.03, 2)) +
    amp * Math.exp(-Math.pow((t - latency) / 0.07, 2)),
};

/* ---------------------------------------------------------------
   Biquad filters (RBJ Audio EQ Cookbook)
---------------------------------------------------------------- */
export function biquadCoeffs(type, fs, f0, Q = Math.SQRT1_2) {
  const w0 = (2 * Math.PI * f0) / fs;
  const cos = Math.cos(w0), sin = Math.sin(w0);
  const alpha = sin / (2 * Q);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'lowpass':
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; break;
    case 'highpass':
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; break;
    case 'bandpass':
      b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; break;
    case 'notch':
      b0 = 1; b1 = -2 * cos; b2 = 1; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; break;
    default: throw new Error('unknown filter ' + type);
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Stateful biquad section for streaming. */
export class Biquad {
  constructor(c) { this.c = c; this.x1 = this.x2 = this.y1 = this.y2 = 0; }
  set(c) { this.c = c; }
  reset() { this.x1 = this.x2 = this.y1 = this.y2 = 0; }
  process(x) {
    const { b0, b1, b2, a1, a2 } = this.c;
    const y = b0 * x + b1 * this.x1 + b2 * this.x2 - a1 * this.y1 - a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

/** A chain of biquads, e.g. a 4th-order Butterworth band-pass + notch. */
export class FilterChain {
  constructor(sections = []) { this.sections = sections.map((c) => new Biquad(c)); }
  process(x) { for (const s of this.sections) x = s.process(x); return x; }
  run(data) { const out = new Float32Array(data.length); for (let i = 0; i < data.length; i++) out[i] = this.process(data[i]); return out; }
  reset() { this.sections.forEach((s) => s.reset()); }
}

const BUTTER4_Q = [0.5411961, 1.3065630];

/**
 * designFilter({ fs, low, high, notch }) → array of biquad coefficient sets.
 * low  = high-pass corner (Hz) or 0/null to skip
 * high = low-pass corner (Hz) or 0/null to skip
 * notch = mains frequency to remove (50) or 0/null
 */
export function designFilter({ fs, low = 0, high = 0, notch = 0, notchQ = 25 }) {
  const secs = [];
  if (low > 0) BUTTER4_Q.forEach((q) => secs.push(biquadCoeffs('highpass', fs, low, q)));
  if (high > 0 && high < fs / 2) BUTTER4_Q.forEach((q) => secs.push(biquadCoeffs('lowpass', fs, high, q)));
  if (notch > 0) secs.push(biquadCoeffs('notch', fs, notch, notchQ));
  return secs;
}

/** Zero-phase filtering of a whole buffer (forward + backward), like scipy's filtfilt. */
export function filtfilt(sections, data) {
  let fwd = new FilterChain(sections).run(data);
  fwd.reverse();
  const back = new FilterChain(sections).run(fwd);
  back.reverse();
  return back;
}

/** Magnitude response |H(f)| of a chain at frequency f. */
export function freqResponse(sections, fs, f) {
  const w = (2 * Math.PI * f) / fs;
  let mag = 1;
  for (const { b0, b1, b2, a1, a2 } of sections) {
    const cr = (k) => Math.cos(k * w), ci = (k) => -Math.sin(k * w);
    const nr = b0 + b1 * cr(1) + b2 * cr(2), ni = b1 * ci(1) + b2 * ci(2);
    const dr = 1 + a1 * cr(1) + a2 * cr(2), di = a1 * ci(1) + a2 * ci(2);
    mag *= Math.hypot(nr, ni) / Math.hypot(dr, di);
  }
  return mag;
}

/* ---------------------------------------------------------------
   FFT + spectra
---------------------------------------------------------------- */
/** In-place iterative radix-2 FFT. re/im length must be a power of 2. */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

const nextPow2 = (n) => 1 << Math.ceil(Math.log2(Math.max(2, n)));

/**
 * Amplitude spectrum with a Hann window.
 * Returns { freqs: Float32Array, mags: Float32Array } up to fs/2.
 */
export function spectrum(data, fs, nfft) {
  const n = nfft || nextPow2(data.length);
  const re = new Float64Array(n), im = new Float64Array(n);
  const L = Math.min(data.length, n);
  let mean = 0;
  for (let i = 0; i < L; i++) mean += data[i];
  mean /= L;
  let wsum = 0;
  for (let i = 0; i < L; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (L - 1));
    re[i] = (data[i] - mean) * w;
    wsum += w;
  }
  fft(re, im);
  const half = n / 2;
  const freqs = new Float32Array(half), mags = new Float32Array(half);
  for (let k = 0; k < half; k++) {
    freqs[k] = (k * fs) / n;
    mags[k] = (2 * Math.hypot(re[k], im[k])) / wsum;
  }
  return { freqs, mags };
}

/** Welch power spectral density (µV²/Hz-ish units; fine for teaching). */
export function welch(data, fs, seg = 256) {
  seg = Math.min(seg, nextPow2(data.length) / 2 || seg);
  const step = seg / 2;
  let acc = null, count = 0, freqs;
  for (let s = 0; s + seg <= data.length; s += step) {
    const sp = spectrum(data.subarray ? data.subarray(s, s + seg) : data.slice(s, s + seg), fs, seg);
    freqs = sp.freqs;
    if (!acc) acc = new Float32Array(sp.mags.length);
    for (let i = 0; i < acc.length; i++) acc[i] += sp.mags[i] * sp.mags[i];
    count++;
  }
  if (!acc) return spectrum(data, fs);
  for (let i = 0; i < acc.length; i++) acc[i] /= count;
  return { freqs, mags: acc, power: true };
}

/** Mean value of spectrum between lo and hi Hz. */
export function bandPower({ freqs, mags }, lo, hi) {
  let s = 0, n = 0;
  for (let i = 0; i < freqs.length; i++) if (freqs[i] >= lo && freqs[i] < hi) { s += mags[i]; n++; }
  return n ? s / n : 0;
}

/** Root-mean-square of a buffer */
export function rms(data) {
  let s = 0;
  for (let i = 0; i < data.length; i++) s += data[i] * data[i];
  return Math.sqrt(s / data.length);
}
