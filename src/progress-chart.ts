// The profile's progress chart: every test as a dot, the 10-test average,
// the best so far and accuracy, with a range picker, a trend badge and a
// hover/tap readout. Clicking a test opens its details.
import type { Entry } from './history';
import { niceScale, smoothPath } from './chart';
import { drawIn, icon, reduceMotion } from './icons';

type Series = 'dots' | 'avg' | 'best' | 'acc';
const RANGES = [25, 50, 100, 0] as const; // 0 = all
type Range = typeof RANGES[number];

const RANGE_KEY = 'jolpai-type:progress-range';
let range: Range = (() => {
  try {
    const saved = localStorage.getItem(RANGE_KEY);
    const r = saved === null ? NaN : Number(saved);
    return (RANGES as readonly number[]).includes(r) ? r as Range : 50;
  } catch { return 50; }
})();
const hidden = new Set<Series>();

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const r0 = (n: number) => String(Math.round(n));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const clock = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const when = (t: number) => new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

interface Drawn { pts: Entry[]; x: (i: number) => number; y: (v: number) => number; avg10: number[]; best: number[]; W: number; onPick: (id: string) => void }
const state = new WeakMap<HTMLElement, Drawn>();

/** How speed changed: the newest tests against the oldest ones in view. */
function trend(pts: Entry[]) {
  if (pts.length < 4) return null;
  const k = Math.min(10, Math.floor(pts.length / 2));
  const before = avg(pts.slice(0, k).map(e => e.wpm)), after = avg(pts.slice(-k).map(e => e.wpm));
  return { delta: after - before, k };
}

export function renderProgressChart(wrap: HTMLElement, list: Entry[], onPick: (id: string) => void, animate = false) {
  const pts = range ? list.slice(-range) : list;
  const n = pts.length;
  const t = trend(pts);
  const best = Math.max(0, ...pts.map(e => e.wpm));
  const tr = t ? (Math.abs(t.delta) < 0.5
    ? `<span class="pg-trend flat" title="Your last ${t.k} tests against your first ${t.k} here">${icon('trend', 14)}steady</span>`
    : `<span class="pg-trend ${t.delta > 0 ? 'up' : 'down'}" title="Average of your last ${t.k} tests against your first ${t.k} here">${t.delta > 0 ? '▲' : '▼'} ${t.delta > 0 ? '+' : '−'}${Math.abs(t.delta).toFixed(1)} wpm</span>`) : '';
  wrap.classList.add('pg');
  wrap.innerHTML = `
    <div class="pg-top">
      <div class="pg-summary">${tr}<span class="pg-best">${icon('trophy', 14)}best <b>${r0(best)}</b></span><span class="pg-count">${n} test${n === 1 ? '' : 's'}</span></div>
      <div class="group seg pg-range" role="group" aria-label="How many tests">${RANGES.map(r =>
        `<button data-range="${r}" class="${r === range ? 'active' : ''}">${r ? `last ${r}` : 'all'}</button>`).join('')}</div>
    </div>
    <div class="pg-plot"><svg class="chart pg-svg" tabindex="0" role="img" aria-label="Your speed over ${n} tests. Use the arrow keys to read each test, Enter to open it."></svg><div class="sc-tip pg-tip" hidden></div></div>
    <div class="sc-legend pg-legend" role="group" aria-label="Show or hide lines">
      <button data-series="dots" class="${hidden.has('dots') ? 'off' : ''}"><i class="k-dot"></i>each test</button>
      <button data-series="avg" class="${hidden.has('avg') ? 'off' : ''}"><i class="k-wpm"></i>average of 10</button>
      <button data-series="best" class="${hidden.has('best') ? 'off' : ''}"><i class="k-best"></i>best so far</button>
      <button data-series="acc" class="${hidden.has('acc') ? 'off' : ''}"><i class="k-acc"></i>accuracy</button>
    </div>`;
  const svg = wrap.querySelector<SVGSVGElement>('.pg-svg')!;
  const W = svg.clientWidth || 800, H = svg.clientHeight || 260;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  for (const s of hidden) svg.classList.add(`hide-${s}`);

  const narrow = W < 460;
  const padL = narrow ? 34 : 46, padR = narrow ? 34 : 46, padT = 12, padB = 26;
  const { top, step } = niceScale(best);
  const accLo = Math.max(0, Math.min(90, Math.floor(Math.min(...pts.map(e => e.acc)) / 10) * 10));
  const x = (i: number) => padL + (n === 1 ? (W - padL - padR) / 2 : (i / (n - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const ya = (v: number) => padT + (1 - (v - accLo) / (100 - accLo)) * (H - padT - padB);

  // running numbers for each test
  const avg10 = pts.map((_, i) => avg(pts.slice(Math.max(0, i - 9), i + 1).map(e => e.wpm)));
  let run = 0;
  const bestSoFar = pts.map(e => (run = Math.max(run, e.wpm)));

  let g = '';
  for (let v = 0; v <= top + 1e-9; v += step) {
    g += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${padL - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${r0(v)}</text>`;
  }
  for (const v of [accLo, (accLo + 100) / 2, 100]) {
    g += `<text x="${W - padR + 8}" y="${ya(v) + 4}" class="axis axis-acc s-acc">${r0(v)}%</text>`;
  }
  // dates along the bottom: a few, evenly spread (times, when every test is from one day)
  const oneDay = n > 0 && day(pts[0].t) === day(pts[n - 1].t) && pts[n - 1].t - pts[0].t < 864e5;
  const label = oneDay ? clock : day;
  const ticks = Math.min(n, narrow ? 3 : 6);
  const seen = new Set<number>(), shown = new Set<string>();
  for (let k = 0; k < ticks; k++) {
    const i = ticks === 1 ? 0 : Math.round((k / (ticks - 1)) * (n - 1));
    if (seen.has(i) || shown.has(label(pts[i].t))) continue;
    seen.add(i);
    shown.add(label(pts[i].t));
    const anchor = k === 0 ? 'start' : k === ticks - 1 ? 'end' : 'middle';
    g += `<text x="${x(i)}" y="${H - 6}" class="axis" text-anchor="${anchor}">${label(pts[i].t)}</text>`;
  }

  const P = (vals: number[], f: (v: number) => number) => vals.map((v, i) => [x(i), f(v)] as [number, number]);
  const avgPath = smoothPath(P(avg10, y));
  const base = y(0).toFixed(1);
  const area = n > 1 ? `${avgPath}L${x(n - 1).toFixed(1)},${base}L${x(0).toFixed(1)},${base}Z` : '';
  // best so far as steps: flat until the next record
  let bestPath = '';
  bestSoFar.forEach((v, i) => { bestPath += i === 0 ? `M${x(0).toFixed(1)},${y(v).toFixed(1)}` : `H${x(i).toFixed(1)}V${y(v).toFixed(1)}`; });
  const records = bestSoFar.map((v, i) => (i === 0 || v > bestSoFar[i - 1]) ? `<circle class="rec" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3"/>` : '').join('');
  const r = n > 60 ? 2.5 : n > 30 ? 3 : 3.8;
  const dots = pts.map((e, i) => `<circle class="pt" cx="${x(i).toFixed(1)}" cy="${y(e.wpm).toFixed(1)}" r="${r}"/>`).join('');
  svg.innerHTML = `<defs><linearGradient id="pg-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="fill-top"/><stop offset="1" class="fill-bottom"/></linearGradient></defs>`
    + g
    + `<path d="${area}" class="area s-avg" fill="url(#pg-fill)"/>`
    + `<path d="${smoothPath(P(pts.map(e => e.acc), ya))}" class="acc s-acc"/>`
    + `<g class="s-best"><path d="${bestPath}" class="best"/>${records}</g>`
    + `<g class="s-dots">${dots}</g>`
    + `<path d="${avgPath}" class="wpm s-avg"/>`
    + `<g class="hover" visibility="hidden"><line class="guide" y1="${padT}" y2="${H - padB}"/><circle class="hd-pt" r="6.5"/></g>`;
  state.set(wrap, { pts, x, y, avg10, best: bestSoFar, W, onPick });
  if (animate && !reduceMotion()) drawIn(svg.querySelector<SVGPathElement>('path.wpm'), 1000);
  if (!wrap.dataset.wired) wire(wrap, list, onPick);
}

function wire(wrap: HTMLElement, list: Entry[], onPick: (id: string) => void) {
  wrap.dataset.wired = '1';
  let at = -1;
  const show = (i: number) => {
    const st = state.get(wrap), svg = wrap.querySelector<SVGSVGElement>('.pg-svg'), tip = wrap.querySelector<HTMLElement>('.pg-tip');
    if (!st || !svg || !tip) return;
    if (i < 0 || i >= st.pts.length) return hide();
    at = i;
    const e = st.pts[i], hx = st.x(i);
    const hov = svg.querySelector('.hover')!;
    hov.setAttribute('visibility', 'visible');
    hov.querySelector('.guide')!.setAttribute('x1', String(hx));
    hov.querySelector('.guide')!.setAttribute('x2', String(hx));
    hov.querySelector('.hd-pt')!.setAttribute('cx', String(hx));
    hov.querySelector('.hd-pt')!.setAttribute('cy', String(st.y(e.wpm)));
    const record = i === 0 || st.best[i] > st.best[i - 1];
    tip.innerHTML = `<div class="tt-sec">${esc(e.label)}${record && i > 0 ? ' <span class="tt-rec">new best</span>' : ''}</div>
      <div class="tt-when">${esc(when(e.t))}</div>
      <div class="tt-big"><b>${r0(e.wpm)}</b> wpm</div>
      <div><i class="k-acc"></i>accuracy <b>${r0(e.acc)}%</b></div>
      <div><i class="k-raw"></i>raw <b>${r0(e.raw)}</b></div>
      <div><i class="k-wpm"></i>average of 10 <b>${r0(st.avg10[i])}</b></div>
      <div><i class="k-best"></i>best so far <b>${r0(st.best[i])}</b></div>
      <div class="tt-hint">click to see this test</div>`;
    tip.hidden = false;
    const box = svg.getBoundingClientRect(), scale = box.width / st.W, left = hx * scale, tw = tip.offsetWidth;
    tip.style.left = `${left + 16 + tw > box.width ? Math.max(0, left - tw - 16) : left + 16}px`;
    tip.style.top = '4px';
  };
  const hide = () => {
    at = -1;
    wrap.querySelector('.hover')?.setAttribute('visibility', 'hidden');
    const tip = wrap.querySelector<HTMLElement>('.pg-tip');
    if (tip) tip.hidden = true;
  };
  const indexAt = (clientX: number) => {
    const st = state.get(wrap), svg = wrap.querySelector('.pg-svg');
    if (!st || !svg) return -1;
    const box = svg.getBoundingClientRect();
    const vx = ((clientX - box.left) / box.width) * st.W;
    let bestI = 0;
    for (let i = 1; i < st.pts.length; i++) if (Math.abs(st.x(i) - vx) < Math.abs(st.x(bestI) - vx)) bestI = i;
    return bestI;
  };
  const pick = () => { const st = state.get(wrap); if (st && at >= 0) st.onPick(st.pts[at].id); };

  wrap.addEventListener('pointermove', e => { if ((e.target as Element).closest('.pg-svg')) show(indexAt(e.clientX)); });
  wrap.addEventListener('pointerleave', hide);
  wrap.addEventListener('focusout', e => { if (!wrap.contains(e.relatedTarget as Node)) hide(); });
  wrap.addEventListener('click', e => {
    const target = e.target as Element;
    const b = target.closest<HTMLButtonElement>('button');
    if (b?.dataset.range !== undefined) {
      range = Number(b.dataset.range) as Range;
      try { localStorage.setItem(RANGE_KEY, String(range)); } catch { /* ignore */ }
      renderProgressChart(wrap, list, onPick, true);
      return;
    }
    if (b?.dataset.series) {
      const s = b.dataset.series as Series;
      if (hidden.has(s)) hidden.delete(s); else hidden.add(s);
      b.classList.toggle('off', hidden.has(s));
      wrap.querySelector('.pg-svg')?.classList.toggle(`hide-${s}`, hidden.has(s));
      return;
    }
    if (target.closest('.pg-svg')) {
      // a tap on a phone first shows the readout; a second tap opens the test
      const i = indexAt((e as MouseEvent).clientX);
      if (i === at && i >= 0) pick(); else show(i);
    }
  });
  wrap.addEventListener('keydown', e => {
    if (!(e.target as Element).closest('.pg-svg')) return;
    const n = state.get(wrap)?.pts.length ?? 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault(); e.stopPropagation();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      show(Math.max(0, Math.min(n - 1, at < 0 ? (d > 0 ? 0 : n - 1) : at + d)));
    } else if (e.key === 'Enter' && at >= 0) { e.preventDefault(); e.stopPropagation(); pick(); }
  });
}
