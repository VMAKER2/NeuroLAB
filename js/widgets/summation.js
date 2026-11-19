// Lesson 2 widget: Spatial & Temporal Summation of Cortical Pyramidal Neurons
import { h, clamp, lerp, seeded, prefersReducedMotion, loop } from '../util.js';
import { icon } from '../ui/icons.js';
import { fitCanvas, drawGrid, INK, MONO, HEAD } from '../signal/plot.js';
import { t } from '../i18n.js';

const TOTAL_NEURONS = 60;
const COLS = 15;
const ROWS = 4;
const NOISE_FLOOR_UV = 5; // ±5 µV scalp noise floor

export default function mount(root, ctx) {
  root.innerHTML = '';

  const rng = seeded(2026);
  // Pre-generate 60 pyramidal neuron properties
  const neurons = Array.from({ length: TOTAL_NEURONS }, (_, i) => ({
    col: i % COLS,
    row: Math.floor(i / COLS),
    // Fixed random phase offset in [-π, π]
    jitterPhase: (rng() * 2 - 1) * Math.PI,
    // Slight natural frequency variation around 10 Hz when desynchronised
    detune: (rng() - 0.5) * 1.4,
    // Small spatial offset for organic cortical look
    dx: (rng() - 0.5) * 4,
    dy: (rng() - 0.5) * 3,
  }));

  let activeCount = 45;
  let synchrony = 15; // % (start low so cancellation is clear; user drags up to discover!)
  let userAdjusted = false;
  let simTime = 0;

  // Rolling buffer of scalp voltage (240 samples ~ 4s at 60fps)
  const BUF_LEN = 240;
  const scalpBuf = new Float32Array(BUF_LEN);
  const cortexBuf = new Float32Array(BUF_LEN);

  // Compute instantaneous summed signal at time t
  function computeInstant(tSec) {
    const syncFrac = synchrony / 100;
    // Spread shrinks from 1.0 (uniform random phase) to 0.0 (locked in-phase)
    const spread = Math.pow(1 - syncFrac, 1.15);
    let sum = 0;
    for (let i = 0; i < activeCount; i++) {
      const n = neurons[i];
      const f = 10 + n.detune * spread * 0.5;
      const ph = 2 * Math.PI * f * tSec + n.jitterPhase * spread;
      sum += Math.sin(ph);
    }
    // Each unit of coherent sum contributes ~0.85 µV at the scalp after skull attenuation
    const scalpUv = sum * 0.85 + Math.sin(tSec * 37) * 0.7 + Math.cos(tSec * 23) * 0.6;
    const cortexUv = sum * 8.5; // 10x stronger at cortex surface (ECoG scale)
    return { scalpUv, cortexUv };
  }

  // Theoretical peak scalp amplitude (µV) for readout
  function estimateAmplitudeUv() {
    const syncFrac = synchrony / 100;
    // Coherent component + incoherent sqrt(N) component
    const coherent = activeCount * Math.pow(syncFrac, 1.35) * 0.85;
    const incoherent = Math.sqrt(activeCount) * (1 - syncFrac) * 0.45;
    return +(coherent + incoherent + 0.8).toFixed(1);
  }

  // Pre-fill history buffer
  for (let i = 0; i < BUF_LEN; i++) {
    const t = (i - BUF_LEN) / 60;
    const { scalpUv, cortexUv } = computeInstant(t);
    scalpBuf[i] = scalpUv;
    cortexBuf[i] = cortexUv;
  }

  // --- Controls ---
  const activeOut = h('output', {}, t(`${activeCount} / ${TOTAL_NEURONS} กลุ่ม (~${Math.round(activeCount * 1.5)} ล้านเซลล์)`, `${activeCount} / ${TOTAL_NEURONS} groups (~${Math.round(activeCount * 1.5)}M neurons)`));
  const syncOut = h('output', {}, `${synchrony}%`);

  const activeSlider = h('input', {
    type: 'range',
    min: 1,
    max: TOTAL_NEURONS,
    step: 1,
    value: activeCount,
    'aria-label': t('จำนวนเซลล์ประสาทที่ทำงาน', 'Number of active neurons'),
    oninput: (e) => {
      activeCount = Number(e.target.value);
      userAdjusted = true;
      syncUI();
    },
  });

  const syncSlider = h('input', {
    type: 'range',
    min: 0,
    max: 100,
    step: 1,
    value: synchrony,
    'aria-label': t('ความพร้อมเพรียง (Synchrony %)', 'Synchrony (%)'),
    oninput: (e) => {
      synchrony = Number(e.target.value);
      userAdjusted = true;
      syncUI();
    },
  });

  const applyPreset = (nVal, sVal) => {
    activeCount = nVal;
    synchrony = sVal;
    activeSlider.value = String(nVal);
    syncSlider.value = String(sVal);
    userAdjusted = true;
    syncUI();
  };

  const presetRow = h('div', { class: 'ap-presets' },
    h('button', { type: 'button', class: 'chip', onclick: () => applyPreset(50, 10) }, t('ต่างคนต่างยิง (หักล้างกัน)', 'Out of sync (Cancels out)')),
    h('button', { type: 'button', class: 'chip', onclick: () => applyPreset(12, 90) }, t('พร้อมกันแต่จำนวนน้อย', 'Synced but few neurons')),
    h('button', { type: 'button', class: 'chip', onclick: () => applyPreset(55, 92) }, t('จำนวนมาก + พร้อมเพรียงสูง!', 'Many neurons + High synchrony!')),
  );

  // --- Left column: 60 Pyramidal Neurons Patch + Scalp EEG Canvas ---
  const cortexCanvas = h('canvas', {
    class: 'sum-cortex-canvas',
    role: 'img',
    'aria-label': t('ภาพจำลองเซลล์ประสาทพีระมิด 60 กลุ่มเรียงตัวในแนวตั้ง (Dipoles)', 'Simulation of 60 vertically aligned pyramidal neuron groups (Dipoles)'),
  });

  const traceCanvas = h('canvas', {
    class: 'sum-trace-canvas',
    role: 'img',
    'aria-label': t('กราฟสัญญาณที่หนังศีรษะ เทียบกับแถบสัญญาณรบกวน (Noise floor)', 'Scalp EEG signal compared against the noise floor band'),
  });

  // --- Right column: Cross-section of Head Layers & Readout ---
  const ampReadout = h('b', {}, '0.0 µV');
  const statusBadge = h('span', { class: 'chip' }, t('จมในสัญญาณรบกวน', 'Buried in noise'));

  const layersCard = h('div', { class: 'wa-panel card-bg sum-layers-card' },
    h('div', { class: 'wa-head', style: { marginBottom: '4px' } },
      h('h4', { class: 'wa-title' }, h('span', { html: icon('layers') }), t('ชั้นเนื้อเยื่อที่กั้นสัญญาณ', 'Tissue Layers Attenuating Signal'))
    ),
    h('div', {
      html: `
      <svg class="sum-layers-svg" viewBox="0 0 280 215" role="img" aria-label="${t('ภาพตัดขวางชั้นศีรษะ: หนังศีรษะ กะโหลก น้ำไขสันหลัง และเปลือกสมอง', 'Cross-section of head layers: scalp, skull, CSF, and cerebral cortex')}">
        <!-- Electrode on top of scalp -->
        <rect x="112" y="4" width="56" height="14" rx="5" fill="#F2B632" stroke="#1F2A44" stroke-width="2"/>
        <text x="140" y="14" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="700" fill="#1F2A44">EEG Sensor</text>

        <!-- Layer 1: Scalp (หนังศีรษะ) -->
        <rect x="10" y="20" width="260" height="34" rx="6" fill="#FFE1D8" stroke="#1F2A44" stroke-width="2"/>
        <text x="20" y="36" font-family="Anuphan, sans-serif" font-size="11.5" font-weight="700" fill="#1F2A44">${t('1. หนังศีรษะ (Scalp)', '1. Scalp')}</text>
        <text x="20" y="49" font-family="IBM Plex Sans Thai, sans-serif" font-size="9.5" fill="#47506A">${t('จุดที่วางอิเล็กโทรด — เหลือสัญญาณระดับ ~10–50 µV', 'Electrode site — signal reduced to ~10–50 µV')}</text>

        <!-- Layer 2: Skull (กะโหลกศีรษะ) -->
        <rect x="10" y="58" width="260" height="44" rx="6" fill="#EDE3D3" stroke="#1F2A44" stroke-width="2"/>
        <text x="20" y="75" font-family="Anuphan, sans-serif" font-size="11.5" font-weight="700" fill="#1F2A44">${t('2. กะโหลกศีรษะ (Skull)', '2. Skull')}</text>
        <text x="20" y="91" font-family="IBM Plex Sans Thai, sans-serif" font-size="9.5" fill="#FF6B4A" font-weight="600">${t('ต้านทานไฟฟ้าสูง! ลดทอนและเบลอสัญญาณมากที่สุด', 'High resistance! Strongest attenuation & spatial blur')}</text>

        <!-- Layer 3: CSF (น้ำไขสันหลัง) -->
        <rect x="10" y="106" width="260" height="32" rx="6" fill="#D3F0EC" stroke="#1F2A44" stroke-width="2"/>
        <text x="20" y="125" font-family="Anuphan, sans-serif" font-size="11.5" font-weight="700" fill="#1F2A44">${t('3. น้ำไขสันหลัง (CSF) &amp; เยื่อหุ้มสมอง', '3. CSF &amp; Meninges')}</text>

        <!-- Layer 4: Cortex (เปลือกสมอง) -->
        <rect x="10" y="142" width="260" height="64" rx="6" fill="#FCEFC8" stroke="#1F2A44" stroke-width="2"/>
        <text x="20" y="160" font-family="Anuphan, sans-serif" font-size="11.5" font-weight="700" fill="#1F2A44">${t('4. เปลือกสมอง (Cerebral Cortex)', '4. Cerebral Cortex')}</text>
        <text x="20" y="176" font-family="IBM Plex Sans Thai, sans-serif" font-size="9.5" fill="#47506A">${t('เซลล์พีระมิดเรียงตัวตั้งฉาก (Dipoles) ~300 µV', 'Vertically aligned pyramidal neurons (Dipoles) ~300 µV')}</text>

        <!-- Mini vertical dipole arrows in cortex -->
        <g stroke="#1FA39A" stroke-width="2" stroke-linecap="round">
          <line x1="215" y1="198" x2="215" y2="152"/>
          <line x1="230" y1="198" x2="230" y2="152"/>
          <line x1="245" y1="198" x2="245" y2="152"/>
        </g>

        <!-- Upward attenuation arrow -->
        <g class="sum-atten-arrow">
          <path d="M254 140 L254 26" stroke="#FF6B4A" stroke-width="3" stroke-dasharray="3 3"/>
          <polygon points="249,30 259,30 254,20" fill="#FF6B4A"/>
        </g>
      </svg>
      `,
    }),
    h('div', { class: 'readout sum-readout-row' },
      h('span', {}, t('ขนาดสัญญาณที่หนังศีรษะ: ', 'Scalp signal amplitude: '), ampReadout),
      statusBadge
    ),
    h('p', { class: 'small muted', style: { margin: 0 } },
      t(
        'เพราะกะโหลกลดทอนสัญญาณลง ~10–20 เท่า เซลล์เดี่ยวๆ จึงวัดไม่ได้ ต้องอาศัยเซลล์พีระมิดนับล้านที่เรียงตัวขนานกันและทำงานพร้อมกัน (Synchrony)',
        'Because the skull attenuates signals ~10–20×, a single neuron cannot be detected. Scalp EEG requires millions of parallel pyramidal neurons firing in synchrony.'
      )
    )
  );

  root.append(
    h('div', { class: 'wa-stack' },
      h('div', { class: 'wa-panel card-bg' },
        h('div', { class: 'wa-controls' },
          h('div', { class: 'field' },
            h('label', { class: 'ctl-label' }, t('จำนวนเซลล์ที่ทำงาน (Active neurons)', 'Active Neurons'), activeOut),
            activeSlider
          ),
          h('div', { class: 'field' },
            h('label', { class: 'ctl-label' }, t('ความพร้อมเพรียง (Synchrony)', 'Synchrony'), syncOut),
            syncSlider
          )
        ),
        presetRow
      ),
      h('div', { class: 'sum-grid' },
        h('div', { class: 'wa-stack' },
           cortexCanvas,
          traceCanvas
        ),
        layersCard
      )
    )
  );

  let fitCortex = null;
  let fitTrace = null;
  fitCortex = fitCanvas(cortexCanvas, (s) => drawCortex(s));
  fitTrace = fitCanvas(traceCanvas, (s) => drawScalpTrace(s));

  function syncUI() {
    activeOut.textContent = t(`${activeCount} / ${TOTAL_NEURONS} กลุ่ม (~${Math.round(activeCount * 1.5)} ล้านเซลล์)`, `${activeCount} / ${TOTAL_NEURONS} groups (~${Math.round(activeCount * 1.5)}M neurons)`);
    syncOut.textContent = `${synchrony}%`;

    const amp = estimateAmplitudeUv();
    ampReadout.textContent = `~${amp.toFixed(1)} µV`;

    if (amp >= 18) {
      statusBadge.textContent = t('คลื่นชัดเจน! (เหนือ Noise)', 'Clear wave! (Above Noise)');
      statusBadge.style.background = 'var(--teal-soft)';
      if (userAdjusted) {
        ctx?.discover?.(
          'summation',
          t(
            `ยอดเยี่ยม! เมื่อเซลล์พีระมิดเรียงตัวขนานกันและทำงานพร้อมเพรียงกัน (<b>Synchrony ${synchrony}%</b>) สัญญาณจะเสริมกันจนทะลุกะโหลกขึ้นมาเหนือ Noise floor ได้ที่ <b>~${amp.toFixed(1)} µV</b>!`,
            `Awesome! When parallel pyramidal neurons fire in synchrony (<b>Synchrony ${synchrony}%</b>), their potentials sum up and penetrate the skull above the noise floor at <b>~${amp.toFixed(1)} µV</b>!`
          )
        );
      }
    } else if (amp >= 8) {
      statusBadge.textContent = t('เริ่มเห็นคลื่นรางๆ', 'Faint wave emerging');
      statusBadge.style.background = 'var(--mustard-soft)';
      if (userAdjusted) {
        ctx?.say?.(
          t(
            `สัญญาณเริ่มโผล่พ้นแถบสัญญาณรบกวนแล้ว (<b>~${amp.toFixed(1)} µV</b>) ลองเพิ่มความพร้อมเพรียง (Synchrony) หรือจำนวนเซลล์อีกนิดเพื่อดูคลื่นอัลฟาที่ชัดเจน!`,
            `The signal is starting to emerge above the noise band (<b>~${amp.toFixed(1)} µV</b>). Try increasing Synchrony or active neurons a bit more to see a clear alpha rhythm!`
          ),
          'think'
        );
      }
    } else {
      statusBadge.textContent = t('จมใน Noise (หักล้างกัน)', 'Buried in Noise (Cancels out)');
      statusBadge.style.background = 'var(--coral-soft)';
      if (userAdjusted) {
        ctx?.say?.(
          t(
            `แม้จะมีเซลล์ทำงานอยู่ แต่พอความพร้อมเพรียงต่ำ (<b>${synchrony}%</b>) ขั้วบวกและลบของแต่ละเซลล์จะหักล้างกันเองจนเหลือแค่ <b>~${amp.toFixed(1)} µV</b> จมอยู่ในสัญญาณรบกวน!`,
            `Even with active neurons, low synchrony (<b>${synchrony}%</b>) causes positive and negative phases to cancel each other out, leaving only <b>~${amp.toFixed(1)} µV</b> buried in the noise floor!`
          ),
          'oops'
        );
      }
    }

    if (prefersReducedMotion()) {
      rebuildStaticBuffer();
      drawCortex();
      drawScalpTrace();
    }
  }

  function rebuildStaticBuffer() {
    for (let i = 0; i < BUF_LEN; i++) {
      const t = i / 60;
      const { scalpUv, cortexUv } = computeInstant(t);
      scalpBuf[i] = scalpUv;
      cortexBuf[i] = cortexUv;
    }
  }

  function drawCortex(s = fitCortex) {
    if (!s) return;
    const { ctx: c, w, h: ch } = s;
    if (w < 20 || ch < 20) return;

    // Warm cortical background
    c.fillStyle = '#FFFEFB';
    c.fillRect(0, 0, w, ch);

    // Header band inside canvas representing Pia / Cortical surface
    c.fillStyle = '#FCEFC8';
    c.fillRect(0, 0, w, 26);
    c.strokeStyle = INK;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(0, 26);
    c.lineTo(w, 26);
    c.stroke();

    c.fillStyle = INK;
    c.font = HEAD;
    c.textAlign = 'left';
    c.fillText(t('เปลือกสมอง: เซลล์ประสาทพีระมิด 60 กลุ่มเรียงตัวตั้งฉาก (Cortical Dipoles)', 'Cerebral Cortex: 60 Vertically Aligned Pyramidal Neuron Groups (Cortical Dipoles)'), 10, 17);

    const padX = 22;
    const topY = 42;
    const availW = w - padX * 2;
    const availH = ch - topY - 14;
    const cellW = availW / COLS;
    const cellH = availH / ROWS;

    const syncFrac = synchrony / 100;
    const spread = Math.pow(1 - syncFrac, 1.15);

    for (let i = 0; i < TOTAL_NEURONS; i++) {
      const n = neurons[i];
      const cx = padX + (n.col + 0.5) * cellW + n.dx;
      const cy = topY + (n.row + 0.5) * cellH + n.dy;
      const isActive = i < activeCount;

      let v = 0;
      if (isActive) {
        const f = 10 + n.detune * spread * 0.5;
        const ph = 2 * Math.PI * f * simTime + n.jitterPhase * spread;
        v = Math.sin(ph); // -1..1
      }

      // Colour interpolation: -1 = teal (#1FA39A), 0 = paper, +1 = coral (#FF6B4A)
      let fillCol = '#E7DFD2';
      let strokeCol = 'rgba(31,42,68,0.35)';
      if (isActive) {
        strokeCol = INK;
        if (v >= 0) {
          const r = Math.round(lerp(255, 255, v));
          const g = Math.round(lerp(247, 107, v));
          const b = Math.round(lerp(238, 74, v));
          fillCol = `rgb(${r},${g},${b})`;
        } else {
          const k = -v;
          const r = Math.round(lerp(255, 31, k));
          const g = Math.round(lerp(247, 163, k));
          const b = Math.round(lerp(238, 154, k));
          fillCol = `rgb(${r},${g},${b})`;
        }
      }

      // Draw vertical apical dendrite
      c.strokeStyle = isActive ? (v > 0.2 ? '#FF6B4A' : v < -0.2 ? '#1FA39A' : INK) : 'rgba(31,42,68,0.22)';
      c.lineWidth = isActive ? 2.1 : 1.2;
      c.beginPath();
      c.moveTo(cx, cy + 5);
      c.lineTo(cx, cy - 13);
      // Apical tuft at top
      c.moveTo(cx - 4, cy - 16);
      c.lineTo(cx, cy - 12);
      c.lineTo(cx + 4, cy - 16);
      c.stroke();

      // Draw pyramidal soma (triangle pointing up)
      c.fillStyle = fillCol;
      c.strokeStyle = strokeCol;
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(cx, cy - 4);
      c.lineTo(cx - 6.5, cy + 8);
      c.lineTo(cx + 6.5, cy + 8);
      c.closePath();
      c.fill();
      c.stroke();
    }
  }

  function drawScalpTrace(s = fitTrace) {
    if (!s) return;
    const { ctx: c, w, h: ch } = s;
    if (w < 20 || ch < 20) return;

    drawGrid(c, w, ch, { step: 20, major: 4 });

    const pad = { l: 48, r: 16, t: 26, b: 22 };
    const pw = w - pad.l - pad.r;
    const ph = ch - pad.t - pad.b;
    const maxRange = 50; // ±50 µV

    const Y = (uv) => pad.t + ph / 2 - (uv / maxRange) * (ph / 2);

    // Title
    c.fillStyle = INK;
    c.font = HEAD;
    c.textAlign = 'left';
    c.fillText(t('สัญญาณที่หนังศีรษะ (Scalp EEG) เทียบกับแถบสัญญาณรบกวน (Noise Floor ±5 µV)', 'Scalp EEG Signal vs. Noise Floor Band (±5 µV)'), pad.l, 17);

    // Shaded Noise Floor Band (±5 µV)
    const yNoiseTop = Y(NOISE_FLOOR_UV);
    const yNoiseBot = Y(-NOISE_FLOOR_UV);
    c.fillStyle = 'rgba(242, 182, 50, 0.22)';
    c.fillRect(pad.l, yNoiseTop, pw, yNoiseBot - yNoiseTop);

    c.strokeStyle = '#F2B632';
    c.lineWidth = 1.5;
    c.setLineDash([5, 4]);
    c.beginPath();
    c.moveTo(pad.l, yNoiseTop);
    c.lineTo(pad.l + pw, yNoiseTop);
    c.moveTo(pad.l, yNoiseBot);
    c.lineTo(pad.l + pw, yNoiseBot);
    c.stroke();
    c.setLineDash([]);

    c.fillStyle = '#B8830E';
    c.font = MONO;
    c.textAlign = 'right';
    c.fillText('Noise floor ±5 µV', pad.l + pw - 6, yNoiseTop - 4);

    // Draw Scalp Sum Trace
    const amp = estimateAmplitudeUv();
    c.save();
    c.beginPath();
    c.rect(pad.l, pad.t, pw, ph);
    c.clip();

    c.strokeStyle = amp >= 12 ? '#1FA39A' : '#FF6B4A';
    c.lineWidth = 2.6;
    c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i < BUF_LEN; i++) {
      const px = pad.l + (i / (BUF_LEN - 1)) * pw;
      const py = Y(scalpBuf[i]);
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke();
    c.restore();

    // Axes
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(pad.l, pad.t);
    c.lineTo(pad.l, pad.t + ph);
    c.lineTo(pad.l + pw, pad.t + ph);
    c.stroke();

    c.fillStyle = INK;
    c.font = MONO;
    c.textAlign = 'right';
    for (const v of [40, 0, -40]) {
      c.fillText(`${v} µV`, pad.l - 6, Y(v) + 4);
    }
  }

  const stopLoop = loop((dt) => {
    if (prefersReducedMotion()) return;
    simTime += dt;
    const { scalpUv, cortexUv } = computeInstant(simTime);
    scalpBuf.copyWithin(0, 1);
    scalpBuf[BUF_LEN - 1] = scalpUv;
    cortexBuf.copyWithin(0, 1);
    cortexBuf[BUF_LEN - 1] = cortexUv;
    drawCortex();
    drawScalpTrace();
  });

  syncUI();
  drawCortex();
  drawScalpTrace();

  ctx?.say?.(
    t(
      'สังเกตดูสิ! ตอนนี้ความพร้อมเพรียง (Synchrony) อยู่ที่ <b>15%</b> เซลล์ต่างคนต่างยิงจนสัญญาณหักล้างกันเอง ลองเลื่อนแถบ <b>ความพร้อมเพรียง</b> ขึ้นไปเกิน 75% ดูนะ!',
      'Look! Synchrony is currently at <b>15%</b> — neurons fire out of phase and cancel each other out. Try dragging the <b>Synchrony</b> slider above 75%!'
    ),
    'idle'
  );

  return () => {
    stopLoop();
    fitCortex.dispose();
    fitTrace.dispose();
  };
}
