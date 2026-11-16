// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { ALL_ENGLISH, EN_LESSONS, EN_UNITS, enDrillItems, enLessonWords, enTimedItems, enWeakKeysLesson, enWordItems } from './course-en';
import { LESSONS } from './course';
import { ALL_KEYS } from './fingers';
import { emptyLearn, isUnlocked, nextLesson, recordRun, weakKeys } from './progress';
import { BIJOY, ENGLISH, findLesson, trackOfLesson } from './tracks';
import { routeFromPath, pathFor } from '../router';

const only = (text: string, allowed: string) => [...text].every(c => allowed.includes(c));

describe('English course content', () => {
  it('has unique lessons in known units, apart from the Bijoy ids', () => {
    expect(new Set(EN_LESSONS.map(l => l.id)).size).toBe(EN_LESSONS.length);
    for (const l of EN_LESSONS) {
      expect(l.id.startsWith('en-')).toBe(true);
      expect(EN_UNITS.some(u => u.n === l.unit)).toBe(true);
    }
    const bijoy = new Set(LESSONS.map(l => l.id));
    for (const l of EN_LESSONS) expect(bijoy.has(l.id)).toBe(false);
  });

  it('every key is on the keyboard, and every new key is taught before it is needed', () => {
    for (const c of ALL_ENGLISH) expect(ALL_KEYS).toContain(c);
    for (const l of EN_LESSONS) for (const k of l.newKeys) expect(l.allowed).toContain(k);
  });

  for (const l of EN_LESSONS) {
    it(`${l.id}: practice uses only the lesson's keys`, () => {
      const items = [...enDrillItems(l), ...(l.timed ? enTimedItems(l).slice(0, 60) : enWordItems(l))];
      expect(items.length).toBeGreaterThan(0);
      if (l.drill) expect(enDrillItems(l).length).toBe(l.drill);
      if (l.words && !l.source) expect(enWordItems(l).length).toBe(l.words);
      for (const w of items) {
        expect(w).not.toMatch(/\s/);
        expect(only(w, l.allowed), `${w} uses only ${l.allowed}`).toBe(true);
      }
    });
  }

  it('lessons with a word step have real words to practise', () => {
    for (const l of EN_LESSONS.filter(x => x.words && !x.source && !/^[0-9]+$/.test(x.newKeys))) {
      expect(enLessonWords(l).length, `${l.id} real words`).toBeGreaterThanOrEqual(4);
    }
  });

  it('demos only use keys the lesson has reached (and the space bar)', () => {
    for (const l of EN_LESSONS) for (const e of l.intro ?? []) {
      if (e.demo) expect(only(e.demo, l.allowed + ' '), `${l.id} demo ${e.demo}`).toBe(true);
    }
  });

  it('drills lean on the new keys', () => {
    const l = EN_LESSONS.find(x => x.id === 'en-top-1')!;
    const items = enDrillItems(l);
    const withNew = items.filter(w => /[ei]/.test(w)).length;
    expect(withNew / items.length).toBeGreaterThan(0.6);
  });

  it('builds a weak-keys drill from chosen keys', () => {
    const l = enWeakKeysLesson('dk', EN_LESSONS[3].allowed);
    const items = enDrillItems(l);
    expect(items.length).toBe(30);
    for (const w of items) expect(only(w, l.allowed)).toBe(true);
    expect(items.filter(w => /[dk]/.test(w)).length / items.length).toBeGreaterThan(0.6);
  });
});

describe('two courses, one progress', () => {
  it('each lesson belongs to its own course', () => {
    expect(trackOfLesson('en-home-1')).toBe(ENGLISH);
    expect(trackOfLesson('home-1')).toBe(BIJOY);
    expect(findLesson('en-num-2')?.title).toBe('Numbers 6 to 0');
  });

  it('English and Bijoy key practice are kept apart', () => {
    const d = emptyLearn();
    recordRun(d, { lessonId: 'en-home-1', acc: 95, wpm: 9, secs: 30, keys: { [ENGLISH.statKey('j')]: { hit: 10, miss: 6, ms: 3000 } } }, 8);
    recordRun(d, { lessonId: 'home-1', acc: 95, wpm: 9, secs: 30, keys: { [BIJOY.statKey('j')]: { hit: 10, miss: 0, ms: 3000 } } }, 6);
    expect(Object.keys(d.keys).sort()).toEqual(['e:j', 'j']);
    expect(weakKeys(d, 6, ENGLISH.fromStatKey)).toEqual(['j']);  // weak in English
    expect(weakKeys(d, 6, BIJOY.fromStatKey)).toEqual([]);        // fine in Bijoy
  });

  it('unlocks each course on its own', () => {
    const d = emptyLearn();
    expect(isUnlocked(d, 1, EN_LESSONS)).toBe(false);
    recordRun(d, { lessonId: 'en-home-1', acc: 96, wpm: 12, secs: 30, keys: {} }, 8);
    expect(isUnlocked(d, 1, EN_LESSONS)).toBe(true);
    expect(isUnlocked(d, 1, LESSONS)).toBe(false);
    expect(nextLesson(d, EN_LESSONS).id).toBe('en-home-2');
    expect(nextLesson(d).id).toBe('home-1');
  });
});

describe('course addresses', () => {
  it('reads and writes the English course and its lessons', () => {
    expect(routeFromPath('/learn/english/')).toEqual({ page: 'learn', track: 'english' });
    expect(routeFromPath('/learn/en-home-1/')).toEqual({ page: 'learn', lesson: 'en-home-1' });
    expect(routeFromPath('/learn/')).toEqual({ page: 'learn' });
    expect(pathFor({ page: 'learn', track: 'english' })).toBe('/learn/english/');
    expect(pathFor({ page: 'learn', lesson: 'en-top-2' })).toBe('/learn/en-top-2/');
  });
});
