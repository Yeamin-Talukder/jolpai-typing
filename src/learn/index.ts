// The Learn section: the course page, with the lesson player and the mock
// exam on top of it.
import type { Prefs } from '../prefs';
import type { CourseLesson } from './course';
import type { ExamScore } from './exam-score';
import { loadSetup, MockExam, type ExamSetup } from './exam';
import { renderLearnPage } from './page';
import { LessonPlayer } from './player';
import { applyExam, loadLearn, saveLearn, type ExamRec, type Pending } from './progress';

export interface LearnHooks {
  prefs: Prefs;
  onLeave(): void;
  signedIn(): boolean;
  /** Something changed in this browser: save it to the account too. */
  onProgress(p: Pending): void;
  /** Start the course again everywhere. */
  onReset(): Promise<void>;
  /** A mock exam finished: add it to the test history. */
  onExamDone(rec: ExamRec, score: ExamScore, setup: ExamSetup): void;
}

export class Learn {
  private el: HTMLElement;
  private h: LearnHooks;
  private player: LessonPlayer | null = null;
  private exam: MockExam | null = null;

  constructor(el: HTMLElement, hooks: LearnHooks) {
    this.el = el;
    this.h = hooks;
  }

  private stop() {
    document.body.classList.remove('focus');
    this.player?.destroy();
    this.exam?.destroy();
    this.player = null;
    this.exam = null;
  }

  /** Show the course page. */
  show() {
    this.stop();
    this.el.classList.remove('playing');
    renderLearnPage(this.el, loadLearn(), {
      start: l => this.start(l),
      exam: () => this.startExam(),
      signedIn: this.h.signedIn(),
      openAll: on => {
        const d = loadLearn(); d.openAll = on; saveLearn(d);
        this.h.onProgress({ openAll: on });
        this.show();
      },
      reset: () => { this.h.onReset().catch(err => alert(`Could not reset the course in your account: ${(err as Error).message}`)).finally(() => this.show()); },
    });
    this.enter();
  }

  /** Redraw the course page after the account changed it (not during a lesson or exam). */
  refresh() {
    if (!this.player && !this.exam && this.el.isConnected && !this.el.hidden) this.show();
  }

  /** Start (or restart) a lesson. */
  start(l: CourseLesson) {
    this.stop();
    this.el.classList.add('playing');
    document.body.classList.add('focus'); // the lesson fills the screen
    window.scrollTo({ top: 0 });
    this.player = new LessonPlayer(this.el, {
      lesson: l, prefs: this.h.prefs,
      onExit: () => this.show(),
      onStart: next => this.start(next),
      onRecorded: p => this.h.onProgress(p),
    });
    this.enter();
  }

  startExam() {
    this.stop();
    this.el.classList.add('playing');
    document.body.classList.add('focus');
    window.scrollTo({ top: 0 });
    this.exam = new MockExam(this.el, {
      prefs: this.h.prefs, setup: loadSetup(),
      onExit: () => this.show(),
      onDone: (rec, score, setup) => {
        const d = loadLearn();
        applyExam(d, rec);
        saveLearn(d);
        this.h.onProgress({ exam: rec });
        this.h.onExamDone(rec, score, setup);
      },
    });
  }

  /** Esc on the course page leaves the Learn section. */
  escape(): boolean {
    if (this.player || this.exam) return false; // they handle their own Esc
    this.h.onLeave();
    return true;
  }

  hide() { this.stop(); }

  private enter() {
    this.el.classList.remove('enter');
    void this.el.offsetWidth;
    this.el.classList.add('enter');
  }
}
