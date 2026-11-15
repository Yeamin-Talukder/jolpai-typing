// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { addEntry, clearHistory, loadHistory, type Entry } from './history';
import { renderProfile, streak } from './profile';

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
    renderProfile(el, { lang: 'bangla', filter: 'all', shown: 25 }, null);
    // look only at the speed figures: dates and times can contain any digits
    const speeds = [...el.querySelectorAll('.val')].map(v => v.textContent).join(' ');
    expect(speeds).toContain('31');
    expect(speeds).not.toContain('55');
  });

  it('counts a day streak that may end yesterday', () => {
    const day = 864e5, now = new Date(2026, 10, 15, 12);
    const at = (daysAgo: number) => entry({ t: now.getTime() - daysAgo * day });
    expect(streak([], now)).toBe(0);
    expect(streak([at(0), at(1), at(2), at(4)], now)).toBe(3);
    expect(streak([at(1), at(2)], now)).toBe(2); // nothing today yet
    expect(streak([at(2), at(3)], now)).toBe(0);
  });
});
