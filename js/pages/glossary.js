// Searchable BCI & EEG Glossary Page (Bilingual TH/EN).
import { h, esc } from '../util.js';
import { t } from '../i18n.js';
import { icon } from '../ui/icons.js';
import { GLOSSARY, GLOSSARY_CATEGORIES } from '../data/glossary.js';

export function render(main) {
  main.innerHTML = '';

  const page = h('div', { class: 'wrap page glossary-page' });
  page.innerHTML = `
    <header class="page-head">
      <span class="kicker">${t('GLOSSARY · คลังคำศัพท์ BCI &amp; EEG', 'GLOSSARY · BCI &amp; EEG TERMINOLOGY')}</span>
      <h1>${t('พจนานุกรมคำศัพท์คลื่นสมองและ BCI', 'BCI &amp; EEG Interactive Glossary')}</h1>
      <p class="lead">${t(
        'พิมพ์ค้นหาได้ทั้งภาษาไทยและภาษาอังกฤษ เช่น <code>P300</code>, <code>Impedance</code>, <code>ERD</code>, <code>10-20</code> หรือเลือกกรองตามหมวดหมู่',
        'Search instantly by keyword such as <code>P300</code>, <code>Impedance</code>, <code>ERD</code>, <code>10-20</code>, or filter by category below.'
      )}</p>
    </header>
  `;

  const controls = h('div', { class: 'glossary-controls card flat' });
  const searchBox = h('div', { class: 'search glossary-search' });
  searchBox.innerHTML = `${icon('search')}<input type="search" placeholder="${t('ค้นหาคำศัพท์ เช่น Alpha, CSP, อิมพีแดนซ์, กะพริบตา...', 'Search terms e.g. Alpha, CSP, Impedance, EOG...')}" aria-label="${t('ค้นหาคำศัพท์', 'Search glossary')}">`;
  const input = searchBox.querySelector('input');

  const catSeg = h('div', { class: 'seg', role: 'group', 'aria-label': t('หมวดหมู่คำศัพท์', 'Glossary categories') });
  let activeCat = 'all';
  for (const c of GLOSSARY_CATEGORIES) {
    const b = h('button', {
      type: 'button',
      'aria-pressed': c.id === activeCat ? 'true' : 'false',
      onclick: () => {
        activeCat = c.id;
        catSeg.querySelectorAll('button').forEach((btn) => btn.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        updateList();
      },
    }, c.label);
    catSeg.append(b);
  }
  controls.append(searchBox, catSeg);
  page.append(controls);

  const countLine = h('p', { class: 'small muted', style: { margin: '14px 0' } });
  const grid = h('div', { class: 'glossary-grid' });
  page.append(countLine, grid);

  function updateList() {
    const q = input.value.trim().toLowerCase();
    const items = GLOSSARY.filter((item) => {
      if (activeCat !== 'all' && item.cat !== activeCat) return false;
      if (!q) return true;
      return (
        item.term.toLowerCase().includes(q) ||
        item.th.toLowerCase().includes(q) ||
        item.def.toLowerCase().includes(q)
      );
    });

    countLine.textContent = t(
      `แสดง ${items.length} จาก ${GLOSSARY.length} คำศัพท์`,
      `Showing ${items.length} of ${GLOSSARY.length} terms`
    );
    grid.innerHTML = '';

    if (!items.length) {
      grid.append(
        h('div', {
          class: 'card flat',
          html: `<p style="margin:0">${t(
            `ไม่พบคำศัพท์ที่ตรงกับ "<strong>${esc(input.value)}</strong>" ลองค้นหาด้วยคำอื่นดูนะ`,
            `No terms matching "<strong>${esc(input.value)}</strong>". Try another keyword.`
          )}</p>`,
        })
      );
      return;
    }

    const catLabelMap = Object.fromEntries(GLOSSARY_CATEGORIES.map((c) => [c.id, c.label]));
    for (const item of items) {
      const card = h('article', { class: 'card glossary-card' });
      card.innerHTML = `
        <div class="glossary-card-top">
          <span class="chip">${esc(catLabelMap[item.cat] || item.cat)}</span>
          ${item.lesson ? `<a href="#/lesson/${item.lesson}" class="chip" style="text-decoration:none"><span class="dot" style="--c:var(--coral)"></span>${t(`ด่านที่ ${item.lesson} →`, `Stage ${item.lesson} →`)}</a>` : ''}
        </div>
        <h3>${esc(item.term)}</h3>
        <p class="glossary-th">${esc(item.th)}</p>
        <p class="small muted" style="margin:0">${esc(item.def)}</p>
      `;
      grid.append(card);
    }
  }

  input.addEventListener('input', updateList);
  updateList();

  main.append(page);
  return () => {};
}
