// Pure merge logic for local and account history, kept separate so it can
// be tested without Firebase.
import type { Entry } from './history';

/** The fields stored in the account; anything else is dropped. */
export function cleanEntry(e: Entry): Entry {
  const out: Entry = {
    id: String(e.id), t: Number(e.t), lang: e.lang, mode: String(e.mode), amount: Number(e.amount),
    label: String(e.label), wpm: Number(e.wpm), net: Number(e.net), raw: Number(e.raw),
    acc: Number(e.acc), sec: Number(e.sec),
  };
  // optional details, only when present and well formed
  const nums = (v: unknown, max: number) => Array.isArray(v) && v.length <= max ? v.map(Number) : undefined;
  const chars = nums(e.chars, 4), hw = nums(e.hw, 700), hr = nums(e.hr, 700), he = nums(e.he, 700);
  if (chars) out.chars = chars;
  if (typeof e.cons === 'number') out.cons = e.cons;
  if (typeof e.words === 'number') out.words = e.words;
  if (typeof e.wrong === 'number') out.wrong = e.wrong;
  if (hw) out.hw = hw;
  if (hr) out.hr = hr;
  if (he) out.he = he;
  if (e.dev === 'desktop' || e.dev === 'mobile') out.dev = e.dev;
  return out;
}

/**
 * Merge after sign-in.
 * - Results in the browser that belong to this person (or to a guest, i.e.
 *   typed before signing in) and are not in the account yet get uploaded.
 * - Results left in the browser by a *different* account are dropped, so
 *   one person's history never ends up in someone else's account.
 */
export function mergeHistories(local: Entry[], cloud: Entry[], localOwner: string, uid: string) {
  const usable = localOwner === '' || localOwner === uid ? local : [];
  const inCloud = new Set(cloud.map(e => e.id));
  const upload = usable.filter(e => !inCloud.has(e.id)).map(cleanEntry);
  const merged = [...cloud, ...upload].sort((a, b) => a.t - b.t);
  return { merged, upload };
}
