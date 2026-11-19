// International 10-20 system electrode layout (Bilingual TH/EN).
import { bilingual } from '../i18n.js';

const D = Math.PI / 180;

/** theta = angle from vertex (Cz), phi = azimuth from nose, positive toward LEFT */
function sph(theta, phi) {
  const t = theta * D, p = phi * D;
  return [-Math.sin(t) * Math.sin(p), Math.cos(t), Math.sin(t) * Math.cos(p)];
}
function mid(a, b) {
  const v = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
}

const base = {
  Fpz: sph(72, 0), Fz: sph(36, 0), Cz: sph(0, 0), Pz: sph(36, 180), Oz: sph(72, 180),
  Fp1: sph(72, 18), F7: sph(72, 54), T7: sph(72, 90), P7: sph(72, 126), O1: sph(72, 162),
  Fp2: sph(72, -18), F8: sph(72, -54), T8: sph(72, -90), P8: sph(72, -126), O2: sph(72, -162),
};
base.F3 = mid(base.Fz, base.F7); base.F4 = mid(base.Fz, base.F8);
base.C3 = mid(base.Cz, base.T7); base.C4 = mid(base.Cz, base.T8);
base.P3 = mid(base.Pz, base.P7); base.P4 = mid(base.Pz, base.P8);

/** Letter → meaning (Thai & English) */
export const LETTERS = {
  Fp: bilingual({ th: 'ขั้วหน้าผาก (Frontopolar)', en: 'Frontopolar (Forehead)', region: 'frontal' }),
  F: bilingual({ th: 'สมองส่วนหน้า (Frontal)', en: 'Frontal Lobe', region: 'frontal' }),
  C: bilingual({ th: 'แนวกลางศีรษะ (Central) — เหนือ motor/sensory cortex', en: 'Central — over motor/sensory cortex', region: 'motor' }),
  T: bilingual({ th: 'ขมับ (Temporal)', en: 'Temporal Lobe', region: 'temporal' }),
  P: bilingual({ th: 'สมองส่วนข้าง (Parietal)', en: 'Parietal Lobe', region: 'parietal' }),
  O: bilingual({ th: 'ท้ายทอย (Occipital)', en: 'Occipital Lobe (Back of head)', region: 'occipital' }),
};

/** Electrode metadata: which cortex lies underneath and why BCI people care. */
const META = {
  Fpz: { region: 'frontal', note: 'จุดอ้างอิงบนหน้าผาก ใกล้ตามาก จึงเห็นสัญญาณกะพริบตาชัดที่สุด', noteEn: 'Forehead midline reference; very close to the eyes, showing eye-blink (EOG) artifacts most clearly.' },
  Fp1: { region: 'frontal', note: 'หน้าผากซ้าย — ใช้ตรวจจับการกะพริบตา (EOG artifact)', noteEn: 'Left forehead — primarily picks up prefrontal activity and eye-blink (EOG) artifacts.' },
  Fp2: { region: 'frontal', note: 'หน้าผากขวา — ใช้ตรวจจับการกะพริบตา (EOG artifact)', noteEn: 'Right forehead — primarily picks up prefrontal activity and eye-blink (EOG) artifacts.' },
  F7: { region: 'broca', note: 'ใกล้ Broca\'s area (ฝั่งซ้าย) — สัมพันธ์กับการพูด', noteEn: 'Near Broca\'s area (left hemisphere) — associated with speech production.' },
  F3: { region: 'frontal', note: 'Frontal ซ้าย — ใช้ดูสมาธิ/ความจำใช้งาน (working memory)', noteEn: 'Left frontal — used for attention, working memory, and frontal alpha asymmetry.' },
  Fz: { region: 'frontal', note: 'แนวกลางด้านหน้า — คลื่น theta ช่วงตั้งใจคิดเด่นที่นี่', noteEn: 'Frontal midline — Frontal Midline Theta (FMT) peaks here during focused mental effort.' },
  F4: { region: 'frontal', note: 'Frontal ขวา', noteEn: 'Right frontal cortex.' },
  F8: { region: 'frontal', note: 'Frontal ขวา ด้านข้างใกล้ขมับ', noteEn: 'Right lateral frontal cortex near the temple.' },
  T7: { region: 'temporal', note: 'ขมับซ้าย (ชื่อเก่า T3) — ใกล้ auditory cortex', noteEn: 'Left temporal (formerly T3) — near the auditory cortex.' },
  C3: { region: 'motor', note: 'เหนือ motor cortex ซีกซ้าย → ควบคุมมือขวา หัวใจของ Motor Imagery', noteEn: 'Over left primary motor cortex → controls RIGHT hand movement; core channel for Motor Imagery BCI.' },
  Cz: { region: 'motor', note: 'จุดยอดศีรษะ — motor cortex ส่วนขา/เท้า และ P300 ก็เห็นได้', noteEn: 'Vertex (top center of head) — covers foot/leg motor cortex and strong P300/ERP waves.' },
  C4: { region: 'motor', note: 'เหนือ motor cortex ซีกขวา → ควบคุมมือซ้าย หัวใจของ Motor Imagery', noteEn: 'Over right primary motor cortex → controls LEFT hand movement; core channel for Motor Imagery BCI.' },
  T8: { region: 'temporal', note: 'ขมับขวา (ชื่อเก่า T4)', noteEn: 'Right temporal (formerly T4) — near right auditory cortex.' },
  P7: { region: 'wernicke', note: 'Parietal-temporal ซ้าย (ชื่อเก่า T5) ใกล้ Wernicke\'s area', noteEn: 'Left posterior temporal/parietal (formerly T5) — near Wernicke\'s language comprehension area.' },
  P3: { region: 'parietal', note: 'Parietal ซ้าย — P300 เห็นได้', noteEn: 'Left parietal — captures sensory integration and P300 ERPs.' },
  Pz: { region: 'parietal', note: 'แนวกลางด้านหลัง — จุดที่ P300 เด่นที่สุด', noteEn: 'Parietal midline — the primary site where the P300 ERP wave reaches maximum amplitude.' },
  P4: { region: 'parietal', note: 'Parietal ขวา — P300 เห็นได้', noteEn: 'Right parietal — captures spatial attention and P300 ERPs.' },
  P8: { region: 'parietal', note: 'Parietal-temporal ขวา (ชื่อเก่า T6)', noteEn: 'Right posterior temporal/parietal (formerly T6).' },
  O1: { region: 'visual', note: 'ท้ายทอยซ้าย — visual cortex ใช้ใน SSVEP และเห็น alpha ตอนหลับตา', noteEn: 'Left occipital — over visual cortex; essential for SSVEP and eyes-closed Alpha waves.' },
  Oz: { region: 'visual', note: 'ท้ายทอยกลาง — สัญญาณ SSVEP แรงที่สุด', noteEn: 'Occipital midline — directly over primary visual cortex (V1); strongest SSVEP signal.' },
  O2: { region: 'visual', note: 'ท้ายทอยขวา — visual cortex ใช้ใน SSVEP', noteEn: 'Right occipital — over visual cortex; essential for SSVEP and eyes-closed Alpha waves.' },
};

function prefix(name) { return name.startsWith('Fp') ? 'Fp' : name[0]; }

function side(name) {
  const last = name[name.length - 1];
  if (last === 'z') return bilingual({ key: 'mid', th: 'แนวกลาง (z = zero)', en: 'Midline (z = zero)' });
  return Number(last) % 2
    ? bilingual({ key: 'left', th: 'ซีกซ้าย (เลขคี่)', en: 'Left hemisphere (odd number)' })
    : bilingual({ key: 'right', th: 'ซีกขวา (เลขคู่)', en: 'Right hemisphere (even number)' });
}

export const ELECTRODES = Object.entries(base).map(([name, p]) => {
  const theta = Math.acos(Math.max(-1, Math.min(1, p[1])));
  const r = theta / (Math.PI / 2);
  const az = Math.atan2(p[0], p[2]);
  return bilingual({
    name,
    pos: p,
    xy: [r * Math.sin(az), r * Math.cos(az)],
    region: META[name].region,
    note: META[name].note,
    noteEn: META[name].noteEn,
    letter: LETTERS[prefix(name)],
    side: side(name),
  });
});

export const byName = Object.fromEntries(ELECTRODES.map((e) => [e.name, e]));

/** Old (10-20 classic) → new (10-10 naming) */
export const OLD_NAMES = { T3: 'T7', T4: 'T8', T5: 'P7', T6: 'P8' };
