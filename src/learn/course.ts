// The Bijoy touch-typing course: units, lessons, explanations and practice.
//
// Every practice item is real Bangla text whose Bijoy key presses are worked
// out by the engine (unicodeToSegments) and checked back (bijoyToUnicode), so
// the course can only ever ask for keys that produce exactly what is shown.
import { bijoyToUnicode, unicodeToSegments, BIJOY_KEYS } from '../bijoy';
import { BANGLA_WORDS } from '../words-bn';
import { BANGLA_PASSAGES } from '../passages';
import type { IconName } from '../icons';

/** A short explanation, optionally with keys that "press themselves" to show the result. */
export interface Explainer { title: string; text: string; demo?: string }

export type Gen = 'syllables' | 'vowels' | 'conjuncts' | 'phala' | 'reph' | 'signs' | 'numbers';

export interface CourseLesson {
  id: string;
  unit: number;
  title: string;      // English
  bn: string;         // the letters it teaches, in Bangla
  summary: string;
  newKeys: string;    // keys met one by one at the start
  allowed: string;    // every key practice may use
  gen?: Gen;          // how drill items are made
  must?: (keys: string) => boolean; // a word must show the lesson's idea
  intro?: Explainer[];
  drill: number;      // drill items (0 = none)
  words: number;      // real words (0 = none)
  source?: 'words' | 'sentences' | 'passage';
  timed?: number;     // seconds, for speed lessons
  goal: number;       // wpm for two stars
}

export interface Unit { n: number; title: string; short: string; bn: string; summary: string; icon: IconName }

export const UNITS: Unit[] = [
  { n: 1, title: 'Home row', short: 'Home', bn: 'মাঝের সারি', summary: 'Where your fingers rest. ক ত দ ব and the vowel signs া ি ু ৃ.', icon: 'keyboard' },
  { n: 2, title: 'Home row with Shift', short: 'Home ⇧', bn: 'শিফট', summary: 'Shift gives each key a second letter: খ থ ধ ভ অ ী ূ ।', icon: 'shield' },
  { n: 3, title: 'Top row', short: 'Top', bn: 'উপরের সারি', summary: 'Reach up for ঙ য ড প ট চ জ হ গ ড়.', icon: 'trend' },
  { n: 4, title: 'Top row with Shift', short: 'Top ⇧', bn: 'উপরের সারি · শিফট', summary: 'ং য় ঢ ফ ঠ ছ ঝ ঞ ঘ ঢ়.', icon: 'zap' },
  { n: 5, title: 'Bottom row', short: 'Bottom', bn: 'নিচের সারি', summary: 'র ন স ম, the vowel sign ে, ও and the Shift letters ল ণ ষ শ ৈ ৌ.', icon: 'words' },
  { n: 6, title: 'Bijoy essentials', short: 'Bijoy rules', bn: 'বিজয়ের নিয়ম', summary: 'Independent vowels, যুক্তাক্ষর, ফলা, reph and ং ঃ ঁ ৎ: what makes Bijoy Bijoy.', icon: 'lessons' },
  { n: 7, title: 'Numbers', short: 'Numbers', bn: 'সংখ্যা', summary: 'Bangla digits ০ to ৯ on the number row.', icon: 'hash' },
  { n: 8, title: 'Real typing', short: 'Real typing', bn: 'আসল টাইপিং', summary: 'Common words, sentences, speed and a timed passage.', icon: 'exam' },
];

const HOME_START = 'jf', HOME_R = 'kl', HOME_L = 'dsa', HOME_B = 'h';
const SHIFT_1 = 'JKL', SHIFT_2 = 'DSFHG';
const TOP_L = 'qwert', TOP_R = 'yuiop', TOPS_L = 'QWERT', TOPS_R = 'YUIOP';
const BOT_1 = 'vbnm', BOT_2 = 'cx', BOT_S = 'VBNMCX';
const DIGITS = '0123456789';

// the link key g + a vowel-sign key makes an independent vowel; g + a consonant makes a conjunct
const hasConjunct = (k: string) => /g[^fdDsSacCxX]/.test(k);
const hasVowel = (k: string) => /g[fdDsSacCxX]/.test(k);

interface Spec extends Omit<CourseLesson, 'allowed' | 'unit'> { unit: number; add?: string }

const SPECS: Spec[] = [
  // ---- unit 1: home row ----
  { id: 'home-1', unit: 1, title: 'Your home keys', bn: 'ক া', summary: 'Rest your index fingers on F and J. They type া and ক.', newKeys: HOME_START, drill: 18, words: 8, goal: 6,
    intro: [
      { title: 'Sit and rest your hands', text: 'Sit up straight, wrists relaxed and just above the keyboard. Your eight fingers rest on the middle row; your thumbs rest on the space bar. You will look at the screen, not at your hands.' },
      { title: 'Find the bumps', text: 'Feel the small bumps on F and J. Put your left index finger on F and your right index finger on J. From here every key is a short reach, so you never need to look down.' },
      { title: 'Bangla with English keys', text: 'Bijoy puts Bangla letters on an ordinary keyboard. Jolpai Type turns your key presses into Bangla itself, so switch off any Bijoy or Avro software first. Press J then F and watch:', demo: 'jf' },
    ] },
  { id: 'home-2', unit: 1, title: 'ত and দ', bn: 'ত দ', summary: 'Right middle and ring fingers: K is ত, L is দ.', newKeys: HOME_R, drill: 22, words: 12, goal: 8 },
  { id: 'home-3', unit: 1, title: 'Vowel signs ি ু ৃ', bn: 'ি ু ৃ', summary: 'Your left hand types the vowel signs. And ি comes first.', newKeys: HOME_L, drill: 24, words: 12, goal: 8,
    intro: [
      { title: 'Vowel signs live on the left', text: 'D is ি, S is ু and A is ৃ, typed with your left middle, ring and little fingers. Most vowel signs come after the consonant, the way they sound: J then S gives কু.', demo: 'js' },
      { title: 'ি is typed before the consonant', text: 'Bijoy is typed the way the word looks. ি is drawn on the left of its consonant, so you press it first: D then J gives কি. The same is true for ে and ৈ, which you will meet later.', demo: 'dj' },
    ] },
  { id: 'home-4', unit: 1, title: 'ব and the whole row', bn: 'ব', summary: 'Your right index finger reaches left to H for ব. Then the whole home row.', newKeys: HOME_B, drill: 22, words: 16, goal: 10 },

  // ---- unit 2: home row with Shift ----
  { id: 'shift-1', unit: 2, title: 'Shift: খ থ ধ', bn: 'খ থ ধ', summary: 'Hold Shift with the other hand: Shift+J খ, Shift+K থ, Shift+L ধ.', newKeys: SHIFT_1, drill: 22, words: 14, goal: 10,
    intro: [
      { title: 'Shift with the other hand', text: 'Each key has a second letter, typed with Shift. Hold Shift with the little finger of the other hand: for a right-hand key, use left Shift. Shift+J gives খ, so J and Shift+J are ক and খ.', demo: 'JfKf' },
    ] },
  { id: 'shift-2', unit: 2, title: 'ী ূ অ ভ and ।', bn: 'ী ূ অ ভ ।', summary: 'Shift+D ী, Shift+S ূ, Shift+F অ, Shift+H ভ, Shift+G is the full stop ।.', newKeys: SHIFT_2, drill: 24, words: 16, goal: 10,
    intro: [
      { title: 'Long vowel signs and the দাঁড়ি', text: 'Shift turns ি into ী and ু into ূ. Shift+F is the vowel অ on its own, Shift+H is ভ, and Shift+G is the দাঁড়ি (।) that ends a Bangla sentence.', demo: 'HDkG' },
    ] },

  // ---- unit 3: top row ----
  { id: 'top-1', unit: 3, title: 'Top row, left hand', bn: 'ঙ য ড প ট', summary: 'Reach up and come back: Q ঙ, W য, E ড, R প, T ট.', newKeys: TOP_L, drill: 24, words: 16, goal: 12,
    intro: [
      { title: 'Reach, then come home', text: 'Each finger reaches straight up from its home key and comes back to it. Your left index finger covers both R (প) and T (ট).', demo: 'rfkf' },
    ] },
  { id: 'top-2', unit: 3, title: 'Top row, right hand', bn: 'চ জ হ গ ড়', summary: 'Y চ, U জ, I হ, O গ, P ড়.', newKeys: TOP_R, drill: 24, words: 18, goal: 12 },

  // ---- unit 4: top row with Shift ----
  { id: 'tops-1', unit: 4, title: 'Shift: ং য় ঢ ফ ঠ', bn: 'ং য় ঢ ফ ঠ', summary: 'Shift on the left half of the top row.', newKeys: TOPS_L, drill: 22, words: 16, goal: 12,
    intro: [
      { title: 'ং and য় come after', text: 'Shift+Q is অনুস্বার (ং) and Shift+W is য়. Both follow the letter before them: H F Shift+Q gives বাং, and J F Shift+W gives কায়.', demo: 'hfQ' },
    ] },
  { id: 'tops-2', unit: 4, title: 'Shift: ছ ঝ ঞ ঘ ঢ়', bn: 'ছ ঝ ঞ ঘ ঢ়', summary: 'Shift on the right half of the top row.', newKeys: TOPS_R, drill: 22, words: 16, goal: 12 },

  // ---- unit 5: bottom row ----
  { id: 'bot-1', unit: 5, title: 'Bottom row: র ন স ম', bn: 'র ন স ম', summary: 'Curl down: V র, B ন, N স, M ম.', newKeys: BOT_1, drill: 24, words: 18, goal: 14,
    intro: [
      { title: 'Curl down', text: 'For the bottom row, curl your finger down and in. Your left index finger types V (র); your right index finger types B (ন) and N (স); M (ম) is right below J.', demo: 'mfv' },
    ] },
  { id: 'bot-2', unit: 5, title: 'ে, ো and ও', bn: 'ে ো ও', summary: 'C is ে, typed first. ো is ে + consonant + া. X is ও.', newKeys: BOT_2, drill: 24, words: 18, goal: 12,
    intro: [
      { title: 'ে is typed first too', text: 'Like ি, the sign ে sits on the left of its letter, so you press C before the consonant: C then J gives কে.', demo: 'cj' },
      { title: 'ো is ে and া around the letter', text: 'Bijoy builds ো from two signs, the way it is drawn: ে before the consonant and া after it. C, J, F gives কো.', demo: 'cjf' },
      { title: 'ও on its own', text: 'X types the vowel ও by itself, for words like ও and ওরা.', demo: 'xvf' },
    ] },
  { id: 'bot-3', unit: 5, title: 'Shift: ল ণ ষ শ ৈ ৌ', bn: 'ল ণ ষ শ ৈ ৌ', summary: 'Shift on the bottom row. ৈ is typed first, like ি and ে.', newKeys: BOT_S, drill: 24, words: 18, goal: 12,
    intro: [
      { title: 'ৈ first, ৌ around', text: 'Shift+C is ৈ, typed before its letter: Shift+C then H gives বৈ. ৌ wraps its letter like ো: C, M, Shift+X gives মৌ.', demo: 'ChCmX' },
    ] },

  // ---- unit 6: Bijoy essentials ----
  { id: 'rule-vowels', unit: 6, title: 'Vowels on their own', bn: 'আ ই উ এ', summary: 'The link key G plus a vowel sign makes the full vowel: G F আ, G D ই, G C এ.', newKeys: 'g', gen: 'vowels', must: hasVowel, drill: 22, words: 18, goal: 12,
    intro: [
      { title: 'G, the link key', text: 'G is হসন্ত (্), Bijoy\'s link key. Press it and then a vowel-sign key to get the full vowel: G then F gives আ. Here it starts the word আমি, and ি still goes before ম.', demo: 'gfdm' },
      { title: 'Every vowel the same way', text: 'G with D ই, Shift+D ঈ, S উ, Shift+S ঊ, A ঋ, C এ, Shift+C ঐ, Shift+X ঔ. Only অ (Shift+F) and ও (X) have keys of their own.', demo: 'gcj' },
    ] },
  { id: 'rule-juktakkhor', unit: 6, title: 'যুক্তাক্ষর (conjuncts)', bn: 'ক্ত ন্ত স্ত', summary: 'Put G between two consonants to join them: J G K gives ক্ত.', newKeys: '', gen: 'conjuncts', must: hasConjunct, drill: 22, words: 20, goal: 12,
    intro: [
      { title: 'Join letters with G', text: 'To write a যুক্তাক্ষর, type the first consonant, then G, then the second: J, G, K gives ক্ত. Bijoy and your font draw the joined shape for you.', demo: 'jgk' },
      { title: 'Vowel signs still go round the whole cluster', text: 'A vowel sign belongs to the whole যুক্তাক্ষর: for ন্তি, type ি first, then N G K: D, B, G, K.', demo: 'dbgk' },
    ] },
  { id: 'rule-phala', unit: 6, title: 'র-ফলা and য-ফলা', bn: '্র ্য', summary: 'Z adds র-ফলা (প্র), Shift+Z adds য-ফলা (ব্য) to the letter before.', newKeys: 'zZ', gen: 'phala', must: k => /[zZ]/.test(k), drill: 22, words: 18, goal: 12,
    intro: [
      { title: 'ফলা follow their letter', text: 'Type the consonant, then Z for র-ফলা: R then Z gives প্র. Shift+Z gives য-ফলা: H then Shift+Z gives ব্য.', demo: 'rzhZ' },
    ] },
  { id: 'rule-reph', unit: 6, title: 'রেফ (র্)', bn: 'র্', summary: 'Shift+A adds reph. Type it after the letter it sits on: M Shift+A gives র্ম.', newKeys: 'A', gen: 'reph', must: k => k.includes('A'), drill: 22, words: 18, goal: 12,
    intro: [
      { title: 'Reph comes after its letter', text: 'Reph (র্) is drawn on top of a consonant. In Bijoy you type that consonant first, then Shift+A: J, M, Shift+A gives কর্ম.', demo: 'jmA' },
    ] },
  { id: 'rule-signs', unit: 6, title: 'ঁ ঃ ৎ and ৳', bn: 'ঁ ঃ ৎ', summary: 'Shift+7 চন্দ্রবিন্দু (ঁ), Shift+\\ বিসর্গ (ঃ), \\ খণ্ড-ত (ৎ).', newKeys: '&|\\', gen: 'signs', must: k => /[&|\\]/.test(k), drill: 20, words: 16, goal: 12,
    intro: [
      { title: 'চন্দ্রবিন্দু, বিসর্গ and খণ্ড-ত', text: 'Shift+7 adds ঁ after its letter and vowel sign: Y, F, Shift+7 gives চাঁ. Shift+\\ is ঃ, as in দুঃখ, and \\ is ৎ, as in হঠাৎ.', demo: 'yf&l' },
    ] },

  // ---- unit 7: numbers ----
  { id: 'numbers', unit: 7, title: 'Bangla digits', bn: '০ ১ ২ ৩', summary: 'The number row types Bangla digits: 1 is ১, 2 is ২ and so on.', newKeys: DIGITS, gen: 'numbers', drill: 26, words: 0, goal: 10,
    intro: [
      { title: 'Numbers without Shift', text: 'In Bijoy the number row gives Bangla digits directly. Reach up from the home row with the same finger as the letter below: 2 0 2 6 gives ২০২৬.', demo: '2026' },
    ] },

  // ---- unit 8: real typing ----
  { id: 'real-words', unit: 8, title: 'Common words', bn: 'শব্দ', summary: 'The most used Bangla words, everything you have learned together.', newKeys: '', drill: 0, words: 40, source: 'words', goal: 16 },
  { id: 'real-sentences', unit: 8, title: 'Sentences', bn: 'বাক্য', summary: 'Full sentences with punctuation, from start to দাঁড়ি.', newKeys: '', drill: 0, words: 45, source: 'sentences', goal: 16 },
  { id: 'real-speed', unit: 8, title: 'One-minute speed test', bn: 'গতি', summary: 'Type for one minute. Two stars at 20 wpm.', newKeys: '', drill: 0, words: 0, source: 'words', timed: 60, goal: 20 },
  { id: 'real-exam', unit: 8, title: 'Passage practice', bn: 'অনুচ্ছেদ', summary: 'Two minutes of typing a real passage against the clock.', newKeys: '', drill: 0, words: 0, source: 'passage', timed: 120, goal: 20 },
];

// allowed keys grow lesson by lesson
const ALL_BIJOY = 'asdfghjklASDFGHJKLqwertyuiopQWERTYUIOPzxcvbnmZXCVBNM&|\\$0123456789';
let soFar = '';
export const LESSONS: CourseLesson[] = SPECS.map(s => {
  soFar += s.newKeys + (s.add ?? '');
  // from the conjunct lesson on, everything taught so far is allowed
  const allowed = s.unit >= 8 ? ALL_BIJOY : [...new Set(soFar)].join('');
  return { ...s, allowed };
});

export const lessonById = (id: string) => LESSONS.find(l => l.id === id);
export const lessonsInUnit = (n: number) => LESSONS.filter(l => l.unit === n);

// ---------- practice items ----------

/** Words for practice: the site's word lists plus common words for the early rows. */
const EXTRA_WORDS = `
কাক কাকা কাকি দাদা দাদি বাবা বাকি দিক কবি তবু বুক দাবি বাদ তাক দাতা তাকা কাকু কৃত
খাতা থাকা থাকি দুধ কথা খুকি খাদ ভাব ভাবা ভাবি অভাব অধিক ভীত বধূ ভূত ধাতু অতিথি তিথি বিধি থাক
পাতা টাকা ডাক ডাকা যাক পাখি টিপ বাটি পাকা টুপি ডাব যত পথ পিতা চাকা জাত হাত হাতি চাপ জাদু গাড়ি বাড়ি পড়া পড়ি কাজ গাধা টিকিট চাবি হাড় পাগড়ি
ঠিক কাঠ পাঠ ঢাকা ফাটা যায় খায় পায় হয় গাছ কিছু পিছু ছাতা ঝড় বুঝি ঘাট ঘুড়ি ফিতা ছবি ঝাড়ু ঘড়ি ছুটি
মা নাম রাত মন সময় নদী সবুজ বাজার দরজা কাগজ পানি সাদা রাজা নিজ হাসি মাটি জমি নতুন মাস নিয়ম সরকার মামা নানা গরম নরম মরিচ সাপ সাত নয়
দেখা কেন সে মেয়ে তোমার মোট ছোট বোন রোদ ও ওরা দেখি করে পেট দেরি সোনা কোন ঘোড়া তোতা বেড়া রেখা
দেশ বলা ফল ফুল শিশু মানুষ শেষ বৈঠক মৌমাছি গৌরব কারণ বাংলা পৌষ তৈরি লাল শীত বিশ কলম খেলা বেশি ষোল গণনা নৌকা দৈনিক শৈশব
আমি আজ আকাশ উপর এক এখন এবং আমার এই আসা ঈদ ঋণ ঔষধ ইতিহাস আলো ইট উট এখানে ওখানে আকার আবার
কিন্তু শক্তি বন্ধু আনন্দ পরীক্ষা ক্ষমা চিন্তা মিষ্টি পুস্তক ইচ্ছা উত্তর শান্ত সুন্দর রক্ত সম্পদ সম্মান স্কুল শিক্ষা লক্ষ পক্ষ স্বাধীন
প্রথম ক্রয় গ্রাম ব্যবসা ন্যায় সত্য প্রায় ভ্রমণ প্রশ্ন প্রেম শ্রম ত্রিশ গ্রহ ব্যক্তি
কর্ম ধর্ম সূর্য অর্থ শর্ত বর্ষা দর্শক তর্ক গর্ব পর্যন্ত কর্তব্য মর্যাদা নির্ভর সর্বদা আর্থিক পূর্ব বর্ণ চর্চা
চাঁদ দুঃখ হঠাৎ উৎসব বাঁশ পাঁচ কাঁচা আঁকা সাঁতার রং সংখ্যা সংসার অংক দুঃসময় নিঃশ্বাস সৎ বৃহৎ জগৎ মহৎ
`.split(/\s+/).filter(Boolean);

export const keysOf = (w: string) => unicodeToSegments(w).map(s => s.keys).join('');
/** A word can be practised only if its keys give back exactly the word. */
export const typeable = (w: string) => { const k = keysOf(w); return !!k && bijoyToUnicode(k) === w.normalize('NFC'); };

const POOL = [...new Set([...EXTRA_WORDS, ...BANGLA_WORDS, ...BANGLA_PASSAGES.flatMap(p => p.split(/\s+/))]
  .map(w => w.replace(/[।,:;?!.]+$/u, '').normalize('NFC')).filter(w => w && typeable(w)))];

const only = (keys: string, allowed: string) => [...keys].every(k => allowed.includes(k));
const hasAny = (keys: string, set: string) => !set || [...keys].some(k => set.includes(k));
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/** Real words that fit the lesson. */
export function lessonWords(l: CourseLesson): string[] {
  return POOL.filter(w => {
    const k = keysOf(w);
    if (!only(k, l.allowed)) return false;
    if (l.unit < 6 && /g/.test(k)) return false;                 // the link key is taught in unit 6
    if (l.id === 'rule-vowels' && hasConjunct(k)) return false;  // vowels before conjuncts
    if (l.must) return l.must(k);
    return hasAny(k, l.newKeys);
  });
}

// short syllable drills made from the keys taught so far
const CONS = [...BIJOY_KEYS.consonants], PRE = [...BIJOY_KEYS.preKar], POST = [...BIJOY_KEYS.postKar];
const CLUSTERS = ['ক্ত', 'ন্ত', 'স্ত', 'ন্দ', 'ম্প', 'ক্ষ', 'ষ্ট', 'স্ক', 'ন্ন', 'ল্প', 'চ্ছ', 'ন্ধ', 'ঙ্গ', 'দ্দ', 'ত্ত', 'ম্ম', 'স্থ', 'প্ত', 'স্প', 'ণ্ড', 'ন্ট'];
const VOWELS = ['আ', 'ই', 'ঈ', 'উ', 'ঊ', 'এ', 'ঐ', 'ঔ', 'ঋ'];
const SIGN_KARS = ['া', 'ি', 'ু', 'ে', 'ী', ''];
const SIGN_CONS = ['চ', 'ব', 'প', 'ক', 'দ', 'স', 'ম', 'ত', 'ঠ', 'হ'];

function syllables(l: CourseLesson): string | null {
  const a = l.allowed;
  const cons = CONS.filter(k => a.includes(k)), pre = PRE.filter(k => a.includes(k)), post = POST.filter(k => a.includes(k));
  if (!cons.length) return null;
  // favour the new keys so each one gets plenty of practice
  const fresh = [...l.newKeys];
  let keys = '';
  const n = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const p = pre.length && Math.random() < 0.3 ? pick(pre.some(k => fresh.includes(k)) && Math.random() < 0.6 ? pre.filter(k => fresh.includes(k)) : pre) : '';
    const freshCons = cons.filter(k => fresh.includes(k));
    const c = freshCons.length && Math.random() < 0.6 ? pick(freshCons) : pick(cons);
    const freshPost = post.filter(k => fresh.includes(k));
    const q = !p && post.length && Math.random() < 0.65 ? pick(freshPost.length && Math.random() < 0.6 ? freshPost : post) : '';
    keys += p + c + q;
    if (a.includes('Q') && Math.random() < (fresh.includes('Q') ? 0.4 : 0.08)) keys += 'Q';
    if (a.includes('W') && Math.random() < (fresh.includes('W') ? 0.3 : 0.05)) keys += 'fW';
  }
  if (a.includes('F') && Math.random() < (fresh.includes('F') ? 0.3 : 0.05)) keys = 'F' + keys;
  if (a.includes('x') && Math.random() < (fresh.includes('x') ? 0.3 : 0.05)) keys = 'x' + keys;
  if (a.includes('G') && Math.random() < (fresh.includes('G') ? 0.3 : 0.05)) keys += 'G';
  return bijoyToUnicode(keys);
}

function generated(l: CourseLesson): string | null {
  const kar = () => pick(SIGN_KARS);
  switch (l.gen) {
    case 'vowels': {
      const v = pick(VOWELS);
      return Math.random() < 0.5 ? v : v + bijoyToUnicode(pick(CONS.filter(k => 'jklhrtyumnbv'.includes(k))) + pick(['f', '', 's']));
    }
    case 'conjuncts':
      return pick(CLUSTERS) + kar();
    case 'phala': {
      const c = pick(['প', 'ক', 'গ', 'ত', 'ভ', 'শ', 'ব', 'ন', 'স', 'দ']);
      return c + (Math.random() < 0.6 ? '্র' : '্য') + kar();
    }
    case 'reph':
      return 'র্' + pick(['ম', 'ক', 'থ', 'ত', 'গ', 'ব', 'শ', 'য', 'ণ', 'চ']) + kar();
    case 'signs': {
      const r = Math.random();
      if (r < 0.4) return pick(SIGN_CONS) + pick(['া', 'ি', 'ু', 'ে']) + 'ঁ' + pick(['দ', 'ক', 'চ', 'শ', '']);
      if (r < 0.7) return pick(SIGN_CONS) + pick(['ু', 'া', '']) + 'ঃ' + pick(['খ', 'স', 'শ']);
      return pick(SIGN_CONS) + pick(['া', '']) + pick(['ঠ', 'ব', 'হ', 'জ']) + 'ৎ';
    }
    case 'numbers': {
      const n = 1 + Math.floor(Math.random() * 4);
      let s = String(1 + Math.floor(Math.random() * 9));
      for (let i = 1; i < n; i++) s += String(Math.floor(Math.random() * 10));
      return [...s].map(d => '০১২৩৪৫৬৭৮৯'[Number(d)]).join('');
    }
    default:
      return syllables(l);
  }
}

/** One drill item that fits the lesson exactly, or null. */
function drillItem(l: CourseLesson): string | null {
  const text = generated(l);
  if (!text || !typeable(text)) return null;
  const k = keysOf(text);
  if (!only(k, l.allowed)) return null;
  if (l.gen) return text;
  return hasAny(k, l.newKeys) ? text : null;
}

function fill(count: number, make: () => string | null): string[] {
  const out: string[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 300) {
    const item = make();
    if (item && item !== out[out.length - 1]) out.push(item);
  }
  return out;
}

/** Drill items for a lesson. */
export const drillItems = (l: CourseLesson) => fill(l.drill, () => drillItem(l));

/** Word items for a lesson (real words; drills fill in when there are too few). */
export function wordItems(l: CourseLesson, count = l.words): string[] {
  if (l.source === 'sentences' || l.source === 'passage') {
    const text = l.source === 'passage' ? pick(BANGLA_PASSAGES) : BANGLA_PASSAGES.join(' ');
    let words = text.split(/\s+/).filter(w => w && typeable(w));
    if (l.source === 'sentences') {
      // a run of whole sentences from a random place
      const starts = words.map((w, i) => (i === 0 || /[।?!]$/.test(words[i - 1]) ? i : -1)).filter(i => i >= 0);
      const s = pick(starts);
      words = [...words.slice(s), ...words.slice(0, s)];
    }
    return words.slice(0, count || words.length);
  }
  const pool = lessonWords(l);
  if (pool.length < 4) return fill(count, () => drillItem(l));
  // with only a few real words, mix in drills so the same words do not repeat too often
  const share = Math.max(0.5, Math.min(1, pool.length / count));
  return fill(count, () => (Math.random() < share ? pick(pool) : drillItem(l)));
}

/** Items for a timed lesson: plenty, so nobody runs out. */
export const timedItems = (l: CourseLesson) => wordItems({ ...l, words: 400 }, l.source === 'passage' ? 0 : 400);

/** A drill made from someone's weakest keys, using everything they have learned. */
export function weakKeysLesson(weak: string, learned: string): CourseLesson {
  const allowed = [...new Set(learned + weak)].join('');
  return {
    id: 'weak', unit: 0, title: 'Your weak keys', bn: [...weak].map(k => bijoyToUnicode(k) || k).join(' '),
    summary: 'A drill built from the keys you miss most.', newKeys: weak, allowed, drill: 30, words: 16, goal: 12,
  };
}
