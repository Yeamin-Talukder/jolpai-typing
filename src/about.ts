// The About page: why Jolpai Type exists, who made it, and where the code lives.
import { icon } from './icons';

const REPO = 'Yeamin-Talukder/jolpai-type';
const REPO_URL = `https://github.com/${REPO}`;
const AUTHOR = 'Md Yeamin Talukder';
const AUTHOR_URL = 'https://github.com/Yeamin-Talukder';

const GITHUB = '<svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>';
const STAR = '<svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/></svg>';

export function renderAbout(el: HTMLElement) {
  el.innerHTML = `
    <div class="ab-hero">
      <svg class="ab-logo" viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="18" rx="9" ry="11" fill="currentColor"/><path d="M16 7c2-4 6-5 9-4-1 4-5 6-9 4z" fill="var(--sub)"/></svg>
      <div>
        <h1>Jolpai Type <span class="ab-bn">জলপাই টাইপ</span></h1>
        <p class="ab-tag">Free typing practice for Bangla (Bijoy) and English, made for job typing tests.</p>
      </div>
    </div>

    <section class="ab-card ab-why">
      <h2>${icon('info', 18)}why this exists</h2>
      <p>There was no good place to practise <b>Bangla typing</b>. English has polished, modern typing sites, but Bangla learners
        were left with old, cluttered pages. Yet government job exams in Bangladesh test Bangla typing on the
        <b>Bijoy</b> layout, often with a minimum speed you must reach.</p>
      <p>Jolpai Type brings a clean, distraction-free typing test to Bangla: type Bijoy on any keyboard (no Bijoy software needed),
        learn the layout with lessons, practise real passages, and see whether your speed meets the exam minimums. English is here too.</p>
      <ul class="ab-list">
        <li>${icon('keyboard', 16)}Bijoy typing on any keyboard, converted as you type</li>
        <li>${icon('lessons', 16)}lessons that teach the layout row by row</li>
        <li>${icon('exam', 16)}an exam check against government job minimums</li>
        <li>${icon('chart', 16)}your progress, personal bests and a profile you can share</li>
      </ul>
    </section>

    <div class="ab-grid">
      <section class="ab-card ab-maker">
        <h2>${icon('user', 18)}made by</h2>
        <a class="ab-person" href="${AUTHOR_URL}" target="_blank" rel="noopener">
          <img src="${AUTHOR_URL}.png?size=120" alt="" width="56" height="56" loading="lazy" referrerpolicy="no-referrer" />
          <span><b>${AUTHOR}</b><span class="ab-handle">${GITHUB}@Yeamin-Talukder</span></span>
        </a>
        <p>Also the maker of <b>Jolpai Keyboard</b>, a typing keyboard for phones.</p>
      </section>

      <section class="ab-card ab-repo">
        <h2>${GITHUB}open source</h2>
        <p>Jolpai Type is free and open source. If it helps you practise, please <b>give it a star on GitHub</b>: it helps other
          Bangla typists find it.</p>
        <div class="ab-stats" aria-live="polite">
          <span class="ab-stat">${STAR}<b id="ab-stars">–</b> stars</span>
          <span class="ab-stat">${icon('share', 16)}<b id="ab-forks">–</b> forks</span>
        </div>
        <div class="ab-actions">
          <a class="btn primary" href="${REPO_URL}" target="_blank" rel="noopener">${STAR}star on GitHub</a>
          <a class="btn" href="${REPO_URL}/issues/new" target="_blank" rel="noopener">${icon('info', 15)}suggest or report</a>
        </div>
        <a class="ab-url" href="${REPO_URL}" target="_blank" rel="noopener">github.com/${REPO}</a>
      </section>
    </div>`;
  loadRepoStats(el);
}

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
  const s = el.querySelector('#ab-stars'), f = el.querySelector('#ab-forks');
  if (s) s.textContent = String(stats.stars);
  if (f) f.textContent = String(stats.forks);
}
