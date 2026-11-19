// Progress store (localStorage). Emits `store:change` on window.
const KEY = 'neurolab:v1';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function load() {
  try {
    return { xp: 0, done: {}, best: {}, streak: { count: 0, last: null }, flags: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { xp: 0, done: {}, best: {}, streak: { count: 0, last: null }, flags: {} };
  }
}

let state = load();

function save(reason) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent('store:change', { detail: { reason, state } }));
}

export const store = {
  get: () => state,

  /** Mark a day of activity; keeps a daily streak. */
  touch() {
    const t = today();
    if (state.streak.last === t) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    state.streak = { count: state.streak.last === yStr ? state.streak.count + 1 : 1, last: t };
    save('streak');
  },

  addXP(n, reason = 'xp') {
    state.xp += n;
    save(reason);
  },

  isDone: (id) => !!state.done[id],

  /** Record a quiz result; first pass awards XP. Returns true if newly completed. */
  completeLesson(id, score, total) {
    const prev = state.best[id] || 0;
    state.best[id] = Math.max(prev, score / total);
    const fresh = !state.done[id];
    if (fresh) {
      state.done[id] = Date.now();
      state.xp += 50 + score * 10;
    }
    save(fresh ? 'lesson-done' : 'lesson-retry');
    return fresh;
  },

  flag(name, value) {
    if (value === undefined) return state.flags[name];
    state.flags[name] = value;
    save('flag');
  },

  /** Widgets may award a one-time bonus for discovering something. */
  bonus(key, n = 10) {
    const k = `bonus:${key}`;
    if (state.flags[k]) return false;
    state.flags[k] = true;
    state.xp += n;
    save('bonus');
    return true;
  },

  reset() {
    state = { xp: 0, done: {}, best: {}, streak: { count: 0, last: null }, flags: {} };
    save('reset');
  },
};
