// Replay: plays a finished test back key by key, at the speed it was typed,
// filling in the words and pressing the keys on an on-screen keyboard.
import { Keyboard } from './keyboard';
import { icon, reduceMotion } from './icons';

/** One key press during the test, with the state it left behind. */
export interface KeyEvent {
  t: number;      // ms since the first key
  key: string;    // the key pressed: a character, ' ' or 'backspace'
  ok: boolean;    // whether it was the right key
  w: number;      // the word the key changed
  text: string;   // what was typed in that word afterwards
  cur: number;    // the word the typist was on afterwards
}

type WordHTML = (i: number, typed: string) => string;

export class Replay {
  private wordsEl: HTMLElement;
  private kb: Keyboard;
  private playBtn: HTMLButtonElement;
  private timeEl: HTMLElement;
  private barEl: HTMLElement;
  private events: KeyEvent[] = [];
  private count = 0;          // words in the test
  private html: WordHTML = () => '';
  private typed: string[] = [];
  private cur = 0;
  private next = 0;           // index of the next event to apply
  private clock = 0;          // replay time in ms
  private speed = 1;
  private playing = false;
  private frame = 0;
  private last = 0;

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="rp-head">
        <div class="label">${icon('repeat', 15)}replay</div>
        <div class="rp-controls">
          <button class="rp-play" aria-label="Play">${icon('play', 16)}</button>
          <button class="rp-restart" aria-label="Start again" title="Start again">${icon('restart', 15)}</button>
          <div class="group seg rp-speed" aria-label="Replay speed">
            <button data-speed="0.5">0.5×</button><button data-speed="1" class="active">1×</button><button data-speed="2">2×</button><button data-speed="4">4×</button>
          </div>
          <span class="rp-time">0.0s</span>
          <button class="rp-full" aria-label="Full screen" title="Full screen (Esc to leave)">${icon('maximize', 15)}</button>
        </div>
      </div>
      <div class="rp-bar"><div></div></div>
      <div class="rp-words"></div>
      <div class="keyboard rp-kb" aria-hidden="true"></div>`;
    this.wordsEl = root.querySelector('.rp-words')!;
    this.playBtn = root.querySelector('.rp-play')!;
    this.timeEl = root.querySelector('.rp-time')!;
    this.barEl = root.querySelector('.rp-bar div')!;
    this.kb = new Keyboard(root.querySelector('.rp-kb')!);
    document.addEventListener('fullscreenchange', () => {
      this.setFullIcon(root, document.fullscreenElement === root);
      requestAnimationFrame(() => this.mark()); // line height changed
    });
    root.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b) return;
      if (b.classList.contains('rp-play')) this.toggle();
      else if (b.classList.contains('rp-full')) this.fullscreen(root);
      else if (b.classList.contains('rp-restart')) { this.rewind(); this.play(); }
      else if (b.dataset.speed) {
        this.speed = Number(b.dataset.speed);
        root.querySelectorAll('.rp-speed button').forEach(x => x.classList.toggle('active', x === b));
      }
    });
  }

  /** Show the replay on the whole screen, or leave full screen. Where the
   *  browser does not allow full screen, it fills the window instead. */
  private fullscreen(root: HTMLElement) {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (root.classList.contains('expanded')) { this.expand(root, false); return; }
    let settled = false;
    const fallback = () => { if (!settled) { settled = true; this.expand(root, true); } };
    if (!root.requestFullscreen) { fallback(); return; }
    root.requestFullscreen().then(() => {
      if (settled) { root.classList.remove('expanded'); document.body.classList.remove('replay-expanded'); }
      settled = true;
      if (!this.playing) this.play();
    }).catch(fallback);
    // some embedded browsers never answer the request
    setTimeout(() => { if (document.fullscreenElement !== root) fallback(); }, 700);
  }

  private expand(root: HTMLElement, on: boolean) {
    root.classList.toggle('expanded', on);
    document.body.classList.toggle('replay-expanded', on);
    this.setFullIcon(root, on);
    if (on && !this.playing) this.play();
    requestAnimationFrame(() => this.mark());
  }

  private setFullIcon(root: HTMLElement, on: boolean) {
    const b = root.querySelector<HTMLElement>('.rp-full')!;
    b.innerHTML = icon(on ? 'minimize' : 'maximize', 15);
    b.setAttribute('aria-label', on ? 'Leave full screen' : 'Full screen');
  }

  /** Leave full screen or the expanded view, if either is on. Returns whether it did. */
  closeFull(): boolean {
    const root = this.wordsEl.parentElement!;
    if (root.classList.contains('expanded')) { this.expand(root, false); return true; }
    return false;
  }

  /** Load a finished test; nothing plays until play() is called. */
  load(events: KeyEvent[], count: number, lang: 'english' | 'bangla', html: WordHTML) {
    this.stop();
    this.events = events;
    this.count = count;
    this.html = html;
    this.kb.render(lang);
    this.wordsEl.classList.toggle('bn', lang === 'bangla');
    this.rewind();
  }

  get duration() { return this.events.length ? this.events[this.events.length - 1].t : 0; }

  private rewind() {
    this.typed = Array(this.count).fill('');
    this.cur = 0;
    this.next = 0;
    this.clock = 0;
    // only the words the typist reached, plus a few more for context
    const reached = this.events.reduce((m, e) => Math.max(m, e.cur, e.w), 0);
    const shown = Math.min(this.count, reached + 6);
    this.wordsEl.innerHTML = Array.from({ length: shown }, (_, i) => `<div class="word">${this.html(i, '')}</div>`).join('');
    this.wordsEl.scrollTop = 0;
    this.mark();
    this.show();
  }

  toggle() { if (this.playing) this.stop(); else this.play(); }

  play() {
    if (!this.events.length) return;
    if (this.next >= this.events.length) this.rewind();
    this.playing = true;
    this.playBtn.innerHTML = icon('pause', 16);
    this.playBtn.setAttribute('aria-label', 'Pause');
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.step);
  }

  stop() {
    this.playing = false;
    cancelAnimationFrame(this.frame);
    this.playBtn.innerHTML = icon('play', 16);
    this.playBtn.setAttribute('aria-label', 'Play');
  }

  private step = (now: number) => {
    if (!this.playing) return;
    this.clock += (now - this.last) * this.speed;
    this.last = now;
    const changed = new Set<number>();
    while (this.next < this.events.length && this.events[this.next].t <= this.clock) {
      const e = this.events[this.next++];
      this.typed[e.w] = e.text;
      changed.add(e.w);
      changed.add(this.cur);
      this.cur = e.cur;
      if (!reduceMotion() || this.speed <= 1) this.kb.press(e.key, e.ok);
    }
    if (changed.size) {
      for (const i of changed) {
        const el = this.wordsEl.children[i] as HTMLElement | undefined;
        if (el) el.innerHTML = this.html(i, this.typed[i]);
      }
      this.mark();
    }
    this.show();
    if (this.next >= this.events.length) { this.stop(); return; }
    this.frame = requestAnimationFrame(this.step);
  };

  /** Highlight the current word and keep its line in view. */
  private mark() {
    const kids = this.wordsEl.children;
    for (let i = 0; i < kids.length; i++) kids[i].classList.toggle('active', i === this.cur);
    const el = kids[Math.min(this.cur, kids.length - 1)] as HTMLElement | undefined;
    if (el) {
      const lineH = el.offsetHeight;
      const target = Math.max(0, el.offsetTop - lineH); // .rp-words is the offset parent
      if (Math.abs(this.wordsEl.scrollTop - target) > 2) this.wordsEl.scrollTo({ top: target, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
  }

  private show() {
    const total = this.duration || 1;
    const t = Math.min(this.clock, total);
    this.timeEl.textContent = `${(t / 1000).toFixed(1)}s / ${(total / 1000).toFixed(1)}s`;
    this.barEl.style.width = `${(t / total) * 100}%`;
  }
}
