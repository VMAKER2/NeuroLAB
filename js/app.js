// Main SPA Router & Top-bar controller for NeuroLAB (Bilingual TH / EN).
import { $, $$ } from './util.js';
import { getLang, toggleLang, t } from './i18n.js';
import { store } from './store.js';
import * as homePage from './pages/home.js';
import * as explorePage from './pages/explore.js';
import * as lessonPage from './pages/lesson.js';
import * as glossaryPage from './pages/glossary.js';

let currentCleanup = null;

function parseRoute() {
  const raw = location.hash.slice(1) || '/';
  if (raw.includes('focus=') && !raw.startsWith('/')) {
    const sp = new URLSearchParams(raw.replace(/^\?/, ''));
    return { page: 'explore', params: Object.fromEntries(sp.entries()) };
  }

  const [pathPart, queryPart] = raw.split('?');
  const params = Object.fromEntries(new URLSearchParams(queryPart || '').entries());
  const segs = pathPart.split('/').filter(Boolean);

  if (segs.length === 0) return { page: 'home', params };
  if (segs[0] === 'explore') return { page: 'explore', params };
  if (segs[0] === 'lesson') return { page: 'lesson', params: { id: segs[1] || '1', ...params } };
  if (segs[0] === 'playground') return { page: 'playground', params };
  if (segs[0] === 'glossary') return { page: 'glossary', params };
  return { page: 'home', params };
}

function updateStatsUI(reason) {
  const st = store.get();
  const xpEl = $('#stat-xp-val');
  const streakEl = $('#stat-streak-val');
  const streakLbl = $('#stat-streak-lbl');
  if (xpEl) xpEl.textContent = `${st.xp} XP`;
  if (streakEl) streakEl.textContent = `${st.streak?.count || 1}`;
  if (streakLbl) streakLbl.textContent = t('วัน', 'd');
  if (reason === 'lesson-done' || reason === 'bonus') {
    const badge = $('.stat.xp');
    if (badge) {
      badge.classList.remove('bump');
      void badge.offsetWidth;
      badge.classList.add('bump');
    }
  }
}

function updateStaticChromeLanguage() {
  const lang = getLang();
  document.title = t(
    'NeuroLAB — เรียนรู้ BCI & คลื่นสมอง EEG แบบ Interactive ตั้งแต่ศูนย์',
    'NeuroLAB — Interactive BCI & EEG Learning Lab from Scratch'
  );
  const skip = $('#skip-link');
  if (skip) skip.textContent = t('ข้ามไปยังเนื้อหาหลัก', 'Skip to main content');

  $$('#main-nav a').forEach((a) => {
    const label = lang === 'en' ? a.dataset.i18nEn : a.dataset.i18nTh;
    if (label) a.innerHTML = label;
  });

  const langLabel = $('#lang-toggle-label');
  if (langLabel) {
    langLabel.innerHTML = lang === 'en'
      ? '<span style="opacity:.55">TH</span> · <strong style="color:var(--coral)">EN</strong>'
      : '<strong style="color:var(--coral)">TH</strong> · <span style="opacity:.55">EN</span>';
  }

  const fTitle = $('#footer-title');
  if (fTitle) {
    fTitle.innerHTML = t(
      'NeuroLAB — สมุดแล็บออนไลน์เพื่อการเรียนรู้ BCI &amp; EEG',
      'NeuroLAB — Interactive Online Lab Book for BCI &amp; EEG'
    );
  }
  const fDesc = $('#footer-desc');
  if (fDesc) {
    fDesc.textContent = t(
      'ออกแบบเพื่อให้นักเรียนและนักศึกษาไทยเริ่มต้นเรียนรู้ Brain-Computer Interface ตั้งแต่พื้นฐานประสาทวิทยาศาสตร์จนถึง MNE-Python',
      'Designed to help students learn Brain-Computer Interfaces from foundational neuroscience and 10-20 EEG to MNE-Python.'
    );
  }
  const fGloss = $('#footer-glossary-link');
  if (fGloss) fGloss.textContent = t('คลังคำศัพท์', 'Glossary');

  updateStatsUI();
}

async function route({ keepScroll = false } = {}) {
  const prevScroll = window.scrollY;
  if (typeof currentCleanup === 'function') {
    try { currentCleanup(); } catch (e) { console.error(e); }
    currentCleanup = null;
  }

  const { page, params } = parseRoute();
  const main = $('#app-main');
  if (!main) return;

  $$('.nav a').forEach((a) => {
    const navPage = a.dataset.page;
    if (navPage === page) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  $('.nav')?.classList.remove('open');

  if (!keepScroll) {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  if (page === 'home') {
    currentCleanup = homePage.render(main, params);
  } else if (page === 'explore') {
    currentCleanup = explorePage.render(main, params);
  } else if (page === 'lesson') {
    currentCleanup = lessonPage.render(main, params);
  } else if (page === 'glossary') {
    currentCleanup = glossaryPage.render(main, params);
  } else if (page === 'playground') {
    try {
      const pgMod = await import('./pages/playground.js');
      currentCleanup = pgMod.render(main, params);
    } catch (err) {
      console.error('Playground load error:', err);
      main.innerHTML = `<div class="wrap page"><div class="card"><p>${t('กำลังโหลดห้องทดลอง EEG...', 'Loading EEG Playground...')}</p></div></div>`;
    }
  }

  if (keepScroll) {
    requestAnimationFrame(() => window.scrollTo({ top: prevScroll, behavior: 'instant' }));
  }
}

function init() {
  store.touch();
  updateStaticChromeLanguage();
  window.addEventListener('store:change', (e) => updateStatsUI(e.detail?.reason));

  const langBtn = $('#lang-toggle-btn');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      toggleLang();
    });
  }

  window.addEventListener('lang:change', () => {
    updateStaticChromeLanguage();
    route({ keepScroll: true });
  });

  const menuBtn = $('#menu-btn');
  const nav = $('#main-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }

  window.addEventListener('hashchange', () => route({ keepScroll: false }));
  route({ keepScroll: false });
}

init();
