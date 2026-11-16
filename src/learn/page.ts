// The course page, as a normal scrolling page: the course switch, your
// progress and the next lesson at the top; every unit and its lessons in the
// course map; the mock exam, key mastery and how lessons work beside it.
import { Keyboard } from '../keyboard';
import { icon } from '../icons';
import type { CourseLesson, Unit } from './course';
import { BIJOY, ENGLISH, type Track, type TrackId } from './tracks';
import { isPlainClick, pathFor } from '../router';
import { FINGER_NAME, fingerFor, needsShift, physicalKey } from './fingers';
import { doneCount, isUnlocked, keyAccuracy, learnedKeys, learnStreak, nextLesson, starCount, weakKeys, type LearnData } from './progress';
import { starSvg } from './player';
import './learn-ui.css';
import './course-page.css';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const SIGN = /^[ঁ-ঃ়া-্ৗ]/;
const showChar = (s: string) => (SIGN.test(s) ? '◌' + s : s);

function fmtTime(secs: number) {
  const m = Math.round(secs / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

const stars = (n: number) => `<span class="ln-stars" aria-label="${n} of 3 stars">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">${starSvg()}</i>`).join('')}</span>`;

export interface PageActions {
  start(l: CourseLesson): void; exam(): void; openAll(on: boolean): void; reset(): void; signedIn: boolean;
  /** Show the other course. */
  switchTrack(id: TrackId): void;
}

/** The course on the page (set at the start of every draw). */
let T: Track = BIJOY;
/** Class for text in the course's language. */
const bnc = () => (T.bn ? 'bn' : 'en');

/** Units opened in the course map, per course (kept while the page is open). */
const opened: Record<TrackId, Set<number> | null> = { bangla: null, english: null };

const unitDone = (d: LearnData, n: number) => T.lessonsInUnit(n).filter(l => (d.lessons[l.id]?.stars ?? 0) > 0).length;
const unitOpen = (d: LearnData, n: number) => T.lessonsInUnit(n).some(l => isUnlocked(d, T.lessons.indexOf(l), T.lessons));
/** Where a lesson sits, like 2.3. */
const lessonNo = (l: CourseLesson) => `${l.unit}.${T.lessonsInUnit(l.unit).indexOf(l) + 1}`;

type LessonState = 'done' | 'current' | 'open' | 'locked';
function lessonState(d: LearnData, l: CourseLesson, nextId: string): LessonState {
  if (!isUnlocked(d, T.lessons.indexOf(l), T.lessons)) return 'locked';
  if ((d.lessons[l.id]?.stars ?? 0) > 0) return 'done';
  return l.id === nextId ? 'current' : 'open';
}

/** One key as a small keycap: the letter it types, the key to press, and its finger's colour. */
function keycap(k: string, size = '') {
  const shift = needsShift(k);
  const f = fingerFor(k);
  return `<span class="ln-kc ${size} z-${f}" title="${esc(physicalKey(k).toUpperCase())}${shift ? ' with Shift' : ''} · ${FINGER_NAME[f]}"><b class="${bnc()}">${esc(showChar(T.keyText(k)))}</b><i>${shift ? '⇧' : ''}${esc(physicalKey(k).toUpperCase())}</i></span>`;
}

function keycaps(l: CourseLesson, max = 6, size = '') {
  const keys = [...new Set(l.newKeys)];
  if (!keys.length) return `<span class="cp-l-bn ${bnc()}">${esc(l.bn)}</span>`;
  return `<span class="cp-keys">${keys.slice(0, max).map(k => keycap(k, size)).join('')}${keys.length > max ? `<span class="ln-kc more">+${keys.length - max}</span>` : ''}</span>`;
}

function lessonCard(d: LearnData, l: CourseLesson, nextId: string, j: number): string {
  const rec = d.lessons[l.id];
  const state = lessonState(d, l, nextId);
  const prev = T.lessons[T.lessons.indexOf(l) - 1];
  const foot = rec ? `${icon('trend', 12)}best ${Math.round(rec.wpm)} wpm · ${Math.round(rec.acc)}%`
    : state === 'current' ? `${icon('play', 12)}start here`
    : state === 'locked' && prev ? `${icon('lock', 11)}pass ${lessonNo(prev)} to open`
    : `${icon('play', 11)}ready`;
  return `<button class="cp-lesson ${state}" data-lesson="${l.id}" ${state === 'locked' ? 'aria-disabled="true"' : ''} style="--i:${j}">
      <span class="cp-l-top"><span class="cp-l-n">${lessonNo(l)}</span>${state === 'locked' ? `<span class="cp-l-lock" aria-label="locked">${icon('lock', 14)}</span>` : stars(rec?.stars ?? 0)}</span>
      <span class="cp-l-title">${esc(l.title)}</span>
      ${keycaps(l, 6)}
      <span class="cp-l-sum">${esc(l.summary)}</span>
      <span class="cp-l-foot">${foot}</span>
    </button>`;
}

// the keyboard rows, by physical key (unshifted)
const BOARD_ROWS = ['1234567890', 'qwertyuiop', "asdfghjkl;'", 'zxcvbnm,./'];

/** The rows of the keyboard this unit uses, with its keys lit in their finger's colour. */
function unitBoard(n: number): string {
  const keys = [...new Set(T.lessonsInUnit(n).flatMap(l => [...l.newKeys]))].filter(k => k !== ' ');
  if (!keys.length) return '';
  const on = new Map<string, string[]>();
  for (const k of keys) { const p = physicalKey(k); on.set(p, [...(on.get(p) ?? []), k]); }
  const rows = BOARD_ROWS.filter(row => [...row].some(p => on.has(p)));
  return `<div class="ln-board cp-board" aria-label="Keys this unit teaches, coloured by finger">
      <span class="label">${icon('keyboard', 14)}keys in this unit <em>· colour shows the finger</em></span>
      ${rows.map(row => `<div class="ln-board-row">${[...row].map(p => {
        const ks = on.get(p);
        if (!ks) return `<span class="ln-bk off"><i>${esc(p.toUpperCase())}</i></span>`;
        const lo = ks.find(k => !needsShift(k)), hi = ks.find(k => needsShift(k));
        return `<span class="ln-bk z-${fingerFor(p)}" title="${esc(p.toUpperCase())} · ${FINGER_NAME[fingerFor(p)]}">${hi ? `<small class="${bnc()}">${esc(showChar(T.keyText(hi)))}</small>` : ''}<b class="${bnc()}">${lo ? esc(showChar(T.keyText(lo))) : ''}</b><i>${esc(p.toUpperCase())}</i></span>`;
      }).join('')}</div>`).join('')}
    </div>`;
}

function unitCard(d: LearnData, u: Unit, nextId: string, nextUnit: number, open: boolean): string {
  const ls = T.lessonsInUnit(u.n), ud = unitDone(d, u.n);
  const all = ud === ls.length, avail = unitOpen(d, u.n), here = u.n === nextUnit && !all;
  const badge = all ? icon('check', 16) : avail ? String(u.n) : icon('lock', 15);
  return `<section class="cp-unit ${all ? 'done' : ''} ${avail ? '' : 'locked'} ${here ? 'here' : ''} ${open ? 'open' : ''}" data-unit-card="${u.n}" id="unit-${T.id}-${u.n}">
      <button class="cp-unit-head" data-toggle-unit="${u.n}" aria-expanded="${open}" aria-controls="unit-${T.id}-${u.n}-body">
        <span class="cp-unit-badge">${badge}</span>
        <span class="cp-unit-text">
          <span class="cp-unit-eyebrow">unit ${u.n}${here ? ' · <em>you are here</em>' : all ? ' · done' : avail ? '' : ' · locked'}</span>
          <span class="cp-unit-title"><b>${esc(u.title)}</b> <span class="${bnc()}">${esc(u.bn)}</span></span>
          <small>${esc(u.summary)}</small>
        </span>
        <span class="cp-unit-prog" aria-label="${ud} of ${ls.length} lessons done"><span>${ud}/${ls.length}</span><i style="--p:${(ud / ls.length) * 100}%"></i></span>
        <span class="cp-unit-chev" aria-hidden="true">${icon('next', 16)}</span>
      </button>
      <div class="cp-unit-body" id="unit-${T.id}-${u.n}-body" ${open ? '' : 'hidden'}>
        <div class="cp-lessons" data-count="${ls.length}">${ls.map((l, j) => lessonCard(d, l, nextId, j)).join('')}</div>
        ${unitBoard(u.n)}
      </div>
    </section>`;
}

/** Every lesson in one strip, grouped by unit: done, the next one, open, locked. Click a unit to go to it. */
function coursePath(d: LearnData, nextId: string): string {
  return `<div class="ln-path cp-path" aria-label="Course path">${T.units.map(u => `<button class="ln-path-unit" data-path-unit="${u.n}" title="Unit ${u.n}: ${esc(u.title)}">${T.lessonsInUnit(u.n).map(l =>
    `<i class="${lessonState(d, l, nextId)}"></i>`).join('')}</button>`).join('')}</div>`;
}

const HOW_STEPS = (bn: boolean): [string, string, string][] => [
  [icon('lessons', 18), 'Learn', `A short explanation, with keys that type themselves so you see the ${bn ? 'Bangla' : 'words'} appear.`],
  [icon('keyboard', 18), 'Meet the keys', 'Each new key, the finger to use, and three presses to remember it.'],
  [icon('target', 18), 'Drill, then words', 'A wrong key is not typed: find the right one. The keyboard and hands guide you.'],
  [starSvg(), 'Earn stars', '90% accuracy passes and opens the next lesson. Speed earns the second and third star.'],
];

function trackTab(d: LearnData, t: Track): string {
  const dn = doneCount(d, t.lessons), on = t.id === T.id;
  return `<a class="cp-course ${on ? 'active' : ''}" role="tab" aria-selected="${on}" data-track="${t.id}" href="${pathFor({ page: 'learn', track: t.id === 'english' ? 'english' : undefined })}">
      <span class="cp-course-ico">${t.bn ? '<span class="bn">অ</span>' : 'Aa'}</span>
      <span class="cp-course-text"><b>${t.bn ? '<span class="bn">বাংলা</span> · Bijoy' : 'English'}</b><small>${dn ? `${dn} of ${t.lessons.length} lessons done` : `${t.lessons.length} lessons`}</small></span>
      <span class="cp-course-bar"><i style="--p:${(dn / t.lessons.length) * 100}%"></i></span>
    </a>`;
}

export function renderLearnPage(el: HTMLElement, d: LearnData, act: PageActions, track: Track = BIJOY) {
  T = track;
  const done = doneCount(d, T.lessons), total = T.lessons.length;
  const pct = Math.round((done / total) * 100);
  const next = nextLesson(d, T.lessons);
  const nextI = T.lessons.indexOf(next);
  const started = T.lessons.some(l => d.lessons[l.id]);
  const allDone = done === total;
  const weak = weakKeys(d, 6, T.fromStatKey);
  const practised = Object.keys(d.keys).some(s => T.fromStatKey(s) !== null);
  // the units open in the map: where you are, and any you are part-way through
  if (!opened[T.id]) opened[T.id] = new Set(T.units.filter(u => u.n === next.unit || (unitDone(d, u.n) > 0 && unitDone(d, u.n) < T.lessonsInUnit(u.n).length)).map(u => u.n));
  const op = opened[T.id]!;
  const lastExam = d.exams[d.exams.length - 1];
  const bestNet = d.exams.reduce((m, e) => Math.max(m, e.net), 0);
  const lead = T.bn
    ? `${total} short lessons take you from the home row to the Bijoy rules: vowel signs typed first, যুক্তাক্ষর, ফলা and reph. Every key shows the finger to use.`
    : `${total} short lessons take you from the home row to capitals, punctuation and numbers. Every key shows the finger to use.`;

  el.innerHTML = `
    <div class="cp">
      <nav class="cp-courses" role="tablist" aria-label="Course">${trackTab(d, BIJOY)}${trackTab(d, ENGLISH)}</nav>

      <section class="cp-hero ${T.bn ? '' : 'en'}">
        <div class="cp-hero-main">
          <div class="cp-eyebrow">${icon('lessons', 15)}${T.bn ? 'Bijoy' : 'English'} touch-typing course</div>
          <h1>Type ${T.bn ? 'Bangla' : 'English'} <span>without looking</span></h1>
          ${T.bn ? '<p class="cp-hero-bn bn">বিজয়ে না দেখে বাংলা টাইপ করা শিখুন</p>' : ''}
          <p class="cp-lead">${lead}</p>
          <div class="cp-progress">
            <div class="cp-progress-top"><b>${pct}%</b><span>${done} of ${total} lessons done${starCount(d, T.lessons) ? ` · ${starCount(d, T.lessons)} stars` : ''}</span></div>
            <div class="cp-bar" aria-hidden="true"><i style="--p:${pct}%"></i></div>
            ${coursePath(d, next.id)}
          </div>
        </div>
        <aside class="cp-next" aria-label="${allDone ? 'Course complete' : 'Next lesson'}">
          <span class="cp-next-label">${icon(allDone ? 'trophy' : 'play', 14)}${allDone ? 'course complete · practise any lesson' : started ? 'next up' : 'start here'}</span>
          <span class="cp-next-where">unit ${next.unit} · lesson ${nextI + 1} of ${total}</span>
          <b class="cp-next-title">${esc(next.title)}</b>
          ${keycaps(next, 8, 'big')}
          <p>${esc(next.summary)}</p>
          <button class="btn primary cp-go" data-start="${next.id}">${icon('play', 16)}${allDone ? 'practise again' : started ? 'continue' : 'start the course'}</button>
        </aside>
      </section>

      <section class="cp-stats" aria-label="Your progress">
        <div class="cp-stat"><span>${icon('check', 18)}</span><b>${done}<small>/${total}</small></b><em>lessons done</em></div>
        <div class="cp-stat"><span>${starSvg()}</span><b>${starCount(d, T.lessons)}<small>/${total * 3}</small></b><em>stars</em></div>
        <div class="cp-stat"><span>${icon('flame', 18)}</span><b>${learnStreak(d)}</b><em>day streak</em></div>
        <div class="cp-stat"><span>${icon('clock', 18)}</span><b>${fmtTime(d.secs)}</b><em>practised</em></div>
      </section>

      <div class="cp-grid">
        <section class="cp-map" aria-label="Course map">
          <header class="cp-map-head">
            <div><h2>${icon('lessons', 18)}Course map</h2><p>${T.units.length} units · ${total} lessons. Open a unit to see its lessons and keys.</p></div>
            <button class="cp-link" data-expand-all>${op.size === T.units.length ? 'collapse all' : 'expand all'}</button>
          </header>
          <div class="cp-units">${T.units.map(u => unitCard(d, u, next.id, next.unit, op.has(u.n))).join('')}</div>
        </section>

        <aside class="cp-side">
          <section class="cp-card cp-exam">
            <div class="cp-card-head"><span class="cp-card-ico">${icon('exam', 18)}</span><div><span class="cp-eyebrow">mock exam · <span class="bn">মডেল টেস্ট</span></span><h2>Test your speed</h2></div></div>
            <p>A passage on paper and your answer in a box, backspace allowed, no live speed. Pick a target speed, then see every mistake.</p>
            ${lastExam ? `<div class="ln-exam-row ${lastExam.pass ? 'pass' : 'fail'}">
              <span class="ln-exam-mark">${icon(lastExam.pass ? 'check' : 'x', 14)}</span>
              <span class="ln-exam-what">last: ${lastExam.lang === 'bangla' ? 'বাংলা' : 'English'} · ${Math.round((lastExam.limit ?? lastExam.secs) / 60)} min<small>${d.exams.length} exam${d.exams.length === 1 ? '' : 's'} · best ${Math.round(bestNet)} net</small></span>
              <span class="ln-exam-net"><b>${Math.round(lastExam.net)}</b> net wpm</span>
            </div>` : ''}
            <button class="btn primary" data-exam>${icon('play', 15)}start a mock exam</button>
          </section>

          <section class="cp-card cp-mastery">
            <div class="cp-card-head"><span class="cp-card-ico">${icon('target', 18)}</span><div><span class="cp-eyebrow">${T.bn ? 'Bijoy' : 'English'} keys</span><h2>Key mastery</h2></div></div>
            <div class="ln-legend"><span>needs work</span><i class="ln-grad"></i><span>mastered</span></div>
            <div class="keyboard ln-heat cp-heat" aria-label="Your accuracy on each key"></div>
            ${weak.length ? `<div class="cp-weak"><span class="label">your weakest keys</span><div>${weak.slice(0, 5).map(k => `<span class="chip"><b class="${bnc()}">${esc(showChar(T.keyText(k)))}</b><i>${esc(physicalKey(k).toUpperCase())}</i><em>${Math.round((keyAccuracy(d, T.statKey(k), 1) ?? 0) * 100)}%</em></span>`).join('')}</div>
                <button class="btn primary" data-weak="${esc(weak.join(''))}">${icon('target', 15)}practise them</button></div>`
              : practised ? `<p class="cp-note">${icon('check', 14)}No weak keys: every key you have practised is above 97%.</p>`
              : `<p class="cp-note">Every key lights up here as you practise: red needs work, green is mastered. Your weakest keys get a drill made just for them.</p>`}
          </section>

          <section class="cp-card cp-how">
            <div class="cp-card-head"><span class="cp-card-ico">${icon('info', 18)}</span><div><span class="cp-eyebrow">every lesson</span><h2>How it works</h2></div></div>
            <ol>${HOW_STEPS(T.bn).map(([ic, t, p]) => `<li><span>${ic}</span><div><b>${t}</b><p>${p}</p></div></li>`).join('')}</ol>
          </section>
        </aside>
      </div>

      <footer class="cp-foot">
        <label class="ln-switch"><input type="checkbox" data-openall ${d.openAll ? 'checked' : ''}/><span></span>Open every lesson</label>
        <p class="cp-saved">${act.signedIn ? `${icon('cloud', 14)}Saved to your account` : `${icon('device', 14)}Saved in this browser · sign in to keep it everywhere`}</p>
        ${Object.keys(d.lessons).length ? `<button class="h-clear" data-reset>${icon('trash', 14)}reset progress</button>` : ''}
      </footer>
    </div>`;

  // mastery heatmap: one colour per physical key, from this course's practice on it
  const heat = new Keyboard(el.querySelector('.cp-heat')!);
  heat.render(T.id);
  el.querySelectorAll<HTMLElement>('.cp-heat [data-k]').forEach(k => {
    const lo = k.dataset.k!;
    const mine = Object.keys(d.keys).filter(s => { const c = T.fromStatKey(s); return c !== null && physicalKey(c) === lo; });
    let hit = 0, miss = 0;
    for (const s of mine) { hit += d.keys[s].hit; miss += d.keys[s].miss; }
    if (hit + miss < 5) { k.classList.add('heat-none'); return; }
    const a = hit / (hit + miss);
    // 85% or less is red, 100% is full green
    const t = Math.max(0, Math.min(1, (a - 0.85) / 0.15));
    k.style.setProperty('--heat', `${Math.round(t * 100)}%`);
    k.classList.add('heat');
    k.title = `${T.keyText(lo)} (${lo.toUpperCase()}): ${Math.round(a * 100)}% of ${hit + miss} presses · ${FINGER_NAME[fingerFor(lo)]}`;
  });

  const expandAllBtn = el.querySelector<HTMLElement>('[data-expand-all]')!;
  const setOpen = (n: number, open: boolean, animate = true) => {
    const card = el.querySelector<HTMLElement>(`[data-unit-card="${n}"]`);
    if (!card) return;
    const body = card.querySelector<HTMLElement>('.cp-unit-body')!;
    card.classList.toggle('open', open);
    card.querySelector('.cp-unit-head')!.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
    if (open && animate) { body.classList.remove('enter'); void body.offsetWidth; body.classList.add('enter'); }
    if (open) op.add(n); else op.delete(n);
    expandAllBtn.textContent = op.size === T.units.length ? 'collapse all' : 'expand all';
  };

  el.onclick = e => {
    const t = e.target as Element;
    const sw = t.closest<HTMLAnchorElement>('[data-track]');
    if (sw) {
      if (!isPlainClick(e as MouseEvent)) return;
      e.preventDefault();
      if (sw.dataset.track !== T.id) act.switchTrack(sw.dataset.track as TrackId);
      return;
    }
    const head = t.closest<HTMLElement>('[data-toggle-unit]');
    if (head) { const n = Number(head.dataset.toggleUnit); setOpen(n, !op.has(n)); return; }
    if (t.closest('[data-expand-all]')) {
      const openAll = op.size !== T.units.length;
      T.units.forEach(u => setOpen(u.n, openAll, false));
      return;
    }
    const pathUnit = t.closest<HTMLElement>('[data-path-unit]');
    if (pathUnit) {
      const n = Number(pathUnit.dataset.pathUnit);
      setOpen(n, true);
      el.querySelector(`[data-unit-card="${n}"]`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    const go = t.closest<HTMLElement>('[data-start]');
    if (go) { act.start(T.lessons.find(l => l.id === go.dataset.start)!); return; }
    const b = t.closest<HTMLElement>('[data-lesson]');
    if (b) {
      if (b.getAttribute('aria-disabled') === 'true') {
        b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
        return;
      }
      act.start(T.lessons.find(l => l.id === b.dataset.lesson)!);
      return;
    }
    if (t.closest('[data-exam]')) { act.exam(); return; }
    const w = t.closest<HTMLElement>('[data-weak]');
    if (w) { act.start(T.weakLesson(w.dataset.weak!, learnedKeys(d, T.lessons) || T.lessons[3].allowed)); return; }
    if (t.closest('[data-reset]')) {
      if (confirm('Reset all course progress, in both the Bijoy and the English course: stars, key mastery and practice time? Your test results are kept.')) act.reset();
    }
  };

  // open every lesson: let the switch slide, then unlock (or lock) the lessons in place
  el.querySelector<HTMLInputElement>('[data-openall]')!.onchange = e => {
    const on = (e.target as HTMLInputElement).checked;
    d.openAll = on;
    act.openAll(on);
    const was = new Set([...el.querySelectorAll<HTMLElement>('.cp-lesson[aria-disabled="true"]')].map(b => b.dataset.lesson));
    window.setTimeout(() => {
      if (!el.isConnected || d.openAll !== on) return;
      const units = el.querySelector<HTMLElement>('.cp-units')!;
      units.innerHTML = T.units.map(u => unitCard(d, u, next.id, next.unit, op.has(u.n))).join('');
      const path = el.querySelector('.cp-path');
      if (path) path.outerHTML = coursePath(d, next.id);
      units.querySelectorAll<HTMLElement>('.cp-lesson').forEach(b => {
        const locked = b.getAttribute('aria-disabled') === 'true';
        if (was.has(b.dataset.lesson) !== locked) b.classList.add(locked ? 'just-locked' : 'just-opened');
      });
    }, 240);
  };
}
