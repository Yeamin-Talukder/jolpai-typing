// The Learn page: course progress, the units and lessons, and key mastery.
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

export interface PageActions { start(l: CourseLesson): void; openAll(on: boolean): void; reset(): void }

export function renderLearnPage(el: HTMLElement, d: LearnData, act: PageActions) {
  const done = doneCount(d), total = LESSONS.length;
  const pct = Math.round((done / total) * 100);
  const next = nextLesson(d);
  const nextI = LESSONS.indexOf(next);
  const nextUnit = UNITS.find(u => u.n === next.unit)!;
  const started = Object.keys(d.lessons).length > 0;
  const weak = weakKeys(d);
  const R = 52, C = 2 * Math.PI * R;

  el.innerHTML = `
    <div class="ln">
      <section class="ln-hero">
        <div class="ln-hero-text">
          <div class="ln-eyebrow">${icon('lessons', 16)}Bijoy touch-typing course</div>
          <h1>Type Bangla <span>without looking</span></h1>
          <p class="ln-bn">বিজয় কিবোর্ডে না দেখে বাংলা টাইপ করা শিখুন</p>
          <p class="ln-lead">${LESSONS.length} guided lessons take you from where to rest your fingers to exam speed. Every new key comes with the finger to use, and every Bijoy rule (vowel signs typed first, যুক্তাক্ষর, ফলা, reph) is shown step by step.</p>
          <div class="ln-cta">
            <button class="btn primary ln-go" data-start="${next.id}">${icon('play', 16)}${started ? 'continue' : 'start the course'}</button>
            <span class="ln-next">${started ? 'next up: ' : ''}<b>${esc(next.title)}</b> <span class="bn">${esc(next.bn)}</span><br><small>unit ${nextUnit.n} · lesson ${nextI + 1} of ${total}</small></span>
          </div>
        </div>
        <div class="ln-ring" aria-label="${pct}% of the course done">
          <svg viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="${R}"/><circle class="ring-fg" cx="60" cy="60" r="${R}" style="--len:${C};--off:${C * (1 - pct / 100)}"/></svg>
          <div class="ln-ring-text"><b>${pct}%</b><span>complete</span></div>
        </div>
      </section>

      <section class="ln-stats">
        <div class="ln-stat">${icon('check', 18)}<b>${done}<small>/${total}</small></b><span>lessons done</span></div>
        <div class="ln-stat">${starSvg()}<b>${starCount(d)}<small>/${total * 3}</small></b><span>stars</span></div>
        <div class="ln-stat">${icon('flame', 18)}<b>${learnStreak(d)}</b><span>day streak</span></div>
        <div class="ln-stat">${icon('clock', 18)}<b>${fmtTime(d.secs)}</b><span>practised</span></div>
      </section>

      ${started ? '' : `<section class="ln-method">
        <h2>${icon('info', 18)}how each lesson works</h2>
        <ol>
          <li><span>${icon('lessons', 20)}</span><b>Learn</b><p>A short explanation, with keys that type themselves so you see the Bangla appear.</p></li>
          <li><span>${icon('keyboard', 20)}</span><b>Meet the keys</b><p>Each new key, the finger to use, and three presses to remember it.</p></li>
          <li><span>${icon('target', 20)}</span><b>Drill, then words</b><p>A wrong key is not typed: find the right one. The keyboard and hands guide you.</p></li>
          <li><span>${starSvg()}</span><b>Earn stars</b><p>90% accuracy passes and opens the next lesson. Speed earns the second and third star.</p></li>
        </ol>
      </section>`}

      <section class="ln-units">
        ${UNITS.map(u => {
          const ls = lessonsInUnit(u.n);
          const ud = ls.filter(l => (d.lessons[l.id]?.stars ?? 0) > 0).length;
          const open = ls.some(l => isUnlocked(d, LESSONS.indexOf(l)));
          return `<article class="ln-unit ${ud === ls.length ? 'done' : ''} ${open ? '' : 'locked'}">
            <header class="ln-unit-head">
              <span class="ln-unit-n">${ud === ls.length ? icon('check', 18) : u.n}</span>
              <div class="ln-unit-text"><h2>${esc(u.title)} <span class="bn">${esc(u.bn)}</span></h2><p>${esc(u.summary)}</p></div>
              <div class="ln-unit-prog"><span>${ud}/${ls.length}</span><i style="--p:${(ud / ls.length) * 100}%"></i></div>
            </header>
            <div class="ln-lessons">${ls.map(l => {
              const i = LESSONS.indexOf(l);
              const rec = d.lessons[l.id];
              const unlocked = isUnlocked(d, i);
              const state = !unlocked ? 'locked' : rec?.stars ? 'done' : l.id === next.id ? 'current' : '';
              return `<button class="ln-lesson ${state}" data-lesson="${l.id}" ${unlocked ? '' : 'aria-disabled="true"'} title="${esc(l.summary)}">
                <span class="ln-l-top"><span class="ln-l-n">${u.n}.${ls.indexOf(l) + 1}</span>${unlocked ? stars(rec?.stars ?? 0) : `<span class="ln-lock">${icon('shield', 14)}</span>`}</span>
                <span class="ln-l-bn bn">${esc(l.bn)}</span>
                <span class="ln-l-title">${esc(l.title)}</span>
                ${rec ? `<span class="ln-l-best">${Math.round(rec.wpm)} wpm · ${Math.round(rec.acc)}%</span>` : state === 'current' ? `<span class="ln-l-best go">${icon('play', 12)}start</span>` : ''}
              </button>`;
            }).join('')}</div>
          </article>`;
        }).join('')}
      </section>

      <section class="ln-mastery">
        <div class="ln-mastery-head">
          <h2>${icon('target', 18)}key mastery</h2>
          <p>Your accuracy on every key you have practised. Keys turn green as you master them.</p>
        </div>
        <div class="keyboard ln-heat" aria-hidden="true"></div>
        <div class="ln-legend"><span>not practised</span><i class="ln-grad"></i><span>needs work</span><span>→</span><span>mastered</span></div>
        <div class="ln-weak">
          ${weak.length ? `<span class="label">keys to work on</span>${weak.map(k => `<span class="chip"><b class="bn">${esc(showChar(keyText(k)))}</b><i>${esc(physicalKey(k).toUpperCase())}</i><em>${Math.round((keyAccuracy(d, k, 1) ?? 0) * 100)}%</em></span>`).join('')}
            <button class="btn primary" data-weak="${esc(weak.join(''))}">${icon('target', 15)}practise these keys</button>`
            : `<p class="ln-weak-none">${started ? 'No weak keys yet: every key you have practised is above 97%. Keep going!' : 'Finish a lesson or two and your weakest keys show up here, with a drill made just for them.'}</p>`}
        </div>
      </section>

      <footer class="ln-foot">
        <label class="ln-switch"><input type="checkbox" data-openall ${d.openAll ? 'checked' : ''}/><span></span>Open every lesson (if you already know the basics)</label>
        ${started ? `<button class="h-clear" data-reset>${icon('trash', 14)}reset course progress</button>` : ''}
        <p class="ln-note">${icon('device', 13)}Course progress is saved in this browser.</p>
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
    const w = t.closest<HTMLElement>('[data-weak]');
    if (w) { act.start(weakKeysLesson(w.dataset.weak!, learnedKeys(d) || LESSONS[3].allowed)); return; }
    if (t.closest('[data-reset]')) {
      if (confirm('Reset all course progress: stars, key mastery and practice time? Your test results are kept.')) act.reset();
    }
  };
  el.querySelector<HTMLInputElement>('[data-openall]')!.onchange = e => act.openAll((e.target as HTMLInputElement).checked);
}
