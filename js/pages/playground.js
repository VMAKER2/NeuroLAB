// EEG Playground page: real-time multi-channel synthesizer, 10-20 head selector, artifact injector, live biquad FilterChain, FFT spectrum, and CSV export.
import { h, clamp, toast, loop } from '../util.js';
import { icon } from '../ui/icons.js';
import { buddy } from '../ui/mascot.js';
import { headTop } from '../ui/head2d.js';
import { ELECTRODES, byName } from '../data/electrodes.js';
import { EEGSynth, shapes, designFilter, FilterChain, spectrum, bandPower, BANDS, rms } from '../signal/dsp.js';
import { fitCanvas, drawSpectrum, Scope } from '../signal/plot.js';
import { t } from '../i18n.js';

const DEFAULT_CHANNELS = ['Fp1', 'Fz', 'C3', 'Cz', 'C4', 'Pz', 'O1', 'O2'];

const REGION_COLOR = {
  frontal: '#FF6B4A',
  broca: '#FF6B4A',
  motor: '#1FA39A',
  temporal: '#1FA39A',
  parietal: '#E09F1F',
  wernicke: '#E09F1F',
  visual: '#7A68C4',
};

function getStates() {
  return [
    {
      id: 'alert',
      label: t('ตื่นตัวปกติ (Alert)', 'Normal Alert'),
      amps: { delta: 6, theta: 5, alpha: 9, beta: 7, gamma: 2 },
      tip: t(
        'คลื่นสมองยามตื่นตัวทั่วไป มี Alpha และ Beta ผสมกันในระดับสมดุล',
        'Typical awake brainwave activity with a balanced mix of Alpha and Beta rhythms'
      ),
    },
    {
      id: 'eyesClosed',
      label: t('หลับตาเพิ่ม Alpha (O1/O2)', 'Eyes Closed Alpha (O1/O2)'),
      amps: { delta: 6, theta: 6, alpha: 14, beta: 4, gamma: 1 },
      occipitalAlpha: 38,
      tip: t(
        'เมื่อหลับตาพัก Visual Cortex ที่ท้ายทอย (O1, Oz, O2) จะสร้างคลื่น Alpha (8–13 Hz) พุ่งสูงขึ้นชัดเจน (Berger effect)',
        'Closing your eyes causes the occipital visual cortex (O1, Oz, O2) to generate a strong 8–13 Hz Alpha rhythm (Berger effect)'
      ),
    },
    {
      id: 'miLeft',
      label: t('จินตนาการมือซ้าย (C4 ERD)', 'Imagine Left Hand (C4 ERD)'),
      amps: { delta: 6, theta: 5, alpha: 16, beta: 9, gamma: 2 },
      c3Alpha: 26,
      c4Alpha: 5,
      tip: t(
        'จินตนาการกำมือซ้าย → คลื่น Mu (8–13 Hz) ที่ขั้ว C4 (สมองซีกขวา) ลดฮวบลง (ERD) เทียบกับ C3',
        'Imagining left-hand movement → Mu rhythm (8–13 Hz) at C4 (right hemisphere) drops sharply (ERD) compared to C3'
      ),
    },
    {
      id: 'miRight',
      label: t('จินตนาการมือขวา (C3 ERD)', 'Imagine Right Hand (C3 ERD)'),
      amps: { delta: 6, theta: 5, alpha: 16, beta: 9, gamma: 2 },
      c3Alpha: 5,
      c4Alpha: 26,
      tip: t(
        'จินตนาการกำมือขวา → คลื่น Mu (8–13 Hz) ที่ขั้ว C3 (สมองซีกซ้าย) ลดฮวบลง (ERD) เทียบกับ C4',
        'Imagining right-hand movement → Mu rhythm (8–13 Hz) at C3 (left hemisphere) drops sharply (ERD) compared to C4'
      ),
    },
    {
      id: 'deepSleep',
      label: t('หลับลึก (Delta)', 'Deep Sleep (Delta)'),
      amps: { delta: 34, theta: 10, alpha: 3, beta: 2, gamma: 0.5 },
      tip: t(
        'ภาวะหลับลึก (Stage N3) คลื่นความถี่ต่ำมากอย่าง Delta (0.5–4 Hz) จะมีแอมพลิจูดสูงทั่วทั้งศีรษะ',
        'Deep sleep (Stage N3) is dominated by high-amplitude, slow Delta waves (0.5–4 Hz) across the scalp'
      ),
    },
  ];
}

export function render(main) {
  main.innerHTML = '';

  const STATES = getStates();

  const fs = 250;
  let activeChannels = [...DEFAULT_CHANNELS];
  let inspectCh = 'O1';
  let currentState = STATES[0];
  let line50 = false;
  let paused = false;

  // Filter settings
  let hpCut = 0.5;
  let lpCut = 40;
  let notchOn = false;

  // Create one EEGSynth + one FilterChain per electrode in the 10-20 system
  const synths = new Map();
  const filters = new Map();

  ELECTRODES.forEach((e, idx) => {
    synths.set(
      e.name,
      new EEGSynth({
        fs,
        seed: 500 + idx * 19,
        amps: { ...currentState.amps },
        noise: 2.5,
        line: 0,
      })
    );
  });

  function rebuildFilters() {
    const secs = designFilter({
      fs,
      low: hpCut,
      high: lpCut,
      notch: notchOn ? 50 : 0,
    });
    for (const e of ELECTRODES) {
      filters.set(e.name, new FilterChain(secs));
    }
  }
  rebuildFilters();

  function applyStateAmps() {
    for (const e of ELECTRODES) {
      const s = synths.get(e.name);
      const a = { ...currentState.amps };
      if (currentState.occipitalAlpha && (e.region === 'visual' || e.name.startsWith('P'))) {
        a.alpha = e.region === 'visual' ? currentState.occipitalAlpha : currentState.occipitalAlpha * 0.55;
      }
      if (currentState.c3Alpha != null && e.name === 'C3') {
        a.alpha = currentState.c3Alpha;
        a.beta = currentState.c3Alpha * 0.45;
      }
      if (currentState.c4Alpha != null && e.name === 'C4') {
        a.alpha = currentState.c4Alpha;
        a.beta = currentState.c4Alpha * 0.45;
      }
      s.setAmps(a);
      s.line = line50 ? 18 : 0;
    }
  }
  applyStateAmps();

  // Mascot buddy for interactive guidance
  const mascotBuddy = buddy(
    t(
      'ยินดีต้อนรับสู่ <b>ห้องทดลองสัญญาณ EEG</b>! ลองคลิกเลือกขั้วอิเล็กโทรดบนศีรษะ ฉีดสิ่งแปลกปลอม (กะพริบตา / ขบกราม / ไฟบ้าน 50 Hz) แล้วเปิด <b>Filter</b> ดูความเปลี่ยนแปลงสดๆ ได้เลย!',
      'Welcome to the <b>EEG Signal Playground</b>! Click electrodes on the head map, inject artifacts (Eye Blink / Jaw Clench / 50 Hz Line Noise), and toggle live <b>Filters</b> to watch the signal change in real time!'
    ),
    'idle'
  );

  // 1) 2D Head selector (max 8 channels)
  const chCountChip = h('span', { class: 'chip' }, t(`${activeChannels.length}/8 ช่อง`, `${activeChannels.length}/8 ch`));
  const head = headTop({
    size: 235,
    labels: true,
    onPick: (name) => toggleChannel(name),
  });

  function syncHeadDots() {
    chCountChip.textContent = t(`${activeChannels.length} / 8 ช่อง`, `${activeChannels.length} / 8 ch`);
    for (const [name, circle] of head.dots.entries()) {
      const isOn = activeChannels.includes(name);
      const isInsp = name === inspectCh;
      const col = REGION_COLOR[byName[name]?.region] || '#FF6B4A';
      circle.setAttribute('fill', isOn ? col : '#FFFDF9');
      circle.setAttribute('stroke', isInsp ? '#1F2A44' : '#1F2A44');
      circle.setAttribute('stroke-width', isInsp ? '3.2' : '2');
      circle.setAttribute('r', isInsp ? '11' : '9');
      const txt = head.labels.get(name);
      if (txt) txt.setAttribute('fill', isOn ? '#FFFEFB' : '#1F2A44');
    }
  }

  // Scope holder (rebuilt when channel list changes)
  const scopeCanvas = h('canvas', {
    class: 'scope pg-scope-canvas',
    'aria-label': t('กราฟคลื่นสมอง EEG หลายช่องสัญญาณแบบสด', 'Live multi-channel EEG oscilloscope plot'),
  });
  let scope = null;

  function buildScope() {
    if (scope) scope.dispose();
    scope = new Scope(scopeCanvas, {
      channels: activeChannels.length,
      fs,
      seconds: 4,
      labels: [...activeChannels],
      colors: activeChannels.map((n) => REGION_COLOR[byName[n]?.region] || '#1F2A44'),
      range: 70,
      labelWidth: 48,
    });
    // Pre-fill 4 seconds so the scope never looks blank after toggling a channel
    for (let i = 0; i < fs * 4; i++) {
      const frame = activeChannels.map((name) => {
        const raw = synths.get(name).next();
        return filters.get(name).process(raw);
      });
      scope.push(frame);
    }
    scope.draw();
  }

  function toggleChannel(name) {
    const idx = activeChannels.indexOf(name);
    if (idx >= 0) {
      if (activeChannels.length <= 1) {
        toast(t('ต้องเปิดอย่างน้อย 1 ช่องสัญญาณ', 'At least 1 channel must remain active'), icon('warn'));
        return;
      }
      activeChannels.splice(idx, 1);
      if (inspectCh === name) inspectCh = activeChannels[0];
    } else {
      if (activeChannels.length >= 8) {
        toast(t('เลือกแสดงพร้อมกันได้สูงสุด 8 ช่อง (ปิดช่องเดิมก่อนนะ)', 'Up to 8 channels can be displayed at once (deselect one first)'), icon('info'));
        return;
      }
      activeChannels.push(name);
      inspectCh = name;
    }
    syncHeadDots();
    syncInspectSelect();
    buildScope();
    const meta = byName[name];
    if (meta) {
      mascotBuddy.say(t(`ขั้ว <b>${name}</b> (${meta.letter.th}): ${meta.note}`, `Electrode <b>${name}</b> (${meta.letter.th}): ${meta.note}`), 'idle');
    }
  }

  // 2) Mental state buttons + instant artifact injectors
  const stateBtns = new Map();
  const stateBar = h('div', { class: 'seg pg-state-seg', role: 'group', 'aria-label': t('เลือกสภาวะสมอง', 'Select mental state') });

  for (const st of STATES) {
    const b = h(
      'button',
      {
        'aria-pressed': String(st.id === currentState.id),
        onclick: () => {
          currentState = st;
          for (const [id, btn] of stateBtns.entries()) {
            btn.setAttribute('aria-pressed', String(id === st.id));
          }
          applyStateAmps();
          scope?.mark(st.label.split(' ')[0], '#1FA39A');
          mascotBuddy.say(st.tip, 'happy');
        },
      },
      st.label
    );
    stateBtns.set(st.id, b);
    stateBar.append(b);
  }

  // Instant artifact buttons
  const blinkBtn = h(
    'button',
    {
      class: 'btn sm',
      onclick: () => {
        for (const e of ELECTRODES) {
          // Stronger on frontal (y near +1)
          const frontWeight = clamp((e.xy[1] + 0.3) / 1.2, 0.05, 1.0);
          synths.get(e.name).addEvent(shapes.blink(135 * frontWeight), 0.36);
        }
        scope?.mark(t('กะพริบตา (EOG)', 'Blink (EOG)'), '#FF6B4A');
        mascotBuddy.say(
          t(
            'ฉีด <b>สัญญาณกะพริบตา (EOG)</b> แล้ว! สังเกตเนินช้าขนาดใหญ่ที่ขั้วหน้าผาก <b>Fp1 / Fz</b>',
            'Injected <b>Eye Blink (EOG)</b> artifact! Notice the large slow deflection on frontal channels <b>Fp1 / Fz</b>.'
          ),
          'oops'
        );
      },
    },
    h('span', { html: icon('eye') }),
    t('กะพริบตา (EOG)', 'Eye Blink (EOG)')
  );

  const alphaBoostBtn = h(
    'button',
    {
      class: 'btn sm',
      onclick: () => {
        const st = STATES.find((s) => s.id === 'eyesClosed');
        stateBtns.get(st.id)?.click();
        if (activeChannels.includes('O1')) inspectCh = 'O1';
        else if (activeChannels.includes('O2')) inspectCh = 'O2';
        syncHeadDots();
        syncInspectSelect();
      },
    },
    h('span', { html: icon('wave') }),
    t('หลับตาเพิ่ม Alpha ที่ O1/O2', 'Eyes Closed Alpha Boost (O1/O2)')
  );

  const emgBtn = h(
    'button',
    {
      class: 'btn sm',
      onclick: () => {
        for (const e of ELECTRODES) {
          synths.get(e.name).addEvent(shapes.emg(65), 0.75);
        }
        scope?.mark(t('ขบกราม (EMG)', 'Jaw (EMG)'), '#F2B632');
        mascotBuddy.say(
          t(
            'ฉีด <b>สัญญาณขบกราม (EMG)</b> แล้ว! คลื่นความถี่สูงกระจายไปทั่ว ลองลด <b>Low-pass filter</b> ลงเหลือ 30 Hz เพื่อกรองออกดูสิ',
            'Injected <b>Jaw Clench (EMG)</b> artifact! High-frequency muscle bursts spread across channels — try lowering the <b>Low-pass filter</b> to 30 Hz to clean it up.'
          ),
          'think'
        );
      },
    },
    h('span', { html: icon('zap') }),
    t('ขบกราม (EMG)', 'Jaw Clench (EMG)')
  );

  const line50Btn = h(
    'button',
    {
      class: 'btn sm',
      'aria-pressed': 'false',
      onclick: () => {
        line50 = !line50;
        line50Btn.setAttribute('aria-pressed', String(line50));
        applyStateAmps();
        scope?.mark(line50 ? '50Hz ON' : '50Hz OFF', '#9C8FD6');
        mascotBuddy.say(
          line50
            ? t(
                'เปิด <b>คลื่นรบกวนไฟบ้าน 50 Hz</b> แล้ว! ลองเปิดสวิตช์ <b>Notch 50 Hz</b> ด้านขวาเพื่อตัดเฉพาะความถี่ 50 Hz ออกทันที',
                'Turned ON <b>50 Hz Power-Line Noise</b>! Toggle the <b>50 Hz Notch Filter</b> on the left to surgically remove the 50 Hz hum.'
              )
            : t('ปิดคลื่นรบกวนไฟบ้าน 50 Hz แล้ว', 'Turned OFF 50 Hz Power-Line Noise.'),
          line50 ? 'oops' : 'idle'
        );
      },
    },
    h('span', { html: icon('flame') }),
    t('ไฟบ้าน 50 Hz', '50 Hz Line Noise')
  );

  // 3) Live Filter controls (High-pass, Low-pass, Notch 50 Hz)
  const hpOut = h('output', {}, `${hpCut} Hz`);
  const hpSlider = h('input', {
    type: 'range',
    min: 0,
    max: 5,
    step: 0.5,
    value: hpCut,
    oninput: (e) => {
      hpCut = Number(e.target.value);
      hpOut.textContent = hpCut === 0 ? t('ปิด (0 Hz)', 'Off (0 Hz)') : `${hpCut} Hz`;
      rebuildFilters();
    },
  });

  const lpOut = h('output', {}, `${lpCut} Hz`);
  const lpSlider = h('input', {
    type: 'range',
    min: 15,
    max: 80,
    step: 5,
    value: lpCut,
    oninput: (e) => {
      lpCut = Number(e.target.value);
      lpOut.textContent = lpCut >= 80 ? t('ไม่จำกัด', 'No Limit') : `${lpCut} Hz`;
      rebuildFilters();
    },
  });

  const notchCheck = h('input', {
    type: 'checkbox',
    checked: notchOn,
    onchange: (e) => {
      notchOn = e.target.checked;
      rebuildFilters();
      mascotBuddy.say(
        notchOn
          ? t(
              'เปิด <b>Notch Filter 50 Hz</b> แล้ว! สัญญาณรบกวนจากไฟบ้าน 50 Hz ถูกกรองหายไปโดยไม่กระทบคลื่นสมองข้างเคียง',
              'Enabled <b>50 Hz Notch Filter</b>! The 50 Hz power-line interference is removed without affecting surrounding brainwave bands.'
            )
          : t('ปิด Notch Filter 50 Hz แล้ว', 'Disabled 50 Hz Notch Filter.'),
        'happy'
      );
    },
  });

  // 4) Pause/Resume + Export CSV
  const pauseBtn = h(
    'button',
    {
      class: 'btn sm',
      onclick: () => {
        paused = !paused;
        pauseBtn.innerHTML = paused
          ? `${icon('play')} ${t('เล่นต่อ (Resume)', 'Resume')}`
          : `${icon('pause')} ${t('หยุดภาพ (Pause)', 'Pause')}`;
      },
    },
    h('span', { html: icon('pause') }),
    t('หยุดภาพ (Pause)', 'Pause')
  );

  const exportCsvBtn = h(
    'button',
    {
      class: 'btn sm teal',
      onclick: () => exportCSV(),
    },
    h('span', { html: icon('download') }),
    t('ดาวน์โหลด CSV (Export CSV)', 'Export CSV')
  );

  function exportCSV() {
    if (!scope) return;
    const data = scope.data; // Array of Float32Array(len) per active channel
    const len = data[0]?.length || 0;
    const header = ['time_s', ...activeChannels].join(',');
    const rows = [header];
    for (let i = 0; i < len; i++) {
      const t = (i / fs).toFixed(4);
      const vals = activeChannels.map((_, c) => data[c][i].toFixed(2));
      rows.push(`${t},${vals.join(',')}`);
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neurolab-eeg-${activeChannels.join('-')}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(t('ดาวน์โหลดไฟล์ CSV (4 วินาทีล่าสุด) เรียบร้อย!', 'Downloaded CSV file (last 4 seconds)!'), icon('download'));
  }

  // 5) FFT Spectrum of selected channel + band power bars
  const inspectSelect = h('div', { class: 'seg pg-ch-seg', role: 'group', 'aria-label': t('เลือกช่องเพื่อดูสเปกตรัม FFT', 'Select channel for FFT spectrum') });

  function syncInspectSelect() {
    inspectSelect.innerHTML = '';
    for (const ch of activeChannels) {
      inspectSelect.append(
        h(
          'button',
          {
            'aria-pressed': String(ch === inspectCh),
            onclick: () => {
              inspectCh = ch;
              syncHeadDots();
              syncInspectSelect();
              drawFFTPanel();
            },
          },
          ch
        )
      );
    }
  }

  const specCanvas = h('canvas', {
    class: 'scope pg-spec-canvas',
    'aria-label': t('กราฟสเปกตรัมความถี่ FFT ของช่องสัญญาณที่เลือก', 'FFT frequency spectrum of the selected channel'),
  });

  const bandReadout = h('div', { class: 'pg-band-pills' });

  // Page layout assembly
  const pageEl = h(
    'div',
    { class: 'wrap page pg-page' },
    h(
      'header',
      { class: 'page-head' },
      h('span', { class: 'kicker' }, t('PLAYGROUND · ห้องทดลองสัญญาณ', 'PLAYGROUND · SIGNAL LAB')),
      h('h1', {}, t('จำลองคลื่นสมอง EEG แบบสด', 'Live Multi-Channel EEG Simulator')),
      h(
        'p',
        { class: 'lead muted' },
        t(
          'เลือกขั้วอิเล็กโทรดระบบ 10-20 ได้สูงสุด 8 ช่อง ทดลองเปลี่ยนสภาวะสมอง ฉีดสิ่งแปลกปลอม (Artifact) ปรับตัวกรองความถี่ (FilterChain) และส่งออกไฟล์ CSV ไปวิเคราะห์ต่อได้ทันที',
          'Select up to 8 electrodes on the 10-20 head map, switch mental states, inject realistic artifacts, tune live biquad filters (FilterChain), and export CSV recordings.'
        )
      )
    ),
    // Top control strip: States + Artifacts + Actions
    h(
      'section',
      { class: 'card pg-top-card' },
      h(
        'div',
        { class: 'pg-ctl-group' },
        h('span', { class: 'ctl-label' }, t('สภาวะสมอง (Mental State):', 'Mental State:')),
        stateBar
      ),
      h(
        'div',
        { class: 'pg-ctl-group' },
        h('span', { class: 'ctl-label' }, t('ฉีดเหตุการณ์ / สิ่งแปลกปลอม (Inject Event):', 'Inject Event / Artifact:')),
        h('div', { class: 'widget-row' }, blinkBtn, alphaBoostBtn, emgBtn, line50Btn)
      )
    ),
    // Middle grid: Left 2D Head + FilterChain, Right Multi-channel Scope
    h(
      'div',
      { class: 'pg-main-grid' },
      // Sidebar: Head 10-20 + FilterChain
      h(
        'aside',
        { class: 'pg-sidebar' },
        h(
          'div',
          { class: 'card pg-head-card' },
          h(
            'div',
            { class: 'pg-card-title' },
            h('strong', {}, t('เลือกขั้วอิเล็กโทรด (10-20)', 'Select Electrodes (10-20)')),
            chCountChip
          ),
          h('p', { class: 'small muted' }, t('คลิกจุดบนศีรษะเพื่อเปิด/ปิดช่องสัญญาณ (สูงสุด 8 ช่อง)', 'Click dots on the scalp to toggle channels (max 8 channels)')),
          head.svg,
          h(
            'div',
            { class: 'widget-row', style: { justifyContent: 'center', marginTop: '8px' } },
            h(
              'button',
              {
                class: 'btn sm ghost',
                onclick: () => {
                  activeChannels = [...DEFAULT_CHANNELS];
                  inspectCh = 'O1';
                  syncHeadDots();
                  syncInspectSelect();
                  buildScope();
                },
              },
              h('span', { html: icon('reset') }),
              t('ค่าเริ่มต้น 8 ช่อง', 'Default 8 Channels')
            )
          )
        ),
        h(
          'div',
          { class: 'card pg-filter-card' },
          h('strong', {}, t('ตัวกรองสัญญาณสด (FilterChain)', 'Live Signal Filters (FilterChain)')),
          h(
            'div',
            { class: 'field', style: { marginTop: '10px' } },
            h('label', { class: 'ctl-label' }, t('High-pass (ตัดคลื่นช้า)', 'High-pass (Remove slow drift)'), hpOut),
            hpSlider
          ),
          h(
            'div',
            { class: 'field', style: { marginTop: '8px' } },
            h('label', { class: 'ctl-label' }, t('Low-pass (ตัดคลื่นความถี่สูง)', 'Low-pass (Remove high-freq noise)'), lpOut),
            lpSlider
          ),
          h(
            'label',
            { class: 'switch', style: { marginTop: '12px' } },
            notchCheck,
            h('span', { class: 'track' }),
            h('span', {}, t('กรองไฟบ้าน 50 Hz (Notch Filter)', '50 Hz Line Hum Filter (Notch)'))
          )
        )
      ),
      // Right: Live Scope + FFT Spectrum
      h(
        'div',
        { class: 'pg-Monitor-col' },
        h(
          'div',
          { class: 'card pg-scope-card' },
          h(
            'div',
            { class: 'pg-scope-head' },
            h(
              'div',
              {},
              h('strong', {}, t('ออสซิลโลสโคปหลายช่องสัญญาณ (Multi-channel EEG Scope)', 'Multi-Channel EEG Oscilloscope')),
              h('span', { class: 'small muted', style: { marginLeft: '10px' } }, t('250 Hz · หน้าต่าง 4 วินาที', '250 Hz · 4-second window'))
            ),
            h('div', { class: 'widget-row' }, pauseBtn, exportCsvBtn)
          ),
          scopeCanvas
        ),
        h(
          'div',
          { class: 'card pg-fft-card' },
          h(
            'div',
            { class: 'pg-scope-head' },
            h('strong', {}, t('สเปกตรัมความถี่สด (Live FFT Spectrum 0–60 Hz)', 'Live Frequency Spectrum (FFT 0–60 Hz)')),
            h(
              'div',
              { class: 'widget-row' },
              h('span', { class: 'small muted' }, t('ช่องที่วัด:', 'Channel:')),
              inspectSelect
            )
          ),
          specCanvas,
          bandReadout
        )
      )
    ),
    mascotBuddy.el
  );

  main.append(pageEl);

  let fitSpec = null;
  fitSpec = fitCanvas(specCanvas, () => { if (fitSpec) drawFFTPanel(); });

  function drawFFTPanel() {
    if (!scope) return;
    const chIdx = Math.max(0, activeChannels.indexOf(inspectCh));
    const trace = scope.data[chIdx];
    if (!trace) return;

    const sp = spectrum(trace, fs, 512);
    const { ctx: c, w, h: ch } = fitSpec;

    const markers = [];
    if (line50) markers.push({ f: 50, label: '50 Hz Line', color: '#FF6B4A' });

    drawSpectrum(c, w, ch, sp, {
      maxF: 60,
      maxY: 22,
      bands: true,
      color: REGION_COLOR[byName[inspectCh]?.region] || '#1F2A44',
      fill: 'rgba(31, 163, 154, 0.16)',
      markers,
    });

    // Update band power pills + RMS
    const sigRms = rms(trace).toFixed(1);
    bandReadout.innerHTML = '';
    bandReadout.append(h('span', { class: 'chip' }, `${inspectCh} RMS: ${sigRms} µV`));
    for (const [k, b] of Object.entries(BANDS)) {
      const pwr = bandPower(sp, b.lo, b.hi).toFixed(1);
      bandReadout.append(
        h(
          'span',
          { class: 'chip' },
          h('span', { class: 'dot', style: { background: b.color } }),
          `${b.th} (${b.lo}–${b.hi}Hz): ${pwr}`
        )
      );
    }
  }

  syncHeadDots();
  syncInspectSelect();
  buildScope();
  drawFFTPanel();

  let fftTimer = 0;
  const stopLoop = loop((dt) => {
    if (paused) return;
    const nSamples = Math.max(1, Math.min(18, Math.round(dt * fs)));
    for (let i = 0; i < nSamples; i++) {
      // Step all active channels through their synth + FilterChain
      const frame = activeChannels.map((name) => {
        const raw = synths.get(name).next();
        return filters.get(name).process(raw);
      });
      scope.push(frame);
    }
    scope.draw();

    fftTimer += dt;
    if (fftTimer >= 0.08) {
      fftTimer = 0;
      drawFFTPanel();
    }
  });

  return () => {
    stopLoop();
    scope?.dispose();
    fitSpec.dispose();
  };
}

export default render;
