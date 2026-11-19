// Lesson 10 widget: Motor Imagery — Contralateral ERD (C3 vs C4), live topomap, Scope, mu/beta power bars, and cursor target mini-game.
import { h, clamp, lerp, loop } from '../util.js';
import { icon } from '../ui/icons.js';
import { headTop, paintTopomap } from '../ui/head2d.js';
import { EEGSynth } from '../signal/dsp.js';
import { Scope } from '../signal/plot.js';
import { t } from '../i18n.js';

export default function mount(root, ctx) {
  root.innerHTML = '';

  const fs = 250;
  let state = 'rest'; // 'left' | 'rest' | 'right'
  let c3Mu = 100, c4Mu = 100; // % baseline power
  let c3Beta = 100, c4Beta = 100;

  // Mini-game state: move cursor (-100..+100) to hit highlighted side target ('left' or 'right')
  let ballX = 0; // -100 (left goal) .. +100 (right goal)
  let targetSide = 'left';
  let hits = 0;
  let holdTime = 0;
  let discoveredContra = false;

  const synthC3 = new EEGSynth({
    fs,
    amps: { delta: 4, theta: 4, alpha: 24, beta: 12, gamma: 1.5 },
    noise: 2.2,
    seed: 303,
  });
  const synthC4 = new EEGSynth({
    fs,
    amps: { delta: 4, theta: 4, alpha: 24, beta: 12, gamma: 1.5 },
    noise: 2.2,
    seed: 404,
  });

  // 1) State control buttons (Left Hand / Rest / Right Hand) + keyboard <- / ->
  const btnLeft = h(
    'button',
    {
      class: 'btn mi-btn-left',
      onclick: () => setImagery('left'),
    },
    h('span', { html: icon('hand') }),
    t('จินตนาการกำมือซ้าย', 'Imagine Left Hand'),
    h('kbd', { class: 'kbd' }, '←')
  );

  const btnRest = h(
    'button',
    {
      class: 'btn mi-btn-rest',
      onclick: () => setImagery('rest'),
    },
    h('span', { html: icon('pause') }),
    t('พัก (Baseline)', 'Rest (Baseline)'),
    h('kbd', { class: 'kbd' }, 'Space')
  );

  const btnRight = h(
    'button',
    {
      class: 'btn mi-btn-right',
      onclick: () => setImagery('right'),
    },
    h('span', { html: icon('hand') }),
    t('จินตนาการกำมือขวา', 'Imagine Right Hand'),
    h('kbd', { class: 'kbd' }, '→')
  );

  const contraBanner = h('div', { class: 'mi-contra-banner' });

  function updateContraBanner() {
    if (state === 'left') {
      contraBanner.innerHTML = t(
        `
        <span class="chip" style="background:var(--teal-soft)">ไขว้ฝั่ง (Contralateral)</span>
        <span><b>จินตนาการกำมือซ้าย</b> → คลื่น Mu (8–13 Hz) และ Beta ลดฮวบ (<b>ERD สีเขียวอมฟ้า</b>) ที่ขั้ว <b>C4 (สมองซีกขวา)</b></span>
      `,
        `
        <span class="chip" style="background:var(--teal-soft)">Contralateral</span>
        <span><b>Imagine Left Hand</b> → Mu (8–13 Hz) & Beta power drop sharply (<b>teal ERD</b>) at <b>C4 (right hemisphere)</b></span>
      `
      );
    } else if (state === 'right') {
      contraBanner.innerHTML = t(
        `
        <span class="chip" style="background:var(--teal-soft)">ไขว้ฝั่ง (Contralateral)</span>
        <span><b>จินตนาการกำมือขวา</b> → คลื่น Mu (8–13 Hz) และ Beta ลดฮวบ (<b>ERD สีเขียวอมฟ้า</b>) ที่ขั้ว <b>C3 (สมองซีกซ้าย)</b></span>
      `,
        `
        <span class="chip" style="background:var(--teal-soft)">Contralateral</span>
        <span><b>Imagine Right Hand</b> → Mu (8–13 Hz) & Beta power drop sharply (<b>teal ERD</b>) at <b>C3 (left hemisphere)</b></span>
      `
      );
    } else {
      contraBanner.innerHTML = t(
        `
        <span class="chip">สภาวะพัก (Idle Mu Rhythm)</span>
        <span>เมื่อไม่ได้ขยับหรือคิดสั่งการ ขั้ว <b>C3 (ซ้าย)</b> และ <b>C4 (ขวา)</b> จะมีคลื่น Mu สูงเท่าๆ กัน (~100%)</span>
      `,
        `
        <span class="chip">Idle State (Idle Mu Rhythm)</span>
        <span>At rest without motor imagery, both <b>C3 (left)</b> and <b>C4 (right)</b> maintain high, balanced Mu power (~100%)</span>
      `
      );
    }
  }

  // 2) Topomap Head (C3 & C4 highlighted)
  const head = headTop({
    size: 220,
    labels: true,
    only: ['Fp1', 'Fp2', 'F3', 'Fz', 'F4', 'C3', 'Cz', 'C4', 'P3', 'Pz', 'P4', 'O1', 'O2'],
  });
  for (const name of ['C3', 'C4']) {
    const dot = head.dots.get(name);
    if (dot) {
      dot.setAttribute('r', '12');
      dot.setAttribute('stroke-width', '3');
    }
  }

  function renderTopo() {
    const c3Drop = (c3Mu - 100) / 70; // negative when ERD drop
    const c4Drop = (c4Mu - 100) / 70;
    paintTopomap(
      head,
      {
        C3: clamp(c3Drop, -1, 1),
        C4: clamp(c4Drop, -1, 1),
        Cz: 0,
        F3: clamp(c3Drop * 0.35, -1, 1),
        F4: clamp(c4Drop * 0.35, -1, 1),
        P3: clamp(c3Drop * 0.35, -1, 1),
        P4: clamp(c4Drop * 0.35, -1, 1),
        Fz: 0,
        Pz: 0,
        O1: 0.05,
        O2: 0.05,
      },
      { res: 38 }
    );
  }

  // 3) Power Bars for C3 (Left Hemisphere) vs C4 (Right Hemisphere)
  const c3MuBar = h('div', { class: 'mi-bar-fill' });
  const c3BetaBar = h('div', { class: 'mi-bar-fill beta' });
  const c4MuBar = h('div', { class: 'mi-bar-fill' });
  const c4BetaBar = h('div', { class: 'mi-bar-fill beta' });
  const c3ValTxt = h('span', { class: 'mono small' }, '100%');
  const c4ValTxt = h('span', { class: 'mono small' }, '100%');

  const powerPanel = h(
    'div',
    { class: 'mi-power-card card flat' },
    h('h4', {}, t('พลังงานคลื่น Mu (8–13 Hz) & Beta (13–30 Hz)', 'Mu (8–13 Hz) & Beta (13–30 Hz) Band Power')),
    h(
      'div',
      { class: 'mi-hemi-grid' },
      h(
        'div',
        { class: 'mi-hemi-box' },
        h(
          'div',
          { class: 'mi-hemi-title' },
          h('strong', {}, t('ขั้ว C3 (สมองซีกซ้าย)', 'C3 (Left Hemisphere)')),
          c3ValTxt
        ),
        h('span', { class: 'small muted' }, t('ควบคุม: มือขวา', 'Controls: Right Hand')),
        h('div', { class: 'mi-bar-label small' }, 'Mu (8–13 Hz)'),
        h('div', { class: 'mi-bar-track' }, c3MuBar),
        h('div', { class: 'mi-bar-label small' }, 'Beta (13–30 Hz)'),
        h('div', { class: 'mi-bar-track' }, c3BetaBar)
      ),
      h(
        'div',
        { class: 'mi-hemi-box' },
        h(
          'div',
          { class: 'mi-hemi-title' },
          h('strong', {}, t('ขั้ว C4 (สมองซีกขวา)', 'C4 (Right Hemisphere)')),
          c4ValTxt
        ),
        h('span', { class: 'small muted' }, t('ควบคุม: มือซ้าย', 'Controls: Left Hand')),
        h('div', { class: 'mi-bar-label small' }, 'Mu (8–13 Hz)'),
        h('div', { class: 'mi-bar-track' }, c4MuBar),
        h('div', { class: 'mi-bar-label small' }, 'Beta (13–30 Hz)'),
        h('div', { class: 'mi-bar-track' }, c4BetaBar)
      )
    )
  );

  // 4) Mini-game: Move cursor left/right by (C3 - C4) Mu power difference
  const scoreChip = h('span', { class: 'chip' }, t(`${icon('target')} เป้าหมายที่ชนสำเร็จ: 0`, `${icon('target')} Targets Hit: 0`));
  const goalPrompt = h('span', { class: 'mi-goal-prompt' });
  const zoneLeft = h('div', { class: 'mi-zone left' }, t('เป้าฝั่งซ้าย (คิดกำมือซ้าย → C4 ลด)', 'Left Goal (Imagine Left → C4 ERD)'));
  const zoneRight = h('div', { class: 'mi-zone right' }, t('เป้าฝั่งขวา (คิดกำมือขวา → C3 ลด)', 'Right Goal (Imagine Right → C3 ERD)'));
  const ballEl = h('div', { class: 'mi-ball' });

  const gameCard = h(
    'div',
    { class: 'mi-game-card card flat' },
    h(
      'div',
      { class: 'mi-game-head' },
      h('strong', {}, t('มินิเกม BCI Cursor: บังคับลูกบอลด้วยผลต่างพลังงาน (C3 − C4)', 'BCI Cursor Mini-Game: Steer the Ball via Power Difference (C3 − C4)')),
      goalPrompt,
      scoreChip
    ),
    h(
      'div',
      { class: 'mi-arena' },
      zoneLeft,
      h('div', { class: 'mi-center-line' }),
      zoneRight,
      ballEl
    )
  );

  function syncGameUI() {
    zoneLeft.classList.toggle('active-target', targetSide === 'left');
    zoneRight.classList.toggle('active-target', targetSide === 'right');
    goalPrompt.innerHTML =
      targetSide === 'left'
        ? t('ภารกิจตอนนี้: พาลูกบอลไปเข้า <b>ประตูซ้าย</b> (กดจินตนาการกำมือซ้าย)', 'Current Mission: Steer the ball into the <b>Left Goal</b> (Imagine Left Hand)')
        : t('ภารกิจตอนนี้: พาลูกบอลไปเข้า <b>ประตูขวา</b> (กดจินตนาการกำมือขวา)', 'Current Mission: Steer the ball into the <b>Right Goal</b> (Imagine Right Hand)');
    scoreChip.innerHTML = t(
      `${icon('target')} <span>ชนเป้าหมายสำเร็จ: <b>${hits}</b> ครั้ง</span>`,
      `${icon('target')} <span>Targets Hit: <b>${hits}</b></span>`
    );
    // Map ballX (-100..+100) to 8%..92%
    const leftPct = 50 + (ballX / 100) * 40;
    ballEl.style.left = `${leftPct}%`;
  }

  // 5) Live Scope of C3 and C4
  const scopeCanvas = h('canvas', {
    class: 'scope mi-scope',
    'aria-label': t('สัญญาณสดขั้ว C3 และ C4 เปรียบเทียบแอมพลิจูดคลื่น Mu', 'Live EEG traces at C3 and C4 comparing Mu amplitude'),
  });

  root.append(
    h(
      'div',
      { class: 'mi-wrap' },
      h('div', { class: 'mi-controls' }, btnLeft, btnRest, btnRight),
      contraBanner,
      gameCard,
      h(
        'div',
        { class: 'mi-mid-grid' },
        h(
          'div',
          { class: 'mi-topo-card card flat' },
          h('strong', {}, t('แผนที่หนังศีรษะ (Scalp Topomap)', 'Scalp Topomap')),
          head.svg,
          h(
            'div',
            { class: 'mi-topo-legend small muted' },
            h('span', { class: 'dot', style: { background: '#1FA39A' } }),
            t('สีเขียวอมฟ้า = พลังงานลดลง (ERD)', 'Teal = Power Decrease (ERD)')
          )
        ),
        powerPanel
      ),
      h(
        'div',
        { class: 'mi-scope-box' },
        h(
          'div',
          { class: 'mi-scope-head' },
          h('strong', {}, t('สัญญาณสด C3 (สมองซีกซ้าย) เทียบกับ C4 (สมองซีกขวา)', 'Live Signal: C3 (Left Hemisphere) vs C4 (Right Hemisphere)')),
          h('span', { class: 'small muted' }, t('สังเกตว่าฝั่งตรงข้ามกับมือที่คิดจะมีแอมพลิจูดยุบลง (ERD)', 'Notice that the hemisphere contralateral to the imagined hand drops in amplitude (ERD)'))
        ),
        scopeCanvas
      )
    )
  );

  const scope = new Scope(scopeCanvas, {
    channels: 2,
    fs,
    seconds: 3,
    labels: [t('C3 (ซ้าย)', 'C3 (Left)'), t('C4 (ขวา)', 'C4 (Right)')],
    colors: ['#FF6B4A', '#1FA39A'],
    range: 48,
    labelWidth: 68,
  });

  function setImagery(nextState, fromUser = true) {
    state = nextState;
    btnLeft.setAttribute('aria-pressed', String(state === 'left'));
    btnRest.setAttribute('aria-pressed', String(state === 'rest'));
    btnRight.setAttribute('aria-pressed', String(state === 'right'));

    if (state === 'left') {
      // Left hand -> right hemisphere (C4) drops in Mu & Beta!
      synthC3.setAmps({ alpha: 26, beta: 13 });
      synthC4.setAmps({ alpha: 6, beta: 4 });
      if (fromUser) {
        ctx?.say?.(
          t(
            'จินตนาการกำ<b>มือซ้าย</b>: สังเกตที่ขั้ว <b>C4 (สมองซีกขวา)</b> คลื่น Mu ยุบตัวลงอย่างชัดเจน (ERD) เพราะสมองสั่งงานร่างกายแบบไขว้ฝั่ง (Contralateral)!',
            'Imagining <b>Left Hand</b>: Notice at <b>C4 (right hemisphere)</b> how the Mu rhythm drops sharply (ERD) because the brain controls the body contralaterally!'
          ),
          'idle'
        );
      }
    } else if (state === 'right') {
      // Right hand -> left hemisphere (C3) drops in Mu & Beta!
      synthC3.setAmps({ alpha: 6, beta: 4 });
      synthC4.setAmps({ alpha: 26, beta: 13 });
      if (fromUser) {
        ctx?.say?.(
          t(
            'จินตนาการกำ<b>มือขวา</b>: คราวนี้ขั้ว <b>C3 (สมองซีกซ้าย)</b> ยุบตัวลง (ERD) ส่วน C4 กลับมาเต้นแรงตามปกติ ดันลูกบอลไปทางขวา!',
            'Imagining <b>Right Hand</b>: Now <b>C3 (left hemisphere)</b> drops (ERD) while C4 returns to full idle amplitude, pushing the ball to the right!'
          ),
          'idle'
        );
      }
    } else {
      synthC3.setAmps({ alpha: 24, beta: 12 });
      synthC4.setAmps({ alpha: 24, beta: 12 });
    }
    updateContraBanner();

    if (fromUser && state !== 'rest' && !discoveredContra) {
      discoveredContra = true;
      ctx?.discover?.(
        'contralateral',
        t(
          'ค้นพบหลักการ Contralateral Control! มือซ้ายถูกควบคุมโดยสมองซีกขวา (C4) และมือขวาถูกควบคุมโดยสมองซีกซ้าย (C3)',
          'Discovered Contralateral Control! The left hand is controlled by the right hemisphere (C4), and the right hand is controlled by the left hemisphere (C3).'
        )
      );
    }
  }

  // Set initial imagery state before pre-filling scope so the full 3s window shows C3 vs C4 ERD
  setImagery('left', false);
  for (let i = 0; i < fs * 3; i++) {
    scope.push([synthC3.next(), synthC4.next()]);
  }

  const onKeyDown = (e) => {
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setImagery('left', true);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setImagery('right', true);
    } else if (e.key === ' ') {
      e.preventDefault();
      setImagery('rest', true);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  ctx?.say?.(
    t(
      'กดปุ่ม <b>"จินตนาการกำมือซ้าย"</b> หรือ <b>"จินตนาการกำมือขวา"</b> (หรือปุ่มลูกศร ← / →) เพื่อดูการยุบตัวของคลื่น Mu (ERD) แบบไขว้ฝั่งและบังคับลูกบอลเข้าประตู!',
      'Click <b>"Imagine Left Hand"</b> or <b>"Imagine Right Hand"</b> (or press the ← / → arrow keys) to observe contralateral Mu suppression (ERD) and steer the ball into the goal!'
    ),
    'idle'
  );
  renderTopo();
  syncGameUI();

  let topoTimer = 0;
  const stopLoop = loop((dt) => {
    const n = Math.max(1, Math.min(16, Math.round(dt * fs)));
    for (let i = 0; i < n; i++) {
      scope.push([synthC3.next(), synthC4.next()]);
    }
    scope.draw();

    const targetC3Mu = state === 'right' ? 32 : 100;
    const targetC4Mu = state === 'left' ? 32 : 100;
    const targetC3Beta = state === 'right' ? 45 : 100;
    const targetC4Beta = state === 'left' ? 45 : 100;

    const k = clamp(dt * 5.5, 0, 1);
    c3Mu = lerp(c3Mu, targetC3Mu, k);
    c4Mu = lerp(c4Mu, targetC4Mu, k);
    c3Beta = lerp(c3Beta, targetC3Beta, k);
    c4Beta = lerp(c4Beta, targetC4Beta, k);

    c3MuBar.style.width = `${Math.round(c3Mu)}%`;
    c3BetaBar.style.width = `${Math.round(c3Beta)}%`;
    c4MuBar.style.width = `${Math.round(c4Mu)}%`;
    c4BetaBar.style.width = `${Math.round(c4Beta)}%`;
    c3ValTxt.textContent = `Mu ${Math.round(c3Mu)}%`;
    c4ValTxt.textContent = `Mu ${Math.round(c4Mu)}%`;

    c3MuBar.classList.toggle('erd', c3Mu < 65);
    c4MuBar.classList.toggle('erd', c4Mu < 65);

    // Cursor velocity driven by (c4Mu - c3Mu):
    // If imagining LEFT hand -> c4Mu drops (32%), c3Mu is 100% -> (c4Mu - c3Mu) < 0 -> moves LEFT!
    // If imagining RIGHT hand -> c3Mu drops (32%), c4Mu is 100% -> (c4Mu - c3Mu) > 0 -> moves RIGHT!
    const diff = c4Mu - c3Mu;
    if (Math.abs(diff) > 8) {
      ballX = clamp(ballX + diff * dt * 1.15, -100, 100);
    } else {
      ballX = lerp(ballX, 0, dt * 1.8);
    }

    // Check target hit
    const inGoal = (targetSide === 'left' && ballX <= -78) || (targetSide === 'right' && ballX >= 78);
    if (inGoal) {
      holdTime += dt;
      if (holdTime >= 0.25) {
        hits++;
        holdTime = 0;
        ballX = 0;
        targetSide = targetSide === 'left' ? 'right' : 'left';
        ctx?.say?.(
          t(
            `เข้าเป้า! ตอนนี้สลับไปจินตนาการกำ<b>${targetSide === 'left' ? 'มือซ้าย (C4 ลด)' : 'มือขวา (C3 ลด)'}</b> เพื่อบังคับลูกบอลไปอีกฝั่งกันเลย`,
            `Goal! Now switch to imagining your <b>${targetSide === 'left' ? 'Left Hand (C4 ERD)' : 'Right Hand (C3 ERD)'}</b> to steer the ball to the other side!`
          ),
          'happy'
        );
      }
    } else {
      holdTime = 0;
    }

    syncGameUI();

    topoTimer += dt;
    if (topoTimer >= 0.12) {
      topoTimer = 0;
      renderTopo();
    }
  });

  return () => {
    stopLoop();
    window.removeEventListener('keydown', onKeyDown);
    scope.dispose();
  };
}
