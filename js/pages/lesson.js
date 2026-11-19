// Lesson Page Controller: Renders theory -> interactive widget -> Neuro-noi quiz -> references (Bilingual TH/EN).
import { h, esc, toast } from '../util.js';
import { t, isEn } from '../i18n.js';
import { icon } from '../ui/icons.js';
import { buddy } from '../ui/mascot.js';
import { store } from '../store.js';
import { LESSONS, PHASES, getLesson } from '../data/lessons.js';
import { REGION_MAP } from '../data/regions.js';

export function render(main, params = {}) {
  main.innerHTML = '';
  let widgetCleanup = null;

  const lesson = getLesson(params.id || 1);
  const phase = PHASES.find((p) => p.id === lesson.phase);
  const region = REGION_MAP[lesson.regionId] || REGION_MAP.brain;
  const prevLesson = LESSONS.find((l) => l.id === lesson.id - 1);
  const nextLesson = LESSONS.find((l) => l.id === lesson.id + 1);
  const alreadyDone = store.isDone(lesson.id);

  const page = h('div', { class: 'wrap lesson-page' });

  /* ============================================================
     1. STAGE STRIP NAVIGATION (1..12)
  ============================================================ */
  const stageBar = h('nav', { class: 'lesson-stage-bar', 'aria-label': t('เลือกด่านการเรียนรู้', 'Select learning stage') });
  stageBar.append(
    h('a', { href: '#/', class: 'btn sm ghost', html: `${icon('map')} <span>${t('แผนที่ 12 ด่าน', '12-Stage Map')}</span>` })
  );
  const pillsWrap = h('div', { class: 'stage-pills' });
  for (const l of LESSONS) {
    const done = store.isDone(l.id);
    const active = l.id === lesson.id;
    pillsWrap.append(
      h('a', {
        href: `#/lesson/${l.id}`,
        class: `stage-pill ${done ? 'done' : ''} ${active ? 'active' : ''}`,
        title: `${t('ด่าน', 'Stage')} ${l.id}: ${l.title}`,
        'aria-current': active ? 'page' : false,
      }, String(l.id))
    );
  }
  stageBar.append(
    pillsWrap,
    h('a', {
      href: `#/explore?focus=${encodeURIComponent(region.id)}`,
      class: 'btn sm',
      html: `${icon('brain')} <span>${t(`ดู ${esc(region.nameTh)} ใน 3D`, `View ${esc(region.nameEn)} in 3D`)}</span>`,
    })
  );
  page.append(stageBar);

  /* ============================================================
     2. LESSON HEADER + THEORY SECTION
  ============================================================ */
  const article = h('article', { class: 'lesson-article card' });
  article.innerHTML = `
    <div class="lesson-head">
      <div class="lesson-meta-row">
        <span class="chip" style="background:${lesson.color};color:#fff;border-color:var(--ink)">${t(`ด่านที่ ${lesson.id} / 12`, `Stage ${lesson.id} / 12`)}</span>
        <span class="chip">${esc(phase?.title || '')}</span>
        <span class="mono small muted">${esc(lesson.duration)}</span>
        ${alreadyDone ? `<span class="chip" style="background:var(--teal-soft)">${icon('check')} ${t('ผ่านด่านนี้แล้ว', 'Completed')}</span>` : ''}
      </div>
      <h1>${esc(lesson.title)}</h1>
      ${!isEn() ? `<p class="en" style="font-size:.98rem;margin-bottom:.4rem">${esc(lesson.titleEn)}</p>` : ''}
      <p class="lesson-sub">${esc(lesson.subtitle)}</p>
    </div>

    <div class="lesson-prose">
      ${lesson.intro}
    </div>

    ${lesson.callout ? `
      <div class="callout ${esc(lesson.callout.tone || 'mustard')}">
        ${icon('bulb')}
        <strong>${esc(lesson.callout.title)}</strong>
        <p>${esc(lesson.callout.text)}</p>
      </div>
    ` : ''}

    <div class="lesson-takeaways">
      <h3>${icon('star')} ${t('สรุปประเด็นสำคัญก่อนลงมือเล่น', 'Key Takeaways Before You Experiment')}</h3>
      <ul>
        ${lesson.takeaways.map((item) => `<li>${esc(item)}</li>`).join('')}
      </ul>
    </div>
  `;
  page.append(article);

  /* ============================================================
     3. INTERACTIVE LAB WIDGET + NEURO-NOI BUDDY
  ============================================================ */
  const widgetSec = h('section', { class: 'lesson-widget-section', id: 'interactive-lab' });
  const widgetShell = h('div', { class: 'widget' });
  const widgetHead = h('header', { class: 'widget-head' });
  widgetHead.innerHTML = `
    ${icon('flask')}
    <h3>${t('ของเล่นประจำด่าน:', 'Interactive Lab:')} ${esc(lesson.widgetTitle)}</h3>
    <span class="chip"><span class="dot" style="--c:var(--coral)"></span>INTERACTIVE LAB</span>
  `;
  const widgetBody = h('div', { class: 'widget-body' },
    h('p', { class: 'muted small' }, t('กำลังเตรียมอุปกรณ์การทดลอง...', 'Loading lab instrument...'))
  );
  widgetShell.append(widgetHead, widgetBody);

  const labBuddy = buddy(
    t(
      `ลองปรับค่าและกดปุ่มใน <strong>${esc(lesson.widgetTitle)}</strong> ด้านบนได้เลย! ถ้าค้นพบจุดสำคัญ เราจะมีโบนัส XP ให้ด้วยนะ`,
      `Adjust the controls and click buttons in <strong>${esc(lesson.widgetTitle)}</strong> above! Discover key phenomena to earn bonus XP!`
    ),
    'idle'
  );
  widgetSec.append(widgetShell, h('div', { style: { marginTop: '14px' } }, labBuddy.el));
  page.append(widgetSec);

  const widgetCtx = {
    lessonId: lesson.slug,
    say(html, mood = 'idle') {
      const anim = mood === 'happy' ? 'cheer' : mood === 'oops' ? 'shake' : 'bob';
      labBuddy.say(html, mood, anim);
    },
    discover(key, html) {
      const awarded = store.bonus(`${lesson.slug}:${key}`, 15);
      labBuddy.say(
        `${html} ${
          awarded
            ? `<strong style="color:var(--coral)">${t('(+15 XP โบนัสนักทดลอง!)', '(+15 XP Discovery Bonus!)')}</strong>`
            : ''
        }`,
        'happy',
        'cheer'
      );
      if (awarded) toast(t('ค้นพบหลักการสำคัญ! +15 XP', 'Key Principle Discovered! +15 XP'), icon('star'));
    },
  };

  import(`../widgets/${lesson.widget}.js`)
    .then((mod) => {
      widgetBody.innerHTML = '';
      if (typeof mod.default === 'function') {
        widgetCleanup = mod.default(widgetBody, widgetCtx);
      }
    })
    .catch((err) => {
      console.error('Widget load error:', err);
      widgetBody.innerHTML = `<div class="callout coral">${icon('warn')} <strong>${t('ไม่สามารถโหลดชุดทดลองได้:', 'Could not load widget:')}</strong> <code>${esc(err.message)}</code></div>`;
    });

  /* ============================================================
     4. INTERACTIVE QUIZ + STAMP REWARD
  ============================================================ */
  const quizSec = h('section', { class: 'lesson-quiz-section card', id: 'lesson-quiz' });
  const quizHead = h('div', { class: 'quiz-head' });
  quizHead.innerHTML = `
    <div>
      <span class="kicker">${t('CHECKPOINT QUIZ · ทดสอบความเข้าใจ', 'CHECKPOINT QUIZ · TEST YOUR UNDERSTANDING')}</span>
      <h2>${t(`ควิซประจำด่านที่ ${lesson.id} (${lesson.quiz.length} ข้อ)`, `Stage ${lesson.id} Quiz (${lesson.quiz.length} Questions)`)}</h2>
      <p class="muted small" style="margin:0">${t(
        'ตอบให้ครบทุกข้อเพื่อรับตราประทับผ่านด่านและสะสม XP — ถ้าตอบผิด นิวโรน้อยจะใบ้ให้ลองใหม่ได้!',
        'Answer all questions to earn your stage stamp and XP — if you miss one, Neuro-noi will give you a hint to try again!'
      )}</p>
    </div>
  `;
  quizSec.append(quizHead);

  const quizList = h('div', { class: 'quiz' });
  const solved = new Set();
  const wrongTried = new Set();

  const completionBox = h('div', { class: 'quiz-complete-banner', style: { display: alreadyDone ? 'flex' : 'none' } });
  function renderCompletionBanner(freshlyDone, score, total) {
    completionBox.style.display = 'flex';
    completionBox.innerHTML = `
      <div class="stamp ${freshlyDone ? 'thump' : ''}">
        <span>NEUROLAB<br>${t(`ผ่านด่าน ${lesson.id}`, `STAGE ${lesson.id}`)}<br>★ VERIFIED ★</span>
      </div>
      <div class="quiz-complete-copy">
        <h3>${
          freshlyDone
            ? t(`ยอดเยี่ยม! คุณผ่านด่านที่ ${lesson.id} เรียบร้อยแล้ว!`, `Awesome! You’ve Completed Stage ${lesson.id}!`)
            : t(`คุณผ่านด่านที่ ${lesson.id} แล้ว`, `You’ve Completed Stage ${lesson.id}`)
        }</h3>
        <p class="muted" style="margin-bottom:12px">
          ${
            freshlyDone
              ? t(
                  `ตอบถูกในครั้งแรก ${score}/${total} ข้อ รับเพิ่ม <strong>+${50 + score * 10} XP</strong>!`,
                  `First-try score: ${score}/${total} — earned <strong>+${50 + score * 10} XP</strong>!`
                )
              : t(
                  'คุณสามารถกลับมาทบทวนของเล่นและเนื้อหาในด่านนี้ได้ตลอดเวลา',
                  'Feel free to replay the interactive lab or review this stage anytime.'
                )
          }
        </p>
        <div class="widget-row">
          ${
            nextLesson
              ? `<a href="#/lesson/${nextLesson.id}" class="btn primary">${icon('arrowRight')} ${t(`ไปด่านที่ ${nextLesson.id}: ${esc(nextLesson.title)}`, `Next Stage ${nextLesson.id}: ${esc(nextLesson.title)}`)}</a>`
              : `<a href="#/playground" class="btn primary">${icon('wave')} ${t('จบครบ 12 ด่านแล้ว! ไปลุย Playground กัน', 'All 12 Stages Complete! Open EEG Playground')}</a>`
          }
          <a href="#/" class="btn ghost">${icon('map')} ${t('กลับหน้าแผนที่', 'Back to Map')}</a>
        </div>
      </div>
    `;
  }
  if (alreadyDone) renderCompletionBanner(false, lesson.quiz.length, lesson.quiz.length);

  const keys = isEn() ? ['A', 'B', 'C', 'D'] : ['ก', 'ข', 'ค', 'ง'];

  lesson.quiz.forEach((item, idx) => {
    const qCard = h('div', { class: 'q' });
    qCard.append(
      h('h4', {},
        h('span', { class: 'n' }, t(`ข้อ ${idx + 1}`, `Q${idx + 1}`)),
        h('span', {}, item.q)
      )
    );
    const choicesBox = h('div', { class: 'choices' });
    const fbBox = h('div', { class: 'feedback' });

    item.choices.forEach((choiceText, cIdx) => {
      const btn = h('button', {
        type: 'button',
        class: 'choice',
        onclick: () => {
          if (solved.has(idx)) return;
          if (cIdx === item.answer) {
            solved.add(idx);
            btn.classList.add('right');
            choicesBox.querySelectorAll('button').forEach((b) => { b.disabled = true; });
            const b = buddy(`<strong>${t('ถูกต้องเลย!', 'Correct!')}</strong> ${esc(item.explain)}`, 'happy');
            fbBox.innerHTML = '';
            fbBox.append(b.el);

            if (solved.size === lesson.quiz.length) {
              const firstTryCount = lesson.quiz.length - wrongTried.size;
              const fresh = store.completeLesson(lesson.id, firstTryCount, lesson.quiz.length);
              renderCompletionBanner(fresh, firstTryCount, lesson.quiz.length);
              toast(t(`ผ่านด่านที่ ${lesson.id} แล้ว!`, `Stage ${lesson.id} Completed!`), icon('check'));
            }
          } else {
            wrongTried.add(idx);
            btn.classList.add('wrong');
            btn.disabled = true;
            const b = buddy(`<strong>${t('เกือบถูกแล้ว! คำใบ้:', 'Not quite! Hint:')}</strong> ${esc(item.hint)}`, 'oops');
            fbBox.innerHTML = '';
            fbBox.append(b.el);
          }
        },
      },
        h('span', { class: 'key' }, keys[cIdx] || String(cIdx + 1)),
        h('span', {}, choiceText)
      );
      choicesBox.append(btn);
    });

    qCard.append(choicesBox, fbBox);
    quizList.append(qCard);
  });

  quizSec.append(quizList, completionBox);
  page.append(quizSec);

  /* ============================================================
     5. REFERENCES & BOTTOM NAVIGATION
  ============================================================ */
  const refSec = h('section', { class: 'lesson-refs card flat' });
  refSec.innerHTML = `
    <h4>${icon('book')} ${t('แหล่งอ้างอิงทางวิชาการ (References)', 'Academic References')}</h4>
    <ul class="small muted">
      ${lesson.refs.map((r) => `<li>${esc(r)}</li>`).join('')}
    </ul>
  `;
  page.append(refSec);

  const pager = h('nav', { class: 'lesson-pager', 'aria-label': t('เปลี่ยนด่าน', 'Stage navigation') },
    prevLesson
      ? h('a', { href: `#/lesson/${prevLesson.id}`, class: 'btn', html: `${icon('arrowLeft')} <span>${t(`ด่าน ${prevLesson.id}:`, `Stage ${prevLesson.id}:`)} ${esc(prevLesson.title)}</span>` })
      : h('a', { href: '#/', class: 'btn ghost', html: `${icon('home')} <span>${t('หน้าแรก', 'Home')}</span>` }),
    nextLesson
      ? h('a', { href: `#/lesson/${nextLesson.id}`, class: 'btn primary', html: `<span>${t(`ด่าน ${nextLesson.id}:`, `Stage ${nextLesson.id}:`)} ${esc(nextLesson.title)}</span> ${icon('arrowRight')}` })
      : h('a', { href: '#/playground', class: 'btn primary', html: `<span>${t('เปิด EEG Playground', 'Open EEG Playground')}</span> ${icon('arrowRight')}` })
  );
  page.append(pager);

  main.append(page);

  return () => {
    if (typeof widgetCleanup === 'function') {
      try { widgetCleanup(); } catch {}
    }
  };
}
