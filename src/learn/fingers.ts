// Which finger presses which key (standard touch typing on a US-layout
// keyboard, which is where Bijoy's letters sit), and the hands drawing.

export type Finger = 'lp' | 'lr' | 'lm' | 'li' | 'ri' | 'rm' | 'rr' | 'rp' | 'th';

export const FINGER_NAME: Record<Finger, string> = {
  lp: 'left little finger', lr: 'left ring finger', lm: 'left middle finger', li: 'left index finger',
  ri: 'right index finger', rm: 'right middle finger', rr: 'right ring finger', rp: 'right little finger', th: 'thumb',
};

// each keyboard row, unshifted then shifted, with the finger for each key
const ROWS: [string, string, Finger[]][] = [
  ['`1234567890-=', '~!@#$%^&*()_+', ['lp', 'lp', 'lr', 'lm', 'li', 'li', 'ri', 'ri', 'rm', 'rr', 'rp', 'rp', 'rp']],
  ['qwertyuiop[]\\', 'QWERTYUIOP{}|', ['lp', 'lr', 'lm', 'li', 'li', 'ri', 'ri', 'rm', 'rr', 'rp', 'rp', 'rp', 'rp']],
  ["asdfghjkl;'", 'ASDFGHJKL:"', ['lp', 'lr', 'lm', 'li', 'li', 'ri', 'ri', 'rm', 'rr', 'rp', 'rp']],
  ['zxcvbnm,./', 'ZXCVBNM<>?', ['lp', 'lr', 'lm', 'li', 'li', 'ri', 'ri', 'rm', 'rr', 'rp']],
];

const FINGER = new Map<string, Finger>([[' ', 'th']]);
const SHIFTED = new Set<string>();
const BASE = new Map<string, string>(); // shifted character -> its key's unshifted character
for (const [lo, hi, f] of ROWS) {
  [...lo].forEach((c, i) => { FINGER.set(c, f[i]); BASE.set(c, c); });
  [...hi].forEach((c, i) => { FINGER.set(c, f[i]); SHIFTED.add(c); BASE.set(c, lo[i]); });
}

export const fingerFor = (key: string): Finger => FINGER.get(key) ?? 'th';
export const needsShift = (key: string) => SHIFTED.has(key);
/** The physical key a character is on (its unshifted character). */
export const physicalKey = (key: string) => BASE.get(key) ?? key;
/** Shift is pressed by the little finger of the other hand. */
export const shiftFinger = (key: string): Finger => (fingerFor(key).startsWith('l') ? 'rp' : 'lp');
export const handOf = (f: Finger) => (f === 'th' ? 'both thumbs' : f.startsWith('l') ? 'left hand' : 'right hand');

/** Every key this keyboard row data knows about (for tests). */
export const ALL_KEYS = ROWS.flatMap(([lo, hi]) => [...lo, ...hi]);

/** Two hands seen from above, fingers pointing at the keyboard. */
export function handsSvg(): string {
  // one hand: little, ring, middle, index (left to right) and a thumb
  const fingers = [
    { x: 14, top: 44, h: 56 }, { x: 44, top: 22, h: 78 }, { x: 75, top: 12, h: 88 }, { x: 106, top: 24, h: 76 },
  ];
  const hand = (ids: Finger[], thumb: string) => `
    <rect class="palm" x="8" y="86" width="128" height="58" rx="28"/>
    ${fingers.map((f, i) => `<rect class="fing f-${ids[i]}" x="${f.x}" y="${f.top}" width="25" height="${f.h}" rx="12.5"/>`).join('')}
    <rect class="fing f-th ${thumb}" x="132" y="86" width="24" height="56" rx="12" transform="rotate(-38 144 114)"/>`;
  return `<svg class="hands" viewBox="0 0 380 150" role="img" aria-label="Which finger to use">
    <g class="hand left">${hand(['lp', 'lr', 'lm', 'li'], 'lt')}</g>
    <g class="hand right" transform="translate(380 0) scale(-1 1)">${hand(['rp', 'rr', 'rm', 'ri'], 'rt')}</g>
  </svg>`;
}

/** Light up the fingers for a key (and the Shift finger when needed). */
export function showFinger(svg: Element | null, key: string | null) {
  if (!svg) return;
  svg.querySelectorAll('.fing.on').forEach(el => el.classList.remove('on'));
  if (!key) return;
  const f = fingerFor(key);
  svg.querySelectorAll(f === 'th' ? '.f-th' : `.f-${f}`).forEach(el => el.classList.add('on'));
  if (needsShift(key)) svg.querySelectorAll(`.f-${shiftFinger(key)}`).forEach(el => el.classList.add('on'));
}
