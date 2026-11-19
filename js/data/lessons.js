// Complete 12-stage curriculum for NeuroLAB (BCI & EEG from Zero) — Bilingual TH / EN.
// Each stage connects theory -> interactive lab widget -> Neuro-noi quiz -> academic references.
import { bilingual } from '../i18n.js';

export const PHASES = [
  {
    id: 1,
    title: 'เฟส 1 · ปูพื้นฐานสมองและฮาร์ดแวร์',
    titleEn: 'Phase 1 · Neuroscience & Hardware Foundations',
    sub: 'ด่าน 1–4: จากเซลล์ประสาทสู่หมวกวัดคลื่นสมอง',
    subEn: 'Stages 1–4: From firing neurons to the 10-20 EEG cap & ADC sampling',
  },
  {
    id: 2,
    title: 'เฟส 2 · คลื่นสมองและการกรองสัญญาณ',
    titleEn: 'Phase 2 · Brain Rhythms & Signal Processing',
    sub: 'ด่าน 5–7: อ่านจังหวะคลื่น ตัดไฟบ้าน และจับผิดสิ่งแปลกปลอม',
    subEn: 'Stages 5–7: Frequency bands, 50 Hz notch filtering, FFT, and artifact hunting',
  },
  {
    id: 3,
    title: 'เฟส 3 · 3 เสาหลักของ BCI',
    titleEn: 'Phase 3 · The 3 Core BCI Paradigms',
    sub: 'ด่าน 8–10: P300, SSVEP และ Motor Imagery',
    subEn: 'Stages 8–10: P300 Speller, SSVEP, and Sensorimotor Motor Imagery (ERD/ERS)',
  },
  {
    id: 4,
    title: 'เฟส 4 · Machine Learning และลงมือทำจริง',
    titleEn: 'Phase 4 · Machine Learning & Real Python Code',
    sub: 'ด่าน 11–12: แยกคลาสด้วย CSP+LDA และเขียนโค้ด MNE-Python',
    subEn: 'Stages 11–12: Spatial filtering with CSP + LDA and coding an MNE-Python pipeline',
  },
].map((p) => bilingual(p));

const RAW_LESSONS = [
  /* ============================================================
     1. Action Potential
  ============================================================ */
  {
    id: 1,
    slug: 'action-potential',
    phase: 1,
    title: 'สมองทำงานด้วยไฟฟ้า',
    titleEn: 'Neurons & Action Potentials',
    subtitle: 'เซลล์ประสาทคุยกันอย่างไรด้วยพัลส์ไฟฟ้าระดับมิลลิโวลต์',
    subtitleEn: 'How neurons communicate using millivolt all-or-none electrical spikes',
    duration: '8 นาที',
    durationEn: '8 min',
    color: 'var(--coral)',
    regionId: 'brain',
    widget: 'action-potential',
    widgetTitle: 'ห้องแล็บยิงกระแสประสาท (Action Potential Simulator)',
    widgetTitleEn: 'Action Potential & Myelin Conduction Simulator',
    intro: `
      <p>ก่อนเราจะอ่านใจสมองด้วยคอมพิวเตอร์ มารู้จักตัวละครเอกกันก่อน! ในสมองของเรามีเซลล์ประสาท <strong>(Neuron)</strong> ประมาณ 8.6 หมื่นล้านเซลล์ แต่ละเซลล์มีหน้าตาเหมือนต้นไม้เล็กๆ ที่รับส่งข้อความด้วย <strong>กระแสไฟฟ้าเคมี</strong></p>
      <p>ในยามพัก เซลล์ประสาทจะมีศักย์ไฟฟ้าภายในติดลบเมื่อเทียบกับภายนอกประมาณ <code>-70 mV</code> เรียกว่า <strong>ศักย์เยื่อหุ้มเซลล์ขณะพัก (Resting potential)</strong> เมื่อเดนไดรต์ (Dendrite) รับสัญญาณกระตุ้นจากเซลล์เพื่อนบ้าน ประจุบวกโซเดียม (Na⁺) จะไหลเข้ามาทำให้ค่าติดลบน้อยลง</p>
      <p>ถ้าการกระตุ้นเบาเกินไป สัญญาณจะค่อยๆ จางหายไปเอง แต่ถ้าแรงดันพุ่งทะลุเส้นแบ่งสำคัญที่ประมาณ <code>-55 mV</code> ที่เรียกว่า <strong>ขีดเริ่มเปลี่ยน (Threshold)</strong> เมื่อไร ประตูโซเดียมจะเปิดพรวดพร้อมกันเกิดเป็นพัลส์ไฟฟ้าพุ่งขึ้นถึง <code>+40 mV</code> วิ่งไปตามแอกซอน (Axon) ทันที! นี่คือกฎ <strong>"ยิงสุดตัวหรือไม่ยิงเลย (All-or-none law)"</strong></p>
    `,
    introEn: `
      <p>Before we decode brain signals with a computer, let’s meet the star player! Your brain contains roughly 86 billion <strong>neurons</strong> — tree-like cells that pass messages using <strong>electrochemical pulses</strong>.</p>
      <p>At rest, the inside of a neuron is negatively charged relative to the outside at about <code>-70 mV</code>, called the <strong>resting membrane potential</strong>. When dendrites receive excitatory input from neighboring cells, positive sodium ions (Na⁺) flow in and make the membrane less negative.</p>
      <p>If a stimulus is too weak, that small voltage bump simply fades away. But the moment membrane voltage crosses the critical <strong>threshold</strong> at around <code>-55 mV</code>, voltage-gated sodium channels snap open in a chain reaction, launching a full spike up to <code>+40 mV</code> down the axon! This is the famous <strong>All-or-None Law</strong>.</p>
    `,
    callout: {
      tone: 'teal',
      title: 'ปลอกไมอีลิน (Myelin sheath) = ทางด่วนของสัญญาณ',
      text: 'แอกซอนที่มีปลอกไขมันไมอีลินหุ้ม จะให้กระแสไฟฟ้า "กระโดด" ข้ามไปตามช่องว่าง Node of Ranvier เรียกว่า Saltatory conduction ทำให้สัญญาณวิ่งเร็วขึ้นจาก ~1 m/s เป็นกว่า 80–120 m/s!',
    },
    calloutEn: {
      tone: 'teal',
      title: 'Myelin Sheath = The Neural Superhighway',
      text: 'Axons wrapped in insulating myelin sheaths let the action potential "jump" from one Node of Ranvier gap to the next (saltatory conduction), boosting conduction speed from ~1 m/s to 80–120 m/s!',
    },
    takeaways: [
      'เซลล์ประสาทขณะพักมีศักย์ไฟฟ้าประมาณ -70 mV และมีขีดเริ่มเปลี่ยน (Threshold) ที่ประมาณ -55 mV',
      'Action potential เป็นแบบ All-or-none: ถ้าถึงขีดเริ่มเปลี่ยนจะยิงพัลส์ขนาดคงที่เสมอ ถ้าไม่ถึงจะไม่ยิงเลย',
      'แต่คลื่น EEG ที่เราวัดบนหัว ไม่ได้มาจาก Action potential เดี่ยวๆ โดยตรง... ด่านหน้าจะเฉลยว่าทำไม!',
    ],
    takeawaysEn: [
      'A resting neuron sits near -70 mV with a firing threshold around -55 mV.',
      'Action potentials obey the All-or-None law: cross threshold and a full-size spike fires; fall short and no spike occurs.',
      'However, scalp EEG does not directly measure single action potentials... Stage 2 reveals why!',
    ],
    quiz: [
      {
        q: 'ถ้าเรากระตุ้นเซลล์ประสาทให้ศักย์ไฟฟ้าเปลี่ยนจาก -70 mV ไปอยู่ที่ -60 mV (ยังไม่ถึง -55 mV) จะเกิดอะไรขึ้น?',
        choices: [
          'เกิด Action potential ขนาดเล็กลงครึ่งหนึ่งวิ่งไปตามแอกซอน',
          'ไม่เกิด Action potential สัญญาณจะค่อยๆ จางกลับสู่ -70 mV',
          'เซลล์ประสาทจะสลับขั้วเป็น -100 mV ทันที',
        ],
        answer: 1,
        hint: 'นึกถึงกฎ All-or-none นะ! ถ้ายังไม่แตะเส้นประ -55 mV ประตูโซเดียมชุดใหญ่จะยังไม่เปิดจ้ะ',
        explain: 'ถูกต้อง! การกระตุ้นที่ต่ำกว่าขีดเริ่มเปลี่ยน (-55 mV) จะเกิดแค่ศักย์ไฟฟ้าเฉพาะที่แล้วจางหายไป ไม่เกิดพัลส์วิ่งไปตามแอกซอน',
      },
      {
        q: 'ปลอกไมอีลิน (Myelin sheath) และช่องว่าง Node of Ranvier ช่วยให้เกิดสิ่งใด?',
        choices: [
          'ทำให้สัญญาณกระโดดข้ามปลอกไมอีลิน (Saltatory conduction) จึงเดินทางเร็วขึ้นมาก',
          'ทำให้ศักย์ไฟฟ้าขณะพักกลายเป็นค่าบวกตลอดเวลา',
          'ช่วยกรองสัญญาณไฟบ้าน 50 Hz ออกจากสมอง',
        ],
        answer: 0,
        hint: 'ลองกดสวิตช์เปิด-ปิดปลอกไมอีลินในของเล่นด้านบน แล้วดูเวลาที่ใช้เดินทาง (ms) เทียบกันสิ!',
        explain: 'เยี่ยมเลย! ปลอกไมอีลินเป็นฉนวนไฟฟ้า ทำให้พัลส์กระโดดจาก Node of Ranvier หนึ่งไปยังอีกจุดหนึ่งได้เร็วขึ้นหลายสิบเท่า',
      },
      {
        q: 'ช่วงที่ศักย์ไฟฟ้าพุ่งขึ้นจาก -55 mV ไปถึงประมาณ +40 mV เกิดจากการเคลื่อนที่ของไอออนใดเป็นหลัก?',
        choices: [
          'โพแทสเซียมไอออน (K⁺) ไหลเข้าเซลล์',
          'โซเดียมไอออน (Na⁺) ไหลเข้าสู่ภายในเซลล์อย่างรวดเร็ว',
          'แคลเซียมไอออน (Ca²⁺) ไหลออกจากเซลล์',
        ],
        answer: 1,
        hint: 'ช่วงขาขึ้น (Depolarization) คือประจุบวกที่อยู่นอกเซลล์เยอะๆ กรูกันเข้ามาข้างในจ้ะ',
        explain: 'ถูกต้องครับ! ประตูโซเดียมที่ไวต่อแรงดันเปิดออก ทำให้ Na⁺ ไหลเข้าเซลล์จนศักย์พุ่งเป็นบวก ก่อนที่ประตู K⁺ จะเปิดตามมาเพื่อดึงศักย์กลับลงมา (Repolarization)',
      },
    ],
    quizEn: [
      {
        q: 'If a stimulus nudges a neuron’s membrane potential from -70 mV to -60 mV (still below the -55 mV threshold), what happens?',
        choices: [
          'A half-sized action potential travels down the axon',
          'No action potential fires; the local depolarization passively decays back to -70 mV',
          'The neuron immediately hyperpolarizes to -100 mV',
        ],
        answer: 1,
        hint: 'Remember the All-or-None rule! Until the voltage reaches the dashed -55 mV line, the main sodium channels stay shut.',
        explain: 'Spot on! Sub-threshold stimulation only causes a brief local potential that decays without triggering a propagating spike.',
      },
      {
        q: 'What is the primary role of the myelin sheath and the Nodes of Ranvier?',
        choices: [
          'They allow the action potential to jump node-to-node (saltatory conduction), dramatically increasing conduction speed',
          'They keep the resting membrane potential permanently positive',
          'They filter out 50 Hz power-line interference from the brain',
        ],
        answer: 0,
        hint: 'Toggle the Myelin switch in the simulator above and compare the travel time in milliseconds!',
        explain: 'Exactly! Myelin insulates the axon so ion exchange only needs to happen at the Nodes of Ranvier, speeding up transmission by 10x or more.',
      },
      {
        q: 'The rapid rising phase (depolarization) from -55 mV up to +40 mV is driven mainly by which ion movement?',
        choices: [
          'Potassium ions (K⁺) rushing into the cell',
          'Sodium ions (Na⁺) rushing into the cell through voltage-gated channels',
          'Calcium ions (Ca²⁺) leaving the cell',
        ],
        answer: 1,
        hint: 'During depolarization, abundant extracellular positive sodium ions rush inside!',
        explain: 'Correct! Voltage-gated Na⁺ channels open rapidly, letting Na⁺ flood in until the interior peaks near +40 mV before K⁺ channels open to repolarize the membrane.',
      },
    ],
    refs: [
      'Bear, M. F., Connors, B. W., & Paradiso, M. A. (2020). Neuroscience: Exploring the Brain (4th ed.). Wolters Kluwer.',
      'Hodgkin, A. L., & Huxley, A. F. (1952). A quantitative description of membrane current and its application to conduction and excitation in nerve. The Journal of Physiology.',
    ],
  },

  /* ============================================================
     2. EEG Summation
  ============================================================ */
  {
    id: 2,
    slug: 'eeg-what-it-measures',
    phase: 1,
    title: 'EEG วัดอะไรกันแน่?',
    titleEn: 'Biophysics of EEG & Spatial Summation',
    subtitle: 'ทำไมเซลล์ประสาทต้องตะโกนพร้อมกันนับแสนเซลล์ เราถึงได้ยินจากนอกกะโหลก',
    subtitleEn: 'Why hundreds of thousands of cortical neurons must chant in unison to be heard outside the skull',
    duration: '9 นาที',
    durationEn: '9 min',
    color: 'var(--teal)',
    regionId: 'frontal',
    widget: 'summation',
    widgetTitle: 'จำลองการรวมสัญญาณผ่านกะโหลก (Cortical Dipole Summation)',
    widgetTitleEn: 'Cortical Pyramidal Dipole Summation Simulator',
    intro: `
      <p>หลายคนเข้าใจผิดว่าเครื่อง <strong>EEG (Electroencephalography)</strong> วัดพัลส์ Action potential ที่เราเพิ่งยิงไปในด่านที่ 1 แต่ความจริงคือ Action potential นั้นสั้นมาก (~1 ms) และสนามไฟฟ้ารอบแอกซอนมักหักล้างกันเองจนแทบหลุดออกมาไม่ถึงหนังศีรษะเลย</p>
      <p>สิ่งที่อิเล็กโทรด EEG บนหนังศีรษะวัดได้จริงๆ คือผลรวมของ <strong>ศักย์ไฟฟ้าหลังไซแนปส์ (Postsynaptic Potentials — PSPs)</strong> ซึ่งกินเวลานานกว่า (10–100 ms) บนเดนไดรต์ของ <strong>เซลล์ประสาทพีระมิด (Pyramidal neurons)</strong> ในเปลือกสมอง</p>
      <p>เพราะเซลล์พีระมิดเรียงตัวตั้งฉากกับผิวสมองเหมือนต้นข้าวในนาเดียวกัน และเมื่อเซลล์นับหมื่นถึงนับแสนตัวทำงาน <strong>พร้อมเพรียงกัน (Synchronous)</strong> สนามไฟฟ้าไดโพลเล็กๆ ของแต่ละเซลล์จึงบวกเสริมกันจนทะลุน้ำไขสันหลัง กะโหลกศีรษะ และหนังศีรษะออกมาให้เราวัดได้ในระดับ <strong>ไมโครโวลต์ (µV — หนึ่งในล้านโวลต์!)</strong></p>
    `,
    introEn: `
      <p>A common misconception is that <strong>EEG (Electroencephalography)</strong> records the fast action potentials from Stage 1. In reality, action potentials are too brief (~1 ms) and their quadrupole fields cancel out before reaching the scalp.</p>
      <p>What scalp EEG actually measures is the summed <strong>Postsynaptic Potentials (PSPs)</strong> — slower (10–100 ms) graded voltages along the dendrites of cortical <strong>pyramidal neurons</strong>.</p>
      <p>Because pyramidal neurons stand parallel to one another and perpendicular to the cortical surface like stalks of wheat in a field, when tens of thousands of them oscillate <strong>synchronously</strong>, their tiny electrical dipoles add together and conduct through the CSF, skull, and scalp at the <strong>microvolt (µV)</strong> scale!</p>
    `,
    callout: {
      tone: 'mustard',
      title: 'จุดเด่นและข้อจำกัดของ EEG ที่นักทำ BCI ต้องจำขึ้นใจ',
      text: 'ความละเอียดเชิงเวลาสูงมาก (High temporal resolution — จับการเปลี่ยนแปลงระดับมิลลิวินาทีได้ทันที) แต่ความละเอียดเชิงพื้นที่ต่ำ (Low spatial resolution — กะโหลกศีรษะทำหน้าที่เหมือนกระจกฝ้าที่ทำให้สัญญาณเบลอกระจายออก)',
    },
    calloutEn: {
      tone: 'mustard',
      title: 'The Golden Trade-off of Scalp EEG',
      text: 'Exquisite temporal resolution (captures millisecond brain dynamics in real time), but low spatial resolution (the poorly conductive skull acts like frosted glass, smearing electrical potentials across several centimeters).',
    },
    takeaways: [
      'EEG วัดผลรวมของ Postsynaptic potentials (PSPs) จากเซลล์พีระมิดในเปลือกสมองที่เรียงตัวขนานกัน',
      'สัญญาณบนหนังศีรษะมีขนาดเล็กมาก (~5–100 µV) เพราะถูกกะโหลกศีรษะลดทอนและเกลี่ยให้เบลอ (Volume conduction)',
      'จำนวนเซลล์ + ความพร้อมเพรียง (Synchrony) คือหัวใจที่ทำให้เกิดคลื่นขนาดใหญ่อย่างคลื่น Alpha หรือ Delta',
    ],
    takeawaysEn: [
      'Scalp EEG measures summed Postsynaptic Potentials (PSPs) from parallel cortical pyramidal neurons.',
      'Scalp amplitudes are tiny (~5–100 µV) because the skull attenuates and spatially blurs the field (volume conduction).',
      'Both neuron count and phase synchrony determine whether a rhythm rises above the background noise floor.',
    ],
    quiz: [
      {
        q: 'สัญญาณหลักที่เครื่อง EEG บนหนังศีรษะตรวจจับได้มาจากแหล่งใด?',
        choices: [
          'Action potential ของเซลล์ประสาทเพียง 1 เซลล์ที่อยู่ลึกในก้านสมอง',
          'ผลรวมของ Postsynaptic potentials จากเซลล์พีระมิดจำนวนมากในเปลือกสมองที่ทำงานสอดประสานกัน',
          'คลื่นแม่เหล็กจากการหมุนของโปรตอนในโมเลกุลน้ำ',
        ],
        answer: 1,
        hint: 'เซลล์ต้องเรียงตัวขนานกันในเปลือกสมอง และส่งสัญญาณที่อยู่นานพอให้บวกกันได้จ้ะ',
        explain: 'ถูกต้อง! Postsynaptic potentials กินเวลานานกว่าและเมื่อเกิดพร้อมกันในเซลล์พีระมิดที่เรียงตัวตั้งฉากกับผิวสมอง สนามไฟฟ้าจึงบวกเสริมกันทะลุกะโหลกออกมาได้',
      },
      {
        q: 'ถ้าเซลล์ประสาท 100,000 เซลล์ทำงานหนักมาก แต่ต่างคนต่างยิงคนละจังหวะแบบสุ่ม (Synchrony ต่ำมาก) สัญญาณ EEG บนหนังศีรษะจะเป็นอย่างไร?',
        choices: [
          'แอมพลิจูดสูงมากเป็นพิเศษ',
          'บวกและลบหักล้างกันเองจนแอมพลิจูดรวมเล็กลงใกล้ระดับสัญญาณรบกวน',
          'ความถี่จะกลายเป็น 0 Hz ทันที',
        ],
        answer: 1,
        hint: 'ลองเลื่อนสไลเดอร์ความพร้อมเพรียง (Synchrony) ในของเล่นด้านบนลงมาต่ำๆ ดูสิ!',
        explain: 'ใช่เลย! เมื่อเฟสไม่ตรงกัน ยอดคลื่นบวกของเซลล์หนึ่งจะไปหักล้างกับยอดลบของอีกเซลล์หนึ่ง ทำให้ผลรวมที่หนังศีรษะมีขนาดเล็กลง',
      },
      {
        q: 'ข้อใดเปรียบเทียบคุณสมบัติของ EEG ได้ถูกต้อง?',
        choices: [
          'ความละเอียดเชิงเวลาสูง (ระดับ ms) แต่ความละเอียดเชิงพื้นที่ต่ำเพราะกะโหลกศีรษะกระจายสัญญาณ',
          'ความละเอียดเชิงพื้นที่สูงระดับไมโครเมตร แต่ความละเอียดเชิงเวลาช้าเป็นนาที',
          'วัดโครงสร้างส่วนลึกอย่าง Amygdala ได้ชัดเจนกว่าเปลือกสมองด้านนอก',
        ],
        answer: 0,
        hint: 'EEG เร็วทันใจระดับมิลลิวินาที แต่กะโหลกหนาๆ ทำให้บอกตำแหน่งเป๊ะๆ ยากจ้ะ',
        explain: 'ถูกต้อง! นี่คือเหตุผลที่ EEG เหมาะกับ BCI ที่ต้องการความเร็วแบบ Real-time แม้จะต้องใช้เทคนิคอย่าง Spatial filtering ช่วยเรื่องตำแหน่งก็ตาม',
      },
    ],
    quizEn: [
      {
        q: 'What is the primary biophysical source of the EEG signal recorded on the scalp?',
        choices: [
          'Action potentials from a single neuron deep in the brainstem',
          'Summed postsynaptic potentials (PSPs) from large populations of aligned cortical pyramidal neurons firing synchronously',
          'Magnetic resonance of hydrogen protons in water molecules',
        ],
        answer: 1,
        hint: 'Think of parallel cortical neurons generating longer-lasting dendritic potentials that add up in time!',
        explain: 'Correct! Postsynaptic potentials last 10–100 ms and sum constructively across parallel pyramidal cells oriented perpendicular to the cortex.',
      },
      {
        q: 'If 100,000 pyramidal neurons are all active but oscillate with completely random phases (very low synchrony), what does the scalp EEG look like?',
        choices: [
          'An extra-large amplitude wave',
          'Positive and negative phases cancel out, leaving a small signal near the noise floor',
          'The frequency becomes exactly 0 Hz',
        ],
        answer: 1,
        hint: 'Drag the Synchrony slider down to 10% in the simulator above and watch the summed scalp trace!',
        explain: 'Exactly! Without phase synchrony, positive peaks from some dipoles cancel negative troughs from others.',
      },
      {
        q: 'Which statement accurately describes scalp EEG’s resolution trade-off?',
        choices: [
          'High temporal resolution (millisecond scale) but low spatial resolution due to skull volume conduction',
          'Micrometer spatial resolution but minute-scale temporal resolution',
          'Measures deep nuclei like the amygdala more clearly than superficial cortex',
        ],
        answer: 0,
        hint: 'EEG responds within milliseconds, but the skull blurs where the current came from.',
        explain: 'Correct! Millisecond speed makes EEG ideal for real-time BCIs, while spatial filters like CSP help overcome spatial blurring.',
      },
    ],
    refs: [
      'Nunez, P. L., & Srinivasan, R. (2006). Electric Fields of the Brain: The Neurophysics of EEG (2nd ed.). Oxford University Press.',
      'Buzsáki, G., Anastassiou, C. A., & Koch, C. (2012). The origin of extracellular fields and currents — EEG, ECoG, LFP and spikes. Nature Reviews Neuroscience.',
    ],
  },

  /* ============================================================
     3. International 10-20 System
  ============================================================ */
  {
    id: 3,
    slug: '10-20-system',
    phase: 1,
    title: 'แผนที่ศีรษะ ระบบ 10-20',
    titleEn: 'International 10-20 System',
    subtitle: 'อ่านรหัส Fp1, C3, Cz, Pz, O2 ได้เหมือนอ่านพิกัดแผนที่ภายใน 5 นาที',
    subtitleEn: 'Decode Fp1, C3, Cz, Pz, and O2 like a map coordinate system in 5 minutes',
    duration: '10 นาที',
    durationEn: '10 min',
    color: 'var(--mustard)',
    regionId: 'motor',
    widget: 'electrode-game',
    widgetTitle: 'เกมปักหมุดอิเล็กโทรด 10-20 (Electrode Placement Challenge)',
    widgetTitleEn: '10-20 Electrode Placement Challenge',
    intro: `
      <p>ขนาดศีรษะของแต่ละคนไม่เท่ากัน นักวิทยาศาสตร์จึงตกลงใช้มาตรฐานสากลที่เรียกว่า <strong>ระบบ 10-20 (International 10-20 System)</strong> โดยวัดระยะเป็น <strong>เปอร์เซ็นต์ (10% และ 20%)</strong> ระหว่างจุดอ้างอิงบนกะโหลกศีรษะ ได้แก่ ดั้งจมูก <strong>(Nasion)</strong> ปุ่มกระดูกท้ายทอย <strong>(Inion)</strong> และจุดหน้าใบหูซ้าย-ขวา <strong>(Pre-auricular points)</strong></p>
      <p>ชื่ออิเล็กโทรดทุกตัวมีสูตรลับที่จำง่ายมาก แบ่งเป็น <strong>ตัวอักษรบอกกลีบสมอง</strong> + <strong>ตัวเลขบอกซีกซ้าย/ขวา</strong>:</p>
      <ul>
        <li><strong>ตัวอักษร:</strong> <code>Fp</code> = หน้าผาก (Frontopolar), <code>F</code> = กลีบหน้า (Frontal), <code>C</code> = แนวกลาง (Central — เหนือ Motor cortex), <code>T</code> = ขมับ (Temporal), <code>P</code> = กลีบข้าง (Parietal), <code>O</code> = ท้ายทอย (Occipital)</li>
        <li><strong>ตัวเลขคี่ (1, 3, 7):</strong> อยู่ <strong>ซีกซ้าย</strong> ของศีรษะ เช่น <code>C3</code>, <code>O1</code></li>
        <li><strong>ตัวเลขคู่ (2, 4, 8):</strong> อยู่ <strong>ซีกขวา</strong> ของศีรษะ เช่น <code>C4</code>, <code>O2</code></li>
        <li><strong>ตัวอักษร z (Zero):</strong> อยู่บน <strong>เส้นกึ่งกลางศีรษะ (Midline)</strong> พอดี เช่น <code>Fz</code>, <code>Cz</code>, <code>Pz</code>, <code>Oz</code></li>
      </ul>
    `,
    introEn: `
      <p>Because human heads come in different sizes, neuroscientists use a universal proportional grid called the <strong>International 10-20 System</strong>. Electrodes are spaced at <strong>10% and 20%</strong> fractions of the skull arc between four anatomical landmarks: the bridge of the nose <strong>(Nasion)</strong>, the bony bump at the back of the skull <strong>(Inion)</strong>, and the left/right <strong>pre-auricular points</strong> just in front of the ears.</p>
      <p>Every electrode name follows a simple 2-part code — <strong>Letter = Lobe</strong> + <strong>Number = Hemisphere</strong>:</p>
      <ul>
        <li><strong>Letters:</strong> <code>Fp</code> = Frontopolar (forehead), <code>F</code> = Frontal, <code>C</code> = Central (sensorimotor strip), <code>T</code> = Temporal, <code>P</code> = Parietal, <code>O</code> = Occipital.</li>
        <li><strong>Odd numbers (1, 3, 7):</strong> Always on the <strong>LEFT hemisphere</strong> (e.g., <code>C3</code>, <code>O1</code>).</li>
        <li><strong>Even numbers (2, 4, 8):</strong> Always on the <strong>RIGHT hemisphere</strong> (e.g., <code>C4</code>, <code>O2</code>).</li>
        <li><strong>Letter z (Zero):</strong> Sits directly on the <strong>midline</strong> (e.g., <code>Fz</code>, <code>Cz</code>, <code>Pz</code>, <code>Oz</code>).</li>
      </ul>
    `,
    callout: {
      tone: 'coral',
      title: 'ระวังชื่อเก่า vs ชื่อใหม่ในเปเปอร์วิจัย!',
      text: 'ในตำราเก่า อิเล็กโทรดขมับและกลีบข้างด้านล่างเคยใช้ชื่อ T3, T4, T5, T6 แต่มาตรฐานใหม่ (10-10) เปลี่ยนชื่อเป็น T7, T8, P7, P8 ตามลำดับเพื่อให้เลขเรียงสอดคล้องกันทั้งหัว',
    },
    calloutEn: {
      tone: 'coral',
      title: 'Watch Out for Classic vs. Modern Naming in Papers!',
      text: 'Older 10-20 diagrams labeled the lateral temporal/parietal sites T3, T4, T5, T6. Modern 10-10 nomenclature renames them T7, T8, P7, P8 so the ring numbers stay consistent.',
    },
    takeaways: [
      '10-20 มาจากการแบ่งระยะโค้งกะโหลกจาก Nasion ไป Inion และระหว่างหูสองข้างเป็นสัดส่วน 10% และ 20%',
      'เลขคี่ = ซ้าย, เลขคู่ = ขวา, z = เส้นกึ่งกลาง (Midline) ยิ่งเลขน้อยยิ่งอยู่ใกล้เส้นกลาง',
      'จำ 3 จุดพระเอกของ BCI: C3/C4 (Motor Imagery), Pz (P300), และ O1/Oz/O2 (SSVEP & คลื่น Alpha)',
    ],
    takeawaysEn: [
      '"10-20" refers to spacing electrodes at 10% and 20% intervals along the Nasion–Inion and ear-to-ear arcs.',
      'Odd numbers = Left, Even numbers = Right, z = Midline (smaller numbers sit closer to the midline).',
      'Memorize the 3 BCI hotspots: C3/C4 (Motor Imagery), Pz (P300), and O1/Oz/O2 (SSVEP & Alpha waves).',
    ],
    quiz: [
      {
        q: 'อิเล็กโทรดชื่อ "C3" วางอยู่ตรงตำแหน่งใดบนศีรษะ?',
        choices: [
          'แนวกลางศีรษะ (Central) ซีกซ้าย เหนือเปลือกสมองสั่งการเคลื่อนไหว',
          'ท้ายทอย (Occipital) ซีกขวา',
          'หน้าผาก (Frontopolar) แนวกึ่งกลางพอดี',
        ],
        answer: 0,
        hint: 'C = Central และเลข 3 เป็นเลขคี่ แปลว่าอยู่ฝั่งไหนเอ่ย?',
        explain: 'ถูกต้อง! C คือ Central และเลขคี่ (3) คือซีกซ้าย ซึ่งอยู่เหนือ Primary motor cortex ซีกซ้ายที่ควบคุมมือขวา',
      },
      {
        q: 'ถ้าต้องการวัดสัญญาณจากสมองกลีบท้ายทอย (Visual cortex) สำหรับทำ SSVEP BCI ควรเน้นดูอิเล็กโทรดกลุ่มใด?',
        choices: [
          'Fp1, Fpz, Fp2',
          'O1, Oz, O2',
          'F7, F3, Fz',
        ],
        answer: 1,
        hint: 'กลีบท้ายทอยภาษาอังกฤษคือ Occipital lobe จ้ะ',
        explain: 'แม่นมาก! O ย่อมาจาก Occipital จึงใช้อิเล็กโทรด O1 (ซ้าย), Oz (กลาง) และ O2 (ขวา)',
      },
      {
        q: 'ตัวเลข "10" และ "20" ในชื่อระบบ International 10-20 System หมายถึงอะไร?',
        choices: [
          'ต้องใช้อิเล็กโทรดอย่างน้อย 10 ตัว และไม่เกิน 20 ตัวเท่านั้น',
          'ระยะห่างระหว่างอิเล็กโทรดคิดเป็น 10% หรือ 20% ของความยาวโค้งกะโหลกจาก Nasion ไป Inion และระหว่างใบหู',
          'ความถี่คลื่นสมองที่วัดได้คือ 10 ถึง 20 Hz',
        ],
        answer: 1,
        hint: 'ดูภาพด้านข้างของศีรษะในของเล่นด้านบนที่แบ่งสัดส่วน 10% - 20% - 20% - 20% - 20% - 10% สิ!',
        explain: 'ถูกต้องครับ! การวัดเป็นเปอร์เซ็นต์ทำให้วางอิเล็กโทรดตรงส่วนสมองเดียวกันได้เสมอไม่ว่าศีรษะผู้สวมจะเล็กหรือใหญ่',
      },
    ],
    quizEn: [
      {
        q: 'Where is electrode "C3" located on the scalp?',
        choices: [
          'Central region on the LEFT hemisphere, over the primary sensorimotor cortex',
          'Occipital region on the RIGHT hemisphere',
          'Frontopolar midline on the forehead',
        ],
        answer: 0,
        hint: 'C = Central, and 3 is an odd number — which hemisphere uses odd numbers?',
        explain: 'Correct! C stands for Central and odd numbers (3) lie on the left hemisphere, directly above the motor cortex controlling the right hand.',
      },
      {
        q: 'Which electrode group sits over the occipital visual cortex and is primary for SSVEP BCIs?',
        choices: [
          'Fp1, Fpz, Fp2',
          'O1, Oz, O2',
          'F7, F3, Fz',
        ],
        answer: 1,
        hint: 'Look for the letter that stands for Occipital lobe!',
        explain: 'Spot on! O stands for Occipital, giving us O1 (left), Oz (midline), and O2 (right).',
      },
      {
        q: 'What do the numbers "10" and "20" in "International 10-20 System" represent?',
        choices: [
          'You must use between 10 and 20 electrodes',
          'Adjacent electrodes are spaced at 10% or 20% of the total Nasion–Inion and ear-to-ear skull distances',
          'It only records brain waves between 10 and 20 Hz',
        ],
        answer: 1,
        hint: 'Check the sagittal side-view diagram showing 10% – 20% – 20% – 20% – 20% – 10% along the skull!',
        explain: 'Correct! Proportional percentage spacing ensures electrodes land over homologous brain areas regardless of head size.',
      },
    ],
    refs: [
      'Jasper, H. H. (1958). The ten-twenty electrode system of the International Federation. Electroencephalography and Clinical Neurophysiology, 10, 371–375.',
      'Oostenveld, R., & Praamstra, P. (2001). The five percent electrode system for high-resolution EEG and ERP measurements. Clinical Neurophysiology.',
    ],
  },

  /* ============================================================
     4. Hardware, Impedance & Sampling Rate
  ============================================================ */
  {
    id: 4,
    slug: 'hardware-daq',
    phase: 1,
    title: 'ฮาร์ดแวร์ อิมพีแดนซ์ และการสุ่มสัญญาณ',
    titleEn: 'Electrodes, Impedance & ADC Sampling',
    subtitle: 'เจลเปียก vs แบบแห้ง ความต้านทานผิวหนัง และกฎของไนควิสต์ (Nyquist)',
    subtitleEn: 'Wet vs. dry electrodes, skin-contact impedance (kΩ), and the Nyquist sampling theorem',
    duration: '10 นาที',
    durationEn: '10 min',
    color: 'var(--slate)',
    regionId: 'brain',
    widget: 'impedance',
    widgetTitle: 'ทดลองปรับอิมพีแดนซ์และอัตราสุ่มตัวอย่าง (Impedance & Nyquist Lab)',
    widgetTitleEn: 'Electrode Impedance & Nyquist Aliasing Lab',
    intro: `
      <p>สัญญาณ EEG บนผิวหนังมีขนาดจิ๋วเพียงไม่กี่ไมโครโวลต์ กว่าสัญญาณจะเดินทางจากหนังศีรษะเข้าสู่คอมพิวเตอร์ ต้องผ่านด่านสำคัญ 2 ด่าน คือ <strong>หน้าสัมผัสอิเล็กโทรด (Electrode-skin interface)</strong> และ <strong>วงจรแปลงสัญญาณอนาล็อกเป็นดิจิทัล (ADC)</strong></p>
      <p>ชั้นขี้ไคลและเส้นผมบนหนังศีรษะเป็นฉนวนไฟฟ้าชั้นดี ทำให้เกิดความต้านทานไฟฟ้ากระแสสลับที่เรียกว่า <strong>อิมพีแดนซ์ (Impedance, หน่วย kΩ)</strong> หากอิมพีแดนซ์สูงเกินไป สายสัญญาณจะทำตัวเหมือนเสาอากาศรับคลื่นรบกวนจากไฟบ้าน <code>50 Hz</code> และเกิดสัญญาณแกว่งเมื่อขยับหัว</p>
      <ul>
        <li><strong>อิเล็กโทรดแบบเปียก (Wet gel electrodes):</strong> ใช้เจลนำไฟฟ้าช่วยลดอิมพีแดนซ์ให้ต่ำกว่า <code>5–10 kΩ</code> สัญญาณนิ่งระดับงานวิจัย แต่ต้องสระผมหลังใช้</li>
        <li><strong>อิเล็กโทรดแบบแห้ง (Dry electrodes):</strong> ใช้หมุดโลหะหรือพลาสติกเคลือบนำไฟฟ้าแตะผ่านเส้นผม สวมง่ายใน 1 นาทีแต่อิมพีแดนซ์สูงกว่า (มักมีวงจร Active preamp ติดที่หัวหมุดเพื่อช่วยสู้สัญญาณรบกวน)</li>
      </ul>
      <p>เมื่อขยายสัญญาณแล้ว วงจร ADC จะเก็บค่าเป็นจุดๆ ตาม <strong>อัตราสุ่มตัวอย่าง (Sampling rate, $f_s$)</strong> ตามทฤษฎีของ <strong>Nyquist–Shannon</strong> เราต้องสุ่มด้วยความถี่อย่างน้อย <strong>2 เท่าของความถี่สูงสุดในสัญญาณ ($f_s > 2 f_{\\max}$)</strong> ไม่อย่างนั้นคลื่นความถี่สูงจะปลอมตัวเป็นคลื่นความถี่ต่ำที่ไม่มีอยู่จริง เรียกว่า <strong>Aliasing</strong>!</p>
    `,
    introEn: `
      <p>Scalp EEG signals are only a few microvolts tall. To travel cleanly from your scalp into a computer, they must pass two critical hardware stages: the <strong>electrode-skin interface</strong> and the <strong>Analog-to-Digital Converter (ADC)</strong>.</p>
      <p>Dead skin cells and hair act as electrical insulators, creating AC resistance called <strong>impedance (measured in kΩ)</strong>. High or unbalanced impedance turns electrode leads into antennas that pick up <code>50 Hz</code> mains hum and motion artifacts.</p>
      <ul>
        <li><strong>Wet Gel Electrodes:</strong> Conductive gel bridges the hair and skin to bring impedance below <code>5–10 kΩ</code> — the research gold standard, though you’ll need to wash your hair afterward.</li>
        <li><strong>Dry Electrodes:</strong> Spring-loaded conductive pins part the hair for 1-minute setup, but exhibit higher impedance (often paired with active on-electrode preamplifiers).</li>
      </ul>
      <p>Next, the ADC samples continuous voltage at a fixed <strong>sampling rate ($f_s$)</strong>. By the <strong>Nyquist–Shannon Theorem</strong>, you must sample at strictly more than <strong>twice the highest frequency present ($f_s > 2 f_{\\max}$)</strong> — otherwise high frequencies fold back as phantom slow waves, a distortion called <strong>aliasing</strong>!</p>
    `,
    callout: {
      tone: 'teal',
      title: 'อย่าลืมอิเล็กโทรด Reference และ Ground!',
      text: 'แรงดันไฟฟ้าคือ "ความต่างศักย์" เสมอ ทุกช่อง EEG จึงวัดเทียบกับจุดอ้างอิง (Reference เช่น ติ่งหู A1/A2, กระดูกหลังหู Mastoid หรือค่าเฉลี่ยทุกช่อง CAR — Common Average Reference)',
    },
    calloutEn: {
      tone: 'teal',
      title: 'Never Forget Reference and Ground!',
      text: 'Voltage is always a potential difference between two points. Every EEG channel is measured relative to a Reference site (such as the earlobe A1/A2, mastoid, or the Common Average Reference — CAR across all channels).',
    },
    takeaways: [
      'ในงานวิจัยด้วย Wet electrode มักคุมค่า Impedance ให้ต่ำกว่า 10 kΩ (หรือ < 5 kΩ สำหรับงานคลินิก)',
      'Impedance ที่สูงและไม่สมดุลกันระหว่างช่อง จะทำให้ไฟบ้าน 50 Hz รั่วเข้ามาในสัญญาณได้ง่าย',
      'ต้องตั้ง Sampling rate อย่างน้อยเกิน 2 เท่าของความถี่สูงสุดที่สนใจ (ในทางปฏิบัติ EEG มักใช้ 250 Hz, 500 Hz หรือ 1000 Hz)',
    ],
    takeawaysEn: [
      'Research wet-gel recordings typically keep contact impedance below 10 kΩ (< 5 kΩ for clinical ERP studies).',
      'High impedance degrades common-mode rejection, letting 50 Hz mains interference leak into the trace.',
      'Set the sampling rate well above twice the highest frequency of interest (typically 250 Hz, 500 Hz, or 1000 Hz in EEG).',
    ],
    quiz: [
      {
        q: 'ทำไมการทาเจลนำไฟฟ้าและแหวกเส้นผมก่อนติดอิเล็กโทรดจึงช่วยให้สัญญาณ EEG สะอาดขึ้น?',
        choices: [
          'เพราะเจลช่วยลดค่าอิมพีแดนซ์ (Impedance) ที่ผิวสัมผัส ทำให้รับสัญญาณรบกวนจากไฟบ้าน 50 Hz น้อยลง',
          'เพราะเจลไปกระตุ้นให้เซลล์ประสาทในสมองยิง Action potential แรงขึ้น 10 เท่า',
          'เพราะเจลช่วยเพิ่มความถี่ Sampling rate ของคอมพิวเตอร์',
        ],
        answer: 0,
        hint: 'ลองเลื่อนสไลเดอร์ค่า kΩ ในแท็บแรกของของเล่นดูสิ พอ kΩ สูงขึ้น เส้นกราฟเป็นอย่างไร?',
        explain: 'ถูกต้อง! เมื่ออิมพีแดนซ์ที่ผิวหนังต่ำลงและสมดุลกัน วงจรขยายสัญญาณ (Differential amplifier) จะตัดสัญญาณรบกวนไฟบ้านออกได้มีประสิทธิภาพสูงสุด',
      },
      {
        q: 'ถ้าเราต้องการวิเคราะห์คลื่นสมองที่มีความถี่สูงสุดถึง 45 Hz ตามทฤษฎี Nyquist เราต้องใช้ Sampling rate ขั้นต่ำสุดเท่าไรจึงจะไม่เกิด Aliasing?',
        choices: [
          '45 Hz',
          'มากกว่า 90 Hz ขึ้นไป (และในทางปฏิบัติมักใช้ 250 Hz ขึ้นไป)',
          '10 Hz ก็เพียงพอ',
        ],
        answer: 1,
        hint: 'กฎของ Nyquist บอกว่า อัตราสุ่ม (fs) ต้องมากกว่า 2 เท่าของความถี่สูงสุด (2 × 45 Hz) จ้ะ',
        explain: 'ใช่เลย! ต้องสุ่มมากกว่า 2 × 45 = 90 Hz และในเครื่อง EEG จริงจะมีวงจร Anti-aliasing low-pass filter ร่วมกับอัตราสุ่ม 250–1000 Hz',
      },
      {
        q: 'Common Average Reference (CAR) คืออะไร?',
        choices: [
          'การนำค่าเฉลี่ยของสัญญาณจากอิเล็กโทรดทุกช่องในขณะนั้นมาลบออกจากแต่ละช่อง เพื่อลดสัญญาณรบกวนที่เกิดพร้อมกันทั้งศีรษะ',
          'การต่อสายดินเข้ากับปลั๊กไฟบ้านโดยตรง',
          'การทิ้งข้อมูลครึ่งแรกของการทดลอง',
        ],
        answer: 0,
        hint: 'คำว่า Average แปลว่าค่าเฉลี่ยของทุกช่องจ้ะ',
        explain: 'ถูกต้องครับ! CAR เป็นวิธีอ้างอิงยอดนิยมในงาน BCI เพราะช่วยตัดสัญญาณรบกวนที่ปรากฏเหมือนกันในทุกอิเล็กโทรดออกไป',
      },
    ],
    quizEn: [
      {
        q: 'Why does parting the hair and applying conductive gel improve EEG signal quality?',
        choices: [
          'It lowers electrode-skin impedance (kΩ), reducing 50 Hz power-line pickup and motion noise',
          'It stimulates cortical neurons to fire 10x larger action potentials',
          'It increases the computer’s CPU clock rate',
        ],
        answer: 0,
        hint: 'Drag the kΩ slider up in Tab 1 of the lab above and watch the 50 Hz hum grow!',
        explain: 'Correct! Low, balanced skin impedance lets the differential amplifier reject common-mode 50 Hz noise effectively.',
      },
      {
        q: 'To analyze EEG rhythms up to 45 Hz without aliasing, what does the Nyquist theorem require for the sampling rate?',
        choices: [
          '45 Hz',
          'Strictly greater than 90 Hz (and typically 250–1000 Hz in practice with an anti-aliasing filter)',
          '10 Hz is sufficient',
        ],
        answer: 1,
        hint: 'Nyquist states that fs must exceed 2 × f_max (2 × 45 Hz)!',
        explain: 'Right! Sampling must exceed 2 × 45 = 90 Hz, and hardware ADCs use analog anti-aliasing filters at 250+ Hz.',
      },
      {
        q: 'What is Common Average Reference (CAR)?',
        choices: [
          'Subtracting the instantaneous average of all electrodes from each individual channel to remove global background noise',
          'Connecting the subject directly to a wall-outlet earth pin',
          'Discarding the first half of the recording',
        ],
        answer: 0,
        hint: 'It uses the "common average" across all channels at each time sample.',
        explain: 'Correct! CAR is widely used in BCI pipelines to cancel noise shared across the entire scalp.',
      },
    ],
    refs: [
      'Luck, S. J. (2014). An Introduction to the Event-Related Potential Technique (2nd ed.). MIT Press.',
      'Lopez-Gordo, M. A., Sanchez-Morillo, D., & Valle, F. P. (2014). Dry EEG electrodes. Sensors, 14(7), 12847–12870.',
    ],
  },

  /* ============================================================
     5. Brain Waves (Frequency Bands)
  ============================================================ */
  {
    id: 5,
    slug: 'brain-waves',
    phase: 2,
    title: '5 ย่านความถี่คลื่นสมอง',
    titleEn: 'EEG Rhythms: Delta, Theta, Alpha, Beta, Gamma',
    subtitle: 'จากหลับลึก หลับตาผ่อนคลาย ไปจนถึงตอนกำลังแก้โจทย์คณิต',
    subtitleEn: 'From deep sleep and eyes-closed relaxation to active problem solving',
    duration: '9 นาที',
    durationEn: '9 min',
    color: 'var(--lilac)',
    regionId: 'occipital',
    widget: 'brain-waves',
    widgetTitle: 'เครื่องผสมและสำรวจคลื่นสมอง (Brain Rhythm Explorer & Mixer)',
    widgetTitleEn: 'Brain Rhythm State Explorer & 5-Band Mixer',
    intro: `
      <p>คลื่น EEG จริงไม่ได้เป็นคลื่นความถี่เดียวเรียบๆ แต่เป็นเหมือนวงออร์เคสตราที่ผสมคลื่นหลายความถี่เข้าด้วยกัน นักประสาทวิทยาศาสตร์แบ่งย่านความถี่หลักออกเป็น 5 ย่าน (จากช้าไปเร็ว):</p>
      <ul>
        <li><strong>Delta (0.5–4 Hz):</strong> คลื่นลูกใหญ่ช้าๆ เด่นชัดมากในผู้ใหญ่ที่กำลัง <em>นอนหลับลึก (Deep sleep)</em></li>
        <li><strong>Theta (4–8 Hz):</strong> พบมากตอน <em>ง่วงนอน เคลิ้มฝัน</em> หรือปรากฏที่แนวกลางหน้าผาก (Fz) ตอนกำลังใช้สมาธิและความจำใช้งาน</li>
        <li><strong>Alpha (8–13 Hz):</strong> คลื่นสุดคลาสสิกที่ค้นพบเป็นชนิดแรกโดย Hans Berger ในปี 1924! จะพุ่งแรงมากที่ท้ายทอย (<code>O1, Oz, O2</code>) ทันทีที่เรา <em>หลับตาและผ่อนคลาย</em> และจะยุบตัวลงทันทีที่ลืมตาหรือเริ่มคิดเลข (เรียกว่า <strong>Alpha blocking</strong>)</li>
        <li><strong>Mu (8–13 Hz เหนือ C3/C4):</strong> ความถี่เดียวกับ Alpha แต่อยู่เหนือเปลือกสมองสั่งการเคลื่อนไหว จะลดลงเมื่อเราขยับหรือจินตนาการขยับร่างกาย</li>
        <li><strong>Beta (13–30 Hz):</strong> คลื่นถี่ขนาดเล็กลง สัมพันธ์กับการ <em>ตื่นตัว คิดวิเคราะห์ จดจ่อ</em> หรือการเกร็งควบคุมกล้ามเนื้อ</li>
        <li><strong>Gamma (30–45+ Hz):</strong> คลื่นความถี่สูงแอมพลิจูดเล็กมาก สัมพันธ์กับการเชื่อมโยงข้อมูลประสาทสัมผัสและการประมวลผลขั้นสูง</li>
      </ul>
    `,
    introEn: `
      <p>Real EEG is never a single pure sine wave — it’s a neural orchestra playing multiple rhythms at once. Neuroscientists group these oscillations into 5 canonical frequency bands (from slowest to fastest):</p>
      <ul>
        <li><strong>Delta (0.5–4 Hz):</strong> Slow, high-amplitude waves that dominate during <em>restorative deep sleep (Stage N3)</em>.</li>
        <li><strong>Theta (4–8 Hz):</strong> Prominent during <em>drowsiness and light sleep</em>, or over frontal midline (<code>Fz</code>) during focused working-memory tasks.</li>
        <li><strong>Alpha (8–13 Hz):</strong> The very first human EEG rhythm discovered by Hans Berger in 1924! It surges over the occipital cortex (<code>O1, Oz, O2</code>) whenever you <em>close your eyes and relax</em>, and vanishes the moment you open your eyes or do mental math (<strong>Alpha blocking</strong>).</li>
        <li><strong>Mu (8–13 Hz over C3/C4):</strong> Shares the Alpha frequency band but lives over the sensorimotor strip; it drops in power during real or imagined movement.</li>
        <li><strong>Beta (13–30 Hz):</strong> Faster, smaller oscillations linked to <em>alertness, active concentration, analytical thinking</em>, and motor control.</li>
        <li><strong>Gamma (30–45+ Hz):</strong> High-frequency, low-amplitude bursts associated with perceptual binding and intense cognitive processing.</li>
      </ul>
    `,
    callout: {
      tone: 'lilac',
      title: 'การทดลองแรกสุดที่คุณทำได้ทันทีเมื่อมีเครื่อง EEG',
      text: 'ติดอิเล็กโทรดที่ O1 หรือ O2 แล้วนั่งนิ่งๆ: พอสั่งให้ "หลับตา" กราฟจะกลายเป็นคลื่นลูกสวยความถี่ ~10ลูกต่อวินาที (Alpha) ทันที และพอสั่งให้ "ลืมตา" คลื่นลูกใหญ่นั้นจะหายวับไปต่อหน้าต่อตา!',
    },
    calloutEn: {
      tone: 'lilac',
      title: 'The Classic First Experiment with Any EEG Headset',
      text: 'Place an electrode at O1 or O2 while sitting quietly: close your eyes and watch a clean ~10 Hz Alpha wave appear within a second; open your eyes and watch it disappear before your eyes ( the Berger Effect)!',
    },
    takeaways: [
      'ยิ่งความถี่ของคลื่นสมองต่ำ (เช่น Delta) แอมพลิจูดมักจะยิ่งสูง เพราะเซลล์จำนวนมากซิงค์เข้าจังหวะเดียวกันได้ง่ายกว่า',
      'คลื่น Alpha (8–13 Hz) เด่นที่ท้ายทอยตอนหลับตาผ่อนคลาย ส่วนคลื่น Mu (8–13 Hz) อยู่แถว C3/C4 เหนือ Motor cortex',
      'เราไม่เคยมีคลื่นชนิดเดียวโดดๆ ในสมอง แต่ดูว่าในขณะนั้น "พลังงาน (Band power)" ของย่านไหนเด่นขึ้นมา',
    ],
    takeawaysEn: [
      'Lower-frequency rhythms (like Delta) generally exhibit larger amplitudes (1/f spectrum) because larger neural populations synchronize together.',
      'Posterior Alpha (8–13 Hz at O1/O2) reflects visual cortex idling with eyes closed, whereas Mu (8–13 Hz at C3/C4) reflects sensorimotor cortex idling.',
      'All five bands coexist continuously — we analyze how relative band power shifts across mental states.',
    ],
    quiz: [
      {
        q: 'เมื่อผู้ถูกทดลองนั่งผ่อนคลายแล้ว "หลับตาลง" คลื่นย่านใดจะเพิ่มขึ้นอย่างชัดเจนที่อิเล็กโทรดท้ายทอย (O1, Oz, O2)?',
        choices: [
          'คลื่นอัลฟา (Alpha, 8–13 Hz)',
          'คลื่นเดลตา (Delta, 0.5–4 Hz)',
          'คลื่นแกมมา (Gamma, >30 Hz)',
        ],
        answer: 0,
        hint: 'ลองกดการ์ด "หลับตาผ่อนคลาย" แล้วสลับไป "ตั้งใจคิด" ในของเล่นด้านบนดูสิ!',
        explain: 'ถูกต้อง! เมื่อหลับตา Visual cortex ไม่ได้รับข้อมูลภาพใหม่ จึงเข้าสู่จังหวะพักแบบซิงโครไนซ์ที่ความถี่ Alpha (8–13 Hz)',
      },
      {
        q: 'คลื่น Mu (มิว) ต่างจากคลื่น Alpha ทั่วไปอย่างไร ทั้งที่อยู่ในช่วงความถี่ 8–13 Hz เหมือนกัน?',
        choices: [
          'คลื่น Mu วัดได้ที่แถบสั่งการเคลื่อนไหว (C3, Cz, C4) และจะลดพลังงานลงเมื่อขยับหรือจินตนาการขยับแขนขา',
          'คลื่น Mu เกิดเฉพาะตอนนอนหลับลึกเท่านั้น',
          'คลื่น Mu มีแอมพลิจูดสูงถึง 10 โวลต์',
        ],
        answer: 0,
        hint: 'Alpha อยู่ที่ท้ายทอย (Visual) ส่วน Mu อยู่ที่ Sensorimotor cortex จ้ะ',
        explain: 'แม่นยำมาก! คลื่น Mu คือจังหวะพักของระบบสั่งการเคลื่อนไหว จึงถูกนำมาใช้เป็นฟีเจอร์หลักใน Motor Imagery BCI',
      },
      {
        q: 'เรียงลำดับคลื่นสมองจาก "ความถี่ต่ำสุด ไป สูงสุด" ข้อใดถูกต้อง?',
        choices: [
          'Delta → Theta → Alpha → Beta → Gamma',
          'Alpha → Beta → Delta → Theta → Gamma',
          'Gamma → Beta → Alpha → Theta → Delta',
        ],
        answer: 0,
        hint: 'จำง่ายๆ: เดลตา (หลับลึก 0.5–4) → ทีตา (4–8) → อัลฟา (8–13) → เบตา (13–30) → แกมมา (30+)',
        explain: 'ถูกต้องครับ! Delta (0.5–4 Hz) ช้าที่สุด ไปจนถึง Gamma (>30 Hz) ที่เร็วที่สุด',
      },
    ],
    quizEn: [
      {
        q: 'When a relaxed participant closes their eyes, which rhythm surges dramatically over occipital electrodes (O1, Oz, O2)?',
        choices: [
          'Alpha rhythm (8–13 Hz)',
          'Delta rhythm (0.5–4 Hz)',
          'Gamma rhythm (>30 Hz)',
        ],
        answer: 0,
        hint: 'Click the "Eyes-Closed Relaxed" state card in the explorer above and check the green bar!',
        explain: 'Correct! Without visual input, thalamocortical loops in the visual cortex idle synchronously in the 8–13 Hz Alpha band.',
      },
      {
        q: 'How does the Mu rhythm differ from posterior Alpha, even though both share the 8–13 Hz frequency range?',
        choices: [
          'Mu is recorded over the sensorimotor strip (C3, Cz, C4) and drops in power during real or imagined movement',
          'Mu only appears during deep slow-wave sleep',
          'Mu has an amplitude of 10 Volts',
        ],
        answer: 0,
        hint: 'Posterior Alpha lives over visual cortex (O1/O2), whereas Mu lives over motor/somatosensory cortex (C3/C4).',
        explain: 'Spot on! The Mu rhythm reflects sensorimotor idling, making it the primary feature for Motor Imagery BCIs.',
      },
      {
        q: 'Which list orders the five EEG bands from LOWEST to HIGHEST frequency?',
        choices: [
          'Delta → Theta → Alpha → Beta → Gamma',
          'Alpha → Beta → Delta → Theta → Gamma',
          'Gamma → Beta → Alpha → Theta → Delta',
        ],
        answer: 0,
        hint: 'Delta (0.5–4 Hz) → Theta (4–8 Hz) → Alpha (8–13 Hz) → Beta (13–30 Hz) → Gamma (30+ Hz).',
        explain: 'Correct! From slow deep-sleep Delta waves up to fast cognitive Gamma oscillations.',
      },
    ],
    refs: [
      'Berger, H. (1929). Über das Elektrenkephalogramm des Menschen. Archiv für Psychiatrie und Nervenkrankheiten.',
      'Buzsáki, G. (2006). Rhythms of the Brain. Oxford University Press.',
    ],
  },

  /* ============================================================
     6. Signal Processing & Filtering
  ============================================================ */
  {
    id: 6,
    slug: 'signal-processing',
    phase: 2,
    title: 'การกรองสัญญาณและแปลงฟูเรียร์ (FFT)',
    titleEn: 'Filtering, Notch 50 Hz & Spectral Analysis',
    subtitle: 'เปลี่ยนเส้นกราฟขยุกขยิกที่ปนไฟบ้านให้กลายเป็นคลื่นสมองใสสะอาด',
    subtitleEn: 'Turn a noisy, drifting raw trace polluted with 50 Hz mains hum into clean neural oscillations',
    duration: '11 นาที',
    durationEn: '11 min',
    color: 'var(--teal)',
    regionId: 'brain',
    widget: 'filter-lab',
    widgetTitle: 'ห้องแล็บตัวกรองสัญญาณและสเปกตรัม (Filter & FFT Workbench)',
    widgetTitleEn: 'Digital Filter & FFT Spectrum Workbench',
    intro: `
      <p>สัญญาณดิบ (Raw EEG) ที่ออกมาจากเครื่องวัดแทบไม่เคยนำไปใช้ได้ทันที เพราะมักปนเปื้อนไปด้วย 2 ตัวป่วนหลัก: <strong>(1) เส้นฐานลอยช้าๆ (Baseline drift, &lt; 0.5 Hz)</strong> จากเหงื่อหรือการขยับสาย และ <strong>(2) สัญญาณรบกวนไฟบ้าน (Power-line noise)</strong> ซึ่งในประเทศไทยและยุโรปใช้ไฟกระแสสลับความถี่ <code>50 Hz</code> (ส่วนอเมริกาใช้ 60 Hz)</p>
      <p>เพื่อมองเห็นว่ามีคลื่นความถี่อะไรซ่อนอยู่บ้าง เราใช้คณิตศาสตร์ที่เรียกว่า <strong>การแปลงฟูเรียร์แบบเร็ว (Fast Fourier Transform — FFT)</strong> หรือวิธีของ Welch เพื่อเปลี่ยนกราฟ <strong>โดเมนเวลา (Time domain)</strong> ให้เป็นกราฟ <strong>โดเมนความถี่ (Frequency domain / Power Spectral Density — PSD)</strong></p>
      <p>จากนั้นเราจึงออกแบบตัวกรองดิจิทัล (Digital filters):</p>
      <ul>
        <li><strong>High-pass filter (เช่น ตัดที่ 0.5 หรือ 1 Hz):</strong> ยอมให้ความถี่สูงผ่าน ตัดการลอยช้าๆ (Drift) ออก</li>
        <li><strong>Low-pass filter (เช่น ตัดที่ 35 หรือ 40 Hz):</strong> ยอมให้ความถี่ต่ำผ่าน ตัดสัญญาณกล้ามเนื้อความถี่สูงออก</li>
        <li><strong>Band-pass filter:</strong> รวม High-pass + Low-pass เข้าด้วยกันเพื่อเลือกเฉพาะช่วงความถี่ที่สนใจ (เช่น 8–30 Hz สำหรับ Motor Imagery)</li>
        <li><strong>Notch filter (ที่ 50 Hz):</strong> ตัวกรองแบบบากเฉพาะจุด คว้านเอาเฉพาะความถี่ไฟบ้าน 50 Hz ออกโดยไม่กระทบคลื่นข้างเคียง</li>
      </ul>
    `,
    introEn: `
      <p>Raw EEG straight off an amplifier is rarely ready for analysis because it is contaminated by two classic culprits: <strong>(1) Slow baseline drift (&lt; 0.5 Hz)</strong> from sweat or cable motion, and <strong>(2) AC power-line interference</strong> at <code>50 Hz</code> in Thailand/Europe (or 60 Hz in the Americas).</p>
      <p>To see which frequencies are hiding inside a time trace, we use the <strong>Fast Fourier Transform (FFT)</strong> or Welch’s method to convert the signal from the <strong>time domain</strong> into the <strong>frequency domain (Power Spectral Density — PSD)</strong>.</p>
      <p>We then apply digital filters:</p>
      <ul>
        <li><strong>High-pass filter (e.g., 0.5 or 1 Hz cutoff):</strong> Passes frequencies above the cutoff and removes slow baseline drift.</li>
        <li><strong>Low-pass filter (e.g., 35 or 40 Hz cutoff):</strong> Passes frequencies below the cutoff and attenuates high-frequency muscle noise.</li>
        <li><strong>Band-pass filter:</strong> Combines high-pass and low-pass to isolate a target range (such as 8–30 Hz for Motor Imagery).</li>
        <li><strong>Notch filter (at 50 Hz):</strong> Carves out a narrow V-shaped notch at 50 Hz to eliminate mains hum without harming nearby brain rhythms.</li>
      </ul>
    `,
    callout: {
      tone: 'coral',
      title: 'ทำไมประเทศไทยต้องตั้ง Notch filter ที่ 50 Hz ไม่ใช่ 60 Hz?',
      text: 'ระบบไฟฟ้าของการไฟฟ้าในไทยส่งกระแสสลับที่ความถี่ 50 Hz ดังนั้นถ้าก๊อปปี้โค้ดตัวอย่างจากอเมริกาที่ตั้ง notch_filter(60) มาใช้กับข้อมูลที่เก็บในไทย ยอดแหลมที่ 50 Hz จะยังอยู่ครบ!',
    },
    calloutEn: {
      tone: 'coral',
      title: 'Why 50 Hz in Thailand/Europe vs. 60 Hz in the US?',
      text: 'Thailand’s electrical grid runs at 50 Hz AC. If you copy a US tutorial that calls raw.notch_filter(60) on EEG recorded in Thailand, the massive 50 Hz spike will remain completely untouched!',
    },
    takeaways: [
      'FFT / PSD ช่วยให้เห็นพลังงานของแต่ละความถี่เป็นยอดกราฟชัดเจน เช่น ยอดคลื่น Alpha ที่ 10 Hz และยอดไฟบ้านที่ 50 Hz',
      'High-pass filter (~0.5–1 Hz) ใช้แก้เส้นกราฟลอยขึ้นลงช้าๆ (DC offset / Baseline drift)',
      'ระวังอย่าตั้งกรอบ Band-pass แคบจนไปตัดคลื่นสมองที่เราต้องการวัดทิ้งไปด้วย!',
    ],
    takeawaysEn: [
      'FFT / PSD reveals frequency peaks clearly — such as a 10 Hz Alpha peak versus a 50 Hz mains spike.',
      'A 0.5–1 Hz High-pass filter flattens slow baseline drift.',
      'Never set your filter cutoffs so tight that you accidentally filter out the target brain rhythm itself!',
    ],
    quiz: [
      {
        q: 'ถ้ากราฟ EEG ในห้องแล็บที่ประเทศไทยมีคลื่นความถี่สูงซ้อนทับอยู่ตลอดเวลา และเมื่อทำ FFT พบยอดแหลมสูงโด่ที่ 50 Hz พอดี ควรใช้ตัวกรองชนิดใดแก้ปัญหานี้?',
        choices: [
          'Notch filter ที่ความถี่ 50 Hz (หรือ Low-pass filter ที่ต่ำกว่า 40 Hz)',
          'High-pass filter ที่ความถี่ 50 Hz',
          'Notch filter ที่ความถี่ 10 Hz',
        ],
        answer: 0,
        hint: 'เราต้องการเจาะจงตัดความถี่ไฟบ้าน 50 Hz ออกจ้ะ',
        explain: 'ถูกต้อง! Notch filter ที่ 50 Hz จะคว้านความถี่ไฟบ้านออกอย่างแม่นยำ หรือถ้าเราสนใจแค่คลื่นต่ำกว่า 35 Hz การใช้ Low-pass ที่ 35–40 Hz ก็ช่วยกด 50 Hz ลงได้เช่นกัน',
      },
      {
        q: 'ถ้าเส้นกราฟ EEG ค่อยๆ ลอยเอียงขึ้นลงช้าๆ กินเวลาเป็นหลายวินาที (ความถี่ต่ำกว่า 0.5 Hz) ควรปรับตัวกรองใด?',
        choices: [
          'เปิด High-pass filter ที่ประมาณ 0.5–1 Hz เพื่อตัดความถี่ต่ำมากออกไป',
          'เปิด Low-pass filter ที่ 0.5 Hz',
          'เพิ่มไฟบ้าน 50 Hz เข้าไปชดเชย',
        ],
        answer: 0,
        hint: 'High-pass แปลว่า "ให้ความถี่สูงกว่าจุดตัดผ่านไป และกั้นความถี่ต่ำกว่าจุดตัดไว้" จ้ะ',
        explain: 'ใช่เลย! High-pass ที่ 0.5 หรือ 1 Hz จะตัดองค์ประกอบความถี่ต่ำมากๆ (DC & slow drift) ทำให้เส้นกราฟกลับมาเกาะแนวศูนย์กลางอย่างสวยงาม',
      },
      {
        q: 'จะเกิดอะไรขึ้นถ้าเราเผลอตั้งค่า Low-pass filter ไว้ที่ 6 Hz ในขณะที่กำลังศึกษาคลื่น Alpha (8–13 Hz)?',
        choices: [
          'คลื่น Alpha จะชัดเจนขึ้นสองเท่า',
          'คลื่น Alpha (8–13 Hz) จะถูกกรองทิ้งไปด้วยเพราะมีความถี่สูงกว่าจุดตัด 6 Hz',
          'ไม่เกิดผลใดๆ ต่อคลื่น Alpha',
        ],
        answer: 1,
        hint: 'Low-pass ที่ 6 Hz ยอมให้แค่ 0–6 Hz ผ่านไปได้เท่านั้น แล้ว 10 Hz จะรอดไหมนะ?',
        explain: 'ถูกต้องครับ! นี่คือข้อผิดพลาดที่พบบ่อยมาก ต้องตรวจสอบเสมอว่าย่านความถี่เป้าหมายของเราอยู่ในช่วง Passband ของตัวกรอง',
      },
    ],
    quizEn: [
      {
        q: 'An EEG recording shows a constant high-frequency buzz, and the FFT spectrum has a sharp spike at 50 Hz. Which filter removes it?',
        choices: [
          'A 50 Hz Notch filter (or a Low-pass filter below 40 Hz)',
          'A 50 Hz High-pass filter',
          'A 10 Hz Notch filter',
        ],
        answer: 0,
        hint: 'You want to carve out the 50 Hz power-line frequency specifically!',
        explain: 'Correct! A 50 Hz notch filter attenuates mains interference while preserving surrounding frequencies.',
      },
      {
        q: 'If the EEG trace wanders up and down slowly over several seconds (< 0.5 Hz baseline drift), which filter fixes it?',
        choices: [
          'A High-pass filter around 0.5–1 Hz to block very slow drift',
          'A Low-pass filter at 0.5 Hz',
          'Adding more 50 Hz noise',
        ],
        answer: 0,
        hint: 'A High-pass filter lets higher frequencies pass while blocking ultra-slow drift below the cutoff.',
        explain: 'Spot on! A 0.5–1 Hz high-pass filter removes DC offset and slow sweat/motion drift.',
      },
      {
        q: 'What happens if you accidentally set a Low-pass filter to 6 Hz while studying the Alpha rhythm (8–13 Hz)?',
        choices: [
          'The Alpha rhythm becomes twice as strong',
          'The 8–13 Hz Alpha rhythm is wiped out because it lies above the 6 Hz low-pass cutoff',
          'Nothing changes',
        ],
        answer: 1,
        hint: 'A 6 Hz low-pass only passes 0–6 Hz — what happens to 10 Hz?',
        explain: 'Correct! Always make sure your passband comfortably covers the physiological rhythm you want to measure.',
      },
    ],
    refs: [
      'Widmann, A., Schröger, E., & Maess, B. (2015). Digital filter design for electrophysiological data — a practical approach. Journal of Neuroscience Methods, 250, 34–46.',
      'Cohen, M. X. (2014). Analyzing Neural Time Series Data: Theory and Practice. MIT Press.',
    ],
  },

  /* ============================================================
     7. Artifacts (EOG, EMG, ECG, ICA)
  ============================================================ */
  {
    id: 7,
    slug: 'artifacts',
    phase: 2,
    title: 'นักสืบจับผิดสัญญาณแปลกปลอม (Artifacts)',
    titleEn: 'Physiological & Non-physiological Artifacts',
    subtitle: 'แยกให้ออกว่าอันไหนคือคลื่นสมองจริง อันไหนคือกะพริบตา ขบกราม หรือหัวใจเต้น!',
    subtitleEn: 'Tell real brain waves apart from eye blinks, jaw clenches, heartbeats, and electrode pops',
    duration: '10 นาที',
    durationEn: '10 min',
    color: 'var(--coral)',
    regionId: 'frontal',
    widget: 'artifact-hunt',
    widgetTitle: 'เกมนักสืบจับผิด Artifacts ในกราฟ 8 ช่อง (Artifact Detective)',
    widgetTitleEn: '8-Channel EEG Artifact Detective Game',
    intro: `
      <p>ความท้าทายที่ใหญ่ที่สุดของ EEG คือ ร่างกายของเราสร้างสัญญาณไฟฟ้าอื่นที่ <strong>แรงกว่าคลื่นสมองหลายสิบเท่า!</strong> สัญญาณที่ไม่ใช่คลื่นสมองเหล่านี้เรียกว่า <strong>สิ่งแปลกปลอม (Artifacts)</strong> ถ้าเราไม่รู้จักมัน โมเดล AI ของเราอาจจะเผลอเรียนรู้ "การกะพริบตา" แทนที่จะเรียนรู้คลื่นสมองจริงๆ</p>
      <p>มาดูหน้าตาของตัวป่วนยอดฮิตแต่ละชนิดกัน:</p>
      <ul>
        <li><strong>การกะพริบตาและกลอกตา (EOG — Electrooculogram):</strong> ลูกตาของเรามีขั้วไฟฟ้า (กระจกตาเป็นบวก จอตาเป็นลบ) ทุกครั้งที่กะพริบตา จะเกิดเนินคลื่นช้าขนาดใหญ่ยักษ์ (<code>100–300 µV</code>) เด่นชัดที่สุดที่อิเล็กโทรดหน้าผาก <code>Fp1, Fp2</code> แล้วค่อยๆ เบาลงเมื่อถอยไปด้านหลัง</li>
        <li><strong>การเกร็งกล้ามเนื้อ/ขบกราม (EMG — Electromyogram):</strong> เวลาขบฟัน ขมวดคิ้ว หรือกลืนน้ำลาย จะเกิดคลื่นความถี่สูง (<code>&gt; 20–100 Hz</code>) หน้าตาขยุกขยิกหนาทึบเหมือนหนามทุเรียน โดยเฉพาะแถวขมับ <code>T7, T8</code></li>
        <li><strong>จังหวะหัวใจเต้น (ECG — Electrocardiogram):</strong> บางครั้งชีพจรหรือสนามไฟฟ้าจากหัวใจรั่วขึ้นมาเห็นเป็นหนามแหลมเล็กๆ (QRS complex) ที่เกิดซ้ำเป็นจังหวะสม่ำเสมอทุกๆ ~1 วินาที</li>
        <li><strong>อิเล็กโทรดขยับหรือหลุด (Electrode pop):</strong> เกิดเมื่ออิเล็กโทรดตัวหนึ่งขยับกะทันหัน กราฟของ <em>ช่องนั้นช่องเดียว</em> จะกระโดดพุ่งขึ้นเป็นขั้นบันไดแล้วค่อยๆ ไหลกลับลงมา</li>
      </ul>
    `,
    introEn: `
      <p>The biggest challenge in practical EEG is that your body generates non-brain electrical signals that are <strong>10 to 50 times larger than brain waves!</strong> These contaminating signals are called <strong>artifacts</strong>. If you don’t spot them, your machine-learning model might accidentally learn to detect eye blinks or eyebrow twitches instead of brain activity.</p>
      <p>Here is how to spot the four classic suspects:</p>
      <ul>
        <li><strong>Eye Blinks &amp; Movements (EOG — Electrooculogram):</strong> The eye is an electric dipole (cornea positive, retina negative). Every blink creates a massive slow bump (<code>100–300 µV</code>) that is largest at forehead sites <code>Fp1, Fp2</code> and fades toward the back of the head.</li>
        <li><strong>Muscle Tension / Jaw Clench (EMG — Electromyogram):</strong> Clenching teeth or furrowing the brow produces dense, spiky high-frequency bursts (<code>&gt; 20–100 Hz</code>), especially near temporal/frontal channels.</li>
        <li><strong>Heartbeat (ECG — Electrocardiogram):</strong> Periodic sharp QRS spikes repeating rhythmically roughly once per second (~60–80 bpm).</li>
        <li><strong>Electrode Pop:</strong> A sudden mechanical jolt or impedance jump at a single electrode causes an abrupt vertical step followed by exponential decay on <em>that single channel only</em>.</li>
      </ul>
    `,
    callout: {
      tone: 'teal',
      title: 'ICA (Independent Component Analysis) = เครื่องแยกเสียงในงานปาร์ตี้',
      text: 'แทนที่จะต้องตัดข้อมูลทุกช่วงที่ผู้ทดลองกะพริบตาทิ้งไป เราสามารถใช้เทคนิค ICA แยกองค์ประกอบที่เป็น EOG ออกมา แล้วลบเฉพาะองค์ประกอบกะพริบตาออกโดยที่คลื่นสมองช่วงนั้นยังอยู่ครบ!',
    },
    calloutEn: {
      tone: 'teal',
      title: 'ICA (Independent Component Analysis) = The Cocktail-Party Unmixer',
      text: 'Instead of throwing away every trial where a user blinked, ICA separates multi-channel EEG into independent source components so you can subtract the eye-blink component while keeping the underlying brain signal intact!',
    },
    takeaways: [
      'กะพริบตา (EOG) = เนินช้าขนาดใหญ่ที่หน้าผาก Fp1/Fp2; ขบกราม (EMG) = หนามความถี่สูงหนาทึบ',
      'อิเล็กโทรดหลุด (Pop) มักเกิดที่ช่องเดียวโดดๆ ส่วนคลื่นสมองหรือกะพริบตาจะกระจายไปช่องข้างเคียงด้วย',
      'ระวังอย่าสับสนคลื่น Alpha ปกติที่ท้ายทอย (O1/O2) ตอนหลับตา ว่าเป็น Artifact!',
    ],
    takeawaysEn: [
      'Eye blink (EOG) = huge slow deflection at Fp1/Fp2; Jaw clench (EMG) = dense high-frequency spikes.',
      'An electrode pop appears on a single isolated channel, whereas real brain waves and EOG spread across neighboring sites.',
      'Don’t mistake a clean 10 Hz occipital Alpha burst at O1/O2 for an artifact!',
    ],
    quiz: [
      {
        q: 'ถ้าเห็นเนินคลื่นขนาดใหญ่ (~150 µV) กินเวลาประมาณ 300 ms โผล่พร้อมกันที่ Fp1 และ Fp2 ชัดเจนมาก แต่แทบไม่เห็นเลยที่ O1 และ O2 สัญญาณนี้คืออะไร?',
        choices: [
          'สัญญาณจากการกะพริบตา (Eye blink / EOG artifact)',
          'คลื่น P300 จากการคิดคำนวณ',
          'สัญญาณไฟบ้าน 50 Hz',
        ],
        answer: 0,
        hint: 'Fp1 และ Fp2 อยู่เหนือคิ้วใกล้ดวงตาที่สุดเลยจ้ะ',
        explain: 'ถูกต้อง! การกะพริบตาทำให้เกิดศักย์ไฟฟ้าขนาดใหญ่ที่หน้าผาก Fp1/Fp2 และลดขนาดลงตามระยะห่างจากดวงตา',
      },
      {
        q: 'เทคนิคใดนิยมใช้แยกและลบสัญญาณกะพริบตา (EOG) ออกจากข้อมูล EEG หลายช่อง โดยไม่ต้องตัดข้อมูลช่วงเวลานั้นทิ้งทั้งก้อน?',
        choices: [
          'ICA (Independent Component Analysis)',
          'การลด Sampling rate ลงเหลือ 10 Hz',
          'การขยายสัญญาณให้แรงขึ้น 100 เท่า',
        ],
        answer: 0,
        hint: 'เป็นอัลกอริทึมแยกแหล่งกำเนิดสัญญาณอิสระออกจากกันจ้ะ',
        explain: 'เยี่ยมมาก! ICA สามารถแยกแหล่งกำเนิดของ EOG และ ECG ออกเป็น Component อิสระ เพื่อให้นักวิจัยเลือกตัดเฉพาะ Component นั้นออกได้',
      },
      {
        q: 'ทำไมนักวิจัย BCI ต้องระวังเรื่อง EMG (กล้ามเนื้อใบหน้า/ขมวดคิ้ว) เป็นพิเศษเวลาฝึกโมเดล?',
        choices: [
          'เพราะ EMG มีขนาดใหญ่กว่าคลื่นสมองมาก โมเดลอาจแอบใช้การขมวดคิ้วในการทายคำตอบแทนการใช้คลื่นสมองจริงๆ',
          'เพราะ EMG จะทำให้คอมพิวเตอร์ค้างทันที',
          'เพราะ EMG มีความถี่ 0 Hz เสมอ',
        ],
        answer: 0,
        hint: 'ถ้าผู้เล่นเผลอขมวดคิ้วทุกครั้งที่จินตนาการยกมือ โมเดลที่ฉลาดแกมโกงจะดูอะไรเอ่ย?',
        explain: 'ถูกต้องที่สุด! ในวงการ BCI การตรวจให้แน่ใจว่าตัวจำแนก (Classifier) ขับเคลื่อนด้วยสัญญาณสมองจริงๆ ไม่ใช่กล้ามเนื้อใบหน้า เป็นหลักการที่สำคัญมาก',
      },
    ],
    quizEn: [
      {
        q: 'You see a large (~150 µV), smooth 300 ms deflection simultaneously at Fp1 and Fp2 that is almost invisible at O1 and O2. What is it?',
        choices: [
          'An eye-blink (EOG) artifact',
          'A parietal P300 wave',
          '50 Hz power-line hum',
        ],
        answer: 0,
        hint: 'Fp1 and Fp2 sit right above the eyebrows next to the eyes!',
        explain: 'Correct! Eye blinks produce large frontal deflections at Fp1/Fp2 that decay rapidly toward posterior channels.',
      },
      {
        q: 'Which algorithm separates multi-channel EEG into independent sources so eye-blink (EOG) artifacts can be subtracted without discarding the epoch?',
        choices: [
          'ICA (Independent Component Analysis)',
          'Downsampling the signal to 10 Hz',
          'Multiplying the voltage by 100',
        ],
        answer: 0,
        hint: 'It stands for Independent Component Analysis.',
        explain: 'Spot on! ICA isolates ocular and cardiac source components so they can be zeroed out before reconstructing clean EEG.',
      },
      {
        q: 'Why must BCI researchers be careful about facial EMG artifacts when training a classifier?',
        choices: [
          'Because EMG is much larger than EEG, so a classifier may cheat by detecting brow furrowing or jaw clenching instead of true brain signals',
          'Because EMG crashes the operating system',
          'Because EMG always has a frequency of 0 Hz',
        ],
        answer: 0,
        hint: 'If a subject frowns every time they imagine moving their hand, what will a naive ML model latch onto?',
        explain: 'Exactly! Verifying that a BCI classifier is driven by cortical signals rather than cranial muscle artifacts is essential in BCI validation.',
      },
    ],
    refs: [
      'Jung, T. P., Makeig, S., Humphries, C., Lee, T. W., McKeown, M. J., Iragui, V., & Sejnowski, T. J. (2000). Removing electroencephalographic artifacts by blind source separation. Psychophysiology.',
      'Urigüen, J. A., & Garcia-Zapirain, B. (2015). EEG artifact removal — state-of-the-art and guidelines. Journal of Neural Engineering.',
    ],
  },

  /* ============================================================
     8. P300 & ERP Speller
  ============================================================ */
  {
    id: 8,
    slug: 'p300-speller',
    phase: 3,
    title: 'พาราไดม์ที่ 1: P300 และการพิมพ์ด้วยสายตา',
    titleEn: 'Event-Related Potentials (ERP) & P300 Speller',
    subtitle: 'เมื่อสมองร้อง "อ๊ะ นั่นไงตัวอักษรที่ฉันรอ!" ที่เวลา 300 มิลลิวินาที',
    subtitleEn: 'When your brain says "Aha, that’s the letter I was waiting for!" 300 milliseconds after a flash',
    duration: '12 นาที',
    durationEn: '12 min',
    color: 'var(--mustard)',
    regionId: 'parietal',
    widget: 'p300-speller',
    widgetTitle: 'มินิ P300 Speller ตาราง 6×6 และการเฉลี่ยสัญญาณ ERP',
    widgetTitleEn: '6×6 P300 Matrix Speller & ERP Averaging Lab',
    intro: `
      <p>เข้าสู่เฟสที่ 3: เราจะสั่งงานคอมพิวเตอร์ด้วยสมองได้อย่างไร? พาราไดม์แรกที่ประสบความสำเร็จที่สุดอันหนึ่งคือการใช้ <strong>ศักย์ไฟฟ้าสัมพันธ์กับเหตุการณ์ (Event-Related Potential — ERP)</strong> โดยเฉพาะคลื่นที่ชื่อว่า <strong>P300 (หรือ P3)</strong></p>
      <p><strong>P300</strong> คือการเบี่ยงเบนของแรงดันไฟฟ้าไปทาง <strong>บวก (Positive)</strong> ที่เกิดขึ้นประมาณ <strong>300 มิลลิวินาที</strong> หลังจากเราเห็นหรือได้ยิน "สิ่งเร้าที่นานๆ มาทีและเรากำลังให้ความสนใจอยู่" (เรียกว่า <strong>Oddball paradigm</strong>) โดยวัดได้ชัดเจนที่สุดที่แนวกลางสมองกลีบข้าง <code>Pz</code> และ <code>Cz</code></p>
      <p>ในปี 1988 Farwell และ Donchin นำหลักการนี้มาสร้าง <strong>P300 Speller</strong>: แสดงตารางตัวอักษร 6×6 บนจอ แล้วให้แต่ละแถวและคอลัมน์สว่างวาบขึ้นแบบสุ่ม ผู้ใช้แค่จ้องตัวอักษรที่ต้องการพิมพ์ (เช่น ตัว <code>B</code>) แล้วนับในใจทุกครั้งที่แถวหรือคอลัมน์ของตัว <code>B</code> สว่างขึ้น คอมพิวเตอร์จะตัดข้อมูล (Epoch) รอบจังหวะสว่างแต่ละครั้งมา <strong>หาค่าเฉลี่ยซ้ำๆ (Signal averaging)</strong> จนสัญญาณรบกวนหักล้างกันหมด เหลือแต่ยอด P300 ที่ชี้ชัดว่าแถวไหนและคอลัมน์ไหนคือตัวอักษรที่ผู้ใช้กำลังจ้อง!</p>
    `,
    introEn: `
      <p>Welcome to Phase 3: How do we turn brain signals into computer commands? One of the most reliable non-invasive BCI paradigms uses <strong>Event-Related Potentials (ERPs)</strong> — specifically the famous <strong>P300 (P3b)</strong> wave.</p>
      <p>The <strong>P300</strong> is a <strong>positive</strong> voltage deflection peaking roughly <strong>300 milliseconds</strong> after you perceive a rare, task-relevant target stimulus among frequent non-targets (the <strong>Oddball paradigm</strong>). It is strongest over the centroparietal midline electrodes <code>Pz</code> and <code>Cz</code>.</p>
      <p>In 1988, Farwell and Donchin built the <strong>P300 Speller</strong>: a 6×6 grid of characters whose rows and columns flash in random order. You simply focus on your desired letter (say, <code>B</code>) and mentally count each time it flashes. Only the 1 row and 1 column containing <code>B</code> elicit a P300! By slicing 0–800 ms <strong>epochs</strong> after every flash and <strong>averaging across repetitions</strong>, random background EEG cancels out and the target row/column intersection reveals your chosen letter!</p>
    `,
    callout: {
      tone: 'mustard',
      title: 'ทำไมต้องกะพริบซ้ำหลายรอบ (Repetitions)?',
      text: 'ในคลื่นดิบ 1 ครั้ง (Single trial) คลื่น P300 ขนาด ~5–10 µV มักจมอยู่ใต้คลื่นสมองพื้นหลังขนาด ~30 µV เมื่อเราเฉลี่ย N รอบ สัญญาณรบกวนแบบสุ่มจะลดลงตามสัดส่วน 1/√N ทำให้ยอด P300 โผล่พ้นน้ำขึ้นมา — แต่ยิ่งใช้รอบเยอะ การพิมพ์ต่อตัวอักษรก็จะยิ่งช้าลง (Trade-off ระหว่างความแม่นยำกับความเร็ว ITR)',
    },
    calloutEn: {
      tone: 'mustard',
      title: 'Why Average Across Multiple Flash Repetitions?',
      text: 'In a single flash, a ~8 µV P300 is buried inside ~30 µV of ongoing background EEG. Averaging N time-locked trials reduces random noise by 1/√N so the P300 peak emerges clearly — creating a classic BCI trade-off between accuracy and spelling speed (Information Transfer Rate, ITR).',
    },
    takeaways: [
      'P300 = Positive deflection ที่ ~300 ms หลังสิ่งเร้าเป้าหมาย (Target stimulus) ใน Oddball paradigm เด่นที่ Pz',
      'การตัด Epoch ยึดเวลาตามสิ่งเร้า (Time-locked averaging) ช่วยลดสัญญาณรบกวนตามสัดส่วน 1/√N',
      'P300 Speller แทบไม่ต้องฝึกฝนล่วงหน้า ผู้ใช้ส่วนใหญ่ใช้งานได้ตั้งแต่ครั้งแรก',
    ],
    takeawaysEn: [
      'P300 = Positive ERP peak ~300 ms after an attended rare target stimulus (Oddball), maximal at Pz.',
      'Time-locked epoch averaging improves signal-to-noise ratio proportionally to √N.',
      'P300 spellers require virtually zero user training and work for most people on their first session.',
    ],
    quiz: [
      {
        q: 'ชื่อ "P300" มาจากคุณสมบัติใดของสัญญาณ?',
        choices: [
          'คลื่นศักย์ไฟฟ้าขั้วบวก (Positive) ที่มียอดสูงสุดประมาณ 300 มิลลิวินาทีหลังจากเกิดสิ่งเร้าเป้าหมาย',
          'ต้องใช้อิเล็กโทรดทั้งหมด 300 ตัวบนสมองกลีบข้าง (Parietal)',
          'เป็นคลื่นความถี่ 300 Hz',
        ],
        answer: 0,
        hint: 'P = Positive และ 300 คือเวลาเป็นมิลลิวินาทีหลังเห็นแสงกะพริบจ้ะ',
        explain: 'ถูกต้อง! P ย่อมาจาก Positive และ 300 คือระยะเวลาแฝง (Latency) ประมาณ 300 ms หลังสิ่งเร้าเป้าหมายปรากฏ',
      },
      {
        q: 'ในตาราง P300 Speller ขนาด 6×6 ถ้าผู้ใช้ต้องการพิมพ์ตัวอักษรที่อยู่ "แถวที่ 1 คอลัมน์ที่ 2" คลื่น P300 จะเกิดขึ้นเมื่อใด?',
        choices: [
          'เฉพาะเมื่อแถวที่ 1 หรือคอลัมน์ที่ 2 สว่างขึ้น (ส่วนอีก 5 แถวและ 5 คอลัมน์ที่เหลือจะไม่เกิด P300)',
          'เกิดทุกครั้งที่แถวใดๆ บนจอสว่างขึ้นเท่ากันหมด',
          'เกิดเฉพาะตอนผู้ใช้กดปุ่ม Spacebar',
        ],
        answer: 0,
        hint: 'ใน 6 แถว มีแค่ 1 แถวที่มีตัวอักษรเป้าหมายของเรา (เป็นเหตุการณ์ที่นานๆ มาที 1 ใน 6) จ้ะ',
        explain: 'แม่นมาก! เพราะแถวที่มีตัวอักษรเป้าหมายสว่างขึ้นเพียง 1 ใน 6 ครั้ง และผู้ใช้กำลังจดจ่อรออยู่ จึงเข้าเงื่อนไข Oddball และเกิด P300 เฉพาะที่แถว 1 และคอลัมน์ 2',
      },
      {
        q: 'ทำไมการเพิ่มจำนวนรอบการกะพริบซ้ำ (Repetitions) จึงช่วยให้ทายตัวอักษรได้แม่นยำขึ้น แต่ก็มีข้อเสีย?',
        choices: [
          'เพราะการเฉลี่ยหลายรอบช่วยกด Noise ลงตาม 1/√N จนเห็น P300 ชัดขึ้น แต่ทำให้ใช้เวลาต่อตัวอักษรนานขึ้น',
          'เพราะยิ่งกะพริบหลายรอบ ความถี่ไฟบ้าน 50 Hz จะเปลี่ยนเป็น 10 Hz',
          'เพราะทำให้สมองน้อยทำงานแทนสมองกลีบข้าง',
        ],
        answer: 0,
        hint: 'ลองปรับสไลเดอร์จำนวนรอบในมินิ P300 Speller ด้านบนเป็น 1 รอบ เทียบกับ 6 รอบดูสิ!',
        explain: 'ถูกต้องครับ! นี่คือหัวใจของการออกแบบระบบ BCI: การหาจุดสมดุลระหว่างความแม่นยำกับอัตราการส่งข้อมูล (Information Transfer Rate — ITR)',
      },
    ],
    quizEn: [
      {
        q: 'What does the name "P300" stand for?',
        choices: [
          'A Positive voltage deflection peaking roughly 300 milliseconds after a target stimulus',
          'A headset using 300 Parietal electrodes',
          'A 300 Hz brain oscillation',
        ],
        answer: 0,
        hint: 'P = Positive polarity, and 300 = latency in milliseconds post-stimulus!',
        explain: 'Correct! P stands for Positive and 300 refers to its ~300 ms latency after an oddball target event.',
      },
      {
        q: 'In a 6×6 P300 Speller, if you focus on the letter in Row 1, Column 2, when is a P300 elicited?',
        choices: [
          'Only when Row 1 or Column 2 flashes (the other 5 rows and 5 columns act as frequent non-targets)',
          'Equally on every single flash of any row or column',
          'Only when you press the spacebar',
        ],
        answer: 0,
        hint: 'Only 1 out of 6 rows (and 1 out of 6 columns) contains your attended target letter!',
        explain: 'Exactly! Because your target flashes only 1/6 of the time while you attend to it, it forms an oddball event and evokes a P300.',
      },
      {
        q: 'Why does increasing the number of flash repetitions (N) improve spelling accuracy at the cost of speed?',
        choices: [
          'Averaging N epochs reduces background EEG noise by 1/√N so the P300 stands out, but takes more seconds per character',
          'More repetitions convert 50 Hz noise into 10 Hz Alpha',
          'It switches processing from parietal cortex to the cerebellum',
        ],
        answer: 0,
        hint: 'Compare 1 repetition vs. 6 repetitions in the P300 Speller lab above!',
        explain: 'Correct! Choosing the number of repetitions balances classification accuracy against Information Transfer Rate (ITR).',
      },
    ],
    refs: [
      'Farwell, L. A., & Donchin, E. (1988). Talking off the top of your head: toward a mental prosthesis utilizing event-related brain potentials. Electroencephalography and Clinical Neurophysiology.',
      'Polich, J. (2007). Updating P300: an integrative theory of P3a and P3b. Clinical Neurophysiology, 118(10), 2128–2148.',
    ],
  },

  /* ============================================================
     9. SSVEP
  ============================================================ */
  {
    id: 9,
    slug: 'ssvep',
    phase: 3,
    title: 'พาราไดม์ที่ 2: SSVEP ความถี่สะท้อนจากท้ายทอย',
    titleEn: 'Steady-State Visual Evoked Potentials (SSVEP)',
    subtitle: 'จ้องปุ่มที่กะพริบด้วยความถี่ไหน สมองส่วนรับภาพก็เต้นตามความถี่นั้น!',
    subtitleEn: 'Gaze at a target flickering at f Hz, and your visual cortex oscillates at exactly f Hz!',
    duration: '10 นาที',
    durationEn: '10 min',
    color: 'var(--lilac)',
    regionId: 'visual',
    widget: 'ssvep',
    widgetTitle: 'จำลอง SSVEP 3 ความถี่ และบังคับรถสำรวจด้วยสเปกตรัม',
    widgetTitleEn: '3-Frequency SSVEP Decoder & Rover Control Lab',
    intro: `
      <p>ถ้าอยากได้ระบบ BCI ที่ทั้ง <strong>เร็วและแม่นยำสูงมาก</strong> โดยไม่ต้องฝึกฝนเลย พาราไดม์ <strong>SSVEP (Steady-State Visual Evoked Potential)</strong> คือตัวเต็งอันดับหนึ่ง!</p>
      <p>หลักการของ SSVEP เรียบง่ายแต่ทรงพลัง: เมื่อเราจ้องมองเป้าหมายบนหน้าจอที่กะพริบด้วยความถี่คงที่ (เช่น ปุ่มเดินหน้ากะพริบที่ <code>10 Hz</code> ปุ่มเลี้ยวขวากะพริบที่ <code>12 Hz</code>) เซลล์ประสาทในเปลือกสมองรับภาพปฐมภูมิ <strong>(Primary visual cortex, V1)</strong> บริเวณท้ายทอยจะเกิดการสั่นพ้องและส่งคลื่น EEG ออกมาที่อิเล็กโทรด <code>O1, Oz, O2</code> ด้วย <strong>ความถี่เดียวกับแสงที่จ้องเป๊ะๆ</strong> รวมถึงความถี่พหุคูณ (Harmonics เช่น 20 Hz, 24 Hz) ด้วย!</p>
      <p>คอมพิวเตอร์เพียงแค่นำสัญญาณจากท้ายทอยช่วงสั้นๆ (~1–2 วินาที) ไปคำนวณสเปกตรัมความถี่ (FFT หรือ Canonical Correlation Analysis — CCA) แล้วดูว่ามียอดแหลมโผล่ขึ้นที่ความถี่ของปุ่มไหน ก็สั่งงานปุ่มนั้นได้ทันที</p>
    `,
    introEn: `
      <p>When you need a non-invasive BCI with <strong>high speed and high accuracy</strong> right out of the box, <strong>SSVEP (Steady-State Visual Evoked Potential)</strong> leads the pack!</p>
      <p>How it works: When you gaze at a visual stimulus flickering at a constant frequency (for instance, a Left button at <code>7.5 Hz</code>, Forward at <code>10 Hz</code>, Right at <code>12 Hz</code>), neurons in your <strong>Primary Visual Cortex (V1)</strong> at the back of the head entrain to that rhythm. Electrodes <code>O1, Oz, O2</code> record a sharp periodic oscillation at the <strong>exact stimulus frequency $f$</strong> plus its integer harmonics ($2f, 3f$)!</p>
      <p>By running an FFT or Canonical Correlation Analysis (CCA) on just 1–2 seconds of occipital EEG, the computer identifies which frequency peak dominates and executes the command immediately.</p>
    `,
    callout: {
      tone: 'coral',
      title: 'ข้อควรระวังด้านความปลอดภัย (Photosensitivity & Ergonomics)',
      text: 'แสงกะพริบต่อเนื่อง (โดยเฉพาะช่วง 15–25 Hz ที่คอนทราสต์สูง) อาจกระตุ้นอาการในผู้ที่มีภาวะไวต่อแสงหรือโรคลมชัก (Photosensitive epilepsy) และทำให้ตาล้าได้ ในการออกแบบจริงจึงนิยมใช้คอนทราสต์นุ่มนวล รูปแบบตารางหมากรุกความถี่สูง หรือมีโหมดปลอดภัยเสมอ',
    },
    calloutEn: {
      tone: 'coral',
      title: 'Photosensitivity & Visual Comfort Warning',
      text: 'High-contrast flashing lights (especially 15–25 Hz) can trigger seizures in individuals with photosensitive epilepsy and cause visual fatigue. Real SSVEP systems use softer sinusoidal modulation, high-frequency phase-coded stimuli, and always provide a safe simulation mode.',
    },
    takeaways: [
      'SSVEP วัดที่อิเล็กโทรดท้ายทอย (Oz, O1, O2) เหนือ Visual cortex',
      'เมื่อจ้องความถี่ f Hz ในกราฟ FFT จะเห็นยอดแหลมที่ความถี่หลัก f Hz และฮาร์มอนิก 2f, 3f Hz',
      'ให้ค่าอัตราการส่งข้อมูล (ITR) สูงที่สุดในกลุ่ม Non-invasive BCI แต่ต้องพึ่งการกลอกตาจ้องมอง (Gaze-dependent)',
    ],
    takeawaysEn: [
      'SSVEP is recorded over occipital electrodes (Oz, O1, O2) directly above V1.',
      'Gazing at an f Hz flicker produces narrow spectral peaks at fundamental frequency f and harmonics 2f, 3f.',
      'Delivers the highest Information Transfer Rate (ITR) among non-invasive BCIs, though it requires eye-gaze control.',
    ],
    quiz: [
      {
        q: 'ถ้าบนหน้าจอมีปุ่ม 3 ปุ่มกะพริบที่ 7.5 Hz, 10 Hz และ 12 Hz และผู้ใช้กำลังจ้องปุ่ม 12 Hz อยู่ เมื่อเรานำสัญญาณที่อิเล็กโทรด Oz มาทำ FFT จะเห็นลักษณะใด?',
        choices: [
          'มียอดสเปกตรัมพุ่งสูงขึ้นอย่างชัดเจนที่ 12 Hz (และฮาร์มอนิกที่ 24 Hz)',
          'ความถี่ทั้งหมดจะหายไปเหลือ 0 Hz',
          'มียอดพุ่งที่อิเล็กโทรดหน้าผาก Fp1 ที่ความถี่ 1 Hz เท่านั้น',
        ],
        answer: 0,
        hint: 'จ้องความถี่ไหน Visual cortex ที่ท้ายทอยก็จะเต้นตามความถี่นั้นและพหุคูณของมันจ้ะ',
        explain: 'ถูกต้อง! SSVEP เป็นการตอบสนองแบบล็อกความถี่ (Frequency-tagged response) ที่ปรากฏทั้งความถี่มูลฐาน (12 Hz) และฮาร์มอนิก (24 Hz, 36 Hz)',
      },
      {
        q: 'อิเล็กโทรดตำแหน่งใดสำคัญที่สุดสำหรับการรับสัญญาณ SSVEP?',
        choices: [
          'Oz, O1 และ O2 บริเวณท้ายทอยเหนือ Visual cortex',
          'Fp1 และ Fp2 บริเวณหน้าผาก',
          'T7 และ T8 บริเวณเหนือใบหู',
        ],
        answer: 0,
        hint: 'ส่วนรับภาพของสมองอยู่ด้านหลังสุดตรงท้ายทอย (Occipital) จ้ะ',
        explain: 'ใช่เลย! เปลือกสมองรับภาพ V1 อยู่ตรงท้ายทอย ทำให้อิเล็กโทรด Oz, O1, O2 รับสัญญาณ SSVEP ได้แรงที่สุด',
      },
      {
        q: 'ข้อจำกัดสำคัญของการใช้ SSVEP BCI ในชีวิตประจำวันคือข้อใด?',
        choices: [
          'ผู้ใช้ต้องจ้องมองสิ่งเร้าที่กะพริบซึ่งอาจทำให้ตาล้า และต้องควบคุมการกลอกตาได้',
          'ต้องใช้เวลาฝึกฝนอย่างน้อย 6 เดือนก่อนเริ่มใช้งานครั้งแรก',
          'ไม่สามารถแยกคำสั่งได้เกิน 2 คำสั่ง',
        ],
        answer: 0,
        hint: 'ลองนึกถึงการต้องมองปุ่มกะพริบนานๆ หรือผู้ป่วยที่กลอกตาไม่ได้สิ',
        explain: 'ถูกต้องครับ! แม้ SSVEP จะเร็วและแม่นมาก แต่เพราะต้องพึ่งสิ่งเร้าภาพจากภายนอก (Exogenous BCI) จึงอาจทำให้ล้าสายตาและไม่เหมาะกับผู้ที่ขยับลูกตาไม่ได้',
      },
    ],
    quizEn: [
      {
        q: 'Three screen targets flicker at 7.5 Hz, 10 Hz, and 12 Hz. While the user gazes at the 12 Hz target, what does the FFT spectrum at electrode Oz show?',
        choices: [
          'A sharp spectral peak at 12 Hz (plus a 2nd harmonic peak at 24 Hz)',
          'All frequencies drop to 0 Hz',
          'A 1 Hz peak only at forehead electrode Fp1',
        ],
        answer: 0,
        hint: 'The visual cortex entrains to the exact flicker frequency of the attended target and its harmonics!',
        explain: 'Correct! SSVEP produces narrow-band peaks at the fundamental frequency (12 Hz) and integer harmonics (24 Hz).',
      },
      {
        q: 'Which electrode sites are most important for recording SSVEP?',
        choices: [
          'Oz, O1, and O2 over the occipital visual cortex',
          'Fp1 and Fp2 on the forehead',
          'T7 and T8 above the ears',
        ],
        answer: 0,
        hint: 'Primary visual cortex (V1) sits at the occipital pole at the back of the head.',
        explain: 'Right! Oz, O1, and O2 sit directly over the occipital visual cortex.',
      },
      {
        q: 'What is a key practical limitation of SSVEP BCIs for long-term daily use?',
        choices: [
          'Continuous flickering stimuli can cause visual fatigue, and the user must be able to direct their eye gaze',
          'It requires 6 months of training before first use',
          'It cannot distinguish more than 2 targets',
        ],
        answer: 0,
        hint: 'Think about staring at flashing buttons for hours or patients who cannot move their eyes.',
        explain: 'Correct! Because SSVEP is an exogenous (stimulus-driven) visual paradigm, prolonged flicker can tire the eyes.',
      },
    ],
    refs: [
      'Vialatte, F. B., Maurice, M., Dauwels, J., & Cichocki, A. (2010). Steady-state visually evoked potentials: focus on essential paradigms and future perspectives. Progress in Neurobiology.',
      'Chen, X., Wang, Y., Nakanishi, M., Gao, X., Jung, T. P., & Gao, S. (2015). High-speed spelling with a noninvasive brain–computer interface. PNAS.',
    ],
  },

  /* ============================================================
     10. Motor Imagery (ERD / ERS)
  ============================================================ */
  {
    id: 10,
    slug: 'motor-imagery',
    phase: 3,
    title: 'พาราไดม์ที่ 3: Motor Imagery จินตนาการขยับร่างกาย',
    titleEn: 'Sensorimotor Rhythms & ERD/ERS',
    subtitle: 'สั่งงานด้วยความคิดล้วนๆ โดยไม่ต้องพึ่งแสงกะพริบ: มือซ้ายสั่งซีกขวา มือขวาสั่งซีกซ้าย',
    subtitleEn: 'Control devices purely by mental movement rehearsal — left hand suppresses C4, right hand suppresses C3',
    duration: '12 นาที',
    durationEn: '12 min',
    color: 'var(--coral)',
    regionId: 'motor',
    widget: 'motor-imagery',
    widgetTitle: 'จำลอง Motor Imagery แผนที่ศีรษะ ERD/ERS และเกมเลี้ยงลูกบอล',
    widgetTitleEn: 'Motor Imagery Topomap (ERD/ERS) & BCI Cursor Game',
    intro: `
      <p>ถ้าเราอยากสั่งงานคอมพิวเตอร์หรือแขนกลด้วย <strong>ความตั้งใจจากภายในสมองล้วนๆ (Endogenous BCI)</strong> โดยไม่ต้องจ้องไฟกะพริบใดๆ คำตอบคือ <strong>Motor Imagery (MI)</strong> หรือการ <em>จินตนาการถึงความรู้สึกของการขยับอวัยวะ</em> (เช่น จินตนาการว่ากำลังกำมือซ้ายหรือกำมือขวา) โดยที่กล้ามเนื้อจริงอยู่นิ่งสนิท!</p>
      <p>เมื่อเราพักมืออยู่นิ่งๆ เปลือกสมองสั่งการเคลื่อนไหวที่อิเล็กโทรด <code>C3</code> (ซีกซ้าย) และ <code>C4</code> (ซีกขวา) จะส่งคลื่นจังหวะพัก <strong>Mu (8–13 Hz)</strong> และ <strong>Beta (13–30 Hz)</strong> ออกมาอย่างสม่ำเสมอ แต่ทันทีที่เราเริ่มจินตนาการขยับมือ เซลล์ประสาทในส่วนนั้นจะแตกแถวไปประมวลผลคำสั่ง ทำให้พลังงานคลื่น Mu/Beta <strong>ลดฮวบลงชั่วคราว</strong> เรียกว่า <strong>Event-Related Desynchronization (ERD)</strong> และเมื่อหยุดคิด พลังงานคลื่น Beta จะดีดกลับขึ้นมาสูงกว่าเดิมสั้นๆ เรียกว่า <strong>ERS (Beta rebound)</strong></p>
      <p>กฎเหล็กที่ห้ามลืมเด็ดขาดคือ <strong>การทำงานข้ามฝั่ง (Contralateral organization)</strong>:</p>
      <ul>
        <li>จินตนาการขยับ <strong>มือซ้าย</strong> → เกิด ERD (พลังงานคลื่น Mu ลดลง) ที่สมองซีกขวา <code>C4</code></li>
        <li>จินตนาการขยับ <strong>มือขวา</strong> → เกิด ERD (พลังงานคลื่น Mu ลดลง) ที่สมองซีกซ้าย <code>C3</code></li>
        <li>จินตนาการขยับ <strong>เท้าทั้งสองข้าง</strong> → เกิด ERD ที่กึ่งกลางยอดศีรษะ <code>Cz</code></li>
      </ul>
    `,
    introEn: `
      <p>What if you want to control a prosthetic hand or cursor purely through <strong>self-generated mental intention (endogenous BCI)</strong> without any external flashing lights? Enter <strong>Motor Imagery (MI)</strong> — mentally rehearsing the physical sensation of moving a limb (such as squeezing your left or right hand) while keeping your muscles completely still!</p>
      <p>When your hands are resting, the sensorimotor cortex beneath <code>C3</code> (left hemisphere) and <code>C4</code> (right hemisphere) produces a steady idling <strong>Mu (8–13 Hz)</strong> and <strong>Beta (13–30 Hz)</strong> rhythm. The moment you imagine moving a hand, neurons in the corresponding motor cortex leave their idling rhythm to process the motor program, causing Mu and Beta band power to <strong>drop sharply</strong> — a phenomenon called <strong>Event-Related Desynchronization (ERD)</strong>. When you stop imagining, Beta power briefly rebounds above baseline (<strong>Event-Related Synchronization, ERS</strong>).</p>
      <p>Never forget the golden rule of <strong>contralateral organization</strong>:</p>
      <ul>
        <li>Imagining <strong>LEFT hand</strong> movement → Mu/Beta power drops (ERD) over the RIGHT hemisphere at <code>C4</code>.</li>
        <li>Imagining <strong>RIGHT hand</strong> movement → Mu/Beta power drops (ERD) over the LEFT hemisphere at <code>C3</code>.</li>
        <li>Imagining <strong>BOTH FEET</strong> movement → ERD appears at the vertex midline <code>Cz</code>.</li>
      </ul>
    `,
    callout: {
      tone: 'teal',
      title: 'เคล็ดลับการจินตนาการให้ได้สัญญาณชัด (Kinesthetic vs Visual Imagery)',
      text: 'การจินตนาการแบบ "รู้สึกถึงแรงบีบและความตึงของกล้ามเนื้อมือตัวเอง (Kinesthetic motor imagery)" จะกระตุ้น Motor cortex และสร้าง ERD ที่ C3/C4 ได้แรงกว่าการแค่ "นึกเห็นภาพมือเป็นหนังการ์ตูน (Visual imagery)" มาก!',
    },
    calloutEn: {
      tone: 'teal',
      title: 'Pro Tip: Kinesthetic vs. Visual Motor Imagery',
      text: 'Feeling the first-person muscular tension and joint sensation of squeezing a ball (kinesthetic imagery) recruits sensorimotor cortex and produces far stronger C3/C4 ERD than passively picturing a hand from the third person (visual imagery)!',
    },
    takeaways: [
      'ERD = การลดลงของพลังงานคลื่น Mu (8–13 Hz) และ Beta (13–30 Hz) ขณะวางแผนหรือจินตนาการเคลื่อนไหว',
      'Contralateral: มือซ้าย ↔ อิเล็กโทรด C4 (ซีกขวา), มือขวา ↔ อิเล็กโทรด C3 (ซีกซ้าย), เท้า ↔ Cz',
      'เป็นระบบ BCI ที่เป็นธรรมชาติสำหรับงานฟื้นฟูผู้ป่วยโรคหลอดเลือดสมอง (Stroke rehabilitation) และการควบคุมอุปกรณ์',
    ],
    takeawaysEn: [
      'ERD = Power decrease in Mu (8–13 Hz) and Beta (13–30 Hz) rhythms during movement execution or imagination.',
      'Contralateral mapping: Left Hand ↔ C4 (right hemisphere), Right Hand ↔ C3 (left hemisphere), Feet ↔ Cz.',
      'Widely used in neurorehabilitation after stroke as well as continuous cursor and prosthetic control.',
    ],
    quiz: [
      {
        q: 'เมื่อผู้ใช้จินตนาการว่ากำลัง "กำมือซ้าย" โดยไม่ขยับมือจริง จะเกิดการเปลี่ยนแปลงใดในสัญญาณ EEG?',
        choices: [
          'พลังงานคลื่น Mu (8–13 Hz) และ Beta ลดลง (เกิด ERD) เด่นชัดที่อิเล็กโทรด C4 บนสมองซีกขวา',
          'พลังงานคลื่น Mu เพิ่มขึ้น 10 เท่าที่อิเล็กโทรด C3 บนสมองซีกซ้าย',
          'เกิดคลื่น Delta ขนาดใหญ่ที่หน้าผาก Fp1 เท่านั้น',
        ],
        answer: 0,
        hint: 'จำกฎข้ามฝั่ง (Contralateral) ไว้: มือซ้ายคุมด้วยสมองซีกขวา (เลขคู่ C4) และเมื่อเริ่มคิดขยับ คลื่นพัก Mu จะ "ลดลง" (ERD) จ้ะ',
        explain: 'ถูกต้อง! มือซ้ายถูกควบคุมโดย Motor cortex ซีกขวา (C4) และการทำงานของพื้นที่นั้นทำให้จังหวะคลื่นพัก Mu/Beta สลายตัวลง เกิดเป็น ERD ที่ C4',
      },
      {
        q: 'คำว่า ERD (Event-Related Desynchronization) ในบริบทของ Motor Imagery หมายถึงอะไร?',
        choices: [
          'การที่พลังงานของคลื่นในย่านความถี่ Mu/Beta ลดต่ำลงเมื่อเทียบกับช่วงพัก เพราะเซลล์ประสาทออกจากจังหวะพักมาประมวลผล',
          'การที่สายอิเล็กโทรดหลุดออกจากหัวพร้อมกัน',
          'การที่สมองซีกซ้ายและขวาหยุดส่งสัญญาณหากันถาวร',
        ],
        answer: 0,
        hint: 'Desynchronization แปลว่าเซลล์หยุดเต้นจังหวะพักพร้อมๆ กัน แอมพลิจูดรวมจึงลดลงจ้ะ',
        explain: 'เยี่ยมเลย! ในยามพักเซลล์จำนวนมากซิงค์กันเป็นคลื่น Mu ลูกใหญ่ พอเริ่มสั่งงานแต่ละกลุ่มเซลล์แยกไปทำหน้าที่เฉพาะ แอมพลิจูดรวมจึงลดลง',
      },
      {
        q: 'หากต้องการเพิ่มคำสั่งที่ 3 นอกเหนือจากมือซ้าย (C4) และมือขวา (C3) นักวิจัยมักใช้การจินตนาการขยับอวัยวะใดซึ่งให้สัญญาณเด่นที่จุดยอดศีรษะ Cz?',
        choices: [
          'การขยับเท้าทั้งสองข้าง (Feet imagery)',
          'การกะพริบตาถี่ๆ',
          'การฟังเพลงคลาสสิก',
        ],
        answer: 0,
        hint: 'ตามแผนที่ Motor homunculus ส่วนของขาและเท้าจะอยู่ตรงแนวกลางด้านบนของสมองพอดีจ้ะ',
        explain: 'ถูกต้องครับ! พื้นที่ควบคุมขาและเท้าอยู่ด้านในใกล้ร่องกึ่งกลางสมอง ซึ่งตรงกับตำแหน่งอิเล็กโทรด Cz พอดี',
      },
    ],
    quizEn: [
      {
        q: 'When a user kinesthetically imagines squeezing their LEFT hand while staying completely still, what happens in the EEG?',
        choices: [
          'Mu (8–13 Hz) and Beta band power drops (ERD) predominantly at electrode C4 over the right hemisphere',
          'Mu power increases 10x at electrode C3 over the left hemisphere',
          'A large Delta wave appears only at Fp1',
        ],
        answer: 0,
        hint: 'Remember contralateral control: the left hand is controlled by the right hemisphere (even number C4), and active motor cortex shows a power drop (ERD)!',
        explain: 'Correct! Left-hand motor imagery recruits the right motor cortex beneath C4, desynchronizing its idling Mu/Beta rhythm (ERD).',
      },
      {
        q: 'What does ERD (Event-Related Desynchronization) mean in Motor Imagery BCI?',
        choices: [
          'A decrease in Mu/Beta band power relative to baseline as cortical neurons leave their synchronized idling state to process a motor command',
          'All electrodes falling off the cap simultaneously',
          'Permanent disconnection of the corpus callosum',
        ],
        answer: 0,
        hint: 'When resting neurons stop chanting in unison ("desynchronize"), the summed scalp oscillation amplitude drops!',
        explain: 'Spot on! At rest, sensorimotor neurons oscillate together in a large Mu rhythm; during motor planning, they desynchronize and band power drops.',
      },
      {
        q: 'To add a 3rd Motor Imagery class alongside Left Hand (C4) and Right Hand (C3), which movement imagination produces ERD right at the vertex electrode Cz?',
        choices: [
          'Both feet / ankle movement imagery',
          'Rapid eye blinking',
          'Listening to classical music',
        ],
        answer: 0,
        hint: 'On the Motor Homunculus, the leg and foot representation sits at the top medial wall right under Cz!',
        explain: 'Correct! Lower-limb motor cortex lies near the longitudinal midline directly beneath electrode Cz.',
      },
    ],
    refs: [
      'Pfurtscheller, G., & Lopes da Silva, F. H. (1999). Event-related EEG/MEG synchronization and desynchronization: basic principles. Clinical Neurophysiology.',
      'Wolpaw, J. R., Birbaumer, N., McFarland, D. J., Pfurtscheller, G., & Vaughan, T. M. (2002). Brain–computer interfaces for communication and control. Clinical Neurophysiology.',
    ],
  },

  /* ============================================================
     11. Feature Extraction & Machine Learning (CSP + LDA)
  ============================================================ */
  {
    id: 11,
    slug: 'features-ml',
    phase: 4,
    title: 'สกัดจุดเด่นและแยกคลาสด้วย CSP + LDA',
    titleEn: 'Feature Extraction, CSP & Linear Discriminant Analysis',
    subtitle: 'แปลงคลื่นสมองให้เป็นจุดบนกราฟ แล้วขีดเส้นแบ่งคำสั่งซ้าย-ขวาอย่างฉลาด',
    subtitleEn: 'Turn multi-channel brain waves into 2D feature points and draw an optimal decision boundary',
    duration: '12 นาที',
    durationEn: '12 min',
    color: 'var(--teal)',
    regionId: 'motor',
    widget: 'lda-play',
    widgetTitle: 'สนามทดลองขีดเส้นแบ่ง LDA และปัญหาสัญญาณเลื่อนข้ามวัน (Non-stationarity)',
    widgetTitleEn: 'Interactive LDA Classifier & Non-Stationarity Playground',
    intro: `
      <p>หลังจากเรากรองสัญญาณความถี่ Mu/Beta (เช่น 8–30 Hz) ออกมาแล้ว เราจะสอนให้คอมพิวเตอร์ทายได้อย่างไรว่าสัญญาณก้อนนี้ (Epoch) คือ <strong>"มือซ้าย"</strong> หรือ <strong>"มือขวา"</strong>? ขั้นตอนนี้แบ่งเป็น 2 ส่วนคู่บุญกัน คือ <strong>การสกัดคุณลักษณะ (Feature extraction)</strong> และ <strong>ตัวจำแนกประเภท (Classifier)</strong></p>
      <p>สำหรับ Motor Imagery อัลกอริทึมสกัดจุดเด่นที่เป็นมาตรฐานทองคำ (Gold standard) คือ <strong>CSP (Common Spatial Patterns)</strong> ซึ่งทำหน้าที่หา "น้ำหนักการผสมช่องสัญญาณเชิงพื้นที่ (Spatial filter)" ที่ทำให้ <strong>ความแปรปรวน (Variance = พลังงานของคลื่น)</strong> ของคลาสหนึ่งมีค่าสูงสุด ในขณะที่อีกคลาสมีค่าต่ำสุด จากนั้นเราจึงนำค่า <code>log(variance)</code> ของสัญญาณที่ได้มาเป็นจุดพิกัด $(x, y)$</p>
      <p>เมื่อได้จุดข้อมูลแล้ว พระเอกที่ใช้ขีดเส้นแบ่งคลาสคือ <strong>LDA (Linear Discriminant Analysis)</strong> ซึ่งหาเส้นตรงที่แยกกลุ่มจุดสองคลาสออกจากกันโดยทำให้ระยะห่างระหว่างค่าเฉลี่ยของสองคลาสมากที่สุดเทียบกับความกระจายตัวภายในคลาส แม้ปัจจุบันจะมี Deep Learning อย่าง <strong>EEGNet</strong> หรือตัวจำแนกแบบ <strong>Riemannian Geometry</strong> แต่คู่หู <code>CSP + LDA</code> ก็ยังเป็นจุดเริ่มต้นที่ทั้งเร็ว ตีความง่าย และใช้ข้อมูลฝึกน้อยมาก!</p>
    `,
    introEn: `
      <p>Once we band-pass filter an EEG epoch into the Mu/Beta range (e.g., 8–30 Hz), how do we teach a computer to decide whether that trial is <strong>"Left Hand"</strong> or <strong>"Right Hand"</strong>? The pipeline has two partners: <strong>Feature Extraction</strong> and a <strong>Classifier</strong>.</p>
      <p>For Motor Imagery, the gold-standard feature extractor is <strong>CSP (Common Spatial Patterns)</strong>. CSP learns a set of spatial weights across channels that <strong>maximizes signal variance (= band power)</strong> for one class while minimizing it for the other! Taking the <code>log(variance)</code> of the top spatial filters turns a noisy multi-channel epoch into a clean 2D or 4D feature point $(x, y)$.</p>
      <p>Next, <strong>LDA (Linear Discriminant Analysis)</strong> computes the optimal straight decision line separating the two clouds of points by maximizing the distance between class means relative to within-class scatter. Even in the era of compact CNNs like <strong>EEGNet</strong> and <strong>Riemannian Geometry</strong> classifiers, <code>CSP + LDA</code> remains a fast, interpretable benchmark that works on small calibration sets!</p>
    `,
    callout: {
      tone: 'coral',
      title: 'ศัตรูตัวฉกาจของ BCI: Non-stationarity (สัญญาณสมองไม่นิ่งข้ามเวลา)',
      text: 'แค่ถอดหมวก EEG ออกแล้วสวมใหม่ในวันรุ่งขึ้น หรือผู้ใช้ง่วงนอนลง ตำแหน่งกลุ่มจุดข้อมูล (Distribution) ก็อาจเลื่อนไปจากเดิมจนเส้นแบ่ง LDA เดิมทายผิด! จึงต้องมีการปรับเทียบใหม่ (Recalibration / Transfer learning) และการวัดผลที่ถูกต้องด้วย Cross-validation โดยห้ามนำข้อมูลอนาคตปนกับข้อมูลฝึก (Data leakage)',
    },
    calloutEn: {
      tone: 'coral',
      title: 'The Arch-Nemesis of BCI: Non-Stationarity (Session-to-Session Drift)',
      text: 'Take off the EEG cap and put it back on tomorrow — or simply get tired — and the feature clouds shift (covariate shift), causing yesterday’s LDA boundary to misclassify! That is why BCIs use quick recalibration or adaptive classifiers, and why cross-validation must never leak test data into CSP training.',
    },
    takeaways: [
      'ความแปรปรวน (Variance) ของสัญญาณที่ผ่าน Band-pass filter แล้ว มีค่าเท่ากับพลังงานในย่านความถี่นั้น',
      'CSP ช่วยรวมหลายช่องสัญญาณเพื่อขยายความต่างของพลังงานระหว่างสองคลาสให้ชัดที่สุด',
      'LDA ขีดเส้นแบ่งเชิงเส้นที่ทนทานและใช้ข้อมูลน้อย แต่ต้องระวังการเลื่อนของสัญญาณเมื่อเปลี่ยนวัน (Non-stationarity)',
    ],
    takeawaysEn: [
      'The variance of a zero-mean band-pass filtered signal equals its average power in that frequency band.',
      'CSP learns spatial filters that maximize the variance ratio between two Motor Imagery classes.',
      'LDA draws a robust linear boundary from few trials, but requires recalibration when feature distributions drift across sessions (non-stationarity).',
    ],
    quiz: [
      {
        q: 'อัลกอริทึม CSP (Common Spatial Patterns) ทำหน้าที่หลักอะไรในระบบ Motor Imagery BCI?',
        choices: [
          'สร้างตัวกรองเชิงพื้นที่ (Spatial filter) ที่ทำให้ความแปรปรวน (พลังงาน) ของคลาสหนึ่งสูงสุดและอีกคลาสต่ำสุด',
          'เปลี่ยนความถี่ไฟบ้านจาก 50 Hz เป็น 60 Hz',
          'ใช้แสดงตารางตัวอักษร 36 ตัวบนหน้าจอ',
        ],
        answer: 0,
        hint: 'CSP ย่อมาจาก Common Spatial Patterns เน้นขยายความต่างของ Variance ระหว่าง 2 คลาสจ้ะ',
        explain: 'ถูกต้อง! CSP เรียนรู้น้ำหนักการผสมช่องอิเล็กโทรด เพื่อให้ความแปรปรวนของสัญญาณระหว่างมือซ้ายและมือขวาแตกต่างกันมากที่สุด',
      },
      {
        q: 'เมื่อผู้ใช้นำหมวก EEG กลับมาสวมใหม่ในวันถัดไป แล้วพบว่าโมเดล LDA ที่เมื่อวานได้ความแม่นยำ 85% วันนี้เหลือแค่ 55% ปรากฏการณ์นี้เรียกว่าอะไร?',
        choices: [
          'ความไม่นิ่งของสัญญาณ (Non-stationarity) จากตำแหน่งอิเล็กโทรดที่คลาดเคลื่อนและสภาพสมองที่เปลี่ยนไป',
          'Aliasing จากการสุ่มความถี่สูงเกินไป',
          'Saltatory conduction',
        ],
        answer: 0,
        hint: 'ลองกดปุ่ม "สวมหมวกวันใหม่ (Non-stationarity)" ในของเล่นด้านบนดูสิว่ากลุ่มจุดเลื่อนไปอย่างไร!',
        explain: 'ใช่เลย! Non-stationarity คือความท้าทายหลักของ BCI ทำให้การทำ Calibration สั้นๆ ก่อนใช้งานหรือการใช้ Adaptive LDA มีความสำคัญมาก',
      },
      {
        q: 'ในการวัดความแม่นยำของโมเดล BCI ด้วย Cross-validation ข้อใดคือสิ่งที่ "ห้ามทำเด็ดขาด"?',
        choices: [
          'การนำข้อมูลชุดทดสอบ (Test set) มาใช้ฝึก CSP ด้วยก่อนแบ่งข้อมูล เพราะจะเกิด Data leakage ทำให้ความแม่นยำสูงเกินจริง',
          'การใส่ CSP และ LDA ไว้ใน Pipeline เดียวกันของ Scikit-learn',
          'การรายงานค่าความแม่นยำเทียบกับระดับการเดาสุ่ม (Chance level)',
        ],
        answer: 0,
        hint: 'ถ้าแอบเอาข้อสอบจริงมาหาค่า CSP ก่อนสอบ คะแนนที่ได้จะเชื่อถือได้ไหมนะ?',
        explain: 'ถูกต้องที่สุด! CSP เป็นอัลกอริทึมที่ใช้ป้ายกำกับคลาส (Supervised) จึงต้องคำนวณเฉพาะใน Training fold เท่านั้น การใช้ sklearn Pipeline จะช่วยป้องกัน Data leakage นี้โดยอัตโนมัติ',
      },
    ],
    quizEn: [
      {
        q: 'What is the primary role of CSP (Common Spatial Patterns) in a Motor Imagery BCI pipeline?',
        choices: [
          'It learns spatial filters across electrodes that maximize signal variance (band power) for one class while minimizing it for the other',
          'It converts 50 Hz mains hum into 60 Hz',
          'It displays a 6×6 character flashing matrix',
        ],
        answer: 0,
        hint: 'CSP finds spatial channel weights that make the variance difference between two classes as large as possible.',
        explain: 'Correct! CSP projects multi-channel EEG onto virtual components whose log-variance maximally separates Left vs. Right imagery.',
      },
      {
        q: 'A user achieves 85% accuracy with an LDA model today, but when they put the cap back on tomorrow the old model drops to 55%. What is this phenomenon called?',
        choices: [
          'Non-stationarity (session-to-session covariate shift due to slight cap shifts, impedance changes, and brain state drift)',
          'Nyquist aliasing',
          'Saltatory conduction',
        ],
        answer: 0,
        hint: 'Toggle "New Day Cap Shift (Non-stationarity)" in the playground above and watch the data clouds shift across the old boundary!',
        explain: 'Spot on! Non-stationarity is why real-world BCIs use short calibration routines or adaptive classifiers.',
      },
      {
        q: 'When evaluating a CSP + LDA pipeline with cross-validation, which mistake must NEVER be made?',
        choices: [
          'Fitting CSP on the entire dataset (including test trials) before splitting into folds, which causes severe data leakage',
          'Wrapping CSP and LDA inside a single scikit-learn Pipeline',
          'Comparing accuracy against the 50% chance level',
        ],
        answer: 0,
        hint: 'Because CSP uses class labels (supervised), fitting it on test trials leaks test information into training!',
        explain: 'Exactly! Always fit CSP strictly inside each training fold — using sklearn Pipeline([("CSP", csp), ("LDA", lda)]) guarantees zero data leakage.',
      },
    ],
    refs: [
      'Ramoser, H., Müller-Gerking, J., & Pfurtscheller, G. (2000). Optimal spatial filtering of single trial EEG during imagined hand movement. IEEE Transactions on Rehabilitation Engineering.',
      'Lotte, F., et al. (2018). A review of classification algorithms for EEG-based brain–computer interfaces: a 10 year update. Journal of Neural Engineering.',
    ],
  },

  /* ============================================================
     12. Hands-on MNE-Python & Real Datasets
  ============================================================ */
  {
    id: 12,
    slug: 'hands-on-python',
    phase: 4,
    title: 'ลงมือเขียนโค้ดจริงด้วย MNE-Python',
    titleEn: 'End-to-End BCI Pipeline in Python',
    subtitle: 'จากโหลดข้อมูลจริง PhysioNet กรองสัญญาณ ตัด Epoch ไปจนถึงเทรน CSP + LDA ครบจบในหน้าเดียว!',
    subtitleEn: 'From loading real PhysioNet EDF data and filtering to epoching and training CSP + LDA',
    duration: '15 นาที',
    durationEn: '15 min',
    color: 'var(--mustard)',
    regionId: 'brain',
    widget: 'code-lab',
    widgetTitle: 'ห้องแล็บโค้ด MNE-Python 6 ขั้นตอน พร้อมแหล่งข้อมูลเปิด (Open Datasets)',
    widgetTitleEn: '6-Step MNE-Python Pipeline Lab & Open BCI Datasets',
    intro: `
      <p>ยินดีด้วยที่มาถึงด่านสุดท้าย! ถึงเวลาเปลี่ยนความรู้ทั้ง 11 ด่านให้กลายเป็นโค้ด Python ที่รันได้จริงแม้คุณจะยังไม่มีเครื่อง EEG อยู่กับตัวก็ตาม เพราะวงการ BCI มี <strong>ชุดข้อมูลเปิดระดับโลก (Open-access datasets)</strong> ให้ดาวน์โหลดอัตโนมัติผ่านไลบรารีมาตรฐานอย่าง <strong><code>MNE-Python</code></strong> และ <strong><code>MOABB</code></strong></p>
      <p>ในห้องแล็บด้านล่าง เราจะเดินตามไปป์ไลน์มาตรฐาน 6 ขั้นตอนบนชุดข้อมูลจริง <strong>PhysioNet EEG Motor Movement/Imagery Dataset</strong> (บันทึกจาก 64 อิเล็กโทรด ขณะผู้เข้าร่วมจินตนาการขยับมือและเท้า):</p>
      <ol>
        <li><strong>ดาวน์โหลดและอ่านไฟล์ EDF:</strong> ดึงข้อมูลจริงด้วย <code>mne.datasets.eegbci.load_data()</code> และตั้งค่าพิกัดอิเล็กโทรดมาตรฐาน <code>standard_1005</code></li>
        <li><strong>กรองความถี่ (Band-pass 7–30 Hz):</strong> ตัดทั้งเส้นลอยช้าๆ และไฟบ้านออก เหลือเฉพาะย่าน Mu และ Beta</li>
        <li><strong>ตัดแบ่งช่วงเวลา (Epoching):</strong> ดึงเหตุการณ์ <code>T1</code> และ <code>T2</code> มาตัดเป็นก้อนข้อมูลรอบจังหวะเริ่มจินตนาการ</li>
        <li><strong>สกัดจุดเด่นด้วย CSP:</strong> ใช้ <code>mne.decoding.CSP(n_components=4)</code> และพล็อตดูแผนที่น้ำหนักบนศีรษะ</li>
        <li><strong>สร้าง Pipeline คู่กับ LDA:</strong> เชื่อม <code>CSP</code> + <code>LinearDiscriminantAnalysis</code> เข้าด้วยกันใน Scikit-learn</li>
        <li><strong>วัดผลด้วย Cross-validation:</strong> ประเมินความแม่นยำด้วย <code>ShuffleSplit</code> อย่างถูกต้องโดยไม่เกิด Data leakage!</li>
      </ol>
    `,
    introEn: `
      <p>Congratulations on reaching the final stage! Now let’s turn everything from Stages 1–11 into real, runnable Python code — even if you don’t own an EEG headset yet. The BCI community maintains rich <strong>open-access datasets</strong> that download automatically via <strong><code>MNE-Python</code></strong> and <strong><code>MOABB</code></strong>.</p>
      <p>In the interactive code lab below, you’ll step through a complete 6-stage decoding pipeline on the real 64-channel <strong>PhysioNet EEG Motor Movement/Imagery Dataset</strong>:</p>
      <ol>
        <li><strong>Download &amp; Load EDF Files:</strong> Fetch real recordings with <code>mne.datasets.eegbci.load_data()</code> and attach the <code>standard_1005</code> 3D electrode montage.</li>
        <li><strong>Band-Pass Filter (7–30 Hz):</strong> Keep the Mu and Beta bands while stripping away slow drift and 50/60 Hz power-line noise.</li>
        <li><strong>Epoching:</strong> Extract event markers (<code>T1</code> vs. <code>T2</code>) and slice time-locked trials around imagery onset.</li>
        <li><strong>Spatial Filtering with CSP:</strong> Configure <code>mne.decoding.CSP(n_components=4)</code> and inspect its scalp patterns.</li>
        <li><strong>Scikit-learn Pipeline with LDA:</strong> Chain <code>CSP</code> + <code>LinearDiscriminantAnalysis</code> into a unified pipeline.</li>
        <li><strong>Cross-Validation:</strong> Evaluate classification accuracy across 10-fold <code>ShuffleSplit</code> with zero data leakage!</li>
      </ol>
    `,
    callout: {
      tone: 'teal',
      title: 'อยากต่อยอดไปสู่ Real-time BCI ของตัวเองต้องดูตัวไหน?',
      text: 'เมื่อฝึกกับข้อมูล Offline คล่องแล้ว ในการทำระบบสด (Online BCI) นักพัฒนาจะใช้โปรโตคอล Lab Streaming Layer (LSL) เพื่อสตรีมข้อมูลเวลาจริงจากบอร์ดอย่าง OpenBCI หรือเครื่อง EEG ต่างๆ เข้าสู่สคริปต์ Python ด้วยความหน่วงระดับมิลลิวินาที',
    },
    calloutEn: {
      tone: 'teal',
      title: 'Ready to Build Your Own Real-Time Online BCI?',
      text: 'Once you master offline decoding with MNE-Python, use Lab Streaming Layer (LSL / pylsl) to stream real-time multi-channel EEG and stimulus markers from hardware like OpenBCI into your Python classifier with millisecond latency.',
    },
    takeaways: [
      'รันคำสั่ง pip install mne scikit-learn matplotlib ก็พร้อมทดลองกับข้อมูล EEG จริงบนเครื่องของคุณได้ทันที',
      'ใช้ sklearn.pipeline.Pipeline เสมอเมื่อรวม CSP กับ Classifier เพื่อป้องกัน Data leakage ระหว่างทำ Cross-validation',
      'คลังข้อมูลแนะนำสำหรับทำโปรเจกต์จบหรือวิจัยต่อ: PhysioNet EEGBCI, BCI Competition IV (Dataset 2a/2b), และ MOABB',
    ],
    takeawaysEn: [
      'Run `pip install mne scikit-learn matplotlib` to start analyzing real 64-channel EEG datasets on your computer today.',
      'Always wrap CSP and your classifier inside `sklearn.pipeline.Pipeline` to prevent data leakage during cross-validation.',
      'Top benchmark datasets for projects & research: PhysioNet EEGBCI, BCI Competition IV (2a/2b), and MOABB.',
    ],
    quiz: [
      {
        q: 'ในไลบรารี MNE-Python คำสั่ง raw.filter(7., 30., fir_design="firwin") ทำหน้าที่ตรงกับความรู้ในด่านใดมากที่สุด?',
        choices: [
          'ทำ Band-pass filter เก็บเฉพาะความถี่ย่าน Mu (8–13 Hz) และ Beta (13–30 Hz) พร้อมตัด Drift และไฟบ้าน 50/60 Hz ออก',
          'ลบช่องอิเล็กโทรดให้เหลือเพียง 7 ถึง 30 ช่อง',
          'ตัดความยาวไฟล์ให้เหลือวินาทีที่ 7 ถึง 30 เท่านั้น',
        ],
        answer: 0,
        hint: 'ตัวเลข 7. และ 30. ใน raw.filter มีหน่วยเป็น Hz (เฮิรตซ์) จ้ะ',
        explain: 'ถูกต้อง! raw.filter(7., 30.) คือการกรองแบบ Band-pass ช่วง 7–30 Hz ซึ่งครอบคลุมทั้งคลื่น Mu และ Beta สำหรับงาน Motor Imagery',
      },
      {
        q: 'ทำไมในขั้นตอนประเมินผล เราจึงนำ CSP และ LDA มัดรวมกันไว้ใน Pipeline([("CSP", csp), ("LDA", lda)]) ก่อนส่งเข้า cross_val_score?',
        choices: [
          'เพื่อให้ CSP คำนวณตัวกรองใหม่เฉพาะจากข้อมูล Training ในแต่ละรอบของการแบ่ง Cross-validation ไม่เผลอไปแอบดูข้อมูล Test',
          'เพื่อทำให้โค้ดสั้นลงอย่างเดียว แต่ผลลัพธ์เหมือนการรันแยกข้างนอกทุกประการ',
          'เพื่อเปลี่ยนข้อมูลให้เป็นไฟล์ภาพ PNG',
        ],
        answer: 0,
        hint: 'จำเรื่องการป้องกัน Data leakage ในด่านที่ 11 ได้ไหมเอ่ย?',
        explain: 'ยอดเยี่ยมมาก! การใช้ Pipeline รับประกันว่าในทุก Fold ของ Cross-validation ทั้ง CSP และ LDA จะถูก fit เฉพาะบนชุดข้อมูลฝึก (Train fold) เท่านั้น',
      },
      {
        q: 'หากคุณต้องการเชื่อมต่อสตรีมข้อมูลคลื่นสมองแบบ Real-time จากฮาร์ดแวร์ EEG เข้าสู่โปรแกรม Python พร้อมซิงค์เวลากับหน้าจอสิ่งเร้า มาตรฐานโอเพนซอร์สใดนิยมใช้มากที่สุด?',
        choices: [
          'Lab Streaming Layer (LSL)',
          'ไฟล์ตาราง Excel (.xlsx)',
          'การส่งอีเมลทีละวินาที',
        ],
        answer: 0,
        hint: 'มีตัวย่อ 3 ตัวอักษรที่ออกแบบมาเพื่องานซิงค์สัญญาณชีวภาพแบบเวลาจริงโดยเฉพาะจ้ะ',
        explain: 'ถูกต้องครับ! Lab Streaming Layer (LSL) คือมาตรฐานกลางของวงการ BCI สำหรับส่งข้อมูลเวลาจริงและเหตุการณ์ (Markers) ข้ามอุปกรณ์และภาษาโปรแกรมอย่างแม่นยำ',
      },
    ],
    quizEn: [
      {
        q: 'In MNE-Python, what does `raw.filter(7., 30., fir_design="firwin")` accomplish?',
        choices: [
          'Applies a 7–30 Hz band-pass filter that retains Mu (8–13 Hz) and Beta (13–30 Hz) rhythms while rejecting slow drift and 50/60 Hz mains hum',
          'Deletes all electrodes except channels 7 through 30',
          'Crops the recording between 7 seconds and 30 seconds',
        ],
        answer: 0,
        hint: 'The arguments 7. and 30. in raw.filter specify lower and upper cutoff frequencies in Hz!',
        explain: 'Correct! `raw.filter(7., 30.)` band-pass filters the continuous EEG to isolate sensorimotor Mu and Beta oscillations.',
      },
      {
        q: 'Why do we wrap CSP and LDA inside `Pipeline([("CSP", csp), ("LDA", lda)])` before calling `cross_val_score`?',
        choices: [
          'So CSP is fitted strictly on the training fold inside each cross-validation split, preventing test-set data leakage',
          'Only to save two lines of code, with identical mathematical behavior to fitting CSP outside',
          'To export the data as a PNG image',
        ],
        answer: 0,
        hint: 'Recall the data-leakage rule from Stage 11!',
        explain: 'Spot on! Wrapping supervised feature extractors like CSP inside a scikit-learn Pipeline ensures clean, leak-free cross-validation.',
      },
      {
        q: 'Which open-source protocol is the standard for streaming real-time EEG and time-synchronized event markers between headsets and Python?',
        choices: [
          'Lab Streaming Layer (LSL)',
          'Excel spreadsheets (.xlsx)',
          'Sending emails every second',
        ],
        answer: 0,
        hint: 'Look for the 3-letter real-time biosignal networking standard!',
        explain: 'Correct! Lab Streaming Layer (LSL) provides sub-millisecond time synchronization for real-time BCI acquisition and feedback.',
      },
    ],
    refs: [
      'Gramfort, A., et al. (2013). MEG and EEG data analysis with MNE-Python. Frontiers in Neuroscience, 7, 267.',
      'Schalk, G., McFarland, D. J., Hinterberger, T., Birbaumer, N., & Wolpaw, J. R. (2004). BCI2000: a general-purpose brain-computer interface (BCI) system. IEEE Transactions on Biomedical Engineering.',
      'Jayaram, V., & Barachant, A. (2018). MOABB: trustworthy algorithm benchmarking for BCIs. Journal of Neural Engineering.',
    ],
  },
];

export const LESSONS = RAW_LESSONS.map((l) => bilingual(l));

export const LESSON_MAP = Object.fromEntries(LESSONS.map((l) => [String(l.id), l]));

export function getLesson(idOrSlug) {
  if (!idOrSlug) return LESSONS[0];
  return (
    LESSON_MAP[String(idOrSlug)] ||
    LESSONS.find((l) => l.slug === idOrSlug) ||
    LESSONS[0]
  );
}
