// Course progress, kept in this browser: stars per lesson, accuracy and speed
// per key, practice time and the days you practised.
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
}

const KEY = 'jolpai-type:learn';
const empty = (): LearnData => ({ v: 1, lessons: {}, keys: {}, days: [], secs: 0, openAll: false });

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

/** A lesson is open once the one before it has at least one star. */
export function isUnlocked(d: LearnData, i: number): boolean {
  if (d.openAll || i === 0) return true;
  return (d.lessons[LESSONS[i - 1].id]?.stars ?? 0) > 0;
}

/** The lesson to continue with: the first open one without a star, or the last one. */
export function nextLesson(d: LearnData): CourseLesson {
  const i = LESSONS.findIndex((l, n) => isUnlocked(d, n) && !(d.lessons[l.id]?.stars));
  return LESSONS[i >= 0 ? i : LESSONS.length - 1];
}

export const doneCount = (d: LearnData) => LESSONS.filter(l => (d.lessons[l.id]?.stars ?? 0) > 0).length;
export const starCount = (d: LearnData) => LESSONS.reduce((a, l) => a + (d.lessons[l.id]?.stars ?? 0), 0);

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
  const stars = starsFor(r.acc, r.wpm, goal);
  const old = d.lessons[r.lessonId];
  if (r.lessonId !== 'weak') {
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
  const today = dayStr(new Date());
  if (d.days[d.days.length - 1] !== today) d.days = [...d.days, today].slice(-400);
  d.secs += Math.round(r.secs);
  saveLearn(d);
  return { stars, improved: stars > (old?.stars ?? 0) };
}

/** Accuracy (0 to 1) of a key, or null with too little practice. */
export function keyAccuracy(d: LearnData, k: string, min = 6): number | null {
  const r = d.keys[k];
  if (!r || r.hit + r.miss < min) return null;
  return r.hit / (r.hit + r.miss);
}

/** The keys you miss most (Bijoy key characters), worst first. */
export function weakKeys(d: LearnData, n = 6): string[] {
  return Object.keys(d.keys)
    .filter(k => k !== ' ')
    .map(k => ({ k, a: keyAccuracy(d, k, 8) }))
    .filter((x): x is { k: string; a: number } => x.a !== null && x.a < 0.97)
    .sort((x, y) => x.a - y.a)
    .slice(0, n)
    .map(x => x.k);
}

/** Every key taught by the lessons you have finished. */
export function learnedKeys(d: LearnData): string {
  let keys = '';
  for (const l of LESSONS) if ((d.lessons[l.id]?.stars ?? 0) > 0) keys = l.allowed;
  return keys;
}
