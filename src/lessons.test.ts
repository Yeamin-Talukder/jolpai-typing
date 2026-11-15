import { describe, expect, it } from 'vitest';
import { BANGLA_LESSONS, ENGLISH_LESSONS, lessonItems } from './lessons';
import { bijoyToUnicode, unicodeToSegments } from './bijoy';

const keysOf = (w: string) => unicodeToSegments(w).map(s => s.keys).join('');

describe('Bangla lessons', () => {
  it.each(BANGLA_LESSONS.map(l => [l.name, l] as const))('%s: items use only allowed keys and include new ones', (_, lesson) => {
    for (let run = 0; run < 20; run++) {
      const items = lessonItems(lesson, 'bangla', 25);
      expect(items).toHaveLength(25);
      for (const w of items) {
        const k = keysOf(w);
        expect(bijoyToUnicode(k), w).toBe(w.normalize('NFC'));
        expect([...k].every(c => lesson.allowed.includes(c)), `${w} = ${k}`).toBe(true);
        if (lesson.newKeys) expect([...k].some(c => lesson.newKeys.includes(c)), `${w} = ${k}`).toBe(true);
        if (lesson.conjuncts) expect(k).toMatch(/g[^fdDsSacCxX]/);
        if (!lesson.links) expect(k, `${w} = ${k}`).not.toMatch(/g[^fdDsSacCxX]/);
      }
    }
  });
});

describe('English lessons', () => {
  it.each(ENGLISH_LESSONS.map(l => [l.name, l] as const))('%s: items use only allowed letters', (_, lesson) => {
    for (let run = 0; run < 20; run++) {
      const items = lessonItems(lesson, 'english', 25);
      expect(items).toHaveLength(25);
      for (const w of items) expect([...w].every(c => lesson.allowed.includes(c)), w).toBe(true);
    }
  });
});
