// Scoring a mock exam: line up the typed words with the passage (so one
// skipped or extra word does not make every word after it wrong), then count
// speed and mistakes the usual way: net = gross - wrong words per minute.

export type OpKind = 'ok' | 'sub' | 'miss' | 'extra';
export interface ExamOp { kind: OpKind; target?: string; typed?: string }

export interface ExamScore {
  ops: ExamOp[];
  typed: number;      // words typed
  correct: number;    // words typed right
  subs: number;       // words typed wrong
  misses: number;     // passage words left out
  extras: number;     // words typed that are not in the passage
  errors: number;     // subs + misses + extras
  gross: number;      // keystrokes / 5 per minute
  net: number;        // gross minus errors per minute
  wpm: number;        // keystrokes of correct words / 5 per minute
  acc: number;        // % of typed words that are right
}

const same = (a: string, b: string) => a.normalize('NFC') === b.normalize('NFC');

/**
 * Align typed words with the passage. The passage is only matched as far as
 * the typist got: words after the last one attempted are not mistakes.
 */
export function alignWords(typed: string[], target: string[]): ExamOp[] {
  const n = typed.length;
  const m = Math.min(target.length, n + 20);
  const W = m + 1;
  const dp = new Int32Array((n + 1) * W);
  for (let j = 0; j <= m; j++) dp[j] = j;
  for (let i = 1; i <= n; i++) {
    dp[i * W] = i;
    for (let j = 1; j <= m; j++) {
      const sub = dp[(i - 1) * W + j - 1] + (same(typed[i - 1], target[j - 1]) ? 0 : 1);
      const ins = dp[(i - 1) * W + j] + 1;   // typed a word that is not in the passage
      const del = dp[i * W + j - 1] + 1;     // left a passage word out
      dp[i * W + j] = Math.min(sub, ins, del);
    }
  }
  // the passage prefix that fits the typing best (unattempted words are free)
  let jBest = 0;
  for (let j = 0; j <= m; j++) if (dp[n * W + j] < dp[n * W + jBest] || (dp[n * W + j] === dp[n * W + jBest] && j > jBest && n > 0 && same(typed[n - 1], target[j - 1]))) jBest = j;
  const ops: ExamOp[] = [];
  let i = n, j = jBest;
  while (i > 0 || j > 0) {
    const cur = dp[i * W + j];
    const diag = i > 0 && j > 0 && cur === dp[(i - 1) * W + j - 1] + (same(typed[i - 1], target[j - 1]) ? 0 : 1);
    const extra = i > 0 && cur === dp[(i - 1) * W + j] + 1;
    // a word typed twice by accident: the later copy is the extra one
    const repeat = extra && diag && i > 1 && same(typed[i - 1], typed[i - 2]);
    if (diag && !repeat) {
      ops.push({ kind: same(typed[i - 1], target[j - 1]) ? 'ok' : 'sub', target: target[j - 1], typed: typed[i - 1] });
      i--; j--;
    } else if (extra) {
      ops.push({ kind: 'extra', typed: typed[i - 1] });
      i--;
    } else {
      ops.push({ kind: 'miss', target: target[j - 1] });
      j--;
    }
  }
  return ops.reverse();
}

/** Score a finished exam. `keys` is the number of keystrokes in each typed word. */
export function scoreExam(typed: string[], keys: number[], target: string[], secs: number): ExamScore {
  const ops = alignWords(typed, target);
  const count = (k: OpKind) => ops.filter(o => o.kind === k).length;
  const subs = count('sub'), misses = count('miss'), extras = count('extra'), correct = count('ok');
  const errors = subs + misses + extras;
  const mins = Math.max(secs, 1) / 60;
  // keystrokes: every key in every typed word, plus the spaces between words
  const strokes = keys.reduce((a, b) => a + b, 0) + Math.max(0, typed.length - 1);
  let goodStrokes = 0, ti = 0;
  for (const o of ops) {
    if (o.kind === 'ok') goodStrokes += keys[ti] + 1;
    if (o.kind !== 'miss') ti++;
  }
  const gross = strokes / 5 / mins;
  return {
    ops, typed: typed.length, correct, subs, misses, extras, errors,
    gross, net: Math.max(0, gross - errors / mins), wpm: goodStrokes / 5 / mins,
    acc: typed.length ? (correct / typed.length) * 100 : 0,
  };
}
