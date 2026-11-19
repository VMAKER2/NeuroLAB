// Lesson 5 widget: Brain Waves (Delta, Theta, Alpha, Beta, Gamma) & Mixer
import { h, clamp, lerp, prefersReducedMotion, loop } from '../util.js';
import { icon } from '../ui/icons.js';
import { BANDS, EEGSynth, welch, bandPower } from '../signal/dsp.js';
import { Scope } from '../signal/plot.js';
import { t } from '../i18n.js';

const BAND_EN = {
  delta: 'Delta',
  theta: 'Theta',
  alpha: 'Alpha',
  beta: 'Beta',
  gamma: 'Gamma',
};

const STATES = [
  {
    key: 'sleep',
    dom: 'delta',
    title: 'หลับลึก',
    titleEn: 'Deep Sleep',
    en: 'Deep Sleep (Delta)',
    sub: 'คลื่นช้าขนาดใหญ่ 0.5–4 Hz ช่วงหลับลึกไร้ความฝัน',
    subEn: 'Large slow 0.5–4 Hz waves during dreamless deep sleep',
    amps: { delta: 36, theta: 6, alpha: 3, beta: 2, gamma: 1 },
    note: 'สมองส่วนใหญ่อยู่ในจังหวะพักฟื้น คลื่นเดลตา (0.5–4 Hz) จึงมีแอมพลิจูดสูงและช้าที่สุด',
    noteEn: 'Most of the cortex enters a restorative slow oscillation, making Delta (0.5–4 Hz) the slowest and highest-amplitude rhythm.',
  },
  {
    key: 'drowsy',
    dom: 'theta',
    title: 'ง่วง / เคลิ้ม',
    titleEn: 'Drowsy / Meditative',
    en: 'Drowsy / Meditative (Theta)',
    sub: 'คลื่น 4–8 Hz ช่วงเคลิ้มใกล้หลับ หรือทำสมาธิลึก (เด่นที่ Fz)',
    subEn: '4–8 Hz waves when drifting to sleep or in deep meditation (prominent at Fz)',
    amps: { delta: 7, theta: 28, alpha: 7, beta: 3, gamma: 1 },
    note: 'คลื่นทีตา (4–8 Hz) เด่นขึ้นเมื่อเริ่มเคลิ้มง่วง หรือใช้ความจำใช้งาน (Working memory) บริเวณแนวกลางหน้าผาก (Fz)',
    noteEn: 'Theta (4–8 Hz) rises during drowsiness or heavy working-memory load along the frontal midline (Fz).',
  },
  {
    key: 'relaxed',
    dom: 'alpha',
    title: 'หลับตาผ่อนคลาย',
    titleEn: 'Eyes-Closed Relaxed',
    en: 'Eyes-Closed Relaxed (Alpha @ O1/O2)',
    sub: 'คลื่น 8–13 Hz เด่นชัดมากที่ท้ายทอย (O1/O2) เมื่อหลับตาพัก',
    subEn: '8–13 Hz rhythm strongly prominent over the occipital cortex (O1/O2) with eyes closed',
    amps: { delta: 4, theta: 5, alpha: 34, beta: 4, gamma: 1 },
    note: 'เมื่อหลับตาพักผ่อนสมองส่วนการมองเห็น (Visual cortex ที่ O1/O2) จะเดินเครื่องว่างพร้อมกัน เกิดคลื่นอัลฟา (8–13 Hz) สวยงาม!',
    noteEn: 'When you close your eyes and relax, the visual cortex (O1/O2) idles synchronously, producing a strong, clean Alpha rhythm (8–13 Hz)!',
  },
  {
    key: 'thinking',
    dom: 'beta',
    title: 'ตั้งใจคิด / แก้โจทย์',
    titleEn: 'Active Thinking',
    en: 'Active Thinking (Beta)',
    sub: 'คลื่นเร็ว 13–30 Hz เมื่อลืมตา คิดเลข หรือวางแผน (อัลฟาหายไป!)',
    subEn: 'Fast 13–30 Hz waves when eyes open, doing math, or planning (Alpha disappears!)',
    amps: { delta: 3, theta: 4, alpha: 4, beta: 22, gamma: 4 },
    note: 'ทันทีที่ลืมตาหรือเริ่มคิดเลข คลื่นอัลฟาจะยุบตัวลง (Alpha blocking) และแทนที่ด้วยคลื่นเบตา (13–30 Hz) ที่ถี่ขึ้นแต่แอมพลิจูดเล็กลง',
    noteEn: 'As soon as you open your eyes or do mental arithmetic, Alpha collapses (Alpha blocking) and is replaced by faster, lower-amplitude Beta waves (13–30 Hz).',
  },
  {
    key: 'gamma',
    dom: 'gamma',
    title: 'จดจ่อสูงมาก',
    titleEn: 'Peak Focus',
    en: 'Peak Focus (Gamma)',
    sub: 'คลื่นถี่จัด 30–45 Hz ขนาดเล็กมาก ช่วงเชื่อมโยงข้อมูลหลายส่วน',
    subEn: 'Very fast, low-amplitude 30–45 Hz waves during multi-sensory cognitive binding',
    amps: { delta: 3, theta: 3, alpha: 3, beta: 12, gamma: 13 },
    note: 'คลื่นแกมมา (30–45 Hz) มีความถี่สูงแต่ขนาดเล็กมาก สัมพันธ์กับการเชื่อมโยงข้อมูลระดับสูง (Cognitive binding)',
    noteEn: 'Gamma waves (30–45 Hz) have high frequency and small amplitude, associated with high-level cognitive binding across brain regions.',
  },
];

const FS = 250;

export default function mount(root, ctx) {
  root.innerHTML = '';

  const bandName = (k, b) => t(b.th, b.en || BAND_EN[k]);

  let currentStateKey = 'relaxed'; // Start on eyes-closed alpha so switching to thinking triggers alpha-blocking!
  let prevStateKey = 'relaxed';
  let isMixerMode = false;

  const targetAmps = { ...STATES[2].amps };
  const currentAmps = { ...STATES[2].amps };

  const synth = new EEGSynth({
    fs: FS,
    amps: { ...currentAmps },
    noise: 2.2,
    line: 0,
    seed: 505,
  });

  // --- Mode Header & Segmented Switcher ---
  const modeStateBtn = h('button', {
    type: 'button',
    'aria-pressed': 'true',
    onclick: () => setMode(false),
  }, t('สถานะสมอง (Presets)', 'Brain States (Presets)'));

  const modeMixerBtn = h('button', {
    type: 'button',
    'aria-pressed': 'false',
    onclick: () => setMode(true),
  }, t('มิกเซอร์ (ผสมคลื่นเอง)', 'Custom Wave Mixer'));

  const modeSeg = h('div', { class: 'seg' }, modeStateBtn, modeMixerBtn);

  // --- 5 State Cards ---
  const stateCardEls = {};
  const statesGrid = h('div', { class: 'bw-states' },
    ...STATES.map((st) => {
      const b = BANDS[st.dom];
      const card = h('button', {
        type: 'button',
        class: 'bw-state-card',
        'aria-pressed': String(st.key === currentStateKey),
        onclick: () => selectState(st.key),
      },
        h('div', { class: 'bw-state-top' },
          h('span', { class: 'bw-state-title' }, t(st.title, st.titleEn)),
          h('span', { class: 'bw-band-tag', style: { background: `${b.color}33` } }, `${bandName(st.dom, b)} ${b.lo}–${b.hi}Hz`)
        ),
        h('div', { class: 'bw-state-sub' }, t(st.sub, st.subEn))
      );
      stateCardEls[st.key] = card;
      return card;
    })
  );

  // --- Live Scope & Live Band-Power Bars (Welch PSD of last ~2 s) ---
  const scopeCanvas = h('canvas', {
    class: 'scope',
    role: 'img',
    'aria-label': t('กราฟสัญญาณคลื่นสมองสด (Live EEG Scope)', 'Live EEG waveform scope'),
  });

  const barEls = {};
  const barsContainer = h('div', { class: 'bw-bars' },
    ...Object.entries(BANDS).map(([k, b]) => {
      const fill = h('div', { class: 'bw-bar-fill', style: { background: b.color } });
      const val = h('div', { class: 'bw-bar-val' }, '0.0');
      barEls[k] = { fill, val };
      return h('div', { class: 'bw-bar-row' },
        h('div', { class: 'bw-bar-label' },
          h('span', { class: 'bw-bar-dot', style: { background: b.color } }),
          `${bandName(k, b)} (${b.lo}–${b.hi})`
        ),
        h('div', { class: 'bw-bar-track' }, fill),
        val
      );
    })
  );

  const powerPanel = h('div', { class: 'wa-panel card-bg', style: { display: 'grid', alignContent: 'space-between', gap: '10px' } },
    h('div', { class: 'wa-head', style: { marginBottom: '2px' } },
      h('h4', { class: 'wa-title' }, h('span', { html: icon('wave') }), t('กำลังแต่ละย่านความถี่ (Welch PSD 2 วินาทีล่าสุด)', 'Band Power (Welch PSD of last 2 s)'))
    ),
    barsContainer,
    h('div', { class: 'small muted' }, t('คำนวณสดจากสัญญาณ 2 วินาทีสุดท้ายด้วยวิธีของ Welch (µV²/Hz)', 'Computed live from the last 2 seconds using Welch’s method (µV²/Hz)'))
  );

  // --- Mixer Panel (one slider per band) ---
  const mixerSliders = {};
  const mixerOutputs = {};
  const mixerGrid = h('div', { class: 'bw-mixer-grid' },
    ...Object.entries(BANDS).map(([k, b]) => {
      const out = h('output', { style: { color: b.color } }, `${targetAmps[k]} µV`);
      const input = h('input', {
        type: 'range',
        min: 0,
        max: 40,
        step: 1,
        value: targetAmps[k],
        'aria-label': t(`ปรับความแรงคลื่น${b.th} (${b.lo}-${b.hi} Hz)`, `Adjust ${BAND_EN[k]} amplitude (${b.lo}-${b.hi} Hz)`),
        oninput: (e) => {
          const v = Number(e.target.value);
          targetAmps[k] = v;
          out.textContent = `${v} µV`;
          if (!isMixerMode) setMode(true, false);
          if (prefersReducedMotion()) {
            currentAmps[k] = v;
            synth.setAmps(currentAmps);
            refillTwoSeconds();
          }
        },
      });
      mixerSliders[k] = input;
      mixerOutputs[k] = out;
      return h('div', { class: 'field' },
        h('label', { class: 'ctl-label', style: { whiteSpace: 'nowrap' } }, `${bandName(k, b)} (${b.lo}–${b.hi})`, out),
        input
      );
    })
  );

  const mixerPanel = h('div', { class: 'wa-panel card-bg' },
    h('div', { class: 'wa-head' },
      h('h4', { class: 'wa-title' }, h('span', { html: icon('palette') }), t('มิกเซอร์คลื่นสมอง (ปรับแอมพลิจูดแต่ละย่านความถี่ด้วยตัวเอง)', 'Brain Wave Mixer (Manually adjust each frequency band amplitude)')),
      h('span', { class: 'chip', id: 'bw-mode-chip' }, t('กำลังใช้ค่าจากสถานะสมอง', 'Using Brain State Preset'))
    ),
    mixerGrid
  );
  const modeChip = mixerPanel.querySelector('#bw-mode-chip');

  root.append(
    h('div', { class: 'wa-stack' },
      h('div', { class: 'wa-head', style: { marginBottom: 0 } },
        modeSeg,
        h('span', { class: 'small muted' }, t('คลิกเลือกสถานะสมอง หรือเลื่อนแถบมิกเซอร์ด้านล่างเพื่อผสมคลื่นเอง', 'Click a brain state preset or drag the mixer sliders below to blend your own rhythms'))
      ),
      statesGrid,
      h('div', { class: 'bw-main-grid' },
        scopeCanvas,
        powerPanel
      ),
      mixerPanel
    )
  );

  // --- Setup Live Scope ---
  const scope = new Scope(scopeCanvas, {
    channels: 1,
    fs: FS,
    seconds: 4,
    labels: ['O1 / Cz'],
    colors: ['#1F2A44'],
    range: 65,
    labelWidth: 56,
  });

  function refillTwoSeconds() {
    for (let i = 0; i < FS * 2.2; i++) {
      scope.push([synth.next()]);
    }
    scope.draw();
    updateBandPowerBars();
  }

  // Pre-fill 4 seconds
  for (let i = 0; i < FS * 4; i++) {
    scope.push([synth.next()]);
  }

  function updateBandPowerBars() {
    const full = scope.data[0];
    // Last ~2 seconds = 512 samples
    const last2s = full.subarray(Math.max(0, full.length - 512));
    const psd = welch(last2s, FS, 256);

    const powers = {};
    let maxP = 12; // baseline scale ceiling so small gamma doesn't look full-scale
    for (const [k, b] of Object.entries(BANDS)) {
      const p = bandPower(psd, b.lo, b.hi);
      powers[k] = p;
      if (p > maxP) maxP = p;
    }

    for (const [k] of Object.entries(BANDS)) {
      const p = powers[k];
      // Use sqrt scaling so moderate rhythms are clearly visible alongside dominant peaks
      const pct = clamp(Math.sqrt(p / maxP) * 100, 3, 100);
      barEls[k].fill.style.width = `${pct.toFixed(1)}%`;
      barEls[k].val.textContent = p.toFixed(1);
    }
  }

  function setMode(mixer, speak = true) {
    isMixerMode = mixer;
    modeStateBtn.setAttribute('aria-pressed', String(!mixer));
    modeMixerBtn.setAttribute('aria-pressed', String(mixer));
    modeChip.textContent = mixer ? t('โหมดมิกเซอร์: กำหนดเอง', 'Mixer Mode: Custom') : t('กำลังใช้ค่าจากสถานะสมอง', 'Using Brain State Preset');
    modeChip.style.background = mixer ? 'var(--mustard-soft)' : 'var(--card)';

    if (mixer) {
      for (const el of Object.values(stateCardEls)) {
        el.setAttribute('aria-pressed', 'false');
      }
      if (speak) {
        ctx?.say?.(
          t(
            'เข้าสู่ <b>โหมดมิกเซอร์</b> แล้ว! ลองเลื่อนสไลเดอร์ผสมคลื่น <b>เดลตา ทีตา อัลฟา เบตา แกมมา</b> ในสัดส่วนที่คุณต้องการแล้วดูกราฟ Welch PSD ด้านขวาได้เลย',
            'Entered <b>Mixer Mode</b>! Drag the sliders to blend <b>Delta, Theta, Alpha, Beta, and Gamma</b> in any proportion and watch the live Welch PSD bars on the right.'
          ),
          'happy'
        );
      }
    } else if (speak) {
      selectState(currentStateKey);
    }
  }

  function selectState(key) {
    prevStateKey = currentStateKey;
    currentStateKey = key;
    isMixerMode = false;
    modeStateBtn.setAttribute('aria-pressed', 'true');
    modeMixerBtn.setAttribute('aria-pressed', 'false');
    modeChip.textContent = t('กำลังใช้ค่าจากสถานะสมอง', 'Using Brain State Preset');
    modeChip.style.background = 'var(--card)';

    const st = STATES.find((s) => s.key === key);
    if (!st) return;

    for (const [k, el] of Object.entries(stateCardEls)) {
      el.setAttribute('aria-pressed', String(k === key));
    }

    for (const k of Object.keys(BANDS)) {
      targetAmps[k] = st.amps[k];
      mixerSliders[k].value = String(st.amps[k]);
      mixerOutputs[k].textContent = `${st.amps[k]} µV`;
    }

    scope.mark(t(st.title, st.titleEn), BANDS[st.dom].color);

    // Check discovery: Alpha-blocking when switching from 'relaxed' (eyes closed alpha) to 'thinking' (beta)
    if (prevStateKey === 'relaxed' && key === 'thinking') {
      ctx?.discover?.(
        'alpha-blocking',
        t(
          'ค้นพบปรากฏการณ์ <b>Alpha Blocking (Berger Effect)</b>! เมื่อเปลี่ยนจากหลับตาผ่อนคลายมาเป็นตั้งใจคิด คลื่นอัลฟา (8–13 Hz) ที่ท้ายทอยจะยุบหายไปทันที และถูกแทนที่ด้วยคลื่นเบตาที่ถี่ขึ้น!',
          'Discovered <b>Alpha Blocking (Berger Effect)</b>! Switching from eyes-closed relaxation to active thinking causes occipital Alpha (8–13 Hz) to vanish immediately, replaced by faster Beta rhythms!'
        )
      );
    } else {
      ctx?.say?.(
        t(
          `<b>${st.title} (${st.en}):</b> ${st.note}`,
          `<b>${st.en}:</b> ${st.noteEn}`
        ),
        'idle'
      );
    }

    if (prefersReducedMotion()) {
      Object.assign(currentAmps, targetAmps);
      synth.setAmps(currentAmps);
      refillTwoSeconds();
    }
  }

  let sampleAcc = 0;
  let psdTimer = 0;
  const stopLoop = loop((dt) => {
    if (prefersReducedMotion()) return;

    // Smoothly interpolate currentAmps toward targetAmps
    const rate = clamp(dt * 6, 0, 1);
    for (const k of Object.keys(BANDS)) {
      currentAmps[k] = lerp(currentAmps[k], targetAmps[k], rate);
    }
    synth.setAmps(currentAmps);

    sampleAcc += dt * FS;
    const n = Math.min(25, Math.floor(sampleAcc));
    sampleAcc -= n;
    for (let i = 0; i < n; i++) {
      scope.push([synth.next()]);
    }
    if (n > 0) scope.draw();

    psdTimer += dt;
    if (psdTimer >= 0.12) {
      psdTimer = 0;
      updateBandPowerBars();
    }
  });

  scope.draw();
  updateBandPowerBars();

  ctx?.say?.(
    t(
      'ตอนนี้สมองอยู่ในสถานะ <b>หลับตาผ่อนคลาย (Alpha 8–13 Hz ที่ O1/O2)</b> ลองคลิกเปลี่ยนเป็น <b>ตั้งใจคิด / แก้โจทย์</b> เพื่อสังเกตว่าคลื่นอัลฟาเปลี่ยนแปลงอย่างไร!',
      'The brain is currently in <b>Eyes-Closed Relaxed (Alpha 8–13 Hz @ O1/O2)</b>. Try clicking <b>Active Thinking</b> to observe what happens to the Alpha wave!'
    ),
    'idle'
  );

  return () => {
    stopLoop();
    scope.dispose();
  };
}
