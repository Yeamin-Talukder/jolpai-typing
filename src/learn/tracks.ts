// The two courses ("tracks"): Bijoy Bangla and English. The lesson player, the
// course page and progress work the same for both; a track says how its text
// is split into key presses, how a key is labelled, and where its key
// statistics are kept (English ones carry an "e:" prefix, so the same physical
// key is tracked separately in each course).
import { bijoyToUnicode, KEY_LABELS, unicodeToSegments } from '../bijoy';
import { drillItems, LESSONS, lessonsInUnit, timedItems, UNITS, weakKeysLesson, wordItems, type CourseLesson, type Unit } from './course';
import { EN_LESSONS, EN_UNITS, enDrillItems, enLessonsInUnit, enTimedItems, enWeakKeysLesson, enWordItems } from './course-en';

export type TrackId = 'bangla' | 'english';
export interface Seg { text: string; keys: string }

export interface Track {
  id: TrackId;
  /** Text in this course is Bangla (Bangla font, dotted circle for vowel signs). */
  bn: boolean;
  name: string;
  units: Unit[];
  lessons: CourseLesson[];
  lessonsInUnit(n: number): CourseLesson[];
  /** A piece of text as the letters you see and the keys that type each one. */
  segments(text: string): Seg[];
  /** What a run of keys types, for the self-typing demos. */
  render(keys: string): string;
  /** What a single key types, for labels. */
  keyText(k: string): string;
  drillItems(l: CourseLesson): string[];
  wordItems(l: CourseLesson): string[];
  timedItems(l: CourseLesson): string[];
  weakLesson(weak: string, learned: string): CourseLesson;
  /** The key under which a key's practice is stored in progress. */
  statKey(k: string): string;
  /** The key back from a stored name, or null when it belongs to the other course. */
  fromStatKey(s: string): string | null;
}

export const BIJOY: Track = {
  id: 'bangla', bn: true, name: 'Bijoy',
  units: UNITS, lessons: LESSONS, lessonsInUnit,
  segments: text => unicodeToSegments(text),
  render: keys => bijoyToUnicode(keys),
  keyText: k => (k === ' ' ? 'space' : KEY_LABELS[k] ?? bijoyToUnicode(k) ?? k),
  drillItems, wordItems: l => wordItems(l), timedItems,
  weakLesson: weakKeysLesson,
  statKey: k => k,
  fromStatKey: s => (s.length === 1 ? s : null),
};

export const ENGLISH: Track = {
  id: 'english', bn: false, name: 'English',
  units: EN_UNITS, lessons: EN_LESSONS, lessonsInUnit: enLessonsInUnit,
  segments: text => [...text].map(c => ({ text: c, keys: c })),
  render: keys => keys,
  keyText: k => (k === ' ' ? 'space' : k),
  drillItems: enDrillItems, wordItems: l => enWordItems(l), timedItems: enTimedItems,
  weakLesson: enWeakKeysLesson,
  statKey: k => `e:${k}`,
  fromStatKey: s => (s.startsWith('e:') && s.length === 3 ? s.slice(2) : null),
};

export const TRACKS: Record<TrackId, Track> = { bangla: BIJOY, english: ENGLISH };

/** English lesson ids start with "en-". */
export const trackOfLesson = (id: string): Track => (id.startsWith('en-') ? ENGLISH : BIJOY);
export const findLesson = (id: string) => [...LESSONS, ...EN_LESSONS].find(l => l.id === id);
