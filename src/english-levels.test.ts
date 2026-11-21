import { describe, expect, it } from 'vitest';
import { ENGLISH_RANKED } from './english-ranked';
import { EN_LEVELS, englishPool, isLevel } from './words';
import { levelOf, sameTest } from './history';

describe('English word levels', () => {
  it('the ranking is plain lowercase words, each once', () => {
    expect(ENGLISH_RANKED.length).toBeGreaterThan(4900);
    expect(new Set(ENGLISH_RANKED).size).toBe(ENGLISH_RANKED.length);
    for (const w of ENGLISH_RANKED) expect(w).toMatch(/^[a-z]+$/);
    expect(ENGLISH_RANKED.slice(0, 3)).toEqual(['the', 'be', 'and']);
  });

  it('keeps swear words and the like out', () => {
    for (const w of ['fuck', 'shit', 'ass', 'bastard', 'damn', 'hell', 'sex', 'rape', 'suicide']) expect(ENGLISH_RANKED).not.toContain(w);
  });

  it('each level is the most frequent words, and harder levels hold the easier ones', () => {
    expect(englishPool('200')).toHaveLength(200);
    expect(englishPool('1k')).toHaveLength(1000);
    expect(englishPool('5k')).toHaveLength(ENGLISH_RANKED.length);
    expect(englishPool('1k').slice(0, 200)).toEqual(englishPool('200'));
    expect(EN_LEVELS.map(l => l.id)).toEqual(['200', '1k', '5k']);
    expect(isLevel('1k')).toBe(true);
    expect(isLevel('10k')).toBe(false);
  });

  it('personal bests are kept apart per level', () => {
    const base = { lang: 'english' as const, mode: 'time', amount: 30 };
    expect(levelOf({ ...base, label: 'time 30' })).toBe('200');
    expect(levelOf({ ...base, label: 'time 30 punctuation' })).toBe('200');
    expect(levelOf({ ...base, label: 'time 30 1k punctuation' })).toBe('1k');
    expect(levelOf({ ...base, label: 'time 30 5k' })).toBe('5k');
    expect(levelOf({ lang: 'english', mode: 'passage', label: 'passage 1m' })).toBe('');
    expect(levelOf({ lang: 'bangla', mode: 'time', label: 'time 30' })).toBe('');
    expect(sameTest({ ...base, label: 'time 30' }, { ...base, label: 'time 30 numbers' })).toBe(true);
    expect(sameTest({ ...base, label: 'time 30' }, { ...base, label: 'time 30 1k' })).toBe(false);
  });
});
