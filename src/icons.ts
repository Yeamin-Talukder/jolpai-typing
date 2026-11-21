// Line icons drawn for Jolpai Typing: 24px grid, 2px rounded strokes in the
// current text colour, so they follow every theme.

const PATHS = {
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  words: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  passage: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  lessons: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  exam: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  chart: '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-3"/>',
  restart: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5M15 12H3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  pointer: '<path d="m4 4 7 17 2.5-7.5L21 11z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  cloud: '<path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.5 12.5 3.5 3.5 0 0 0 6 19z"/>',
  device: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h7v-4"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-5-4-7-5-11-2 2-3 4-3 6-1-1-2-2-2-4-2 2-4 5-4 9 0 4 3 7 7 7z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  font: '<path d="M4 20 10 4h1l6 16M6.5 14h8"/><path d="M17 20h4"/>',
  cursor: '<path d="M9 4h6M9 20h6M12 4v16"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="M12 8v4M12 16h.01"/>',
  backspace: '<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m12 9 6 6M18 9l-6 6"/>',
  gauge: '<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
  bar: '<path d="M3 12h18"/><path d="M3 12h9" stroke-width="4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16" cy="10" r="1.2"/><path d="M12 21a2 2 0 0 1 0-4h2a3 3 0 0 0 3-3"/>',
} as const;

export type IconName = keyof typeof PATHS;

/** The Jolpai Typing mark: a keyboard with its keys cut out, an olive for the lit key, and a jolpai leaf. */
const LOGO_INNER = '<path class="lg-board" fill-rule="evenodd" d="M7.2 9H24.8A5.2 5.2 0 0 1 30 14.2V23.8A5.2 5.2 0 0 1 24.8 29H7.2A5.2 5.2 0 0 1 2 23.8V14.2A5.2 5.2 0 0 1 7.2 9ZM6.2 12.6H7.4A1 1 0 0 1 8.4 13.6V14.8A1 1 0 0 1 7.4 15.8H6.2A1 1 0 0 1 5.2 14.8V13.6A1 1 0 0 1 6.2 12.6ZM10.8 12.6H12A1 1 0 0 1 13 13.6V14.8A1 1 0 0 1 12 15.8H10.8A1 1 0 0 1 9.8 14.8V13.6A1 1 0 0 1 10.8 12.6ZM15.4 12.6H16.6A1 1 0 0 1 17.6 13.6V14.8A1 1 0 0 1 16.6 15.8H15.4A1 1 0 0 1 14.4 14.8V13.6A1 1 0 0 1 15.4 12.6ZM20 12.6H21.2A1 1 0 0 1 22.2 13.6V14.8A1 1 0 0 1 21.2 15.8H20A1 1 0 0 1 19 14.8V13.6A1 1 0 0 1 20 12.6ZM24.6 12.6H25.8A1 1 0 0 1 26.8 13.6V14.8A1 1 0 0 1 25.8 15.8H24.6A1 1 0 0 1 23.6 14.8V13.6A1 1 0 0 1 24.6 12.6ZM6.2 17.4H7.4A1 1 0 0 1 8.4 18.4V19.6A1 1 0 0 1 7.4 20.6H6.2A1 1 0 0 1 5.2 19.6V18.4A1 1 0 0 1 6.2 17.4ZM10.8 17.4H12A1 1 0 0 1 13 18.4V19.6A1 1 0 0 1 12 20.6H10.8A1 1 0 0 1 9.8 19.6V18.4A1 1 0 0 1 10.8 17.4ZM20 17.4H21.2A1 1 0 0 1 22.2 18.4V19.6A1 1 0 0 1 21.2 20.6H20A1 1 0 0 1 19 19.6V18.4A1 1 0 0 1 20 17.4ZM24.6 17.4H25.8A1 1 0 0 1 26.8 18.4V19.6A1 1 0 0 1 25.8 20.6H24.6A1 1 0 0 1 23.6 19.6V18.4A1 1 0 0 1 24.6 17.4ZM10.6 22.2H21.4A1 1 0 0 1 22.4 23.2V24.2A1 1 0 0 1 21.4 25.2H10.6A1 1 0 0 1 9.6 24.2V23.2A1 1 0 0 1 10.6 22.2ZM13.6 19A2.4 2.4 0 1 0 18.4 19A2.4 2.4 0 1 0 13.6 19Z"/><g class="lg-taps"><rect class="lg-tap" style="--k:7" x="5.7" y="13.1" width="2.2" height="2.2" rx=".6" opacity="0"/><rect class="lg-tap" style="--k:0" x="10.3" y="13.1" width="2.2" height="2.2" rx=".6" opacity="0"/><rect class="lg-tap" style="--k:9" x="14.9" y="13.1" width="2.2" height="2.2" rx=".6" opacity="0"/><rect class="lg-tap" style="--k:2" x="19.5" y="13.1" width="2.2" height="2.2" rx=".6" opacity="0"/><rect class="lg-tap" style="--k:5" x="24.1" y="13.1" width="2.2" height="2.2" rx=".6" opacity="0"/><rect class="lg-tap" style="--k:4" x="5.7" y="17.9" width="2.2" height="2.2" rx=".6" opacity="0"/><rect class="lg-tap" style="--k:6" x="10.3" y="17.9" width="2.2" height="2.2" rx=".6" opacity="0"/><rect class="lg-tap" style="--k:1" x="19.5" y="17.9" width="2.2" height="2.2" rx=".6" opacity="0"/><rect class="lg-tap" style="--k:8" x="24.1" y="17.9" width="2.2" height="2.2" rx=".6" opacity="0"/><rect class="lg-tap" style="--k:3" x="10.1" y="22.7" width="11.8" height="2" rx=".6" opacity="0"/></g><path class="lg-olive" d="M14.7 19A1.3 1.6 0 1 0 17.3 19A1.3 1.6 0 1 0 14.7 19Z"/><path class="lg-leaf" d="M21.4 9.8C21.2 5 24.6 2 29.6 1.9C29.7 6.7 26.4 9.8 21.4 9.8Z"/>';
export const logo = (cls = 'logo') => `<svg class="${cls}" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">${LOGO_INNER}</svg>`;
const logoPath = (cls: string) => LOGO_INNER.match(new RegExp(`class="${cls}"[^>]*? d="([^"]+)"`))![1];
/** The mark's shapes on its 32-unit grid, for drawing it elsewhere (the QR code). The board is even-odd. */
export const LOGO_PATHS = { board: logoPath('lg-board'), olive: logoPath('lg-olive'), leaf: logoPath('lg-leaf') };

export function icon(name: IconName, size = 16, cls = ''): string {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
}

/** Put icons into static markup: <i data-icon="clock"></i> becomes the svg. */
export function fillIcons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('i[data-icon]').forEach(el => {
    el.outerHTML = icon(el.dataset.icon as IconName, Number(el.dataset.size) || 16, el.className);
  });
}

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export { reduceMotion };

/** Slide each segmented group's highlight pill under its active button. */
export function movePills(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.seg').forEach(group => {
    let pill = group.querySelector<HTMLElement>(':scope > .pill');
    const fresh = !pill;
    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'pill';
      group.prepend(pill);
    }
    const active = group.querySelector<HTMLElement>(':scope > button.active');
    if (!active || !active.offsetWidth) { pill.style.opacity = '0'; return; }
    if (fresh || pill.style.opacity === '0') pill.classList.add('instant');
    pill.style.opacity = '1';
    pill.style.width = `${active.offsetWidth}px`;
    pill.style.height = `${active.offsetHeight}px`;
    pill.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    if (pill.classList.contains('instant')) {
      void pill.offsetWidth; // apply the position before turning transitions back on
      pill.classList.remove('instant');
    }
  });
}

/** Count a number up from 0 for the result screen. */
export function countUp(el: HTMLElement, value: number, suffix = '', ms = 700) {
  const end = Math.round(value);
  if (reduceMotion() || end === 0) { el.textContent = `${end}${suffix}`; return; }
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / ms);
    const eased = 1 - (1 - p) ** 3;
    el.textContent = `${Math.round(end * eased)}${suffix}`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Draw an svg line from start to end. */
export function drawIn(path: SVGPathElement | null, ms = 900) {
  if (!path || reduceMotion()) return;
  const len = path.getTotalLength();
  if (!len) return;
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;
  path.getBoundingClientRect();
  path.style.transition = `stroke-dashoffset ${ms}ms cubic-bezier(.3,.7,.2,1)`;
  path.style.strokeDashoffset = '0';
  path.addEventListener('transitionend', () => {
    path.style.strokeDasharray = path.style.strokeDashoffset = path.style.transition = '';
  }, { once: true });
}
