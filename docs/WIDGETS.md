# NeuroLAB — Widget contract (for contributors)

Static site, **no build step**. Plain ES modules served by `python -m http.server 5173` from the repo root.
Three.js is available through the import map (`import * as THREE from 'three'`), but lesson widgets should
prefer SVG / Canvas 2D.

## Contract

Each lesson toy lives in `js/widgets/<id>.js` and default-exports a mount function:

```js
export default function mount(root, ctx) {
  // root = the .widget-body element (empty). Build all UI inside it.
  // ctx.say(html, mood)          → mascot speech bubble under the widget. mood: 'idle'|'happy'|'think'|'oops'
  // ctx.discover(key, html)      → one-time "aha!" moment: awards bonus XP once + mascot cheers
  // ctx.lessonId                 → string
  return () => { /* cleanup: stop rAF loops, timers, listeners, ResizeObservers */ };
}
```

Test any widget in isolation: `http://localhost:5173/dev/widget.html?w=<id>`

## Helpers you should reuse

| Module | What |
|---|---|
| `js/util.js` | `h()` element builder, `el()` html→element, `clamp/lerp/smoothstep`, `loop(fn)` rAF loop returning stop(), `seeded()` PRNG, `toast()` |
| `js/ui/icons.js` | `icon(name)` inline SVG line icons (no emoji!) |
| `js/ui/mascot.js` | `mascot(mood)`, `buddy(text, mood)` |
| `js/ui/head2d.js` | `headTop({ onPick, only, labels })` top-view head with 10-20 electrodes, `paintTopomap(head, values)`, `toSvg(xy)` |
| `js/data/electrodes.js` | `ELECTRODES`, `byName`, `LETTERS`, `OLD_NAMES` |
| `js/signal/dsp.js` | `EEGSynth`, `BandOscillator`, `pinkNoise`, `gaussian`, `shapes` (blink/emg/ecg/p300), `designFilter`, `FilterChain`, `filtfilt`, `freqResponse`, `spectrum`, `welch`, `bandPower`, `BANDS`, `rms` |
| `js/signal/plot.js` | `fitCanvas`, `drawGrid`, `drawTrace`, `drawSpectrum`, `Scope` (scrolling multi-channel) |

## CSS

Use existing classes from `css/components.css`: `.btn` (`.primary .teal .mustard .sm .ghost .icon`, `aria-pressed`),
`.seg` segmented buttons, `.switch`, `input[type=range]` (already styled), `.field`, `.ctl-label` + `<output>`,
`.chip`, `.callout`, `.readout`, `.scope` (canvas class), `.widget-row`, `.widget-grid`, `.card`, `.kbd`.

Widget-specific CSS: group A → `css/widgets-a.css`, group B → `css/widgets-b.css`.
Prefix classes with the widget id short name, e.g. `.ap-axon`, `.p3-grid`.

Design rules (strict):
- Light, warm paper look. Tokens in `css/tokens.css` (`--ink`, `--coral`, `--teal`, `--mustard`, `--lilac`, `--paper`, ...).
- Ink outlines (2px `--ink`), hard offset shadows, tactile press feel.
- NO dark backgrounds, NO neon glow, NO purple-blue gradients, NO glassmorphism, NO emoji.
- All UI text in Thai, technical terms in English in parentheses on first use. Friendly, short sentences.
- Must work on mobile (≥ 360px wide) and with keyboard. Respect `prefers-reduced-motion`.
- Scientific accuracy matters.
