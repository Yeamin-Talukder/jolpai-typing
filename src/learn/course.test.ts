// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { bijoyToUnicode } from '../bijoy';
import { LESSONS, UNITS, drillItems, keysOf, lessonWords, timedItems, typeable, wordItems, weakKeysLesson } from './course';
import { ALL_KEYS, fingerFor, needsShift, physicalKey, shiftFinger } from './fingers';
import { isUnlocked, learnStreak, nextLesson, recordRun, starsFor, weakKeys, type LearnData } from './progress';

const only = (k: string, allowed: string) => [...k].every(c => allowed.includes(c));
const fresh = (): LearnData => ({ v: 1, lessons: {}, keys: {}, days: [], secs: 0, openAll: false });

describe('Bijoy course content', () => {
  it('has unique lessons in known units', () => {
    expect(new Set(LESSONS.map(l => l.id)).size).toBe(LESSONS.length);
    for (const l of LESSONS) expect(UNITS.some(u => u.n === l.unit)).toBe(true);
  });

  it('every new key is taught before it is needed', () => {
    for (const l of LESSONS) for (const k of l.newKeys) expect(l.allowed).toContain(k);
  });

  for (const l of LESSONS) {
    it(`${l.id}: practice is typeable with only the lesson's keys`, () => {
      const items = [...drillItems(l), ...(l.timed ? timedItems(l).slice(0, 60) : wordItems(l))];
      expect(items.length).toBeGreaterThan(0);
      if (l.drill) expect(drillItems(l).length).toBe(l.drill);
      for (const w of items) {
        expect(typeable(w), `${w} round-trips`).toBe(true);
        if (l.unit < 8) expect(only(keysOf(w), l.allowed), `${w} (${keysOf(w)}) uses only ${l.allowed}`).toBe(true);
      }
    });
  }

  it('early lessons have real words to practise, not only drills', () => {
    // the very first lesson has only ক and া: Bangla has just কাক and কাকা, so it leans on drills
    for (const l of LESSONS.filter(x => x.words && !x.source && x.unit < 8 && x.id !== 'home-1')) {
      expect(lessonWords(l).length, `${l.id} real words`).toBeGreaterThanOrEqual(4);
    }
  });

  it('every demo uses the lesson keys in the right Bijoy order', () => {
    for (const l of LESSONS) for (const e of l.intro ?? []) {
      if (!e.demo) continue;
      const text = bijoyToUnicode(e.demo);
      expect(only(e.demo, l.allowed), `${l.id} demo keys`).toBe(true);
      expect(keysOf(text), `${l.id} demo ${e.demo} is the canonical order for ${text}`).toBe(e.demo);
    }
  });

  it('builds a weak-keys drill from chosen keys', () => {
    const l = weakKeysLesson('dk', LESSONS[3].allowed);
    const items = drillItems(l);
    expect(items.length).toBe(30);
    for (const w of items) expect(/[dk]/.test(keysOf(w))).toBe(true);
  });
});

describe('finger guide', () => {
  it('knows every key and the shift rule', () => {
    expect(fingerFor('f')).toBe('li');
    expect(fingerFor('j')).toBe('ri');
    expect(fingerFor('A')).toBe('lp');
    expect(fingerFor(';')).toBe('rp');
    expect(fingerFor(' ')).toBe('th');
    expect(needsShift('J')).toBe(true);
    expect(needsShift('&')).toBe(true);
    expect(shiftFinger('J')).toBe('lp');   // right-hand key: left Shift
    expect(shiftFinger('D')).toBe('rp');   // left-hand key: right Shift
    expect(physicalKey('&')).toBe('7');
    expect(ALL_KEYS.length).toBe(94);
  });

  it('covers every key the course uses', () => {
    for (const l of LESSONS) for (const k of l.allowed) expect(ALL_KEYS).toContain(k);
  });
});

describe('progress', () => {
  it('gives stars for accuracy and speed', () => {
    expect(starsFor(85, 50, 10)).toBe(0);
    expect(starsFor(92, 5, 10)).toBe(1);
    expect(starsFor(95, 10, 10)).toBe(2);
    expect(starsFor(98, 14, 10)).toBe(3);
  });

  it('unlocks lessons in order and remembers the best run', () => {
    const d = fresh();
    expect(isUnlocked(d, 0)).toBe(true);
    expect(isUnlocked(d, 1)).toBe(false);
    recordRun(d, { lessonId: LESSONS[0].id, acc: 95, wpm: 9, secs: 30, keys: { j: { hit: 10, miss: 2, ms: 3000 } } }, LESSONS[0].goal);
    expect(isUnlocked(d, 1)).toBe(true);
    expect(nextLesson(d).id).toBe(LESSONS[1].id);
    recordRun(d, { lessonId: LESSONS[0].id, acc: 80, wpm: 2, secs: 30, keys: { j: { hit: 1, miss: 9, ms: 900 } } }, LESSONS[0].goal);
    expect(d.lessons[LESSONS[0].id].stars).toBe(2);          // a worse run never lowers it
    expect(d.lessons[LESSONS[0].id].tries).toBe(2);
    expect(d.keys.j).toEqual({ hit: 11, miss: 11, ms: 3900 });
    expect(weakKeys(d)).toEqual(['j']);
    expect(learnStreak(d)).toBe(1);
  });
});
