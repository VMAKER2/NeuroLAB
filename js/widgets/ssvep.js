// Lesson 9 widget: SSVEP — Photosensitivity gate + Safe wave mode, 7.5 / 10 / 12 Hz targets, Oz spectrum + 2nd harmonic, mini rover track.
import { h, clamp, loop, prefersReducedMotion } from '../util.js';
import { icon } from '../ui/icons.js';
import { EEGSynth, spectrum } from '../signal/dsp.js';
import { fitCanvas, drawSpectrum, Scope, INK } from '../signal/plot.js';
import { t } from '../i18n.js';

function getTargets() {
  return [
    {
      id: 'f75',
      freq: 7.5,
      harmonic: 15,
      label: '7.5 Hz',
      cmd: t('ขับเคลื่อนจังหวะที่ 1', 'Drive Gear 1'),
      speed: 14,
      color: '#FF6B4A',
    },
    {
      id: 'f10',
      freq: 10.0,
      harmonic: 20,
      label: '10 Hz',
      cmd: t('ขับเคลื่อนจังหวะที่ 2', 'Drive Gear 2'),
      speed: 20,
      color: '#1FA39A',
    },
    {
      id: 'f12',
      freq: 12.0,
      harmonic: 24,
      label: '12 Hz',
      cmd: t('ขับเคลื่อนความเร็วสูง', 'High-Speed Drive'),
      speed: 26,
      color: '#F2B632',
    },
  ];
}

export default function mount(root, ctx) {
  root.innerHTML = '';

  const TARGETS = getTargets();

  const fs = 256; // power of 2 for crisp FFT bins (0.5 Hz resolution at 512 samples)
  const bufLen = 512;
  const ozRing = new Float32Array(bufLen);
  let ringHead = 0;

  let safeMode = true; // default ON as required
  let flickerConsent = false;
  let activeTarget = TARGETS[1]; // start focused on 10 Hz so spectrum & detector show a clear peak immediately
  let detectedTarget = TARGETS[1];
  let roverPos = 22; // 0..100 % toward the flag
  let flagReached = false;
  let simTime = 0;

  const synth = new EEGSynth({
    fs,
    amps: { delta: 4, theta: 3.5, alpha: 5.5, beta: 3, gamma: 0.8 },
    noise: 2.2,
    seed: 77,
  });

  function pushSample(dtStep) {
    simTime += dtStep;
    let v = synth.next();
    if (activeTarget) {
      const f = activeTarget.freq;
      // Fundamental f + 2nd harmonic 2f
      v += 18.5 * Math.sin(2 * Math.PI * f * simTime);
      v += 6.8 * Math.sin(2 * Math.PI * (2 * f) * simTime + 0.4);
    }
    ozRing[ringHead] = v;
    ringHead = (ringHead + 1) % bufLen;
    return v;
  }

  // Pre-fill 2 seconds of Oz signal so FFT is immediately sharp on mount
  for (let i = 0; i < bufLen; i++) pushSample(1 / fs);

  // 1) Photosensitivity warning gate + Safe wave mode toggle (default ON)
  const safeCheckbox = h('input', {
    type: 'checkbox',
    checked: true,
    onchange: (e) => {
      if (!e.target.checked && !flickerConsent) {
        // Ask user to click consent button inside the warning gate
        e.target.checked = true;
        consentBtn.style.display = 'inline-flex';
        ctx?.say?.(
          t(
            'หากต้องการลองโหมดกะพริบจริง กรุณากดปุ่ม <b>"ยืนยันเปิดโหมดกะพริบ"</b> ในกล่องคำเตือนด้านบนก่อนนะ (แต่โหมดคลื่นนุ่มนวลก็ให้ผลลัพธ์สมองเหมือนกัน!)',
            'To try real flicker mode, please click <b>"Confirm Flicker Mode"</b> inside the warning box above first (Safe wave mode produces the exact same brain response!).'
          ),
          'think'
        );
        return;
      }
      safeMode = e.target.checked;
      syncGateUI();
    },
  });

  const consentBtn = h(
    'button',
    {
      class: 'btn sm mustard',
      style: { display: 'none' },
      onclick: () => {
        flickerConsent = true;
        safeMode = false;
        safeCheckbox.checked = false;
        consentBtn.style.display = 'none';
        syncGateUI();
        ctx?.say?.(
          t(
            'เปิดโหมดกะพริบจำลองแล้ว สามารถสลับกลับเป็นโหมดจำลองปลอดภัย (Safe wave mode) ได้ตลอดเวลา',
            'Simulated flicker mode enabled. You can switch back to Safe wave mode at any time.'
          ),
          'idle'
        );
      },
    },
    h('span', { html: icon('check') }),
    t('ยืนยันเปิดโหมดกะพริบ', 'Confirm Flicker Mode')
  );

  const modeBadge = h('span', { class: 'chip ssv-mode-chip' });
  function syncGateUI() {
    modeBadge.innerHTML = safeMode
      ? `${icon('check')} ${t('โหมดจำลองปลอดภัยทำงานอยู่', 'Safe wave mode active')}`
      : `${icon('warn')} ${t('โหมดกะพริบความถี่สูง', 'High-frequency flicker mode')}`;
  }
  syncGateUI();

  const warningGate = h(
    'div',
    { class: 'callout ssv-gate', role: 'region', 'aria-label': t('ข้อควรระวังสำหรับผู้ที่ไวต่อแสงกะพริบ', 'Photosensitivity warning') },
    h('span', { html: icon('warn') }),
    h(
      'div',
      { class: 'ssv-gate-body' },
      h(
        'div',
        { class: 'ssv-gate-text' },
        h('strong', {}, t('ข้อควรระวังสำหรับผู้ที่ไวต่อแสงกะพริบ (Photosensitivity Warning)', 'Photosensitivity Warning')),
        h(
          'p',
          { class: 'small' },
          t(
            'SSVEP ในงานจริงใช้แสงกะพริบ 7.5–12 Hz เพื่อความปลอดภัย เราเปิด "โหมดจำลองปลอดภัย (Safe wave mode)" ไว้เป็นค่าเริ่มต้น โดยใช้วงคลื่นเคลื่อนไหวนุ่มนวลแทนแสงกะพริบจ้า',
            'Real SSVEP uses 7.5–12 Hz flickering light. For your safety, "Safe wave mode" is ON by default, using gentle breathing wave rings instead of harsh strobing light.'
          )
        )
      ),
      h(
        'div',
        { class: 'ssv-gate-controls' },
        h(
          'label',
          { class: 'switch' },
          safeCheckbox,
          h('span', { class: 'track' }),
          h('span', {}, t('โหมดจำลองปลอดภัย (Safe wave mode)', 'Safe wave mode'))
        ),
        modeBadge,
        consentBtn
      )
    )
  );

  // 2) Three SSVEP stimulus targets (7.5 / 10 / 12 Hz) + Rest button
  const targetCards = new Map();
  const ringFillEls = new Map();

  const targetsRow = h('div', { class: 'ssv-targets', role: 'group', 'aria-label': t('ปุ่มเป้าหมาย SSVEP 3 ความถี่', '3 SSVEP frequency targets') });

  for (const tgt of TARGETS) {
    const waveRing = h('div', { class: 'ssv-wave-ring' });
    ringFillEls.set(tgt.id, waveRing);

    const card = h(
      'button',
      {
        class: 'ssv-target',
        dataset: { id: tgt.id },
        style: { '--tc': tgt.color },
        onclick: () => selectTarget(tgt),
      },
      waveRing,
      h('span', { class: 'ssv-freq' }, tgt.label),
      h('span', { class: 'small ssv-cmd' }, tgt.cmd),
      h('span', { class: 'en' }, `2f = ${tgt.harmonic} Hz`)
    );
    targetCards.set(tgt.id, card);
    targetsRow.append(card);
  }

  const restBtn = h(
    'button',
    {
      class: 'btn sm ghost',
      onclick: () => selectTarget(null),
    },
    h('span', { html: icon('eyeOff') }),
    t('ละสายตา (พัก)', 'Look Away (Rest)')
  );

  const boostBtn = h(
    'button',
    {
      class: 'btn sm teal',
      onclick: () => {
        if (!activeTarget) activeTarget = TARGETS[1];
        syncTargetButtons();
        roverPos = clamp(roverPos + 38, 0, 100);
        checkFlagReached();
        updateRoverUI();
      },
    },
    h('span', { html: icon('arrowRight') }),
    t('ส่งคำสั่งเร่งเข้าธง', 'Boost to Goal')
  );

  const resetRoverBtn = h(
    'button',
    {
      class: 'btn sm ghost',
      onclick: () => {
        roverPos = 0;
        flagReached = false;
        updateRoverUI();
        ctx?.say?.(
          t(
            'นำรถสำรวจกลับจุดเริ่มต้นแล้ว เลือกจ้องปุ่ม <b>7.5 Hz</b>, <b>10 Hz</b> หรือ <b>12 Hz</b> เพื่อขับรถเข้าหาธงได้เลย!',
            'Rover reset to the start line! Choose <b>7.5 Hz</b>, <b>10 Hz</b>, or <b>12 Hz</b> to drive the rover toward the flag.'
          ),
          'idle'
        );
      },
    },
    h('span', { html: icon('reset') }),
    t('รีเซ็ตรถ', 'Reset Rover')
  );

  function selectTarget(tgt) {
    activeTarget = tgt;
    syncTargetButtons();
    if (tgt) {
      ctx?.say?.(
        t(
          `กำลังจำลองการจ้องมองที่ <b>${tgt.label}</b> — สังเกตกราฟสเปกตรัมของขั้ว <b>Oz</b> จะเห็นยอดแหลมพุ่งขึ้นตรง <b>${tgt.freq} Hz</b> และฮาร์มอนิกที่ 2 (<b>${tgt.harmonic} Hz</b>) พารถสำรวจแล่นไปข้างหน้า!`,
          `Simulating gaze at <b>${tgt.label}</b> — watch the <b>Oz</b> spectrum spike sharply at <b>${tgt.freq} Hz</b> and its 2nd harmonic (<b>${tgt.harmonic} Hz</b>), driving the rover forward!`
        ),
        'idle'
      );
    } else {
      ctx?.say?.(
        t(
          'ละสายตาจากปุ่มกะพริบแล้ว ยอดแหลม SSVEP หายไป เหลือเพียงคลื่นพื้นหลังของสมอง รถสำรวจจึงจอดนิ่ง',
          'Looked away from the flickering targets. The SSVEP spectral peaks disappear, leaving only background EEG, so the rover stops.'
        ),
        'think'
      );
    }
  }

  function syncTargetButtons() {
    for (const tgt of TARGETS) {
      const btn = targetCards.get(tgt.id);
      const isSelected = activeTarget?.id === tgt.id;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-pressed', String(isSelected));
    }
    restBtn.setAttribute('aria-pressed', String(activeTarget === null));
  }

  // 3) Mini Rover / Cart Track toward Flag
  const detectorReadout = h('div', { class: 'chip ssv-det-chip' });
  const roverCar = h(
    'div',
    { class: 'ssv-rover' },
    h('span', { class: 'ssv-rover-tag' }, 'BCI ROVER'),
    h('div', { class: 'ssv-rover-body', html: icon('zap') })
  );
  const progressFill = h('div', { class: 'ssv-track-fill' });
  const pctLabel = h('span', { class: 'mono small' }, '22%');

  const trackBox = h(
    'div',
    { class: 'ssv-track-card card flat' },
    h(
      'div',
      { class: 'ssv-track-head' },
      h('strong', {}, t('สนามทดสอบรถสำรวจขับเคลื่อนด้วยคลื่นสมองท้ายทอย (Oz SSVEP Decoder)', 'Occipital Brainwave Rover Test Track (Oz SSVEP Decoder)')),
      detectorReadout,
      pctLabel
    ),
    h(
      'div',
      { class: 'ssv-track' },
      progressFill,
      h('div', { class: 'ssv-start-mark' }, 'START'),
      roverCar,
      h('div', { class: 'ssv-flag' }, h('span', { html: icon('star') }), h('span', {}, 'GOAL'))
    )
  );

  function updateRoverUI() {
    const p = clamp(roverPos, 0, 100);
    roverCar.style.left = `calc(${p * 0.84}% + 12px)`;
    progressFill.style.width = `${p}%`;
    pctLabel.textContent = `${Math.round(p)}%`;
    if (detectedTarget) {
      detectorReadout.innerHTML = t(
        `${icon('target')} <span>ตรวจพบยอด <b>${detectedTarget.freq} Hz</b> (+${detectedTarget.harmonic} Hz) → กำลังเดินหน้า</span>`,
        `${icon('target')} <span>Peak detected at <b>${detectedTarget.freq} Hz</b> (+${detectedTarget.harmonic} Hz) → Driving forward</span>`
      );
    } else {
      detectorReadout.innerHTML = t(
        `${icon('pause')} <span>ไม่พบความถี่เป้าหมาย (หยุดรถ)</span>`,
        `${icon('pause')} <span>No target frequency detected (Stopped)</span>`
      );
    }
  }

  function checkFlagReached() {
    if (roverPos >= 100 && !flagReached) {
      flagReached = true;
      ctx?.discover?.(
        'ssvep-flag-reached',
        t(
          'รถสำรวจเข้าเส้นชัยแล้ว! SSVEP เป็นพาราไดม์ BCI ที่ส่งข้อมูลได้เร็วและแม่นยำมาก เพราะสมองส่วนการมองเห็น (Oz) ซิงค์ความถี่ตามสิ่งเร้าที่ตาจ้องโดยตรง',
          'Rover reached the goal! SSVEP is one of the fastest and most reliable BCI paradigms because the visual cortex (Oz) phase-locks directly to the frequency you gaze at.'
        )
      );
    }
  }

  // 4) Canvases: Live Oz time trace + Live FFT Spectrum with dashed markers at 7.5 / 10 / 12 Hz
  const traceCanvas = h('canvas', {
    class: 'scope ssv-trace-canvas',
    'aria-label': t('สัญญาณคลื่นสมองสดที่ขั้ว Oz ท้ายทอย', 'Live occipital EEG trace at Oz'),
  });
  const specCanvas = h('canvas', {
    class: 'scope ssv-spec-canvas',
    'aria-label': t('กราฟความถี่ FFT ที่ขั้ว Oz แสดงเส้นประที่ 7.5, 10 และ 12 Hz', 'FFT frequency spectrum at Oz showing dashed markers at 7.5, 10, and 12 Hz'),
  });

  root.append(
    h(
      'div',
      { class: 'ssv-wrap' },
      warningGate,
      h(
        'div',
        { class: 'widget-row ssv-toolbar' },
        h('span', { class: 'small muted' }, t('คลิกเลือกจ้องมองปุ่มความถี่ด้านล่าง (จำลองการโฟกัสสายตา):', 'Click a frequency target below (simulates focusing your gaze):')),
        restBtn,
        boostBtn,
        resetRoverBtn
      ),
      targetsRow,
      trackBox,
      h(
        'div',
        { class: 'ssv-plots' },
        h(
          'div',
          { class: 'ssv-plot-box' },
          h(
            'div',
            { class: 'ssv-plot-title' },
            h('strong', {}, t('กราฟสเปกตรัมความถี่ (FFT Spectrum ที่ขั้ว Oz)', 'Frequency Spectrum (FFT at Oz)')),
            h('span', { class: 'small muted' }, t('สังเกตยอดที่ f และ 2f (ฮาร์มอนิกที่ 2)', 'Watch for peaks at f and 2f (2nd harmonic)'))
          ),
          specCanvas
        ),
        h(
          'div',
          { class: 'ssv-plot-box' },
          h(
            'div',
            { class: 'ssv-plot-title' },
            h('strong', {}, t('สัญญาณสดขั้วท้ายทอย Oz (Time Domain)', 'Live Occipital Signal at Oz (Time Domain)')),
            h('span', { class: 'small muted' }, 'Visual Cortex')
          ),
          traceCanvas
        )
      )
    )
  );

  const scope = new Scope(traceCanvas, {
    channels: 1,
    fs,
    seconds: 2.5,
    labels: ['Oz'],
    colors: ['#1FA39A'],
    range: 45,
  });
  for (let i = 0; i < bufLen; i++) {
    scope.push([ozRing[(ringHead + i) % bufLen]]);
  }

  let fitSpec = null;
  fitSpec = fitCanvas(specCanvas, () => { if (fitSpec) renderSpectrum(); });

  function getOrderedOz() {
    const out = new Float32Array(bufLen);
    out.set(ozRing.subarray(ringHead), 0);
    out.set(ozRing.subarray(0, ringHead), bufLen - ringHead);
    return out;
  }

  function renderSpectrum() {
    const { ctx: c, w, h: ch } = fitSpec;
    const data = getOrderedOz();
    const sp = spectrum(data, fs, 512);

    // Detector: measure amplitude around 7.5, 10, 12 Hz
    let bestT = null;
    let bestMag = 3.2; // threshold
    for (const t of TARGETS) {
      const k1 = Math.round((t.freq * 512) / fs);
      const k2 = Math.round((t.harmonic * 512) / fs);
      const score = (sp.mags[k1] || 0) + 0.35 * (sp.mags[k2] || 0);
      if (score > bestMag) {
        bestMag = score;
        bestT = t;
      }
    }
    detectedTarget = activeTarget ? bestT : null;

    const markers = [
      { f: 7.5, label: '7.5 Hz', color: '#FF6B4A' },
      { f: 10.0, label: '10 Hz', color: '#1FA39A' },
      { f: 12.0, label: '12 Hz', color: '#F2B632' },
    ];
    if (activeTarget) {
      markers.push({
        f: activeTarget.harmonic,
        label: `2f (${activeTarget.harmonic}Hz)`,
        color: '#7A68C4',
      });
    }

    drawSpectrum(c, w, ch, sp, {
      maxF: 30,
      maxY: 22,
      bands: false,
      color: activeTarget ? activeTarget.color : INK,
      fill: 'rgba(31, 163, 154, 0.16)',
      markers,
    });
  }

  syncTargetButtons();
  updateRoverUI();
  scope.draw();
  renderSpectrum();

  const reduced = prefersReducedMotion();
  let accum = 0;

  const stopLoop = loop((dt, now) => {
    // Advance synthetic EEG samples
    const nSamples = Math.max(1, Math.min(16, Math.round(dt * fs)));
    for (let i = 0; i < nSamples; i++) {
      const v = pushSample(1 / fs);
      scope.push([v]);
    }

    // Animate targets: gentle breath/wave in Safe mode, or modulated opacity in Flicker mode
    if (!reduced) {
      for (const t of TARGETS) {
        const ringEl = ringFillEls.get(t.id);
        if (!ringEl) continue;
        if (safeMode) {
          // Smooth gentle wave pulse at scaled-down visual speed so it never strobes
          const s = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t.freq * 0.18) * now);
          ringEl.style.transform = `scale(${0.78 + s * 0.26})`;
          ringEl.style.opacity = String(0.28 + s * 0.35);
        } else {
          const s = 0.5 + 0.5 * Math.sin(2 * Math.PI * t.freq * now);
          ringEl.style.transform = 'scale(1)';
          ringEl.style.opacity = String(0.2 + s * 0.65);
        }
      }
    }

    // Move rover if a target is active and detected
    if (activeTarget && roverPos < 100) {
      roverPos = clamp(roverPos + activeTarget.speed * dt, 0, 100);
      checkFlagReached();
    }

    accum += dt;
    if (accum >= 0.05) {
      accum = 0;
      scope.draw();
      renderSpectrum();
      updateRoverUI();
    }
  });

  ctx?.say?.(
    t(
      'ลองสลับคลิกที่เป้าหมาย <b>7.5 Hz</b>, <b>10 Hz</b> และ <b>12 Hz</b> ดูสิ! เมื่อจ้องความถี่ไหน กราฟ FFT ที่ขั้ว <b>Oz</b> จะพุ่งขึ้นที่ความถี่นั้นพร้อมฮาร์มอนิก <b>2f</b> ทันที',
      'Try switching between the <b>7.5 Hz</b>, <b>10 Hz</b>, and <b>12 Hz</b> targets! Whichever frequency you gaze at, the <b>Oz</b> FFT spectrum immediately spikes at that frequency and its <b>2f</b> harmonic.'
    ),
    'idle'
  );

  return () => {
    stopLoop();
    scope.dispose();
    fitSpec.dispose();
  };
}
