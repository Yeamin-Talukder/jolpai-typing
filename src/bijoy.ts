// Bijoy (Bijoy 52 / Bayanno) keyboard engine.
//
// Key map source: bn-bijoyUnicode.mim from github.com/nazdridoy/bijoyLinux
// (m17n input method, cross-checked against its ANSI twin bn-bijoyClassic.mim).
//
// Two directions:
//   bijoyToUnicode(keys)  - what a Bijoy typist's key presses produce
//   unicodeToSegments(w)  - the key presses a Bijoy typist makes for a word,
//                           split into syllables so the UI can colour them
//
// Bijoy is typed in *visual* order: the pre-base vowel signs ি ে ৈ come
// before the consonant (d j = কি), and reph is typed after its consonant
// (m A = র্ম). Unicode stores them in logical order, so both directions
// reorder.

const NUKTA = '়';

/** Consonants (cluster members). ড় ঢ় য় use base + nukta, as NFC does. */
const CONS: Record<string, string> = {
  j: 'ক', J: 'খ', o: 'গ', O: 'ঘ', q: 'ঙ',
  y: 'চ', Y: 'ছ', u: 'জ', U: 'ঝ', I: 'ঞ',
  t: 'ট', T: 'ঠ', e: 'ড', E: 'ঢ', B: 'ণ',
  k: 'ত', K: 'থ', l: 'দ', L: 'ধ', b: 'ন',
  r: 'প', R: 'ফ', h: 'ব', H: 'ভ', m: 'ম',
  w: 'য', v: 'র', V: 'ল', M: 'শ', N: 'ষ', n: 'স', i: 'হ',
  p: 'ড' + NUKTA, P: 'ঢ' + NUKTA, W: 'য' + NUKTA,
};

/** Vowel signs typed before the consonant. */
const PRE_KAR: Record<string, string> = { d: 'ি', c: 'ে', C: 'ৈ' };

/** Vowel signs typed after the consonant. */
const POST_KAR: Record<string, string> = { f: 'া', D: 'ী', s: 'ু', S: 'ূ', a: 'ৃ', X: 'ৌ' };

/** Link key g followed by a kar key gives the independent vowel. */
const LINK_VOWEL: Record<string, string> = {
  f: 'আ', d: 'ই', D: 'ঈ', s: 'উ', S: 'ঊ', a: 'ঋ', c: 'এ', C: 'ঐ', x: 'ও', X: 'ঔ',
};

/** Everything else that maps to a fixed character. */
const OTHER: Record<string, string> = {
  F: 'অ', x: 'ও', Q: 'ং', '|': 'ঃ', '&': 'ঁ', '\\': 'ৎ', G: '।', $: '৳',
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  '`': '‘', '~': '“', "'": '’', '"': '”',
};

const LINK = 'g';
const HASANTA = '্';
const RA_PHALA = 'z';
const YA_PHALA = 'Z';
const REPH = 'A';

export function bijoyToUnicode(keys: string): string {
  let out = '';
  let clusterStart = -1;   // where the open consonant cluster begins in `out`
  let inCluster = false;   // last thing emitted belongs to an open cluster
  let afterLink = false;   // previous key was the link key g
  let rephFirst = false;   // reph typed before its consonant
  let pre: string | null = null; // pending pre-base kar

  const endCluster = () => {
    inCluster = false;
    rephFirst = false;
    if (pre) { out += pre; pre = null; }
  };

  for (const ch of keys) {
    if (afterLink) {
      afterLink = false;
      if (LINK_VOWEL[ch]) {
        out = out.slice(0, -1); // drop the hasanta
        endCluster();
        out += LINK_VOWEL[ch];
        continue;
      }
      if (CONS[ch]) { out += CONS[ch]; inCluster = true; continue; }
      endCluster(); // the hasanta stays visible
    }

    if (CONS[ch]) {
      if (rephFirst) { out += CONS[ch]; rephFirst = false; inCluster = true; continue; }
      if (inCluster) endCluster();
      clusterStart = out.length;
      out += CONS[ch];
      inCluster = true;
    } else if (ch === LINK) {
      out += HASANTA;
      afterLink = true;
    } else if (ch === RA_PHALA || ch === YA_PHALA) {
      out += ch === RA_PHALA ? '্র' : '্য';
    } else if (ch === REPH) {
      if (inCluster) {
        out = out.slice(0, clusterStart) + 'র্' + out.slice(clusterStart);
      } else {
        clusterStart = out.length;
        out += 'র্';
        rephFirst = true;
      }
    } else if (PRE_KAR[ch]) {
      endCluster();
      pre = PRE_KAR[ch];
    } else if (pre === 'ে' && inCluster && (ch === 'f' || ch === 'X')) {
      pre = null;
      inCluster = false;
      out += ch === 'f' ? 'ো' : 'ৌ';
    } else {
      endCluster();
      out += POST_KAR[ch] ?? OTHER[ch] ?? ch;
    }
  }
  endCluster();
  return out.normalize('NFC');
}

// ---------- Unicode -> Bijoy keys ----------

const invert = (m: Record<string, string>) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));

const CONS_REV = invert(CONS);
const PRE_REV = invert(PRE_KAR);
const POST_REV: Record<string, string> = invert(POST_KAR);
const INDEP_REV: Record<string, string> = { ...Object.fromEntries(Object.entries(LINK_VOWEL).map(([k, v]) => [v, LINK + k])), 'অ': 'F', 'ও': 'x' };
const OTHER_REV: Record<string, string> = { ...invert(OTHER), [HASANTA]: LINK };
delete OTHER_REV['অ'];
delete OTHER_REV['ও'];

export interface Segment { text: string; keys: string }

/** Split into code points, keeping a consonant and its nukta together. */
function tokens(word: string): string[] {
  const t: string[] = [];
  for (const ch of word.normalize('NFC')) {
    if (ch === NUKTA && t.length) t[t.length - 1] += ch;
    else t.push(ch);
  }
  return t;
}

/** The Bijoy key presses for a word, one segment per syllable. */
export function unicodeToSegments(word: string): Segment[] {
  const t = tokens(word);
  const segs: Segment[] = [];
  const isCons = (c: string | undefined) => c !== undefined && c in CONS_REV;
  let i = 0;
  while (i < t.length) {
    const start = i;
    const c = t[i];
    if (isCons(c)) {
      // reph: র + hasanta + consonant
      let reph = false;
      if (c === 'র' && t[i + 1] === HASANTA && isCons(t[i + 2])) { reph = true; i += 2; }
      let keys = CONS_REV[t[i]];
      i++;
      for (;;) {
        if (t[i] === HASANTA && (t[i + 1] === 'র' || t[i + 1] === 'য') && t[i + 2] !== HASANTA) {
          keys += t[i + 1] === 'র' ? RA_PHALA : YA_PHALA;
          i += 2;
        } else if (t[i] === HASANTA && isCons(t[i + 1])) {
          keys += LINK + CONS_REV[t[i + 1]];
          i += 2;
        } else break;
      }
      if (reph) keys += REPH;
      const k = t[i];
      if (k && PRE_REV[k]) { keys = PRE_REV[k] + keys; i++; }
      else if (k === 'ো') { keys = 'c' + keys + 'f'; i++; }
      else if (k === 'ৌ') { keys = 'c' + keys + 'X'; i++; }
      else if (k && POST_REV[k]) { keys += POST_REV[k]; i++; }
      segs.push({ text: t.slice(start, i).join(''), keys });
    } else if (INDEP_REV[c]) {
      segs.push({ text: c, keys: INDEP_REV[c] }); i++;
    } else if (OTHER_REV[c]) {
      segs.push({ text: c, keys: OTHER_REV[c] }); i++;
    } else if (POST_REV[c]) {
      segs.push({ text: c, keys: POST_REV[c] }); i++;
    } else if (PRE_REV[c]) {
      segs.push({ text: c, keys: PRE_REV[c] }); i++;
    } else {
      segs.push({ text: c, keys: c }); i++; // ASCII punctuation etc.
    }
  }
  return segs;
}

// ---------- physical keys ----------

/** US-layout characters for each physical key, so the engine works even
 *  if the operating system keyboard is not set to English. */
const US: Record<string, [string, string]> = {
  Backquote: ['`', '~'], Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'], Digit4: ['4', '$'],
  Digit5: ['5', '%'], Digit6: ['6', '^'], Digit7: ['7', '&'], Digit8: ['8', '*'], Digit9: ['9', '('],
  Digit0: ['0', ')'], Minus: ['-', '_'], Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
  Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'], Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'],
};
for (const l of 'abcdefghijklmnopqrstuvwxyz') US[`Key${l.toUpperCase()}`] = [l, l.toUpperCase()];

export function usKey(code: string, shift: boolean): string | null {
  const k = US[code];
  return k ? k[shift ? 1 : 0] : null;
}
