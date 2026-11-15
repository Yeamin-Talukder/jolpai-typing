// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { applyExam, applyRun, emptyLearn, fromCloud, hasProgress, mergeLearn, toCloud, type ExamRec } from './progress';

const exam = (t: number, over: Partial<ExamRec> = {}): ExamRec => ({
  t, lang: 'bangla', secs: 120, gross: 24, net: 22, acc: 96, words: 40, errors: 2, post: 'Office Assistant', need: 20, pass: true, ...over,
});

describe('course progress across devices', () => {
  it('merges guest progress into an account without losing anything', () => {
    const account = emptyLearn();
    applyRun(account, { lessonId: 'home-1', acc: 95, wpm: 9, secs: 40, keys: { j: { hit: 10, miss: 1, ms: 2000 } } }, 6);
    account.days = ['2026-11-10'];
    const guest = emptyLearn();
    applyRun(guest, { lessonId: 'home-1', acc: 99, wpm: 7, secs: 30, keys: { j: { hit: 5, miss: 0, ms: 900 }, f: { hit: 4, miss: 2, ms: 800 } } }, 6);
    applyRun(guest, { lessonId: 'home-2', acc: 92, wpm: 8, secs: 20, keys: {} }, 8);
    applyExam(guest, exam(1000));
    guest.days = ['2026-11-11'];

    const m = mergeLearn(account, guest);
    // best of each (stars as earned in a run, never made up from mixed bests), tries added
    expect(m.lessons['home-1']).toMatchObject({ stars: 2, wpm: 9, acc: 99, tries: 2 });
    expect(m.lessons['home-2'].stars).toBe(1);
    expect(m.keys.j).toEqual({ hit: 15, miss: 1, ms: 2900 });
    expect(m.keys.f).toEqual({ hit: 4, miss: 2, ms: 800 });
    expect(m.days).toEqual(['2026-11-10', '2026-11-11']);
    expect(m.secs).toBe(account.secs + guest.secs);
    expect(m.exams).toHaveLength(1);
  });

  it('keeps the last 50 exams, oldest first', () => {
    const d = emptyLearn();
    for (let i = 60; i > 0; i--) applyExam(d, exam(i * 1000));
    expect(d.exams).toHaveLength(50);
    expect(d.exams[0].t).toBeLessThan(d.exams[49].t);
    expect(d.exams[49].t).toBe(60000);
  });

  it('round-trips through the account format, dropping junk', () => {
    const d = emptyLearn();
    applyRun(d, { lessonId: 'home-1', acc: 95, wpm: 9, secs: 40, keys: { '&': { hit: 3, miss: 1, ms: 500 }, ' ': { hit: 9, miss: 0, ms: 900 } } }, 6);
    applyExam(d, exam(5));
    d.pending = [{ exam: exam(6) }];
    const cloud = toCloud(d) as Record<string, unknown>;
    expect(cloud).not.toHaveProperty('pending');
    expect(cloud).toHaveProperty('keyStats');
    const back = fromCloud(JSON.parse(JSON.stringify({ ...cloud, junk: 1, lessons: { ...d.lessons, bad: 'x' } })));
    expect(back.lessons['home-1']).toEqual(d.lessons['home-1']);
    expect(back.lessons.bad).toBeUndefined();
    expect(back.keys).toEqual(d.keys);
    expect(back.exams).toEqual(d.exams);
    expect(back.pending).toEqual([]);
    expect(hasProgress(back)).toBe(true);
    expect(hasProgress(fromCloud(undefined))).toBe(false);
  });
});
