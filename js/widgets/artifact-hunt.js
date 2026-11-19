// Lesson 7 widget: Artifact Hunt — spot EOG, EMG, ECG, electrode pop, and a normal alpha trap.
import { h, clamp, seeded } from '../util.js';
import { icon } from '../ui/icons.js';
import { EEGSynth, shapes } from '../signal/dsp.js';
import { fitCanvas, drawGrid, drawTrace, INK, MONO, HEAD } from '../signal/plot.js';
import { t } from '../i18n.js';

function getChannels() {
  return [
    { name: 'Fp1', region: t('หน้าผากซ้าย', 'Left Prefrontal'), color: '#FF6B4A' },
    { name: 'Fp2', region: t('หน้าผากขวา', 'Right Prefrontal'), color: '#FF6B4A' },
    { name: 'F3',  region: t('Frontal ซ้าย', 'Left Frontal'), color: '#E06448' },
    { name: 'F4',  region: t('Frontal ขวา', 'Right Frontal'), color: '#E06448' },
    { name: 'C3',  region: t('Motor ซ้าย', 'Left Motor'),   color: '#1FA39A' },
    { name: 'C4',  region: t('Motor ขวา', 'Right Motor'),    color: '#1FA39A' },
    { name: 'O1',  region: t('ท้ายทอยซ้าย', 'Left Occipital'), color: '#7A68C4' },
    { name: 'O2',  region: t('ท้ายทอยขวา', 'Right Occipital'),  color: '#7A68C4' },
  ];
}

function getTypes() {
  return [
    {
      id: 'eog',
      label: t('กะพริบตา (EOG)', 'Eye Blink (EOG)'),
      short: 'EOG Blink',
      badge: '#FF6B4A',
      where: t('เด่นมากที่ขั้วหน้าผาก Fp1/Fp2 และลดหลั่นลงมาที่ F3/F4', 'Very prominent at prefrontal Fp1/Fp2 and tapers off at F3/F4'),
      freq: t('ความถี่ต่ำมาก (1–4 Hz) แอมพลิจูดสูง 100–200 µV', 'Very low frequency (1–4 Hz), high amplitude 100–200 µV'),
      fix: t('วิธีแก้: ใช้ ICA (Independent Component Analysis) แยกคอมโพเนนต์ตาออก หรือใช้ EOG Regression โดยไม่ตัดย่านความถี่สมองทิ้ง', 'Fix: Use ICA (Independent Component Analysis) to remove ocular components or apply EOG regression without discarding brain frequency bands'),
    },
    {
      id: 'ecg',
      label: t('หัวใจเต้น (ECG)', 'Heartbeat (ECG)'),
      short: 'ECG Spike',
      badge: '#E58FB0',
      where: t('เห็นเป็นหนามแหลมเล็กๆ จังหวะสม่ำเสมอทุก ~0.9–1 วินาที หลายช่องพร้อมกัน', 'Small sharp spikes repeating regularly every ~0.9–1 s across multiple channels'),
      freq: t('จังหวะคงที่ ~60–75 ครั้ง/นาที (QRS complex)', 'Regular rhythm ~60–75 BPM (QRS complex)'),
      fix: t('วิธีแก้: ใช้ ICA แยกองค์ประกอบที่มีจังหวะหัวใจคงที่ออก หรือปรับตำแหน่งสายอ้างอิงที่ติ่งหู/คอไม่ให้ทับเส้นเลือด', 'Fix: Use ICA to isolate the periodic cardiac component, or reposition the earlobe/neck reference away from blood vessels'),
    },
    {
      id: 'emg',
      label: t('ขบกราม (EMG)', 'Jaw Clench (EMG)'),
      short: 'EMG Muscle',
      badge: '#F2B632',
      where: t('กระจายหลายช่องสัญญาณ โดยเฉพาะแถบขมับและหน้าผาก (Fp1–C4)', 'Spreads across multiple channels, especially temporal and frontal areas (Fp1–C4)'),
      freq: t('ความถี่สูง 30–100+ Hz หน้าตาเหมือนแถบหนาทึบยุ่งเหยิง', 'High frequency 30–100+ Hz, looks like a dense jagged burst'),
      fix: t('วิธีแก้: กรองด้วย Low-pass filter (~30–40 Hz) ร่วมกับบอกผู้ทดลองให้ผ่อนคลายกราม บ่า และใบหน้า', 'Fix: Apply a low-pass filter (~30–40 Hz) and instruct the participant to relax their jaw, shoulders, and face'),
    },
    {
      id: 'pop',
      label: t('อิเล็กโทรดขยับ (Pop)', 'Electrode Pop'),
      short: 'Electrode Pop',
      badge: '#7F9CC2',
      where: t('เกิดที่ช่องเดียวโดดๆ (ในภาพคือ C4) ช่องข้างเคียงปกติ', 'Occurs on a single isolated channel (C4 here) while neighboring channels remain normal'),
      freq: t('กระโดดขึ้นฉับพลันแล้วค่อยๆ คายประจุโค้งลง (RC decay)', 'Abrupt vertical jump followed by a slow exponential RC decay curve'),
      fix: t('วิธีแก้: เติมเจลนำไฟฟ้าใหม่ (Re-gel) เช็กค่า Impedance (< 10 kΩ) ยึดสายไม่ให้ดึงรั้ง และตัด Epoch ช่วงที่เสียทิ้ง', 'Fix: Re-apply conductive gel (Re-gel), check impedance (< 10 kΩ), secure cables against tension, and reject the corrupted epoch'),
    },
    {
      id: 'alpha',
      label: t('คลื่นสมองปกติ ไม่ใช่สิ่งแปลกปลอม', 'Normal Brainwave (Not an Artifact)'),
      short: 'Normal Alpha',
      badge: '#1FA39A',
      where: t('เด่นเฉพาะขั้วท้ายทอย O1 และ O2 (Visual cortex) ตอนพักสายตา/หลับตา', 'Prominent specifically at occipital O1 and O2 (visual cortex) during eyes-closed/relaxed state'),
      freq: t('คลื่นรูปไซน์สวยงาม ความถี่ 8–13 Hz (Posterior Alpha rhythm)', 'Smooth sinusoidal rhythm at 8–13 Hz (Posterior Alpha rhythm)'),
      fix: t('ข้อควรระวัง: ห้ามกรองหรือตัดทิ้ง! นี่คือสัญญาณสมองของจริงที่เป็นหัวใจของการวัดสภาวะผ่อนคลายและ BCI', 'Caution: Do NOT filter or reject! This is a genuine brain signal essential for measuring relaxation states and BCI'),
    },
  ];
}

function getEvents() {
  return [
    {
      id: 1,
      t0: 0.65,
      t1: 1.65,
      type: 'eog',
      title: t('เหตุการณ์ #1 (0.7–1.7 วินาที)', 'Event #1 (0.7–1.7 s)'),
      clue: t('สังเกตเนินช้าๆ ขนาดใหญ่มากที่ Fp1 และ Fp2 พร้อมกัน ส่วน O1/O2 แทบไม่ขยับเลย', 'Notice the huge slow bumps appearing simultaneously at Fp1 and Fp2, while O1/O2 barely move'),
    },
    {
      id: 2,
      t0: 2.15,
      t1: 3.55,
      type: 'ecg',
      title: t('เหตุการณ์ #2 (2.2–3.6 วินาที)', 'Event #2 (2.2–3.6 s)'),
      clue: t('หนามแหลมสั้นๆ เคาะเป็นจังหวะคงที่ห่างกันประมาณ 0.9 วินาที ปรากฏพร้อมกันเกือบทุกช่อง', 'Short sharp spikes ticking at a steady ~0.9 s interval across almost every channel'),
    },
    {
      id: 3,
      t0: 4.10,
      t1: 5.20,
      type: 'emg',
      title: t('เหตุการณ์ #3 (4.1–5.2 วินาที)', 'Event #3 (4.1–5.2 s)'),
      clue: t('เส้นกราฟกลายเป็นปื้นความถี่สูงหนาทึบพร้อมกันหลายช่อง เหมือนเกร็งกล้ามเนื้อใบหน้า', 'Traces turn into a dense high-frequency burst across multiple channels, typical of facial muscle tension'),
    },
    {
      id: 4,
      t0: 5.75,
      t1: 6.95,
      type: 'pop',
      title: t('เหตุการณ์ #4 (5.8–7.0 วินาที)', 'Event #4 (5.8–7.0 s)'),
      clue: t('สัญญาณที่ช่อง C4 ช่องเดียวพุ่งกระโดดขึ้นทันทีแล้วค่อยๆ ไหลโค้งกลับลงมา ช่องอื่นนิ่งสนิท', 'Only channel C4 jumps abruptly and slowly curves back down while all other channels stay calm'),
    },
    {
      id: 5,
      t0: 7.55,
      t1: 9.25,
      type: 'alpha',
      title: t('เหตุการณ์ #5 (7.6–9.3 วินาที)', 'Event #5 (7.6–9.3 s)'),
      clue: t('คลื่นลูกคลื่นสม่ำเสมอ ~10 รอบต่อวินาที ขึ้นเฉพาะที่ท้ายทอย O1 และ O2 เท่านั้น!', 'Smooth rhythmic waves at ~10 cycles/s appearing exclusively at occipital O1 and O2!'),
    },
  ];
}

function buildRecording(seed = 42, channels = getChannels()) {
  const fs = 250;
  const dur = 10;
  const N = fs * dur;
  const rng = seeded(seed);

  const traces = channels.map((ch, idx) => {
    const synth = new EEGSynth({
      fs,
      seed: seed + idx * 17,
      amps: {
        delta: 4,
        theta: 3.5,
        alpha: ch.name.startsWith('O') ? 6 : 4,
        beta: 3,
        gamma: 0.8,
      },
      noise: 2.2,
    });
    return synth.block(N);
  });

  const blinkFn = shapes.blink(1);
  const ecgFn = shapes.ecg(1);
  const emgShape = shapes.emg(1, rng);

  // 1) Double eye blink around 0.95s and 1.32s (frontal Fp1/Fp2 huge, F3/F4 medium, C3/C4 tiny)
  const blinkScales = [115, 112, 48, 46, 12, 11, 2, 2];
  for (const [bStart, bDur] of [[0.72, 0.38], [1.14, 0.42]]) {
    const i0 = Math.round(bStart * fs);
    const len = Math.round(bDur * fs);
    for (let k = 0; k < len; k++) {
      const t = k / fs;
      const val = blinkFn(t, bDur);
      for (let c = 0; c < 8; c++) {
        if (i0 + k < N) traces[c][i0 + k] += val * blinkScales[c];
      }
    }
  }

  // 2) ECG ticks across recording (prominent inside window #2 at 2.38s and 3.26s)
  const ecgTimes = [0.42, 1.48, 2.38, 3.26, 6.45, 9.55];
  const ecgScales = [24, -22, 32, -30, 36, -34, 26, -24];
  for (const et of ecgTimes) {
    const inWin2 = et > 2.1 && et < 3.6;
    const boost = inWin2 ? 1.85 : 0.55;
    const i0 = Math.round(et * fs);
    const len = Math.round(0.28 * fs);
    for (let k = 0; k < len; k++) {
      const t = k / fs;
      const v = ecgFn(t);
      for (let c = 0; c < 8; c++) {
        if (i0 + k < N) traces[c][i0 + k] += v * ecgScales[c] * boost;
      }
    }
  }

  // 3) Jaw clench EMG burst (4.15s – 5.15s) across frontal/central channels
  const emgScales = [62, 65, 75, 72, 58, 60, 22, 24];
  {
    const bStart = 4.15, bDur = 1.0;
    const i0 = Math.round(bStart * fs);
    const len = Math.round(bDur * fs);
    for (let k = 0; k < len; k++) {
      const t = k / fs;
      for (let c = 0; c < 8; c++) {
        // high-frequency jagged burst
        const hf = emgShape(t, bDur) * 0.65 + Math.sin(2 * Math.PI * (58 + c * 7) * t) * Math.sin(Math.PI * t / bDur) * 0.45;
        if (i0 + k < N) traces[c][i0 + k] += hf * emgScales[c];
      }
    }
  }

  // 4) Electrode pop on C4 ONLY (index 5) at 5.88s
  {
    const c = 5; // C4
    const pStart = 5.88, pDur = 0.98;
    const i0 = Math.round(pStart * fs);
    const len = Math.round(pDur * fs);
    for (let k = 0; k < len; k++) {
      const t = k / fs;
      const step = t < 0.02 ? (t / 0.02) * 115 : 115 * Math.exp(-(t - 0.02) / 0.28) - 22 * Math.exp(-(t - 0.08) / 0.45);
      if (i0 + k < N) traces[c][i0 + k] += step;
    }
  }

  // 5) Normal Alpha spindle on O1/O2 ONLY (indices 6, 7) at 7.60s – 9.20s
  {
    const aStart = 7.60, aDur = 1.60;
    const i0 = Math.round(aStart * fs);
    const len = Math.round(aDur * fs);
    for (let k = 0; k < len; k++) {
      const t = k / fs;
      const env = Math.sin((Math.PI * t) / aDur);
      const wave1 = Math.sin(2 * Math.PI * 10.2 * t) * 56 * env;
      const wave2 = Math.sin(2 * Math.PI * 10.2 * t + 0.25) * 58 * env;
      if (i0 + k < N) {
        traces[6][i0 + k] += wave1;
        traces[7][i0 + k] += wave2;
      }
    }
  }

  return { fs, dur, N, traces };
}

export default function mount(root, ctx) {
  root.innerHTML = '';

  const CHANNELS = getChannels();
  const TYPES = getTypes();
  const EVENTS = getEvents();

  const rec = buildRecording(42, CHANNELS);
  let activeId = 1;
  let hoverId = null;
  const solved = new Map(); // eventId -> typeId
  let allDiscovered = false;

  // Top toolbar: progress + actions
  const scoreBadge = h('span', { class: 'chip ah-score' });
  const updateScoreBadge = () => {
    scoreBadge.innerHTML = t(
      `${icon('target')} <span>ระบุถูกแล้ว <b>${solved.size} / ${EVENTS.length}</b> จุด</span>`,
      `${icon('target')} <span>Identified <b>${solved.size} / ${EVENTS.length}</b> events</span>`
    );
  };
  updateScoreBadge();

  const revealBtn = h(
    'button',
    {
      class: 'btn sm mustard',
      onclick: () => {
        for (const ev of EVENTS) solved.set(ev.id, ev.type);
        updateScoreBadge();
        syncPills();
        renderInspector();
        drawPlot();
        if (!allDiscovered) {
          allDiscovered = true;
          ctx?.discover?.(
            'artifact-hunt-all',
            t(
              'ครบทั้ง 5 จุดแล้ว! จำไว้ว่า <b>คลื่น Alpha ที่ O1/O2</b> คือคลื่นสมองจริง ส่วนสิ่งแปลกปลอมต้องแก้ให้ถูกวิธี',
              'All 5 events identified! Remember that <b>Alpha waves at O1/O2</b> are real brainwaves, while artifacts must be handled with the right method'
            )
          );
        } else {
          ctx?.say?.(
            t(
              'เฉลยครบทั้ง 5 จุดแล้ว ลองคลิกดูแต่ละช่วงเพื่อทบทวนวิธีรับมือ (ICA / Filter / Re-gel) ได้เลย!',
              'All 5 answers revealed! Click each event window to review how to handle them (ICA / Filter / Re-gel).'
            ),
            'happy'
          );
        }
      },
    },
    h('span', { html: icon('eye') }),
    t('เฉลยทั้งหมด', 'Reveal All')
  );

  const resetBtn = h(
    'button',
    {
      class: 'btn sm ghost',
      onclick: () => {
        solved.clear();
        activeId = 1;
        updateScoreBadge();
        syncPills();
        renderInspector();
        drawPlot();
        ctx?.say?.(
          t(
            'รีเซ็ตเรียบร้อย! คลิกแถบสีบนกราฟ EEG 8 ช่อง เพื่อจำแนกสิ่งแปลกปลอมทีละจุดกันเลย',
            'Reset complete! Click the highlighted windows on the 8-channel EEG plot to classify each event.'
          ),
          'idle'
        );
      },
    },
    h('span', { html: icon('reset') }),
    t('เริ่มใหม่', 'Reset')
  );

  // Event selector pills (keyboard accessible + synced with canvas clicks)
  const pillBar = h('div', { class: 'ah-pills', role: 'tablist', 'aria-label': t('เลือกช่วงเหตุการณ์บนกราฟ', 'Select event window on plot') });
  const pillBtns = new Map();

  for (const ev of EVENTS) {
    const btn = h(
      'button',
      {
        class: 'ah-pill',
        role: 'tab',
        onclick: () => selectEvent(ev.id),
      },
      `#${ev.id} (${ev.t0.toFixed(1)}–${ev.t1.toFixed(1)}s)`
    );
    pillBtns.set(ev.id, btn);
    pillBar.append(btn);
  }

  function syncPills() {
    for (const ev of EVENTS) {
      const btn = pillBtns.get(ev.id);
      const isSolved = solved.has(ev.id);
      const tInfo = isSolved ? TYPES.find((t) => t.id === solved.get(ev.id)) : null;
      btn.setAttribute('aria-selected', String(ev.id === activeId));
      btn.classList.toggle('active', ev.id === activeId);
      btn.classList.toggle('solved', isSolved);
      btn.innerHTML = isSolved
        ? `${icon('check')} <span>#${ev.id} ${tInfo.short}</span>`
        : `<span>#${ev.id} (${ev.t0.toFixed(1)}–${ev.t1.toFixed(1)}s)</span>`;
    }
  }

  // Canvas plot container
  const canvas = h('canvas', {
    class: 'scope ah-canvas',
    tabindex: '0',
    'aria-label': t(
      'กราฟ EEG 8 ช่อง ความยาว 10 วินาที คลิกที่แถบไฮไลต์ #1 ถึง #5 เพื่อตรวจสอบสัญญาณ',
      '8-channel 10-second EEG plot. Click highlighted windows #1 to #5 to inspect the signal'
    ),
  });

  // Inspector panel (changes when user picks an event window)
  const inspector = h('div', { class: 'ah-inspector card flat' });

  // Reference cards for fixing each artifact
  const refGrid = h(
    'div',
    { class: 'ah-ref-grid' },
    TYPES.map((t) =>
      h(
        'div',
        { class: 'ah-ref-card', dataset: { type: t.id } },
        h(
          'div',
          { class: 'ah-ref-head' },
          h('span', { class: 'dot', style: { background: t.badge } }),
          h('strong', {}, t.label)
        ),
        h('p', { class: 'small muted' }, `${t.where} · ${t.freq}`),
        h('p', { class: 'small ah-fix' }, t.fix)
      )
    )
  );

  root.append(
    h(
      'div',
      { class: 'ah-wrap' },
      h(
        'div',
        { class: 'widget-row ah-toolbar' },
        scoreBadge,
        h('span', { class: 'small muted' }, t('คลิกช่วงไฮไลต์ #1–#5 บนกราฟ หรือกดปุ่มด้านล่างเพื่อระบุชนิดสัญญาณ', 'Click highlighted windows #1–#5 on the plot or use the buttons below to classify each signal')),
        h('div', { class: 'ah-actions' }, revealBtn, resetBtn)
      ),
      pillBar,
      h('div', { class: 'ah-canvas-wrap' }, canvas),
      inspector,
      h(
        'details',
        { class: 'ah-guide' },
        h('summary', {}, h('span', { html: icon('book') }), t('คู่มือแยกแยะ Artifact และวิธีแก้ไขในงาน BCI จริง (ICA / Filter / Re-gel)', 'Artifact Identification & Mitigation Guide in Real BCI (ICA / Filter / Re-gel)')),
        refGrid
      )
    )
  );

  let fit = null;
  fit = fitCanvas(canvas, () => { if (fit) drawPlot(); });

  function getPlotBox() {
    const { w, h: ch } = fit;
    const padL = 72, padR = 14, padT = 28, padB = 26;
    return { w, ch, padL, padR, padT, padB, pw: Math.max(10, w - padL - padR), ph: Math.max(10, ch - padT - padB) };
  }

  function drawPlot() {
    const { ctx: c } = fit;
    const { w, ch, padL, padT, pw, ph } = getPlotBox();
    drawGrid(c, w, ch, { step: 22, major: 5 });

    const laneH = ph / CHANNELS.length;
    const X = (t) => padL + (t / rec.dur) * pw;

    // 1) Draw event highlight windows first
    for (const ev of EVENTS) {
      const x0 = X(ev.t0);
      const x1 = X(ev.t1);
      const bw = x1 - x0;
      const isSolved = solved.has(ev.id);
      const isActive = ev.id === activeId;
      const isHover = ev.id === hoverId;
      const tInfo = isSolved ? TYPES.find((t) => t.id === solved.get(ev.id)) : null;

      c.save();
      if (isSolved) {
        c.fillStyle = ev.type === 'alpha' ? 'rgba(31, 163, 154, 0.16)' : 'rgba(242, 182, 50, 0.18)';
      } else if (isActive) {
        c.fillStyle = 'rgba(255, 107, 74, 0.16)';
      } else if (isHover) {
        c.fillStyle = 'rgba(31, 42, 68, 0.09)';
      } else {
        c.fillStyle = 'rgba(242, 182, 50, 0.09)';
      }
      c.fillRect(x0, padT, bw, ph);

      c.strokeStyle = isActive ? '#FF6B4A' : isSolved ? '#1FA39A' : 'rgba(31, 42, 68, 0.45)';
      c.lineWidth = isActive ? 2.2 : 1.4;
      if (!isActive && !isSolved) c.setLineDash([4, 4]);
      c.strokeRect(x0 + 0.5, padT + 0.5, bw - 1, ph - 1);
      c.setLineDash([]);

      // Top tab badge for each event
      const tagW = Math.min(bw - 4, isSolved ? 96 : 42);
      const tagX = x0 + (bw - tagW) / 2;
      c.fillStyle = isActive ? '#FF6B4A' : isSolved ? '#1FA39A' : '#1F2A44';
      c.beginPath();
      c.roundRect ? c.roundRect(tagX, 4, tagW, 19, 6) : c.rect(tagX, 4, tagW, 19);
      c.fill();

      c.fillStyle = '#FFFEFB';
      c.font = MONO;
      c.textAlign = 'center';
      c.fillText(isSolved ? `#${ev.id} ${tInfo.short.split(' ')[0]}` : `#${ev.id}`, x0 + bw / 2, 17);
      c.restore();
    }

    // 2) Draw 8 channel lanes & traces
    for (let i = 0; i < CHANNELS.length; i++) {
      const chMeta = CHANNELS[i];
      const yTop = padT + i * laneH;
      const yMid = yTop + laneH / 2;

      if (i > 0) {
        c.strokeStyle = 'rgba(31, 42, 68, 0.14)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, yTop + 0.5);
        c.lineTo(w, yTop + 0.5);
        c.stroke();
      }

      // Channel label on left
      c.fillStyle = chMeta.color;
      c.font = '700 11px "JetBrains Mono", monospace';
      c.textAlign = 'left';
      c.fillText(chMeta.name, 8, yMid - 1);

      c.fillStyle = 'rgba(31, 42, 68, 0.62)';
      c.font = '500 9.5px "IBM Plex Sans Thai", sans-serif';
      c.fillText(chMeta.region, 8, yMid + 11);

      drawTrace(c, rec.traces[i], {
        x: padL,
        y: yTop + 3,
        w: pw,
        h: laneH - 6,
        min: -115,
        max: 115,
        color: chMeta.color,
        lw: 1.45,
      });
    }

    // Left divider line and bottom time axis
    c.strokeStyle = INK;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(padL, padT);
    c.lineTo(padL, padT + ph);
    c.lineTo(padL + pw, padT + ph);
    c.stroke();

    c.fillStyle = INK;
    c.font = MONO;
    c.textAlign = 'center';
    for (let s = 0; s <= 10; s++) {
      const tx = X(s);
      c.fillText(`${s}s`, tx, ch - 7);
    }
  }

  function selectEvent(id) {
    activeId = id;
    syncPills();
    renderInspector();
    drawPlot();
  }

  function checkAnswer(ev, pickedType) {
    const tInfo = TYPES.find((t) => t.id === pickedType);
    const correctInfo = TYPES.find((t) => t.id === ev.type);

    if (pickedType === ev.type) {
      solved.set(ev.id, pickedType);
      updateScoreBadge();
      syncPills();
      renderInspector();
      drawPlot();

      if (ev.type === 'alpha') {
        ctx?.say?.(
          t(
            `ตาแหลมมาก! ช่วง <b>#${ev.id}</b> ไม่ใช่สิ่งแปลกปลอม แต่เป็น <b>คลื่น Alpha (8–13 Hz)</b> ที่ท้ายทอย O1/O2 ตอนพักสายตา ห้ามเผลอลบทิ้งเด็ดขาด!`,
            `Sharp eyes! Window <b>#${ev.id}</b> is not an artifact — it is a genuine <b>Alpha wave (8–13 Hz)</b> at occipital O1/O2 during eye rest. Never delete it!`
          ),
          'happy'
        );
      } else {
        ctx?.say?.(
          t(
            `ถูกต้อง! ช่วง <b>#${ev.id}</b> คือ <b>${correctInfo.label}</b> — ${correctInfo.fix}`,
            `Correct! Window <b>#${ev.id}</b> is <b>${correctInfo.label}</b> — ${correctInfo.fix}`
          ),
          'happy'
        );
      }

      if (solved.size === EVENTS.length && !allDiscovered) {
        allDiscovered = true;
        ctx?.discover?.(
          'artifact-hunt-all',
          t(
            'สุดยอดนักล่า Artifact! คุณแยกสิ่งแปลกปลอมทั้ง 4 ชนิดและปกป้องคลื่น Alpha ของจริงไว้ได้ครบถ้วน',
            'Master Artifact Hunter! You identified all 4 artifact types and preserved the genuine Alpha rhythm.'
          )
        );
      }
    } else {
      ctx?.say?.(
        t(
          `ยังไม่ใช่ <b>${tInfo.label}</b> นะ! คำใบ้สำหรับ <b>#${ev.id}</b>: ${ev.clue}`,
          `Not <b>${tInfo.label}</b> yet! Hint for <b>#${ev.id}</b>: ${ev.clue}`
        ),
        'oops'
      );
      renderInspector(pickedType);
    }
  }

  function renderInspector(wrongPick = null) {
    const ev = EVENTS.find((e) => e.id === activeId) || EVENTS[0];
    const isSolved = solved.has(ev.id);
    const solvedType = isSolved ? TYPES.find((t) => t.id === solved.get(ev.id)) : null;

    inspector.innerHTML = '';

    const headRow = h(
      'div',
      { class: 'ah-insp-head' },
      h(
        'div',
        {},
        h('span', { class: 'chip' }, t(`กำลังตรวจ #${ev.id}`, `Inspecting #${ev.id}`)),
        h('h4', { class: 'ah-insp-title' }, ev.title),
        h('p', { class: 'small muted ah-clue' }, t(`ข้อสังเกตบนกราฟ: ${ev.clue}`, `Clue on plot: ${ev.clue}`))
      ),
      h(
        'div',
        { class: 'ah-nav-btns' },
        h(
          'button',
          {
            class: 'btn sm ghost',
            onclick: () => selectEvent(ev.id > 1 ? ev.id - 1 : EVENTS.length),
          },
          h('span', { html: icon('arrowLeft') }),
          t('ก่อนหน้า', 'Prev')
        ),
        h(
          'button',
          {
            class: 'btn sm ghost',
            onclick: () => selectEvent(ev.id < EVENTS.length ? ev.id + 1 : 1),
          },
          t('ถัดไป', 'Next'),
          h('span', { html: icon('arrowRight') })
        )
      )
    );

    const choicesGrid = h(
      'div',
      { class: 'ah-choices' },
      TYPES.map((t) => {
        const isRightChoice = isSolved && t.id === ev.type;
        const isWrongChoice = wrongPick === t.id;
        return h(
          'button',
          {
            class: `ah-choice ${isRightChoice ? 'right' : ''} ${isWrongChoice ? 'wrong' : ''}`,
            onclick: () => checkAnswer(ev, t.id),
          },
          h('span', { class: 'dot', style: { background: t.badge } }),
          h('span', { class: 'ah-choice-lbl' }, t.label),
          isRightChoice ? h('span', { class: 'ah-choice-ic', html: icon('check') }) : null
        );
      })
    );

    inspector.append(headRow, choicesGrid);

    if (isSolved && solvedType) {
      inspector.append(
        h(
          'div',
          { class: `callout ${ev.type === 'alpha' ? 'teal' : ''}`, style: { marginTop: '12px', marginBottom: '0' } },
          h('span', { html: icon(ev.type === 'alpha' ? 'brain' : 'bulb') }),
          h(
            'div',
            {},
            h('strong', {}, t(`เฉลย #${ev.id}: ${solvedType.label}`, `Answer #${ev.id}: ${solvedType.label}`)),
            h('p', { class: 'small' }, `${solvedType.where} (${solvedType.freq})`),
            h('p', { class: 'small' }, solvedType.fix)
          )
        )
      );
    }
  }

  // Pointer interaction on the canvas
  function eventAtX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const { padL, pw } = getPlotBox();
    const t = ((x - padL) / pw) * rec.dur;
    return EVENTS.find((e) => t >= e.t0 && t <= e.t1) || null;
  }

  const onCanvasMove = (e) => {
    const hit = eventAtX(e.clientX);
    const nextHover = hit ? hit.id : null;
    canvas.style.cursor = hit ? 'pointer' : 'default';
    if (nextHover !== hoverId) {
      hoverId = nextHover;
      drawPlot();
    }
  };

  const onCanvasClick = (e) => {
    const hit = eventAtX(e.clientX);
    if (hit) selectEvent(hit.id);
  };

  const onCanvasKey = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectEvent(activeId < EVENTS.length ? activeId + 1 : 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectEvent(activeId > 1 ? activeId - 1 : EVENTS.length);
    }
  };

  canvas.addEventListener('pointermove', onCanvasMove);
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('keydown', onCanvasKey);

  syncPills();
  renderInspector();
  drawPlot();
  ctx?.say?.(
    t(
      'ลองคลิกที่ช่วงไฮไลต์ <b>#1 ถึง #5</b> บนกราฟ EEG 8 ช่อง แล้วทายดูว่าจุดไหนคือสิ่งแปลกปลอม จุดไหนคือคลื่นสมองจริง!',
      'Click highlighted windows <b>#1 to #5</b> on the 8-channel EEG plot and guess which ones are artifacts and which is a real brainwave!'
    ),
    'idle'
  );

  return () => {
    canvas.removeEventListener('pointermove', onCanvasMove);
    canvas.removeEventListener('click', onCanvasClick);
    canvas.removeEventListener('keydown', onCanvasKey);
    fit.dispose();
  };
}
