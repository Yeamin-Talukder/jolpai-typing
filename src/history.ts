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
