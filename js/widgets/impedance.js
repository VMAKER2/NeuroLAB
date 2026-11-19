// Lesson 4 widget: Electrode Impedance (kΩ) & Sampling Rate / Aliasing (Nyquist)
import { h, clamp, seeded, prefersReducedMotion, loop } from '../util.js';
import { icon } from '../ui/icons.js';
import { EEGSynth, pinkNoise } from '../signal/dsp.js';
import { Scope, fitCanvas, drawGrid, INK, MONO, HEAD } from '../signal/plot.js';
import { t } from '../i18n.js';

const ELECTRODE_TYPES = {
  wet: {
    key: 'wet',
    title: 'แบบเจลเปียก (Wet Gel)',
    titleEn: 'Wet Gel Electrode',
    sub: 'Ag/AgCl + เจลนำไฟฟ้า แนบผิวหนังดีเยี่ยม สัญญาณสะอาดที่สุด',
    subEn: 'Ag/AgCl + conductive gel; excellent skin contact, cleanest signal',
    defaultKohm: 5,
  },
  dry: {
    key: 'dry',
    title: 'แบบแห้ง (Dry Pin)',
    titleEn: 'Dry Pin Electrode',
    sub: 'ขาพินโลหะแตะหนังศีรษะโดยตรง สวมเร็ว แต่อิมพีแดนซ์สูงกว่าเจล',
    subEn: 'Metal pins touch the scalp directly; fast setup, higher impedance than gel',
    defaultKohm: 32,
  },
  hair: {
    key: 'hair',
    title: 'แบบแห้งทับเส้นผม (Dry + Hair)',
    titleEn: 'Dry Electrode Over Hair',
    sub: 'เส้นผมกั้นระหว่างขั้วกับผิวหนัง อิมพีแดนซ์พุ่งสูง ดูดไฟบ้าน 50 Hz เต็มๆ',
    subEn: 'Hair blocks skin contact; impedance spikes and picks up heavy 50 Hz mains hum',
    defaultKohm: 135,
  },
};

const SIG_FREQ = 30; // 30 Hz continuous sine wave for Tab B

export default function mount(root, ctx) {
  root.innerHTML = '';

  let activeTab = 'impedance'; // 'impedance' | 'sampling'
  let elType = 'wet';
  let kohm = 5;
  let fsRate = 125; // Hz for sampling rate tab

  // --- Segmented Tab Bar (.seg) ---
  const tabImpBtn = h('button', {
    type: 'button',
    'aria-pressed': 'true',
    onclick: () => switchTab('impedance'),
  }, t('อิมพีแดนซ์ (Impedance)', 'Impedance (kΩ)'));

  const tabFsBtn = h('button', {
    type: 'button',
    'aria-pressed': 'false',
    onclick: () => switchTab('sampling'),
  }, t('อัตราสุ่มตัวอย่าง (Sampling rate)', 'Sampling Rate (Hz)'));

  const segBar = h('div', { class: 'seg', role: 'tablist', 'aria-label': t('เลือกหัวข้อฮาร์ดแวร์ EEG', 'Select EEG hardware topic') },
    tabImpBtn,
    tabFsBtn
  );

  // ==========================================================
  // TAB A: IMPEDANCE (1 - 200 kΩ)
  // ==========================================================
  const typeBtns = {};
  const typeGrid = h('div', { class: 'imp-type-grid' },
    ...Object.values(ELECTRODE_TYPES).map((item) => {
      const btn = h('button', {
        type: 'button',
        class: 'imp-type-btn',
        'aria-pressed': String(item.key === elType),
        onclick: () => selectElectrodeType(item.key),
      },
        h('h4', {}, t(item.title, item.titleEn), h('span', { class: 'chip' }, `~${item.defaultKohm} kΩ`)),
        h('p', {}, t(item.sub, item.subEn))
      );
      typeBtns[item.key] = btn;
      return btn;
    })
  );

  const kohmOut = h('output', {}, `${kohm} kΩ`);
  const kohmSlider = h('input', {
    type: 'range',
    min: 1,
    max: 200,
    step: 1,
    value: kohm,
    'aria-label': t('ค่าอิมพีแดนซ์ (Impedance kΩ)', 'Impedance (kΩ)'),
    oninput: (e) => {
      kohm = Number(e.target.value);
      updateImpedanceUI();
    },
  });

  const meterNeedle = h('div', { class: 'imp-meter-needle', style: { left: '2.5%' } });
  const qualityBadge = h('span', { class: 'chip' }, t('ดีมาก (< 10 kΩ)', 'Excellent (< 10 kΩ)'));
  const noiseReadout = h('span', { class: 'wa-metric' }, t('ไฟบ้าน 50 Hz ปนเปื้อน: ', '50 Hz mains hum: '), h('b', {}, '~1 µV'));

  const contactSvgBox = h('div', {});
  const scopeCanvas = h('canvas', {
    class: 'scope',
    role: 'img',
    'aria-label': t('กราฟเปรียบเทียบสัญญาณ EEG จริง กับสัญญาณที่วัดได้เมื่ออิมพีแดนซ์เปลี่ยน', 'Graph comparing true EEG signal vs. measured signal as impedance changes'),
  });

  const paneImpedance = h('div', { class: 'wa-stack' },
    typeGrid,
    h('div', { class: 'wa-panel card-bg imp-contact-row' },
      contactSvgBox,
      h('div', { class: 'wa-stack', style: { gap: '10px' } },
        h('div', { class: 'field' },
          h('label', { class: 'ctl-label' }, t('ค่าความต้านทานหน้าสัมผัส (Impedance)', 'Contact Impedance'), kohmOut),
          kohmSlider
        ),
        h('div', { class: 'imp-meter-wrap' },
          h('div', { class: 'imp-meter-bar' }, meterNeedle),
          h('div', { class: 'widget-row', style: { justifyContent: 'space-between' } },
            qualityBadge,
            noiseReadout
          )
        )
      )
    ),
    scopeCanvas
  );

  // ==========================================================
  // TAB B: SAMPLING RATE & ALIASING (15 - 250 Hz on 30 Hz sine)
  // ==========================================================
  const fsOut = h('output', {}, `${fsRate} Hz`);
  const fsSlider = h('input', {
    type: 'range',
    min: 15,
    max: 250,
    step: 1,
    value: fsRate,
    'aria-label': t('อัตราสุ่มตัวอย่าง (Sampling rate Hz)', 'Sampling rate (Hz)'),
    oninput: (e) => {
      fsRate = Number(e.target.value);
      updateSamplingUI(true);
    },
  });

  const setFsPreset = (val) => {
    fsRate = val;
    fsSlider.value = String(val);
    updateSamplingUI(true);
  };

  const fsPresetRow = h('div', { class: 'ap-presets' },
    h('button', { type: 'button', class: 'chip', onclick: () => setFsPreset(250) }, t('250 Hz (มาตรฐาน EEG — ชัดเจน)', '250 Hz (Standard EEG — Accurate)')),
    h('button', { type: 'button', class: 'chip', onclick: () => setFsPreset(60) }, t('60 Hz (จุดวิกฤต Nyquist = 2×30 Hz)', '60 Hz (Nyquist Limit = 2×30 Hz)')),
    h('button', { type: 'button', class: 'chip', onclick: () => setFsPreset(35) }, t('35 Hz (ต่ำกว่า Nyquist → เกิด Aliasing 5 Hz!)', '35 Hz (Below Nyquist → 5 Hz Alias!)')),
    h('button', { type: 'button', class: 'chip', onclick: () => setFsPreset(40) }, t('40 Hz (เกิดคลื่นปลอม 10 Hz!)', '40 Hz (10 Hz Phantom Wave!)')),
  );

  const aliasStatusPill = h('span', { class: 'chip' }, t('สุ่มถูกต้อง (fs ≥ 60 Hz)', 'Valid Sampling (fs ≥ 60 Hz)'));
  const aliasFreqMetric = h('span', { class: 'wa-metric teal' }, t('ความถี่ที่คอมพิวเตอร์เห็น: ', 'Apparent frequency seen by PC: '), h('b', {}, '30.0 Hz'));

  const aliasCanvas = h('canvas', {
    class: 'imp-alias-canvas',
    role: 'img',
    'aria-label': t('กราฟคลื่นจริง 30 Hz เทียบกับจุดสุ่มตัวอย่างและคลื่นที่สร้างใหม่', 'Graph of true 30 Hz wave vs. sample points and reconstructed wave'),
  });

  const nyquistBox = h('div', { class: 'callout teal', style: { margin: 0 } },
    h('span', { html: icon('info') }),
    h('div', {},
      h('strong', {}, t('ทฤษฎีของไนควิสต์ (Nyquist Theorem): ', 'Nyquist Theorem: ')),
      t('อัตราสุ่มตัวอย่าง (Sampling rate, fs) ต้องสูงกว่า ', 'The sampling rate (fs) must always be greater than '),
      h('b', {}, t('2 เท่าของความถี่สูงสุดในสัญญาณ', '2× the highest frequency in the signal')),
      t(' เสมอ! เช่น คลื่นสมอง 30 Hz ต้องสุ่มอย่างน้อย ', '! For example, a 30 Hz brain wave must be sampled at '),
      h('b', {}, t('60 Hz ขึ้นไป', '60 Hz or higher')),
      t(' หากสุ่มช้ากว่านั้น จุดที่เก็บได้จะเรียงตัวหลอกตาเป็น "ความถี่ปลอมที่ต่ำกว่า" เรียกว่า ', '. Sampling slower causes the discrete points to align into a false lower-frequency wave called '),
      h('b', {}, 'Aliasing'),
      t(' (เครื่อง EEG จริงจึงมักสุ่มที่ 250–512 Hz)', ' (clinical & research EEG systems typically sample at 250–512 Hz).')
    )
  );

  const paneSampling = h('div', { class: 'wa-stack', style: { display: 'none' } },
    h('div', { class: 'wa-panel card-bg' },
      h('div', { class: 'wa-controls' },
        h('div', { class: 'field' },
          h('label', { class: 'ctl-label' }, t('อัตราสุ่มตัวอย่าง (Sampling rate: fs)', 'Sampling Rate (fs)'), fsOut),
          fsSlider,
          fsPresetRow
        ),
        h('div', { class: 'wa-metrics' },
          aliasFreqMetric,
          aliasStatusPill
        )
      )
    ),
    aliasCanvas,
    nyquistBox
  );

  root.append(
    h('div', { class: 'wa-stack' },
      h('div', { class: 'wa-head', style: { marginBottom: 0 } },
        segBar,
        h('span', { class: 'small muted' }, t('เปรียบเทียบคุณภาพการสัมผัสผิวหนัง และการแปลงสัญญาณอนาล็อกเป็นดิจิทัล', 'Compare electrode skin contact quality and analog-to-digital sampling'))
      ),
      paneImpedance,
      paneSampling
    )
  );

  // --- Setup Scope for Tab A ---
  const scope = new Scope(scopeCanvas, {
    channels: 2,
    fs: 250,
    seconds: 3.5,
    labels: [t('EEG จริง', 'True EEG'), t('ที่วัดได้', 'Measured')],
    colors: ['#1FA39A', '#1F2A44'],
    range: 70,
    labelWidth: 68,
  });

  const synth = new EEGSynth({
    fs: 250,
    amps: { delta: 4, theta: 5, alpha: 22, beta: 5, gamma: 1 },
    noise: 2,
    line: 0,
    seed: 77,
  });
  const extraPink = pinkNoise(seeded(99));
  let linePhase = 0;
  let driftPhase = 0;

  function stepSignalSample() {
    const clean = synth.next();
    // Noise & 50 Hz interference scale with impedance (kohm: 1..200)
    const normZ = (kohm - 1) / 199; // 0..1
    const lineAmp = kohm <= 10 ? (kohm / 10) * 1.5 : 1.5 + Math.pow((kohm - 10) / 190, 1.15) * 48;
    const pinkAmp = kohm <= 10 ? 1 : 1 + normZ * 22;
    const driftAmp = kohm <= 25 ? 0 : ((kohm - 25) / 175) * 24;

    linePhase += (2 * Math.PI * 50) / 250;
    driftPhase += (2 * Math.PI * 0.6) / 250;

    const measured =
      clean +
      Math.sin(linePhase) * lineAmp +
      extraPink() * pinkAmp * 2.5 +
      Math.sin(driftPhase) * driftAmp;

    scope.push([clean, measured]);
  }

  // Pre-fill scope so it's immediately populated
  for (let i = 0; i < 250 * 3.5; i++) stepSignalSample();
  scope.draw();

  function renderContactSvg() {
    const isWet = elType === 'wet';
    const isHair = elType === 'hair';
    contactSvgBox.innerHTML = `
      <svg class="imp-contact-svg" viewBox="0 0 200 125" role="img" aria-label="${t('ภาพหน้าสัมผัสระหว่างอิเล็กโทรดกับหนังศีรษะ', 'Diagram of electrode-scalp interface')}">
        <!-- Scalp skin layer -->
        <rect x="10" y="82" width="180" height="34" rx="6" fill="#FFE1D8" stroke="#1F2A44" stroke-width="2"/>
        <text x="100" y="103" text-anchor="middle" font-family="Anuphan, sans-serif" font-size="11" font-weight="700" fill="#1F2A44">${t('หนังศีรษะ (Scalp)', 'Scalp')}</text>

        ${
          isWet
            ? `
          <!-- Conductive Gel bridge -->
          <path d="M44 82 C44 46 156 46 156 82 Z" fill="#D3F0EC" stroke="#1FA39A" stroke-width="2"/>
          <text x="100" y="71" text-anchor="middle" font-family="Anuphan, sans-serif" font-size="9.5" font-weight="700" fill="#1FA39A">${t('เจลนำไฟฟ้า (Conductive Gel)', 'Conductive Gel')}</text>
          <rect x="60" y="20" width="80" height="28" rx="6" fill="#F2B632" stroke="#1F2A44" stroke-width="2.2"/>
          <text x="100" y="38" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#1F2A44">Ag/AgCl</text>
        `
            : isHair
            ? `
          <!-- Hair strands blocking electrode pins -->
          <g stroke="#1F2A44" stroke-width="3" fill="none" stroke-linecap="round">
            <path d="M24 78 Q65 62 110 78 T178 74"/>
            <path d="M20 72 Q75 56 125 74 T180 68"/>
            <path d="M30 82 Q90 66 145 80"/>
          </g>
          <!-- Dry electrode pins lifted by hair -->
          <rect x="55" y="18" width="90" height="22" rx="5" fill="#F2B632" stroke="#1F2A44" stroke-width="2.2"/>
          <rect x="68" y="40" width="8" height="24" rx="2" fill="#EDE3D3" stroke="#1F2A44" stroke-width="1.8"/>
          <rect x="96" y="40" width="8" height="24" rx="2" fill="#EDE3D3" stroke="#1F2A44" stroke-width="1.8"/>
          <rect x="124" y="40" width="8" height="24" rx="2" fill="#EDE3D3" stroke="#1F2A44" stroke-width="1.8"/>
          <text x="100" y="33" text-anchor="middle" font-family="Anuphan, sans-serif" font-size="9.5" font-weight="700" fill="#1F2A44">${t('ติดเส้นผม (ช่องว่างอากาศ)', 'Blocked by Hair (Air Gap)')}</text>
        `
            : `
          <!-- Dry pins touching scalp directly -->
          <rect x="55" y="24" width="90" height="22" rx="5" fill="#F2B632" stroke="#1F2A44" stroke-width="2.2"/>
          <rect x="68" y="46" width="8" height="36" rx="2" fill="#EDE3D3" stroke="#1F2A44" stroke-width="1.8"/>
          <rect x="96" y="46" width="8" height="36" rx="2" fill="#EDE3D3" stroke="#1F2A44" stroke-width="1.8"/>
          <rect x="124" y="46" width="8" height="36" rx="2" fill="#EDE3D3" stroke="#1F2A44" stroke-width="1.8"/>
          <text x="100" y="39" text-anchor="middle" font-family="Anuphan, sans-serif" font-size="9.5" font-weight="700" fill="#1F2A44">${t('พินโลหะ (Dry Pins)', 'Metal Dry Pins')}</text>
        `
        }
      </svg>
    `;
  }

  function selectElectrodeType(key) {
    elType = key;
    for (const [k, btn] of Object.entries(typeBtns)) {
      btn.setAttribute('aria-pressed', String(k === key));
    }
    kohm = ELECTRODE_TYPES[key].defaultKohm;
    kohmSlider.value = String(kohm);
    renderContactSvg();
    updateImpedanceUI(true);
  }

  function updateImpedanceUI(announce = false) {
    kohmOut.textContent = `${kohm} kΩ`;
    const pct = clamp(((kohm - 1) / 199) * 100, 1, 99);
    meterNeedle.style.left = `${pct}%`;

    const lineUv = kohm <= 10 ? Math.round((kohm / 10) * 1.5) : Math.round(1.5 + Math.pow((kohm - 10) / 190, 1.15) * 48);
    noiseReadout.querySelector('b').textContent = `~${lineUv} µV`;

    if (kohm < 10) {
      qualityBadge.textContent = t('ดีมาก (Good < 10 kΩ สำหรับแบบเจล)', 'Excellent (Good < 10 kΩ for wet gel)');
      qualityBadge.style.background = 'var(--teal-soft)';
      if (announce) {
        ctx?.say?.(
          t(
            `อิมพีแดนซ์ต่ำแค่ <b>${kohm} kΩ</b>! กระแสจากสมองไหลผ่านเจลเข้าสู่อิเล็กโทรดได้สะดวก สัญญาณรบกวนไฟบ้าน 50 Hz แทบไม่มีเลย`,
            `Impedance is a low <b>${kohm} kΩ</b>! Brain currents flow smoothly through the conductive gel with virtually zero 50 Hz mains interference.`
          ),
          'happy'
        );
      }
    } else if (kohm < 40) {
      qualityBadge.textContent = t('พอใช้ได้ (Usable < 40 kΩ)', 'Usable (< 40 kΩ for dry pins)');
      qualityBadge.style.background = 'var(--mustard-soft)';
      if (announce) {
        ctx?.say?.(
          t(
            `อิมพีแดนซ์ <b>${kohm} kΩ</b> อยู่ในเกณฑ์พอใช้สำหรับอิเล็กโทรดแบบแห้ง (Dry electrode) เริ่มมีคลื่นรบกวนปะปนเล็กน้อยแต่ยังพอมองเห็นคลื่นสมอง`,
            `Impedance of <b>${kohm} kΩ</b> is acceptable for dry electrodes. Minor noise begins to appear, but the underlying EEG rhythm is still readable.`
          ),
          'think'
        );
      }
    } else {
      qualityBadge.textContent = t('แย่ / สัญญาณรบกวนสูง (Bad ≥ 40 kΩ)', 'Poor / High Noise (Bad ≥ 40 kΩ)');
      qualityBadge.style.background = 'var(--coral-soft)';
      if (announce) {
        ctx?.say?.(
          t(
            `อิมพีแดนซ์พุ่งถึง <b>${kohm} kΩ</b>! เมื่อหน้าสัมผัสไม่ดี สายวัดจะทำตัวเหมือนเสาอากาศรับคลื่นไฟบ้าน <b>50 Hz</b> เข้ามากลบคลื่นสมองจนมิด`,
            `Impedance spiked to <b>${kohm} kΩ</b>! With poor skin contact, the electrode lead acts like an antenna picking up massive <b>50 Hz</b> mains hum that swamps the EEG.`
          ),
          'oops'
        );
      }
    }

    if (prefersReducedMotion()) {
      for (let i = 0; i < 250 * 2; i++) stepSignalSample();
      scope.draw();
    }
  }

  // --- Setup Aliasing Canvas for Tab B ---
  let fitAlias = null;
  fitAlias = fitCanvas(aliasCanvas, (s) => drawAliasPlot(s));

  function getAliasInfo(fs) {
    const nyquist = SIG_FREQ * 2; // 60 Hz
    const isAliased = fs < nyquist;
    // Apparent frequency f_alias = |f_sig - k * fs| where k = round(f_sig / fs)
    const k = Math.round(SIG_FREQ / fs);
    const fApparent = Math.abs(SIG_FREQ - k * fs);
    // Phase flip if SIG_FREQ - k*fs < 0
    const sign = SIG_FREQ - k * fs < 0 ? -1 : 1;
    return { isAliased, fApparent, sign, nyquist };
  }

  function updateSamplingUI(userMoved = false) {
    fsOut.textContent = `${fsRate} Hz (Nyquist = 60 Hz)`;
    const { isAliased, fApparent } = getAliasInfo(fsRate);

    if (isAliased) {
      aliasStatusPill.textContent = t(`เกิด Aliasing! (fs < 60 Hz)`, `Aliasing! (fs < 60 Hz)`);
      aliasStatusPill.style.background = 'var(--coral-soft)';
      aliasFreqMetric.className = 'wa-metric';
      aliasFreqMetric.querySelector('b').textContent = t(`${fApparent.toFixed(1)} Hz (คลื่นปลอม!)`, `${fApparent.toFixed(1)} Hz (Phantom alias!)`);

      if (userMoved) {
        ctx?.discover?.(
          'aliasing',
          t(
            `ค้นพบ <b>Aliasing (ความถี่ปลอม)</b>! เมื่อสุ่มคลื่น 30 Hz ด้วยอัตราเพียง <b>${fsRate} Hz</b> (ต่ำกว่าเกณฑ์ Nyquist 60 Hz) จุดที่สุ่มได้จะเรียงตัวหลอกคอมพิวเตอร์ว่าเป็นคลื่นช้า <b>${fApparent.toFixed(1)} Hz</b> แทน!`,
            `Discovered <b>Aliasing</b>! When sampling a 30 Hz wave at only <b>${fsRate} Hz</b> (below the 60 Hz Nyquist limit), the sampled points trick the computer into seeing a slow <b>${fApparent.toFixed(1)} Hz</b> wave instead!`
          )
        );
      }
    } else {
      aliasStatusPill.textContent = t(`ไม่เกิด Aliasing (fs ≥ 60 Hz)`, `No Aliasing (fs ≥ 60 Hz)`);
      aliasStatusPill.style.background = 'var(--teal-soft)';
      aliasFreqMetric.className = 'wa-metric teal';
      aliasFreqMetric.querySelector('b').textContent = t(`30.0 Hz (ตรงความจริง)`, `30.0 Hz (True frequency)`);

      if (userMoved) {
        ctx?.say?.(
          t(
            `ที่อัตราสุ่ม <b>${fsRate} Hz</b> (สูงกว่า 60 Hz) จุดตัวอย่างถี่พอที่จะจับจังหวะขึ้น-ลงของคลื่น 30 Hz ได้ครบถ้วน ลองเลื่อนแถบลงมาต่ำกว่า <b>60 Hz</b> ดูสิว่าจะเกิดอะไรขึ้น!`,
            `At <b>${fsRate} Hz</b> (above 60 Hz), samples are dense enough to capture every cycle of the 30 Hz wave. Try dragging the slider below <b>60 Hz</b> to see what happens!`
          ),
          'idle'
        );
      }
    }
    drawAliasPlot();
  }

  function drawAliasPlot(s = fitAlias) {
    if (!s) return;
    const { ctx: c, w, h: ch } = s;
    if (w < 20 || ch < 20) return;
    drawGrid(c, w, ch, { step: 20, major: 4 });

    const pad = { l: 46, r: 18, t: 28, b: 28 };
    const pw = w - pad.l - pad.r;
    const ph = ch - pad.t - pad.b;
    const durSec = 0.2; // 200 ms window -> 6 cycles of 30 Hz

    const X = (t) => pad.l + (t / durSec) * pw;
    const Y = (v) => pad.t + ph / 2 - v * (ph * 0.4);

    const { isAliased, fApparent, sign } = getAliasInfo(fsRate);

    // Legend / Header inside plot
    c.font = HEAD;
    c.textAlign = 'left';
    c.fillStyle = '#1FA39A';
    c.fillText(t('— คลื่นจริงต่อเนื่อง 30 Hz', '— True continuous 30 Hz wave'), pad.l, 18);
    c.fillStyle = '#FF6B4A';
    c.fillText(
      isAliased
        ? t(
            `--- คลื่นที่คอมพิวเตอร์เห็น: Alias ${fApparent.toFixed(1)} Hz (จุดสุ่มทุก ${(1000 / fsRate).toFixed(1)} ms)`,
            `--- Apparent wave seen by PC: Alias ${fApparent.toFixed(1)} Hz (sampled every ${(1000 / fsRate).toFixed(1)} ms)`
          )
        : t(
            `— เส้นเชื่อมจุดสุ่มตัวอย่าง (${fsRate} จุด/วินาที)`,
            `— Connected sample points (${fsRate} samples/s)`
          ),
      pad.l + 165,
      18
    );

    // 1. Continuous 30 Hz true sine wave
    c.strokeStyle = 'rgba(31, 163, 154, 0.55)';
    c.lineWidth = 2.2;
    c.beginPath();
    const N = 400;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * durSec;
      const v = Math.sin(2 * Math.PI * SIG_FREQ * t);
      i ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v));
    }
    c.stroke();

    // 2. Reconstructed / Apparent wave
    if (isAliased) {
      // Draw the smooth apparent alias wave passing through all sample points
      c.strokeStyle = '#FF6B4A';
      c.lineWidth = 3;
      c.setLineDash([6, 4]);
      c.beginPath();
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * durSec;
        const v = sign * Math.sin(2 * Math.PI * fApparent * t);
        i ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v));
      }
      c.stroke();
      c.setLineDash([]);
    } else {
      // Connect sampled points linearly
      c.strokeStyle = '#FF6B4A';
      c.lineWidth = 2.2;
      c.beginPath();
      const dt = 1 / fsRate;
      let idx = 0;
      for (let t = 0; t <= durSec + 1e-6; t += dt, idx++) {
        const v = Math.sin(2 * Math.PI * SIG_FREQ * t);
        idx ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v));
      }
      c.stroke();
    }

    // 3. Discrete Sample Dots
    const dt = 1 / fsRate;
    for (let t = 0; t <= durSec + 1e-6; t += dt) {
      const v = Math.sin(2 * Math.PI * SIG_FREQ * t);
      const px = X(t);
      const py = Y(v);
      c.fillStyle = '#FF6B4A';
      c.strokeStyle = INK;
      c.lineWidth = 1.8;
      c.beginPath();
      c.arc(px, py, 4.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

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
    c.textAlign = 'center';
    for (const ms of [0, 50, 100, 150, 200]) {
      c.fillText(`${ms} ms`, X(ms / 1000), ch - 8);
    }
    c.textAlign = 'right';
    c.fillText('+1', pad.l - 6, Y(1) + 4);
    c.fillText('0', pad.l - 6, Y(0) + 4);
    c.fillText('-1', pad.l - 6, Y(-1) + 4);
  }

  function switchTab(tab) {
    activeTab = tab;
    const isImp = tab === 'impedance';
    tabImpBtn.setAttribute('aria-pressed', String(isImp));
    tabFsBtn.setAttribute('aria-pressed', String(!isImp));
    paneImpedance.style.display = isImp ? 'grid' : 'none';
    paneSampling.style.display = isImp ? 'none' : 'grid';

    if (isImp) {
      scope.draw();
    } else {
      // Trigger resize & redraw once visible
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        drawAliasPlot();
      });
      ctx?.say?.(
        t(
          'ในแท็บ <b>อัตราสุ่มตัวอย่าง (Sampling rate)</b> ลองเลื่อนแถบลงให้ต่ำกว่า <b>60 Hz</b> (จุดวิกฤต Nyquist ของคลื่น 30 Hz) เพื่อดูปรากฏการณ์ความถี่ปลอม (Aliasing)!',
          'In the <b>Sampling Rate</b> tab, try dragging the slider below <b>60 Hz</b> (the Nyquist limit for a 30 Hz wave) to witness frequency aliasing!'
        ),
        'think'
      );
    }
  }

  let sampleAcc = 0;
  const stopLoop = loop((dt) => {
    if (prefersReducedMotion() || activeTab !== 'impedance') return;
    sampleAcc += dt * 250;
    const n = Math.min(25, Math.floor(sampleAcc));
    sampleAcc -= n;
    for (let i = 0; i < n; i++) stepSignalSample();
    if (n > 0) scope.draw();
  });

  renderContactSvg();
  updateImpedanceUI(false);
  updateSamplingUI(false);

  ctx?.say?.(
    t(
      'ลองสลับชนิดอิเล็กโทรด (<b>เจลเปียก / แห้ง / ทับเส้นผม</b>) หรือเลื่อนแถบ <b>kΩ</b> ดูสิว่าเมื่ออิมพีแดนซ์สูงขึ้น คลื่นไฟบ้าน 50 Hz จะเข้ามากวนสัญญาณขนาดไหน!',
      'Try switching electrode types (<b>Wet Gel / Dry Pin / Over Hair</b>) or dragging the <b>kΩ</b> slider to see how high impedance lets 50 Hz mains hum corrupt the EEG!'
    ),
    'idle'
  );

  return () => {
    stopLoop();
    scope.dispose();
    fitAlias.dispose();
  };
}
