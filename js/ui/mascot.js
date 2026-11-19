// "นิวโรน้อย" (Neuro-noi) — the site's one and only mascot: a cartoon neuron.
import { h } from '../util.js';

const MOUTHS = {
  idle: '<path d="M52 70c4 4 12 4 16 0" stroke="#1F2A44" stroke-width="3" fill="none" stroke-linecap="round"/>',
  happy: '<path d="M49 67c2 10 20 10 22 0Z" fill="#1F2A44" stroke="#1F2A44" stroke-width="2.5" stroke-linejoin="round"/><path d="M54 73c3 2 9 2 12 0" stroke="#FF8FA3" stroke-width="3" stroke-linecap="round"/>',
  think: '<ellipse cx="64" cy="71" rx="3.2" ry="3.6" fill="#1F2A44"/>',
  oops: '<path d="M50 72c3-3 5 3 8 0s5 3 8 0 4 2 5 1" stroke="#1F2A44" stroke-width="3" fill="none" stroke-linecap="round"/>',
};

const EXTRAS = {
  idle: '',
  happy: '<path d="M18 22l3 6M14 33l6 1M27 15l1 6" stroke="#F2B632" stroke-width="3" stroke-linecap="round"/>',
  think: '<path d="M44 46c3-3 7-3 9-1M67 44c3-2 7-1 9 2" stroke="#1F2A44" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="95" cy="20" r="3" fill="#fff" stroke="#1F2A44" stroke-width="2"/><circle cx="104" cy="11" r="4.5" fill="#fff" stroke="#1F2A44" stroke-width="2"/>',
  oops: '<path d="M86 42c-3 5-3 8 0 9.5 3-1.5 3-4.5 0-9.5Z" fill="#9BD3F0" stroke="#1F2A44" stroke-width="2"/>',
};

const EYES = {
  idle: [[50, 58], [70, 58]],
  happy: [[50, 57], [70, 57]],
  think: [[52, 55], [72, 55]],
  oops: [[50, 59], [70, 59]],
};

export function mascotSVG(mood = 'idle') {
  const [[lx, ly], [rx, ry]] = EYES[mood] || EYES.idle;
  const happyEyes = mood === 'happy';
  const eye = (x, y) => happyEyes
    ? `<path d="M${x - 5} ${y + 2}c2-5 8-5 10 0" stroke="#1F2A44" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
    : `<g class="blink"><ellipse cx="${x}" cy="${y}" rx="4.6" ry="5.6" fill="#1F2A44"/><circle cx="${x + 1.6}" cy="${y - 2}" r="1.6" fill="#fff"/></g>`;

  return `<svg viewBox="0 0 120 120" role="img" aria-label="นิวโรน้อย">
  <g stroke="#1F2A44" stroke-width="5" stroke-linecap="round" fill="none">
    <path d="M40 40 28 26M28 26l-9 2M28 26l-2-10"/>
    <path d="M60 30V14M60 14l-7-6M60 14l7-6"/>
    <path d="M80 40l12-12M92 28l9 1M92 28l1-9"/>
    <path d="M34 66 18 70M18 70l-7-5M18 70l-5 7"/>
    <path d="M78 80l10 10q6 6 12 8"/>
  </g>
  <g stroke="#1F2A44" stroke-width="2.4">
    <rect x="86" y="86" width="9" height="7" rx="3" fill="#1FA39A" transform="rotate(42 90 90)"/>
    <rect x="97" y="95" width="9" height="7" rx="3" fill="#1FA39A" transform="rotate(25 101 98)"/>
  </g>
  <g stroke="#1F2A44" stroke-width="3.5" stroke-linecap="round" fill="none">
    <path d="M106 99l7-4M106 99l6 6M106 99l2 9"/>
  </g>
  <circle cx="60" cy="62" r="28" fill="#FF8A6B" stroke="#1F2A44" stroke-width="3.2"/>
  <path d="M42 48c4-7 11-11 18-11" stroke="#FFC2AF" stroke-width="4" fill="none" stroke-linecap="round"/>
  <ellipse cx="41" cy="68" rx="5" ry="3.2" fill="#FF5D7A" opacity=".45"/>
  <ellipse cx="79" cy="68" rx="5" ry="3.2" fill="#FF5D7A" opacity=".45"/>
  ${eye(lx, ly)}${eye(rx, ry)}
  ${MOUTHS[mood] || MOUTHS.idle}
  ${EXTRAS[mood] || ''}
</svg>`;
}

/** Create a mascot element. anim: 'bob' | 'cheer' | 'shake' | '' */
export function mascot(mood = 'idle', anim = 'bob') {
  return h('div', { class: `mascot ${anim}`, html: mascotSVG(mood) });
}

/**
 * Mascot + speech bubble. Returns { el, say(text, mood, anim) }.
 */
export function buddy(text = '', mood = 'idle') {
  const m = mascot(mood);
  const b = h('div', { class: 'bubble' });
  b.innerHTML = text;
  const wrap = h('div', { class: 'buddy' }, m, b);
  return {
    el: wrap,
    say(t, md = 'idle', anim = '') {
      m.innerHTML = mascotSVG(md);
      m.className = `mascot ${anim || 'bob'}`;
      // restart bubble animation
      b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
      b.innerHTML = t;
    },
  };
}
