// The Learn page, as a one-screen dashboard: progress at the top, the course
// map (unit tabs and that unit's lessons) on the left, the mock exam and key
// mastery on the right.
import { Keyboard } from '../keyboard';
import { icon } from '../icons';
import { LESSONS, UNITS, lessonsInUnit, weakKeysLesson, type CourseLesson } from './course';
import { fingerFor, physicalKey } from './fingers';
import { doneCount, isUnlocked, keyAccuracy, learnedKeys, learnStreak, nextLesson, starCount, weakKeys, type LearnData } from './progress';
import { keyText, starSvg } from './player';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const SIGN = /^[ঁ-ঃ়া-্ৗ]/;
const showChar = (s: string) => (SIGN.test(s) ? '◌' + s : s);

function fmtTime(secs: number) {
  const m = Math.round(secs / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

const stars = (n: number) => `<span class="ln-stars" aria-label="${n} of 3 stars">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">${starSvg()}</i>`).join('')}</span>`;

export interface PageActions { start(l: CourseLesson): void; exam(): void; openAll(on: boolean): void; reset(): void; signedIn: boolean }

// the unit shown in the course map (kept while the page is open)
let shownUnit: number | null = null;
let shownFor = '';

const unitDone = (d: LearnData, n: number) => lessonsInUnit(n).filter(l => (d.lessons[l.id]?.stars ?? 0) > 0).length;

function unitPanel(d: LearnData, n: number, nextId: string): string {
  const u = UNITS.find(x => x.n === n)!;
  const ls = lessonsInUnit(n);
  const ud = unitDone(d, n);
  return `
    <header class="ln-panel-head">
      <div><h2>${esc(u.title)} <span class="bn">${esc(u.bn)}</span></h2><p>${esc(u.summary)}</p></div>
      <div class="ln-unit-prog"><span>${ud}/${ls.length} done</span><i style="--p:${(ud / ls.length) * 100}%"></i></div>
    </header>
    <div class="ln-lessons">${ls.map((l, j) => {
      const i = LESSONS.indexOf(l);
      const rec = d.lessons[l.id];
      const unlocked = isUnlocked(d, i);
      const state = !unlocked ? 'locked' : rec?.stars ? 'done' : l.id === nextId ? 'current' : '';
      return `<button class="ln-lesson ${state}" data-lesson="${l.id}" ${unlocked ? '' : 'aria-disabled="true"'} title="${esc(l.summary)}" style="--i:${j}">
        <span class="ln-l-top"><span class="ln-l-n">${n}.${j + 1}</span>${unlocked ? stars(rec?.stars ?? 0) : `<span class="ln-lock">${icon('shield', 14)}</span>`}</span>
        <span class="ln-l-bn bn">${esc(l.bn)}</span>
        <span class="ln-l-title">${esc(l.title)}</span>
        ${rec ? `<span class="ln-l-best">${Math.round(rec.wpm)} wpm · ${Math.round(rec.acc)}%</span>` : state === 'current' ? `<span class="ln-l-best go">${icon('play', 12)}start here</span>` : ''}
      </button>`;
    }).join('')}</div>`;
}

const HOW = `
  <ol class="ln-how">
    <li><span>${icon('lessons', 20)}</span><b>Learn</b><p>A short explanation, with keys that type themselves so you see the Bangla appear.</p></li>
    <li><span>${icon('keyboard', 20)}</span><b>Meet the keys</b><p>Each new key, the finger to use, and three presses to remember it.</p></li>
    <li><span>${icon('target', 20)}</span><b>Drill, then words</b><p>A wrong key is not typed: find the right one. The keyboard and hands guide you.</p></li>
    <li><span>${starSvg()}</span><b>Earn stars</b><p>90% accuracy passes and opens the next lesson. Speed earns the second and third star.</p></li>
  </ol>`;

function showHow() {
  const d = document.createElement('dialog');
  d.className = 'share-dlg how-dlg';
  d.innerHTML = `<div class="sh-top"><h2>${icon('info', 18)}how each lesson works</h2><button class="sh-close" aria-label="Close">${icon('x', 18)}</button></div>${HOW}
    <p class="ln-how-more">The course has ${LESSONS.length} lessons in ${UNITS.length} units, from where to rest your fingers to the Bijoy rules (vowel signs typed first, যুক্তাক্ষর, ফলা, reph) and exam speed.</p>`;
  document.body.appendChild(d);
  const close = () => { if (d.open) d.close(); d.remove(); };
  d.addEventListener('click', e => { if (e.target === d || (e.target as Element).closest('.sh-close')) close(); });
  d.addEventListener('close', () => d.remove());
  d.showModal();
}

export function renderLearnPage(el: HTMLElement, d: LearnData, act: PageActions) {
  const done = doneCount(d), total = LESSONS.length;
  const pct = Math.round((done / total) * 100);
  const next = nextLesson(d);
  const nextI = LESSONS.indexOf(next);
  const started = Object.keys(d.lessons).length > 0;
  const weak = weakKeys(d);
  const R = 52, C = 2 * Math.PI * R;
  // open on the unit being worked on (until you pick another one)
  if (shownUnit === null || shownFor !== next.id) { shownUnit = next.unit; shownFor = next.id; }
  const lastExam = d.exams[d.exams.length - 1];
  const bestNet = d.exams.reduce((m, e) => Math.max(m, e.net), 0);

  el.innerHTML = `
    <div class="ln ln-dash">
      <section class="ln-hero">
        <div class="ln-ring" aria-label="${pct}% of the course done">
          <svg viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="${R}"/><circle class="ring-fg" cx="60" cy="60" r="${R}" style="--len:${C};--off:${C * (1 - pct / 100)}"/></svg>
          <div class="ln-ring-text"><b>${pct}%</b><span>done</span></div>
        </div>
        <div class="ln-hero-text">
          <div class="ln-eyebrow">${icon('lessons', 15)}Bijoy touch-typing course<button class="ln-how-btn ${started ? '' : 'glow'}" data-how>${icon('info', 14)}how it works</button></div>
          <h1>Type Bangla <span>without looking</span> <span class="ln-bn">বিজয়ে না দেখে টাইপ</span></h1>
          <div class="ln-cta">
            <button class="btn primary ln-go" data-start="${next.id}">${icon('play', 16)}${started ? 'continue' : 'start the course'}</button>
            <span class="ln-next">${started ? 'next up: ' : 'lesson 1: '}<b>${esc(next.title)}</b> <span class="bn">${esc(next.bn)}</span><small>unit ${next.unit} · lesson ${nextI + 1} of ${total}</small></span>
          </div>
        </div>
        <div class="ln-stats">
          <div class="ln-stat">${icon('check', 17)}<b>${done}<small>/${total}</small></b><span>lessons</span></div>
          <div class="ln-stat">${starSvg()}<b>${starCount(d)}<small>/${total * 3}</small></b><span>stars</span></div>
          <div class="ln-stat">${icon('flame', 17)}<b>${learnStreak(d)}</b><span>day streak</span></div>
          <div class="ln-stat">${icon('clock', 17)}<b>${fmtTime(d.secs)}</b><span>practised</span></div>
        </div>
      </section>

      <section class="ln-map" aria-label="Course map">
        <div class="ln-tabs" role="tablist">${UNITS.map(u => {
          const n = lessonsInUnit(u.n).length, ud = unitDone(d, u.n);
          const open = lessonsInUnit(u.n).some(l => isUnlocked(d, LESSONS.indexOf(l)));
          return `<button role="tab" class="ln-tab ${u.n === shownUnit ? 'active' : ''} ${ud === n ? 'done' : ''} ${open ? '' : 'locked'} ${u.n === next.unit ? 'here' : ''}" data-unit="${u.n}" aria-selected="${u.n === shownUnit}" title="${esc(u.title)}">
            <span class="ln-tab-n">${ud === n ? icon('check', 14) : u.n}</span><span class="ln-tab-t">${esc(u.short)}</span><i style="--p:${(ud / n) * 100}%"></i>
          </button>`;
        }).join('')}</div>
        <div class="ln-panel" role="tabpanel">${unitPanel(d, shownUnit!, next.id)}</div>
      </section>

      <aside class="ln-side">
        <section class="ln-exam">
          <div class="ln-exam-head">
            <div><div class="ln-eyebrow">${icon('exam', 15)}mock exam · মডেল টেস্ট</div>
              <h2>Ready for the real test?</h2></div>
            <button class="btn primary" data-exam>${icon('play', 15)}start</button>
          </div>
          <p>A passage on paper, your answer in a box, backspace allowed, no live speed. Then pass or fail and every mistake.</p>
          ${lastExam ? `<div class="ln-exam-row ${lastExam.pass ? 'pass' : 'fail'}">
            <span class="ln-exam-mark">${icon(lastExam.pass ? 'check' : 'x', 14)}</span>
            <span class="ln-exam-what">last: ${lastExam.lang === 'bangla' ? 'বাংলা' : 'English'} · ${Math.round((lastExam.limit ?? lastExam.secs) / 60)} min<small>${d.exams.length} exam${d.exams.length === 1 ? '' : 's'} · best ${Math.round(bestNet)} net</small></span>
            <span class="ln-exam-net"><b>${Math.round(lastExam.net)}</b> net wpm</span>
          </div>` : ''}
        </section>

        <section class="ln-mastery">
          <div class="ln-mastery-head">
            <h2>${icon('target', 17)}key mastery</h2>
            <div class="ln-legend"><span>needs work</span><i class="ln-grad"></i><span>mastered</span></div>
          </div>
          <div class="keyboard ln-heat" aria-label="Your accuracy on each key"></div>
          <div class="ln-weak">
            ${weak.length ? `${weak.slice(0, 4).map(k => `<span class="chip"><b class="bn">${esc(showChar(keyText(k)))}</b><i>${esc(physicalKey(k).toUpperCase())}</i><em>${Math.round((keyAccuracy(d, k, 1) ?? 0) * 100)}%</em></span>`).join('')}
              <button class="btn primary" data-weak="${esc(weak.join(''))}">${icon('target', 15)}practise</button>`
              : `<p class="ln-weak-none">${started ? 'No weak keys: every key you have practised is above 97%.' : 'Your weakest keys show up here after a lesson or two, with a drill made for them.'}</p>`}
          </div>
        </section>
      </aside>

      <footer class="ln-foot">
        <label class="ln-switch"><input type="checkbox" data-openall ${d.openAll ? 'checked' : ''}/><span></span>Open every lesson</label>
        <p class="ln-note">${act.signedIn ? `${icon('cloud', 13)}Saved to your account` : `${icon('device', 13)}Saved in this browser · sign in to keep it everywhere`}</p>
        ${started ? `<button class="h-clear" data-reset>${icon('trash', 14)}reset progress</button>` : ''}
      </footer>
    </div>`;

  // mastery heatmap: one colour per physical key, from both of its letters
  const heat = new Keyboard(el.querySelector('.ln-heat')!);
  heat.render('bangla');
  el.querySelectorAll<HTMLElement>('.ln-heat [data-k]').forEach(k => {
    const lo = k.dataset.k!;
    const hi = Object.keys(d.keys).filter(c => physicalKey(c) === lo && c !== lo);
    let hit = 0, miss = 0;
    for (const c of [lo, ...hi]) { hit += d.keys[c]?.hit ?? 0; miss += d.keys[c]?.miss ?? 0; }
    if (hit + miss < 5) { k.classList.add('heat-none'); return; }
    const a = hit / (hit + miss);
    // 85% or less is red, 100% is full green
    const t = Math.max(0, Math.min(1, (a - 0.85) / 0.15));
    k.style.setProperty('--heat', `${Math.round(t * 100)}%`);
    k.classList.add('heat');
    k.title = `${keyText(lo)} (${lo.toUpperCase()}): ${Math.round(a * 100)}% of ${hit + miss} presses · ${fingerFor(lo)}`;
  });

  // animate the ring in
  requestAnimationFrame(() => el.querySelector('.ring-fg')?.classList.add('go'));

  el.onclick = e => {
    const t = e.target as Element;
    const tab = t.closest<HTMLElement>('[data-unit]');
    if (tab) {
      shownUnit = Number(tab.dataset.unit);
      el.querySelectorAll('.ln-tab').forEach(x => { x.classList.toggle('active', x === tab); x.setAttribute('aria-selected', String(x === tab)); });
      const panel = el.querySelector<HTMLElement>('.ln-panel')!;
      panel.innerHTML = unitPanel(d, shownUnit, next.id);
      panel.classList.remove('enter'); void panel.offsetWidth; panel.classList.add('enter');
      return;
    }
    if (t.closest('[data-how]')) { showHow(); return; }
    const go = t.closest<HTMLElement>('[data-start]');
    if (go) { act.start(LESSONS.find(l => l.id === go.dataset.start)!); return; }
    const b = t.closest<HTMLElement>('[data-lesson]');
    if (b) {
      if (b.getAttribute('aria-disabled') === 'true') {
        b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
        return;
      }
      act.start(LESSONS.find(l => l.id === b.dataset.lesson)!);
      return;
    }
    if (t.closest('[data-exam]')) { act.exam(); return; }
    const w = t.closest<HTMLElement>('[data-weak]');
    if (w) { act.start(weakKeysLesson(w.dataset.weak!, learnedKeys(d) || LESSONS[3].allowed)); return; }
    if (t.closest('[data-reset]')) {
      if (confirm('Reset all course progress: stars, key mastery and practice time? Your test results are kept.')) act.reset();
    }
  };
  // arrow keys move between unit tabs
  el.querySelector('.ln-tabs')!.addEventListener('keydown', e => {
    const ke = e as KeyboardEvent;
    if (ke.key !== 'ArrowRight' && ke.key !== 'ArrowLeft') return;
    const tabs = [...el.querySelectorAll<HTMLElement>('.ln-tab')];
    const i = tabs.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const nextTab = tabs[(i + (ke.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    nextTab.focus();
    nextTab.click();
  });
  el.querySelector<HTMLInputElement>('[data-openall]')!.onchange = e => act.openAll((e.target as HTMLInputElement).checked);
}
