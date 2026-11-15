// Test history. It is always kept in this browser's local storage; when
// someone is signed in, account.ts also keeps a copy in their account and
// merges the two.

export type Lang = 'english' | 'bangla';

export interface Entry {
  id: string;         // unique, so local and account copies can be merged
  t: number;          // finished at (ms since epoch)
  lang: Lang;
  mode: string;       // time | words | passage | lesson
  amount: number;
  label: string;      // e.g. "time 30", "passage 5m", "lesson home"
  wpm: number;
  net: number;
  raw: number;
  acc: number;
  sec: number;
}

const KEY = 'jolpai-type:history';
const MAX = 1000;

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function loadHistory(): Entry[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(v)) return [];
    // results saved before ids existed get one now
    let changed = false;
    for (const e of v) if (!e.id) { e.id = `${e.t.toString(36)}-${Math.random().toString(36).slice(2, 8)}`; changed = true; }
    if (changed) save(v);
    return v;
  } catch {
    return [];
  }
}

/** Replace the whole local list (used after merging with the account). */
export function replaceHistory(list: Entry[]) {
  save([...list].sort((a, b) => a.t - b.t));
}

function save(list: Entry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch { /* storage full or blocked */ }
}

const sameTest = (a: Entry, b: Pick<Entry, 'lang' | 'mode' | 'amount'>) =>
  a.lang === b.lang && a.mode === b.mode && a.amount === b.amount;

/** Store a result. Returns the previous best for the same test, if any. */
export function addEntry(e: Entry): { previousBest: number | null } {
  const list = loadHistory();
  const prev = list.filter(x => sameTest(x, e)).reduce<number | null>((m, x) => (m === null || x.wpm > m ? x.wpm : m), null);
  list.push(e);
  save(list);
  return { previousBest: prev };
}

export function clearHistory() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// ---------- history page ----------

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const r0 = (n: number) => String(Math.round(n));

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.round(sec % 60);
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(t: number) {
  const d = new Date(t);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function progressChart(list: Entry[]): string {
  const pts = list.slice(-100);
  if (pts.length < 2) return '<p class="h-empty">Take a few more tests to see your progress here.</p>';
  const W = 800, H = 200, padL = 36, padR = 12, padT = 10, padB = 20;
  const top = Math.max(20, Math.ceil(Math.max(...pts.map(p => p.wpm)) / 20) * 20);
  const x = (i: number) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  // average of the last 10 tests, to show the trend through the noise
  const avg = pts.map((_, i) => {
    const w = pts.slice(Math.max(0, i - 9), i + 1);
    return w.reduce((a, p) => a + p.wpm, 0) / w.length;
  });
  let g = '';
  for (let v = 0; v <= top; v += top / 4) {
    g += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${padL - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${r0(v)}</text>`;
  }
  const dots = pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.wpm).toFixed(1)}" r="3" class="dot"><title>${esc(p.label)}: ${r0(p.wpm)} wpm, ${r0(p.acc)}%</title></circle>`).join('');
  const line = avg.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return `<svg class="chart h-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Speed over your last ${pts.length} tests">${g}${dots}<path d="${line}" class="wpm"/></svg>
    <div class="h-legend"><span><i class="dot-key"></i>each test</span><span><i class="line-key"></i>average of last 10</span></div>`;
}

export function renderHistory(el: HTMLElement, lang: Lang, signedInAs: string | null = null) {
  const all = loadHistory();
  const list = all.filter(e => e.lang === lang);
  const best = (pred: (e: Entry) => boolean) => list.filter(pred).reduce((m, e) => Math.max(m, e.wpm), 0);
  const bestNet = list.filter(e => e.mode === 'passage').reduce((m, e) => Math.max(m, e.net), 0);
  const last10 = list.slice(-10);
  const avg10 = last10.length ? last10.reduce((a, e) => a + e.wpm, 0) / last10.length : 0;
  const time = list.reduce((a, e) => a + e.sec, 0);

  // personal bests per test type
  const pbs = new Map<string, Entry>();
  for (const e of list) {
    const k = e.label;
    if (!pbs.has(k) || e.wpm > pbs.get(k)!.wpm) pbs.set(k, e);
  }

  const tile = (label: string, value: string) => `<div class="h-tile"><div class="label">${label}</div><div class="val">${value}</div></div>`;
  const rows = list.slice(-25).reverse().map(e =>
    `<tr><td>${fmtDate(e.t)}</td><td>${esc(e.label)}</td><td class="num">${r0(e.wpm)}</td><td class="num">${e.mode === 'lesson' ? '–' : r0(e.net)}</td><td class="num">${r0(e.acc)}%</td><td class="num">${fmtDuration(e.sec)}</td></tr>`).join('');

  el.innerHTML = `
    <div class="h-head">
      <h1>history</h1>
      <div class="group h-lang">
        <button data-hlang="bangla" class="${lang === 'bangla' ? 'active' : ''}">বাংলা (বিজয়)</button>
        <button data-hlang="english" class="${lang === 'english' ? 'active' : ''}">english</button>
      </div>
    </div>
    ${list.length === 0 ? '<p class="h-empty">No tests yet in this language. Finish a test and it will show up here.</p>' : `
    <div class="h-tiles">
      ${tile('tests', String(list.length))}
      ${tile('time typing', fmtDuration(time))}
      ${tile('best wpm', r0(best(() => true)))}
      ${tile('average, last 10', r0(avg10))}
      ${tile('best net (passage)', bestNet ? r0(bestNet) : '–')}
    </div>
    <h2>progress</h2>
    ${progressChart(list)}
    <h2>personal bests</h2>
    <div class="h-pbs">${[...pbs.values()].sort((a, b) => a.label.localeCompare(b.label)).map(e =>
      `<div class="h-pb"><div class="label">${esc(e.label)}</div><div class="val">${r0(e.wpm)}</div><div class="sub">${r0(e.acc)}% · ${fmtDate(e.t)}</div></div>`).join('')}</div>
    <h2>recent tests</h2>
    <div class="h-table-wrap"><table class="h-table">
      <thead><tr><th>date</th><th>test</th><th class="num">wpm</th><th class="num">net</th><th class="num">acc</th><th class="num">time</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`}
    <div class="h-foot">
      <span>${signedInAs ? `Saved to your account (${esc(signedInAs)}), on every device you sign in on.` : 'Saved only in this browser. Sign in to keep your history on every device.'}</span>
      ${all.length ? '<button id="h-clear" class="h-clear">clear all history</button>' : ''}
    </div>`;
}
