// Home Page: Interactive 3D Brain Hero + Mouse-reactive EEG strip + 12-stage Learning Map (Bilingual TH/EN).
import { h, esc, loop } from '../util.js';
import { t, isEn } from '../i18n.js';
import { icon, scribble } from '../ui/icons.js';
import { buddy } from '../ui/mascot.js';
import { store } from '../store.js';
import { LESSONS, PHASES } from '../data/lessons.js';
import { BRAIN_REGIONS } from '../data/regions.js';
import { createBrainViewer } from '../brain/viewer3d.js';
import { EEGSynth } from '../signal/dsp.js';
import { fitCanvas, drawGrid, drawTrace } from '../signal/plot.js';

export function render(main) {
  main.innerHTML = '';
  const cleanups = [];

  const st = store.get();
  const doneCount = Object.keys(st.done || {}).length;
  const nextLesson = LESSONS.find((l) => !store.isDone(l.id)) || LESSONS[0];

  const page = h('div', { class: 'wrap home-page' });

  /* ============================================================
     1. HERO SECTION
  ============================================================ */
  const hero = h('section', { class: 'hero-grid' });

  // Left column: copy + actions + Neuro-noi
  const heroLeft = h('div', { class: 'hero-copy' });
  heroLeft.innerHTML = `
    <div class="hero-kicker">
      <span class="chip"><span class="dot" style="--c:var(--coral)"></span>NEUROLAB · INTERACTIVE LAB BOOK</span>
      <span class="chip"><span class="dot" style="--c:var(--teal)"></span>${t('12 ด่าน · ฟรี · ไม่ต้องมีพื้นฐาน', '12 Stages · Free · Beginner Friendly')}</span>
    </div>
    <h1>${t(
      'อ่านใจด้วยไฟฟ้า?<br><span class="hl-coral">มาเรียน BCI &amp; EEG</span> กันตั้งแต่ศูนย์',
      'Mind Reading with Electricity?<br><span class="hl-coral">Learn BCI &amp; EEG</span> from Scratch'
    )}</h1>
    <p class="hero-lead">
      ${t(
        'ลืมตำราหนาๆ ไปได้เลย! ที่นี่คุณจะได้หมุน <strong>สมอง 3D</strong> สวมหมวกอิเล็กโทรดระบบ <strong>10-20</strong> ลองปรับตัวกรองสัญญาณ <strong>50 Hz</strong> เล่น <strong>P300 Speller</strong> และบังคับวัตถุด้วย <strong>SSVEP &amp; Motor Imagery</strong> ด้วยตัวเองทีละขั้น',
        'Forget dry textbooks! Rotate an interactive <strong>3D Brain</strong>, fit a <strong>10-20 EEG Cap</strong>, tune <strong>50 Hz Notch filters</strong>, spell with a <strong>P300 Speller</strong>, and drive objects with <strong>SSVEP &amp; Motor Imagery</strong> step by step.'
      )}
    </p>
  `;

  const ctaRow = h('div', { class: 'hero-ctas' },
    h('a', {
      href: `#/lesson/${nextLesson.id}`,
      class: 'btn primary',
      html: `${icon('play')} <span>${
        doneCount > 0
          ? t(`เรียนต่อด่านที่ ${nextLesson.id}: ${esc(nextLesson.title)}`, `Continue Stage ${nextLesson.id}: ${esc(nextLesson.title)}`)
          : t('เริ่มด่านที่ 1 เลย!', 'Start Stage 1 Now!')
      }</span>`,
    }),
    h('a', {
      href: '#/explore?focus=Brain',
      class: 'btn',
      html: `${icon('brain')} <span>${t('สำรวจสมอง 3D', 'Explore 3D Brain')}</span>`,
    }),
    h('a', {
      href: '#/playground',
      class: 'btn ghost',
      html: `${icon('wave')} <span>${t('ห้องทดลอง EEG สด', 'Live EEG Lab')}</span>`,
    }),
  );
  heroLeft.append(ctaRow);

  const welcomeText = doneCount === 0
    ? t(
        'สวัสดี! เราชื่อ <strong>นิวโรน้อย</strong> ลองลากหมุนสมอง 3D ทางขวา หรือขยับเมาส์ดูคลื่น EEG ด้านล่างก่อนเริ่มด่านที่ 1 ได้เลย!',
        'Hi there! I’m <strong>Neuro-noi</strong>. Drag to rotate the 3D brain on the right or move your mouse to excite the live EEG trace below before starting Stage 1!'
      )
    : t(
        `เก่งมาก! คุณสะสมแสตมป์ผ่านแล้ว <strong>${doneCount}/12 ด่าน</strong> (${st.xp} XP) ไปลุยด่านที่ ${nextLesson.id} กันต่อไหม?`,
        `Awesome job! You’ve collected <strong>${doneCount}/12 stamps</strong> (${st.xp} XP). Ready for Stage ${nextLesson.id}?`
      );
  const mascotBuddy = buddy(welcomeText, doneCount > 0 ? 'happy' : 'idle');
  heroLeft.append(mascotBuddy.el);

  // Right column: Interactive 3D Brain Stage + Mouse-reactive EEG strip
  const heroRight = h('div', { class: 'card hero-stage-card' });
  const stageTop = h('div', { class: 'hero-stage-top' });
  const regionBadge = h('span', {
    class: 'chip',
    html: `<span class="dot" style="--c:#FF7A59"></span><span>${t('สมองทั้งหมด (Whole Brain)', 'Whole Brain')}</span>`,
  });
  const capBtn = h('button', {
    type: 'button',
    class: 'btn sm',
    'aria-pressed': 'true',
    html: `${icon('cap')} <span>${t('หมวก EEG 10-20', '10-20 EEG Cap')}</span>`,
  });
  const openExploreLink = h('a', {
    href: '#/explore?focus=Brain',
    class: 'btn sm mustard',
    html: `${icon('explode')} <span>${t('เปิดเต็มจอ', 'Full Explorer')}</span>`,
  });
  stageTop.append(regionBadge, capBtn, openExploreLink);

  const canvasBox = h('div', {
    class: 'hero-brain-viewport',
    'aria-label': t('โมเดลสมอง 3 มิติ หมุนและคลิกเลือกส่วนได้', 'Interactive 3D brain model — drag to rotate and click regions'),
  });
  const hoverTip = h('div', { class: 'tip', style: { display: 'none' } });
  document.body.append(hoverTip);
  cleanups.push(() => hoverTip.remove());

  // Quick lobe selector pills under the 3D brain
  const quickLobes = [
    { id: 'brain', shortEn: 'All' },
    { id: 'frontal', shortEn: 'Frontal' },
    { id: 'motor', shortEn: 'Motor M1' },
    { id: 'parietal', shortEn: 'Parietal' },
    { id: 'temporal', shortEn: 'Temporal' },
    { id: 'occipital', shortEn: 'Occipital' },
    { id: 'cerebellum', shortEn: 'Cerebellum' },
  ];
  const pillRow = h('div', { class: 'hero-lobe-pills' });

  // Live mouse-reactive EEG strip at the bottom of the hero card
  const waveWrap = h('div', { class: 'hero-wave-box' });
  const waveHeader = h('div', { class: 'hero-wave-head' },
    h('span', {
      class: 'small',
      html: t(
        '<strong>สัญญาณจำลองสด (Live EEG Strip):</strong> ขยับเมาส์บนสมองเพื่อกระตุ้นคลื่น Beta/Gamma',
        '<strong>Live EEG Strip:</strong> Move your cursor over the brain to excite Beta/Gamma activity'
      ),
    }),
    h('span', { class: 'mono small muted', id: 'hero-wave-readout' }, 'Cz · 10 Hz Alpha'),
  );
  const waveCanvas = h('canvas', { class: 'hero-wave-canvas' });
  waveWrap.append(waveHeader, waveCanvas);

  heroRight.append(stageTop, canvasBox, pillRow, waveWrap);
  hero.append(heroLeft, heroRight);
  page.append(hero);

  // Mount Three.js Hero Viewer
  let viewer = null;
  const synth = new EEGSynth({ fs: 250, amps: { delta: 4, theta: 5, alpha: 18, beta: 5, gamma: 1.5 }, noise: 2.5, seed: 42 });
  let mouseEnergy = 0;

  function updateHeroRegionUI(meta) {
    const label = isEn() ? esc(meta.nameEn) : `${esc(meta.nameTh)} (${esc(meta.nameEn)})`;
    regionBadge.innerHTML = `<span class="dot" style="--c:${meta.color}"></span><span>${label}</span>`;
    openExploreLink.href = `#/explore?focus=${encodeURIComponent(meta.id)}`;
    for (const b of pillRow.querySelectorAll('button')) {
      b.setAttribute('aria-pressed', b.dataset.id === meta.id ? 'true' : 'false');
    }
    const ro = waveHeader.querySelector('#hero-wave-readout');
    if (ro) {
      const elName = meta.electrodes?.[0] || 'Cz';
      ro.textContent = `${elName} · ${meta.nameEn}`;
    }
  }

  for (const item of quickLobes) {
    const r = BRAIN_REGIONS.find((x) => x.id === item.id);
    if (!r) continue;
    const pillLabel = isEn() ? item.shortEn : r.nameTh.replace('สมอง', '');
    const btn = h('button', {
      type: 'button',
      class: 'chip',
      dataset: { id: r.id },
      'aria-pressed': item.id === 'brain' ? 'true' : 'false',
      html: `<span class="dot" style="--c:${r.color}"></span><span>${esc(pillLabel)}</span>`,
      onclick: () => viewer && viewer.focusRegion(r.id),
    });
    pillRow.append(btn);
  }

  requestAnimationFrame(() => {
    viewer = createBrainViewer(canvasBox, {
      mode: 'hero',
      initialFocus: 'brain',
      initialCap: true,
      onSelectRegion(meta) {
        updateHeroRegionUI(meta);
        mascotBuddy.say(
          `<strong>${esc(meta.nameTh)}:</strong> ${esc(meta.summary)} <a href="#/explore?focus=${meta.id}">${t('เปิดดูแบบละเอียด →', 'Inspect in 3D →')}</a>`,
          'happy'
        );
      },
      onSelectElectrode(e) {
        mascotBuddy.say(
          `${t('อิเล็กโทรด', 'Electrode')} <code>${esc(e.name)}</code> (${esc(e.side.th)}): ${esc(e.note)}`,
          'happy'
        );
      },
      onHover(info) {
        if (!info) {
          hoverTip.style.display = 'none';
          return;
        }
        mouseEnergy = Math.min(1, mouseEnergy + 0.18);
        hoverTip.style.display = 'block';
        hoverTip.style.left = `${info.x}px`;
        hoverTip.style.top = `${info.y}px`;
        hoverTip.innerHTML = `${esc(info.titleTh)}<span class="en">${esc(info.titleEn)}</span>`;
      },
    });
    viewer.tryLoadExternalGLB();
    cleanups.push(() => viewer.dispose());
  });

  capBtn.addEventListener('click', () => {
    if (!viewer) return;
    const on = viewer.setEEGCap();
    capBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  // Live 60fps canvas trace reactive to pointer velocity
  const onHeroMove = () => { mouseEnergy = Math.min(1, mouseEnergy + 0.14); };
  heroRight.addEventListener('pointermove', onHeroMove);
  cleanups.push(() => heroRight.removeEventListener('pointermove', onHeroMove));

  const fit = fitCanvas(waveCanvas);
  cleanups.push(() => fit.dispose());
  const traceBuf = new Float32Array(360);
  for (let i = 0; i < traceBuf.length; i++) traceBuf[i] = synth.next();

  const stopWave = loop((dt) => {
    mouseEnergy = Math.max(0, mouseEnergy - dt * 0.9);
    synth.setAmps({
      alpha: 18 * (1 - mouseEnergy * 0.65),
      beta: 5 + mouseEnergy * 18,
      gamma: 1.5 + mouseEnergy * 9,
    });
    const steps = Math.max(1, Math.round(dt * 120));
    traceBuf.copyWithin(0, steps);
    for (let i = traceBuf.length - steps; i < traceBuf.length; i++) {
      traceBuf[i] = synth.next();
    }
    const { ctx, w, h: ch } = fit;
    drawGrid(ctx, w, ch, { step: 18, major: 4 });
    drawTrace(ctx, traceBuf, {
      x: 0, y: 4, w, h: ch - 8,
      min: -45, max: 45,
      color: mouseEnergy > 0.35 ? '#FF6B4A' : '#1FA39A',
      lw: 2,
    });
  });
  cleanups.push(stopWave);

  /* ============================================================
     2. THREE CORE LAB TOOLS (ASYMMETRIC SHOWCASE)
  ============================================================ */
  const toolsSec = h('section', { class: 'home-tools-section' });
  toolsSec.innerHTML = `
    <div class="section-head">
      <div>
        <span class="kicker">${t('INTERACTIVE WORKBENCH · เครื่องมือประจำแล็บ', 'INTERACTIVE WORKBENCH · HANDS-ON LAB TOOLS')}</span>
        <h2>${t('ไม่ใช่แค่อ่าน แต่ได้ลงมือหมุน ปรับ และทดลองจริง', 'Don’t Just Read — Rotate, Tune, and Experiment Live')}</h2>
      </div>
      ${scribble}
    </div>
    <div class="home-tools-bento">
      <a href="#/explore?focus=Brain" class="card tool-bento-card main-bento">
        <span class="chip"><span class="dot" style="--c:var(--coral)"></span>3D NEUROANATOMY + 10-20</span>
        <h3>${t('3D Brain Explorer แบบ BrainFacts + หมวก EEG', 'BrainFacts-Style 3D Brain Explorer + 10-20 EEG Cap')}</h3>
        <p class="muted">${t(
          'หมุนดูสมอง 360° คลิกแยกดู 19 โครงสร้างทั้งเปลือกสมองและส่วนลึก เปิดโหมดผ่าครึ่งซีก แยกชิ้นส่วน และสวมหมวกอิเล็กโทรด 10-20 เพื่อดูว่าแต่ละจุดวัดสมองส่วนไหน',
          'Rotate 360°, isolate 19 cortical and deep limbic structures with 15% ghosting, toggle sagittal cutaway or exploded views, and overlay the 10-20 EEG cap to see which cortex sits beneath each electrode.'
        )}</p>
        <span class="btn sm primary">${icon('brain')} ${t('เปิด 3D Brain Explorer →', 'Open 3D Brain Explorer →')}</span>
      </a>
      <a href="#/playground" class="card tool-bento-card tint-teal">
        <span class="chip"><span class="dot" style="--c:var(--teal)"></span>REAL-TIME SIMULATOR</span>
        <h3>EEG Signal Playground</h3>
        <p class="muted">${t(
          'เลือกช่องอิเล็กโทรดบนหัว 2D ดูคลื่นไหลสด 60fps ลองกดแทรกการกะพริบตา ขบกราม หลับตาเพิ่มคลื่น Alpha ปรับตัวกรอง Band-pass/Notch 50 Hz และ Export CSV',
          'Pick up to 8 channels on a 2D 10-20 head, watch 60fps streaming waves, inject eye blinks, jaw clenches, eyes-closed Alpha, tune Band-pass/50 Hz Notch filters, and export CSV.'
        )}</p>
        <span class="btn sm">${icon('wave')} ${t('เข้าห้องทดลองสัญญาณ →', 'Launch Signal Simulator →')}</span>
      </a>
      <a href="#/glossary" class="card tool-bento-card tint-mustard">
        <span class="chip"><span class="dot" style="--c:var(--mustard)"></span>QUICK REFERENCE</span>
        <h3>${t('คลังคำศัพท์ BCI &amp; EEG', 'BCI &amp; EEG Glossary')}</h3>
        <p class="muted">${t(
          'ค้นหาคำศัพท์เทคนิคได้ทันที ตั้งแต่ Action Potential, Impedance, Nyquist, ICA, P300, SSVEP, ERD/ERS ไปจนถึง CSP และ LDA',
          'Instant bilingual search across essential terms from Action Potential, Impedance, Nyquist, and ICA to P300, SSVEP, ERD/ERS, CSP, and LDA.'
        )}</p>
        <span class="btn sm">${icon('book')} ${t('เปิดคลังคำศัพท์ →', 'Browse Glossary →')}</span>
      </a>
    </div>
  `;
  page.append(toolsSec);

  /* ============================================================
     3. 12-STAGE LEARNING MAP (แผนที่การเรียนรู้)
  ============================================================ */
  const mapSec = h('section', { class: 'learning-map-section', id: 'learning-map' });
  const pct = Math.round((doneCount / LESSONS.length) * 100);

  const mapHeader = h('div', { class: 'map-header card flat' });
  mapHeader.innerHTML = `
    <div class="map-header-top">
      <div>
        <span class="kicker">${t('LEARNING ROADMAP · เส้นทางสู่การสร้าง BCI', 'LEARNING ROADMAP · STEP-BY-STEP CURRICULUM')}</span>
        <h2>${t('แผนที่การเรียนรู้ 12 ด่าน (จากศูนย์ถึงเขียนโค้ด Python)', '12-Stage Learning Map (From Zero to MNE-Python)')}</h2>
        <p class="muted" style="margin:0">${t(
          'แต่ละด่านประกอบด้วย: สรุปเข้าใจง่าย → ของเล่น Interactive ประจำด่าน → ควิซรับตราประทับจากนิวโรน้อย',
          'Every stage includes: Bite-sized theory → Hands-on interactive lab widget → Checkpoint quiz with Neuro-noi stamps'
        )}</p>
      </div>
      <div class="map-progress-box">
        <div class="map-progress-nums">
          <strong>${t(`ความคืบหน้าของคุณ: ${doneCount}/${LESSONS.length} ด่าน`, `Your Progress: ${doneCount}/${LESSONS.length} Stages`)}</strong>
          <span class="mono">${pct}%</span>
        </div>
        <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
      </div>
    </div>
  `;
  mapSec.append(mapHeader);

  for (const phase of PHASES) {
    const phaseBox = h('div', { class: 'phase-block' });
    phaseBox.innerHTML = `
      <div class="phase-title-row">
        <span class="badge-num">${phase.id}</span>
        <div>
          <h3>${esc(phase.title)}</h3>
          <p class="small muted" style="margin:0">${esc(phase.sub)}</p>
        </div>
      </div>
    `;

    const grid = h('div', { class: 'stage-grid' });
    const phaseLessons = LESSONS.filter((l) => l.phase === phase.id);
    for (const lesson of phaseLessons) {
      const done = store.isDone(lesson.id);
      const isNext = lesson.id === nextLesson.id && !done;
      const card = h('a', {
        href: `#/lesson/${lesson.id}`,
        class: `card stage-card ${done ? 'is-done' : ''} ${isNext ? 'is-next' : ''}`,
      });
      card.innerHTML = `
        <div class="stage-card-top">
          <span class="stage-num" style="background:${lesson.color}">${t(`ด่าน ${lesson.id}`, `Stage ${lesson.id}`)}</span>
          <span class="mono small muted">${esc(lesson.duration)}</span>
          ${
            done
              ? `<span class="stage-stamp" aria-label="${t('ผ่านแล้ว', 'Completed')}">${t('ผ่านแล้ว ✓', 'PASSED ✓')}</span>`
              : isNext
              ? `<span class="chip next-pill"><span class="dot" style="--c:var(--coral)"></span>${t('ด่านถัดไป', 'Up Next')}</span>`
              : ''
          }
        </div>
        <h3>${esc(lesson.title)}</h3>
        <p class="en" style="margin-bottom:.4rem">${esc(lesson.titleEn)}</p>
        <p class="muted small" style="margin-bottom:1rem">${esc(lesson.subtitle)}</p>
        <div class="stage-card-foot">
          <span class="small"><strong>${t('ของเล่น:', 'Lab:')}</strong> ${esc(lesson.widgetTitle)}</span>
          <span class="stage-go">${icon('arrowRight')}</span>
        </div>
      `;
      grid.append(card);
    }
    phaseBox.append(grid);
    mapSec.append(phaseBox);
  }

  page.append(mapSec);
  main.append(page);

  return () => {
    cleanups.forEach((fn) => { try { fn(); } catch {} });
  };
}
