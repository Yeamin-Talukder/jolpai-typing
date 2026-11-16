// The Learn section: the course page, with the lesson player and the mock
// exam on top of it.
import type { Prefs } from '../prefs';
import type { CourseLesson } from './course';
import { BIJOY, ENGLISH, TRACKS, trackOfLesson, type Track, type TrackId } from './tracks';
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
  onRoute(sub: { lesson?: string; exam?: boolean; track?: 'english' }): void;
}

const TRACK_KEY = 'jolpai-type:learn-track';

/** Everything the course page shows (not the queue of unsaved runs). */
const shownState = (d: LearnData) => JSON.stringify({ ...d, pending: undefined });

export class Learn {
  private el: HTMLElement;
  private h: LearnHooks;
  private player: LessonPlayer | null = null;
  private exam: MockExam | null = null;
  /** What the course page last showed, so a sync that changes nothing does not redraw it. */
  private drawn = '';
  /** The course on the page: the last one used in this browser, Bijoy at first. */
  private track: Track = (() => { try { return TRACKS[localStorage.getItem(TRACK_KEY) as TrackId] ?? BIJOY; } catch { return BIJOY; } })();

  /** The course shown on the course page. */
  get trackId(): TrackId { return this.track.id; }

  private setTrack(t: Track) {
    this.track = t;
    try { localStorage.setItem(TRACK_KEY, t.id); } catch { /* ignore */ }
  }

  constructor(el: HTMLElement, hooks: LearnHooks) {
    this.el = el;
    this.h = hooks;
  }

  private stop() {
    document.body.classList.remove('focus', 'learn-home');
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
      switchTrack: id => { this.setTrack(TRACKS[id]); this.show(); },
    }, this.track);
    document.body.classList.add('learn-home'); // the course page scrolls like a normal page
    if (!quiet) this.enter();
    if (!quiet) this.h.onRoute(this.track === ENGLISH ? { track: 'english' } : {});
  }

  /** Open what an address asks for: a lesson by id, the exam, or a course page. */
  open(sub: { lesson?: string; exam?: boolean; track?: 'english' }) {
    if (sub.lesson) {
      const t = trackOfLesson(sub.lesson);
      this.setTrack(t);
      const i = t.lessons.findIndex(x => x.id === sub.lesson);
      // a locked lesson (or an unknown one) shows its course page instead
      if (i >= 0 && isUnlocked(loadLearn(), i, t.lessons)) { this.start(t.lessons[i]); return; }
      this.show();
      return;
    }
    if (sub.exam) { this.startExam(); return; }
    this.setTrack(sub.track === 'english' ? ENGLISH : BIJOY);
    this.show();
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
    if (l.id !== 'weak' && l.id !== 'en-weak') this.setTrack(trackOfLesson(l.id));
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
