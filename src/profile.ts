// The profile page: who you are, personal bests, averages, activity and every result.
import { loadHistory, type Entry, type Lang } from './history';
import { icon, type IconName } from './icons';
import { POSTS } from './exam';
import { DEVICE_NAME, deviceOf, type Device } from './device';

export interface ProfileUser { name: string; email: string; photo: string | null; joined: number | null }
export type ResultFilter = 'all' | 'time' | 'words' | 'passage' | 'lesson' | 'custom';
export interface ProfileView { lang: Lang; filter: ResultFilter; shown: number; open: string | null; dev: Device }

/** Someone's shared profile, shown read-only. */
export interface SharedData {
  name: string; photo: string | null; joined: number | null; updated: number | null;
  tests: number; time: number; results: Entry[];
}
export interface ProfileOptions { shared?: SharedData; sharing?: boolean }

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

function profileCard(all: Entry[], everything: Entry[], user: ProfileUser | null, opts: ProfileOptions) {
  const shared = opts.shared;
  if (shared) user = { name: shared.name, email: '', photo: shared.photo, joined: shared.joined };
  const first = everything.length ? Math.min(...everything.map(e => e.t)) : null;
  const since = user?.joined ? `joined ${fmtDay(user.joined)}` : first ? `typing since ${fmtDay(first)}` : 'no tests yet';
  // a shared copy holds only recent results; its saved totals are exact when one device has them all
  const oneDevice = all.length === everything.length;
  const tests = shared && oneDevice ? shared.tests : all.length;
  const time = shared && oneDevice ? shared.time : all.reduce((a, e) => a + e.sec, 0);
  const sync = shared
    ? `${icon('globe', 13)}shared profile${shared.updated ? ` · updated ${fmtDate(shared.updated)}` : ''}`
    : user ? `${icon('cloud', 13)}saved to your account${opts.sharing ? ` · ${icon('share', 13)}shared` : ''}`
      : `${icon('device', 13)}saved only in this browser · <button id="p-sign-in" class="link">sign in</button> to keep it everywhere`;
  const actions = shared ? '' : `<div class="p-actions">
        <button id="p-share" class="btn primary p-share-btn" title="Share your profile with a link or QR code">${icon('share', 15)}share profile</button>
        ${user ? `<button id="p-sign-out" class="btn p-out" title="Sign out of ${esc(user.email || user.name)}">${icon('logout', 15)}sign out</button>` : ''}
      </div>`;
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
          <div class="p-sync">${sync}</div>
        </div>
      </div>
      <div class="p-side">
      ${actions}
      <div class="p-stats">
        ${stat('hash', 'tests completed', String(tests))}
        ${stat('clock', 'time typing', fmtDuration(time))}
        ${stat('flame', 'day streak', String(streak(all)))}
      </div>
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


/** Everything saved about one result, shown when its row is opened. */
function detail(e: Entry, all: Entry[], shared = false) {
  const same = all.filter(x => x.lang === e.lang && x.mode === e.mode && x.amount === e.amount);
  const isPb = same.length > 1 && same.every(x => x.wpm <= e.wpm);
  const when = new Date(e.t).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const cell = (label: string, value: string, sub = '') =>
    `<div class="d-cell"><div class="label">${label}</div><div class="val">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
  const cells = [
    cell('wpm', r0(e.wpm)),
    cell('raw', r0(e.raw)),
    e.mode === 'lesson' ? '' : cell('net', r0(e.net)),
    cell('accuracy', `${r0(e.acc)}%`),
    e.cons !== undefined ? cell('consistency', `${r0(e.cons)}%`) : '',
    e.chars ? cell('characters', e.chars.join('/'), 'correct / wrong / extra / missed') : '',
    e.words !== undefined ? cell('words typed', String(e.words)) : '',
    e.wrong !== undefined ? cell('wrong words', String(e.wrong)) : '',
    cell('time', fmtDuration(e.sec)),
  ].join('');
  const exam = e.mode === 'lesson' ? '' : `<ul class="posts d-posts">${POSTS.map(p => {
    const need = p[e.lang], ok = e.net >= need;
    return `<li class="${ok ? 'pass' : 'fail'}"><span class="mark">${icon(ok ? 'check' : 'x', 14)}</span>${p.name}<span class="need">needs ${need} net wpm</span></li>`;
  }).join('')}</ul>`;
  const graph = e.hw && e.hw.length
    ? `<div class="d-chart-wrap" data-id="${esc(e.id)}"></div>`
    : shared ? '' : `<p class="d-note">${icon('info', 14)}The speed graph and character counts are saved for tests taken from now on.</p>`;
  return `<div class="d-box">
      <div class="d-head">
        <div><div class="d-title">${esc(e.label)} · ${e.lang === 'bangla' ? 'বাংলা (বিজয়)' : 'english'}</div><div class="d-when">${esc(when)} · ${icon(deviceOf(e) === 'mobile' ? 'phone' : 'device', 13)}${DEVICE_NAME[deviceOf(e)]}</div></div>
        ${isPb ? `<span class="pb">${icon('trophy', 14)}personal best</span>` : ''}
      </div>
      <div class="d-stats">${cells}</div>
      ${graph}
      ${exam}
    </div>`;
}

const FILTERS: [ResultFilter, string][] = [['all', 'all'], ['time', 'time'], ['words', 'words'], ['passage', 'passage'], ['lesson', 'lessons'], ['custom', 'custom']];

/** Draw the profile; returns the results shown, for the progress chart. */
export function renderProfile(el: HTMLElement, view: ProfileView, user: ProfileUser | null, opts: ProfileOptions = {}): Entry[] {
  const shared = opts.shared;
  const everything = shared ? shared.results : loadHistory();
  const perDevice = { desktop: 0, mobile: 0 };
  for (const e of everything) perDevice[deviceOf(e)]++;
  // computer and mobile results are kept apart: everything below follows the device switch
  const all = everything.filter(e => deviceOf(e) === view.dev);
  const inLang = all.filter(e => e.lang === view.lang);
  const list = view.filter === 'all' ? inLang : inLang.filter(e => e.mode === view.filter);
  const rows = list.slice(-view.shown).reverse().map(e => {
    const open = view.open === e.id;
    return `<tr class="h-row ${open ? 'open' : ''}" data-id="${esc(e.id)}" tabindex="0" aria-expanded="${open}" title="Show the details of this test">`
      + `<td>${icon('next', 13, 'h-chev')}${fmtDate(e.t)}</td><td>${esc(e.label)}</td><td class="num">${r0(e.wpm)}</td><td class="num opt">${r0(e.raw)}</td><td class="num opt">${e.mode === 'lesson' ? '–' : r0(e.net)}</td><td class="num">${r0(e.acc)}%</td><td class="num opt">${fmtDuration(e.sec)}</td></tr>`
      + (open ? `<tr class="h-detail"><td colspan="7">${detail(e, all, !!shared)}</td></tr>` : '');
  }).join('');

  el.innerHTML = `
    ${profileCard(all, everything, user, opts)}
    <div class="p-filters">
      <div class="group seg p-dev" role="group" aria-label="Device">
        ${(['desktop', 'mobile'] as Device[]).map(d => `<button data-dev="${d}" class="${view.dev === d ? 'active' : ''}" title="Results typed on ${d === 'mobile' ? 'a phone or tablet' : 'a computer'}">${icon(d === 'mobile' ? 'phone' : 'device', 15)}${DEVICE_NAME[d]}<span class="cnt">${perDevice[d]}</span></button>`).join('')}
      </div>
      <div class="group seg h-lang" role="group" aria-label="Language">
        <button data-hlang="bangla" class="${view.lang === 'bangla' ? 'active' : ''}">বাংলা (বিজয়)</button>
        <button data-hlang="english" class="${view.lang === 'english' ? 'active' : ''}">english</button>
      </div>
    </div>
    <h2>${icon('trophy', 15)}personal bests <span class="h2-sub">· ${DEVICE_NAME[view.dev]}</span></h2>
    ${pbSection(inLang)}
    <h2>${icon('calendar', 15)}activity <span class="h2-sub">· ${DEVICE_NAME[view.dev]}</span></h2>
    ${activity(all)}
    <div class="h-head">
      <h2>${icon('zap', 15)}stats</h2>
      <div class="group seg h-filter">${FILTERS.map(([f, label]) => `<button data-filter="${f}" class="${view.filter === f ? 'active' : ''}">${label}</button>`).join('')}</div>
    </div>
    ${list.length === 0
      ? `<div class="h-empty-box">${icon('chart', 32)}<p class="h-empty">No ${view.filter === 'all' ? '' : `${FILTERS.find(f => f[0] === view.filter)![1]} `}tests yet in this language on ${view.dev === 'mobile' ? 'a phone or tablet' : 'a computer'}.${shared ? '' : ' Finish one and it will show up here.'}</p></div>`
      : `${statsGrid(list)}
    <h2>${icon('trend', 15)}progress</h2>
    ${list.length < 2 ? '<p class="h-empty">Take a few more tests to see your progress here.</p>' : '<div class="pg-wrap"></div>'}
    <h2>${icon('clock', 15)}results</h2>
    <div class="h-table-wrap"><table class="h-table">
      <thead><tr><th>date</th><th>test</th><th class="num">wpm</th><th class="num opt">raw</th><th class="num opt">net</th><th class="num">acc</th><th class="num opt">time</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    ${list.length > view.shown ? `<button id="h-more" class="btn more">show ${Math.min(25, list.length - view.shown)} more · ${list.length - view.shown} left</button>` : ''}`}
    ${shared ? `<div class="p-invite">
      <div><div class="p-invite-title">Practise typing like ${esc(shared.name.split(' ')[0])}</div>
      <p>Jolpai Type is free typing practice for Bangla (Bijoy) and English, made for job typing tests.</p></div>
      <button id="p-start" class="btn primary">${icon('keyboard', 15)}start typing</button>
    </div>` : `<div class="h-foot">
      <span class="h-where">${icon(user ? 'cloud' : 'device', 14)}${user ? `Saved to your account (${esc(user.email || user.name)}), on every device you sign in on.` : 'Saved only in this browser. Sign in to keep your history on every device.'}</span>
      ${all.length ? `<button id="h-clear" class="h-clear">${icon('trash', 14)}clear all history</button>` : ''}
    </div>`}`;
  return list;
}
