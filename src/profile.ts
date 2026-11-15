// The profile page: who you are, personal bests, averages, activity and every result.
import { loadHistory, type Entry, type Lang } from './history';
import { icon, type IconName } from './icons';

export interface ProfileUser { name: string; email: string; photo: string | null; joined: number | null }
export type ResultFilter = 'all' | 'time' | 'words' | 'passage' | 'lesson';
export interface ProfileView { lang: Lang; filter: ResultFilter; shown: number }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const r0 = (n: number) => String(Math.round(n));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60);
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}

const fmtDay = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
function fmtDate(t: number) {
  const d = new Date(t);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Days in a row with at least one test, ending today (or yesterday, if today has none yet). */
export function streak(list: Entry[], now = new Date()): number {
  const days = new Set(list.map(e => dayKey(new Date(e.t))));
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function profileCard(all: Entry[], user: ProfileUser | null) {
  const first = all.length ? Math.min(...all.map(e => e.t)) : null;
  const since = user?.joined ? `joined ${fmtDay(user.joined)}` : first ? `typing since ${fmtDay(first)}` : 'no tests yet';
  const initial = esc((user?.name || '?').trim().charAt(0).toUpperCase());
  const avatar = user
    ? user.photo ? `<img src="${esc(user.photo)}" alt="" referrerpolicy="no-referrer" />` : `<span>${initial}</span>`
    : icon('user', 34);
  const stat = (ic: IconName, label: string, value: string) =>
    `<div class="p-stat"><div class="label">${icon(ic, 14)}${label}</div><div class="val">${value}</div></div>`;
  return `
    <div class="p-card">
      <div class="p-who">
        <div class="p-avatar ${user ? '' : 'guest'}">${avatar}</div>
        <div>
          <div class="p-name">${user ? esc(user.name) : 'guest'}</div>
          <div class="p-since">${since}</div>
          <div class="p-sync">${user ? `${icon('cloud', 13)}saved to your account` : `${icon('device', 13)}saved only in this browser · <button id="p-sign-in" class="link">sign in</button> to keep it everywhere`}</div>
        </div>
      </div>
      <div class="p-stats">
        ${stat('hash', 'tests completed', String(all.length))}
        ${stat('clock', 'time typing', fmtDuration(all.reduce((a, e) => a + e.sec, 0)))}
        ${stat('flame', 'day streak', String(streak(all)))}
      </div>
    </div>`;
}

const PB_GROUPS: { mode: string; title: string; amounts: number[]; name: (n: number) => string; net?: boolean }[] = [
  { mode: 'time', title: 'time', amounts: [15, 30, 60, 120], name: n => `${n} seconds` },
  { mode: 'words', title: 'words', amounts: [10, 25, 50, 100], name: n => `${n} words` },
  { mode: 'passage', title: 'passage (net speed)', amounts: [60, 120, 300, 600], name: n => `${n / 60} minute${n > 60 ? 's' : ''}`, net: true },
];

function pbSection(list: Entry[]) {
  return `<div class="p-pbs">${PB_GROUPS.map(g => `
    <div class="p-pb-group">
      <h3>${icon(g.mode === 'time' ? 'clock' : g.mode === 'words' ? 'words' : 'passage', 14)}${g.title}</h3>
      <div class="p-pb-row">${g.amounts.map(n => {
        const runs = list.filter(e => e.mode === g.mode && e.amount === n);
        const key = (e: Entry) => (g.net ? e.net : e.wpm);
        const best = runs.reduce<Entry | null>((m, e) => (!m || key(e) > key(m) ? e : m), null);
        return `<div class="p-pb ${best ? '' : 'empty'}" ${best ? `title="${esc(fmtDate(best.t))} · raw ${r0(best.raw)}"` : ''}>
          <div class="label">${g.name(n)}</div>
          <div class="val">${best ? r0(key(best)) : '–'}</div>
          <div class="sub">${best ? `${r0(best.acc)}% acc` : 'no test yet'}</div>
        </div>`;
      }).join('')}</div>
    </div>`).join('')}</div>`;
}

function statsGrid(list: Entry[]) {
  const last10 = list.slice(-10);
  const cells: [string, string][] = [
    ['highest wpm', r0(Math.max(0, ...list.map(e => e.wpm)))],
    ['average wpm', r0(avg(list.map(e => e.wpm)))],
    ['average wpm (last 10)', r0(avg(last10.map(e => e.wpm)))],
    ['highest raw', r0(Math.max(0, ...list.map(e => e.raw)))],
    ['average raw', r0(avg(list.map(e => e.raw)))],
    ['highest accuracy', `${r0(Math.max(0, ...list.map(e => e.acc)))}%`],
    ['average accuracy', `${r0(avg(list.map(e => e.acc)))}%`],
    ['average accuracy (last 10)', `${r0(avg(last10.map(e => e.acc)))}%`],
    ['tests', String(list.length)],
    ['time typing', fmtDuration(list.reduce((a, e) => a + e.sec, 0))],
    ['words typed (about)', r0(list.reduce((a, e) => a + (e.raw * e.sec) / 60, 0))],
  ];
  return `<div class="p-grid">${cells.map(([l, v]) => `<div class="p-cell"><div class="label">${l}</div><div class="val">${v}</div></div>`).join('')}</div>`;
}

/** A year of tests, one square per day, like a contribution calendar. */
function activity(all: Entry[], now = new Date()) {
  const counts = new Map<string, number>();
  for (const e of all) { const k = dayKey(new Date(e.t)); counts.set(k, (counts.get(k) || 0) + 1); }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - 52 * 7);
  const level = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);
  let cols = '', months = '', lastMonth = -1;
  const d = new Date(start);
  for (let w = 0; w < 53; w++) {
    let cells = '';
    const m = d.getMonth();
    months += `<span>${m !== lastMonth && d.getDate() <= 7 ? d.toLocaleDateString(undefined, { month: 'short' }) : ''}</span>`;
    if (d.getDate() <= 7) lastMonth = m;
    for (let i = 0; i < 7; i++) {
      if (d > today) cells += '<i class="future"></i>';
      else {
        const n = counts.get(dayKey(d)) || 0;
        cells += `<i class="l${level(n)}" title="${n || 'no'} test${n === 1 ? '' : 's'} on ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}"></i>`;
      }
      d.setDate(d.getDate() + 1);
    }
    cols += `<div class="p-week">${cells}</div>`;
  }
  const yearCount = all.filter(e => e.t >= start.getTime()).length;
  return `<div class="p-activity">
      <div class="p-act-scroll"><div class="p-months">${months}</div><div class="p-weeks">${cols}</div></div>
      <div class="p-act-foot"><span>${yearCount} test${yearCount === 1 ? '' : 's'} in the last year</span>
        <span class="p-scale">less <i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> more</span></div>
    </div>`;
}

function progressChart(list: Entry[]): string {
  const pts = list.slice(-100);
  if (pts.length < 2) return '<p class="h-empty">Take a few more tests to see your progress here.</p>';
  const W = 800, H = 200, padL = 36, padR = 12, padT = 10, padB = 20;
  const top = Math.max(20, Math.ceil(Math.max(...pts.map(p => p.wpm)) / 20) * 20);
  const x = (i: number) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  // average of the last 10 tests, to show the trend through the noise
  const trend = pts.map((_, i) => avg(pts.slice(Math.max(0, i - 9), i + 1).map(p => p.wpm)));
  let g = '';
  for (let v = 0; v <= top; v += top / 4) {
    g += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${padL - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${r0(v)}</text>`;
  }
  const dots = pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.wpm).toFixed(1)}" r="3" class="dot"><title>${esc(p.label)}: ${r0(p.wpm)} wpm, ${r0(p.acc)}%</title></circle>`).join('');
  const line = trend.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return `<svg class="chart h-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Speed over your last ${pts.length} tests">${g}${dots}<path d="${line}" class="wpm"/></svg>
    <div class="h-legend"><span><i class="dot-key"></i>each test</span><span><i class="line-key"></i>average of last 10</span></div>`;
}

const FILTERS: [ResultFilter, string][] = [['all', 'all'], ['time', 'time'], ['words', 'words'], ['passage', 'passage'], ['lesson', 'lessons']];

export function renderProfile(el: HTMLElement, view: ProfileView, user: ProfileUser | null) {
  const all = loadHistory();
  const inLang = all.filter(e => e.lang === view.lang);
  const list = view.filter === 'all' ? inLang : inLang.filter(e => e.mode === view.filter);
  const rows = list.slice(-view.shown).reverse().map(e =>
    `<tr><td>${fmtDate(e.t)}</td><td>${esc(e.label)}</td><td class="num">${r0(e.wpm)}</td><td class="num">${r0(e.raw)}</td><td class="num">${e.mode === 'lesson' ? '–' : r0(e.net)}</td><td class="num">${r0(e.acc)}%</td><td class="num">${fmtDuration(e.sec)}</td></tr>`).join('');

  el.innerHTML = `
    ${profileCard(all, user)}
    <div class="h-head">
      <h2>${icon('trophy', 15)}personal bests</h2>
      <div class="group seg h-lang">
        <button data-hlang="bangla" class="${view.lang === 'bangla' ? 'active' : ''}">বাংলা (বিজয়)</button>
        <button data-hlang="english" class="${view.lang === 'english' ? 'active' : ''}">english</button>
      </div>
    </div>
    ${pbSection(inLang)}
    <h2>${icon('calendar', 15)}activity</h2>
    ${activity(all)}
    <div class="h-head">
      <h2>${icon('zap', 15)}stats</h2>
      <div class="group seg h-filter">${FILTERS.map(([f, label]) => `<button data-filter="${f}" class="${view.filter === f ? 'active' : ''}">${label}</button>`).join('')}</div>
    </div>
    ${list.length === 0
      ? `<div class="h-empty-box">${icon('chart', 32)}<p class="h-empty">No ${view.filter === 'all' ? '' : `${FILTERS.find(f => f[0] === view.filter)![1]} `}tests yet in this language. Finish one and it will show up here.</p></div>`
      : `${statsGrid(list)}
    <h2>${icon('trend', 15)}progress</h2>
    ${progressChart(list)}
    <h2>${icon('clock', 15)}results</h2>
    <div class="h-table-wrap"><table class="h-table">
      <thead><tr><th>date</th><th>test</th><th class="num">wpm</th><th class="num">raw</th><th class="num">net</th><th class="num">acc</th><th class="num">time</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    ${list.length > view.shown ? `<button id="h-more" class="btn more">show ${Math.min(25, list.length - view.shown)} more · ${list.length - view.shown} left</button>` : ''}`}
    <div class="h-foot">
      <span class="h-where">${icon(user ? 'cloud' : 'device', 14)}${user ? `Saved to your account (${esc(user.email || user.name)}), on every device you sign in on.` : 'Saved only in this browser. Sign in to keep your history on every device.'}</span>
      ${all.length ? `<button id="h-clear" class="h-clear">${icon('trash', 14)}clear all history</button>` : ''}
    </div>`;
}
