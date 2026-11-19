// Lesson 3 widget: 10-20 Electrode Placement Game & Nasion-Inion Arc
import { h, seeded } from '../util.js';
import { icon } from '../ui/icons.js';
import { headTop, toSvg } from '../ui/head2d.js';
import { ELECTRODES, byName, LETTERS, OLD_NAMES } from '../data/electrodes.js';
import { t } from '../i18n.js';

const NS = 'http://www.w3.org/2000/svg';
const TOTAL_ROUNDS = 10;

// Reverse lookup: T7 -> T3, T8 -> T4, P7 -> T5, P8 -> T6
const NEW_TO_OLD = Object.fromEntries(Object.entries(OLD_NAMES).map(([oldN, newN]) => [newN, oldN]));

// Curated pool of key electrodes so 10 rounds cover all lobes, midline, odd/even, and old-name sites
const PRIORITY_POOL = ['Cz', 'C3', 'C4', 'Fz', 'Fp1', 'Fp2', 'Pz', 'O1', 'O2', 'Oz', 'T7', 'T8', 'P7', 'P8', 'F3', 'F4', 'P3', 'P4'];

const LETTERS_EN = {
  Fp: 'Frontopolar (Forehead pole)',
  F: 'Frontal lobe',
  C: 'Central sulcus — over motor/sensory cortex',
  T: 'Temporal lobe',
  P: 'Parietal lobe',
  O: 'Occipital lobe (Back of head)',
};

const NOTES_EN = {
  Fpz: 'Forehead midline reference; very close to the eyes, showing strong blink artifacts',
  Fp1: 'Left forehead — captures eye-blink (EOG) artifacts',
  Fp2: 'Right forehead — captures eye-blink (EOG) artifacts',
  F7: "Near left Broca's area — related to speech production",
  F3: 'Left frontal — used for attention & working memory studies',
  Fz: 'Frontal midline — prominent theta rhythm during focused mental tasks',
  F4: 'Right frontal lobe',
  F8: 'Right lateral frontal near the temple',
  T7: 'Left temporal (old name T3) — near auditory cortex',
  C3: 'Over left motor cortex → controls RIGHT hand; core site for Motor Imagery BCI',
  Cz: 'Vertex (top center of head) — leg/foot motor cortex and P300 visible here',
  C4: 'Over right motor cortex → controls LEFT hand; core site for Motor Imagery BCI',
  T8: 'Right temporal (old name T4)',
  P7: "Left parieto-temporal (old name T5) near Wernicke's area",
  P3: 'Left parietal — P300 visible here',
  Pz: 'Parietal midline — where the P300 wave is strongest',
  P4: 'Right parietal — P300 visible here',
  P8: 'Right parieto-temporal (old name T6)',
  O1: 'Left occipital — visual cortex; key for SSVEP and eyes-closed Alpha',
  Oz: 'Midline occipital — strongest SSVEP visual response',
  O2: 'Right occipital — visual cortex; key for SSVEP',
};

function prefixOf(name) {
  return name.startsWith('Fp') ? 'Fp' : name[0];
}

function explainCode(name) {
  const e = byName[name];
  const pfx = prefixOf(name);
  const letterInfo = LETTERS[pfx];
  const last = name[name.length - 1];
  let sideRule = '';
  if (last === 'z') {
    sideRule = t(
      'ลงท้ายด้วย z (Zero) = อยู่บนเส้นกึ่งกลางศีรษะ (Midline)',
      'Ends with z (Zero) = Located on the midline of the head'
    );
  } else if (Number(last) % 2 === 1) {
    sideRule = t(
      `เลขคี่ (${last}) = ซีกซ้าย (Left hemisphere)${Number(last) >= 7 ? ' ด้านนอกใกล้ขมับ' : ' ด้านในใกล้แนวกลาง'}`,
      `Odd number (${last}) = Left hemisphere${Number(last) >= 7 ? ' (lateral, near temple)' : ' (medial, closer to midline)'}`
    );
  } else {
    sideRule = t(
      `เลขคู่ (${last}) = ซีกขวา (Right hemisphere)${Number(last) >= 7 ? ' ด้านนอกใกล้ขมับ' : ' ด้านในใกล้แนวกลาง'}`,
      `Even number (${last}) = Right hemisphere${Number(last) >= 7 ? ' (lateral, near temple)' : ' (medial, closer to midline)'}`
    );
  }
  const oldTag = NEW_TO_OLD[name]
    ? t(` [ชื่อเก่า: ${NEW_TO_OLD[name]}]`, ` [Old name: ${NEW_TO_OLD[name]}]`)
    : '';
  const letterText = letterInfo ? t(letterInfo.th, letterInfo.en || LETTERS_EN[pfx]) : '';
  const noteText = e ? t(e.note, e.noteEn || NOTES_EN[name]) : '';
  return {
    title: `${name}${oldTag}`,
    letterLine: `${pfx} = ${letterText}`,
    sideLine: sideRule,
    noteLine: noteText,
  };
}

export default function mount(root, ctx) {
  root.innerHTML = '';

  let seedCounter = 101;
  let deck = [];
  let roundIdx = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let showHint = false;
  let gameEnded = false;

  function buildDeck() {
    const rng = seeded(seedCounter++);
    const arr = [...PRIORITY_POOL];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, TOTAL_ROUNDS);
  }

  // --- Head 2D SVG (labels: false) ---
  const head = headTop({
    size: 270,
    labels: false,
    onPick: (pickedName) => handlePick(pickedName),
  });

  // Add subtle Left / Right orientation badges inside the SVG
  const mkSvgText = (x, y, txt) => {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-family', 'Anuphan, sans-serif');
    t.setAttribute('font-size', '9.5');
    t.setAttribute('font-weight', '700');
    t.setAttribute('fill', '#7A8197');
    t.textContent = txt;
    return t;
  };
  head.svg.append(
    mkSvgText(22, 20, t('ซ้าย (คี่)', 'Left (Odd)')),
    mkSvgText(238, 20, t('ขวา (คู่)', 'Right (Even)')),
    mkSvgText(130, 265, t('ท้ายทอย (Inion)', 'Back (Inion)'))
  );

  // Group for dynamic labels revealed as user plays
  const revealedLayer = document.createElementNS(NS, 'g');
  revealedLayer.setAttribute('pointer-events', 'none');
  head.svg.append(revealedLayer);

  function addDotLabel(name, color = '#1F2A44') {
    const e = byName[name];
    if (!e) return;
    const [x, y] = toSvg(e.xy, head.R, head.cx, head.cy);
    const existing = revealedLayer.querySelector(`[data-lbl="${name}"]`);
    if (existing) existing.remove();
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('data-lbl', name);
    t.setAttribute('x', x);
    t.setAttribute('y', y + 3.2);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-family', 'JetBrains Mono, monospace');
    t.setAttribute('font-size', '7.5');
    t.setAttribute('font-weight', '700');
    t.setAttribute('fill', color);
    t.textContent = name;
    revealedLayer.append(t);
  }

  function resetHeadColors() {
    revealedLayer.innerHTML = '';
    for (const [, c] of head.dots) {
      c.setAttribute('fill', '#FFFDF9');
      c.setAttribute('r', '9');
    }
  }

  // --- Top Stats & Target Banner ---
  const roundChip = h('span', { class: 'chip' }, t('รอบที่ 1 / 10', 'Round 1 / 10'));
  const scoreChip = h('span', { class: 'wa-metric teal' }, t('คะแนน: ', 'Score: '), h('b', {}, '0 / 10'));
  const streakChip = h('span', { class: 'wa-metric' }, h('span', { html: icon('flame') }), t('ต่อเนื่อง: ', 'Streak: '), h('b', {}, '0'));

  const targetCodeEl = h('span', { class: 'eg-target-code' }, 'C3');
  const targetSubEl = h('div', { class: 'small muted' }, t('คลิกตำแหน่งบนศีรษะที่ตรงกับรหัสนี้', 'Click the matching position on the head diagram'));

  const hintBtn = h('button', {
    type: 'button',
    class: 'btn sm',
    'aria-pressed': 'false',
    onclick: () => {
      showHint = !showHint;
      hintBtn.setAttribute('aria-pressed', String(showHint));
      hintPanel.style.display = showHint ? 'grid' : 'none';
    },
  }, h('span', { html: icon('bulb') }), t('ดูโพยรหัส (Hint)', 'Code Cheat Sheet (Hint)'));

  const restartBtn = h('button', {
    type: 'button',
    class: 'btn sm ghost',
    onclick: () => startNewGame(),
  }, h('span', { html: icon('reset') }), t('เริ่มใหม่', 'Restart'));

  const targetBanner = h('div', { class: 'eg-target-banner' },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } },
      h('span', { style: { fontFamily: 'var(--f-head)', fontWeight: 700 } }, t('เป้าหมาย:', 'Target:')),
      targetCodeEl,
      targetSubEl
    ),
    h('div', { class: 'widget-row' }, hintBtn, restartBtn)
  );

  // --- Hint Legend (LETTERS + Odd/Even/z + Old names) ---
  const hintPanel = h('div', { class: 'wa-panel', style: { display: 'none', gap: '10px' } },
    h('div', { class: 'eg-hint-grid' },
      ...Object.entries(LETTERS).map(([k, v]) =>
        h('div', { class: 'eg-hint-item' }, h('b', {}, k), h('span', {}, t(v.th, v.en || LETTERS_EN[k])))
      )
    ),
    h('div', { class: 'readout small' },
      h('b', {}, t('กฎตัวเลข: ', 'Number Rules: ')),
      t(
        'เลขคี่ (1, 3, 7) = ซีกซ้าย | เลขคู่ (2, 4, 8) = ซีกขวา | z (Zero) = แนวกลางศีรษะ | เลขน้อยอยู่ใกล้แนวกลาง เลขมากอยู่ด้านข้าง ',
        'Odd (1, 3, 7) = Left | Even (2, 4, 8) = Right | z (Zero) = Midline | Smaller numbers are closer to midline, larger numbers are lateral '
      ),
      h('br'),
      h('b', {}, t('ชื่อเก่า → ชื่อปัจจุบัน: ', 'Old Name → Modern Name: ')),
      Object.entries(OLD_NAMES).map(([o, n]) => `${o} = ${n}`).join(', ')
    )
  );

  // --- Feedback Area ---
  const feedbackBox = h('div', { class: 'eg-feedback' },
    h('strong', {}, t('วิธีเล่น: ', 'How to play: ')),
    t(
      'ดูชื่อจุดเป้าหมายด้านบน แล้วคลิกวงกลมบนแผนภาพศีรษะ (จมูกอยู่ด้านบน ซ้ายมือคือเลขคี่ ขวามือคือเลขคู่)',
      'Check the target code above and click the matching circle on the head map (nose is at the top; left is odd, right is even)'
    )
  );

  // --- End Screen Container ---
  const endBox = h('div', { class: 'eg-end-card', style: { display: 'none' } });

  // --- Side-view SVG of Nasion -> Inion 10-20-20-20-20-10% arc ---
  const oldNamesString = Object.entries(OLD_NAMES).map(([o, n]) => `${o}=${n}`).join(' · ');
  const arcBox = h('div', { class: 'eg-arc-box' },
    h('div', { class: 'wa-head', style: { marginBottom: '6px' } },
      h('h4', { class: 'wa-title' }, h('span', { html: icon('cap') }), t('ทำไมถึงเรียกระบบ 10-20? (มองจากด้านข้าง Nasion → Inion)', 'Why is it called the 10-20 System? (Side view: Nasion → Inion)')),
      h('span', { class: 'chip' }, `${t('ชื่อเก่า', 'Old names')}: ${oldNamesString}`)
    ),
    h('div', {
      html: `
      <svg class="eg-arc-svg" viewBox="0 0 520 155" role="img" aria-label="${t('ภาพด้านข้างศีรษะแสดงสัดส่วน 10-20-20-20-20-10 เปอร์เซ็นต์ จากดั้งจมูก Nasion ไปยังปุ่มท้ายทอย Inion', 'Side profile of head showing 10-20-20-20-20-10 percent divisions from Nasion to Inion')}">
        <!-- Head side profile -->
        <path d="M105 128 L82 112 L102 96 C104 42 162 18 255 18 C348 18 408 46 412 104 C414 116 404 128 394 134"
              fill="#FFF4EC" stroke="#1F2A44" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Ear side profile -->
        <ellipse cx="255" cy="112" rx="12" ry="18" fill="#FFE1D8" stroke="#1F2A44" stroke-width="2"/>

        <!-- Dashed 10-20 measurement arc outside scalp -->
        <path d="M102 96 C104 34 162 10 255 10 C348 10 408 38 412 104"
              fill="none" stroke="#FF6B4A" stroke-width="2.2" stroke-dasharray="5 4"/>

        <!-- Landmark dots: Nasion & Inion -->
        <circle cx="102" cy="96" r="5" fill="#1F2A44"/>
        <text x="86" y="88" text-anchor="end" font-family="Anuphan, sans-serif" font-size="11" font-weight="700" fill="#1F2A44">${t('Nasion (ดั้งจมูก)', 'Nasion (Nose bridge)')}</text>

        <circle cx="412" cy="104" r="5" fill="#1F2A44"/>
        <text x="424" y="102" text-anchor="start" font-family="Anuphan, sans-serif" font-size="11" font-weight="700" fill="#1F2A44">${t('Inion (ท้ายทอย)', 'Inion (Back bump)')}</text>

        <!-- Midline Electrodes along the arc: Fpz, Fz, Cz, Pz, Oz -->
        <g stroke="#1F2A44" stroke-width="2" fill="#FCEFC8">
          <circle cx="116" cy="64" r="9"/>
          <circle cx="172" cy="30" r="9"/>
          <circle cx="255" cy="18" r="9" fill="#D3F0EC"/>
          <circle cx="338" cy="30" r="9"/>
          <circle cx="396" cy="66" r="9"/>
        </g>
        <g font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="700" fill="#1F2A44" text-anchor="middle">
          <text x="116" y="67">Fpz</text>
          <text x="172" y="33">Fz</text>
          <text x="255" y="21">Cz</text>
          <text x="338" y="33">Pz</text>
          <text x="396" y="69">Oz</text>
        </g>

        <!-- Percentage interval labels: 10% - 20% - 20% - 20% - 20% - 10% -->
        <g font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#FF6B4A" text-anchor="middle">
          <text x="86" y="76">10%</text>
          <text x="136" y="34">20%</text>
          <text x="212" y="13">20%</text>
          <text x="298" y="13">20%</text>
          <text x="378" y="36">20%</text>
          <text x="428" y="84">10%</text>
        </g>
      </svg>
      `,
    }),
    h('p', { class: 'small muted', style: { margin: '4px 0 0', textAlign: 'center' } },
      t(
        'แบ่งส่วนโค้งจากดั้งจมูก (Nasion) ถึงท้ายทอย (Inion) เป็นระยะ 10% และ 20% เพื่อให้วางตำแหน่งตรงกันในทุกคนไม่ว่าศีรษะเล็กหรือใหญ่',
        'Divides the arc from Nasion (nose bridge) to Inion (occipital bump) into 10% and 20% intervals so placements scale consistently across any head size.'
      )
    )
  );

  // --- Assemble Layout ---
  root.append(
    h('div', { class: 'wa-stack' },
      h('div', { class: 'wa-head', style: { marginBottom: 0 } },
        h('div', { class: 'wa-metrics' }, roundChip, scoreChip, streakChip)
      ),
      targetBanner,
      hintPanel,
      h('div', { class: 'eg-layout' },
        h('div', { class: 'eg-head-box' },
          h('div', { class: 'small muted', style: { fontWeight: 600 } }, t('ด้านหน้า (จมูก / Nasion)', 'Front (Nose / Nasion)')),
          head.svg
        ),
        h('div', { class: 'wa-stack' },
          feedbackBox,
          endBox,
          arcBox
        )
      )
    )
  );

  function updateHeaderUI() {
    const currentTarget = deck[roundIdx];
    roundChip.textContent = gameEnded
      ? t(`จบเกม 10 รอบ`, `Game Over (10 Rounds)`)
      : t(`รอบที่ ${roundIdx + 1} / ${TOTAL_ROUNDS}`, `Round ${roundIdx + 1} / ${TOTAL_ROUNDS}`);
    scoreChip.querySelector('b').textContent = `${score} / ${TOTAL_ROUNDS}`;
    streakChip.querySelector('b').textContent = String(streak);

    if (!gameEnded && currentTarget) {
      const oldAlias = NEW_TO_OLD[currentTarget];
      targetCodeEl.textContent = currentTarget;
      targetSubEl.textContent = oldAlias
        ? t(`คลิกหา ${currentTarget} บนศีรษะ (ชื่อเก่าในระบบ 10-20 คือ ${oldAlias})`, `Click ${currentTarget} on the head (Classic 10-20 name: ${oldAlias})`)
        : t(`คลิกตำแหน่งของ ${currentTarget} บนแผนภาพศีรษะ`, `Click the position of ${currentTarget} on the head map`);
    }
  }

  function handlePick(pickedName) {
    if (gameEnded) return;
    const targetName = deck[roundIdx];
    const isCorrect = pickedName === targetName;

    // Clear previous transient wrong highlights while keeping revealed correct ones
    for (const [name, c] of head.dots) {
      if (c.getAttribute('data-locked') !== '1') {
        c.setAttribute('fill', '#FFFDF9');
        c.setAttribute('r', '9');
      } else {
        c.setAttribute('fill', '#D3F0EC');
        c.setAttribute('r', '9');
      }
    }

    const targetDot = head.dots.get(targetName);
    const pickedDot = head.dots.get(pickedName);
    const info = explainCode(targetName);

    if (isCorrect) {
      score++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      if (targetDot) {
        targetDot.setAttribute('fill', '#1FA39A');
        targetDot.setAttribute('r', '10.5');
        targetDot.setAttribute('data-locked', '1');
      }
      addDotLabel(targetName, '#1F2A44');

      feedbackBox.className = 'eg-feedback good';
      feedbackBox.innerHTML = `
        <div style="font-weight:700; margin-bottom:4px;">${t('ถูกต้อง!', 'Correct!')} ${info.title}</div>
        <div>• <b>${t('ตัวอักษร:', 'Letter:')}</b> ${info.letterLine}</div>
        <div>• <b>${t('ตำแหน่งซ้าย/ขวา:', 'Left/Right rule:')}</b> ${info.sideLine}</div>
        <div class="small muted" style="margin-top:4px;">${t('ความสำคัญ:', 'BCI Role:')} ${info.noteLine}</div>
      `;

      ctx?.say?.(
        t(
          `แม่นมาก! <b>${info.title}</b> — ${info.letterLine} และ ${info.sideLine}`,
          `Spot on! <b>${info.title}</b> — ${info.letterLine} & ${info.sideLine}`
        ),
        'happy'
      );
    } else {
      streak = 0;
      if (pickedDot) {
        pickedDot.setAttribute('fill', '#FF6B4A');
      }
      if (targetDot) {
        targetDot.setAttribute('fill', '#F2B632');
        targetDot.setAttribute('r', '10.5');
        targetDot.setAttribute('data-locked', '1');
      }
      addDotLabel(targetName, '#1F2A44');

      const pickedInfo = explainCode(pickedName);
      feedbackBox.className = 'eg-feedback bad';
      feedbackBox.innerHTML = `
        <div style="font-weight:700; margin-bottom:4px;">${t(`คุณคลิก ${pickedInfo.title} — แต่เป้าหมายคือ <b>${info.title}</b> (วงกลมสีเหลือง)`, `You clicked ${pickedInfo.title} — target was <b>${info.title}</b> (yellow circle)`)}</div>
        <div>• <b>${t(`ตัวอักษรของ ${targetName}:`, `Letter of ${targetName}:`)}</b> ${info.letterLine}</div>
        <div>• <b>${t('ตำแหน่งซ้าย/ขวา:', 'Left/Right rule:')}</b> ${info.sideLine}</div>
        <div class="small muted" style="margin-top:4px;">${t('ความสำคัญ:', 'BCI Role:')} ${info.noteLine}</div>
      `;

      ctx?.say?.(
        t(
          `เกือบถูกแล้ว! จุดที่คุณกดคือ <b>${pickedName}</b> ส่วน <b>${targetName}</b> ต้องจำว่า <b>${info.letterLine}</b> และ <b>${info.sideLine}</b> นะ`,
          `Close! You clicked <b>${pickedName}</b>. Remember for <b>${targetName}</b>: <b>${info.letterLine}</b> and <b>${info.sideLine}</b>.`
        ),
        'oops'
      );
    }

    if (score >= 8) {
      ctx?.discover?.(
        'electrode-10-20',
        t(
          `สุดยอดนักวางอิเล็กโทรด! คุณทำคะแนนได้ <b>${score}/${TOTAL_ROUNDS}</b> เข้าใจรหัสตัวอักษรสมอง (Fp, F, C, T, P, O) และกฎเลขคี่=ซ้าย เลขคู่=ขวา z=กึ่งกลาง อย่างถ่องแท้!`,
          `Master Electrode Placer! You scored <b>${score}/${TOTAL_ROUNDS}</b> and mastered the lobe letters (Fp, F, C, T, P, O) and the odd=left, even=right, z=midline coordinates!`
        )
      );
    }

    roundIdx++;
    if (roundIdx >= TOTAL_ROUNDS) {
      finishGame();
    } else {
      updateHeaderUI();
    }
  }

  function finishGame() {
    gameEnded = true;
    updateHeaderUI();
    endBox.style.display = 'block';
    endBox.innerHTML = '';

    const passed = score >= 8;
    endBox.append(
      h('h3', { style: { marginBottom: '6px' } },
        passed
          ? t(`ยอดเยี่ยม! คุณได้ ${score} / ${TOTAL_ROUNDS} คะแนน`, `Excellent! You scored ${score} / ${TOTAL_ROUNDS}`)
          : t(`จบเกม! คุณได้ ${score} / ${TOTAL_ROUNDS} คะแนน`, `Game Over! You scored ${score} / ${TOTAL_ROUNDS}`)
      ),
      h('p', { class: 'small', style: { marginBottom: '12px' } },
        t(
          `สถิติตอบถูกต่อเนื่องสูงสุด: ${bestStreak} รอบ · ${
            passed
              ? 'คุณอ่านพิกัดระบบ 10-20 ได้คล่องเหมือนนักวิจัย BCI มืออาชีพ!'
              : 'ลองเปิด "ดูโพยรหัส (Hint)" แล้วเล่นอีกรอบเพื่อทำคะแนนให้ถึง 8/10 กันเถอะ!'
          }`,
          `Best streak: ${bestStreak} in a row · ${
            passed
              ? 'You read 10-20 coordinates like a pro BCI researcher!'
              : 'Try opening the "Code Cheat Sheet (Hint)" and play again to reach 8/10!'
          }`
        )
      ),
      h('button', {
        type: 'button',
        class: 'btn primary',
        onclick: () => startNewGame(),
      }, h('span', { html: icon('reset') }), t('เล่นอีกครั้ง (10 รอบใหม่)', 'Play Again (10 New Rounds)'))
    );
  }

  function startNewGame() {
    deck = buildDeck();
    roundIdx = 0;
    score = 0;
    streak = 0;
    bestStreak = 0;
    gameEnded = false;
    endBox.style.display = 'none';
    resetHeadColors();
    feedbackBox.className = 'eg-feedback';
    feedbackBox.innerHTML = t(
      '<b>เริ่มรอบใหม่!</b> คลิกตำแหน่งอิเล็กโทรดบนแผนภาพศีรษะให้ตรงกับรหัสเป้าหมาย (จำง่ายๆ: <b>คี่ = ซ้าย</b>, <b>คู่ = ขวา</b>, <b>z = แนวกลาง</b>)',
      '<b>New game started!</b> Click the electrode site matching the target code (Remember: <b>Odd = Left</b>, <b>Even = Right</b>, <b>z = Midline</b>)'
    );
    updateHeaderUI();
  }

  startNewGame();

  ctx?.say?.(
    t(
      'มาทายตำแหน่งอิเล็กโทรด <b>ระบบ 10-20</b> กัน! จำเคล็ดลับง่ายๆ: <b>อักษรบอกกลีบสมอง</b> ส่วนตัวเลข <b>คี่อยู่ซ้าย คู่อยู่ขวา ตัว z อยู่ตรงกลาง</b> คลิกจุดบนศีรษะได้เลย!',
      "Let's play the <b>10-20 System</b> placement game! Quick tip: <b>Letters indicate the brain lobe</b>, <b>odd numbers are Left, even are Right, and z is Midline</b>. Click a dot on the head!"
    ),
    'idle'
  );

  return () => {};
}
