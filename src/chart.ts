// The speed-over-time chart, shared by the result screen and the result details.
// Speed and raw speed per second on the left axis, mistakes per second on the
// right axis, the final speed as a dashed average line, and a hover/touch
// guide that reads out every second.
import { drawIn, reduceMotion } from './icons';

export interface ChartData {
  wpm: number[];     // speed each second
  raw: number[];     // raw speed each second
  err: number[];     // mistakes each second
  avg?: number;      // the test's final speed, drawn as a dashed line
}

type Series = 'wpm' | 'raw' | 'err';
interface Drawn { data: ChartData; x: (i: number) => number; y: (v: number) => number; ye: (v: number) => number; padT: number; H: number; W: number; padB: number }

const state = new WeakMap<HTMLElement, Drawn>();
const hidden = new WeakMap<HTMLElement, Set<Series>>();

/** A tidy axis top and step: 0, 20, 40 ... or 0, 50, 100 ... */
export function niceScale(max: number, ticks = 4) {
  const m = Math.max(max, 1);
  const mag = 10 ** Math.floor(Math.log10(m / ticks));
  // the smallest tidy step that covers the data in at most ticks + 1 steps,
  // so the top sits just above the highest value (103 → 125, not 200)
  for (const f of [1, 2, 2.5, 5, 10, 20, 25, 50]) {
    const step = f * mag, k = Math.ceil(m / step);
    if (k <= ticks + 1) return { top: k * step, step };
  }
  return { top: 100 * mag * ticks, step: 100 * mag };
}

/** A smooth line through the points that never overshoots them (monotone cubic). */
export function smoothPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n < 3) return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / (dx[i] || 1); }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], h = dx[i] / 3;
    d += `C${(x0 + h).toFixed(1)},${(y0 + t[i] * h).toFixed(1)} ${(x1 - h).toFixed(1)},${(y1 - t[i + 1] * h).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

/** Draw the chart into `wrap` (legend, graph and readout). Safe to call again on resize. */
export function renderSpeedChart(wrap: HTMLElement, input: ChartData, id: string, animate = false) {
  const n = input.wpm.length;
  // older results may lack raw speed or mistakes: fill the gaps
  const data: ChartData = { ...input, raw: input.wpm.map((v, i) => input.raw[i] ?? v), err: input.wpm.map((_, i) => input.err[i] ?? 0) };
  if (!hidden.has(wrap)) hidden.set(wrap, new Set());
  const off = hidden.get(wrap)!;
  const totalErr = data.err.reduce((a, b) => a + b, 0);
  wrap.classList.add('sc');
  wrap.innerHTML = `
    <div class="sc-legend" role="group" aria-label="Show or hide lines">
      <button data-series="wpm" class="${off.has('wpm') ? 'off' : ''}" aria-pressed="${!off.has('wpm')}"><i class="k-wpm"></i>wpm</button>
      <button data-series="raw" class="${off.has('raw') ? 'off' : ''}" aria-pressed="${!off.has('raw')}"><i class="k-raw"></i>raw</button>
      <button data-series="err" class="${off.has('err') ? 'off' : ''}" aria-pressed="${!off.has('err')}"><i class="k-err">✕</i>errors <span class="sc-total">${totalErr}</span></button>
    </div>
    <div class="sc-plot"><svg class="chart sc-svg" tabindex="0" role="img" aria-label="Speed during the test, ${n} seconds. Use the arrow keys to read each second."></svg>
      <div class="sc-tip" hidden></div></div>`;
  const svg = wrap.querySelector<SVGSVGElement>('.sc-svg')!;
  const W = svg.clientWidth || 800, H = svg.clientHeight || 200;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  if (n === 0) return;
  for (const s of off) svg.classList.add(`hide-${s}`);

  const narrow = W < 420;
  const padL = narrow ? 34 : 50, padR = narrow ? 26 : 44, padT = 10, padB = narrow ? 24 : 32;
  const { top, step } = niceScale(Math.max(...data.wpm, ...data.raw, data.avg ?? 0));
  const maxE = Math.max(...data.err, 0);
  const eTop = Math.max(2, Math.ceil(maxE / 2) * 2);
  const x = (i: number) => padL + (n === 1 ? (W - padL - padR) / 2 : (i / (n - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const ye = (v: number) => padT + (1 - v / eTop) * (H - padT - padB);

  let g = '';
  for (let v = 0; v <= top + 1e-9; v += step) {
    g += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${padL - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${Math.round(v)}</text>`;
  }
  // right axis: mistakes
  for (let v = 0; v <= eTop; v += eTop / 2) {
    g += `<text x="${W - padR + 8}" y="${ye(v) + 4}" class="axis axis-err">${Math.round(v)}</text>`;
  }
  // seconds along the bottom, at a tidy spacing
  const every = Math.max(1, Math.round(niceScale(n, narrow ? 4 : 8).step));
  for (let s = 1; s <= n; s++) {
    if (s === 1 || s % every === 0) g += `<text x="${x(s - 1)}" y="${H - padB + 16}" class="axis" text-anchor="middle">${s}</text>`;
  }
  if (!narrow) {
    g += `<text class="axis-title" transform="translate(12 ${(padT + H - padB) / 2}) rotate(-90)" text-anchor="middle">words per minute</text>`;
    g += `<text class="axis-title" transform="translate(${W - 8} ${(padT + H - padB) / 2}) rotate(90)" text-anchor="middle">errors</text>`;
    g += `<text class="axis-title" x="${(padL + W - padR) / 2}" y="${H - 2}" text-anchor="middle">seconds</text>`;
  }

  const pw = data.wpm.map((v, i) => [x(i), y(v)] as [number, number]);
  const pr = data.raw.map((v, i) => [x(i), y(v)] as [number, number]);
  const base = y(0).toFixed(1);
  const area = `${smoothPath(pw)}L${x(n - 1).toFixed(1)},${base}L${x(0).toFixed(1)},${base}Z`;
  const avg = data.avg !== undefined && data.avg > 0
    ? `<g class="avg"><line x1="${padL}" x2="${W - padR}" y1="${y(data.avg)}" y2="${y(data.avg)}"/><text x="${padL + 6}" y="${y(data.avg) - 6}">avg ${Math.round(data.avg)}</text></g>` : '';
  const errs = data.err.map((e, i) => e ? `<g class="err" transform="translate(${x(i).toFixed(1)},${ye(e).toFixed(1)})"><path d="M-4,-4L4,4M4,-4L-4,4"/></g>` : '').join('');
  const fill = `${id}-fill`;
  const dots = n <= 1 ? `<circle class="pt-wpm" cx="${x(0)}" cy="${y(data.wpm[0])}" r="4"/><circle class="pt-raw" cx="${x(0)}" cy="${y(data.raw[0])}" r="3.5"/>` : '';
  svg.innerHTML = `<defs><linearGradient id="${fill}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="fill-top"/><stop offset="1" class="fill-bottom"/></linearGradient></defs>`
    + `${g}${avg}<path d="${area}" class="area s-wpm" fill="url(#${fill})"/><path d="${smoothPath(pr)}" class="raw s-raw"/><path d="${smoothPath(pw)}" class="wpm s-wpm"/>${dots}<g class="s-err">${errs}</g>`
    + `<g class="hover" visibility="hidden"><line class="guide" y1="${padT}" y2="${H - padB}"/><circle class="hd-raw s-raw" r="4"/><circle class="hd-wpm s-wpm" r="5"/></g>`;
  state.set(wrap, { data, x, y, ye, padT, H, W, padB });
  if (animate && !reduceMotion()) {
    drawIn(svg.querySelector<SVGPathElement>('.raw'));
    drawIn(svg.querySelector<SVGPathElement>('.wpm'));
  }
  if (!wrap.dataset.wired) wire(wrap);
}

/** Hover, touch, keyboard and legend handling; attached once per chart box. */
function wire(wrap: HTMLElement) {
  wrap.dataset.wired = '1';
  let at = -1;

  const show = (i: number) => {
    const st = state.get(wrap);
    const svg = wrap.querySelector<SVGSVGElement>('.sc-svg');
    const tip = wrap.querySelector<HTMLElement>('.sc-tip');
    if (!st || !svg || !tip) return;
    const n = st.data.wpm.length;
    if (i < 0 || i >= n) return hide();
    at = i;
    const hx = st.x(i);
    const hover = svg.querySelector<SVGGElement>('.hover')!;
    hover.setAttribute('visibility', 'visible');
    hover.querySelector('.guide')!.setAttribute('x1', String(hx));
    hover.querySelector('.guide')!.setAttribute('x2', String(hx));
    for (const k of ['wpm', 'raw'] as const) {
      const c = hover.querySelector(`.hd-${k}`)!;
      c.setAttribute('cx', String(hx));
      c.setAttribute('cy', String(st.y(st.data[k][i])));
    }
    const e = st.data.err[i];
    tip.innerHTML = `<div class="tt-sec">second ${i + 1}</div>
      <div><i class="k-wpm"></i>wpm <b>${Math.round(st.data.wpm[i])}</b></div>
      <div><i class="k-raw"></i>raw <b>${Math.round(st.data.raw[i])}</b></div>
      <div><i class="k-err">✕</i>errors <b>${e}</b></div>`;
    tip.hidden = false;
    // keep the readout inside the box, on the side away from the pointer
    const box = svg.getBoundingClientRect();
    const scale = box.width / st.W;
    const left = hx * scale;
    const tw = tip.offsetWidth;
    tip.style.left = `${left + 14 + tw > box.width ? left - tw - 14 : left + 14}px`;
    tip.style.top = `${Math.max(0, st.y(Math.max(st.data.wpm[i], st.data.raw[i])) * scale - 20)}px`;
  };
  const hide = () => {
    at = -1;
    wrap.querySelector('.hover')?.setAttribute('visibility', 'hidden');
    const tip = wrap.querySelector<HTMLElement>('.sc-tip');
    if (tip) tip.hidden = true;
  };
  const indexAt = (clientX: number) => {
    const st = state.get(wrap), svg = wrap.querySelector('.sc-svg');
    if (!st || !svg) return -1;
    const box = svg.getBoundingClientRect();
    const vx = ((clientX - box.left) / box.width) * st.W;
    const n = st.data.wpm.length;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(st.x(i) - vx) < Math.abs(st.x(best) - vx)) best = i;
    return best;
  };

  wrap.addEventListener('pointermove', e => { if ((e.target as Element).closest('.sc-svg')) show(indexAt(e.clientX)); });
  wrap.addEventListener('pointerdown', e => { if ((e.target as Element).closest('.sc-svg')) show(indexAt(e.clientX)); });
  wrap.addEventListener('pointerleave', hide);
  wrap.addEventListener('focusout', hide);
  wrap.addEventListener('keydown', e => {
    if (!(e.target as Element).closest('.sc-svg')) return;
    const n = state.get(wrap)?.data.wpm.length ?? 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      show(Math.max(0, Math.min(n - 1, (at < 0 ? (e.key === 'ArrowRight' ? -1 : n) : at) + (e.key === 'ArrowRight' ? 1 : -1))));
    }
  });
  wrap.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-series]');
    if (!b) return;
    const s = b.dataset.series as Series;
    const off = hidden.get(wrap)!;
    if (off.has(s)) off.delete(s); else off.add(s);
    b.classList.toggle('off', off.has(s));
    b.setAttribute('aria-pressed', String(!off.has(s)));
    wrap.querySelector('.sc-svg')?.classList.toggle(`hide-${s}`, off.has(s));
  });
}
