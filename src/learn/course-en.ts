// The English touch-typing course: the same lesson flow as the Bijoy course
// (explain, meet each key, drill, real words, stars), on the US layout.
//
// Every practice item is made only of keys the lesson allows, so the course
// never asks for a key you have not met yet.
import { ENGLISH_WORDS } from '../words';
import { ENGLISH_PASSAGES } from '../passages';
import type { CourseLesson, Unit } from './course';

export const EN_UNITS: Unit[] = [
  { n: 1, title: 'Home row', short: 'Home', bn: 'a s d f · j k l ;', summary: 'Where your fingers rest: a s d f under the left hand, j k l ; under the right.', icon: 'keyboard' },
  { n: 2, title: 'Top row', short: 'Top', bn: 'q w e r t · y u i o p', summary: 'Reach up and come back: e i, r u, t y, w o, q p.', icon: 'trend' },
  { n: 3, title: 'Bottom row', short: 'Bottom', bn: 'z x c v b · n m , .', summary: 'Curl down for c v b n m, then the comma, full stop and apostrophe.', icon: 'words' },
  { n: 4, title: 'Capitals and punctuation', short: 'Shift', bn: 'A–Z ? ! :', summary: 'Shift with the other hand for capitals, then ? ! and :.', icon: 'zap' },
  { n: 5, title: 'Numbers', short: 'Numbers', bn: '1 2 3 4 5 · 6 7 8 9 0', summary: 'The number row, reached from the home row with the same finger.', icon: 'hash' },
  { n: 6, title: 'Real typing', short: 'Real typing', bn: 'words · sentences', summary: 'Common words, sentences, a one-minute test and a timed passage.', icon: 'exam' },
];

const LEFT_CAPS = 'QWERTASDFGZXCVB', RIGHT_CAPS = 'YUIOPHJKLNM';

interface Spec extends Omit<CourseLesson, 'allowed' | 'unit'> { unit: number }

const SPECS: Spec[] = [
  // ---- unit 1: home row ----
  { id: 'en-home-1', unit: 1, title: 'Your home keys', bn: 'f j', summary: 'Rest your index fingers on F and J, the keys with the bumps.', newKeys: 'fj', drill: 18, words: 0, goal: 8,
    intro: [
      { title: 'Sit and rest your hands', text: 'Sit up straight, wrists relaxed and just above the keyboard. Your eight fingers rest on the middle row; your thumbs rest on the space bar. You will look at the screen, not at your hands.' },
      { title: 'Find the bumps', text: 'Feel the small bumps on F and J. Put your left index finger on F and your right index finger on J. From here every key is a short reach, so you never need to look down.', demo: 'fj' },
    ] },
  { id: 'en-home-2', unit: 1, title: 'D and K', bn: 'd k', summary: 'Your middle fingers rest on D and K.', newKeys: 'dk', drill: 22, words: 0, goal: 10 },
  { id: 'en-home-3', unit: 1, title: 'S and L', bn: 's l', summary: 'Your ring fingers rest on S and L.', newKeys: 'sl', drill: 26, words: 0, goal: 10 },
  { id: 'en-home-4', unit: 1, title: 'A and semicolon', bn: 'a ;', summary: 'Your little fingers rest on A and ;.', newKeys: 'a;', drill: 22, words: 14, goal: 12,
    intro: [
      { title: 'All eight fingers home', text: 'Your little fingers rest on A and ;. Now every finger has a home key: a s d f under the left hand, j k l ; under the right. Type the words with what you know:', demo: 'ask dad' },
    ] },
  { id: 'en-home-5', unit: 1, title: 'G and H', bn: 'g h', summary: 'Your index fingers reach in: left to G, right to H.', newKeys: 'gh', drill: 22, words: 18, goal: 12 },

  // ---- unit 2: top row ----
  { id: 'en-top-1', unit: 2, title: 'E and I', bn: 'e i', summary: 'Middle fingers reach up: D to E, K to I.', newKeys: 'ei', drill: 22, words: 18, goal: 14,
    intro: [
      { title: 'Reach, then come home', text: 'Each finger reaches straight up from its home key and comes back to it. Your left middle finger goes from D up to E, your right middle finger from K up to I.', demo: 'lie side' },
    ] },
  { id: 'en-top-2', unit: 2, title: 'R and U', bn: 'r u', summary: 'Index fingers reach up: F to R, J to U.', newKeys: 'ru', drill: 22, words: 18, goal: 14 },
  { id: 'en-top-3', unit: 2, title: 'T and Y', bn: 't y', summary: 'Index fingers reach up and in: T and Y.', newKeys: 'ty', drill: 22, words: 18, goal: 15 },
  { id: 'en-top-4', unit: 2, title: 'W and O', bn: 'w o', summary: 'Ring fingers reach up: S to W, L to O.', newKeys: 'wo', drill: 22, words: 18, goal: 15 },
  { id: 'en-top-5', unit: 2, title: 'Q and P', bn: 'q p', summary: 'Little fingers reach up: A to Q, ; to P.', newKeys: 'qp', drill: 22, words: 18, goal: 15 },

  // ---- unit 3: bottom row ----
  { id: 'en-bot-1', unit: 3, title: 'C and comma', bn: 'c ,', summary: 'Curl down: D to C, K to the comma.', newKeys: 'c,', drill: 22, words: 18, goal: 15,
    intro: [
      { title: 'Curl down', text: 'For the bottom row, curl your finger down and in, then come back home. Your left middle finger types C; your right middle finger types the comma.', demo: 'cat, car' },
    ] },
  { id: 'en-bot-2', unit: 3, title: 'V and M', bn: 'v m', summary: 'Index fingers curl down: F to V, J to M.', newKeys: 'vm', drill: 22, words: 18, goal: 16 },
  { id: 'en-bot-3', unit: 3, title: 'B and N', bn: 'b n', summary: 'Index fingers curl down and in: B and N.', newKeys: 'bn', drill: 22, words: 18, goal: 16 },
  { id: 'en-bot-4', unit: 3, title: 'X and full stop', bn: 'x .', summary: 'Ring fingers curl down: S to X, L to the full stop.', newKeys: 'x.', drill: 22, words: 18, goal: 16 },
  { id: 'en-bot-5', unit: 3, title: 'Z and apostrophe', bn: "z '", summary: "Little fingers: A down to Z, ; across to the apostrophe.", newKeys: "z'", drill: 22, words: 18, goal: 16 },

  // ---- unit 4: capitals and punctuation ----
  { id: 'en-shift-1', unit: 4, title: 'Capitals, left hand', bn: 'A S D F', summary: 'For a capital on the left half, hold right Shift with your right little finger.', newKeys: LEFT_CAPS, drill: 22, words: 18, goal: 15,
    intro: [
      { title: 'Shift with the other hand', text: 'Hold Shift with the little finger of the other hand: for a left-hand letter, use right Shift. Hold it, press the letter, let go of both.', demo: 'Sad Fred' },
    ] },
  { id: 'en-shift-2', unit: 4, title: 'Capitals, right hand', bn: 'J K L', summary: 'For a capital on the right half, hold left Shift with your left little finger.', newKeys: RIGHT_CAPS, drill: 22, words: 18, goal: 15 },
  { id: 'en-shift-3', unit: 4, title: 'Question mark, ! and :', bn: '? ! :', summary: 'Shift+/ is ?, Shift+1 is !, Shift+; is :.', newKeys: '?!:', drill: 20, words: 18, goal: 15,
    intro: [
      { title: 'Punctuation on Shift', text: 'The question mark is Shift with the slash key, the colon is Shift with ;, and ! is Shift with 1, a reach up from A with your left little finger.', demo: 'Why? No!' },
    ] },

  // ---- unit 5: numbers ----
  { id: 'en-num-1', unit: 5, title: 'Numbers 1 to 5', bn: '1 2 3 4 5', summary: 'Left hand: reach up two rows from A S D F.', newKeys: '12345', drill: 24, words: 0, goal: 12,
    intro: [
      { title: 'Two rows up', text: 'Each number is two rows above the home row, typed by the same finger as the letter below it: 1 little, 2 ring, 3 middle, 4 and 5 index.', demo: '12345' },
    ] },
  { id: 'en-num-2', unit: 5, title: 'Numbers 6 to 0', bn: '6 7 8 9 0', summary: 'Right hand: 6 and 7 index, 8 middle, 9 ring, 0 little.', newKeys: '67890', drill: 24, words: 0, goal: 12 },

  // ---- unit 6: real typing ----
  { id: 'en-real-words', unit: 6, title: 'Common words', bn: 'words', summary: 'The most used English words, everything you have learned together.', newKeys: '', drill: 0, words: 40, source: 'words', goal: 24 },
  { id: 'en-real-sentences', unit: 6, title: 'Sentences', bn: 'sentences', summary: 'Full sentences with capitals and punctuation.', newKeys: '', drill: 0, words: 45, source: 'sentences', goal: 22 },
  { id: 'en-real-speed', unit: 6, title: 'One-minute speed test', bn: 'speed', summary: 'Type for one minute. Two stars at 30 wpm.', newKeys: '', drill: 0, words: 0, source: 'words', timed: 60, goal: 30 },
  { id: 'en-real-passage', unit: 6, title: 'Passage practice', bn: 'passage', summary: 'Two minutes of typing a real passage against the clock.', newKeys: '', drill: 0, words: 0, source: 'passage', timed: 120, goal: 28 },
];

/** Every key the English course can ask for. */
export const ALL_ENGLISH = "asdfghjkl;qwertyuiopzxcvbnm,.'" + LEFT_CAPS + RIGHT_CAPS + '?!:1234567890-"()';

let soFar = '';
export const EN_LESSONS: CourseLesson[] = SPECS.map(s => {
  soFar += s.newKeys;
  const allowed = s.unit >= 6 ? ALL_ENGLISH : [...new Set(soFar)].join('');
  return { ...s, allowed };
});

export const enLessonsInUnit = (n: number) => EN_LESSONS.filter(l => l.unit === n);

// ---------- practice items ----------

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const only = (text: string, allowed: string) => [...text].every(c => allowed.includes(c));
const hasAny = (text: string, set: string) => !set || [...text].some(c => set.includes(c));
const lower = (s: string) => [...s].filter(c => /[a-z]/.test(c)).join('');
const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

/** Real words for the first lessons, when the common-word list has too few that fit. */
const HOME_WORDS = 'a ad add ads all as ask dad fad fall falls flask flag gag gal gas glad had half hall halls has hash jag lad lag lass sad saga salad sash shall shad slag lash dash gash flash'.split(' ');

/** Words with z and apostrophes, for the last bottom-row lesson. */
const Z_WORDS = "zero zone zoo size lazy prize maze haze daze doze zip zest zinc quiz dozen frozen amaze blaze crazy breeze freeze puzzle don't can't won't isn't wasn't didn't doesn't it's that's what's let's there's you're we're they're".split(' ');

const WORDS = [...new Set([...HOME_WORDS, ...Z_WORDS, ...ENGLISH_WORDS,
  ...ENGLISH_PASSAGES.flatMap(p => p.split(/\s+/)).map(w => w.replace(/[^A-Za-z']/g, '').toLowerCase())]
  .filter(w => /^[a-z][a-z']*[a-z]$|^[a-z]$/.test(w)))];

/** A made-up drill word from the lesson's letters, leaning on the new ones. */
function drillWord(l: CourseLesson): string {
  const letters = [...lower(l.allowed)];
  const fresh = letters.filter(c => l.newKeys.includes(c));
  const n = 2 + Math.floor(Math.random() * 4);
  let w = '';
  for (let i = 0; i < n; i++) w += fresh.length && Math.random() < 0.55 ? pick(fresh) : pick(letters);
  return w;
}

/** Add the punctuation and capitals a lesson has reached, the way they are used in writing. */
function dress(w: string, l: CourseLesson, focus: boolean): string {
  const a = l.allowed;
  const newCaps = [...l.newKeys].filter(c => /[A-Z]/.test(c));
  // capitals: the lesson's own capitals often, others now and then
  if (newCaps.length && focus && newCaps.includes(w[0].toUpperCase())) w = cap(w);
  else if (a.includes(w[0].toUpperCase()) && /[A-Z]/.test(a) && Math.random() < 0.15) w = cap(w);
  const mark = (c: string, p: number) => a.includes(c) && Math.random() < (l.newKeys.includes(c) ? 0.45 : p);
  if (mark(',', 0.08)) w += ',';
  else if (mark('.', 0.08)) w += '.';
  else if (mark(';', l.newKeys.includes(';') ? 0.45 : 0.03)) w += ';';
  else if (mark('?', 0.06)) w += '?';
  else if (mark('!', 0.04)) w += '!';
  else if (mark(':', 0.04)) w += ':';
  return w;
}

function numberItem(l: CourseLesson): string {
  const digits = [...l.allowed].filter(c => /[0-9]/.test(c));
  const fresh = digits.filter(c => l.newKeys.includes(c));
  const n = 1 + Math.floor(Math.random() * 4);
  let s = '';
  for (let i = 0; i < n; i++) s += fresh.length && Math.random() < 0.65 ? pick(fresh) : pick(digits);
  return s;
}

const isNumbers = (l: CourseLesson) => /^[0-9]+$/.test(l.newKeys);
const isCaps = (l: CourseLesson) => /[A-Z]/.test(l.newKeys);

/** Real words that fit the lesson (lower case, before punctuation and capitals are added). */
export function enLessonWords(l: CourseLesson): string[] {
  const letters = l.allowed;
  return WORDS.filter(w => only(w, letters) && (isCaps(l)
    ? l.newKeys.includes(w[0].toUpperCase())
    : !lower(l.newKeys) || hasAny(w, lower(l.newKeys))));
}

/** One drill item for the lesson. */
function drillItem(l: CourseLesson): string {
  if (isNumbers(l)) return numberItem(l);
  if (isCaps(l)) {
    const pool = enLessonWords(l);
    if (pool.length) return cap(pick(pool));
    return cap(drillWord(l));
  }
  if (/[?!:]/.test(l.newKeys)) {
    const pool = enLessonWords({ ...l, newKeys: '' });
    return dress(pick(pool.length ? pool : [drillWord(l)]), l, true);
  }
  return dress(drillWord(l), l, true);
}

/** `count` items, each made only of the lesson's keys, never the same twice in a row. */
function fill(l: CourseLesson, count: number, make: () => string): string[] {
  const out: string[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 200) {
    const item = make();
    if (item && only(item, l.allowed) && item !== out[out.length - 1]) out.push(item);
  }
  return out;
}

/** Drill items for a lesson. */
export const enDrillItems = (l: CourseLesson) => fill(l, l.drill, () => drillItem(l));

/** Word items for a lesson: real words, dressed with the punctuation and capitals reached so far. */
export function enWordItems(l: CourseLesson, count = l.words): string[] {
  if (l.source === 'sentences' || l.source === 'passage') {
    const text = l.source === 'passage' ? pick(ENGLISH_PASSAGES) : ENGLISH_PASSAGES.join(' ');
    let words = text.split(/\s+/).filter(w => w && only(w, ALL_ENGLISH));
    if (l.source === 'sentences') {
      const starts = words.map((w, i) => (i === 0 || /[.?!]$/.test(words[i - 1]) ? i : -1)).filter(i => i >= 0);
      const s = pick(starts);
      words = [...words.slice(s), ...words.slice(0, s)];
    }
    return words.slice(0, count || words.length);
  }
  if (isNumbers(l)) return fill(l, count, () => numberItem(l));
  const pool = enLessonWords(l);
  if (pool.length < 4) return fill(l, count, () => drillItem(l));
  return fill(l, count, () => (isCaps(l) ? cap(pick(pool)) : dress(pick(pool), l, false)));
}

/** Items for a timed lesson: plenty, so nobody runs out. */
export const enTimedItems = (l: CourseLesson) => enWordItems({ ...l, words: 400 }, l.source === 'passage' ? 0 : 400);

/** A drill from someone's weakest English keys, using everything they have learned. */
export function enWeakKeysLesson(weak: string, learned: string): CourseLesson {
  const allowed = [...new Set(learned + weak)].join('');
  return {
    id: 'en-weak', unit: 0, title: 'Your weak keys', bn: [...weak].join(' '),
    summary: 'A drill built from the keys you miss most.', newKeys: weak, allowed, drill: 30, words: 16, goal: 16,
  };
}
