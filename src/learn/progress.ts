// Course progress: stars per lesson, accuracy and speed per key, practice
// time, the days you practised and mock exam results. Kept in this browser,
// and in the account when signed in (account.ts syncs it with these helpers).
import { LESSONS, type CourseLesson } from './course';

export interface LessonRec { stars: number; wpm: number; acc: number; tries: number; done: number }
export interface KeyRec { hit: number; miss: number; ms: number }
export interface LearnData {
  v: 1;
  lessons: Record<string, LessonRec>;
  keys: Record<string, KeyRec>;
  days: string[];      // yyyy-mm-dd, newest last
  secs: number;        // total practice time
  openAll: boolean;    // every lesson unlocked
  exams: ExamRec[];    // mock exams, newest last
  pending: Pending[];  // finished runs not yet saved to the account (this browser only)
}

/** A finished mock exam. */
export interface ExamRec {
  t: number; lang: 'english' | 'bangla'; secs: number; limit?: number; // seconds used, and the exam's length
  gross: number; net: number; acc: number; words: number; errors: number;
  post: string; need: number; pass: boolean;
}
export interface Pending { run?: RunResult; goal?: number; exam?: ExamRec; openAll?: boolean }

const KEY = 'jolpai-type:learn';
export const emptyLearn = (): LearnData => ({ v: 1, lessons: {}, keys: {}, days: [], secs: 0, openAll: false, exams: [], pending: [] });
const empty = emptyLearn;

export function loadLearn(): LearnData {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && d.v === 1) return { ...empty(), ...d };
  } catch { /* ignore */ }
  return empty();
}
export function saveLearn(d: LearnData) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ }
}
export function resetLearn() { saveLearn(empty()); }

/** Stars for a run: one for 90% accuracy, two with the speed goal too, three for both well beaten. */
export function starsFor(acc: number, wpm: number, goal: number): number {
  if (acc < 90) return 0;
  if (acc >= 97 && wpm >= Math.round(goal * 1.4)) return 3;
  if (acc >= 94 && wpm >= goal) return 2;
  return 1;
}
export const threeStarWpm = (goal: number) => Math.round(goal * 1.4);

// Each function below works on one course's lessons; the Bijoy course is the default.

/** A lesson is open once the one before it has at least one star. */
export function isUnlocked(d: LearnData, i: number, lessons: CourseLesson[] = LESSONS): boolean {
  if (d.openAll || i === 0) return true;
  return (d.lessons[lessons[i - 1].id]?.stars ?? 0) > 0;
}

/** The lesson to continue with: the first open one without a star, or the last one. */
export function nextLesson(d: LearnData, lessons: CourseLesson[] = LESSONS): CourseLesson {
  const i = lessons.findIndex((l, n) => isUnlocked(d, n, lessons) && !(d.lessons[l.id]?.stars));
  return lessons[i >= 0 ? i : lessons.length - 1];
}

export const doneCount = (d: LearnData, lessons: CourseLesson[] = LESSONS) => lessons.filter(l => (d.lessons[l.id]?.stars ?? 0) > 0).length;
export const starCount = (d: LearnData, lessons: CourseLesson[] = LESSONS) => lessons.reduce((a, l) => a + (d.lessons[l.id]?.stars ?? 0), 0);

const dayStr = (t: Date) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

/** Days in a row with practice, ending today or yesterday. */
export function learnStreak(d: LearnData, now = new Date()): number {
  const days = new Set(d.days);
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayStr(t))) t.setDate(t.getDate() - 1);
  let n = 0;
  while (days.has(dayStr(t))) { n++; t.setDate(t.getDate() - 1); }
  return n;
}

export interface RunResult { lessonId: string; acc: number; wpm: number; secs: number; keys: Record<string, KeyRec> }

/** Store a finished run; returns the stars it earned and whether that beat the old best. */
export function recordRun(d: LearnData, r: RunResult, goal: number): { stars: number; improved: boolean } {
  const out = applyRun(d, r, goal);
  saveLearn(d);
  return out;
}

const addDay = (d: LearnData, t = new Date()) => {
  const day = dayStr(t);
  if (!d.days.includes(day)) d.days = [...d.days, day].sort().slice(-400);
};

/** Apply a finished run to progress (no saving). */
export function applyRun(d: LearnData, r: RunResult, goal: number): { stars: number; improved: boolean } {
  const stars = starsFor(r.acc, r.wpm, goal);
  const old = d.lessons[r.lessonId];
  if (r.lessonId !== 'weak' && r.lessonId !== 'en-weak') { // weak-key drills are not lessons
    d.lessons[r.lessonId] = {
      stars: Math.max(old?.stars ?? 0, stars),
      wpm: Math.max(old?.wpm ?? 0, Math.round(r.wpm * 10) / 10),
      acc: Math.max(old?.acc ?? 0, Math.round(r.acc * 10) / 10),
      tries: (old?.tries ?? 0) + 1,
      done: stars > 0 && !old?.done ? Date.now() : old?.done ?? 0,
    };
  }
  for (const [k, v] of Object.entries(r.keys)) {
    const o = d.keys[k] ?? { hit: 0, miss: 0, ms: 0 };
    d.keys[k] = { hit: o.hit + v.hit, miss: o.miss + v.miss, ms: o.ms + v.ms };
  }
  addDay(d);
  d.secs += Math.round(r.secs);
  return { stars, improved: stars > (old?.stars ?? 0) };
}

/** Apply a finished mock exam (no saving). */
export function applyExam(d: LearnData, e: ExamRec) {
  d.exams = [...d.exams, e].sort((a, b) => a.t - b.t).slice(-50);
  addDay(d, new Date(e.t));
  d.secs += Math.round(e.secs);
}

/** Join two sets of progress (guest progress into an account): best of each lesson, everything else added up. */
export function mergeLearn(a: LearnData, b: LearnData): LearnData {
  const out = emptyLearn();
  for (const id of new Set([...Object.keys(a.lessons), ...Object.keys(b.lessons)])) {
    const x = a.lessons[id], y = b.lessons[id];
    if (!x || !y) { out.lessons[id] = { ...(x ?? y)! }; continue; }
    out.lessons[id] = {
      stars: Math.max(x.stars, y.stars), wpm: Math.max(x.wpm, y.wpm), acc: Math.max(x.acc, y.acc),
      tries: x.tries + y.tries, done: Math.min(...[x.done, y.done].filter(Boolean)) || 0,
    };
  }
  for (const k of new Set([...Object.keys(a.keys), ...Object.keys(b.keys)])) {
    const x = a.keys[k] ?? { hit: 0, miss: 0, ms: 0 }, y = b.keys[k] ?? { hit: 0, miss: 0, ms: 0 };
    out.keys[k] = { hit: x.hit + y.hit, miss: x.miss + y.miss, ms: x.ms + y.ms };
  }
  out.days = [...new Set([...a.days, ...b.days])].sort().slice(-400);
  out.secs = a.secs + b.secs;
  out.openAll = a.openAll || b.openAll;
  out.exams = [...a.exams, ...b.exams].sort((p, q) => p.t - q.t).slice(-50);
  return out;
}

/** Anything worth keeping? */
export const hasProgress = (d: LearnData) =>
  Object.keys(d.lessons).length > 0 || Object.keys(d.keys).length > 0 || d.exams.length > 0 || d.openAll;

// ---------- the account copy ----------
// Stored at users/{uid}/learn/progress. The key stats are saved as "keyStats",
// since "keys" is a method name in the security rules.

export function toCloud(d: LearnData) {
  return { v: 1, lessons: d.lessons, keyStats: d.keys, days: d.days, secs: d.secs, openAll: d.openAll, exams: d.exams };
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Read the account copy back, keeping only well-formed parts. */
export function fromCloud(raw: Record<string, unknown> | undefined): LearnData {
  const d = emptyLearn();
  if (!raw) return d;
  const lessons = (raw.lessons ?? {}) as Record<string, Partial<LessonRec>>;
  for (const [id, x] of Object.entries(lessons)) {
    if (x && typeof x === 'object') d.lessons[id] = { stars: num(x.stars), wpm: num(x.wpm), acc: num(x.acc), tries: num(x.tries), done: num(x.done) };
  }
  const keys = (raw.keyStats ?? {}) as Record<string, Partial<KeyRec>>;
  for (const [k, x] of Object.entries(keys)) {
    if (x && typeof x === 'object') d.keys[k] = { hit: num(x.hit), miss: num(x.miss), ms: num(x.ms) };
  }
  if (Array.isArray(raw.days)) d.days = raw.days.filter((x): x is string => typeof x === 'string').slice(-400);
  d.secs = num(raw.secs);
  d.openAll = raw.openAll === true;
  if (Array.isArray(raw.exams)) d.exams = (raw.exams as ExamRec[]).filter(e => e && typeof e.t === 'number').slice(-50);
  return d;
}

/** Accuracy (0 to 1) of a key, or null with too little practice. */
export function keyAccuracy(d: LearnData, k: string, min = 6): number | null {
  const r = d.keys[k];
  if (!r || r.hit + r.miss < min) return null;
  return r.hit / (r.hit + r.miss);
}

/**
 * The keys you miss most in one course, worst first. `own` turns a stored key
 * name into that course's key, or null for the other course (Bijoy by default).
 */
export function weakKeys(d: LearnData, n = 6, own: (s: string) => string | null = s => (s.length === 1 ? s : null)): string[] {
  return Object.keys(d.keys)
    .map(s => ({ s, k: own(s) }))
    .filter((x): x is { s: string; k: string } => !!x.k && x.k !== ' ')
    .map(x => ({ k: x.k, a: keyAccuracy(d, x.s, 8) }))
    .filter((x): x is { k: string; a: number } => x.a !== null && x.a < 0.97)
    .sort((x, y) => x.a - y.a)
    .slice(0, n)
    .map(x => x.k);
}

/** Every key taught by the lessons you have finished in a course. */
export function learnedKeys(d: LearnData, lessons: CourseLesson[] = LESSONS): string {
  let keys = '';
  for (const l of lessons) if ((d.lessons[l.id]?.stars ?? 0) > 0) keys = l.allowed;
  return keys;
}
