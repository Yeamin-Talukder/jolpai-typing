import { describe, expect, it } from 'vitest';
import { mergeHistories } from './account-sync';
import type { Entry } from './history';

const e = (id: string, t: number): Entry => ({
  id, t, lang: 'bangla', mode: 'time', amount: 30, label: 'time 30', wpm: 20, net: 19, raw: 21, acc: 95, sec: 30,
});

describe('mergeHistories', () => {
  it('uploads guest results that are not in the account yet', () => {
    const { merged, upload } = mergeHistories([e('a', 1), e('b', 3)], [e('a', 1), e('c', 2)], '', 'u1');
    expect(upload.map(x => x.id)).toEqual(['b']);
    expect(merged.map(x => x.id)).toEqual(['a', 'c', 'b']);
  });

  it('keeps the same person’s results when they sign in again', () => {
    const { upload } = mergeHistories([e('x', 5)], [], 'u1', 'u1');
    expect(upload.map(x => x.id)).toEqual(['x']);
  });

  it('never moves another account’s results into this account', () => {
    const { merged, upload } = mergeHistories([e('other', 5)], [e('mine', 1)], 'u2', 'u1');
    expect(upload).toEqual([]);
    expect(merged.map(x => x.id)).toEqual(['mine']);
  });

  it('drops unknown fields before upload', () => {
    const { upload } = mergeHistories([{ ...e('a', 1), extra: 'x' } as Entry], [], '', 'u1');
    expect(Object.keys(upload[0])).not.toContain('extra');
  });
});
