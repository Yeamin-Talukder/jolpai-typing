// Test history. It is always kept in this browser's local storage; when
// someone is signed in, account.ts also keeps a copy in their account and
// merges the two.
import { deviceOf, type Device } from './device';

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
  // details, saved for tests taken since they were added
  chars?: number[];   // correct, incorrect, extra, missed keystrokes
  cons?: number;      // consistency, %
  words?: number;     // words typed
  wrong?: number;     // wrong words
  hw?: number[];      // speed each second
  hr?: number[];      // raw speed each second
  he?: number[];      // mistakes each second
  dev?: Device;       // typed on a computer or a phone/tablet (missing: computer)
}

const KEEP_GRAPHS = 200; // per-second graphs kept in the browser for the newest results only

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
  // per-second graphs take the most room, so the browser keeps them only
  // for recent results (the account keeps them all)
  const kept = list.slice(-MAX).map((e, i, all) => {
    if (i >= all.length - KEEP_GRAPHS || !e.hw) return e;
    const { hw: _w, hr: _r, he: _e, ...rest } = e;
    return rest;
  });
  try { localStorage.setItem(KEY, JSON.stringify(kept)); } catch { /* storage full or blocked */ }
}

/** The English word level of a random-words test, read from its label
 *  ("time 30 1k punctuation"); older results and english 200 have none. */
export function levelOf(e: Pick<Entry, 'lang' | 'mode' | 'label'>): string {
  if (e.lang !== 'english' || (e.mode !== 'time' && e.mode !== 'words')) return '';
  const tok = e.label.split(' ')[2];
  return tok === '1k' || tok === '5k' ? tok : '200';
}

// personal bests are per device too: a phone score never competes with a computer one
export const sameTest = (a: Pick<Entry, 'lang' | 'mode' | 'amount' | 'label' | 'dev'>, b: Pick<Entry, 'lang' | 'mode' | 'amount' | 'label' | 'dev'>) =>
  a.lang === b.lang && a.mode === b.mode && a.amount === b.amount && deviceOf(a) === deviceOf(b) && levelOf(a) === levelOf(b);

/** Best and recent average speed for a test like this one, for the hint under the words. */
export function statsFor(probe: Pick<Entry, 'lang' | 'mode' | 'amount' | 'label' | 'dev'>): { best: number; avg: number; count: number } | null {
  const list = loadHistory().filter(x => sameTest(x, probe));
  if (!list.length) return null;
  const recent = list.slice(-10);
  return {
    best: Math.max(...list.map(x => x.wpm)),
    avg: recent.reduce((t, x) => t + x.wpm, 0) / recent.length,
    count: list.length,
  };
}

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
