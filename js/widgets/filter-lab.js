// Lesson 6 widget: Signal Processing & Filter Lab (High-pass, Low-pass, 50 Hz Notch)
import { h, clamp, seeded } from '../util.js';
import { icon } from '../ui/icons.js';
import { designFilter, filtfilt, freqResponse, spectrum, bandPower } from '../signal/dsp.js';
import { fitCanvas, drawGrid, drawTrace, drawSpectrum, INK, MONO, HEAD } from '../signal/plot.js';
import { t } from '../i18n.js';

const FS = 250;
const SECONDS = 4;
const N = FS * SECONDS; // 1000 samples

export default function mount(root, ctx) {
  root.innerHTML = '';

  // Generate fixed 4-s raw buffer:
  // 1) Pure 10 Hz alpha signal (ground truth)
  // 2) Slow baseline drift (~0.3 Hz wander)
  // 3) 50 Hz mains interference
  // 4) High-frequency EMG muscle noise (35-95 Hz)
  const rng = seeded(2026);
  const cleanAlpha = new Float32Array(N);
  const rawSignal = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    const t = i / FS;
    // 10 Hz alpha with natural waxing/waning envelope
    const env = 0.78 + 0.22 * Math.sin(2 * Math.PI * 0.5 * t);
    const alpha = 18 * env * Math.sin(2 * Math.PI * 10 * t);
    cleanAlpha[i] = alpha;

    // Slow drift (~0.25 - 0.5 Hz, ~0.3 Hz dominant)
    const drift = 42 * Math.sin(2 * Math.PI * 0.25 * t) + 18 * Math.sin(2 * Math.PI * 0.5 * t + 0.4);

    // 50 Hz mains interference
    const mains = 20 * Math.sin(2 * Math.PI * 50 * t);

    // High-frequency EMG bursts (40-90 Hz components)
    const emgEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.2 * t);
    const emg =
      emgEnv *
      (7 * Math.sin(2 * Math.PI * 42 * t + rng() * 0.5) +
        8 * Math.sin(2 * Math.PI * 63 * t + rng() * 0.5) +
        6 * Math.sin(2 * Math.PI * 78 * t) +
        (rng() * 2 - 1) * 5);

    rawSignal[i] = alpha + drift + mains + emg;
  }

  const spRaw = spectrum(rawSignal, FS, 1024);
  const baseDriftP = bandPower(spRaw, 0.1, 1.2);
  const baseLineP = bandPower(spRaw, 48, 52);
  const baseAlphaP = bandPower(spRaw, 8.5, 11.5);

  // Filter control state (starts unfiltered so user completes the mission!)
  let hpFreq = 0.0; // 0..5 Hz
  let lpFreq = 100; // 10..100 Hz
  let notchOn = false;
  let showCleanTruth = false;

  let filteredSignal = new Float32Array(rawSignal);
  let spFilt = spRaw;
  let activeSections = [];

  // --- Controls ---
  const hpOut = h('output', {}, t('0.0 Hz (ปิด)', '0.0 Hz (Off)'));
  const lpOut = h('output', {}, t('100 Hz (ไม่ตัด)', '100 Hz (Off)'));

  const hpSlider = h('input', {
    type: 'range',
    min: 0,
    max: 5,
    step: 0.1,
    value: hpFreq,
    'aria-label': t('ความถี่ตัดตัวกรองความถี่สูงผ่าน (High-pass Hz)', 'High-pass cutoff frequency (Hz)'),
    oninput: (e) => {
      hpFreq = Number(e.target.value);
      recompute(true);
    },
  });

  const lpSlider = h('input', {
    type: 'range',
    min: 10,
    max: 100,
    step: 1,
    value: lpFreq,
    'aria-label': t('ความถี่ตัดตัวกรองความถี่ต่ำผ่าน (Low-pass Hz)', 'Low-pass cutoff frequency (Hz)'),
    oninput: (e) => {
      lpFreq = Number(e.target.value);
      recompute(true);
    },
  });

  const notchCheck = h('input', {
    type: 'checkbox',
    checked: notchOn,
    onchange: (e) => {
      notchOn = e.target.checked;
      recompute(true);
    },
  });

  const truthCheck = h('input', {
    type: 'checkbox',
    checked: showCleanTruth,
    onchange: (e) => {
      showCleanTruth = e.target.checked;
      drawTimePlot();
    },
  });

  const applyPreset = (hp, lp, notch) => {
    hpFreq = hp;
    lpFreq = lp;
    notchOn = notch;
    hpSlider.value = String(hp);
    lpSlider.value = String(lp);
    notchCheck.checked = notch;
    recompute(true);
  };

  const presetRow = h('div', { class: 'ap-presets' },
    h('button', { type: 'button', class: 'chip', onclick: () => applyPreset(0, 100, false) }, t('รีเซ็ต (สัญญาณดิบยังไม่กรอง)', 'Reset (Unfiltered Raw Signal)')),
    h('button', { type: 'button', class: 'chip', onclick: () => applyPreset(1.0, 35, true) }, t('ตั้งค่าแนะนำสำหรับ EEG (HP 1 Hz + LP 35 Hz + Notch 50 Hz)', 'Recommended EEG Setup (HP 1 Hz + LP 35 Hz + Notch 50 Hz)')),
  );

  // --- Mission Checklist ---
  const mDriftEl = createMissionItem(
    t('ลบเส้นลอย (drift)', 'Remove baseline drift'),
    t('ตัดความถี่ต่ำ < 1 Hz ด้วย High-pass', 'Cut slow drift < 1 Hz with High-pass')
  );
  const mLineEl = createMissionItem(
    t('ลบไฟบ้าน 50 Hz', 'Remove 50 Hz mains hum'),
    t('เปิด Notch 50 Hz หรือตั้ง Low-pass ต่ำกว่า 40 Hz', 'Enable 50 Hz Notch or set Low-pass below 40 Hz')
  );
  const mAlphaEl = createMissionItem(
    t('เก็บคลื่นอัลฟา 10 Hz ไว้', 'Preserve 10 Hz Alpha wave'),
    t('ระวังอย่าตั้ง HP สูงเกิน หรือ LP ต่ำจนทับ 10 Hz', 'Don’t set HP too high or LP too close to 10 Hz')
  );

  function createMissionItem(title, sub) {
    const box = h('span', { class: 'fl-mission-box' });
    const detail = h('span', { class: 'fl-mission-detail' }, sub);
    const wrap = h('div', { class: 'fl-mission' },
      box,
      h('div', {},
        h('div', {}, title),
        detail
      )
    );
    return { wrap, box, detail };
  }

  // --- Canvases ---
  const timeCanvas = h('canvas', {
    class: 'fl-canvas',
    role: 'img',
    'aria-label': t('กราฟสัญญาณตามเวลา: เปรียบเทียบสัญญาณดิบกับสัญญาณหลังกรอง', 'Time-domain signal: comparing raw signal vs. filtered signal'),
  });

  const specCanvas = h('canvas', {
    class: 'fl-canvas',
    role: 'img',
    'aria-label': t('กราฟสเปกตรัมความถี่และเส้นการตอบสนองความถี่ของตัวกรอง', 'Frequency spectrum and filter frequency response curve'),
  });

  root.append(
    h('div', { class: 'wa-stack' },
      h('div', { class: 'fl-missions' },
        mDriftEl.wrap,
        mLineEl.wrap,
        mAlphaEl.wrap
      ),
      h('div', { class: 'wa-panel card-bg' },
        h('div', { class: 'wa-controls' },
          h('div', { class: 'field' },
            h('label', { class: 'ctl-label' }, t('High-pass (ตัดความถี่ต่ำ / เส้นลอย)', 'High-pass (Cut low freq / drift)'), hpOut),
            hpSlider
          ),
          h('div', { class: 'field' },
            h('label', { class: 'ctl-label' }, t('Low-pass (ตัดความถี่สูง / กล้ามเนื้อ)', 'Low-pass (Cut high freq / EMG)'), lpOut),
            lpSlider
          ),
          h('div', { class: 'wa-stack', style: { gap: '8px' } },
            h('label', { class: 'switch' },
              notchCheck,
              h('span', { class: 'track' }),
              h('span', {}, t('Notch 50 Hz (ตัดไฟบ้าน)', 'Notch 50 Hz (Cut mains hum)'))
            ),
            h('label', { class: 'switch' },
              truthCheck,
              h('span', { class: 'track' }),
              h('span', {}, t('เทียบคลื่นอัลฟา 10 Hz ต้นฉบับ', 'Overlay true 10 Hz Alpha'))
            )
          )
        ),
        presetRow
      ),
      h('div', { class: 'fl-canvases' },
        timeCanvas,
        specCanvas
      )
    )
  );

  let fitTime = null;
  let fitSpec = null;
  fitTime = fitCanvas(timeCanvas, (s) => drawTimePlot(s));
  fitSpec = fitCanvas(specCanvas, (s) => drawSpecPlot(s));

  function setMissionStatus(item, done, detailText) {
    item.wrap.className = `fl-mission ${done ? 'done' : ''}`;
    item.box.innerHTML = done ? icon('check') : '';
    if (detailText) item.detail.textContent = detailText;
  }

  function recompute(userAction = false) {
    hpOut.textContent = hpFreq > 0 ? `${hpFreq.toFixed(1)} Hz` : t('0.0 Hz (ปิด)', '0.0 Hz (Off)');
    lpOut.textContent = lpFreq < 100 ? `${lpFreq} Hz` : t('100 Hz (ไม่ตัด)', '100 Hz (Off)');

    activeSections = designFilter({
      fs: FS,
      low: hpFreq > 0 ? hpFreq : 0,
      high: lpFreq < 100 ? lpFreq : 0,
      notch: notchOn ? 50 : 0,
      notchQ: 22,
    });

    if (activeSections.length > 0) {
      filteredSignal = filtfilt(activeSections, rawSignal);
    } else {
      filteredSignal = new Float32Array(rawSignal);
    }

    spFilt = spectrum(filteredSignal, FS, 1024);

    // Evaluate mission criteria via bandPower
    const curDriftP = bandPower(spFilt, 0.1, 1.2);
    const curLineP = bandPower(spFilt, 48, 52);
    const curAlphaP = bandPower(spFilt, 8.5, 11.5);

    const driftRemovedPct = Math.round((1 - Math.min(1, curDriftP / (baseDriftP || 1))) * 100);
    const lineRemovedPct = Math.round((1 - Math.min(1, curLineP / (baseLineP || 1))) * 100);
    const alphaRetainedPct = Math.round(Math.min(1.2, curAlphaP / (baseAlphaP || 1)) * 100);

    const okDrift = driftRemovedPct >= 75;
    const okLine = lineRemovedPct >= 80;
    const okAlpha = alphaRetainedPct >= 75;

    setMissionStatus(
      mDriftEl,
      okDrift,
      okDrift
        ? t(`ลดเส้นลอยไปแล้ว ${driftRemovedPct}%`, `Baseline drift reduced by ${driftRemovedPct}%`)
        : t(`ยังเหลือเส้นลอย ~0.3 Hz (ลดไป ${driftRemovedPct}%)`, `~0.3 Hz drift remains (reduced by ${driftRemovedPct}%)`)
    );
    setMissionStatus(
      mLineEl,
      okLine,
      okLine
        ? t(`ลดสัญญาณไฟบ้าน 50 Hz ไปแล้ว ${lineRemovedPct}%`, `50 Hz mains noise reduced by ${lineRemovedPct}%`)
        : t(`ยังมีคลื่นไฟบ้าน 50 Hz (ลดไป ${lineRemovedPct}%)`, `50 Hz mains hum remains (reduced by ${lineRemovedPct}%)`)
    );
    setMissionStatus(
      mAlphaEl,
      okAlpha,
      okAlpha
        ? t(`คงพลังคลื่นอัลฟา 10 Hz ไว้ได้ ${alphaRetainedPct}%`, `10 Hz Alpha power retained at ${alphaRetainedPct}%`)
        : t(`ระวัง! คลื่นอัลฟา 10 Hz ถูกตัดเหลือแค่ ${alphaRetainedPct}%`, `Warning! 10 Hz Alpha was cut down to ${alphaRetainedPct}%`)
    );

    if (userAction) {
      if (okDrift && okLine && okAlpha) {
        ctx?.discover?.(
          'filter-lab-clean',
          t(
            `ภารกิจสำเร็จครบทั้ง 3 ข้อ! คุณกำจัดทั้ง <b>เส้นลอย (Drift)</b> และ <b>ไฟบ้าน 50 Hz</b> จนเผยให้เห็น <b>คลื่นอัลฟา 10 Hz</b> ที่ซ่อนอยู่ได้อย่างคมชัด!`,
            `All 3 missions complete! You eliminated both <b>baseline drift</b> and <b>50 Hz mains hum</b>, cleanly revealing the hidden <b>10 Hz Alpha wave</b>!`
          )
        );
      } else if (!okAlpha) {
        ctx?.say?.(
          t(
            `โอ๊ะ! คุณตั้งความถี่ตัดใกล้ <b>10 Hz</b> เกินไปจนคลื่นอัลฟาถูกเฉือนหายไปด้วย (เหลือแค่ ${alphaRetainedPct}%) ลองปรับ Low-pass ให้สูงกว่า 18 Hz และ High-pass ไม่เกิน 3 Hz ดูนะ!`,
            `Oops! Your cutoff is too close to <b>10 Hz</b>, slicing away the Alpha wave (only ${alphaRetainedPct}% left). Keep Low-pass above 18 Hz and High-pass below 3 Hz!`
          ),
          'oops'
        );
      } else if (okDrift || okLine) {
        ctx?.say?.(
          t(
            `มาถูกทางแล้ว! ${!okDrift ? 'ลองปรับ <b>High-pass</b> ขึ้นไปแถวๆ 0.5–1.5 Hz เพื่อลบเส้นลอยช้าๆ' : 'ลองเปิด <b>Notch 50 Hz</b> เพื่อตัดสัญญาณรบกวนไฟบ้าน'} อีกนิดเดียว!`,
            `On the right track! ${!okDrift ? 'Try raising <b>High-pass</b> to ~0.5–1.5 Hz to remove slow drift.' : 'Try enabling <b>Notch 50 Hz</b> to remove mains interference.'} Almost there!`
          ),
          'think'
        );
      }
    }

    drawTimePlot();
    drawSpecPlot();
  }

  function drawTimePlot(s = fitTime) {
    if (!s) return;
    const { ctx: c, w, h: ch } = s;
    if (w < 20 || ch < 20) return;

    drawGrid(c, w, ch, { step: 20, major: 4 });

    const pad = { l: 44, r: 12, t: 26, b: 24 };
    const pw = w - pad.l - pad.r;
    const ph = ch - pad.t - pad.b;

    // Legend header
    c.font = HEAD;
    c.textAlign = 'left';
    c.fillStyle = 'rgba(127, 156, 194, 0.95)';
    c.fillText(t('— สัญญาณดิบ (Raw)', '— Raw Signal'), pad.l, 17);
    c.fillStyle = '#1F2A44';
    c.fillText(t('— หลังกรอง (Filtered)', '— Filtered'), pad.l + 128, 17);
    if (showCleanTruth) {
      c.fillStyle = '#1FA39A';
      c.fillText(t('--- อัลฟา 10 Hz ต้นฉบับ', '--- True 10 Hz Alpha'), pad.l + 268, 17);
    }

    // 1. Raw trace (light slate/coral in background)
    drawTrace(c, rawSignal, {
      x: pad.l,
      y: pad.t,
      w: pw,
      h: ph,
      min: -90,
      max: 90,
      color: 'rgba(255, 107, 74, 0.35)',
      lw: 1.5,
    });

    // 2. Optional clean 10 Hz ground truth
    if (showCleanTruth) {
      c.save();
      c.setLineDash([4, 3]);
      drawTrace(c, cleanAlpha, {
        x: pad.l,
        y: pad.t,
        w: pw,
        h: ph,
        min: -90,
        max: 90,
        color: '#1FA39A',
        lw: 2,
      });
      c.restore();
    }

    // 3. Filtered trace (crisp ink foreground)
    drawTrace(c, filteredSignal, {
      x: pad.l,
      y: pad.t,
      w: pw,
      h: ph,
      min: -90,
      max: 90,
      color: INK,
      lw: 2.1,
    });

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
    c.fillText('+80', pad.l - 5, pad.t + 10);
    c.fillText('0', pad.l - 5, pad.t + ph / 2 + 4);
    c.fillText('-80', pad.l - 5, pad.t + ph - 2);

    c.textAlign = 'center';
    for (let s = 0; s <= 4; s++) {
      c.fillText(`${s}s`, pad.l + (s / 4) * pw, ch - 7);
    }
  }

  function drawSpecPlot(s = fitSpec) {
    if (!s) return;
    const { ctx: c, w, h: ch } = s;
    if (w < 20 || ch < 20) return;

    const maxF = 65; // Shows 0.3 Hz drift, 10 Hz alpha, 50 Hz mains, and EMG up to 65 Hz
    const maxY = 26;
    const pad = { l: 36, r: 34, t: 24, b: 24 };

    // Draw filtered spectrum using shared helper
    const { X, Y } = drawSpectrum(c, w, ch, spFilt, {
      maxF,
      maxY,
      pad,
      color: INK,
      fill: 'rgba(31, 163, 154, 0.25)',
      bands: true,
      markers: [
        { f: 10, label: 'Alpha 10Hz', color: '#1FA39A' },
        { f: 50, label: t('ไฟบ้าน 50Hz', 'Mains 50Hz'), color: '#FF6B4A' },
      ],
    });

    const pw = w - pad.l - pad.r;
    const ph = ch - pad.t - pad.b;

    // Overlay ghost Raw spectrum (before filtering) for direct before/after comparison
    c.save();
    c.strokeStyle = 'rgba(255, 107, 74, 0.5)';
    c.setLineDash([3, 3]);
    c.lineWidth = 1.6;
    c.beginPath();
    for (let i = 0; i < spRaw.freqs.length && spRaw.freqs[i] <= maxF; i++) {
      const px = X(spRaw.freqs[i]);
      const py = Y(spRaw.mags[i]);
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke();
    c.restore();

    // Overlay Filter Frequency Response Curve |H(f)|^2 (since filtfilt is forward-backward)
    c.save();
    c.strokeStyle = '#FF6B4A';
    c.lineWidth = 2.4;
    c.beginPath();
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const f = (i / steps) * maxF;
      const mag = activeSections.length ? freqResponse(activeSections, FS, f) : 1;
      // filtfilt applies the chain twice
      const gain = clamp(mag * mag, 0, 1.05);
      const px = X(f);
      const py = pad.t + ph - gain * ph;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke();
    c.restore();

    // Right-hand axis label for Filter Gain |H(f)|
    c.fillStyle = '#FF6B4A';
    c.font = MONO;
    c.textAlign = 'right';
    c.fillText('100%', w - 2, pad.t + 10);
    c.fillText('0%', w - 2, pad.t + ph);

    c.font = HEAD;
    c.textAlign = 'left';
    c.fillStyle = INK;
    c.fillText(t('สเปกตรัมความถี่ (ก่อน/หลัง) + เส้นตัวกรองสีส้ม |H(f)|', 'Frequency Spectrum (Before/After) + Orange Filter Curve |H(f)|'), pad.l, 15);
  }

  recompute(false);

  ctx?.say?.(
    t(
      'สัญญาณดิบเส้นนี้มีทั้ง <b>เส้นลอยช้าๆ (~0.3 Hz)</b>, <b>ไฟบ้าน 50 Hz</b> และ <b>คลื่นกล้ามเนื้อ (EMG)</b> ปนอยู่! ลองปรับ <b>High-pass</b>, <b>Low-pass</b> และเปิด <b>Notch 50 Hz</b> เพื่อติ๊กภารกิจให้ครบทั้ง 3 ข้อกัน!',
      'This raw signal is contaminated with <b>slow drift (~0.3 Hz)</b>, <b>50 Hz mains hum</b>, and <b>muscle noise (EMG)</b>! Adjust <b>High-pass</b>, <b>Low-pass</b>, and <b>Notch 50 Hz</b> to check off all 3 missions!'
    ),
    'idle'
  );

  return () => {
    fitTime.dispose();
    fitSpec.dispose();
  };
}
