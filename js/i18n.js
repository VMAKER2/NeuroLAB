// Language switcher & bilingual helper for NeuroLAB (TH / EN).
// Preserves 100% of original Thai text when lang === 'th', and provides full English when lang === 'en'.

const LANG_KEY = 'neurolab:lang';

let currentLang = 'th';
try {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'en' || saved === 'th') currentLang = saved;
  if (typeof location !== 'undefined') {
    if (/[?&]lang=en\b/.test(location.href)) currentLang = 'en';
    else if (/[?&]lang=th\b/.test(location.href)) currentLang = 'th';
  }
} catch {
  /* ignore storage errors */
}

if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.lang = currentLang;
}

export function getLang() {
  return currentLang;
}

export function isEn() {
  return currentLang === 'en';
}

export function setLang(lang) {
  const next = lang === 'en' ? 'en' : 'th';
  if (next === currentLang) return currentLang;
  currentLang = next;
  try {
    localStorage.setItem(LANG_KEY, currentLang);
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = currentLang;
  }
  window.dispatchEvent(new CustomEvent('lang:change', { detail: { lang: currentLang } }));
  return currentLang;
}

export function toggleLang() {
  return setLang(currentLang === 'th' ? 'en' : 'th');
}

/** Return Thai or English value based on current language. */
export function t(th, en) {
  return currentLang === 'en' && en !== undefined ? en : th;
}

/** Pick `obj[field + 'En']` when in English mode (falling back to `obj[field]`). */
export function pick(obj, field) {
  if (!obj) return '';
  if (currentLang === 'en' && obj[field + 'En'] !== undefined) {
    return obj[field + 'En'];
  }
  return obj[field];
}

/**
 * Make an object's properties dynamically resolve to their `*En` (or `en`) counterparts
 * whenever `currentLang === 'en'`, while returning the exact original Thai values when `currentLang === 'th'`.
 */
export function bilingual(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const raw = { ...obj };
  for (const key of Object.keys(raw)) {
    if (key === 'th' && raw.en !== undefined) {
      Object.defineProperty(obj, 'th', {
        enumerable: true,
        get: () => (currentLang === 'en' ? raw.en : raw.th),
      });
    } else if (key === 'nameTh' && raw.nameEn !== undefined) {
      Object.defineProperty(obj, 'nameTh', {
        enumerable: true,
        get: () => (currentLang === 'en' ? raw.nameEn : raw.nameTh),
      });
    } else if (!key.endsWith('En') && raw[key + 'En'] !== undefined) {
      const thVal = raw[key];
      const enVal = raw[key + 'En'];
      Object.defineProperty(obj, key, {
        enumerable: true,
        get: () => (currentLang === 'en' ? enVal : thVal),
      });
    }
  }
  return obj;
}
