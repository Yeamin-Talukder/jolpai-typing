// The Learn section: the course page, and the lesson player on top of it.
import type { Prefs } from '../prefs';
import type { CourseLesson } from './course';
import { renderLearnPage } from './page';
import { LessonPlayer } from './player';
import { loadLearn, resetLearn, saveLearn } from './progress';

export class Learn {
  private el: HTMLElement;
  private player: LessonPlayer | null = null;
  private prefs: Prefs;
  private onLeave: () => void;

  constructor(el: HTMLElement, prefs: Prefs, onLeave: () => void) {
    this.el = el;
    this.prefs = prefs;
    this.onLeave = onLeave;
  }

  /** Show the course page. */
  show() {
    this.player?.destroy();
    this.player = null;
    this.el.classList.remove('playing');
    const d = loadLearn();
    renderLearnPage(this.el, d, {
      start: l => this.start(l),
      openAll: on => { const x = loadLearn(); x.openAll = on; saveLearn(x); this.show(); },
      reset: () => { resetLearn(); this.show(); },
    });
    this.enter();
  }

  /** Start (or restart) a lesson. */
  start(l: CourseLesson) {
    this.player?.destroy();
    this.el.classList.add('playing');
    window.scrollTo({ top: 0 });
    this.player = new LessonPlayer(this.el, {
      lesson: l, data: loadLearn(), prefs: this.prefs,
      onExit: () => this.show(),
      onStart: next => this.start(next),
    });
    this.enter();
  }

  /** Esc on the course page leaves the Learn section. */
  escape(): boolean {
    if (this.player) return false; // the player handles its own Esc
    this.onLeave();
    return true;
  }

  hide() {
    this.player?.destroy();
    this.player = null;
  }

  private enter() {
    this.el.classList.remove('enter');
    void this.el.offsetWidth;
    this.el.classList.add('enter');
  }
}
