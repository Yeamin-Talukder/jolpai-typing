// Typing lessons: learn the keyboard one row at a time.
//
// Each lesson allows the keys learned so far and focuses on its new keys.
// Practice items are real words that use only the allowed keys; when there
// are not enough of those, short drill syllables are generated from the
// allowed keys (and checked through the Bijoy engine, so they are always
// typeable exactly as shown).
import { BIJOY_KEYS, bijoyToUnicode, unicodeToSegments } from './bijoy';
import { BANGLA_WORDS } from './words-bn';
import { BANGLA_PASSAGES, ENGLISH_PASSAGES } from './passages';
import { ENGLISH_WORDS } from './words';

export interface Lesson {
  name: string;        // short label for the button
  title: string;       // tooltip
  newKeys: string;     // keys this lesson introduces ('' = all keys, any word)
  allowed: string;     // every key allowed so far
  conjuncts?: boolean; // juktakkhor lesson: words with the link key
  links?: boolean;     // conjuncts (link key + consonant) allowed in words
}

const BN_HOME = 'asdfghjkl', BN_HOME_S = 'ASDFGHJKL';
const BN_TOP = 'qwertyuiop', BN_TOP_S = 'QWERTYUIOP';
const BN_BOT = 'zxcvbnm', BN_BOT_S = 'ZXCVBNM';
const BN_ALL = BN_HOME + BN_HOME_S + BN_TOP + BN_TOP_S + BN_BOT + BN_BOT_S + '\\|&$';

export const BANGLA_LESSONS: Lesson[] = [
  { name: 'home', title: 'Home row: ক ত দ ব and া ি ু ৃ', newKeys: BN_HOME, allowed: BN_HOME },
  { name: 'home ⇧', title: 'Home row with Shift: খ থ ধ ভ অ ী ূ র্ ।', newKeys: BN_HOME_S, allowed: BN_HOME + BN_HOME_S },
  { name: 'top', title: 'Top row: ঙ য ড প ট চ জ হ গ ড়', newKeys: BN_TOP, allowed: BN_HOME + BN_HOME_S + BN_TOP },
  { name: 'top ⇧', title: 'Top row with Shift: ং য় ঢ ফ ঠ ছ ঝ ঞ ঘ ঢ়', newKeys: BN_TOP_S, allowed: BN_HOME + BN_HOME_S + BN_TOP + BN_TOP_S },
  { name: 'bottom', title: 'Bottom row: ্র ও ে র ন স ম', newKeys: BN_BOT, allowed: BN_HOME + BN_HOME_S + BN_TOP + BN_TOP_S + BN_BOT },
  { name: 'bottom ⇧', title: 'Bottom row with Shift: ্য ৌ ৈ ল ণ ষ শ', newKeys: BN_BOT_S, allowed: BN_ALL },
  { name: 'যুক্তাক্ষর', title: 'Conjuncts with the link key g (হসন্ত)', newKeys: 'g', allowed: BN_ALL, conjuncts: true, links: true },
  { name: 'all', title: 'All keys: common words', newKeys: '', allowed: BN_ALL, links: true },
];

const EN_HOME = 'asdfghjkl', EN_TOP = 'qwertyuiop', EN_BOT = 'zxcvbnm';
export const ENGLISH_LESSONS: Lesson[] = [
  { name: 'home', title: 'Home row: a s d f g h j k l', newKeys: EN_HOME, allowed: EN_HOME },
  { name: 'top', title: 'Top row: q w e r t y u i o p', newKeys: EN_TOP, allowed: EN_HOME + EN_TOP },
  { name: 'bottom', title: 'Bottom row: z x c v b n m', newKeys: EN_BOT, allowed: EN_HOME + EN_TOP + EN_BOT },
  { name: 'all', title: 'All keys: common words', newKeys: '', allowed: EN_HOME + EN_TOP + EN_BOT },
];

export const lessonsFor = (lang: 'english' | 'bangla') => (lang === 'bangla' ? BANGLA_LESSONS : ENGLISH_LESSONS);

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const bnKeys = (w: string) => unicodeToSegments(w).map(s => s.keys).join('');
const only = (keys: string, allowed: string) => [...keys].every(k => allowed.includes(k));
const hasAny = (keys: string, set: string) => !set || [...keys].some(k => set.includes(k));

function realWords(lesson: Lesson, lang: 'english' | 'bangla'): string[] {
  const pool = lang === 'bangla'
    ? [...BANGLA_WORDS, ...BANGLA_PASSAGES.flatMap(p => p.split(/\s+/))]
    : [...ENGLISH_WORDS, ...ENGLISH_PASSAGES.flatMap(p => p.toLowerCase().split(/\s+/))];
  const clean = [...new Set(pool.map(w => w.replace(/[।,:.;]+$/u, '')).filter(Boolean))];
  return clean.filter(w => {
    const k = lang === 'bangla' ? bnKeys(w) : w;
    if (!only(k, lang === 'bangla' ? lesson.allowed : lesson.allowed)) return false;
    // the link key followed by a consonant builds a conjunct (g + kar is a vowel)
    const hasLink = lang === 'bangla' && /g[^fdDsSacCxX]/.test(k);
    if (lesson.conjuncts) return hasLink;
    if (hasLink && !lesson.links) return false;
    return hasAny(k, lesson.newKeys);
  });
}

/** A random Bangla drill syllable group typed only with allowed keys. */
function bnDrill(lesson: Lesson): string | null {
  const a = lesson.allowed;
  const cons = [...BIJOY_KEYS.consonants].filter(k => a.includes(k));
  const pre = [...BIJOY_KEYS.preKar].filter(k => a.includes(k));
  const post = [...BIJOY_KEYS.postKar].filter(k => a.includes(k));
  if (!cons.length) return null;
  let keys = '';
  const n = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const usePre = pre.length && Math.random() < 0.3;
    if (usePre) keys += pick(pre);
    keys += pick(cons);
    if (a.includes('A') && Math.random() < 0.12) keys += 'A';
    if (!usePre && post.length && Math.random() < 0.6) keys += pick(post);
  }
  if (a.includes('F') && Math.random() < 0.1) keys = 'F' + keys;
  if (a.includes('Q') && Math.random() < 0.15) keys += 'Q';
  const text = bijoyToUnicode(keys);
  const canon = bnKeys(text);
  return only(canon, a) && hasAny(canon, lesson.newKeys) ? text : null;
}

function enDrill(lesson: Lesson): string | null {
  const a = lesson.allowed;
  let w = '';
  const len = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < len; i++) w += pick([...(Math.random() < 0.6 && lesson.newKeys ? lesson.newKeys : a)]);
  return hasAny(w, lesson.newKeys) ? w : null;
}

/** `count` practice items for a lesson, mixing real words and drills. */
export function lessonItems(lesson: Lesson, lang: 'english' | 'bangla', count: number): string[] {
  const words = realWords(lesson, lang);
  const out: string[] = [];
  // more real words when there are enough of them to avoid heavy repetition
  const wordShare = !lesson.newKeys ? 1 : words.length >= 40 ? 0.85 : words.length >= 10 ? 0.5 : 0;
  let guard = 0;
  while (out.length < count && guard++ < count * 200) {
    const item = words.length && Math.random() < wordShare
      ? pick(words)
      : lang === 'bangla' ? bnDrill(lesson) : enDrill(lesson);
    if (item && item !== out[out.length - 1]) out.push(item);
  }
  return out;
}
