// 3D Brain Explorer Page — Modeled after brainfacts.org/3d-brain (Bilingual TH/EN)
import { h, esc, toast } from '../util.js';
import { t, isEn } from '../i18n.js';
import { icon } from '../ui/icons.js';
import { store } from '../store.js';
import { BRAIN_REGIONS, REGION_MAP, resolveRegionId } from '../data/regions.js';
import { LESSONS } from '../data/lessons.js';
import { createBrainViewer } from '../brain/viewer3d.js';

export function render(main, params = {}) {
  main.innerHTML = '';
  const cleanups = [];

  const initialFocus = resolveRegionId(params.focus || 'brain');
  const introParam = params.intro;

  const wrap = h('div', { class: 'explore-shell' });

  /* ============================================================
     1. LEFT PANEL: HIERARCHICAL STRUCTURE TREE + SEARCH
  ============================================================ */
  const leftPanel = h('aside', { class: 'explore-tree card', 'aria-label': t('โครงสร้างสมอง', 'Brain Structures') });
  const treeHeader = h('div', { class: 'explore-tree-head' });
  treeHeader.innerHTML = `
    <div class="tree-title-row">
      <span class="kicker" style="margin:0">3D BRAIN ATLAS</span>
      <span class="mono small muted">${BRAIN_REGIONS.length} ${t('โครงสร้าง', 'structures')}</span>
    </div>
    <h2>${t('เลือกส่วนสมอง', 'Select Brain Region')}</h2>
  `;
  const searchBox = h('div', { class: 'search' });
  searchBox.innerHTML = `${icon('search')}<input type="search" placeholder="${t('ค้นหา เช่น Frontal, ท้ายทอย, C3...', 'Search e.g. Frontal, Motor, C3...')}" aria-label="${t('ค้นหาโครงสร้างสมอง', 'Search brain structures')}">`;
  const searchInput = searchBox.querySelector('input');
  treeHeader.append(searchBox);

  const treeList = h('div', { class: 'tree-list', role: 'tree' });
  leftPanel.append(treeHeader, treeList);

  /* ============================================================
     2. CENTER STAGE: 3D VIEWPORT + FLOATING TOOLBAR
  ============================================================ */
  const centerStage = h('section', { class: 'explore-stage card', 'aria-label': t('มุมมองสมอง 3 มิติ', '3D Brain Viewport') });

  const topHud = h('div', { class: 'explore-hud-top' });
  const focusCrumb = h('div', { class: 'explore-crumb' });
  const hudRight = h('div', { class: 'explore-hud-actions' });

  const helpBtn = h('button', {
    type: 'button',
    class: 'btn sm',
    title: t('วิธีใช้งาน 3D Brain', 'How to use 3D Brain'),
    html: `${icon('info')} <span>${t('วิธีใช้', 'Guide')}</span>`,
  });
  const shareBtn = h('button', {
    type: 'button',
    class: 'btn sm',
    title: t('คัดลอกลิงก์โฟกัสสมองส่วนนี้', 'Copy link to this brain region'),
    html: `${icon('link')} <span>${t('แชร์มุมนี้', 'Share View')}</span>`,
  });
  hudRight.append(shareBtn, helpBtn);
  topHud.append(focusCrumb, hudRight);

  const viewport = h('div', { class: 'explore-viewport' });

  // Bottom toolbar
  const toolbar = h('div', { class: 'explore-toolbar', role: 'toolbar', 'aria-label': t('เครื่องมือควบคุมสมอง 3D', '3D Brain Controls') });
  const btnReset = h('button', { type: 'button', class: 'btn sm', html: `${icon('reset')} <span>${t('รีเซ็ตมุมมอง', 'Reset View')}</span>` });
  const btnPalette = h('button', { type: 'button', class: 'btn sm', 'aria-pressed': 'false', html: `${icon('palette')} <span>${t('สีแยกตามกลีบ', 'Lobe Colors')}</span>` });
  const btnCap = h('button', { type: 'button', class: 'btn sm', 'aria-pressed': 'false', html: `${icon('cap')} <span>${t('สวมหมวก EEG 10-20', '10-20 EEG Cap')}</span>` });
  const btnCut = h('button', { type: 'button', class: 'btn sm', 'aria-pressed': 'false', html: `${icon('half')} <span>${t('ผ่าครึ่งซีก', 'Cutaway')}</span>` });
  const btnExplode = h('button', { type: 'button', class: 'btn sm', 'aria-pressed': 'false', html: `${icon('explode')} <span>${t('แยกชิ้นส่วน', 'Explode')}</span>` });
  const btnHide = h('button', { type: 'button', class: 'btn sm', 'aria-pressed': 'false', html: `${icon('eyeOff')} <span>${t('ซ่อนส่วนนี้', 'Hide Region')}</span>` });
  toolbar.append(btnReset, btnPalette, btnCap, btnCut, btnExplode, btnHide);

  centerStage.append(topHud, viewport, toolbar);

  /* ============================================================
     3. RIGHT PANEL: ANATOMY, FUNCTION, DAMAGE & EEG/BCI RELEVANCE
  ============================================================ */
  const rightPanel = h('aside', { class: 'explore-info card', 'aria-live': 'polite' });

  wrap.append(leftPanel, centerStage, rightPanel);
  main.append(wrap);

  // Floating hover tooltip
  const hoverTip = h('div', { class: 'tip', style: { display: 'none' } });
  document.body.append(hoverTip);
  cleanups.push(() => hoverTip.remove());

  let viewer = null;
  let activeId = initialFocus;
  let activeElectrode = null;
  const collapsedParents = new Set();

  function buildTree(filterText = '') {
    treeList.innerHTML = '';
    const q = filterText.trim().toLowerCase();

    const matches = (r) =>
      !q ||
      r.nameTh.toLowerCase().includes(q) ||
      r.nameEn.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (r.electrodes || []).some((el) => el.toLowerCase().includes(q));

    const rootRegion = REGION_MAP.brain;
    if (matches(rootRegion) || !q) {
      treeList.append(makeTreeItem(rootRegion, 0, false));
    }

    const topRegions = BRAIN_REGIONS.filter((r) => r.parent === 'brain');
    for (const parentReg of topRegions) {
      const children = BRAIN_REGIONS.filter((r) => r.parent === parentReg.id);
      const anyChildMatch = children.some(matches);
      if (!matches(parentReg) && !anyChildMatch) continue;

      const isCollapsed = !q && collapsedParents.has(parentReg.id);
      treeList.append(makeTreeItem(parentReg, 1, children.length > 0, isCollapsed));

      if (!isCollapsed) {
        for (const child of children) {
          if (!matches(child) && !matches(parentReg)) continue;
          treeList.append(makeTreeItem(child, 2, false));
        }
      }
    }
  }

  function makeTreeItem(reg, depth, hasChildren, isCollapsed = false) {
    const row = h('div', {
      class: `tree-item depth-${depth} ${reg.id === activeId ? 'active' : ''}`,
      role: 'treeitem',
      'aria-selected': reg.id === activeId ? 'true' : 'false',
    });

    if (hasChildren) {
      const toggleBtn = h('button', {
        type: 'button',
        class: 'tree-caret',
        'aria-label': isCollapsed ? t('ขยายหมวดย่อย', 'Expand') : t('ยุบหมวดย่อย', 'Collapse'),
        html: icon(isCollapsed ? 'chevronRight' : 'chevronDown'),
        onclick: (ev) => {
          ev.stopPropagation();
          if (collapsedParents.has(reg.id)) collapsedParents.delete(reg.id);
          else collapsedParents.add(reg.id);
          buildTree(searchInput.value);
        },
      });
      row.append(toggleBtn);
    } else {
      row.append(h('span', { class: 'tree-caret-spacer' }));
    }

    const selectBtn = h('button', {
      type: 'button',
      class: 'tree-select-btn',
      onclick: () => {
        activeElectrode = null;
        viewer && viewer.focusRegion(reg.id);
      },
    });
    selectBtn.innerHTML = `
      <span class="dot" style="background:${reg.color}"></span>
      <span class="tree-names">
        <strong>${esc(reg.nameTh)}</strong>
        ${!isEn() ? `<span class="en">${esc(reg.nameEn)}</span>` : ''}
      </span>
    `;
    row.append(selectBtn);
    return row;
  }

  function updatePanels(meta) {
    activeId = meta.id;

    const newHash = `#/explore?focus=${encodeURIComponent(meta.id)}`;
    if (location.hash !== newHash) {
      try { history.replaceState(null, '', newHash); } catch {}
    }

    const parentMeta = meta.parent && meta.parent !== 'brain' ? REGION_MAP[meta.parent] : null;
    focusCrumb.innerHTML = `
      <button type="button" class="chip" data-goto="brain">
        <span class="dot" style="--c:#FF7A59"></span>${t('สมองทั้งหมด', 'Whole Brain')}
      </button>
      ${parentMeta ? `<span class="muted">›</span><button type="button" class="chip" data-goto="${parentMeta.id}"><span class="dot" style="--c:${parentMeta.color}"></span>${esc(parentMeta.nameTh)}</button>` : ''}
      ${meta.id !== 'brain' ? `<span class="muted">›</span><span class="chip" style="background:var(--ink);color:var(--paper)"><span class="dot" style="--c:${meta.color}"></span>${esc(meta.nameTh)}</span>` : ''}
    `;
    focusCrumb.querySelectorAll('[data-goto]').forEach((b) => {
      b.addEventListener('click', () => viewer && viewer.focusRegion(b.dataset.goto));
    });

    btnHide.disabled = meta.id === 'brain';
    const isHidden = viewer ? viewer.isRegionHidden(meta.id) : false;
    btnHide.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
    btnHide.innerHTML = `${icon(isHidden ? 'eye' : 'eyeOff')} <span>${
      isHidden ? t('แสดงส่วนนี้', 'Show Region') : t('ซ่อนส่วนนี้', 'Hide Region')
    }</span>`;

    const relatedLessons = LESSONS.filter(
      (l) => l.regionId === meta.id || (meta.parent && l.regionId === meta.parent)
    ).slice(0, 3);

    rightPanel.innerHTML = `
      <div class="info-head" style="border-left: 6px solid ${meta.color}; padding-left: 12px;">
        <span class="chip"><span class="dot" style="--c:${meta.color}"></span>ANATOMICAL PROFILE</span>
        <h2>${esc(meta.nameTh)}</h2>
        <p class="en" style="font-size:.92rem;margin-bottom:.4rem">${esc(meta.nameEn)}</p>
        <p class="info-summary">${esc(meta.summary)}</p>
      </div>

      ${activeElectrode ? `
        <div class="callout mustard" style="margin: 12px 0;">
          ${icon('cap')}
          <strong>${t('อิเล็กโทรดที่เลือก:', 'Selected Electrode:')} <code>${esc(activeElectrode.name)}</code></strong>
          <p class="small">${esc(activeElectrode.letter.th)} · ${esc(activeElectrode.side.th)} — ${esc(activeElectrode.note)}</p>
        </div>
      ` : ''}

      <div class="info-eeg-box card tint-teal flat">
        <div class="info-eeg-title">
          ${icon('wave')}
          <strong>${t('เกี่ยวกับ EEG &amp; BCI อย่างไร?', 'Why It Matters for EEG &amp; BCI')}</strong>
        </div>
        <p class="small">${esc(meta.eegRelevance)}</p>
        ${meta.electrodes && meta.electrodes.length ? `
          <div class="info-electrodes">
            <span class="small muted">${t('อิเล็กโทรด 10-20 ที่เกี่ยวข้อง (คลิกเพื่อดูบนหมวก):', 'Related 10-20 electrodes (click to highlight on cap):')}</span>
            <div class="electrode-chip-list">
              ${meta.electrodes.map((name) => `<button type="button" class="chip el-chip ${activeElectrode?.name === name ? 'active' : ''}" data-el="${esc(name)}"><span class="dot" style="--c:${meta.color}"></span>${esc(name)}</button>`).join('')}
            </div>
          </div>
        ` : `<p class="small muted" style="margin:0">${t('โครงสร้างนี้อยู่ลึกใจกลางสมอง จึงไม่ใช้อิเล็กโทรดหนังศีรษะวัดโดยตรง', 'Located deep inside the brain; not directly measured by individual scalp electrodes.')}</p>`}
      </div>

      <div class="info-sections">
        <div class="info-sec">
          <h4>${icon('map')} ${t('ตำแหน่งและกายวิภาค (Anatomy)', 'Anatomy &amp; Location')}</h4>
          <p class="small">${esc(meta.location)}</p>
        </div>
        <div class="info-sec">
          <h4>${icon('zap')} ${t('หน้าที่หลัก (Function)', 'Primary Function')}</h4>
          <p class="small">${esc(meta.function)}</p>
        </div>
        <div class="info-sec">
          <h4>${icon('warn')} ${t('หากเกิดความเสียหาย (Disorders &amp; Damage)', 'Disorders &amp; Damage')}</h4>
          <p class="small">${esc(meta.damage)}</p>
        </div>
      </div>

      ${relatedLessons.length ? `
        <div class="info-lessons">
          <h4 class="small muted">${t('บทเรียนที่เกี่ยวข้องกับสมองส่วนนี้:', 'Related Lessons:')}</h4>
          <div class="info-lesson-links">
            ${relatedLessons.map((l) => `<a href="#/lesson/${l.id}" class="btn sm ghost">${icon('book')} ${t(`ด่าน ${l.id}:`, `Stage ${l.id}:`)} ${esc(l.title)} →</a>`).join('')}
          </div>
        </div>
      ` : ''}
    `;

    rightPanel.querySelectorAll('[data-el]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.el;
        btnCap.setAttribute('aria-pressed', 'true');
        viewer && viewer.selectElectrode(name);
      });
    });

    buildTree(searchInput.value);
  }

  function showIntroModal() {
    const existing = centerStage.querySelector('.explore-intro-overlay');
    if (existing) existing.remove();

    const overlay = h('div', { class: 'explore-intro-overlay', role: 'dialog', 'aria-label': t('แนะนำวิธีใช้สมอง 3 มิติ', '3D Brain Explorer Guide') });
    overlay.innerHTML = `
      <div class="card explore-intro-card">
        <span class="kicker">WELCOME TO 3D BRAIN EXPLORER</span>
        <h3>${t('สำรวจสมอง 3 มิติ &amp; พิกัดอิเล็กโทรด EEG', 'Explore the 3D Brain &amp; 10-20 EEG Electrodes')}</h3>
        <p class="small muted">${t(
          'ออกแบบตามแนวทางเดียวกับ BrainFacts 3D Brain พร้อมเชื่อมโยงตำแหน่งอิเล็กโทรดระบบ 10-20 สำหรับผู้เรียน BCI',
          'Modeled after the BrainFacts 3D Brain, enhanced with an interactive International 10-20 EEG Cap overlay.'
        )}</p>
        <div class="intro-steps">
          <div class="intro-step">
            <span class="badge-num">1</span>
            <div>
              <strong>${t('ลากเพื่อหมุน 360° และซูม', 'Drag to Rotate 360° &amp; Zoom')}</strong>
              <p class="small muted" style="margin:0">${t('ใช้เมาส์ลากหรือใช้นิ้วปัดบนมือถือเพื่อหมุนดูสมองทุกมุม ใช้ลูกกลิ้งเมาส์หรือสองนิ้วถ่างเพื่อซูม', 'Drag with your mouse or swipe on touchscreens to orbit. Scroll or pinch to zoom.')}</p>
            </div>
          </div>
          <div class="intro-step">
            <span class="badge-num">2</span>
            <div>
              <strong>${t('คลิกส่วนสมองเพื่อโฟกัสแบบโปร่งใส', 'Click Any Structure to Focus &amp; Ghost')}</strong>
              <p class="small muted" style="margin:0">${t('คลิกบนก้อนสมองหรือเลือกจากรายชื่อด้านซ้าย ส่วนอื่นจะจางลงเป็นโปร่งใส 15% เพื่อให้เห็นโครงสร้างที่เลือกชัดเจน', 'Click a region on the 3D model or in the left tree. Other structures fade to 15% opacity so internal anatomy stands out.')}</p>
            </div>
          </div>
          <div class="intro-step">
            <span class="badge-num">3</span>
            <div>
              <strong>${t('สวมหมวก EEG 10-20 &amp; ผ่าครึ่งซีก', 'Overlay the 10-20 EEG Cap &amp; Cutaway')}</strong>
              <p class="small muted" style="margin:0">${t('กดปุ่ม "สวมหมวก EEG 10-20" ด้านล่างเพื่อดูว่าอิเล็กโทรด C3, Cz, Pz, Oz วางอยู่เหนือสมองส่วนใด หรือกด "ผ่าครึ่งซีก" เพื่อดูโครงสร้างส่วนลึก', 'Toggle "10-20 EEG Cap" to see where C3, Cz, Pz, and Oz sit, or toggle "Cutaway" to inspect deep limbic nuclei.')}</p>
            </div>
          </div>
        </div>
        <div class="widget-row" style="justify-content:flex-end;margin-top:14px">
          <button type="button" class="btn primary" id="close-intro-btn">${icon('check')} ${t('เริ่มสำรวจสมอง 3D เลย!', 'Start Exploring!')}</button>
        </div>
      </div>
    `;
    overlay.querySelector('#close-intro-btn').addEventListener('click', () => {
      store.flag('brainIntroDone', true);
      overlay.remove();
    });
    centerStage.append(overlay);
  }

  if (introParam === 'true') {
    showIntroModal();
  }
  helpBtn.addEventListener('click', showIntroModal);

  shareBtn.addEventListener('click', () => {
    const url = `${location.origin}${location.pathname}#/explore?focus=${encodeURIComponent(activeId)}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    toast(
      t(
        `คัดลอกลิงก์โฟกัส "${REGION_MAP[activeId]?.nameTh || activeId}" แล้ว!`,
        `Copied link focused on "${REGION_MAP[activeId]?.nameEn || activeId}"!`
      ),
      icon('link')
    );
  });

  searchInput.addEventListener('input', () => buildTree(searchInput.value));

  requestAnimationFrame(() => {
    viewer = createBrainViewer(viewport, {
      mode: 'explorer',
      initialFocus,
      initialCap: false,
      onSelectRegion(meta) {
        updatePanels(meta);
      },
      onSelectElectrode(e) {
        activeElectrode = e;
        btnCap.setAttribute('aria-pressed', 'true');
        updatePanels(REGION_MAP[e.region] || REGION_MAP.brain);
      },
      onHover(info) {
        if (!info) {
          hoverTip.style.display = 'none';
          return;
        }
        hoverTip.style.display = 'block';
        hoverTip.style.left = `${info.x}px`;
        hoverTip.style.top = `${info.y}px`;
        hoverTip.innerHTML = `${esc(info.titleTh)}<span class="en">${esc(info.titleEn)}</span>`;
      },
    });
    viewer.tryLoadExternalGLB();
    cleanups.push(() => viewer.dispose());
  });

  btnReset.addEventListener('click', () => {
    activeElectrode = null;
    btnExplode.setAttribute('aria-pressed', 'false');
    btnCut.setAttribute('aria-pressed', 'false');
    btnHide.setAttribute('aria-pressed', 'false');
    viewer && viewer.resetView();
  });

  btnPalette.addEventListener('click', () => {
    if (!viewer) return;
    const mode = viewer.setColorMode();
    btnPalette.setAttribute('aria-pressed', mode === 'lobes' ? 'true' : 'false');
  });

  btnCap.addEventListener('click', () => {
    if (!viewer) return;
    const on = viewer.setEEGCap();
    btnCap.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  btnCut.addEventListener('click', () => {
    if (!viewer) return;
    const on = viewer.setCutaway();
    btnCut.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) {
      toast(
        t(
          'เปิดโหมดผ่าครึ่งซีก: คลิกดูโครงสร้างส่วนลึกอย่าง Thalamus และ Hippocampus ได้เลย!',
          'Sagittal Cutaway enabled: Click deep structures like the Thalamus and Hippocampus inside!'
        ),
        icon('half')
      );
    }
  });

  btnExplode.addEventListener('click', () => {
    if (!viewer) return;
    const next = !viewer.getExplode();
    viewer.setExplode(next ? 1 : 0);
    btnExplode.setAttribute('aria-pressed', next ? 'true' : 'false');
  });

  btnHide.addEventListener('click', () => {
    if (!viewer || activeId === 'brain') return;
    viewer.toggleHideRegion(activeId);
    updatePanels(REGION_MAP[activeId]);
  });

  updatePanels(REGION_MAP[initialFocus] || REGION_MAP.brain);

  return () => {
    cleanups.forEach((fn) => { try { fn(); } catch {} });
  };
}
