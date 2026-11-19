// Lesson 11 widget: LDA + CSP Playground — 2D log-variance feature space, interactive points, live Fisher LDA, Non-stationarity shift & Recalibrate.
import { h, clamp, seeded } from '../util.js';
import { icon } from '../ui/icons.js';
import { gaussian } from '../signal/dsp.js';
import { fitCanvas, drawGrid, INK, MONO, HEAD } from '../signal/plot.js';
import { t } from '../i18n.js';

// Feature coordinate space: [-3.5, +3.5] on both axes (centered log-variance of Mu at C3 and C4)
const MIN_V = -3.5;
const MAX_V = 3.5;

function solveLDA(points) {
  const c0 = points.filter((p) => p.cls === 0); // Left hand (coral)
  const c1 = points.filter((p) => p.cls === 1); // Right hand (teal)
  if (c0.length < 2 || c1.length < 2) {
    return { wx: 1, wy: -1, b: 0, m0: [1, -1], m1: [-1, 1] };
  }

  const mean = (arr) => {
    let sx = 0, sy = 0;
    for (const p of arr) { sx += p.x; sy += p.y; }
    return [sx / arr.length, sy / arr.length];
  };
  const m0 = mean(c0);
  const m1 = mean(c1);

  // Pooled covariance matrix [[sxx, sxy], [sxy, syy]]
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of c0) {
    const dx = p.x - m0[0], dy = p.y - m0[1];
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  }
  for (const p of c1) {
    const dx = p.x - m1[0], dy = p.y - m1[1];
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  }
  const denom = Math.max(1, c0.length + c1.length - 2);
  sxx = sxx / denom + 0.08; // shrinkage regularization
  sxy = sxy / denom;
  syy = syy / denom + 0.08;

  const det = sxx * syy - sxy * sxy || 1e-6;
  const invXX = syy / det;
  const invXY = -sxy / det;
  const invYY = sxx / det;

  // w = Sigma^-1 (m1 - m0)
  const dx = m1[0] - m0[0];
  const dy = m1[1] - m0[1];
  let wx = invXX * dx + invXY * dy;
  let wy = invXY * dx + invYY * dy;
  const norm = Math.hypot(wx, wy) || 1;
  wx /= norm;
  wy /= norm;

  const midX = 0.5 * (m0[0] + m1[0]);
  const midY = 0.5 * (m0[1] + m1[1]);
  const b = -(wx * midX + wy * midY);

  return { wx, wy, b, m0, m1 };
}

export default function mount(root, ctx) {
  root.innerHTML = '';

  let seed = 19;
  let noiseSpread = 0.65;
  let addClass = 0; // 0 = มือซ้าย (Coral), 1 = มือขวา (Teal)
  let nonStationary = false;
  let recalibratedAfterShift = false;
  let discoveredNonStat = false;
  let dragPoint = null;

  let basePoints = []; // unshifted points
  let points = [];     // active displayed points
  let model = null;    // active LDA boundary { wx, wy, b, m0, m1 }

  function generateDataset() {
    const rng = seeded(seed++);
    const g = gaussian(rng);
    basePoints = [];
    // Class 0: Left hand -> C3 high (+1.2), C4 low (-1.2)
    for (let i = 0; i < 20; i++) {
      basePoints.push({
        cls: 0,
        bx: 1.15 + g() * noiseSpread,
        by: -1.15 + g() * noiseSpread,
      });
    }
    // Class 1: Right hand -> C3 low (-1.2), C4 high (+1.2)
    for (let i = 0; i < 20; i++) {
      basePoints.push({
        cls: 1,
        bx: -1.15 + g() * noiseSpread,
        by: 1.15 + g() * noiseSpread,
      });
    }
    applyShiftAndSync(true);
  }

  function applyShiftAndSync(refit = false) {
    // Non-stationarity shifts electrode baseline offset (e.g. +1.35 on C3, -1.15 on C4)
    const sx = nonStationary ? -1.45 : 0;
    const sy = nonStationary ? 1.25 : 0;
    points = basePoints.map((p) => ({
      cls: p.cls,
      x: clamp(p.bx + sx, MIN_V + 0.2, MAX_V - 0.2),
      y: clamp(p.by + sy, MIN_V + 0.2, MAX_V - 0.2),
      ref: p,
    }));
    if (refit || !model) {
      model = solveLDA(points);
    }
  }

  function computeAccuracy() {
    if (!model || !points.length) return { acc: 100, wrong: 0 };
    let right = 0;
    for (const p of points) {
      const score = model.wx * p.x + model.wy * p.y + model.b;
      const pred = score >= 0 ? 1 : 0;
      if (pred === p.cls) right++;
    }
    return {
      acc: Math.round((right / points.length) * 100),
      wrong: points.length - right,
    };
  }

  // UI elements
  const accBadge = h('div', { class: 'lda-acc-badge' });
  const eqReadout = h('div', { class: 'readout small lda-eq' });

  const noiseOut = h('output', {}, noiseSpread.toFixed(2));
  const noiseSlider = h('input', {
    type: 'range',
    min: 0.3,
    max: 1.4,
    step: 0.05,
    value: noiseSpread,
    oninput: (e) => {
      noiseSpread = Number(e.target.value);
      noiseOut.textContent = noiseSpread.toFixed(2);
      generateDataset();
      updateUI();
    },
  });

  const classSegLeft = h(
    'button',
    {
      'aria-pressed': 'true',
      onclick: () => {
        addClass = 0;
        classSegLeft.setAttribute('aria-pressed', 'true');
        classSegRight.setAttribute('aria-pressed', 'false');
      },
    },
    t('คลิกเพิ่มจุด: มือซ้าย (Coral)', 'Click to add: Left Hand (Coral)')
  );
  const classSegRight = h(
    'button',
    {
      'aria-pressed': 'false',
      onclick: () => {
        addClass = 1;
        classSegLeft.setAttribute('aria-pressed', 'false');
        classSegRight.setAttribute('aria-pressed', 'true');
      },
    },
    t('คลิกเพิ่มจุด: มือขวา (Teal)', 'Click to add: Right Hand (Teal)')
  );

  const nonStatCheck = h('input', {
    type: 'checkbox',
    checked: false,
    onchange: (e) => {
      nonStationary = e.target.checked;
      recalibratedAfterShift = false;
      // Keep the OLD model when shifting to New Day so the user sees accuracy drop!
      applyShiftAndSync(!nonStationary);
      updateUI();
      if (nonStationary) {
        const { acc } = computeAccuracy();
        ctx?.say?.(
          t(
            `สวมหมวกวันใหม่แล้ว! ความต้านทานผิวหนังและตำแหน่งอิเล็กโทรดเลื่อนไปเล็กน้อย (<b>Non-stationarity</b>) ทำให้เส้นแบ่ง LDA เดิมทายผิดเพียบ ความแม่นยำร่วงเหลือ <b>${acc}%</b> — ลองกดปุ่ม <b>"ฝึกโมเดลใหม่ (Recalibrate)"</b> ดูสิ!`,
            `New day headset session! Skin impedance and electrode positions shifted slightly (<b>Non-stationarity</b>), causing the old LDA boundary to misclassify points and dropping accuracy to <b>${acc}%</b> — try clicking <b>"Recalibrate"</b>!`
          ),
          'oops'
        );
      } else {
        ctx?.say?.(t('กลับมาใช้ข้อมูลวันแรกที่ตรงกับโมเดลตั้งต้นแล้ว', 'Returned to Day 1 data aligned with the initial calibration model.'), 'idle');
      }
    },
  });

  const recalBtn = h(
    'button',
    {
      class: 'btn sm teal',
      onclick: () => {
        model = solveLDA(points);
        recalibratedAfterShift = true;
        updateUI();
        const { acc } = computeAccuracy();
        if (nonStationary && !discoveredNonStat) {
          discoveredNonStat = true;
          ctx?.discover?.(
            'lda-recalibrate',
            t(
              `ฝึกโมเดลใหม่สำเร็จ! ความแม่นยำพุ่งกลับมาที่ <b>${acc}%</b> นี่คือเหตุผลว่าทำไมระบบ BCI จริงต้องมีช่วง Calibration สั้นๆ ตอนเริ่มสวมหมวกทุกครั้ง`,
              `Model recalibrated! Accuracy jumped back to <b>${acc}%</b>. This is why real-world BCI systems run a short calibration session every time the user puts on the headset.`
            )
          );
        } else {
          ctx?.say?.(
            t(
              `คำนวณเส้นแบ่ง LDA ใหม่ให้เข้ากับกลุ่มข้อมูลปัจจุบันแล้ว (ความแม่นยำ <b>${acc}%</b>)`,
              `Recomputed the LDA decision boundary to fit the current data points (Accuracy <b>${acc}%</b>).`
            ),
            'happy'
          );
        }
      },
    },
    h('span', { html: icon('rotate') }),
    t('ฝึกโมเดลใหม่ (Recalibrate)', 'Recalibrate Model')
  );

  const resampleBtn = h(
    'button',
    {
      class: 'btn sm ghost',
      onclick: () => {
        nonStationary = false;
        nonStatCheck.checked = false;
        recalibratedAfterShift = false;
        generateDataset();
        updateUI();
        ctx?.say?.(
          t(
            'สุ่มกลุ่มตัวอย่าง Trial ใหม่เรียบร้อย ลองลากจุดบนกราฟหรือคลิกเพิ่มจุดเพื่อดูเส้นแบ่ง LDA ขยับตามสดๆ ได้เลย',
            'Resampled new trials! Try dragging any point or clicking empty space to add points and watch the LDA boundary update live.'
          ),
          'idle'
        );
      },
    },
    h('span', { html: icon('reset') }),
    t('สุ่มข้อมูลใหม่', 'Resample Data')
  );

  const scatterCanvas = h('canvas', {
    class: 'scope lda-canvas',
    'aria-label': t(
      'กราฟกระจาย 2 มิติ แสดงค่า Log-Variance ของ C3 และ C4 พร้อมเส้นแบ่ง LDA',
      '2D scatter plot showing C3 and C4 log-variance features with LDA decision boundary'
    ),
  });

  // Visual CSP explanation card
  const cspCard = h(
    'div',
    { class: 'lda-csp-card card flat' },
    h(
      'div',
      { class: 'lda-csp-head' },
      h('span', { class: 'chip', style: { background: 'var(--mustard-soft)' } }, 'CSP + LDA Pipeline'),
      h('h4', {}, t('ทำไมต้องใช้ CSP (Common Spatial Patterns) คู่กับ LDA?', 'Why pair CSP (Common Spatial Patterns) with LDA?'))
    ),
    h(
      'div',
      { class: 'lda-csp-flow' },
      h(
        'div',
        { class: 'lda-csp-step' },
        h('strong', {}, t('1. สัญญาณดิบหลายช่อง (Raw EEG)', '1. Multi-channel Raw EEG')),
        h('p', { class: 'small muted' }, t('คลื่นสมองจากหลายอิเล็กโทรดปะปนกันผ่านกะโหลกศีรษะ (Volume conduction) แยกคลาสยาก', 'Signals from many electrodes mix through the skull (volume conduction), making classes hard to separate'))
      ),
      h('div', { class: 'lda-csp-arrow', html: icon('arrowRight') }),
      h(
        'div',
        { class: 'lda-csp-step highlight' },
        h('strong', {}, t('2. ตัวกรองเชิงพื้นที่ CSP', '2. CSP Spatial Filter')),
        h('p', { class: 'small muted' }, t('ให้น้ำหนักแต่ละช่อง w เพื่อขยายความแปรปรวน (Variance) ของ "มือซ้าย" ให้กว้างสุด และบีบ "มือขวา" ให้แคบสุด', 'Weights each channel w to maximize the variance of "Left Hand" while minimizing the variance of "Right Hand"'))
      ),
      h('div', { class: 'lda-csp-arrow', html: icon('arrowRight') }),
      h(
        'div',
        { class: 'lda-csp-step' },
        h('strong', {}, t('3. ค่า Log-Variance → LDA', '3. Log-Variance Features → LDA')),
        h('p', { class: 'small muted' }, t('แปลงเป็นจุด 2 มิติแบบกราฟข้างบน แล้วลากเส้นตรง LDA แบ่งสองฝั่งด้วยสมการ w·x + b = 0', 'Projects trials into 2D points as shown above, then fits a linear LDA boundary w·x + b = 0'))
      )
    )
  );

  root.append(
    h(
      'div',
      { class: 'lda-wrap' },
      h(
        'div',
        { class: 'lda-main' },
        h(
          'div',
          { class: 'lda-plot-col' },
          h(
            'div',
            { class: 'lda-top-bar' },
            accBadge,
            h(
              'div',
              { class: 'lda-legend' },
              h('span', { class: 'chip' }, h('span', { class: 'dot', style: { background: '#FF6B4A' } }), t('คิดกำมือซ้าย (C4 ลด)', 'Imagine Left Hand (C4 ERD)')),
              h('span', { class: 'chip' }, h('span', { class: 'dot', style: { background: '#1FA39A' } }), t('คิดกำมือขวา (C3 ลด)', 'Imagine Right Hand (C3 ERD)'))
            )
          ),
          scatterCanvas,
          h('p', { class: 'small muted', style: { margin: '6px 0 0' } }, t('เคล็ดลับ: ลากจุดใดก็ได้เพื่อย้ายตำแหน่ง หรือคลิกพื้นที่ว่างเพื่อเพิ่มจุดข้อมูลใหม่', 'Tip: Drag any point to move it, or click empty space on the plot to add a new data point'))
        ),
        h(
          'div',
          { class: 'lda-ctl-col' },
          h(
            'div',
            { class: 'field' },
            h('label', { class: 'ctl-label' }, t('ความปะปนของสัญญาณ (Noise / Overlap)', 'Signal Noise / Overlap'), noiseOut),
            noiseSlider
          ),
          h('div', { class: 'seg lda-seg' }, classSegLeft, classSegRight),
          h(
            'div',
            { class: 'lda-nonstat-box card flat' },
            h(
              'label',
              { class: 'switch' },
              nonStatCheck,
              h('span', { class: 'track' }),
              h('span', {}, t('สวมหมวกวันใหม่ (Non-stationarity)', 'New Day Session (Non-stationarity)'))
            ),
            h(
              'p',
              { class: 'small muted', style: { margin: '8px 0 10px' } },
              t(
                'จำลองเมื่อผู้ใช้ถอดหมวกแล้วมาใส่ใหม่ในวันถัดไป สัญญาณจะเลื่อนออกจากตำแหน่งเดิมจนเส้นแบ่งเก่าทายผิด',
                'Simulates taking off the headset and wearing it again the next day — features drift so the old boundary misclassifies'
              )
            ),
            h('div', { class: 'widget-row' }, recalBtn, resampleBtn)
          ),
          eqReadout
        )
      ),
      cspCard
    )
  );

  let fit = null;
  fit = fitCanvas(scatterCanvas, () => { if (fit) drawScatter(); });

  function getPad() {
    const { w, h: ch } = fit;
    const pad = { l: 48, r: 18, t: 18, b: 36 };
    return {
      w,
      ch,
      pad,
      pw: Math.max(10, w - pad.l - pad.r),
      ph: Math.max(10, ch - pad.t - pad.b),
    };
  }

  function toPx(vx, vy) {
    const { pad, pw, ph } = getPad();
    return [
      pad.l + ((vx - MIN_V) / (MAX_V - MIN_V)) * pw,
      pad.t + ph - ((vy - MIN_V) / (MAX_V - MIN_V)) * ph,
    ];
  }

  function toVal(px, py) {
    const { pad, pw, ph } = getPad();
    const vx = MIN_V + ((px - pad.l) / pw) * (MAX_V - MIN_V);
    const vy = MIN_V + ((pad.t + ph - py) / ph) * (MAX_V - MIN_V);
    return [clamp(vx, MIN_V + 0.15, MAX_V - 0.15), clamp(vy, MIN_V + 0.15, MAX_V - 0.15)];
  }

  function updateUI() {
    const { acc, wrong } = computeAccuracy();
    const staleWarn = nonStationary && !recalibratedAfterShift;
    accBadge.className = `lda-acc-badge ${acc >= 85 ? 'good' : 'warn'}`;
    accBadge.innerHTML = t(
      `${icon('target')} <span>ความแม่นยำ LDA: <b>${acc}%</b> (ทายผิด ${wrong}/${points.length} จุด)${staleWarn ? ' · โมเดลยังไม่ปรับเทียบวันใหม่!' : ''}</span>`,
      `${icon('target')} <span>LDA Accuracy: <b>${acc}%</b> (misclassified ${wrong}/${points.length})${staleWarn ? ' · Model not recalibrated for new day!' : ''}</span>`
    );

    if (model) {
      eqReadout.innerHTML = t(
        `<b>สมการเส้นแบ่ง LDA:</b> <code>${model.wx.toFixed(2)}·x ${model.wy >= 0 ? '+' : '−'} ${Math.abs(model.wy).toFixed(2)}·y ${model.b >= 0 ? '+' : '−'} ${Math.abs(model.b).toFixed(2)} = 0</code>`,
        `<b>LDA Boundary Equation:</b> <code>${model.wx.toFixed(2)}·x ${model.wy >= 0 ? '+' : '−'} ${Math.abs(model.wy).toFixed(2)}·y ${model.b >= 0 ? '+' : '−'} ${Math.abs(model.b).toFixed(2)} = 0</code>`
      );
    }
    drawScatter();
  }

  function drawScatter() {
    const { ctx: c } = fit;
    const { w, ch, pad, pw, ph } = getPad();
    drawGrid(c, w, ch, { step: 22, major: 5 });

    if (!model) return;

    // 1) Shaded decision regions inside plot box
    c.save();
    c.beginPath();
    c.rect(pad.l, pad.t, pw, ph);
    c.clip();

    const stepPx = 10;
    for (let py = pad.t; py < pad.t + ph; py += stepPx) {
      for (let px = pad.l; px < pad.l + pw; px += stepPx) {
        const [vx, vy] = toVal(px + stepPx / 2, py + stepPx / 2);
        const s = model.wx * vx + model.wy * vy + model.b;
        c.fillStyle = s >= 0 ? 'rgba(31, 163, 154, 0.11)' : 'rgba(255, 107, 74, 0.11)';
        c.fillRect(px, py, stepPx + 1, stepPx + 1);
      }
    }

    // 2) Decision boundary line (wx * x + wy * y + b = 0)
    const linePts = [];
    for (const vx of [MIN_V, MAX_V]) {
      if (Math.abs(model.wy) > 1e-4) {
        const vy = -(model.wx * vx + model.b) / model.wy;
        if (vy >= MIN_V - 2 && vy <= MAX_V + 2) linePts.push(toPx(vx, vy));
      }
    }
    if (linePts.length < 2 && Math.abs(model.wx) > 1e-4) {
      for (const vy of [MIN_V, MAX_V]) {
        const vx = -(model.wy * vy + model.b) / model.wx;
        linePts.push(toPx(vx, vy));
      }
    }
    if (linePts.length >= 2) {
      c.strokeStyle = INK;
      c.lineWidth = 2.8;
      c.setLineDash([7, 5]);
      c.beginPath();
      c.moveTo(linePts[0][0], linePts[0][1]);
      c.lineTo(linePts[1][0], linePts[1][1]);
      c.stroke();
      c.setLineDash([]);
    }

    // 3) Class centroids (means)
    for (const [m, color, lbl] of [
      [model.m0, '#FF6B4A', t('μ ซ้าย', 'μ Left')],
      [model.m1, '#1FA39A', t('μ ขวา', 'μ Right')],
    ]) {
      const [mx, my] = toPx(m[0], m[1]);
      c.fillStyle = color;
      c.strokeStyle = INK;
      c.lineWidth = 2.2;
      c.beginPath();
      c.rect(mx - 7, my - 7, 14, 14);
      c.fill();
      c.stroke();

      c.fillStyle = INK;
      c.font = MONO;
      c.textAlign = 'left';
      c.fillText(lbl, mx + 10, my + 4);
    }

    // 4) Data points
    for (const p of points) {
      const [px, py] = toPx(p.x, p.y);
      const score = model.wx * p.x + model.wy * p.y + model.b;
      const pred = score >= 0 ? 1 : 0;
      const isWrong = pred !== p.cls;

      if (isWrong) {
        c.strokeStyle = '#FF6B4A';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(px, py, 10, 0, Math.PI * 2);
        c.stroke();
      }

      c.fillStyle = p.cls === 0 ? '#FF6B4A' : '#1FA39A';
      c.strokeStyle = INK;
      c.lineWidth = 1.8;
      c.beginPath();
      c.arc(px, py, 6, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.restore();

    // Axes & labels
    c.strokeStyle = INK;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(pad.l, pad.t);
    c.lineTo(pad.l, pad.t + ph);
    c.lineTo(pad.l + pw, pad.t + ph);
    c.stroke();

    c.fillStyle = INK;
    c.font = HEAD;
    c.textAlign = 'center';
    c.fillText(t('แกน X: Log-Variance คลื่น Mu ที่ขั้ว C3 (สมองซีกซ้าย)', 'X-Axis: Mu Log-Variance at C3 (Left Hemisphere)'), pad.l + pw / 2, ch - 8);

    c.save();
    c.translate(15, pad.t + ph / 2);
    c.rotate(-Math.PI / 2);
    c.textAlign = 'center';
    c.fillText(t('แกน Y: Log-Variance ที่ C4 (ซีกขวา)', 'Y-Axis: Log-Variance at C4 (Right)'), 0, 0);
    c.restore();
  }

  // Pointer drag / click-to-add on scatter canvas
  function pointNear(px, py) {
    let best = null, bestD = 14;
    for (const p of points) {
      const [x, y] = toPx(p.x, p.y);
      const d = Math.hypot(px - x, py - y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  const onPointerDown = (e) => {
    const r = scatterCanvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const hit = pointNear(px, py);
    if (hit) {
      dragPoint = hit;
      scatterCanvas.setPointerCapture?.(e.pointerId);
    } else {
      // Add new point at clicked position
      const [vx, vy] = toVal(px, py);
      const sx = nonStationary ? -1.45 : 0;
      const sy = nonStationary ? 1.25 : 0;
      basePoints.push({ cls: addClass, bx: vx - sx, by: vy - sy });
      applyShiftAndSync(!nonStationary || recalibratedAfterShift);
      updateUI();
    }
  };

  const onPointerMove = (e) => {
    const r = scatterCanvas.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    if (!dragPoint) {
      scatterCanvas.style.cursor = pointNear(px, py) ? 'grab' : 'crosshair';
      return;
    }
    const [vx, vy] = toVal(px, py);
    const sx = nonStationary ? -1.45 : 0;
    const sy = nonStationary ? 1.25 : 0;
    dragPoint.ref.bx = vx - sx;
    dragPoint.ref.by = vy - sy;
    applyShiftAndSync(!nonStationary || recalibratedAfterShift);
    updateUI();
  };

  const onPointerUp = () => {
    dragPoint = null;
  };

  scatterCanvas.addEventListener('pointerdown', onPointerDown);
  scatterCanvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  generateDataset();
  updateUI();
  ctx?.say?.(
    t(
      'ลองลากจุดข้อมูลบนกราฟ หรือเปิดสวิตช์ <b>"สวมหมวกวันใหม่ (Non-stationarity)"</b> เพื่อดูว่าทำไมโมเดล BCI ถึงต้องมีการทำ <b>Recalibration</b>!',
      'Try dragging data points on the plot or toggling <b>"New Day Session (Non-stationarity)"</b> to see why BCI models need <b>Recalibration</b>!'
    ),
    'idle'
  );

  return () => {
    scatterCanvas.removeEventListener('pointerdown', onPointerDown);
    scatterCanvas.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    fit.dispose();
  };
}
