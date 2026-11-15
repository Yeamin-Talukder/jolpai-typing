import { describe, expect, it } from 'vitest';
import { smoothPath } from './chart';

/** The y values of every point and control point in a path. */
const ys = (d: string) => [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(m => Number(m[2]));

describe('smoothPath', () => {
  it('draws straight lines for one or two points', () => {
    expect(smoothPath([])).toBe('');
    expect(smoothPath([[0, 10], [5, 20]])).toBe('M0.0,10.0L5.0,20.0');
  });

  it('never curves above or below the real values', () => {
    const pts: [number, number][] = [[0, 50], [10, 50], [20, 10], [30, 80], [40, 80], [50, 60]];
    const d = smoothPath(pts);
    const lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1]));
    for (const y of ys(d)) {
      expect(y).toBeGreaterThanOrEqual(lo - 0.05);
      expect(y).toBeLessThanOrEqual(hi + 0.05);
    }
    // a flat stretch stays flat
    expect(d).toContain('C3.3,50.0 6.7,50.0 10.0,50.0');
  });
});
