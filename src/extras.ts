// Punctuation and numbers mixed into the random words.
// English: sentences start with a capital and end with . ? or !, with commas
// and the odd quote, bracket or semicolon. Bangla: sentences end with the
// dari (।) or ? / !, with commas; numbers use Bangla digits (Bijoy's number keys).

export interface Extras { punctuation: boolean; numbers: boolean }

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

function number(lang: 'english' | 'bangla', rand: () => number): string {
  const len = 1 + Math.floor(rand() * 4);
  let n = String(1 + Math.floor(rand() * 9));
  for (let i = 1; i < len; i++) n += String(Math.floor(rand() * 10));
  return lang === 'bangla' ? [...n].map(d => BN_DIGITS[Number(d)]).join('') : n;
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** Add punctuation and/or numbers to a list of plain words. */
export function addExtras(words: string[], lang: 'english' | 'bangla', ex: Extras, rand: () => number = Math.random): string[] {
  if (!ex.punctuation && !ex.numbers) return words;
  const out: string[] = [];
  let sentenceStart = true;
  for (let i = 0; i < words.length; i++) {
    let w = words[i];
    if (ex.numbers && rand() < 0.15) w = number(lang, rand);
    if (ex.punctuation) {
      if (lang === 'english' && sentenceStart) w = cap(w);
      sentenceStart = false;
      const last = i === words.length - 1;
      const r = rand();
      if (last || r < 0.12) {
        // end of a sentence
        const e = rand();
        w += lang === 'bangla' ? (e < 0.8 ? '।' : e < 0.92 ? '?' : '!') : (e < 0.75 ? '.' : e < 0.9 ? '?' : '!');
        sentenceStart = true;
      } else if (r < 0.22) {
        w += ',';
      } else if (lang === 'english' && r < 0.25) {
        w += rand() < 0.5 ? ';' : ':';
      } else if (lang === 'english' && r < 0.28) {
        w = rand() < 0.5 ? `"${w}"` : `(${w})`;
      }
    }
    out.push(w);
  }
  return out;
}
