import { describe, expect, it } from 'vitest';
import { alignWords, scoreExam } from './exam-score';

const P = 'আমার সোনার বাংলা আমি তোমায় ভালোবাসি চিরদিন তোমার আকাশ'.split(' ');
const kinds = (t: string[]) => alignWords(t, P).map(o => o.kind).join(' ');

describe('mock exam scoring', () => {
  it('a perfect start, with the rest of the passage not counted', () => {
    expect(kinds(['আমার', 'সোনার', 'বাংলা'])).toBe('ok ok ok');
  });

  it('a wrong word is one mistake, not a shift of everything after it', () => {
    expect(kinds(['আমার', 'সোনা', 'বাংলা', 'আমি'])).toBe('ok sub ok ok');
  });

  it('a skipped word is one missing word', () => {
    expect(kinds(['আমার', 'বাংলা', 'আমি', 'তোমায়'])).toBe('ok miss ok ok ok');
  });

  it('an extra word is one extra word', () => {
    expect(kinds(['আমার', 'সোনার', 'সোনার', 'বাংলা'])).toBe('ok ok extra ok');
  });

  it('works out gross, net and accuracy', () => {
    // 4 words of 5 keys each, 1 wrong, in one minute
    const s = scoreExam(['আমার', 'সোনা', 'বাংলা', 'আমি'], [5, 5, 5, 5], P, 60);
    expect(s.typed).toBe(4);
    expect(s.correct).toBe(3);
    expect(s.errors).toBe(1);
    expect(s.gross).toBeCloseTo((20 + 3) / 5, 5);       // 20 keys + 3 spaces
    expect(s.net).toBeCloseTo((20 + 3) / 5 - 1, 5);
    expect(s.wpm).toBeCloseTo((3 * 6) / 5, 5);           // three right words, each with its space
    expect(s.acc).toBeCloseTo(75, 5);
  });

  it('nothing typed scores zero', () => {
    const s = scoreExam([], [], P, 60);
    expect(s.ops).toEqual([]);
    expect(s.gross).toBe(0);
    expect(s.net).toBe(0);
    expect(s.acc).toBe(0);
  });
});
