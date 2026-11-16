// The About page: why Jolpai Typing exists, what it can do, who made it, and
// where the code lives. Numbers on the page come from the code itself, so
// they stay right as the site grows.
import { loadSiteStats, type SiteStats } from './account';
import { unicodeToSegments } from './bijoy';
import './about-stats.css';
import { countUp, icon, logo, type IconName } from './icons';
import { BASE } from './router';
import { LESSONS, UNITS } from './learn/course';
import { THEMES } from './themes';

const REPO = 'Yeamin-Talukder/jolpai-typing';
const REPO_URL = `https://github.com/${REPO}`;
const AUTHOR = 'Md Yeamin Talukder';
const AUTHOR_URL = 'https://github.com/Yeamin-Talukder';

const GITHUB = '<svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>';
const STAR = '<svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/></svg>';

/** Phrases the hero types, key by key, through the real Bijoy engine. */
const DEMO = ['আমি বাংলায় টাইপ করি', 'প্রতিদিন অনুশীলন করুন', 'আরামে বাংলা টাইপ শিখুন'];

export type AboutGo = 'test' | 'learn' | 'profile' | 'settings';
interface Feature { icon: IconName; title: string; text: string; go?: AboutGo; cta?: string }

function features(): Feature[] {
  return [
    { icon: 'keyboard', title: 'Bijoy on any keyboard', text: 'No Bijoy software to install. Press the Bijoy keys on any keyboard and the Bangla appears as you type.', go: 'test', cta: 'try it' },
    { icon: 'lessons', title: 'A full Bijoy course', text: `${LESSONS.length} lessons in ${UNITS.length} units, from the home row to যুক্তাক্ষর, ফলা and reph, with a finger guide and stars.`, go: 'learn', cta: 'start learning' },
    { icon: 'exam', title: 'Mock exam', text: 'A timed passage on paper and your answer in a box. Pick a target speed, then see every mistake word by word.', go: 'learn', cta: 'take one' },
    { icon: 'target', title: 'Key mastery', text: 'A keyboard heat map shows how well you know every key, and your weakest keys get a drill made just for them.', go: 'learn', cta: 'see your keys' },
    { icon: 'clock', title: 'Tests your way', text: 'Time, word count or real passages, or set your own time and text. Add punctuation and numbers when you are ready.', go: 'test', cta: 'pick a test' },
    { icon: 'play', title: 'Results and replay', text: 'A speed graph and full details for every test, and a replay of every key you pressed, shown on the keyboard.' },
    { icon: 'trend', title: 'Progress and profile', text: 'A progress graph, personal bests and an activity calendar. Phone and computer results are kept apart.', go: 'profile', cta: 'see yours' },
    { icon: 'qr', title: 'Share and sync', text: 'Sign in with Google to keep everything on every device, and share your profile with a link or a QR code.', go: 'profile', cta: 'open profile' },
    { icon: 'palette', title: 'Yours to set up', text: `${THEMES.length} themes, key sounds, live speed and accuracy, caret styles and more. Works on phones too.`, go: 'settings', cta: 'open settings' },
  ];
}

export function renderAbout(el: HTMLElement, go: (v: AboutGo) => void) {
  const nums: [IconName, number, string][] = [
    ['lessons', LESSONS.length, 'lessons'],
    ['hash', UNITS.length, 'course units'],
    ['palette', THEMES.length, 'themes'],
    ['globe', 2, 'languages'],
  ];
  el.innerHTML = `
    <section class="ab-hero">
      <div class="ab-float" aria-hidden="true">${[...'কখগঘঙচছজঝটঠডঢণতথদধনপফবভমযরলশসহ'].slice(0, 14).map((c, i) => `<span style="--i:${i};--s:${((i * 7) % 4) * 6};--d:${9 + ((i * 13) % 5) * 1.6}s">${c}</span>`).join('')}</div>
      <div class="ab-hero-main">
        ${logo('ab-logo')}
        <div class="ab-hero-text">
          <span class="ab-eyebrow">${icon('info', 14)}about<span class="ab-formerly">formerly Jolpai Type</span></span>
          <h1>Jolpai Typing <span class="ab-bn">জলপাই টাইপিং</span></h1>
          <p class="ab-tag">Practise <b>Bangla (Bijoy)</b> and <b>English</b> typing in a clean, calm place, and learn Bijoy touch typing from the very first key. Free.</p>
          <div class="ab-cta">
            <button class="btn primary" data-go="test">${icon('keyboard', 16)}start typing</button>
            <button class="btn" data-go="learn">${icon('lessons', 16)}learn Bijoy</button>
          </div>
        </div>
      </div>
      <div class="ab-demo" aria-label="Bijoy keys typing Bangla">
        <div class="ab-demo-head"><i></i><i></i><i></i><span>Bijoy keys → Bangla</span></div>
        <div class="ab-demo-keys" aria-hidden="true"></div>
        <div class="ab-demo-out bn"><span class="ab-demo-text"></span><b class="ab-demo-caret"></b></div>
      </div>
    </section>

    <section class="ab-nums" data-reveal>
      ${nums.map(([ic, n, label], i) => `<div class="ab-num" style="--i:${i}">${icon(ic, 18)}<b data-count="${n}">${n}</b><span>${label}</span></div>`).join('')}
      <div class="ab-num" style="--i:4">${icon('check', 18)}<b>free</b><span>no sign-up needed</span></div>
    </section>

    <section class="ab-live" data-reveal aria-live="polite">
      <h2 class="ab-title"><span class="ab-h-ico">${icon('trend', 18)}</span>Jolpai Typing in numbers<span class="ab-live-tag"><i></i>live</span></h2>
      <div class="ab-live-grid">
        ${LIVE.map(([k, ic, label, sub], i) => `<div class="ab-live-card" style="--i:${i}" data-live="${k}">
          <span class="ab-live-ico">${icon(ic, 20)}</span><b>–</b><span>${label}</span><small>${sub}</small></div>`).join('')}
      </div>
      <p class="ab-live-note">${icon('info', 14)}<span>Counted on this site since 16 November 2026, guests included. Every finished test and lesson adds to it.</span></p>
    </section>

    <section class="ab-card ab-why" data-reveal>
      <h2><span class="ab-h-ico">${icon('flame', 18)}</span>why this exists</h2>
      <div class="ab-why-body">
        <p>There was no good place to practise <b>Bangla typing</b>. English has polished, modern typing sites, but people who
          type Bangla were left with old, cluttered pages that are hard to enjoy.</p>
        <p>Jolpai Typing gives Bangla typing a <b>good environment</b>: a clean, distraction-free typing test with a better design,
          and a course that teaches <b>Bijoy</b> touch typing step by step. English is here too.</p>
      </div>
      <p class="ab-name">${icon('lessons', 16)}<span><b>Why “Jolpai”?</b> জলপাই means olive in Bangla: the colour of the site, and the name it shares
        with Jolpai Keyboard. Until November 2026 the site was called Jolpai Type; old links still bring you here.</span></p>
    </section>

    <section class="ab-section" data-reveal>
      <h2 class="ab-title"><span class="ab-h-ico">${icon('zap', 18)}</span>what you can do here</h2>
      <div class="ab-features">${features().map((f, i) => `
        <${f.go ? `button data-go="${f.go}"` : 'div'} class="ab-feat" style="--i:${i}">
          <span class="ab-feat-ico">${icon(f.icon, 20)}</span>
          <b>${f.title}</b>
          <p>${f.text}</p>
          ${f.go ? `<span class="ab-feat-go">${f.cta}${icon('next', 14)}</span>` : ''}
        </${f.go ? 'button' : 'div'}>`).join('')}
      </div>
    </section>

    <section class="ab-card ab-path" data-reveal>
      <h2><span class="ab-h-ico">${icon('trend', 18)}</span>from your first key to fast typing</h2>
      <ol class="ab-steps">
        <li style="--i:0"><span>1</span><b>Learn the keys</b><p>Start the course at the home row. Each lesson shows the finger to use.</p></li>
        <li style="--i:1"><span>2</span><b>Practise every day</b><p>Short tests and real passages. Your streak and progress graph keep you going.</p></li>
        <li style="--i:2"><span>3</span><b>Test yourself</b><p>Take a timed mock exam, set a target speed and watch your net speed climb.</p></li>
      </ol>
    </section>

    <div class="ab-grid" data-reveal>
      <section class="ab-card ab-maker">
        <h2><span class="ab-h-ico">${icon('user', 18)}</span>made by</h2>
        <a class="ab-person" href="${AUTHOR_URL}" target="_blank" rel="noopener">
          <span class="ab-mono" aria-hidden="true">${AUTHOR.split(' ').filter(w => w.length > 2).map(w => w[0]).join('')}</span>
          <span><b>${AUTHOR}</b><span class="ab-handle">${GITHUB}@Yeamin-Talukder</span></span>
          <span class="ab-out">${icon('link', 15)}</span>
        </a>
        <p>Also the maker of <b>Jolpai Keyboard</b>, a typing keyboard for phones.</p>
      </section>

      <section class="ab-card ab-repo">
        <h2><span class="ab-h-ico">${GITHUB}</span>open source</h2>
        <p>Jolpai Typing is free and open source under the <a class="ab-inline" href="${REPO_URL}/blob/main/LICENSE" target="_blank" rel="noopener">MIT License</a>. If it helps you practise, please <b>give it a star on GitHub</b>: it helps other
          Bangla typists find it.</p>
        <div class="ab-stats" aria-live="polite">
          <span class="ab-stat">${STAR}<b id="ab-stars">–</b> stars</span>
          <span class="ab-stat">${icon('share', 16)}<b id="ab-forks">–</b> forks</span>
        </div>
        <div class="ab-actions">
          <a class="btn primary ab-star" href="${REPO_URL}" target="_blank" rel="noopener">${STAR}star on GitHub<i aria-hidden="true"></i></a>
          <a class="btn" href="${REPO_URL}/issues/new" target="_blank" rel="noopener">${icon('info', 15)}suggest or report</a>
        </div>
        <a class="ab-url" href="${REPO_URL}" target="_blank" rel="noopener">github.com/${REPO}</a>
      </section>
    </div>

    <p class="ab-foot" data-reveal>${icon('lessons', 14)}Built with TypeScript, Vite and Firebase · made for Bangla typists</p>
    <p class="ab-foot ab-guides" data-reveal><a href="${BASE}bangla-typing-test/">Bangla typing test guide · বাংলা টাইপিং টেস্ট</a><span>·</span><a href="${BASE}bijoy-typing-tutor/">Learn Bijoy typing · বিজয় টাইপিং শিখুন</a></p>`;

  el.onclick = e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-go]');
    if (b) go(b.dataset.go as AboutGo);
  };
  reveal(el);
  typeDemo(el);
  loadRepoStats(el);
  loadLive(el);
}

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The site-wide totals: [key, icon, label, small print]. */
const LIVE: [string, IconName, string, string][] = [
  ['tests', 'keyboard', 'tests taken', 'typing tests and mock exams'],
  ['typists', 'user', 'people typing', 'browsers that finished a test'],
  ['time', 'clock', 'time spent typing', 'tests and lessons together'],
  ['bangla', 'globe', 'tests in Bangla', 'the rest in English'],
  ['lessons', 'lessons', 'course lessons finished', 'in the Bijoy course'],
  ['accounts', 'cloud', 'Google accounts', 'people who signed in'],
];

/** Fill in the totals once they arrive; count up if the section is already on screen. */
async function loadLive(el: HTMLElement) {
  const s: SiteStats | null = await loadSiteStats();
  const box = el.querySelector<HTMLElement>('.ab-live');
  if (!box || !el.isConnected) return;
  if (!s) { box.classList.add('off'); box.querySelector('.ab-live-note span')!.textContent = 'The site totals cannot be loaded right now. Try again later.'; return; }
  const hours = s.seconds / 3600;
  const values: Record<string, [number, string]> = {
    tests: [s.tests, ''], typists: [s.typists, ''], lessons: [s.lessons, ''], accounts: [s.accounts, ''],
    time: hours >= 1 ? [Math.round(hours), 'h'] : s.seconds >= 60 ? [Math.round(s.seconds / 60), 'm'] : [Math.round(s.seconds), 's'],
    bangla: [s.tests ? Math.round((s.bangla / s.tests) * 100) : 0, '%'],
  };
  for (const [k, [n, suffix]] of Object.entries(values)) {
    const b = box.querySelector<HTMLElement>(`[data-live="${k}"] b`);
    if (!b) continue;
    if (box.classList.contains('in') || still()) countUp(b, n, suffix, 1000); else { b.dataset.count = String(n); b.dataset.suffix = suffix; b.textContent = `${n}${suffix}`; }
  }
  box.classList.add('loaded');
}

/** Sections slide in as they scroll into view; numbers count up. */
function reveal(el: HTMLElement) {
  const parts = el.querySelectorAll<HTMLElement>('[data-reveal]');
  if (still() || !('IntersectionObserver' in window)) { parts.forEach(p => p.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const p = en.target as HTMLElement;
      p.classList.add('in');
      p.querySelectorAll<HTMLElement>('[data-count]').forEach(n => countUp(n, Number(n.dataset.count), n.dataset.suffix || '', 900));
      io.unobserve(p);
    }
  }, { threshold: 0.15 });
  parts.forEach(p => io.observe(p));
}

/** The hero types Bangla phrases through the Bijoy engine: keys first, then the letters they make. */
function typeDemo(el: HTMLElement) {
  const keysEl = el.querySelector<HTMLElement>('.ab-demo-keys')!;
  const textEl = el.querySelector<HTMLElement>('.ab-demo-text')!;
  const steps = (phrase: string) => phrase.split(' ').flatMap((w, i) => [
    ...(i ? [{ text: ' ', keys: ' ' }] : []),
    ...unicodeToSegments(w),
  ]);
  if (still()) {
    textEl.textContent = DEMO[0];
    keysEl.innerHTML = steps(DEMO[0]).filter(s => s.keys !== ' ').slice(0, 6).map(s => `<kbd>${esc(s.keys)}</kbd>`).join('');
    return;
  }
  let p = 0, i = 0, wait = 0;
  let segs = steps(DEMO[0]);
  const timer = window.setInterval(() => {
    if (!el.isConnected || el.hidden) { window.clearInterval(timer); return; }
    if (wait > 0) { wait--; return; }
    if (i >= segs.length) {
      // pause on the finished phrase, then the next one
      p = (p + 1) % DEMO.length; segs = steps(DEMO[p]); i = 0; wait = 0;
      textEl.textContent = '';
      keysEl.innerHTML = '';
      return;
    }
    const s = segs[i++];
    textEl.textContent += s.text;
    if (s.keys !== ' ') {
      const k = document.createElement('kbd');
      k.textContent = s.keys;
      keysEl.append(k);
      while (keysEl.children.length > 6) keysEl.firstElementChild!.remove();
    }
    if (i >= segs.length) wait = 12;
  }, 170);
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Stars and forks from GitHub's public API, remembered for this visit. */
async function loadRepoStats(el: HTMLElement) {
  const KEY = 'jolpai-type:repo-stats';
  let stats: { stars: number; forks: number } | null = null;
  try { stats = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { /* ignore */ }
  if (!stats) {
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}`, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) return;
      const d = await res.json();
      stats = { stars: Number(d.stargazers_count) || 0, forks: Number(d.forks_count) || 0 };
      try { sessionStorage.setItem(KEY, JSON.stringify(stats)); } catch { /* ignore */ }
    } catch { return; } // offline: the counts stay as dashes
  }
  const s = el.querySelector<HTMLElement>('#ab-stars'), f = el.querySelector<HTMLElement>('#ab-forks');
  if (s) countUp(s, stats.stars);
  if (f) countUp(f, stats.forks);
}
