import { describe, expect, it } from 'vitest';
import { bijoyToUnicode, unicodeToSegments } from './bijoy';
import { BANGLA_WORDS } from './words-bn';

const keysOf = (w: string) => unicodeToSegments(w).map(s => s.keys).join('');

describe('bijoyToUnicode: rules quoted in the bijoyLinux source', () => {
  it.each([
    ['jgN', 'ক্ষ'],
    ['Igu', 'ঞ্জ'],
    ['igm', 'হ্ম'],
    ['bgk', 'ন্ত'],
    ['mA', 'র্ম'],
    ['jA', 'র্ক'],
    ['jgd', 'কই'],
    ['jgD', 'কঈ'],
    ['gf', 'আ'],
    ['F', 'অ'],
    ['x', 'ও'],
    ['gX', 'ঔ'],
  ])('%s -> %s', (keys, out) => expect(bijoyToUnicode(keys)).toBe(out.normalize('NFC')));
});

describe('bijoyToUnicode: visual-order typing', () => {
  it.each([
    ['dj', 'কি'],          // pre-base i-kar before the consonant
    ['cjf', 'কো'],         // e-kar ... a-kar = o-kar
    ['cmX', 'মৌ'],         // e-kar ... au length mark = au-kar
    ['djgk', 'ক্তি'],      // kar before the whole conjunct
    ['LcmA', 'ধর্মে'],     // pre-kar + reph after its consonant
    ['jmAD', 'কর্মী'],
    ['AmD', 'র্মী'],       // reph typed first also works
    ['dY', 'ছি'],          // the pending kar attaches to the next consonant
    ['d', 'ি'],            // nothing after it: kar stays standalone
    ['Mzc', 'শ্রে'.normalize('NFC')],
    ['hZ', 'ব্য'],         // ya-phala key
    ['y&l', 'চঁদ'],
    ['W', 'য়'],
    ['p', 'ড়'],
  ])('%s -> %s', (keys, out) => expect(bijoyToUnicode(keys)).toBe(out.normalize('NFC')));
});

describe('unicodeToSegments', () => {
  it('splits by syllable with Bijoy key order', () => {
    expect(unicodeToSegments('কিছু')).toEqual([
      { text: 'কি', keys: 'dj' },
      { text: 'ছু', keys: 'Ys' },
    ]);
    expect(keysOf('বিশ্ববিদ্যালয়')).toBe('dhMghdhlZfVW');
    expect(keysOf('কর্মকর্তা')).toBe('jmAjkAf');
    expect(keysOf('পৌঁছানো')).toBe('crX&YfcbF'.replace('F', 'f'));
  });

  it('every practice word round-trips: typing its keys gives the word', () => {
    const bad = BANGLA_WORDS.filter(w => bijoyToUnicode(keysOf(w)) !== w.normalize('NFC'));
    expect(bad).toEqual([]);
  });

  it('every practice word uses only mapped keys', () => {
    const unmapped = BANGLA_WORDS.filter(w => /[^\x21-\x7e]/.test(keysOf(w)));
    expect(unmapped).toEqual([]);
  });
});

describe('Bangla passages', () => {
  it('every passage word round-trips and uses only keyboard keys', async () => {
    const { BANGLA_PASSAGES } = await import('./passages');
    const words = BANGLA_PASSAGES.flatMap(p => p.split(/\s+/));
    const bad = words.filter(w => bijoyToUnicode(keysOf(w)) !== w.normalize('NFC') || /[^\x21-\x7e]/.test(keysOf(w)));
    expect(bad).toEqual([]);
  });
});
