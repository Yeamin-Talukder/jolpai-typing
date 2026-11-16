// The guided lesson player: explanations with self-typing demos, meeting each
// new key, then drills and words with a finger guide. Wrong keys are not typed
// (you find the right one), which is how touch typing is learned.
import { usKey } from '../bijoy';
import { Keyboard } from '../keyboard';
import { icon, reduceMotion } from '../icons';
import { keySound } from '../sound';
import type { Prefs } from '../prefs';
import type { CourseLesson, Explainer } from './course';
import { BIJOY, trackOfLesson, type Track } from './tracks';
import { FINGER_NAME, fingerFor, handsSvg, needsShift, physicalKey, shiftFinger, showFinger, type Finger } from './fingers';
import { loadLearn, recordRun, threeStarWpm, type KeyRec, type Pending } from './progress';

type Step =
  | { kind: 'explain'; cards: Explainer[] }
  | { kind: 'meet'; key: string }
  | { kind: 'type'; name: 'drill' | 'words' | 'timed'; items: string[]; timed?: number };

interface Target { key: string; item: number; seg: number }

export interface PlayerOptions {
  lesson: CourseLesson;
  prefs: Prefs;
  onExit(): void;
  onStart(l: CourseLesson): void;
  /** A run was saved in this browser (so it can go to the account too). */
  onRecorded?(p: Pending): void;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const SIGN = /^[ঁ-ঃ়া-্ৗ]/;
const showChar = (s: string) => (SIGN.test(s) ? '◌' + s : s);
/** What a single Bijoy key types, for labels. */
export const keyText = (k: string) => BIJOY.keyText(k);
const keyName = (k: string) => (k === ' ' ? 'space' : physicalKey(k).toUpperCase());

const STEP_NAMES: Record<Step['kind'] | 'drill' | 'words' | 'timed' | 'result', string> = {
  explain: 'learn', meet: 'keys', type: 'type', drill: 'drill', words: 'words', timed: 'timed', result: 'result',
};

export class LessonPlayer {
  private root: HTMLElement;
  private o: PlayerOptions;
  private steps: Step[] = [];
  private si = 0;
  private body!: HTMLElement;
  private kb!: Keyboard;
  private hands!: Element;
  private input!: HTMLInputElement;
  private timers: number[] = [];
  private onKey = (e: KeyboardEvent) => this.keydown(e);
  private onInput = () => this.inputFallback();
  // typing state
  private targets: Target[] = [];
  private pos = 0;
  private stepStart = 0;
  private lastHit = 0;
  private typingSecs = 0;
  private correct = 0;
  private errors = 0;
  private keyStats: Record<string, KeyRec> = {};
  private meetCount = 0;
  private cardIndex = 0;
  private done = false;
  private ticker = 0;
  /** The course this lesson belongs to (Bijoy or English). */
  private t: Track;
  /** Class for text in the course's language. */
  private bnc: string;

  constructor(root: HTMLElement, o: PlayerOptions) {
    this.root = root;
    this.o = o;
    const l = o.lesson;
    this.t = trackOfLesson(l.id);
    this.bnc = this.t.bn ? 'bn' : 'en';
    if (l.intro?.length) this.steps.push({ kind: 'explain', cards: l.intro });
    for (const k of new Set(l.newKeys)) this.steps.push({ kind: 'meet', key: k });
    if (l.drill) this.steps.push({ kind: 'type', name: 'drill', items: this.t.drillItems(l) });
    if (l.timed) this.steps.push({ kind: 'type', name: 'timed', items: this.t.timedItems(l), timed: l.timed });
    else if (l.words) this.steps.push({ kind: 'type', name: 'words', items: this.t.wordItems(l) });
    this.render();
    document.addEventListener('keydown', this.onKey, true);
    this.go(0);
  }

  destroy() {
    document.removeEventListener('keydown', this.onKey, true);
    this.input?.removeEventListener('input', this.onInput);
    this.timers.forEach(t => clearTimeout(t));
    clearInterval(this.ticker);
  }

  private later(fn: () => void, ms: number) { this.timers.push(window.setTimeout(fn, ms)); }

  private render() {
    const l = this.o.lesson;
    const unit = this.t.units.find(u => u.n === l.unit);
    const n = this.t.lessons.indexOf(l) + 1;
    const pills = [...this.steps.map(s => (s.kind === 'type' ? s.name : s.kind)), 'result']
      .filter((s, i, a) => s !== 'meet' || a.indexOf('meet') === i)
      .map(s => `<span class="lp-pill" data-pill="${s}">${STEP_NAMES[s as keyof typeof STEP_NAMES]}</span>`).join('<i class="lp-pill-line"></i>');
    this.root.innerHTML = `
      <div class="lp">
        <header class="lp-top">
          <button class="lp-back" data-act="exit" title="Back to the course (Esc)">${icon('next', 16, 'flip')}<span>course</span></button>
          <div class="lp-title">
            <span class="lp-eyebrow">${unit ? `unit ${unit.n} · ${esc(unit.title)}` : 'practice'}${n > 0 ? ` · lesson ${n} of ${this.t.lessons.length}` : ''}</span>
            <b>${esc(l.title)}${this.t.bn ? ` <span class="bn">${esc(l.bn)}</span>` : ''}</b>
          </div>
          <nav class="lp-pills" aria-label="Lesson steps">${pills}</nav>
          <div class="lp-live" aria-live="off"><span data-live="acc"><b>100%</b> acc</span><span data-live="wpm"><b>0</b> wpm</span><span data-live="time" hidden><b>0</b> s</span></div>
        </header>
        <div class="lp-body"></div>
        <div class="lp-guide">
          <div class="keyboard lp-kb zones" aria-hidden="true"></div>
          <div class="lp-hands">${handsSvg()}</div>
        </div>
        <input class="lp-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Type here" />
      </div>`;
    this.body = this.root.querySelector('.lp-body')!;
    this.kb = new Keyboard(this.root.querySelector('.lp-kb')!);
    this.kb.render(this.t.id);
    this.paintZones();
    this.hands = this.root.querySelector('.hands')!;
    this.input = this.root.querySelector('.lp-input')!;
    this.input.addEventListener('input', this.onInput);
    this.root.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLElement>('[data-act]');
      if (b) this.action(b.dataset.act!);
      else if (!(e.target as Element).closest('button, a')) this.focusInput();
    });
  }

  /** Colour each key by the finger that presses it. */
  private paintZones() {
    const kbEl = this.root.querySelector('.lp-kb')!;
    kbEl.querySelectorAll<HTMLElement>('[data-k]').forEach(el => {
      const k = el.dataset.k!;
      let f: Finger;
      if (k === 'shift') f = el === kbEl.querySelector('.kb-key.shift') ? 'lp' : 'rp';
      else if (k === 'space') f = 'th';
      else if (k === 'tab' || k === 'caps') f = 'lp';
      else if (k === 'enter' || k === 'backspace') f = 'rp';
      else f = fingerFor(k);
      el.classList.add(`z-${f}`);
    });
  }

  private focusInput() { this.input.focus({ preventScroll: true }); }

  /** Light the key to press (and the right Shift), and the finger for it. */
  private guide(k: string | null) {
    const kbEl = this.root.querySelector('.lp-kb')!;
    kbEl.querySelectorAll('.next').forEach(el => el.classList.remove('next'));
    showFinger(this.hands, k);
    if (!k) return;
    const el = kbEl.querySelector(k === ' ' ? '[data-k="space"]' : `[data-k="${CSS.escape(physicalKey(k))}"]`);
    el?.classList.add('next');
    if (needsShift(k)) {
      const shifts = kbEl.querySelectorAll('.kb-key.shift');
      shifts[shiftFinger(k) === 'lp' ? 0 : 1]?.classList.add('next');
    }
  }

  private hintHtml(k: string): string {
    const f = FINGER_NAME[fingerFor(k)];
    if (k === ' ') return `Press <kbd>space</kbd> with your thumb`;
    const shift = needsShift(k) ? `Hold <kbd>${shiftFinger(k) === 'lp' ? 'left' : 'right'} Shift</kbd> (${FINGER_NAME[shiftFinger(k)]}), then ` : '';
    return `${shift}${shift ? 'press' : 'Press'} <kbd>${esc(keyName(k))}</kbd>${this.t.bn ? ` for <b class="bn">${esc(showChar(this.t.keyText(k)))}</b>` : ''} with your <b>${f}</b>`;
  }

  private setPill(kind: string) {
    let reached = true;
    this.root.querySelectorAll<HTMLElement>('.lp-pill').forEach(p => {
      const on = p.dataset.pill === kind;
      p.classList.toggle('on', on);
      p.classList.toggle('past', reached && !on);
      if (on) reached = false;
    });
  }

  // ---------- steps ----------

  private go(i: number) {
    this.si = i;
    clearInterval(this.ticker);
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    const s = this.steps[i];
    if (!s) return this.finish();
    this.root.querySelector('.lp')!.classList.toggle('no-guide', s.kind === 'explain');
    this.setPill(s.kind === 'type' ? s.name : s.kind);
    if (s.kind === 'explain') { this.cardIndex = 0; this.showCard(); }
    else if (s.kind === 'meet') this.showMeet(s.key);
    else this.showType(s);
    this.body.classList.remove('enter');
    void this.body.offsetWidth;
    this.body.classList.add('enter');
    this.focusInput();
  }

  private next() { this.go(this.si + 1); }

  private showCard() {
    const s = this.steps[this.si] as Extract<Step, { kind: 'explain' }>;
    const c = s.cards[this.cardIndex];
    const last = this.cardIndex === s.cards.length - 1;
    this.body.innerHTML = `
      <div class="lp-card">
        <div class="lp-card-n">${this.cardIndex + 1} / ${s.cards.length}</div>
        <h2>${esc(c.title)}</h2>
        <p>${esc(c.text)}</p>
        ${c.demo ? `<div class="demo" aria-label="Keys pressed one by one">
          <div class="demo-keys">${[...c.demo].map((k, i) => `<span class="demo-key" data-i="${i}"><b>${esc(keyName(k))}</b><i class="${this.bnc}">${esc(showChar(this.t.keyText(k)))}</i></span>`).join('<span class="demo-plus">+</span>')}</div>
          <div class="demo-arrow">${icon('next', 18)}</div>
          <div class="demo-out" aria-live="polite"></div>
          <button class="demo-replay" data-act="replay" title="Show again">${icon('restart', 14)}</button>
        </div>` : ''}
        <div class="lp-card-actions">
          ${this.cardIndex > 0 ? `<button class="btn" data-act="prev">${icon('next', 15, 'flip')}back</button>` : ''}
          <button class="btn primary" data-act="card-next">${last ? `${icon('keyboard', 15)}start practising` : `next${icon('next', 15)}`}</button>
        </div>
        <p class="lp-tip"><kbd>Enter</kbd> to continue</p>
      </div>`;
    if (c.demo) this.playDemo(c.demo);
    this.guide(null);
  }

  /** Press the demo keys one by one, building the Bangla text, then repeat. */
  private playDemo(keys: string) {
    const out = this.body.querySelector<HTMLElement>('.demo-out');
    const caps = [...this.body.querySelectorAll<HTMLElement>('.demo-key')];
    if (!out) return;
    const step = reduceMotion() ? 0 : 850;
    out.classList.toggle('bn', this.t.bn);
    if (!step) { out.textContent = this.t.render(keys); caps.forEach(c => c.classList.add('done')); return; }
    const run = (i: number) => {
      if (!this.body.contains(out)) return;
      if (i === 0) { caps.forEach(c => c.classList.remove('done', 'press')); out.textContent = ''; out.classList.remove('pop'); }
      if (i < keys.length) {
        const cap = caps[i];
        cap.classList.add('press');
        this.kb.press(keys[i], true);
        this.guide(keys[i]);
        this.later(() => { cap.classList.remove('press'); cap.classList.add('done'); }, 380);
        out.textContent = this.t.render(keys.slice(0, i + 1));
        out.classList.remove('pop'); void out.offsetWidth; out.classList.add('pop');
        this.later(() => run(i + 1), step);
      } else {
        this.guide(null);
        this.later(() => run(0), 1800);
      }
    };
    this.later(() => run(0), 400);
  }

  private showMeet(k: string) {
    this.meetCount = 0;
    const shift = needsShift(k);
    const f = FINGER_NAME[fingerFor(k)];
    this.body.innerHTML = `
      <div class="lp-meet">
        <div class="lp-meet-cap ${shift ? 'shifted' : ''}">
          ${shift ? `<span class="lp-meet-shift">${icon('trend', 14)}shift</span>` : ''}
          <span class="lp-meet-bn ${this.bnc}">${esc(showChar(this.t.keyText(k)))}</span>
          <span class="lp-meet-key">${esc(keyName(k))}</span>
        </div>
        <div class="lp-meet-text">
          <h2>New key: <span class="${this.bnc}">${esc(showChar(this.t.keyText(k)))}</span></h2>
          <p>${shift ? `Hold the <b>${shiftFinger(k) === 'lp' ? 'left' : 'right'} Shift</b> with your ${FINGER_NAME[shiftFinger(k)]}, then press <kbd>${esc(keyName(k))}</kbd>` : `Press <kbd>${esc(keyName(k))}</kbd>`} with your <b>${f}</b>. Keep the other fingers resting on the home row.</p>
          <div class="lp-meet-dots" aria-label="Press it three times">${[0, 1, 2].map(i => `<i data-dot="${i}"></i>`).join('')}</div>
          <p class="lp-meet-msg" aria-live="polite">Press it three times.</p>
        </div>
      </div>`;
    this.guide(k);
  }

  private showType(s: Extract<Step, { kind: 'type' }>) {
    // flatten the items into the keys to press, with a space between items
    this.targets = [];
    const segsOf = s.items.map(w => this.t.segments(w));
    segsOf.forEach((segs, item) => {
      segs.forEach((g, seg) => { for (const key of g.keys) this.targets.push({ key, item, seg }); });
      if (item < s.items.length - 1) this.targets.push({ key: ' ', item, seg: -1 });
    });
    this.pos = 0;
    this.stepStart = 0;
    this.lastHit = 0;
    const title = s.name === 'drill' ? 'Drill: the new keys' : s.name === 'timed' ? `Type for ${s.timed! >= 60 ? `${s.timed! / 60} minute${s.timed! > 60 ? 's' : ''}` : `${s.timed} seconds`}` : 'Real words';
    this.body.innerHTML = `
      <div class="lp-type">
        <div class="lp-type-head"><h2>${title}</h2><div class="lp-progress"><i></i></div></div>
        <div class="lp-line-wrap"><div class="lp-line ${this.bnc}">${segsOf.map((segs, i) =>
          `<span class="it" data-i="${i}">${segs.map((g, j) => `<span class="sg" data-s="${j}">${esc(g.text)}</span>`).join('')}</span>${i < segsOf.length - 1 ? '<span class="gap"></span>' : ''}`).join('')}</div></div>
        <div class="lp-strip" aria-live="polite"></div>
        <p class="lp-hint" aria-live="polite"></p>
        ${matchMedia('(pointer: coarse)').matches ? '<p class="lp-touch">Touch typing needs a real keyboard. On a phone, tap here and type with your keyboard set to English.</p>' : ''}
      </div>`;
    const live = this.root.querySelector<HTMLElement>('[data-live="time"]')!;
    live.hidden = !s.timed;
    if (s.timed) live.querySelector('b')!.textContent = String(s.timed);
    this.paintType();
  }

  /** Show progress through the items, the keys for the current letter, and the hint. */
  private paintType() {
    const s = this.steps[this.si] as Extract<Step, { kind: 'type' }>;
    const t = this.targets[this.pos];
    const line = this.body.querySelector<HTMLElement>('.lp-line');
    if (!line) return;
    line.querySelectorAll('.cur').forEach(el => el.classList.remove('cur'));
    // mark finished segments
    const prev = this.targets[this.pos - 1];
    if (prev && prev.seg >= 0 && (!t || t.item !== prev.item || t.seg !== prev.seg)) {
      line.querySelector(`.it[data-i="${prev.item}"] .sg[data-s="${prev.seg}"]`)?.classList.add('ok');
    }
    if (prev && (!t || t.item !== prev.item)) line.querySelector(`.it[data-i="${prev.item}"]`)?.classList.add('ok');
    const bar = this.body.querySelector<HTMLElement>('.lp-progress i');
    if (bar && !s.timed) bar.style.width = `${(this.pos / this.targets.length) * 100}%`;
    if (!t) return;
    const itemEl = line.querySelector<HTMLElement>(`.it[data-i="${t.item}"]`)!;
    if (t.seg >= 0) itemEl.querySelector(`.sg[data-s="${t.seg}"]`)?.classList.add('cur');
    else itemEl.nextElementSibling?.classList.add('cur');
    itemEl.classList.add('now');
    line.querySelectorAll('.it.now').forEach(el => { if (el !== itemEl) el.classList.remove('now'); });
    // keep the current word a third of the way in
    const wrap = line.parentElement!;
    const x = Math.min(0, wrap.clientWidth * 0.3 - itemEl.offsetLeft);
    line.style.transform = `translateX(${x}px)`;
    // the keys for this letter, in Bijoy order
    const strip = this.body.querySelector<HTMLElement>('.lp-strip')!;
    if (t.seg < 0) strip.innerHTML = `<span class="sk cur"><b>space</b><i>between words</i></span>`;
    else {
      const segKeys = this.targets.filter(x => x.item === t.item && x.seg === t.seg);
      const first = this.targets.indexOf(segKeys[0]);
      const segText = itemEl.querySelector(`.sg[data-s="${t.seg}"]`)?.textContent ?? '';
      strip.innerHTML = `<span class="sk-for"><span class="${this.bnc}">${esc(segText)}</span> =</span>` + segKeys.map((x, i) =>
        `<span class="sk ${first + i < this.pos ? 'done' : first + i === this.pos ? 'cur' : ''}">${needsShift(x.key) ? '<em>⇧</em>' : ''}<b>${esc(keyName(x.key))}</b>${this.t.bn ? `<i class="bn">${esc(showChar(this.t.keyText(x.key)))}</i>` : ''}</span>`).join('<span class="sk-plus">+</span>');
    }
    this.body.querySelector<HTMLElement>('.lp-hint')!.innerHTML = this.hintHtml(t.key);
    this.guide(t.key);
  }

  // ---------- input ----------

  private keydown(e: KeyboardEvent) {
    if (!this.root.isConnected) return;
    if (document.querySelector('dialog[open]')) return;
    const s = this.steps[this.si];
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.o.onExit(); return; }
    if (this.done) {
      if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); (this.root.querySelector('[data-act="next-lesson"], [data-act="retry"]') as HTMLElement | null)?.click(); }
      return;
    }
    if (s?.kind === 'explain') {
      if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); this.action('card-next'); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.code === 'Space' ? ' ' : usKey(e.code, e.shiftKey);
    if (!k) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    this.press(k);
  }

  /** Phones without key codes: the typed characters arrive here. */
  private inputFallback() {
    const v = this.input.value;
    this.input.value = '';
    for (const ch of v) if (ch === ' ' || /[\x21-\x7e]/.test(ch)) this.press(ch);
  }

  private stat(k: string): KeyRec { return (this.keyStats[this.t.statKey(k)] ??= { hit: 0, miss: 0, ms: 0 }); }

  private press(k: string) {
    const s = this.steps[this.si];
    if (!s || this.done) return;
    if (s.kind === 'meet') {
      const ok = k === s.key;
      this.kb.press(k, ok);
      keySound(this.o.prefs, ok);
      const msg = this.body.querySelector<HTMLElement>('.lp-meet-msg')!;
      if (!ok) {
        this.shake(this.body.querySelector('.lp-meet-cap'));
        msg.innerHTML = `That was <b class="${this.bnc}">${esc(showChar(this.t.keyText(k)))}</b>${this.t.bn ? ` (${esc(keyName(k))})` : ''}. ${this.hintHtml(s.key)}.`;
        return;
      }
      this.body.querySelector(`[data-dot="${this.meetCount}"]`)?.classList.add('on');
      this.meetCount++;
      const cap = this.body.querySelector('.lp-meet-cap');
      cap?.classList.remove('hit'); void (cap as HTMLElement | null)?.offsetWidth; cap?.classList.add('hit');
      msg.textContent = this.meetCount >= 3 ? 'Got it!' : ['Good. Twice more.', 'Once more.'][this.meetCount - 1];
      if (this.meetCount >= 3) this.later(() => this.next(), 450);
      return;
    }
    if (s.kind !== 'type') return;
    const t = this.targets[this.pos];
    if (!t) return;
    const now = performance.now();
    if (!this.stepStart) {
      this.stepStart = now;
      this.lastHit = now;
      if (s.timed) this.startTimer(s.timed);
    }
    const ok = k === t.key;
    this.kb.press(k, ok);
    keySound(this.o.prefs, ok);
    if (!ok) {
      this.errors++;
      this.stat(t.key).miss++;
      const cur = this.body.querySelector('.lp-line .cur');
      this.shake(cur);
      this.shake(this.body.querySelector('.lp-strip .sk.cur'));
      this.updateLive();
      return;
    }
    this.correct++;
    const st = this.stat(t.key);
    st.hit++;
    st.ms += Math.min(3000, now - this.lastHit);
    this.lastHit = now;
    this.pos++;
    this.updateLive();
    if (this.pos >= this.targets.length) { this.endStep(); return; }
    this.paintType();
  }

  private shake(el: Element | null) {
    if (!el) return;
    el.classList.remove('shake'); void (el as HTMLElement).offsetWidth; el.classList.add('shake');
  }

  private startTimer(secs: number) {
    const live = this.root.querySelector<HTMLElement>('[data-live="time"] b')!;
    const bar = this.body.querySelector<HTMLElement>('.lp-progress i');
    this.ticker = window.setInterval(() => {
      const el = (performance.now() - this.stepStart) / 1000;
      live.textContent = String(Math.max(0, Math.ceil(secs - el)));
      if (bar) bar.style.width = `${Math.min(100, (el / secs) * 100)}%`;
      if (el >= secs) this.endStep();
    }, 200);
  }

  private endStep() {
    clearInterval(this.ticker);
    const s = this.steps[this.si];
    if (s?.kind === 'type' && this.stepStart) {
      const el = (performance.now() - this.stepStart) / 1000;
      this.typingSecs += s.timed ? Math.min(el, s.timed) : el;
    }
    const line = this.body.querySelector('.lp-line');
    line?.querySelectorAll('.it').forEach(el => el.classList.add('ok'));
    this.guide(null);
    this.later(() => this.next(), 350);
  }

  private wpm() { return this.typingSecs > 0 ? (this.correct / 5) / (this.typingSecs / 60) : 0; }
  private acc() { return this.correct + this.errors ? (this.correct / (this.correct + this.errors)) * 100 : 100; }

  private updateLive() {
    const secs = this.typingSecs + (this.stepStart ? (performance.now() - this.stepStart) / 1000 : 0);
    const w = secs > 0 ? (this.correct / 5) / (secs / 60) : 0;
    this.root.querySelector('[data-live="acc"] b')!.textContent = `${Math.round(this.acc())}%`;
    this.root.querySelector('[data-live="wpm"] b')!.textContent = String(Math.round(w));
  }

  // ---------- result ----------

  private finish() {
    this.done = true;
    this.guide(null);
    this.setPill('result');
    this.root.querySelector('.lp')!.classList.add('no-guide', 'done');
    const l = this.o.lesson;
    const acc = this.acc(), wpm = this.wpm();
    // read progress fresh: the account may have updated it during the lesson
    const run = { lessonId: l.id, acc, wpm, secs: this.typingSecs, keys: this.keyStats };
    const { stars, improved } = recordRun(loadLearn(), run, l.goal);
    this.o.onRecorded?.({ run, goal: l.goal });
    const i = this.t.lessons.indexOf(l);
    const next = i >= 0 ? this.t.lessons[i + 1] : undefined;
    const missed = Object.entries(this.keyStats).filter(([, v]) => v.miss > 0).sort((a, b) => b[1].miss - a[1].miss).slice(0, 6)
      .map(([s, v]) => [this.t.fromStatKey(s) ?? s, v] as const);
    const msg = stars === 3 ? 'Perfect! Three stars.' : stars === 2 ? 'Great work!' : stars === 1 ? 'Lesson passed.' : 'Almost there';
    const sub = stars === 0
      ? 'You need 90% accuracy to pass. Slow down a little: accuracy first, speed comes by itself.'
      : stars < 3 ? `For ${stars === 1 ? 'two stars: 94% accuracy and ' + l.goal : 'three stars: 97% accuracy and ' + threeStarWpm(l.goal)} wpm.` : 'You have mastered this lesson.';
    this.body.innerHTML = `
      <div class="lp-result ${stars >= 2 ? 'win' : ''}">
        ${stars >= 2 && !reduceMotion() ? `<div class="confetti" aria-hidden="true">${Array.from({ length: 28 }, (_, n) => `<i style="--x:${(n * 37) % 100}%;--d:${(n % 7) * 0.08}s;--r:${(n * 53) % 360}deg;--c:${n % 4}"></i>`).join('')}</div>` : ''}
        <div class="lp-stars" aria-label="${stars} of 3 stars">${[0, 1, 2].map(n => `<span class="star ${n < stars ? 'on' : ''}" style="--n:${n}">${starSvg()}</span>`).join('')}</div>
        <h2>${msg}</h2>
        <p class="lp-result-sub">${sub}${improved && stars > 0 ? ' <span class="lp-new">new best</span>' : ''}</p>
        <div class="lp-result-stats">
          <div><span class="label">speed</span><b>${Math.round(wpm)}</b><small>wpm · goal ${l.goal}</small></div>
          <div><span class="label">accuracy</span><b>${Math.round(acc)}%</b><small>${this.errors} mistake${this.errors === 1 ? '' : 's'}</small></div>
          <div><span class="label">time</span><b>${Math.round(this.typingSecs)}</b><small>seconds typing</small></div>
        </div>
        ${missed.length ? `<div class="lp-missed"><span class="label">keys you missed</span>${missed.map(([k, v]) =>
          `<span class="chip"><b class="${this.bnc}">${esc(showChar(this.t.keyText(k)))}</b>${k === ' ' || !this.t.bn ? '' : `<i>${esc(keyName(k))}</i>`}<em>×${v.miss}</em></span>`).join('')}</div>` : ''}
        <div class="lp-result-actions">
          ${stars > 0 && next ? `<button class="btn primary" data-act="next-lesson">${icon('next', 15)}next: ${esc(next.title)}</button>` : ''}
          <button class="btn ${stars === 0 || !next ? 'primary' : ''}" data-act="retry">${icon('restart', 15)}try again</button>
          <button class="btn" data-act="exit">${icon('lessons', 15)}course</button>
        </div>
        <p class="lp-tip"><kbd>Enter</kbd> ${stars > 0 && next ? 'next lesson' : 'try again'} · <kbd>Esc</kbd> course</p>
      </div>`;
    this.body.classList.remove('enter'); void this.body.offsetWidth; this.body.classList.add('enter');
  }

  private action(act: string) {
    const s = this.steps[this.si];
    switch (act) {
      case 'exit': this.o.onExit(); break;
      case 'card-next':
        if (s?.kind !== 'explain') return;
        if (this.cardIndex < s.cards.length - 1) { this.cardIndex++; this.showCard(); this.body.classList.remove('enter'); void this.body.offsetWidth; this.body.classList.add('enter'); }
        else this.next();
        break;
      case 'prev':
        if (s?.kind === 'explain' && this.cardIndex > 0) { this.cardIndex--; this.showCard(); }
        break;
      case 'replay': {
        const c = (s as Extract<Step, { kind: 'explain' }>).cards[this.cardIndex];
        this.timers.forEach(t => clearTimeout(t)); this.timers = [];
        if (c.demo) this.playDemo(c.demo);
        break;
      }
      case 'retry': this.o.onStart(this.o.lesson); break;
      case 'next-lesson': {
        const i = this.t.lessons.indexOf(this.o.lesson);
        if (this.t.lessons[i + 1]) this.o.onStart(this.t.lessons[i + 1]);
        break;
      }
    }
  }
}

export function starSvg() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/></svg>';
}

