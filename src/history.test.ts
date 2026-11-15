// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { addEntry, clearHistory, loadHistory, renderHistory, type Entry } from './history';

let n = 0;
const entry = (over: Partial<Entry>): Entry => ({
  id: `e${n++}`, t: Date.now(), lang: 'bangla', mode: 'time', amount: 30, label: 'time 30',
  wpm: 20, net: 19, raw: 22, acc: 95, sec: 30, ...over,
});

describe('history', () => {
  beforeEach(() => clearHistory());

  it('stores entries and reports the previous best for the same test', () => {
    expect(addEntry(entry({ wpm: 20 })).previousBest).toBeNull();
    expect(addEntry(entry({ wpm: 25 })).previousBest).toBe(20);
    expect(addEntry(entry({ wpm: 22 })).previousBest).toBe(25);
    // a different test has its own best
    expect(addEntry(entry({ mode: 'words', amount: 25, label: 'words 25', wpm: 10 })).previousBest).toBeNull();
    expect(loadHistory()).toHaveLength(4);
  });

  it('gives old results without an id one', () => {
    localStorage.setItem('jolpai-type:history', JSON.stringify([{ ...entry({}), id: undefined }]));
    expect(loadHistory()[0].id).toMatch(/.+-.+/);
  });

  it('survives corrupt storage', () => {
    localStorage.setItem('jolpai-type:history', '{not json');
    expect(loadHistory()).toEqual([]);
  });

  it('renders stats only for the chosen language', () => {
    addEntry(entry({ wpm: 31 }));
    addEntry(entry({ lang: 'english', wpm: 55 }));
    const el = document.createElement('div');
    renderHistory(el, 'bangla');
    expect(el.textContent).toContain('31');
    expect(el.textContent).not.toContain('55');
  });
});
