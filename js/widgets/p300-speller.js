// Lesson 8 widget: P300 Speller — 6x6 Farwell-Donchin matrix, ERP averaging (0–800 ms), SNR & ITR tradeoff.
import { h, clamp, prefersReducedMotion } from '../util.js';
import { icon } from '../ui/icons.js';
import { EEGSynth, shapes } from '../signal/dsp.js';
import { fitCanvas, drawGrid, INK, MONO, HEAD } from '../signal/plot.js';
import { t } from '../i18n.js';

const CHARS = [
  'A', 'B', 'C', 'D', 'E', 'F',
  'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R',
  'S', 'T', 'U', 'V', 'W', 'X',
  'Y', 'Z', '1', '2', '3', '4',
  '5', '6', '7', '8', '9', '_',
];

const FS = 200; // 200 Hz for 0..800 ms (160 samples per epoch)
const EPOCH_LEN = Math.round(0.8 * FS); // 160 samples
const WIN_START = Math.round(0.25 * FS); // 250 ms
const WIN_END = Math.round(0.45 * FS);   // 450 ms

export default function mount(root, ctx) {
  root.innerHTML = '';

  let targetIdx = 1; // 'B' (for B-C-I)
  let maxReps = 5;
  let running = false;
  let timerId = null;
  let spelledText = '';
  let hasDiscovered = false;

  // Epoch accumulators
  let targetSum = new Float32Array(EPOCH_LEN);
  let nonTargetSum = new Float32Array(EPOCH_LEN);
  let targetCount = 0;
  let nonTargetCount = 0;
  let rowScores = new Float32Array(6);
  let colScores = new Float32Array(6);
  let rowCounts = new Uint16Array(6);
  let colCounts = new Uint16Array(6);
  let currentRep = 0;
  let activeFlash = null; // { kind: 'row'|'col', index: 0..5, isTarget: bool }
  let predictedIdx = null;
  let confidence = 0;

  const synth = new EEGSynth({
    fs: FS,
    amps: { delta: 5, theta: 5, alpha: 6, beta: 4, gamma: 1 },
    noise: 3.2,
    seed: 108,
  });

  // 6x6 Matrix UI
  const cells = [];
  const matrixEl = h('div', { class: 'p3-grid', role: 'grid', 'aria-label': t('ตาราง P300 Speller 6 คูณ 6', '6 by 6 P300 Speller grid') });

  CHARS.forEach((ch, idx) => {
    const r = Math.floor(idx / 6);
    const c = idx % 6;
    const cell = h(
      'button',
      {
        class: 'p3-cell',
        dataset: { idx, r, c },
        title: t(`เลือกเป้าหมาย "${ch}" (แถว ${r + 1}, คอลัมน์ ${c + 1})`, `Select target "${ch}" (Row ${r + 1}, Column ${c + 1})`),
        onclick: () => {
          if (running) return;
          targetIdx = idx;
          predictedIdx = null;
          syncMatrix();
          ctx?.say?.(
            t(
              `ตั้งเป้าหมายที่ตัวอักษร <b>"${ch}"</b> (แถวที่ ${r + 1}, คอลัมน์ที่ ${c + 1}) จ้องตัวอักษรนี้ไว้แล้วกด <b>เริ่มสะกดคำ</b> ได้เลย!`,
              `Target set to character <b>"${ch}"</b> (Row ${r + 1}, Column ${c + 1}). Focus your gaze on this character and click <b>Start Spelling</b>!`
            ),
            'idle'
          );
        },
      },
      ch
    );
    cells.push(cell);
    matrixEl.append(cell);
  });

  function syncMatrix() {
    const tRow = Math.floor(targetIdx / 6);
    const tCol = targetIdx % 6;
    cells.forEach((cell, idx) => {
      const r = Math.floor(idx / 6);
      const c = idx % 6;
      const isFlash =
        activeFlash &&
        ((activeFlash.kind === 'row' && activeFlash.index === r) ||
          (activeFlash.kind === 'col' && activeFlash.index === c));
      cell.classList.toggle('target', idx === targetIdx);
      cell.classList.toggle('flash', Boolean(isFlash));
      cell.classList.toggle('flash-hit', Boolean(isFlash && idx === targetIdx));
      cell.classList.toggle('predicted', idx === predictedIdx);
      cell.setAttribute('aria-pressed', String(idx === targetIdx));
    });
  }

  // Controls
  const repOut = h('output', {}, t(`${maxReps} รอบ`, `${maxReps} reps`));
  const itrReadout = h('div', { class: 'readout small p3-itr' });

  function updateITRReadout() {
    const flashes = maxReps * 12;
    const secPerChar = (flashes * 0.2).toFixed(1);
    const snrGain = Math.sqrt(maxReps * 2).toFixed(1);
    const estAcc = Math.round(clamp(52 + 46 * (1 - Math.exp(-maxReps / 2.2)), 50, 99));
    itrReadout.innerHTML = t(
      `<b>ITR Tradeoff:</b> ${maxReps} รอบ = กะพริบ ${flashes} ครั้ง (~${secPerChar} วินาที/ตัวอักษร) · SNR ดีขึ้น <b>×${snrGain}</b> · ความแม่นยำคาดการณ์ ~<b>${estAcc}%</b>`,
      `<b>ITR Tradeoff:</b> ${maxReps} reps = ${flashes} flashes (~${secPerChar} s/char) · SNR gain <b>×${snrGain}</b> · Est. accuracy ~<b>${estAcc}%</b>`
    );
  }
  updateITRReadout();

  const repSlider = h('input', {
    type: 'range',
    min: 1,
    max: 10,
    step: 1,
    value: maxReps,
    oninput: (e) => {
      maxReps = Number(e.target.value);
      repOut.textContent = t(`${maxReps} รอบ`, `${maxReps} reps`);
      updateITRReadout();
    },
  });

  const startBtn = h(
    'button',
    {
      class: 'btn primary',
      onclick: () => (running ? stopSequence(true) : startSequence(false)),
    },
    h('span', { html: icon('play') }),
    t('เริ่มสะกดคำ (Flash)', 'Start Spelling (Flash)')
  );

  const instantBtn = h(
    'button',
    {
      class: 'btn sm teal',
      onclick: () => {
        if (running) stopSequence(true);
        startSequence(true);
      },
    },
    h('span', { html: icon('zap') }),
    t('คำนวณทันที (Fast)', 'Instant Decode (Fast)')
  );

  const clearWordBtn = h(
    'button',
    {
      class: 'btn sm ghost',
      onclick: () => {
        spelledText = '';
        resetAccumulators();
        syncStatus();
        drawERP();
      },
    },
    h('span', { html: icon('reset') }),
    t('ล้างคำ', 'Clear Text')
  );

  // Word output banner + status
  const wordDisplay = h('div', { class: 'p3-word-box' });
  const statusChip = h('span', { class: 'chip' }, t('พร้อมเริ่ม', 'Ready'));

  function syncStatus() {
    const targetChar = CHARS[targetIdx];
    const tRow = Math.floor(targetIdx / 6) + 1;
    const tCol = (targetIdx % 6) + 1;
    wordDisplay.innerHTML = `
      <div class="p3-word-item">
        <span class="small muted">${t('เป้าหมายที่เพ่งมอง:', 'Target Character:')}</span>
        <strong class="p3-badge target">${targetChar} <small>(R${tRow}, C${tCol})</small></strong>
      </div>
      <div class="p3-word-item">
        <span class="small muted">${t('ทายผลล่าสุด:', 'Last Prediction:')}</span>
        <strong class="p3-badge pred">${predictedIdx != null ? `${CHARS[predictedIdx]} (${confidence}%)` : '—'}</strong>
      </div>
      <div class="p3-word-item p3-spelled">
        <span class="small muted">${t('ข้อความที่สะกดได้:', 'Spelled Text:')}</span>
        <code class="p3-spelled-text">${spelledText || t('ยังไม่มี (กดเริ่มสะกดคำ)', 'None yet (press Start Spelling)')}</code>
      </div>
    `;
  }

  // ERP Canvas (0–800 ms at Pz) + Row/Col bar chart canvas
  const erpCanvas = h('canvas', {
    class: 'scope p3-erp-canvas',
    'aria-label': t(
      'กราฟเฉลี่ยคลื่น ERP ที่ขั้ว Pz ช่วง 0 ถึง 800 มิลลิวินาที เปรียบเทียบ Target และ Non-target',
      'Averaged ERP waveform at Pz from 0 to 800 ms comparing Target vs Non-target'
    ),
  });
  const barsCanvas = h('canvas', {
    class: 'scope p3-bars-canvas',
    'aria-label': t(
      'คะแนนแอมพลิจูดเฉลี่ย 250–450 ms ของแต่ละแถวและคอลัมน์',
      'Mean amplitude score (250–450 ms) for each row and column'
    ),
  });

  root.append(
    h(
      'div',
      { class: 'p3-wrap' },
      wordDisplay,
      h(
        'div',
        { class: 'p3-main' },
        // Left column: 6x6 matrix + controls
        h(
          'div',
          { class: 'p3-left' },
          h(
            'div',
            { class: 'p3-head-row' },
            h('span', { class: 'small muted' }, t('1. คลิกเลือกตัวอักษรเป้าหมาย แล้วกดเริ่มสะกดคำ', '1. Click a target character, then press Start Spelling')),
            statusChip
          ),
          matrixEl,
          h(
            'div',
            { class: 'field', style: { marginTop: '10px' } },
            h('label', { class: 'ctl-label' }, t('จำนวนรอบกะพริบซ้ำ (Repetitions N)', 'Flash Repetitions (N)'), repOut),
            repSlider
          ),
          itrReadout,
          h('div', { class: 'widget-row', style: { marginTop: '10px' } }, startBtn, instantBtn, clearWordBtn)
        ),
        // Right column: ERP average plot + Row/Col decoder plot
        h(
          'div',
          { class: 'p3-right' },
          h(
            'div',
            { class: 'p3-plot-card' },
            h(
              'div',
              { class: 'p3-plot-head' },
              h('strong', {}, t('คลื่นเฉลี่ย ERP ที่ขั้ว Pz (0–800 ms)', 'Averaged ERP at Pz (0–800 ms)')),
              h(
                'div',
                { class: 'p3-legend' },
                h('span', { class: 'chip' }, h('span', { class: 'dot', style: { background: '#FF6B4A' } }), t('Target (มีตัวที่มอง)', 'Target (contains gazed char)')),
                h('span', { class: 'chip' }, h('span', { class: 'dot', style: { background: '#1FA39A' } }), t('Non-target (ไม่มี)', 'Non-target (other rows/cols)'))
              )
            ),
            erpCanvas
          ),
          h(
            'div',
            { class: 'p3-plot-card' },
            h(
              'div',
              { class: 'p3-plot-head' },
              h('strong', {}, t('ตัวถอดรหัส แถว vs คอลัมน์ (ค่าเฉลี่ย 250–450 ms)', 'Row vs Column Decoder (250–450 ms Mean)')),
              h('span', { class: 'small muted' }, t('เลือกแถวและคอลัมน์ที่ยอด P300 สูงสุด', 'Picks the row and column with the highest P300 peak'))
            ),
            barsCanvas
          )
        )
      )
    )
  );

  let fitErp = null, fitBars = null;
  fitErp = fitCanvas(erpCanvas, () => { if (fitErp) drawERP(); });
  fitBars = fitCanvas(barsCanvas, () => { if (fitBars) drawBars(); });

  function resetAccumulators() {
    targetSum.fill(0);
    nonTargetSum.fill(0);
    targetCount = 0;
    nonTargetCount = 0;
    rowScores.fill(0);
    colScores.fill(0);
    rowCounts.fill(0);
    colCounts.fill(0);
    currentRep = 0;
    activeFlash = null;
    predictedIdx = null;
    confidence = 0;
  }

  function simulateFlashEpoch(kind, index) {
    const tRow = Math.floor(targetIdx / 6);
    const tCol = targetIdx % 6;
    const isTarget = (kind === 'row' && index === tRow) || (kind === 'col' && index === tCol);
    // Jitter latency slightly around 310 ms, amplitude ~11.5 uV
    const p3Fn = shapes.p300(isTarget ? 11.5 : 0, 0.31 + (Math.random() - 0.5) * 0.025);

    let winMean = 0;
    for (let i = 0; i < EPOCH_LEN; i++) {
      const t = i / FS;
      // Background EEG noise (~14 uV RMS so 1 rep is noisy and 5+ reps are super clean)
      const bg = synth.next() * 0.85;
      const sample = bg + (isTarget ? p3Fn(t) : 0);
      if (isTarget) targetSum[i] += sample;
      else nonTargetSum[i] += sample;
      if (i >= WIN_START && i < WIN_END) winMean += sample;
    }
    winMean /= WIN_END - WIN_START;

    if (isTarget) targetCount++;
    else nonTargetCount++;

    if (kind === 'row') {
      rowScores[index] += winMean;
      rowCounts[index]++;
    } else {
      colScores[index] += winMean;
      colCounts[index]++;
    }
    return isTarget;
  }

  function buildFlashSchedule(reps) {
    const seq = [];
    for (let rep = 0; rep < reps; rep++) {
      const batch = [
        { kind: 'row', index: 0 },
        { kind: 'row', index: 1 },
        { kind: 'row', index: 2 },
        { kind: 'row', index: 3 },
        { kind: 'row', index: 4 },
        { kind: 'row', index: 5 },
        { kind: 'col', index: 0 },
        { kind: 'col', index: 1 },
        { kind: 'col', index: 2 },
        { kind: 'col', index: 3 },
        { kind: 'col', index: 4 },
        { kind: 'col', index: 5 },
      ];
      // Shuffle inside each repetition
      for (let i = batch.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [batch[i], batch[j]] = [batch[j], batch[i]];
      }
      batch.forEach((item) => seq.push({ ...item, rep: rep + 1 }));
    }
    return seq;
  }

  function finalizePrediction(fromUser = true) {
    let bestRow = 0, bestRowVal = -Infinity, secondRowVal = -Infinity;
    let bestCol = 0, bestColVal = -Infinity, secondColVal = -Infinity;

    for (let i = 0; i < 6; i++) {
      const rv = rowCounts[i] ? rowScores[i] / rowCounts[i] : 0;
      if (rv > bestRowVal) { secondRowVal = bestRowVal; bestRowVal = rv; bestRow = i; }
      else if (rv > secondRowVal) { secondRowVal = rv; }

      const cv = colCounts[i] ? colScores[i] / colCounts[i] : 0;
      if (cv > bestColVal) { secondColVal = bestColVal; bestColVal = cv; bestCol = i; }
      else if (cv > secondColVal) { secondColVal = cv; }
    }

    predictedIdx = bestRow * 6 + bestCol;
    const margin = (bestRowVal - secondRowVal) + (bestColVal - secondColVal);
    confidence = Math.round(clamp(48 + margin * 5.2, 35, 99));

    const predChar = CHARS[predictedIdx];
    const targetChar = CHARS[targetIdx];
    if (fromUser) spelledText += predChar;

    statusChip.textContent = t(`ทายผล: ${predChar} (${confidence}%)`, `Predicted: ${predChar} (${confidence}%)`);
    syncMatrix();
    syncStatus();
    drawERP();
    drawBars();

    if (!fromUser) {
      ctx?.say?.(
        t(
          'คลิกเลือกตัวอักษรในตาราง 6×6 แล้วกดปุ่ม <b>"เริ่มสะกดคำ (Flash)"</b> เพื่อดูแถวและคอลัมน์กะพริบพร้อมกราฟ P300 แบบสด!',
          'Click a character in the 6×6 grid and press <b>"Start Spelling (Flash)"</b> to watch rows and columns flash with live P300 averaging!'
        ),
        'idle'
      );
      return;
    }

    const correct = predictedIdx === targetIdx;
    if (correct) {
      if (!hasDiscovered) {
        hasDiscovered = true;
        ctx?.discover?.(
          'p300-speller-spelled',
          t(
            `สะกดตัว <b>"${predChar}"</b> สำเร็จด้วยสมอง! เมื่อนำแถวที่ ${bestRow + 1} และคอลัมน์ที่ ${bestCol + 1} ที่มียอด P300 สูงสุดมาตัดกัน ก็ได้ตัวอักษรที่จ้องมองทันที`,
            `Spelled <b>"${predChar}"</b> with brainwaves! Intersecting Row ${bestRow + 1} and Column ${bestCol + 1} with the highest P300 peaks pinpoints your gazed character.`
          )
        );
      } else {
        ctx?.say?.(
          t(
            `แม่นยำ! ได้ตัว <b>"${predChar}"</b> (ความมั่นใจ ${confidence}%) ลองปรับจำนวนรอบ N เป็น 1–2 รอบเทียบกับ 8–10 รอบดูสิว่าความแม่นยำต่างกันแค่ไหน`,
            `Spot on! Decoded <b>"${predChar}"</b> (${confidence}% confidence). Try comparing N = 1–2 reps vs 8–10 reps to see the accuracy difference!`
          ),
          'happy'
        );
      }
    } else {
      ctx?.say?.(
        t(
          `รอบนี้ได้ตัว <b>"${predChar}"</b> แทนที่จะเป็น <b>"${targetChar}"</b> เพราะใช้จำนวนรอบน้อย (${maxReps} รอบ) สัญญาณรบกวนจึงกลบยอด P300 — ลองเพิ่มจำนวนรอบเป็น 5–8 รอบดูนะ!`,
          `Decoded <b>"${predChar}"</b> instead of <b>"${targetChar}"</b> because with few repetitions (${maxReps} reps) background EEG noise masks the P300 peak — try increasing N to 5–8 reps!`
        ),
        'oops'
      );
    }
  }

  function stopSequence(cancelled = false) {
    running = false;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    activeFlash = null;
    startBtn.innerHTML = `${icon('play')} ${t('เริ่มสะกดคำ (Flash)', 'Start Spelling (Flash)')}`;
    if (cancelled) {
      statusChip.textContent = t('หยุดชั่วคราว', 'Paused');
      syncMatrix();
    }
  }

  function startSequence(instant = false, fromUser = true) {
    resetAccumulators();
    syncMatrix();
    syncStatus();

    const schedule = buildFlashSchedule(maxReps);
    if (instant || prefersReducedMotion()) {
      for (const step of schedule) {
        currentRep = step.rep;
        simulateFlashEpoch(step.kind, step.index);
      }
      finalizePrediction(fromUser);
      return;
    }

    running = true;
    startBtn.innerHTML = `${icon('pause')} ${t('หยุดกะพริบ', 'Stop Flashing')}`;
    let cursor = 0;

    const nextStep = () => {
      if (!running) return;
      if (cursor >= schedule.length) {
        stopSequence(false);
        finalizePrediction();
        return;
      }
      const item = schedule[cursor++];
      currentRep = item.rep;
      const isTarget = simulateFlashEpoch(item.kind, item.index);
      activeFlash = { ...item, isTarget };
      statusChip.textContent = t(`รอบที่ ${currentRep}/${maxReps} · Target N=${targetCount}`, `Rep ${currentRep}/${maxReps} · Target N=${targetCount}`);
      syncMatrix();
      drawERP();
      drawBars();

      // Gentle 120 ms highlight on, then 75 ms off
      timerId = setTimeout(() => {
        if (!running) return;
        activeFlash = null;
        syncMatrix();
        timerId = setTimeout(nextStep, 75);
      }, 120);
    };

    nextStep();
  }

  function drawERP() {
    const { ctx: c, w, h: ch } = fitErp;
    drawGrid(c, w, ch, { step: 20, major: 5 });
    const pad = { l: 40, r: 14, t: 18, b: 26 };
    const pw = Math.max(10, w - pad.l - pad.r);
    const ph = Math.max(10, ch - pad.t - pad.b);

    const X = (ms) => pad.l + (ms / 800) * pw;
    const Y = (uv) => pad.t + ph / 2 - (uv / 18) * (ph / 2);

    // Highlight P300 window (250–450 ms)
    const x250 = X(250), x450 = X(450);
    c.fillStyle = 'rgba(242, 182, 50, 0.20)';
    c.fillRect(x250, pad.t, x450 - x250, ph);
    c.strokeStyle = 'rgba(242, 182, 50, 0.85)';
    c.setLineDash([4, 3]);
    c.beginPath();
    c.moveTo(x250, pad.t); c.lineTo(x250, pad.t + ph);
    c.moveTo(x450, pad.t); c.lineTo(x450, pad.t + ph);
    c.stroke();
    c.setLineDash([]);

    c.fillStyle = '#B37B00';
    c.font = MONO;
    c.textAlign = 'center';
    c.fillText('P300 (250–450 ms)', (x250 + x450) / 2, pad.t + 13);

    // Zero baseline
    c.strokeStyle = 'rgba(31, 42, 68, 0.35)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(pad.l, Y(0));
    c.lineTo(pad.l + pw, Y(0));
    c.stroke();

    // Non-target average trace (teal)
    if (nonTargetCount > 0) {
      c.strokeStyle = '#1FA39A';
      c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i < EPOCH_LEN; i++) {
        const ms = (i / FS) * 1000;
        const val = nonTargetSum[i] / nonTargetCount;
        i ? c.lineTo(X(ms), Y(val)) : c.moveTo(X(ms), Y(val));
      }
      c.stroke();
    }

    // Target average trace (coral)
    if (targetCount > 0) {
      c.strokeStyle = '#FF6B4A';
      c.lineWidth = 2.6;
      c.beginPath();
      for (let i = 0; i < EPOCH_LEN; i++) {
        const ms = (i / FS) * 1000;
        const val = targetSum[i] / targetCount;
        i ? c.lineTo(X(ms), Y(val)) : c.moveTo(X(ms), Y(val));
      }
      c.stroke();
    } else {
      c.fillStyle = 'rgba(31, 42, 68, 0.55)';
      c.font = HEAD;
      c.textAlign = 'center';
      c.fillText(t('กด "เริ่มสะกดคำ" หรือ "คำนวณทันที" เพื่อดูคลื่นเฉลี่ย P300', 'Press "Start Spelling" or "Instant Decode" to view averaged P300'), pad.l + pw / 2, pad.t + ph / 2);
    }

    // Axes
    c.strokeStyle = INK;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(pad.l, pad.t);
    c.lineTo(pad.l, pad.t + ph);
    c.lineTo(pad.l + pw, pad.t + ph);
    c.stroke();

    c.fillStyle = INK;
    c.font = MONO;
    c.textAlign = 'center';
    for (const ms of [0, 200, 300, 400, 600, 800]) {
      c.fillText(`${ms}`, X(ms), ch - 7);
    }
    c.textAlign = 'right';
    c.fillText('+15µV', pad.l - 4, pad.t + 10);
    c.fillText('0', pad.l - 4, Y(0) + 4);
    c.fillText('-15µV', pad.l - 4, pad.t + ph - 2);
    c.fillText(`N=${targetCount} target`, pad.l + pw - 4, pad.t + 13);
  }

  function drawBars() {
    const { ctx: c, w, h: ch } = fitBars;
    drawGrid(c, w, ch, { step: 20, major: 5 });
    const pad = { l: 28, r: 12, t: 18, b: 24 };
    const pw = Math.max(10, w - pad.l - pad.r);
    const ph = Math.max(10, ch - pad.t - pad.b);

    const tRow = Math.floor(targetIdx / 6);
    const tCol = targetIdx % 6;

    // Find best row & col so far
    let bestR = -1, bestRVal = -Infinity;
    let bestC = -1, bestCVal = -Infinity;
    const rVals = [], cVals = [];
    for (let i = 0; i < 6; i++) {
      const rv = rowCounts[i] ? rowScores[i] / rowCounts[i] : 0;
      const cv = colCounts[i] ? colScores[i] / colCounts[i] : 0;
      rVals.push(rv);
      cVals.push(cv);
      if (rowCounts[i] && rv > bestRVal) { bestRVal = rv; bestR = i; }
      if (colCounts[i] && cv > bestCVal) { bestCVal = cv; bestC = i; }
    }

    const zeroY = pad.t + ph * 0.62;
    const scaleY = (ph * 0.48) / 10; // 10 uV scale

    c.strokeStyle = 'rgba(31, 42, 68, 0.35)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(pad.l, zeroY);
    c.lineTo(pad.l + pw, zeroY);
    c.stroke();

    const groupW = pw / 2;
    const barSlot = (groupW - 16) / 6;

    const drawGroup = (vals, xStart, prefix, bestIdx, trueIdx) => {
      for (let i = 0; i < 6; i++) {
        const bx = xStart + i * barSlot + 4;
        const bw = Math.max(10, barSlot - 8);
        const v = clamp(vals[i], -6, 12);
        const bh = Math.abs(v) * scaleY;
        const by = v >= 0 ? zeroY - bh : zeroY;

        const isBest = i === bestIdx;
        c.fillStyle = isBest ? '#FF6B4A' : i === trueIdx ? '#F2B632' : '#7F9CC2';
        c.strokeStyle = INK;
        c.lineWidth = 1.5;
        c.fillRect(bx, by, bw, Math.max(2, bh));
        c.strokeRect(bx, by, bw, Math.max(2, bh));

        c.fillStyle = INK;
        c.font = MONO;
        c.textAlign = 'center';
        c.fillText(`${prefix}${i + 1}`, bx + bw / 2, ch - 7);
      }
    };

    drawGroup(rVals, pad.l + 4, 'R', bestR, tRow);
    drawGroup(cVals, pad.l + groupW + 10, 'C', bestC, tCol);

    c.fillStyle = INK;
    c.font = HEAD;
    c.textAlign = 'left';
    c.fillText(t('แถว R1–R6', 'Rows R1–R6'), pad.l + 6, pad.t + 12);
    c.fillText(t('คอลัมน์ C1–C6', 'Cols C1–C6'), pad.l + groupW + 12, pad.t + 12);
  }

  // Run one initial instant demo so the ERP plot isn't blank on first visit
  syncMatrix();
  syncStatus();
  startSequence(true, false);

  return () => {
    stopSequence(true);
    fitErp.dispose();
    fitBars.dispose();
  };
}
