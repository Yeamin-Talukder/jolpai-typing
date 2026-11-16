// The Learn section: the course page, with the lesson player and the mock
// exam on top of it.
import type { Prefs } from '../prefs';
import { LESSONS, type CourseLesson } from './course';
import type { ExamScore } from './exam-score';
import { loadSetup, MockExam, type ExamSetup } from './exam';
import { renderLearnPage } from './page';
import { LessonPlayer } from './player';
import { applyExam, isUnlocked, loadLearn, saveLearn, type ExamRec, type LearnData, type Pending } from './progress';

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
  /** The course page, a lesson or the exam is now showing: keep the address in step. */
  onRoute(sub: { lesson?: string; exam?: boolean }): void;
}

/** Everything the course page shows (not the queue of unsaved runs). */
const shownState = (d: LearnData) => JSON.stringify({ ...d, pending: undefined });

export class Learn {
  private el: HTMLElement;
  private h: LearnHooks;
  private player: LessonPlayer | null = null;
  private exam: MockExam | null = null;
  /** What the course page last showed, so a sync that changes nothing does not redraw it. */
  private drawn = '';

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
  show(quiet = false) {
    this.stop();
    this.el.classList.remove('playing');
    const d = loadLearn();
    this.drawn = shownState(d);
    renderLearnPage(this.el, d, {
      start: l => this.start(l),
      exam: () => this.startExam(),
      signedIn: this.h.signedIn(),
      openAll: on => {
        // the page updates itself in place, so the switch can slide
        const d = loadLearn(); d.openAll = on; saveLearn(d);
        this.drawn = shownState(d);
        this.h.onProgress({ openAll: on });
      },
      reset: () => { this.h.onReset().catch(err => alert(`Could not reset the course in your account: ${(err as Error).message}`)).finally(() => this.show()); },
    });
    if (!quiet) this.enter();
    if (!quiet) this.h.onRoute({});
  }

  /** Open what an address asks for: a lesson by id, the exam, or the course page. */
  open(sub: { lesson?: string; exam?: boolean }) {
    const i = sub.lesson ? LESSONS.findIndex(x => x.id === sub.lesson) : -1;
    // a locked lesson (or an unknown one) shows the course page instead
    if (i >= 0 && isUnlocked(loadLearn(), i)) this.start(LESSONS[i]);
    else if (sub.exam) this.startExam();
    else this.show();
  }

  /** A mock exam is under way, so leaving would lose it. */
  busy() { return !!this.exam?.inProgress; }

  /** Redraw the course page after the account changed it (not during a lesson or exam). */
  refresh() {
    if (this.player || this.exam || !this.el.isConnected || this.el.hidden) return;
    if (shownState(loadLearn()) === this.drawn) return;
    this.show(true);
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
    this.h.onRoute({ lesson: l.id });
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
    this.h.onRoute({ exam: true });
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
