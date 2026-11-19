// Lesson 12 widget: Code Lab — Interactive 6-step MNE-Python + scikit-learn Motor Imagery (CSP + LDA) pipeline + BCI resources.
import { h, esc, toast } from '../util.js';
import { icon } from '../ui/icons.js';
import { headTop, paintTopomap } from '../ui/head2d.js';
import { fitCanvas, drawGrid, INK, MONO, HEAD } from '../signal/plot.js';
import { t } from '../i18n.js';

function getSteps() {
  return [
    {
      num: 1,
      title: t('1. โหลดข้อมูลจริงจาก PhysioNet EEGBCI', '1. Load Real Data from PhysioNet EEGBCI'),
      summary: t(
        'ดึงไฟล์ EDF ของอาสาสมัคร (Subject 1) รอบที่จินตนาการขยับมือ vs เท้า โดย MNE-Python จะดาวน์โหลดให้อัตโนมัติพร้อมตั้งตำแหน่งอิเล็กโทรดมาตรฐาน 10-05',
        'Fetch EDF files for Subject 1 (hands vs. feet motor imagery runs). MNE-Python downloads them automatically and applies the standard 10-05 electrode montage.'
      ),
      code: `from mne.datasets import eegbci
from mne.io import concatenate_raws, read_raw_edf
import mne

subject = 1
runs = [6, 10, 14]  # Motor imagery: hands vs feet
raw_fnames = eegbci.load_data(subject, runs)
raw = concatenate_raws([read_raw_edf(f, preload=True) for f in raw_fnames])

eegbci.standardize(raw)  # ${t('แปลงชื่อขั้วเป็นมาตรฐานสมัยใหม่', 'Standardize channel names to modern convention')}
montage = mne.channels.make_standard_montage("standard_1005")
raw.set_montage(montage)
print(raw.info)`,
      terminal: `Downloading EEGBCI S001R06.edf, S001R10.edf, S001R14.edf ... [done]
Extracting EDF parameters from 3 files...
<Info | 64 EEG channels, sfreq: 160.0 Hz, duration: 360.0 s (57,600 samples)>
Montage: standard_1005 (Fp1, Fp2, F3, Fz, F4, C3, Cz, C4, P3, Pz, P4, O1, O2 ...)`,
      plotTitle: t('ตัวอย่างข้อมูลดิบ Raw EEG 64 ช่อง (Sampling rate = 160 Hz)', '64-channel Raw EEG Preview (Sampling rate = 160 Hz)'),
    },
    {
      num: 2,
      title: t('2. กรองความถี่ย่าน Mu และ Beta (7–30 Hz)', '2. Band-Pass Filter Mu & Beta (7–30 Hz)'),
      summary: t(
        'ใช้ Zero-phase FIR Band-pass filter เก็บเฉพาะย่าน Mu (8–13 Hz) และ Beta (13–30 Hz) ที่เกี่ยวกับการสั่งการเคลื่อนไหว พร้อมตัด Drift ความถี่ต่ำและไฟบ้าน 50/60 Hz ออกไปในตัว',
        'Apply a zero-phase FIR band-pass filter to keep only the motor-related Mu (8–13 Hz) and Beta (13–30 Hz) bands while removing slow drift and 50/60 Hz power-line noise.'
      ),
      code: `# ${t('เลือกเฉพาะช่องสัญญาณ EEG (ตัดช่องกระตุ้น STI ออก)', 'Pick only EEG channels (exclude stimulus STI channels)')}
picks = mne.pick_types(raw.info, meg=False, eeg=True, stim=False, eog=False)

# ${t('กรอง Band-pass 7–30 Hz ด้วย FIR filter (Zero-phase)', 'Band-pass filter 7–30 Hz with zero-phase FIR filter')}
raw.filter(7.0, 30.0, fir_design="firwin", picks=picks, skip_by_annotation="edge")
print("Filtered bandpass: 7.0 - 30.0 Hz (Mu + Beta bands)")`,
      terminal: `Filtering raw data in 3 contiguous segments
Setting up band-pass filter from 7 - 30 Hz
FIR filter parameters:
- Windowed time-domain design (firwin), Hamming window
- Lower passband edge: 7.00 Hz, Upper passband edge: 30.00 Hz
Filtered bandpass: 7.0 - 30.0 Hz (Mu + Beta bands) [done]`,
      plotTitle: t('ผลลัพธ์การกรอง 7–30 Hz: ตัด Baseline Drift และไฟบ้าน เหลือเฉพาะ Mu + Beta', '7–30 Hz Filter Response: Removes baseline drift & line noise, keeping Mu + Beta'),
    },
    {
      num: 3,
      title: t('3. ตัดแบ่งสัญญาณตามเหตุการณ์ (Epoching)', '3. Slice Signal Around Events (Epoching)'),
      summary: t(
        'อ่านป้ายกำกับเหตุการณ์ (Annotations T1 vs T2) แล้วหั่นสัญญาณรอบจุดเริ่มคิดขยับ ตั้งแต่วินาทีที่ -1.0 ถึง +4.0 ได้ก้อนข้อมูล 3 มิติ (Trials × Channels × Time)',
        'Read event annotations (T1 vs. T2) and slice epochs from -1.0 s to +4.0 s around imagery onset into a 3D tensor (Trials × Channels × Time).'
      ),
      code: `events, _ = mne.events_from_annotations(raw, event_id=dict(T1=2, T2=3))
event_id = dict(hands=2, feet=3)

# ${t('ตัดช่วงเวลาตั้งแต่วินาทีที่ -1.0 ถึง +4.0 รอบจุดเริ่มจินตนาการ (t = 0)', 'Slice time window from -1.0 s to +4.0 s around imagery onset (t = 0)')}
epochs = mne.Epochs(
    raw, events, event_id, tmin=-1.0, tmax=4.0,
    proj=True, picks=picks, baseline=None, preload=True
)
epochs_train = epochs.copy().crop(tmin=1.0, tmax=2.0)  # ${t('ช่วงที่ ERD ชัดที่สุด', 'Window with strongest ERD')}
labels = epochs.events[:, -1] - 2
print(f"Epochs shape: {epochs_train.get_data().shape}, Labels: {labels.shape}")`,
      terminal: `Used Annotations descriptions: ['T1', 'T2']
Not setting metadata
45 matching events found (hands: 23, feet: 22)
Loading data for 45 events and 801 original time points ...
0 bad epochs dropped
Epochs shape: (45, 64, 161), Labels: (45,)`,
      plotTitle: t('โครงสร้าง Epochs 45 รอบทดลอง: ช่วง 1.0–2.0 วินาทีหลังสิ่งเร้าคือจุดที่ ERD เด่นชัดที่สุด', '45 Trial Epochs: 1.0–2.0 s post-cue is the window where ERD is strongest'),
    },
    {
      num: 4,
      title: t('4. สกัดคุณลักษณะเชิงพื้นที่ด้วย CSP (Common Spatial Patterns)', '4. Extract Spatial Features with CSP (Common Spatial Patterns)'),
      summary: t(
        'CSP คำนวณเมทริกซ์น้ำหนักเชิงพื้นที่ W จาก 64 ช่อง ให้เหลือเพียง 4 คอมโพเนนต์เด่นที่แยกความแปรปรวน (Variance) ของสองคลาสออกจากกันได้มากที่สุด แล้วแปลงเป็นค่า Log-Variance',
        'CSP learns a spatial weight matrix W reducing 64 channels to 4 components that maximize variance differences between the two classes, then computes log-variance features.'
      ),
      code: `from mne.decoding import CSP

# ${t('เลือก 4 คอมโพเนนต์หลัก (2 ฝั่งแรกเด่นคลาสแรก, 2 ฝั่งท้ายเด่นคลาสสอง)', 'Select 4 main components (first 2 favor class 0, last 2 favor class 1)')}
csp = CSP(n_components=4, reg=None, log=True, norm_trace=False)

X_data = epochs_train.get_data(copy=False)
X_csp = csp.fit_transform(X_data, labels)
print("CSP features shape:", X_csp.shape)
print("Sample trial #0 log-variances:", X_csp[0].round(3))`,
      terminal: `Computing rank from data with rank=None
    Using tolerance 0.00025 (2.2e-16 eps * 64 dim * 1.7e+10 max singular value)
    Estimated rank (mag): 64
Reducing data rank from 64 -> 64
CSP features shape: (45, 4)
Sample trial #0 log-variances: [-1.412 -1.185  0.342  0.518]`,
      plotTitle: t('แผนที่น้ำหนักเชิงพื้นที่ (Spatial Patterns CSP0 & CSP1) เน้นบริเวณ Motor Cortex (C3/Cz/C4)', 'CSP Spatial Patterns (CSP0 & CSP1) focused over the Motor Cortex (C3/Cz/C4)'),
    },
    {
      num: 5,
      title: t('5. ประกอบร่าง Pipeline: CSP + ตัวจำแนก LDA', '5. Assemble Pipeline: CSP + LDA Classifier'),
      summary: t(
        'นำ CSP และ Linear Discriminant Analysis (LDA) มาต่อกันด้วย scikit-learn Pipeline เพื่อป้องกัน Data Leakage เวลาแบ่งข้อมูลฝึกและทดสอบ',
        'Chain CSP and Linear Discriminant Analysis (LDA) into a scikit-learn Pipeline to prevent data leakage during train/test splits.'
      ),
      code: `from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.pipeline import Pipeline

lda = LinearDiscriminantAnalysis()
clf = Pipeline([
    ("CSP", csp),
    ("LDA", lda),
])
clf.fit(X_data, labels)
print("Pipeline fitted:", clf)`,
      terminal: `Pipeline fitted:
Pipeline(steps=[('CSP', CSP(log=True, n_components=4)),
                ('LDA', LinearDiscriminantAnalysis())])
LDA weights (4 CSP components): [-2.34, -1.61, +2.08, +1.79]
Intercept b: 0.042`,
      plotTitle: t('การกระจายตัวของฟีเจอร์ CSP คู่แรกพร้อมเส้นแบ่งตัดสินใจของ LDA', 'First two CSP features scatter plot with LDA decision boundary'),
    },
    {
      num: 6,
      title: t('6. วัดผลแม่นยำด้วย 10-Fold Cross-Validation', '6. Evaluate Accuracy with 10-Fold Cross-Validation'),
      summary: t(
        'สุ่มแบ่งข้อมูล 80% มาฝึก และ 20% มาวัดผลซ้ำ 10 รอบด้วย ShuffleSplit เพื่อพิสูจน์ว่าโมเดลทายใจผู้ทดลองในรอบที่ไม่เคยเห็นมาก่อนได้แม่นยำเพียงใด',
        'Randomly split 80% train and 20% test across 10 folds using ShuffleSplit to measure how accurately the model decodes unseen trials.'
      ),
      code: `import numpy as np
from sklearn.model_selection import ShuffleSplit, cross_val_score

cv = ShuffleSplit(10, test_size=0.2, random_state=42)
scores = cross_val_score(clf, X_data, labels, cv=cv, n_jobs=1)

chance = np.mean(labels == labels[0])
print(f"Classification accuracy: {np.mean(scores) * 100:.1f}% +/- {np.std(scores) * 100:.1f}%")
print(f"Chance level: {max(chance, 1 - chance) * 100:.1f}%")`,
      terminal: `Running 10-fold ShuffleSplit cross-validation...
Fold scores: [0.889, 0.778, 0.889, 1.000, 0.889, 0.778, 0.889, 0.889, 0.778, 0.889]
Classification accuracy: 86.7% +/- 6.7%
Chance level: 51.1%  --> ${t('ชนะการเดาสุ่มอย่างมีนัยสำคัญ!', 'Significantly above chance!')}`,
      plotTitle: t('ความแม่นยำ 10-Fold Cross-Validation (เฉลี่ย 86.7% เทียบกับเส้นเดาสุ่ม 50%)', '10-Fold Cross-Validation Accuracy (Mean 86.7% vs. 50% Chance Level)'),
    },
  ];
}

function getResources() {
  return [
    {
      name: 'MNE-Python',
      tag: 'Python Library',
      url: 'https://mne.tools/stable/auto_examples/decoding/decoding_csp_eeg.html',
      desc: t('ไลบรารีมาตรฐานโลกสำหรับวิเคราะห์คลื่นสมอง EEG/MEG พร้อมตัวอย่างโค้ด CSP + LDA ต้นฉบับ', 'World-standard Python library for EEG/MEG analysis, including the official CSP + LDA decoding example'),
    },
    {
      name: 'MOABB',
      tag: 'Benchmark',
      url: 'https://moabb.neurotechx.com/',
      desc: t('Mother of all BCI Benchmarks — รวมชุดข้อมูล BCI สาธารณะหลายสิบชุดและอัลกอริทึมเทียบวัดผลอัตโนมัติ', 'Mother of all BCI Benchmarks — dozens of public BCI datasets and automated algorithm benchmarking'),
    },
    {
      name: 'PhysioNet EEGBCI',
      tag: 'Open Dataset',
      url: 'https://physionet.org/content/eegmmidb/1.0.0/',
      desc: t('ฐานข้อมูล EEG Motor Movement/Imagery 64 ช่องจากอาสาสมัคร 109 คน โหลดฟรีผ่าน MNE ได้ทันที', '64-channel EEG Motor Movement/Imagery dataset from 109 volunteers, downloadable directly via MNE'),
    },
    {
      name: 'BCI Competition IV',
      tag: 'Competition Data',
      url: 'https://www.bbci.de/competition/iv/',
      desc: t('โจทย์แข่งขัน BCI ระดับตำนาน (เช่น Dataset 2a: Motor Imagery 4 คลาส มือซ้าย/ขวา/เท้า/ลิ้น)', 'Iconic BCI competition benchmarks (e.g., Dataset 2a: 4-class Motor Imagery — left/right hand, feet, tongue)'),
    },
    {
      name: 'Lab Streaming Layer (LSL)',
      tag: 'Real-time Stream',
      url: 'https://labstreaminglayer.org/',
      desc: t('โปรโตคอลกลางสำหรับสตรีมสัญญาณ EEG แบบสดเข้าสู่ Python พร้อมซิงค์เวลา Event ระดับมิลลิวินาที', 'Standard protocol for streaming live EEG into Python with millisecond-precision event synchronization'),
    },
    {
      name: 'OpenBCI',
      tag: 'Open Hardware',
      url: 'https://openbci.com/',
      desc: t('บอร์ดขยายสัญญาณคลื่นสมองแบบโอเพนซอร์ส (Cyton / Ganglion) สำหรับสร้างโปรเจกต์ BCI ของตัวเอง', 'Open-source biosensing amplifier boards (Cyton / Ganglion) for building your own DIY BCI projects'),
    },
  ];
}

function highlightPython(code) {
  // Safe HTML escape first, then lightweight token highlighting in warm ink/coral/teal tones
  const lines = code.split('\n');
  return lines
    .map((line) => {
      const commentIdx = line.indexOf('#');
      let codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
      const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : '';

      let html = esc(codePart)
        .replace(/\b(from|import|for|in|def|return|print)\b/g, '<span class="cl-kw">$1</span>')
        .replace(/\b(True|False|None)\b/g, '<span class="cl-bool">$1</span>')
        .replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g, '<span class="cl-str">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="cl-num">$1</span>');

      if (commentPart) {
        html += `<span class="cl-com">${esc(commentPart)}</span>`;
      }
      return html;
    })
    .join('\n');
}

export default function mount(root, ctx) {
  root.innerHTML = '';

  const STEPS = getSteps();
  const RESOURCES = getResources();

  let activeStep = 1;
  const executed = new Set([1]); // Step 1 pre-executed so visual preview is immediately populated
  let discoveredAll = false;

  // Step navigation tabs
  const stepTabs = h('div', { class: 'cl-tabs', role: 'tablist', 'aria-label': t('ขั้นตอนการเขียนโปรแกรม BCI 6 ขั้นตอน', '6 BCI programming steps') });
  const tabBtns = new Map();

  for (const s of STEPS) {
    const b = h(
      'button',
      {
        class: 'cl-tab',
        role: 'tab',
        onclick: () => selectStep(s.num),
      },
      h('span', { class: 'cl-tab-num' }, String(s.num)),
      h('span', { class: 'cl-tab-lbl' }, s.title.replace(/^\d+\.\s*/, ''))
    );
    tabBtns.set(s.num, b);
    stepTabs.append(b);
  }

  function syncTabs() {
    for (const s of STEPS) {
      const b = tabBtns.get(s.num);
      const isRun = executed.has(s.num);
      b.classList.toggle('active', s.num === activeStep);
      b.classList.toggle('done', isRun);
      b.setAttribute('aria-selected', String(s.num === activeStep));
    }
  }

  // Main step card elements
  const stepTitle = h('h4', { class: 'cl-step-title' });
  const stepSummary = h('p', { class: 'small muted cl-step-desc' });
  const codeBlock = h('pre', { class: 'cl-code' });
  const termOutput = h('pre', { class: 'cl-term' });
  const plotHeading = h('div', { class: 'cl-plot-head small' });
  const plotCanvas = h('canvas', { class: 'scope cl-canvas', 'aria-label': t('กราฟผลลัพธ์จากการรันขั้นตอน Python', 'Output plot from running the Python step') });
  const topoWrap = h('div', { class: 'cl-topo-pair', style: { display: 'none' } });

  // Build two mini topomaps for Step 4 (CSP0 and CSP1 spatial patterns)
  const headCSP0 = headTop({ size: 155, labels: true, only: ['Fp1', 'Fp2', 'F3', 'Fz', 'F4', 'C3', 'Cz', 'C4', 'P3', 'Pz', 'P4', 'O1', 'O2'] });
  const headCSP1 = headTop({ size: 155, labels: true, only: ['Fp1', 'Fp2', 'F3', 'Fz', 'F4', 'C3', 'Cz', 'C4', 'P3', 'Pz', 'P4', 'O1', 'O2'] });
  paintTopomap(headCSP0, { C3: -0.95, C4: 0.75, Cz: 0.1, F3: -0.25, F4: 0.2, P3: -0.2, P4: 0.2, O1: 0, O2: 0 }, { res: 30 });
  paintTopomap(headCSP1, { Cz: -0.95, C3: 0.45, C4: 0.45, Fz: -0.3, Pz: -0.25, O1: 0, O2: 0 }, { res: 30 });

  topoWrap.append(
    h('div', { class: 'cl-topo-item' }, headCSP0.svg, h('span', { class: 'mono small' }, t('CSP0 (เด่นที่ C3/C4 มือ)', 'CSP0 (C3/C4 Hands)'))),
    h('div', { class: 'cl-topo-item' }, headCSP1.svg, h('span', { class: 'mono small' }, t('CSP1 (เด่นที่ Cz เท้า)', 'CSP1 (Cz Feet)')))
  );

  const runBtn = h(
    'button',
    {
      class: 'btn primary sm',
      onclick: () => runCurrentStep(),
    },
    h('span', { html: icon('play') }),
    t('รันขั้นตอนนี้ (Run Step)', 'Run Step')
  );

  const nextBtn = h(
    'button',
    {
      class: 'btn sm teal',
      onclick: () => {
        if (activeStep < STEPS.length) {
          selectStep(activeStep + 1);
          runCurrentStep();
        } else {
          selectStep(1);
        }
      },
    },
    t('ขั้นตอนถัดไป', 'Next Step'),
    h('span', { html: icon('arrowRight') })
  );

  const copyStepBtn = h(
    'button',
    {
      class: 'btn sm ghost',
      onclick: () => {
        const st = STEPS[activeStep - 1];
        navigator.clipboard?.writeText(st.code);
        toast(t('คัดลอกโค้ดขั้นตอนนี้แล้ว!', 'Copied step code!'), icon('copy'));
      },
    },
    h('span', { html: icon('copy') }),
    t('คัดลอกโค้ด', 'Copy Code')
  );

  const copyAllBtn = h(
    'button',
    {
      class: 'btn sm ghost',
      onclick: () => {
        const full = STEPS.map((s) => `# --- ${s.title} ---\n${s.code}`).join('\n\n');
        navigator.clipboard?.writeText(full);
        toast(t('คัดลอกสคริปต์ Python ทั้ง 6 ขั้นตอนแล้ว!', 'Copied full 6-step Python script!'), icon('copy'));
      },
    },
    h('span', { html: icon('copy') }),
    t('คัดลอกทั้งสคริปต์', 'Copy Full Script')
  );

  // Resource links grid
  const resGrid = h(
    'div',
    { class: 'cl-res-grid' },
    RESOURCES.map((r) =>
      h(
        'a',
        {
          class: 'cl-res-card',
          href: r.url,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        h(
          'div',
          { class: 'cl-res-top' },
          h('strong', {}, r.name),
          h('span', { class: 'chip' }, r.tag),
          h('span', { class: 'cl-res-ic', html: icon('link') })
        ),
        h('p', { class: 'small muted' }, r.desc)
      )
    )
  );

  root.append(
    h(
      'div',
      { class: 'cl-wrap' },
      stepTabs,
      h(
        'div',
        { class: 'cl-workbench' },
        // Left: Code cell
        h(
          'div',
          { class: 'cl-code-col' },
          h(
            'div',
            { class: 'cl-cell-head' },
            stepTitle,
            h('div', { class: 'cl-cell-actions' }, copyStepBtn, copyAllBtn)
          ),
          stepSummary,
          codeBlock,
          h('div', { class: 'widget-row', style: { marginTop: '10px' } }, runBtn, nextBtn)
        ),
        // Right: Output terminal + Plot visualization
        h(
          'div',
          { class: 'cl-out-col' },
          h(
            'div',
            { class: 'cl-out-head' },
            h('span', { class: 'chip' }, `${icon('code')} Output & Visual Preview`),
            plotHeading
          ),
          termOutput,
          topoWrap,
          plotCanvas
        )
      ),
      h(
        'div',
        { class: 'cl-res-section' },
        h('h4', {}, h('span', { html: icon('book') }), t(' แหล่งข้อมูลและเครื่องมือมาตรฐานสำหรับทำโปรเจกต์ BCI จริง', ' Standard Datasets, Libraries & Tools for Real BCI Projects')),
        resGrid
      )
    )
  );

  let fit = null;
  fit = fitCanvas(plotCanvas, () => { if (fit) drawStepPlot(); });

  function selectStep(num) {
    activeStep = num;
    const st = STEPS[activeStep - 1];
    stepTitle.textContent = st.title;
    stepSummary.textContent = st.summary;
    codeBlock.innerHTML = `<code>${highlightPython(st.code)}</code>`;
    plotHeading.textContent = st.plotTitle;

    const hasRun = executed.has(activeStep);
    termOutput.textContent = hasRun
      ? st.terminal
      : t('กดปุ่ม "รันขั้นตอนนี้ (Run Step)" เพื่อประมวลผลโค้ดและดูกราฟผลลัพธ์...', 'Click "Run Step" to execute the code and view the output plot...');

    topoWrap.style.display = activeStep === 4 && hasRun ? 'flex' : 'none';
    plotCanvas.style.display = activeStep === 4 && hasRun ? 'none' : 'block';

    syncTabs();
    drawStepPlot();
  }

  function runCurrentStep() {
    executed.add(activeStep);
    selectStep(activeStep);
    const st = STEPS[activeStep - 1];

    if (activeStep === 6 && !discoveredAll) {
      discoveredAll = true;
      ctx?.discover?.(
        'code-lab-complete',
        t(
          'รัน Pipeline ครบทั้ง 6 ขั้นตอนแล้ว! ด้วยโค้ด Python ไม่ถึง 35 บรรทัดบน MNE + scikit-learn คุณสามารถสร้างระบบถอดรหัส Motor Imagery ที่แม่นยำถึง 86.7% ได้จริง',
          'Completed all 6 pipeline steps! With under 35 lines of Python using MNE + scikit-learn, you can build a real Motor Imagery decoder achieving 86.7% accuracy.'
        )
      );
    } else {
      ctx?.say?.(
        t(
          `รัน <b>${st.title}</b> สำเร็จ! สังเกตผลลัพธ์ในหน้าต่าง Output และกราฟด้านขวาได้เลย`,
          `Executed <b>${st.title}</b>! Check out the terminal output and visual preview on the right.`
        ),
        'happy'
      );
    }
  }

  function drawStepPlot() {
    const { ctx: c, w, h: ch } = fit;
    drawGrid(c, w, ch, { step: 20, major: 5 });

    if (!executed.has(activeStep)) {
      c.fillStyle = 'rgba(31, 42, 68, 0.55)';
      c.font = HEAD;
      c.textAlign = 'center';
      c.fillText(t('กดปุ่ม "รันขั้นตอนนี้ (Run Step)" เพื่อแสดงกราฟผลลัพธ์', 'Click "Run Step" to display the output plot'), w / 2, ch / 2);
      return;
    }

    const pad = { l: 42, r: 16, t: 18, b: 26 };
    const pw = Math.max(10, w - pad.l - pad.r);
    const ph = Math.max(10, ch - pad.t - pad.b);

    if (activeStep === 1) {
      // Multi-channel raw EEG preview (C3, Cz, C4) with slow drift + 60Hz hum
      const names = ['C3', 'Cz', 'C4'];
      const cols = ['#FF6B4A', '#1F2A44', '#1FA39A'];
      for (let k = 0; k < 3; k++) {
        const yMid = pad.t + ((k + 0.5) / 3) * ph;
        c.fillStyle = cols[k];
        c.font = MONO;
        c.textAlign = 'left';
        c.fillText(names[k], 8, yMid + 4);

        c.strokeStyle = cols[k];
        c.lineWidth = 1.6;
        c.beginPath();
        for (let i = 0; i <= 180; i++) {
          const t = i / 180;
          const x = pad.l + t * pw;
          const drift = Math.sin(2 * Math.PI * (0.8 + k * 0.2) * t) * 10;
          const mu = Math.sin(2 * Math.PI * (10 + k) * t * 3) * 8;
          const hf = Math.sin(2 * Math.PI * 45 * t * 3) * 3.5;
          const y = yMid - (drift + mu + hf);
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
    } else if (activeStep === 2) {
      // Frequency response / filtered clean Mu+Beta signal comparison
      c.fillStyle = 'rgba(31, 163, 154, 0.16)';
      const x7 = pad.l + (7 / 50) * pw;
      const x30 = pad.l + (30 / 50) * pw;
      c.fillRect(x7, pad.t, x30 - x7, ph);

      c.strokeStyle = '#1FA39A';
      c.lineWidth = 2.5;
      c.beginPath();
      for (let f = 0; f <= 50; f += 0.5) {
        const x = pad.l + (f / 50) * pw;
        const pass = f >= 7 && f <= 30 ? 1 : f < 7 ? Math.exp(-Math.pow((7 - f) / 2, 2)) : Math.exp(-Math.pow((f - 30) / 3, 2));
        const y = pad.t + ph - pass * (ph - 16);
        f === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();

      c.fillStyle = INK;
      c.font = MONO;
      c.textAlign = 'center';
      c.fillText('Passband: 7–30 Hz (Mu + Beta)', (x7 + x30) / 2, pad.t + 16);
      for (const f of [0, 7, 13, 30, 50]) {
        c.fillText(`${f}Hz`, pad.l + (f / 50) * pw, ch - 7);
      }
    } else if (activeStep === 3) {
      // Epoch timeline [-1.0s .. +4.0s] with cue at 0s and active window [1.0s .. 2.0s]
      const X = (t) => pad.l + ((t + 1) / 5) * pw;
      const xCue = X(0), x1 = X(1), x2 = X(2);

      c.fillStyle = 'rgba(242, 182, 50, 0.22)';
      c.fillRect(x1, pad.t, x2 - x1, ph);

      c.strokeStyle = '#FF6B4A';
      c.lineWidth = 2;
      c.setLineDash([5, 4]);
      c.beginPath();
      c.moveTo(xCue, pad.t);
      c.lineTo(xCue, pad.t + ph);
      c.stroke();
      c.setLineDash([]);

      // Envelope showing ERD drop between 0.5s and 3.0s
      c.strokeStyle = '#1FA39A';
      c.lineWidth = 2.4;
      c.beginPath();
      for (let i = 0; i <= 200; i++) {
        const t = -1 + (i / 200) * 5;
        const erdEnv = t > 0.3 && t < 3.2 ? 0.38 : 1.0;
        const wave = Math.sin(2 * Math.PI * 10 * t) * 26 * erdEnv;
        const px = X(t);
        const py = pad.t + ph / 2 - wave;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke();

      c.fillStyle = '#FF6B4A';
      c.font = MONO;
      c.textAlign = 'left';
      c.fillText('Cue (0.0s)', xCue + 4, pad.t + 14);
      c.fillStyle = '#B37B00';
      c.textAlign = 'center';
      c.fillText('Crop 1–2s (ERD)', (x1 + x2) / 2, pad.t + 14);

      c.fillStyle = INK;
      for (const t of [-1, 0, 1, 2, 3, 4]) {
        c.fillText(`${t}s`, X(t), ch - 7);
      }
    } else if (activeStep === 5) {
      // 2D CSP feature scatter + LDA line
      const cx = pad.l + pw / 2;
      const cy = pad.t + ph / 2;
      c.strokeStyle = INK;
      c.lineWidth = 2;
      c.setLineDash([6, 4]);
      c.beginPath();
      c.moveTo(cx - pw * 0.35, cy - ph * 0.42);
      c.lineTo(cx + pw * 0.35, cy + ph * 0.42);
      c.stroke();
      c.setLineDash([]);

      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const r = 12 + (i % 3) * 9;
        // Class 0 (Hands - Coral)
        c.fillStyle = '#FF6B4A';
        c.strokeStyle = INK;
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(cx - 46 + Math.cos(a) * r, cy + 22 + Math.sin(a) * r * 0.7, 5, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        // Class 1 (Feet - Teal)
        c.fillStyle = '#1FA39A';
        c.beginPath();
        c.arc(cx + 46 + Math.cos(a) * r, cy - 22 + Math.sin(a) * r * 0.7, 5, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
      c.fillStyle = INK;
      c.font = MONO;
      c.textAlign = 'center';
      c.fillText(t('CSP Feature 0 vs CSP Feature 1 + เส้นแบ่ง LDA', 'CSP Feature 0 vs CSP Feature 1 + LDA Boundary'), cx, ch - 7);
    } else if (activeStep === 6) {
      // 10-fold CV bar plot
      const scores = [88.9, 77.8, 88.9, 100.0, 88.9, 77.8, 88.9, 88.9, 77.8, 88.9];
      const slot = pw / scores.length;
      const y50 = pad.t + ph * 0.5;

      for (let i = 0; i < scores.length; i++) {
        const s = scores[i];
        const bh = (s / 100) * ph;
        const bx = pad.l + i * slot + 5;
        const bw = Math.max(10, slot - 10);
        const by = pad.t + ph - bh;

        c.fillStyle = '#1FA39A';
        c.strokeStyle = INK;
        c.lineWidth = 1.5;
        c.fillRect(bx, by, bw, bh);
        c.strokeRect(bx, by, bw, bh);

        c.fillStyle = INK;
        c.font = MONO;
        c.textAlign = 'center';
        c.fillText(`F${i + 1}`, bx + bw / 2, ch - 7);
      }

      // Chance line at 50%
      c.strokeStyle = '#FF6B4A';
      c.lineWidth = 2;
      c.setLineDash([5, 4]);
      c.beginPath();
      c.moveTo(pad.l, y50);
      c.lineTo(pad.l + pw, y50);
      c.stroke();
      c.setLineDash([]);

      c.fillStyle = '#FF6B4A';
      c.font = MONO;
      c.textAlign = 'right';
      c.fillText('Chance 50%', pad.l + pw - 4, y50 - 5);
      c.fillStyle = INK;
      c.fillText('Mean = 86.7%', pad.l + pw - 4, pad.t + 13);
    }

    // Standard axes border
    c.strokeStyle = INK;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(pad.l, pad.t);
    c.lineTo(pad.l, pad.t + ph);
    c.lineTo(pad.l + pw, pad.t + ph);
    c.stroke();
  }

  selectStep(1);
  ctx?.say?.(
    t(
      'นี่คือโค้ด <b>MNE-Python + scikit-learn</b> ที่นักวิจัย BCI ใช้งานจริง! กดปุ่ม <b>"รันขั้นตอนนี้"</b> หรือ <b>"ขั้นตอนถัดไป"</b> เพื่อไล่ดูตั้งแต่โหลดข้อมูลดิบจนวัดผลแม่นยำ 86.7% ได้เลย',
      'This is real-world <b>MNE-Python + scikit-learn</b> code used by BCI researchers! Click <b>"Run Step"</b> or <b>"Next Step"</b> to step through from raw EDF loading to 86.7% cross-validation accuracy.'
    ),
    'idle'
  );

  return () => {
    fit.dispose();
  };
}
