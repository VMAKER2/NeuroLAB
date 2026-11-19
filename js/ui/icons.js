// Hand-tuned line icons (24×24, 2.2px round strokes). No emoji anywhere.
const P = {
  brain: '<path d="M9 4.5a3 3 0 0 0-3 3v.2A3.2 3.2 0 0 0 3.5 11a3.3 3.3 0 0 0 1.2 2.6A3.2 3.2 0 0 0 6.5 18 3 3 0 0 0 12 19.5V6a2.5 2.5 0 0 0-3-1.5Z"/><path d="M15 4.5a3 3 0 0 1 3 3v.2a3.2 3.2 0 0 1 2.5 3.3 3.3 3.3 0 0 1-1.2 2.6A3.2 3.2 0 0 1 17.5 18 3 3 0 0 1 12 19.5"/><path d="M8.5 10.5c1 .2 1.8 1 2 2M15.5 10.5c-1 .2-1.8 1-2 2M9 15.5h1.5M15 15.5h-1.5"/>',
  wave: '<path d="M2 12h3l2-6 3 12 3-9 2 5 2-2h5"/>',
  cap: '<path d="M4 15a8 8 0 0 1 16 0"/><path d="M4 15h16"/><circle cx="12" cy="7" r="1.2"/><circle cx="7.5" cy="9.5" r="1.2"/><circle cx="16.5" cy="9.5" r="1.2"/><circle cx="12" cy="11.5" r="1.2"/><path d="M12 15v4M8 15v2.5M16 15v2.5"/>',
  play: '<path d="M7 5.5v13l11-6.5-11-6.5Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
  eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.6 6.7A16.7 16.7 0 0 0 2.5 12s3.5 6.5 9.5 6.5a9.3 9.3 0 0 0 4.4-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  explode: '<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M4 4l3 3M20 4l-3 3M4 20l3-3M20 20l-3-3"/><path d="M4 4h3M4 4v3M20 4h-3M20 4v3M4 20h3M4 20v-3M20 20h-3M20 20v-3"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  arrowRight: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8L12 3Z"/>',
  flame: '<path d="M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.6 3-5.6 3.6-9.3 2.3 1.4 3.4 3.4 3.4 5.3 1-.6 1.8-1.7 2-3 2.3 1.9 4 4.4 4 7 0 3.5-2.5 6.2-6.5 6.2Z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 21H20"/><path d="M8.5 7.5h7"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/>',
  warn: '<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17.5v.2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.2"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  zap: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12l1-8Z"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11V4a1.5 1.5 0 0 1 3 0v7"/><path d="M14 11V5.5a1.5 1.5 0 0 1 3 0V13"/><path d="M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L3.7 15a1.6 1.6 0 0 1 2.5-2L8 15"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>',
  drag: '<path d="M12 3v18M3 12h18M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5"/>',
  zoom: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8M10.5 7.5v6M7.5 10.5h6"/>',
  click: '<path d="M9 9l11 4-4.6 1.4L14 19l-5-10Z"/><path d="M5 3.5 6.3 6M2.5 8.5 5 9M10 2.5 9.5 5"/>',
  half: '<path d="M12 3a9 9 0 1 0 0 18V3Z"/><path d="M12 3a9 9 0 0 1 0 18" stroke-dasharray="2.5 2.5"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.3-1.6-1.3-2.8 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10" cy="7" r="1.1"/><circle cx="15" cy="7.5" r="1.1"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 20h14"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
  map: '<path d="m9 4-6 2.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z"/><path d="M9 4v13.5M15 6.5V20"/>',
};

/** icon('brain', 'extra-class') → inline SVG string */
export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

/** Hand-drawn squiggle used as a section divider. */
export const scribble = `<svg class="divider-scribble" viewBox="0 0 140 14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M2 8c8-6 14 6 22 0s14-6 22 0 14 6 22 0 14-6 22 0 14 6 22 0 14-6 22 0"/></svg>`;

/** Hand-drawn arrow (points right by default). */
export const handArrow = `<svg viewBox="0 0 80 40" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 28c14-14 34-18 66-12"/><path d="M58 7l12 9-13 7"/></svg>`;
