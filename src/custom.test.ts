// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { clampAmount, typeableWords } from './custom';

describe('custom text', () => {
  it('keeps typeable English and tidies curly quotes', () => {
    const { words, dropped } = typeAbleEnglish('He said “hello” — it’s fine. café ok');
    expect(words).toEqual(['He', 'said', '"hello"', '-', "it's", 'fine.', 'ok']);
    expect(dropped).toEqual(['café']);
  });

  it('keeps Bangla words that Bijoy can type, and drops others', () => {
    const { words, dropped } = typeableWords('আমি বাংলায় গান গাই। ৫২ abc', 'bangla');
    expect(words).toEqual(['আমি', 'বাংলায়', 'গান', 'গাই।', '৫২']);
    expect(dropped).toEqual(['abc']); // English letters are not Bangla in Bijoy
    expect(typeableWords('😀 নমস্কার', 'bangla').dropped).toEqual(['😀']);
  });

  it('keeps custom amounts within limits', () => {
    expect(clampAmount('time', 2)).toBe(5);
    expect(clampAmount('time', 99999)).toBe(3600);
    expect(clampAmount('words', 250.4)).toBe(250);
  });
});

function typeAbleEnglish(t: string) { return typeableWords(t, 'english'); }
