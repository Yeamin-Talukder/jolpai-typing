import { describe, expect, it } from 'vitest';
import { addExtras } from './extras';
import { bijoyToUnicode, unicodeToSegments } from './bijoy';
import { BANGLA_WORDS } from './words-bn';
import { ENGLISH_WORDS, randomWords } from './words';

// a small seeded random, so the tests are repeatable
function seeded(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

describe('punctuation and numbers', () => {
  it('leaves the words alone when both are off', () => {
    const w = ['one', 'two'];
    expect(addExtras(w, 'english', { punctuation: false, numbers: false })).toBe(w);
  });

  it('English: capital at the start, the last word ends a sentence', () => {
    const out = addExtras(randomWords(60, ENGLISH_WORDS), 'english', { punctuation: true, numbers: false }, seeded(7));
    expect(out[0][0]).toMatch(/[A-Z"(]/);
    expect(out.at(-1)).toMatch(/[.?!]$/);
    expect(out.some(w => w.endsWith(','))).toBe(true);
    // after every sentence end, the next word starts with a capital
    out.forEach((w, i) => { if (/[.?!]$/.test(w) && out[i + 1]) expect(out[i + 1]).toMatch(/^["(]?[A-Z]/); });
  });

  it('mixes in numbers', () => {
    const out = addExtras(randomWords(200, ENGLISH_WORDS), 'english', { punctuation: false, numbers: true }, seeded(3));
    const nums = out.filter(w => /^\d+$/.test(w));
    expect(nums.length).toBeGreaterThan(10);
    nums.forEach(n => expect(n).toMatch(/^[1-9]\d{0,3}$/));
  });

  it('Bangla: dari, Bangla digits, and every word can be typed in Bijoy', () => {
    const out = addExtras(randomWords(200, BANGLA_WORDS), 'bangla', { punctuation: true, numbers: true }, seeded(11));
    expect(out.some(w => w.endsWith('।'))).toBe(true);
    expect(out.some(w => /^[০-৯]+$/.test(w))).toBe(true);
    for (const w of out) {
      const keys = unicodeToSegments(w).map(s => s.keys).join('');
      expect(bijoyToUnicode(keys)).toBe(w.normalize('NFC'));
    }
  });
});
