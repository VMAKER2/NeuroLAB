// Lesson 1 widget: Action Potential (ศักย์ไฟฟ้าปฏิบัติการ) & Saltatory Conduction
import { h, clamp, prefersReducedMotion, loop } from '../util.js';
import { icon } from '../ui/icons.js';
import { fitCanvas, drawGrid, INK, MONO, HEAD } from '../signal/plot.js';
import { t } from '../i18n.js';

const REST_MV = -70;
const THRESH_MV = -55; // needs >= +15 mV stimulus
const PEAK_MV = 40;
const UNDERSHOOT_MV = -80;

// Node of Ranvier x-coordinates along the SVG axon (viewBox 0 0 680 185)
const NODE_X = [170, 265, 360, 455, 550];
const MYELIN_X = [180, 275, 370, 465]; // width 75 each

export default function mount(root, ctx) {
  root.innerHTML = '';

  let stimMv = 20; // +mV depolarisation at axon hillock
  let hasMyelin = true;
  let animState = null; // { supra, myelin, progress: 0..1, speed, peakReached }
  let lastRun = { supra: true, stimMv: 20, myelin: true, traceProgress: 1 };

  // Discovery tracking
  let triedSub = false;
  let triedSupra = false;
  let triedMyelinOn = false;
  let triedMyelinOff = false;

  // --- Build SVG Neuron ---
  const svgWrap = h('div', { class: 'ap-stage' });
  svgWrap.innerHTML = `
    <svg class="ap-svg" viewBox="0 0 680 185" role="img" aria-label="${t('แผนภาพเซลล์ประสาท: ตัวเซลล์ แอกซอน ปลอกไมอีลิน และปลายประสาท', 'Neuron diagram: soma, axon, myelin sheath, and axon terminals')}">
      <defs>
        <radialGradient id="ap-pulse-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FF6B4A" stop-opacity="0.95"/>
          <stop offset="65%" stop-color="#FF6B4A" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#FF6B4A" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Dendrites (เดนไดรต์) -->
      <g stroke="#1F2A44" stroke-width="3.2" stroke-linecap="round" fill="none">
        <path d="M68 58 L36 30 M36 30 L18 26 M36 30 L32 14"/>
        <path d="M58 78 L20 68 M20 68 L6 56 M20 68 L8 78"/>
        <path d="M58 106 L22 118 M22 118 L8 112 M22 118 L12 132"/>
        <path d="M72 126 L44 154 M44 154 L26 158 M44 154 L46 170"/>
        <path d="M98 48 L92 20 M92 20 L80 10 M92 20 L106 10"/>
      </g>

      <!-- Axon Terminals (ปลายแอกซอน) -->
      <g stroke="#1F2A44" stroke-width="3" stroke-linecap="round" fill="none">
        <path d="M555 92 Q590 72 622 50"/>
        <path d="M555 92 L630 92"/>
        <path d="M555 92 Q590 112 622 134"/>
      </g>
      <g class="ap-terminals" stroke="#1F2A44" stroke-width="2.2" fill="#FCEFC8">
        <circle cx="628" cy="46" r="9"/>
        <circle cx="636" cy="92" r="9"/>
        <circle cx="628" cy="138" r="9"/>
      </g>

      <!-- Axon shaft (แกนแอกซอน) -->
      <rect x="135" y="84" width="422" height="16" rx="6" fill="#F4EDE1" stroke="#1F2A44" stroke-width="2.4"/>

      <!-- Soma & Axon Hillock (ตัวเซลล์ประสาท) -->
      <path d="M96 46 C62 46 50 70 50 92 C50 114 62 138 96 138 C122 138 142 110 166 100 L166 84 C142 74 122 46 96 46 Z"
            fill="#FFE1D8" stroke="#1F2A44" stroke-width="2.8" stroke-linejoin="round"/>
      <circle cx="96" cy="92" r="18" fill="#FFFDF9" stroke="#1F2A44" stroke-width="2.2"/>
      <circle cx="96" cy="92" r="6" fill="#FF6B4A"/>

      <!-- Myelin segments (ปลอกไมอีลิน) -->
      <g class="ap-myelin-group">
        ${MYELIN_X.map((x, idx) => `
          <g class="ap-myelin-seg" data-idx="${idx}">
            <rect x="${x}" y="70" width="75" height="44" rx="11" fill="#D3F0EC" stroke="#1F2A44" stroke-width="2.4"/>
            <line x1="${x + 12}" y1="77" x2="${x + 63}" y2="77" stroke="#1FA39A" stroke-width="2" stroke-linecap="round"/>
            <line x1="${x + 12}" y1="107" x2="${x + 63}" y2="107" stroke="#1FA39A" stroke-width="2" stroke-linecap="round"/>
          </g>
        `).join('')}
      </g>

      <!-- Nodes of Ranvier markers -->
      <g class="ap-nodes-group">
        ${NODE_X.map((x, idx) => `
          <circle class="ap-node-dot" data-node="${idx}" cx="${x}" cy="92" r="6.5" fill="#FFFDF9" stroke="#1F2A44" stroke-width="2"/>
        `).join('')}
      </g>

      <!-- Saltatory jump arcs (shown when myelin is ON and firing) -->
      <g class="ap-jump-arcs" fill="none" stroke="#FF6B4A" stroke-width="2.4" stroke-dasharray="4 4" opacity="0">
        <path d="M170 78 Q217 34 265 78"/>
        <path d="M265 78 Q312 34 360 78"/>
        <path d="M360 78 Q407 34 455 78"/>
        <path d="M455 78 Q502 34 550 78"/>
      </g>

      <!-- Travelling Action Potential Pulse -->
      <g class="ap-pulse" opacity="0" transform="translate(170, 92)">
        <circle r="24" fill="url(#ap-pulse-grad)"/>
        <circle r="10" fill="#FF6B4A" stroke="#1F2A44" stroke-width="2.2"/>
        <text y="-15" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#1F2A44">+40 mV</text>
      </g>

      <!-- Stimulus electrode on Soma / Hillock -->
      <g class="ap-stim-probe" transform="translate(148, 36)">
        <path d="M0 0 L12 34" stroke="#1F2A44" stroke-width="2.5" stroke-linecap="round"/>
        <polygon points="-6,0 6,0 0,-12" fill="#F2B632" stroke="#1F2A44" stroke-width="2"/>
        <text x="0" y="-16" text-anchor="middle" font-family="Anuphan, sans-serif" font-size="11" font-weight="700" fill="#1F2A44">${t('กระตุ้น', 'Stimulus')}</text>
      </g>

      <!-- Recording Probe at Node 3 (x=360) -->
      <g class="ap-rec-probe" transform="translate(360, 134)">
        <line x1="0" y1="-28" x2="0" y2="12" stroke="#1F2A44" stroke-width="2.2" stroke-dasharray="3 3"/>
        <rect x="-46" y="12" width="92" height="22" rx="6" fill="#FCEFC8" stroke="#1F2A44" stroke-width="1.8"/>
        <text x="0" y="27" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#1F2A44">${t('จุดวัดศักย์ไฟฟ้า', 'Recording Probe')}</text>
      </g>

      <!-- Structural Labels -->
      <text x="96" y="160" text-anchor="middle" font-family="Anuphan, sans-serif" font-size="11.5" font-weight="600" fill="#47506A">${t('ตัวเซลล์ (Soma)', 'Cell Body (Soma)')}</text>
      <text x="318" y="24" text-anchor="middle" font-family="Anuphan, sans-serif" font-size="11.5" font-weight="600" fill="#1FA39A" class="ap-myelin-label">${t('ปลอกไมอีลิน (Myelin sheath) &amp; ช่องว่าง Node of Ranvier', 'Myelin sheath &amp; Node of Ranvier')}</text>
      <text x="625" y="168" text-anchor="middle" font-family="Anuphan, sans-serif" font-size="11.5" font-weight="600" fill="#47506A">${t('ปลายประสาท', 'Axon Terminals')}</text>
    </svg>
  `;

  const myelinGroup = svgWrap.querySelector('.ap-myelin-group');
  const myelinLabel = svgWrap.querySelector('.ap-myelin-label');
  const jumpArcs = svgWrap.querySelector('.ap-jump-arcs');
  const pulseEl = svgWrap.querySelector('.ap-pulse');
  const nodeDots = [...svgWrap.querySelectorAll('.ap-node-dot')];
  const terminalDots = [...svgWrap.querySelectorAll('.ap-terminals circle')];

  // --- Readouts & Legend inside Stage ---
  const travelOut = h('b', {}, '1.8 ms');
  const modeOut = h('span', {}, t('กระโดดข้ามข้อ (Saltatory — เร็ว ~80 m/s)', 'Saltatory (Jumping — Fast ~80 m/s)'));
  const statusPill = h('span', { class: 'ap-status-pill fire' }, t('พร้อมกระตุ้น', 'Ready to stimulate'));

  svgWrap.append(
    h('div', { class: 'ap-legend' },
      h('div', { class: 'wa-metrics' },
        h('span', { class: 'wa-metric teal' }, t('เวลาเดินทางถึงปลายแอกซอน: ', 'Travel time to terminals: '), travelOut),
        h('span', { class: 'wa-metric' }, t('รูปแบบการนำกระแส: ', 'Conduction mode: '), modeOut),
      ),
      statusPill
    )
  );

  // --- Controls ---
  const stimOut = h('output', {}, t(`+${stimMv} mV (ขึ้นถึง ${REST_MV + stimMv} mV)`, `+${stimMv} mV (reaches ${REST_MV + stimMv} mV)`));
  const stimInput = h('input', {
    type: 'range',
    min: 0,
    max: 35,
    step: 1,
    value: stimMv,
    'aria-label': t('ความแรงสิ่งกระตุ้น (mV)', 'Stimulus strength (mV)'),
    oninput: (e) => {
      stimMv = Number(e.target.value);
      updateStimLabel();
    },
  });

  function updateStimLabel() {
    const targetV = REST_MV + stimMv;
    const isSupra = targetV >= THRESH_MV;
    stimOut.textContent = `+${stimMv} mV → ${targetV} mV ${isSupra ? t('(เกินจุดเริ่มยิง!)', '(Above threshold!)') : t('(ต่ำกว่า -55 mV)', '(Below -55 mV)')}`;
    stimOut.style.color = isSupra ? 'var(--coral)' : 'var(--ink-2)';
  }
  updateStimLabel();

  const setStimPreset = (val) => {
    stimMv = val;
    stimInput.value = String(val);
    updateStimLabel();
    triggerStimulus();
  };

  const presetRow = h('div', { class: 'ap-presets' },
    h('button', { type: 'button', class: 'chip', onclick: () => setStimPreset(10) }, t('ลองกระตุ้นเบา (+10 mV → -60 mV)', 'Weak stimulus (+10 mV → -60 mV)')),
    h('button', { type: 'button', class: 'chip', onclick: () => setStimPreset(20) }, t('ลองกระตุ้นแรง (+20 mV → -50 mV)', 'Strong stimulus (+20 mV → -50 mV)')),
  );

  const myelinCheck = h('input', {
    type: 'checkbox',
    checked: true,
    onchange: (e) => {
      hasMyelin = e.target.checked;
      syncMyelinUI();
      triggerStimulus();
    },
  });

  function syncMyelinUI() {
    myelinGroup.style.opacity = hasMyelin ? '1' : '0.12';
    myelinLabel.textContent = hasMyelin
      ? t('ปลอกไมอีลิน (Myelin sheath) & ช่องว่าง Node of Ranvier', 'Myelin sheath & Node of Ranvier')
      : t('แอกซอนเปลือย (ไม่มีปลอกไมอีลิน — นำกระแสต่อเนื่องช้ากว่า)', 'Bare axon (Unmyelinated — slower continuous conduction)');
    travelOut.textContent = hasMyelin ? '1.8 ms' : '18.0 ms';
    modeOut.textContent = hasMyelin
      ? t('กระโดดข้ามข้อ (Saltatory — เร็ว ~80 m/s)', 'Saltatory (Jumping — Fast ~80 m/s)')
      : t('ไหลต่อเนื่อง (Continuous — ช้า ~8 m/s)', 'Continuous (Smooth — Slow ~8 m/s)');
  }

  const fireBtn = h('button', {
    type: 'button',
    class: 'btn primary',
    onclick: () => triggerStimulus(),
  }, h('span', { html: icon('zap') }), t('กระตุ้น (Stimulate)', 'Stimulate'));

  const controlsPanel = h('div', { class: 'wa-panel card-bg' },
    h('div', { class: 'wa-controls' },
      h('div', { class: 'field' },
        h('label', { class: 'ctl-label' }, t('ความแรงสิ่งกระตุ้น (Stimulus)', 'Stimulus Strength'), stimOut),
        stimInput,
        presetRow
      ),
      h('div', { class: 'widget-row', style: { justifyContent: 'space-between' } },
        h('label', { class: 'switch' },
          myelinCheck,
          h('span', { class: 'track' }),
          h('span', {}, t('มีปลอกไมอีลิน (Myelin)', 'Myelin Sheath'))
        ),
        fireBtn
      )
    )
  );

  // --- Membrane Potential Trace Canvas ---
  const traceCanvas = h('canvas', {
    class: 'ap-canvas',
    role: 'img',
    'aria-label': t('กราฟศักย์ไฟฟ้าเยื่อหุ้มเซลล์ (Membrane potential mV เทียบกับเวลา ms)', 'Membrane potential graph (mV vs time in ms)'),
  });
  const tracePanel = h('div', { class: 'ap-trace-wrap' }, traceCanvas);

  root.append(
    h('div', { class: 'wa-stack' },
      svgWrap,
      controlsPanel,
      tracePanel
    )
  );

  // Compute realistic membrane potential V(t) for t in 0..6 ms
  function sampleMembraneV(tMs, run) {
    if (tMs < 0.6) return REST_MV;
    const u = tMs - 0.6; // time since stimulus onset
    if (!run.supra) {
      // Sub-threshold local passive potential: rises then decays exponentially
      const rise = (1 - Math.exp(-u / 0.25)) * Math.exp(-u / 1.1) * 1.85;
      return REST_MV + run.stimMv * rise;
    }
    // Supra-threshold Action Potential (All-or-None canonical waveform)
    if (u < 0.55) {
      // Initial graded depolarisation up to -55 mV threshold
      const k = u / 0.55;
      return REST_MV + (THRESH_MV - REST_MV) * (1 - Math.pow(1 - k, 1.6));
    }
    if (u < 1.15) {
      // Rapid Na+ influx upstroke (-55 mV -> +40 mV)
      const k = (u - 0.55) / 0.6;
      const s = k * k * (3 - 2 * k);
      return THRESH_MV + (PEAK_MV - THRESH_MV) * s;
    }
    if (u < 2.25) {
      // Rapid K+ efflux repolarisation (+40 mV -> -80 mV undershoot)
      const k = (u - 1.15) / 1.1;
      const s = k * k * (3 - 2 * k);
      return PEAK_MV + (UNDERSHOOT_MV - PEAK_MV) * s;
    }
    if (u < 4.4) {
      // Hyperpolarisation recovery (-80 mV -> -70 mV via Na+/K+ pump)
      const k = (u - 2.25) / 2.15;
      const s = 1 - Math.exp(-3.2 * k);
      return UNDERSHOOT_MV + (REST_MV - UNDERSHOOT_MV) * s;
    }
    return REST_MV;
  }

  let fit = null;
  fit = fitCanvas(traceCanvas, (s) => drawPotentialPlot(s));

  function drawPotentialPlot(s = fit) {
    if (!s) return;
    const { ctx: c, w, h: ch } = s;
    if (w < 20 || ch < 20) return;
    drawGrid(c, w, ch, { step: 20, major: 4 });

    const pad = { l: 54, r: 22, t: 18, b: 30 };
    const pw = w - pad.l - pad.r;
    const ph = ch - pad.t - pad.b;

    const minV = -98;
    const maxV = 52;
    const maxT = 6.0; // ms

    const X = (t) => pad.l + (t / maxT) * pw;
    const Y = (v) => pad.t + ph - ((v - minV) / (maxV - minV)) * ph;

    // 0 mV reference line
    c.strokeStyle = 'rgba(31,42,68,0.18)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(pad.l, Y(0));
    c.lineTo(pad.l + pw, Y(0));
    c.stroke();

    // Resting line (-70 mV)
    c.strokeStyle = 'rgba(31,163,154,0.45)';
    c.setLineDash([2, 4]);
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(pad.l, Y(REST_MV));
    c.lineTo(pad.l + pw, Y(REST_MV));
    c.stroke();

    // Dashed Threshold line (-55 mV)
    c.strokeStyle = '#FF6B4A';
    c.setLineDash([6, 4]);
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(pad.l, Y(THRESH_MV));
    c.lineTo(pad.l + pw, Y(THRESH_MV));
    c.stroke();
    c.setLineDash([]);

    // Threshold label
    c.fillStyle = '#FF6B4A';
    c.font = HEAD;
    c.textAlign = 'right';
    c.fillText(t('จุดเริ่มยิง Threshold (-55 mV)', 'Threshold (-55 mV)'), pad.l + pw - 6, Y(THRESH_MV) - 6);

    // Draw ghost supra-threshold curve when currently showing sub-threshold for comparison
    if (!lastRun.supra) {
      c.save();
      c.strokeStyle = 'rgba(31,42,68,0.18)';
      c.setLineDash([4, 4]);
      c.lineWidth = 1.6;
      c.beginPath();
      const N = 160;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * maxT;
        const v = sampleMembraneV(t, { supra: true, stimMv: 20 });
        i ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v));
      }
      c.stroke();
      c.restore();
    }

    // Active potential curve up to traceProgress
    const prog = clamp(lastRun.traceProgress, 0.05, 1);
    const N = 220;
    const maxIdx = Math.round(N * prog);

    c.save();
    c.strokeStyle = lastRun.supra ? '#FF6B4A' : '#F2B632';
    c.lineWidth = 3;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i <= maxIdx; i++) {
      const t = (i / N) * maxT;
      const v = sampleMembraneV(t, lastRun);
      i ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v));
    }
    c.stroke();
    c.restore();

    // Key phase annotations
    if (lastRun.supra && prog > 0.7) {
      c.font = HEAD;
      c.fillStyle = INK;
      c.textAlign = 'left';
      c.fillText(t('Peak +40 mV (Na⁺ ไหลเข้า)', 'Peak +40 mV (Na⁺ influx)'), X(1.75) + 8, Y(PEAK_MV) + 5);
      c.fillStyle = '#1FA39A';
      c.fillText(t('Undershoot -80 mV (K⁺ ไหลออก)', 'Undershoot -80 mV (K⁺ efflux)'), X(2.75), Y(UNDERSHOOT_MV) + 14);
    } else if (!lastRun.supra && prog > 0.5) {
      c.font = HEAD;
      c.fillStyle = '#1F2A44';
      c.textAlign = 'left';
      c.fillText(t('ไม่ถึง -55 mV → สัญญาณฝ่อหายไป (No Spike)', 'Below -55 mV → Fades away (No Spike)'), X(1.4), Y(REST_MV + lastRun.stimMv) - 10);
    }

    // Axes
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(pad.l, pad.t);
    c.lineTo(pad.l, pad.t + ph);
    c.lineTo(pad.l + pw, pad.t + ph);
    c.stroke();

    // Y-axis ticks (mV)
    c.font = MONO;
    c.textAlign = 'right';
    for (const [v, color] of [
      [40, INK],
      [0, '#7A8197'],
      [-55, '#FF6B4A'],
      [-70, '#1FA39A'],
      [-80, '#7A8197'],
    ]) {
      const py = Y(v);
      c.fillStyle = color;
      c.fillText(`${v} mV`, pad.l - 6, py + 4);
      c.strokeStyle = INK;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(pad.l - 4, py);
      c.lineTo(pad.l, py);
      c.stroke();
    }

    // X-axis ticks (ms)
    c.fillStyle = INK;
    c.textAlign = 'center';
    for (let t = 0; t <= 6; t += 1) {
      c.fillText(`${t} ms`, X(t), ch - 8);
    }
  }

  function updateNeuronVisual(progress, run) {
    // Reset highlights
    nodeDots.forEach((d) => {
      d.setAttribute('fill', '#FFFDF9');
      d.setAttribute('r', '6.5');
    });
    terminalDots.forEach((d) => d.setAttribute('fill', '#FCEFC8'));

    if (!run || progress <= 0 || progress >= 1) {
      pulseEl.setAttribute('opacity', '0');
      jumpArcs.setAttribute('opacity', '0');
      return;
    }

    if (!run.supra) {
      // Sub-threshold: small local glow near hillock that fades out before Node 1
      const x = 155 + progress * 48;
      const fade = Math.sin(progress * Math.PI) * (1 - progress * 0.7);
      pulseEl.setAttribute('transform', `translate(${x.toFixed(1)}, 92) scale(${0.55 + 0.2 * fade})`);
      pulseEl.setAttribute('opacity', String(clamp(fade, 0, 0.85)));
      jumpArcs.setAttribute('opacity', '0');
      return;
    }

    // Supra-threshold spike propagation
    jumpArcs.setAttribute('opacity', run.myelin ? '0.65' : '0');
    pulseEl.setAttribute('opacity', '1');

    let x;
    if (run.myelin) {
      // Saltatory: steps quickly from node to node
      const segs = NODE_X.length - 1;
      const f = progress * segs;
      const idx = Math.min(segs - 1, Math.floor(f));
      const frac = f - idx;
      // Jump arc height
      const yHop = -Math.sin(frac * Math.PI) * 18;
      x = NODE_X[idx] + (NODE_X[idx + 1] - NODE_X[idx]) * frac;
      pulseEl.setAttribute('transform', `translate(${x.toFixed(1)}, ${(92 + yHop).toFixed(1)})`);

      const nearIdx = Math.round(f);
      if (nodeDots[nearIdx]) {
        nodeDots[nearIdx].setAttribute('fill', '#FF6B4A');
        nodeDots[nearIdx].setAttribute('r', '8.5');
      }
    } else {
      // Continuous: smooth slow travel along bare axon
      x = NODE_X[0] + (NODE_X[NODE_X.length - 1] - NODE_X[0]) * progress;
      pulseEl.setAttribute('transform', `translate(${x.toFixed(1)}, 92)`);
    }

    if (progress > 0.86) {
      terminalDots.forEach((d) => d.setAttribute('fill', '#FF6B4A'));
    }
  }

  function triggerStimulus() {
    const targetV = REST_MV + stimMv;
    const supra = targetV >= THRESH_MV;
    const reduced = prefersReducedMotion();

    lastRun = {
      supra,
      stimMv,
      myelin: hasMyelin,
      traceProgress: reduced ? 1 : 0.05,
    };

    if (supra) {
      triedSupra = true;
      if (hasMyelin) triedMyelinOn = true;
      else triedMyelinOff = true;

      statusPill.className = 'ap-status-pill fire';
      statusPill.textContent = t(`ยิงสำเร็จ! (All-or-None Spike +40 mV)`, `Fired! (All-or-None Spike +40 mV)`);

      ctx?.say?.(
        hasMyelin
          ? t(
              `ถึงจุดเริ่มยิง <b>-55 mV</b> แล้ว! ประตูโซเดียม (Na⁺) เปิดพรวดเกิดศักย์ไฟฟ้าพุ่งถึง <b>+40 mV</b> และกระโดดข้ามปลอกไมอีลิน (Saltatory conduction) ไปถึงปลายประสาทใน <b>1.8 ms</b>!`,
              `Threshold <b>-55 mV</b> reached! Sodium (Na⁺) channels snap open, spiking voltage to <b>+40 mV</b> and jumping across myelin sheaths (Saltatory conduction) to the terminals in <b>1.8 ms</b>!`
            )
          : t(
              `ไม่มีปลอกไมอีลิน สัญญาณต้องค่อยๆ ไหลต่อเนื่องไปตลอดความยาวแอกซอน ใช้เวลานานถึง <b>18.0 ms</b> (ช้ากว่าเดิม 10 เท่า!)`,
              `Without myelin, the impulse must propagate continuously along the entire bare axon, taking <b>18.0 ms</b> (10× slower!)`
            ),
        'happy'
      );
    } else {
      triedSub = true;
      statusPill.className = 'ap-status-pill sub';
      statusPill.textContent = t(`ต่ำกว่า -55 mV → ไม่ยิง (Sub-threshold)`, `Below -55 mV → No spike (Sub-threshold)`);

      ctx?.say?.(
        t(
          `กระตุ้นแค่ <b>+${stimMv} mV</b> ศักย์ไฟฟ้าขึ้นไปที่ <b>${targetV} mV</b> ยังไม่ถึงเส้น <b>-55 mV (Threshold)</b> สัญญาณจึงฝ่อหายไปตรงโคนแอกซอน ตามกฎ <b>All-or-None</b>!`,
          `With only a <b>+${stimMv} mV</b> stimulus, potential reaches <b>${targetV} mV</b> — below the <b>-55 mV Threshold</b>. The signal decays at the axon hillock under the <b>All-or-None</b> law!`
        ),
        'think'
      );
    }

    // Check discoveries
    if (triedSub && triedSupra) {
      ctx?.discover?.(
        'all-or-none',
        t(
          'ค้นพบกฎ <b>All-or-None</b>! เซลล์ประสาทไม่มีการยิงครึ่งๆ กลางๆ — ถ้าไม่ถึง -55 mV ก็ไม่ยิงเลย แต่ถ้าถึงเมื่อไหร่จะพุ่งไปที่ +40 mV เต็มแม็กซ์เสมอ!',
          'Discovered the <b>All-or-None Law</b>! A neuron never fires halfway — below -55 mV it fails to fire at all, but once threshold is crossed it always fires a full +40 mV spike!'
        )
      );
    }
    if (triedMyelinOn && triedMyelinOff) {
      ctx?.discover?.(
        'saltatory',
        t(
          'ค้นพบ <b>การนำกระแสแบบกระโดด (Saltatory Conduction)</b>! ปลอกไมอีลินช่วยเป็นฉนวนให้กระแสไฟฟ้ากระโดดข้ามข้อ Node of Ranvier เร็วขึ้นนับสิบเท่า!',
          'Discovered <b>Saltatory Conduction</b>! Myelin sheaths insulate the axon so the action potential jumps from one Node of Ranvier to the next, speeding up conduction ~10×!'
        )
      );
    }

    if (reduced) {
      animState = null;
      updateNeuronVisual(0, lastRun);
      drawPotentialPlot();
    } else {
      animState = {
        supra,
        myelin: hasMyelin,
        progress: 0,
        // Saltatory finishes in ~0.65s visual time, unmyelinated takes ~2.2s visual time
        speed: !supra ? 1.5 : hasMyelin ? 1.45 : 0.42,
      };
    }
  }

  const stopLoop = loop((dt) => {
    if (!animState) return;
    animState.progress += dt * animState.speed;
    lastRun.traceProgress = clamp(animState.progress * 1.15, 0.05, 1);
    updateNeuronVisual(animState.progress, lastRun);
    drawPotentialPlot();
    if (animState.progress >= 1) {
      lastRun.traceProgress = 1;
      updateNeuronVisual(1, lastRun);
      drawPotentialPlot();
      animState = null;
    }
  });

  // Initial render & friendly hint
  drawPotentialPlot();
  ctx?.say?.(
    t(
      'ลองปรับความแรงสิ่งกระตุ้นให้ <b>ต่ำกว่า</b> และ <b>สูงกว่า -55 mV (Threshold)</b> แล้วกดปุ่ม <b>กระตุ้น</b> หรือสลับสวิตช์ปลอกไมอีลินเพื่อเทียบความเร็วดูสิ!',
      'Try setting the stimulus strength <b>below</b> and <b>above -55 mV (Threshold)</b> and press <b>Stimulate</b>, or toggle the myelin sheath to compare conduction speeds!'
    ),
    'idle'
  );

  return () => {
    stopLoop();
    fit.dispose();
  };
}
