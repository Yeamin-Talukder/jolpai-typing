// The mock exam: a timed passage test. The passage is shown on paper, you
// type it into an answer box (backspace allowed, no live speed), and at the
// end you get gross and net speed, whether you reached your target speed,
// and a word-by-word review.
import { bijoyToUnicode, usKey } from '../bijoy';
import { icon, reduceMotion } from '../icons';
import { BANGLA_PASSAGES, ENGLISH_PASSAGES } from '../passages';
import { keySound } from '../sound';
import type { Prefs } from '../prefs';
import { scoreExam, type ExamScore } from './exam-score';
import { typeable } from './course';
import type { ExamRec } from './progress';

export type Lang = 'english' | 'bangla';
export interface ExamSetup { lang: Lang; secs: number; goal: number }

export interface ExamOptions {
  prefs: Prefs;
  setup: ExamSetup;
  onExit(): void;
  /** A finished exam: save it to the course and to the test history. */
  onDone(rec: ExamRec, score: ExamScore, setup: ExamSetup): void;
}

const DURATIONS = [120, 300, 600];
/** Target net speeds to choose from, in wpm. */
const GOALS: [number, string][] = [[20, 'a good start'], [25, 'steady'], [30, 'quick'], [40, 'fast']];
const goalName = (n: number) => `${n} wpm`;
const SETUP_KEY = 'jolpai-type:exam-setup';
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;

export function loadSetup(): ExamSetup {
  try {
    const s = JSON.parse(localStorage.getItem(SETUP_KEY) || 'null');
    if (s && (s.lang === 'english' || s.lang === 'bangla') && DURATIONS.includes(s.secs) && GOALS.some(g => g[0] === s.goal)) return s;
  } catch { /* ignore */ }
  return { lang: 'bangla', secs: 300, goal: 25 };
}
function saveSetup(s: ExamSetup) { try { localStorage.setItem(SETUP_KEY, JSON.stringify(s)); } catch { /* ignore */ } }

/** Enough passage text for the time: passages in a random order, repeated if needed. */
function passageWords(lang: Lang, secs: number): string[] {
  const list = [...(lang === 'bangla' ? BANGLA_PASSAGES : ENGLISH_PASSAGES)].sort(() => Math.random() - 0.5);
  const need = Math.ceil((secs / 60) * 70); // room for 70 words a minute
  const out: string[] = [];
  for (let i = 0; out.length < need && i < 50; i++) {
    for (const w of list[i % list.length].split(/\s+/)) {
      if (w && (lang === 'english' || typeable(w))) out.push(w);
    }
  }
  return out;
}

export class MockExam {
  private root: HTMLElement;
  private o: ExamOptions;
  private setup: ExamSetup;
  private target: string[] = [];
  private words: string[] = [''];   // keys typed for each word
  private started = 0;
  private ended = false;
  private running = false;
  private ticker = 0;
  private timers: number[] = [];
  private answer!: HTMLElement;
  private input!: HTMLInputElement;
  private onKey = (e: KeyboardEvent) => this.keydown(e);
  private onInput = () => this.inputFallback();

  constructor(root: HTMLElement, o: ExamOptions) {
    this.root = root;
    this.o = o;
    this.setup = { ...o.setup };
    document.addEventListener('keydown', this.onKey, true);
    this.showSetup();
  }

  destroy() {
    document.removeEventListener('keydown', this.onKey, true);
    this.input?.removeEventListener('input', this.onInput);
    clearInterval(this.ticker);
    this.timers.forEach(t => clearTimeout(t));
  }

  /** Esc: leave (asking first during an exam). */
  private leave() {
    if (this.running && !this.ended && this.started && !confirm('Leave the exam? This attempt will not be saved.')) return;
    this.o.onExit();
  }

  private enter(el: Element) { el.classList.remove('enter'); void (el as HTMLElement).offsetWidth; el.classList.add('enter'); }

  // ---------- setup ----------

  private showSetup() {
    this.running = false;
    const s = this.setup;
    this.root.innerHTML = `
      <div class="ex ex-setup">
        <header class="lp-top">
          <button class="lp-back" data-act="exit">${icon('next', 16, 'flip')}<span>course</span></button>
          <div class="lp-title"><span class="lp-eyebrow">a timed passage, checked word by word</span><b>Mock typing exam <span class="bn">মডেল টেস্ট</span></b></div>
        </header>
        <div class="ex-grid">
          <section class="ex-card">
            <h2>${icon('globe', 18)}language</h2>
            <div class="group seg ex-seg" data-group="lang">
              <button data-lang="bangla" class="${s.lang === 'bangla' ? 'active' : ''}">বাংলা (বিজয়)</button>
              <button data-lang="english" class="${s.lang === 'english' ? 'active' : ''}">english</button>
            </div>
            <h2>${icon('clock', 18)}time</h2>
            <div class="group seg ex-seg" data-group="secs">${DURATIONS.map(d =>
              `<button data-secs="${d}" class="${s.secs === d ? 'active' : ''}">${d / 60} minutes</button>`).join('')}</div>
            <h2>${icon('target', 18)}target speed</h2>
            <div class="ex-posts ex-goals">${GOALS.map(([n, label]) => `
              <button class="ex-post ${s.goal === n ? 'active' : ''}" data-goal="${n}">
                <b>${n} <small>wpm net</small></b>
                <span>${label}</span>
              </button>`).join('')}</div>
          </section>
          <section class="ex-card ex-rules">
            <h2>${icon('info', 18)}how it works</h2>
            <ul>
              <li>${icon('passage', 16)}The passage is shown like a printed sheet. Type it into the answer box below it.</li>
              <li>${icon('backspace', 16)}Backspace is allowed, as in Word. Nothing is marked while you type.</li>
              <li>${icon('clock', 16)}The clock starts at your first key and stops at ${s.secs / 60} minutes. You can submit early.</li>
              <li>${icon('target', 16)}Net speed = gross speed minus wrong words per minute. A wrong, missing or extra word each counts as one mistake.</li>
              <li>${icon('keyboard', 16)}${s.lang === 'bangla' ? 'Type Bijoy with English keys, no Bijoy software needed.' : 'Capitals and punctuation must match the passage.'}</li>
            </ul>
            <button class="btn primary ex-start" data-act="start">${icon('play', 16)}start the exam</button>
          </section>
        </div>
      </div>`;
    this.enter(this.root.querySelector('.ex')!);
    this.wire();
  }

  private wire() {
    this.root.onclick = e => {
      const t = e.target as Element;
      const b = t.closest<HTMLElement>('button');
      if (!b) { if (this.running) this.input?.focus({ preventScroll: true }); return; }
      if (b.dataset.act) return this.action(b.dataset.act);
      if (b.dataset.lang) this.setup.lang = b.dataset.lang as Lang;
      else if (b.dataset.secs) this.setup.secs = Number(b.dataset.secs);
      else if (b.dataset.goal) this.setup.goal = Number(b.dataset.goal);
      else return;
      saveSetup(this.setup);
      this.showSetup();
    };
  }

  private action(act: string) {
    switch (act) {
      case 'exit': this.leave(); break;
      case 'start': this.countdown(); break;
      case 'submit': if (this.started && confirm('Submit now? The time you used so far is what counts.')) this.finish(); break;
      case 'again': this.countdown(); break;
      case 'setup': this.showSetup(); break;
    }
  }

  // ---------- the exam ----------

  private countdown() {
    saveSetup(this.setup);
    this.target = passageWords(this.setup.lang, this.setup.secs);
    this.words = [''];
    this.started = 0;
    this.ended = false;
    this.running = false;
    const bn = this.setup.lang === 'bangla';
    this.root.innerHTML = `
      <div class="ex ex-run">
        <header class="lp-top">
          <button class="lp-back" data-act="exit" title="Leave the exam (Esc)">${icon('x', 16)}<span>leave</span></button>
          <div class="lp-title"><span class="lp-eyebrow">target ${this.setup.goal} wpm net</span><b>Mock exam · ${bn ? 'বাংলা' : 'English'} · ${this.setup.secs / 60} minutes</b></div>
          <div class="ex-clock"><span>${icon('clock', 18)}</span><b>${mmss(this.setup.secs)}</b></div>
          <button class="btn ex-submit" data-act="submit" disabled>${icon('check', 15)}submit</button>
        </header>
        <section class="ex-paper ${bn ? 'bn' : ''}" aria-label="The passage to type"><span class="ex-paper-label">passage</span><p>${this.target.map(esc).join(' ')}</p></section>
        <section class="ex-answer-wrap" aria-label="Your answer">
          <span class="ex-paper-label">your answer</span>
          <div class="ex-answer ${bn ? 'bn' : ''}" tabindex="0"><span class="ex-placeholder">Start typing here. The clock starts with your first key.</span></div>
        </section>
        <input class="lp-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Type your answer" />
        <div class="ex-count" aria-hidden="true"><b>3</b></div>
      </div>`;
    this.answer = this.root.querySelector('.ex-answer')!;
    this.input = this.root.querySelector('.lp-input')!;
    this.input.addEventListener('input', this.onInput);
    this.wire();
    const count = this.root.querySelector<HTMLElement>('.ex-count')!;
    const go = () => { count.remove(); this.running = true; this.paint(); this.input.focus({ preventScroll: true }); };
    if (reduceMotion()) { go(); return; }
    let n = 3;
    const step = () => {
      if (!this.root.contains(count)) return;
      if (n === 0) { go(); return; }
      count.querySelector('b')!.textContent = String(n);
      this.enter(count.querySelector('b')!);
      n--;
      this.timers.push(window.setTimeout(step, 750));
    };
    step();
  }

  private paint() {
    const bn = this.setup.lang === 'bangla';
    const text = this.words.map(w => (bn ? bijoyToUnicode(w) : w));
    if (!this.started && text.join('') === '') {
      this.answer.innerHTML = '<span class="ex-placeholder">Start typing here. The clock starts with your first key.</span><span class="ex-caret"></span>';
      return;
    }
    this.answer.innerHTML = `${text.map(esc).join(' ')}<span class="ex-caret"></span>`;
    this.answer.scrollTop = this.answer.scrollHeight;
  }

  private keydown(e: KeyboardEvent) {
    if (!this.root.isConnected) return;
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.leave(); return; }
    if (!this.running || this.ended) {
      if (e.key === 'Enter' && !this.running && this.root.querySelector('.ex-setup')) { e.preventDefault(); e.stopImmediatePropagation(); this.countdown(); }
      return;
    }
    if (e.ctrlKey && e.key === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation(); this.backspace(true); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let k: string | null = null;
    if (e.key === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation(); this.backspace(false); return; }
    if (e.code === 'Space' || e.key === 'Enter') k = ' ';
    else if (this.setup.lang === 'bangla') k = usKey(e.code, e.shiftKey);
    else if (e.key.length === 1) k = e.key;
    if (!k) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    this.type(k);
  }

  private inputFallback() {
    const v = this.input.value;
    this.input.value = '';
    if (!this.running || this.ended) return;
    for (const ch of v) if (ch === ' ' || /[\x21-\x7e]/.test(ch) || this.setup.lang === 'english') this.type(ch);
  }

  private type(k: string) {
    if (!this.started) this.start();
    keySound(this.o.prefs, true);
    if (k === ' ') {
      if (this.words[this.words.length - 1] !== '') this.words.push('');
    } else {
      this.words[this.words.length - 1] += k;
    }
    this.paint();
  }

  private backspace(word: boolean) {
    if (!this.started) return;
    const last = this.words.length - 1;
    if (this.words[last] === '' && last > 0) { this.words.pop(); if (!word) { this.paint(); return; } }
    const i = this.words.length - 1;
    this.words[i] = word ? '' : this.words[i].slice(0, -1);
    this.paint();
  }

  private start() {
    this.started = performance.now();
    this.root.querySelector<HTMLButtonElement>('.ex-submit')!.disabled = false;
    const clock = this.root.querySelector<HTMLElement>('.ex-clock')!;
    this.ticker = window.setInterval(() => {
      const left = this.setup.secs - (performance.now() - this.started) / 1000;
      clock.querySelector('b')!.textContent = mmss(Math.max(0, Math.ceil(left)));
      clock.classList.toggle('warn', left <= 30);
      if (left <= 0) this.finish();
    }, 250);
  }

  // ---------- result ----------

  private finish() {
    if (this.ended) return;
    this.ended = true;
    this.running = false;
    clearInterval(this.ticker);
    const secs = Math.min(this.setup.secs, (performance.now() - this.started) / 1000);
    const bn = this.setup.lang === 'bangla';
    const keys = this.words.filter(w => w !== '');
    const typed = keys.map(w => (bn ? bijoyToUnicode(w) : w));
    const s = scoreExam(typed, keys.map(w => w.length), this.target, secs);
    const need = this.setup.goal;
    const pass = s.net >= need;
    const rec: ExamRec = {
      t: Date.now(), lang: this.setup.lang, secs: Math.round(secs), limit: this.setup.secs, gross: Math.round(s.gross * 10) / 10, net: Math.round(s.net * 10) / 10,
      acc: Math.round(s.acc * 10) / 10, words: s.typed, errors: s.errors, post: goalName(need), need, pass,
    };
    if (s.typed > 0) this.o.onDone(rec, s, this.setup);
    this.showResult(rec, s);
  }

  private showResult(rec: ExamRec, s: ExamScore) {
    const bn = this.setup.lang === 'bangla';
    const review = s.ops.map(o => {
      if (o.kind === 'ok') return `<span class="rv ok">${esc(o.target!)}</span>`;
      if (o.kind === 'sub') return `<span class="rv sub" title="you typed: ${esc(o.typed!)}"><del>${esc(o.typed!)}</del><ins>${esc(o.target!)}</ins></span>`;
      if (o.kind === 'miss') return `<span class="rv miss" title="left out">${esc(o.target!)}</span>`;
      return `<span class="rv extra" title="not in the passage">${esc(o.typed!)}</span>`;
    }).join(' ');
    this.root.innerHTML = `
      <div class="ex ex-result">
        <header class="lp-top">
          <button class="lp-back" data-act="exit">${icon('next', 16, 'flip')}<span>course</span></button>
          <div class="lp-title"><span class="lp-eyebrow">mock exam · ${bn ? 'বাংলা' : 'English'} · ${this.setup.secs / 60} minutes</span><b>Your result</b></div>
        </header>
        <section class="ex-verdict ${rec.pass ? 'pass' : 'fail'}">
          <span class="ex-verdict-mark">${icon(rec.pass ? 'check' : 'x', 34)}</span>
          <div><b>${rec.pass ? 'Target reached' : 'Not yet'}</b><p>${rec.pass ? `Your net speed reached your target of ${rec.need} wpm.` : `Your target is ${rec.need} wpm net. You are ${Math.max(0, Math.ceil(rec.need - rec.net))} wpm away.`}</p></div>
        </section>
        <section class="ex-stats">
          <div><span class="label">net speed</span><b>${Math.round(s.net)}</b><small>wpm</small></div>
          <div><span class="label">gross speed</span><b>${Math.round(s.gross)}</b><small>wpm</small></div>
          <div><span class="label">accuracy</span><b>${Math.round(s.acc)}%</b><small>of words</small></div>
          <div><span class="label">mistakes</span><b>${s.errors}</b><small>${s.subs} wrong · ${s.misses} missing · ${s.extras} extra</small></div>
          <div><span class="label">words typed</span><b>${s.typed}</b><small>in ${mmss(rec.secs)}</small></div>
        </section>
        <section class="ex-card ex-posts-result">
          <h2>${icon('target', 18)}speed targets</h2>
          <ul class="posts">${GOALS.map(([n, label]) => {
            const ok = s.net >= n;
            return `<li class="${ok ? 'pass' : 'fail'}"><span class="mark">${icon(ok ? 'check' : 'x', 14)}</span>${n} wpm net<span class="need">${label}</span></li>`;
          }).join('')}</ul>
        </section>
        <section class="ex-card">
          <h2>${icon('passage', 18)}word by word</h2>
          <div class="rv-legend"><span class="rv ok">right</span><span class="rv sub"><del>typed</del><ins>should be</ins></span><span class="rv miss">left out</span><span class="rv extra">extra</span></div>
          <p class="ex-review ${bn ? 'bn' : ''}">${review || '<em>Nothing was typed.</em>'}</p>
        </section>
        <div class="lp-result-actions">
          <button class="btn primary" data-act="again">${icon('restart', 15)}new passage</button>
          <button class="btn" data-act="setup">${icon('gear', 15)}change settings</button>
          <button class="btn" data-act="exit">${icon('lessons', 15)}course</button>
        </div>
      </div>`;
    this.enter(this.root.querySelector('.ex')!);
    this.wire();
  }
}
