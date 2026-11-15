// The About page: why Jolpai Type exists, what it can do, who made it, and
// where the code lives. Numbers on the page come from the code itself, so
// they stay right as the site grows.
import { unicodeToSegments } from './bijoy';
import { POSTS } from './exam';
import { countUp, icon, type IconName } from './icons';
import { LESSONS, UNITS } from './learn/course';
import { THEMES } from './themes';

const REPO = 'Yeamin-Talukder/jolpai-type';
const REPO_URL = `https://github.com/${REPO}`;
const AUTHOR = 'Md Yeamin Talukder';
const AUTHOR_URL = 'https://github.com/Yeamin-Talukder';

const GITHUB = '<svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>';
const STAR = '<svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/></svg>';

/** Phrases the hero types, key by key, through the real Bijoy engine. */
const DEMO = ['আমি বাংলায় টাইপ করি', 'প্রতিদিন অনুশীলন করুন', 'চাকরির পরীক্ষার জন্য প্রস্তুতি'];

export type AboutGo = 'test' | 'learn' | 'profile' | 'settings';
interface Feature { icon: IconName; title: string; text: string; go?: AboutGo; cta?: string }

function features(): Feature[] {
  const op = POSTS.map(p => `${p.name}: ${p.bangla} Bangla, ${p.english} English`).join(' · ');
  return [
    { icon: 'keyboard', title: 'Bijoy on any keyboard', text: 'No Bijoy software to install. Press the Bijoy keys on any keyboard and the Bangla appears as you type.', go: 'test', cta: 'try it' },
    { icon: 'lessons', title: 'A full Bijoy course', text: `${LESSONS.length} lessons in ${UNITS.length} units, from the home row to যুক্তাক্ষর, ফলা and reph, with a finger guide and stars.`, go: 'learn', cta: 'start learning' },
    { icon: 'exam', title: 'Mock exam', text: 'A passage on paper and your answer in a box, like the real test. Then pass or fail, with every mistake shown.', go: 'learn', cta: 'take one' },
    { icon: 'target', title: 'Job exam check', text: `Every result is compared with minimum speeds from government job circulars (${op} wpm).`, go: 'settings', cta: 'turn it on' },
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
        <svg class="ab-logo" viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="18" rx="9" ry="11" fill="currentColor"/><path d="M16 7c2-4 6-5 9-4-1 4-5 6-9 4z" fill="var(--sub)"/></svg>
        <div class="ab-hero-text">
          <span class="ab-eyebrow">${icon('info', 14)}about</span>
          <h1>Jolpai Type <span class="ab-bn">জলপাই টাইপ</span></h1>
          <p class="ab-tag">Free typing practice for <b>Bangla (Bijoy)</b> and <b>English</b>, made for government job typing tests.</p>
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

    <section class="ab-card ab-why" data-reveal>
      <h2><span class="ab-h-ico">${icon('flame', 18)}</span>why this exists</h2>
      <div class="ab-why-body">
        <p>There was no good place to practise <b>Bangla typing</b>. English has polished, modern typing sites, but Bangla learners
          were left with old, cluttered pages. Yet government job exams in Bangladesh test Bangla typing on the
          <b>Bijoy</b> layout, often with a minimum speed you must reach.</p>
        <p>Jolpai Type brings a clean, distraction-free typing test to Bangla, and a course that teaches Bijoy touch typing from
          the first key to exam speed. English is here too.</p>
      </div>
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
      <h2><span class="ab-h-ico">${icon('trend', 18)}</span>from zero to exam speed</h2>
      <ol class="ab-steps">
        <li style="--i:0"><span>1</span><b>Learn the keys</b><p>Start the course at the home row. Each lesson shows the finger to use.</p></li>
        <li style="--i:1"><span>2</span><b>Practise every day</b><p>Short tests and real passages. Your streak and progress graph keep you going.</p></li>
        <li style="--i:2"><span>3</span><b>Pass the exam</b><p>Take mock exams until your net speed clears the minimum for your post.</p></li>
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
        <p>Jolpai Type is free and open source. If it helps you practise, please <b>give it a star on GitHub</b>: it helps other
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

    <p class="ab-foot" data-reveal>${icon('lessons', 14)}Built with TypeScript, Vite and Firebase · made for Bangla typists</p>`;

  el.onclick = e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-go]');
    if (b) go(b.dataset.go as AboutGo);
  };
  reveal(el);
  typeDemo(el);
  loadRepoStats(el);
}

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Sections slide in as they scroll into view; numbers count up. */
function reveal(el: HTMLElement) {
  const parts = el.querySelectorAll<HTMLElement>('[data-reveal]');
  if (still() || !('IntersectionObserver' in window)) { parts.forEach(p => p.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const p = en.target as HTMLElement;
      p.classList.add('in');
      p.querySelectorAll<HTMLElement>('[data-count]').forEach(n => countUp(n, Number(n.dataset.count), '', 900));
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
