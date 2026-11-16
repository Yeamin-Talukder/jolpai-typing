import './style.css';
import { randomWords } from './words';
import { BANGLA_PASSAGES, ENGLISH_PASSAGES } from './passages';
import { BANGLA_WORDS } from './words-bn';
import { bijoyToUnicode, unicodeToSegments, usKey } from './bijoy';
import { Keyboard } from './keyboard';
import { lessonItems, lessonsFor } from './lessons';
import { addEntry, clearHistory, loadHistory, newId, type Entry } from './history';
import { renderProfile, type ProfileView, type ResultFilter, type SharedData } from './profile';
import { FONT_PX, DEFAULT_PREFS, loadPrefs, savePrefs } from './prefs';
import { keySound, previewSound } from './sound';
import { ON_OFF, onOff, renderSettings, type Section } from './settings-page';
import { Replay, type KeyEvent } from './replay';
import { renderSpeedChart } from './chart';
import { addExtras } from './extras';
import { deviceKind, deviceOf, type Device } from './device';
import { askAmount, askText, customAmount, customText, setCustomAmount, typeableWords, TEXT_LIMITS, type AmountMode } from './custom';
import { accountsEnabled, clearAccountHistory, currentShareId, currentUser, initAccount, loadShared, onLearnChange, resetLearnEverywhere, saveLearnToAccount, saveToAccount, signIn, signOut, startSharing, stopSharing, type AccountUser } from './account';
import { SharePanel } from './share';
import { renderAbout } from './about';
import { Learn } from './learn';
import { renderProgressChart } from './progress-chart';
import { THEMES, applyTheme, currentTheme, renderThemePicker } from './themes';
import { countUp, fillIcons, icon, movePills, reduceMotion } from './icons';

fillIcons();

type Mode = 'time' | 'words' | 'passage' | 'lesson' | 'custom';
type Lang = 'english' | 'bangla';

const AMOUNTS: Record<'time' | 'words' | 'passage', number[]> = {
  time: [15, 30, 60, 120, 300, 600],
  words: [10, 25, 50, 100],
  passage: [60, 120, 300, 600],
};

/** Choices for the current mode. In lesson mode the amount is the lesson
 *  number; for custom text it is the time limit in seconds (0 = none). A
 *  custom time or word count joins the usual choices. */
function amountsFor(mode: Mode, lang: Lang): number[] {
  if (mode === 'lesson') return lessonsFor(lang).map((_, i) => i);
  if (mode === 'custom') return TEXT_LIMITS;
  const own = customAmount(mode);
  return own !== null && !AMOUNTS[mode].includes(own) ? [...AMOUNTS[mode], own].sort((a, b) => a - b) : AMOUNTS[mode];
}

/** How an amount is shown: 15, 2:30, 5m, 25 words, a lesson name. */
function fmtAmount(mode: Mode, n: number): string {
  if (mode === 'custom') return n ? `${n / 60}m` : 'no limit';
  if (mode === 'words') return String(n);
  if (mode === 'passage' || (n >= 300 && n % 60 === 0)) return `${n / 60}m`;
  if (n >= 120 && n % 60 !== 0) return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  return String(n);
}

const LESSON_LENGTH = 25;

const SETTINGS_KEY = 'jolpai-type:settings';

// showKeyboard replaced an older `keyboard` setting that was saved as on for
// everyone; the on-screen keyboard is now off until the typist turns it on.
interface Settings { lang: Lang; mode: Mode; amount: number; showKeyboard: boolean; punctuation: boolean; numbers: boolean }

function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '');
    const lang: Lang = s.lang === 'bangla' ? 'bangla' : 'english';
    if (['time', 'words', 'passage', 'lesson', 'custom'].includes(s.mode) && amountsFor(s.mode, lang).includes(s.amount)) {
      return { lang, mode: s.mode, amount: s.amount, showKeyboard: s.showKeyboard === true, punctuation: s.punctuation === true, numbers: s.numbers === true };
    }
  } catch { /* first visit or storage blocked */ }
  return { lang: 'english', mode: 'time', amount: 30, showKeyboard: false, punctuation: false, numbers: false };
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

const settings = loadSettings();
const prefs = loadPrefs();

// ---------- DOM ----------
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const wordsEl = $('words');
const wrapEl = $('words-wrap');
const caretEl = $('caret');
const inputEl = $<HTMLInputElement>('input');
const liveEl = $('live');
const testEl = $('test');
const resultEl = $('result');
const configEl = $('config');
const cornerEl = $('corner');
const amountsEl = $('amounts');
const hintEl = $('lang-hint');
const progressEl = $('progress-bar');
const keyboard = new Keyboard($('keyboard'));
const showKeyboard = () => settings.showKeyboard;
const liveWpmEl = $('ls-wpm'), liveAccEl = $('ls-acc'), liveBurstEl = $('ls-burst');

/** Apply the display preferences to the page. */
function applyPrefs() {
  wrapEl.style.setProperty('--fs', `${FONT_PX[prefs.fontSize]}px`);
  wrapEl.classList.toggle('blind', prefs.blind);
  caretEl.className = `caret ${prefs.caret}${prefs.smoothCaret ? ' smooth' : ''}`;
  document.body.classList.toggle('no-timer-bar', !prefs.timerBar);
  document.body.classList.toggle('smooth-caret', prefs.smoothCaret);
  liveWpmEl.hidden = !prefs.liveSpeed;
  liveAccEl.hidden = !prefs.liveAcc;
  liveBurstEl.hidden = !prefs.liveBurst;
}

// ---------- words ----------
// Every word is typed as a sequence of keys. For English the keys are the
// letters; for Bangla they are the Bijoy key presses. A segment is the piece
// of the word shown as one unit (a letter, or a Bangla syllable) and the
// range of keys that produce it.
interface Seg { text: string; start: number; end: number }
interface Word { text: string; keys: string; segs: Seg[] }

function makeWord(text: string): Word {
  if (settings.lang === 'english') {
    return { text, keys: text, segs: [...text].map((c, i) => ({ text: c, start: i, end: i + 1 })) };
  }
  let keys = '';
  const segs = unicodeToSegments(text).map(s => {
    const seg = { text: s.text, start: keys.length, end: keys.length + s.keys.length };
    keys += s.keys;
    return seg;
  });
  return { text: text.normalize('NFC'), keys, segs };
}

let lastPassage = -1;
function pickPassage(): Word[] {
  const list = settings.lang === 'bangla' ? BANGLA_PASSAGES : ENGLISH_PASSAGES;
  let i = Math.floor(Math.random() * list.length);
  if (i === lastPassage) i = (i + 1) % list.length;
  lastPassage = i;
  return list[i].split(/\s+/).map(makeWord);
}

/** Time and passage tests run against the clock. */
const timed = () => settings.mode === 'time' || settings.mode === 'passage' || (settings.mode === 'custom' && settings.amount > 0);

/** Time and words tests use random words (where punctuation and numbers apply). */
const randomWordsMode = () => settings.mode === 'time' || settings.mode === 'words';

function pickWords(n: number): Word[] {
  const plain = randomWords(n, settings.lang === 'bangla' ? BANGLA_WORDS : undefined);
  return addExtras(plain, settings.lang, settings).map(makeWord);
}

// ---------- state ----------
let words: Word[] = [];
let typed: string[] = [];
let current = 0;
let started = false;
let finished = false;
let startTime = 0;
let tick = 0;
let lineOffset = 0;
let finishedAt = 0;   // when the result appeared; keys right after it are ignored
let wordStart = 0;    // when the current word's first key was pressed, for burst speed
let lastBurst = 0;
let keyLog: KeyEvent[] = []; // every key of this test, for the replay

function logKey(key: string, ok: boolean, w: number) {
  keyLog.push({ t: Math.round(performance.now() - startTime), key, ok, w, text: typed[w], cur: current });
}

// per-keystroke accuracy
let keyCorrect = 0;
let keyTotal = 0;

// per-second history
interface Sample { wpm: number; raw: number; errors: number }
let samples: Sample[] = [];
let secKeys = 0;
let secErrors = 0;

function isCorrect(i: number) {
  const w = words[i], t = typed[i];
  if (t === w.keys) return true;
  // Bangla: another valid key order that produces the same text also counts
  return settings.lang === 'bangla' && t.length > 0 && bijoyToUnicode(t) === w.text;
}

// ---------- setup ----------
function renderConfig() {
  $('lang-name').textContent = settings.lang === 'bangla' ? 'বাংলা (বিজয়)' : 'english';
  $('lang-pick').title = settings.lang === 'bangla' ? 'Switch to English' : 'Switch to Bangla (Bijoy)';
  // punctuation and numbers apply to random words (time and words tests)
  const extrasEl = $('extras');
  extrasEl.hidden = !randomWordsMode();
  for (const k of ['punctuation', 'numbers'] as const) {
    const b = extrasEl.querySelector<HTMLButtonElement>(`[data-extra="${k}"]`)!;
    b.classList.toggle('active', settings[k]);
    b.setAttribute('aria-pressed', String(settings[k]));
  }
  configEl.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === settings.mode));
  amountsEl.innerHTML = '';
  const lessons = lessonsFor(settings.lang);
  for (const n of amountsFor(settings.mode, settings.lang)) {
    const b = document.createElement('button');
    if (settings.mode === 'lesson') {
      b.textContent = lessons[n].name;
      b.title = lessons[n].title;
    } else {
      b.textContent = fmtAmount(settings.mode, n);
      if (settings.mode === 'custom') b.title = n ? `Time limit: ${n / 60} minute${n > 60 ? 's' : ''}` : 'No time limit: type the whole text';
      if (settings.mode !== 'custom' && n === customAmount(settings.mode as AmountMode) && !AMOUNTS[settings.mode as AmountMode].includes(n)) {
        b.classList.add('own');
        b.title = 'Your custom choice';
      }
    }
    b.dataset.amount = String(n);
    b.classList.toggle('active', n === settings.amount);
    amountsEl.appendChild(b);
  }
  if (settings.mode !== 'lesson') {
    const c = document.createElement('button');
    c.className = 'amount-custom';
    if (settings.mode === 'custom') {
      c.dataset.editText = '1';
      c.innerHTML = `${icon('passage', 14)}edit text`;
      c.title = 'Change the text you practise';
    } else {
      c.dataset.custom = '1';
      c.innerHTML = `${icon('gear', 14)}custom`;
      c.title = settings.mode === 'words' ? 'Choose your own number of words' : 'Choose your own time';
    }
    amountsEl.appendChild(c);
  }
  const bn = settings.lang === 'bangla';
  wrapEl.classList.toggle('bn', bn);
  hintEl.hidden = !bn;
  const kb = cornerEl.querySelector<HTMLButtonElement>('[data-toggle="keyboard"]')!;
  kb.classList.toggle('active', showKeyboard());
  kb.setAttribute('aria-pressed', String(showKeyboard()));
  keyboard.render(settings.lang);
  $('keyboard').hidden = !showKeyboard();
  movePills(configEl);
}

// quick on/off buttons in the corner
cornerEl.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-toggle]');
  if (!b) return;
  settings.showKeyboard = !settings.showKeyboard;
  saveSettings();
  renderConfig();
  if (!finished) { updateCaret(); focusInput(); }
});

configEl.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.extra) {
    const k = b.dataset.extra as 'punctuation' | 'numbers';
    settings[k] = !settings[k];
  } else if (b.dataset.custom) {
    const mode = settings.mode as AmountMode;
    askAmount(mode, settings.amount).then(n => {
      if (n === null) return;
      setCustomAmount(mode, n);
      settings.amount = n;
      applyChoice();
    });
    return;
  } else if (b.dataset.editText) {
    askText(settings.lang, settings.amount).then(limit => {
      if (limit === null) return;
      settings.amount = limit;
      applyChoice();
    });
    return;
  } else if (b.dataset.mode) {
    const mode = b.dataset.mode as Mode;
    if (mode === 'custom' && !hasCustomText()) {
      // first time: ask for the text before switching
      askText(settings.lang, 0).then(limit => {
        if (limit === null) return;
        settings.mode = 'custom';
        settings.amount = limit;
        applyChoice();
      });
      return;
    }
    if (mode !== settings.mode) {
      settings.mode = mode;
      settings.amount = { time: 30, words: 25, passage: 60, lesson: 0, custom: 0 }[mode];
    }
  } else if (b.dataset.amount) {
    settings.amount = Number(b.dataset.amount);
  } else return;
  applyChoice();
});

/** Save a new choice and start a test with it (or note it on the result screen). */
function applyChoice() {
  saveSettings();
  renderConfig();
  // on the result screen a new choice waits for "next test", so a stray
  // click never throws the result away
  if (finished && !resultEl.hidden) { noteNext(); return; }
  reset();
}

const hasCustomText = (lang: Lang = settings.lang) => typeableWords(customText(lang), lang).words.length > 0;

// the language switch above the words
$('lang-pick').addEventListener('click', () => {
  settings.lang = settings.lang === 'bangla' ? 'english' : 'bangla';
  if (settings.mode === 'lesson') settings.amount = Math.min(settings.amount, lessonsFor(settings.lang).length - 1);
  if (settings.mode === 'custom' && !hasCustomText()) {
    // no text in this language yet: ask for some, or go back to a timed test
    askText(settings.lang, settings.amount).then(limit => {
      if (limit === null) { settings.mode = 'time'; settings.amount = 30; } else settings.amount = limit;
      applyChoice();
    });
    renderConfig();
    return;
  }
  saveSettings();
  renderConfig();
  reset();
});

/** Tell the typist the changed settings start with the next test. */
function noteNext() {
  const note = $('next-note');
  note.textContent = `next test: ${testLabel()} · ${settings.lang === 'bangla' ? 'বাংলা' : 'english'}`;
  note.hidden = false;
  enter(note);
}

/** Start a new test, or the same words again when `repeat` is set. */
function reset(repeat = false) {
  clearInterval(tick);
  if (repeat && words.length) {
    // keep the same words (a time test keeps the extra ones it added too)
  } else if (settings.mode === 'custom') {
    const own = typeableWords(customText(settings.lang), settings.lang).words;
    if (own.length) words = own.map(makeWord);
    else { settings.mode = 'time'; settings.amount = 30; saveSettings(); renderConfig(); words = pickWords(100); }
  } else if (settings.mode === 'lesson') {
    const lesson = lessonsFor(settings.lang)[settings.amount];
    words = lessonItems(lesson, settings.lang, LESSON_LENGTH).map(makeWord);
  } else {
    words = settings.mode === 'passage' ? pickPassage() : pickWords(settings.mode === 'words' ? settings.amount : 100);
  }
  typed = words.map(() => '');
  current = 0;
  started = finished = false;
  keyCorrect = keyTotal = 0;
  samples = [];
  secKeys = secErrors = 0;
  lineOffset = 0;
  wordStart = 0;
  lastBurst = 0;
  keyLog = [];
  replay.closeFull();
  replayEl.hidden = true;
  $('replay-btn').classList.remove('active');
  replay.stop();
  $('next-note').hidden = true;
  wordsEl.style.transform = 'translateY(0)';
  inputEl.value = '';
  document.body.classList.remove('typing');
  resultEl.hidden = true;
  testEl.hidden = false;
  configEl.classList.remove('faded');
  renderAllWords();
  updateLive();
  setProgress(0, false);
  enter(wrapEl);
  focusInput();
  requestAnimationFrame(updateCaret);
}

/** Replay an element's entrance animation. */
function enter(el: HTMLElement) {
  el.classList.remove('enter');
  void el.offsetWidth;
  el.classList.add('enter');
}

/** Fill the thin progress bar; timed tests glide over the next second. */
function setProgress(frac: number, glide: boolean) {
  progressEl.style.transition = glide && !reduceMotion() ? 'width 1s linear' : 'width .2s ease';
  progressEl.style.width = `${Math.min(100, frac * 100)}%`;
}

// ---------- rendering ----------
function wordHTML(i: number): string {
  return wordHTMLFor(words[i], typed[i]);
}

function wordHTMLFor(w: Word, t: string): string {
  let html = '';
  for (const s of w.segs) {
    let cls = '';
    if (t.length > s.start) {
      const got = t.slice(s.start, s.end);
      const want = w.keys.slice(s.start, s.end);
      if (got !== want.slice(0, got.length)) cls = 'bad';
      else cls = got.length === want.length ? 'ok' : 'part';
    }
    html += `<span class="l ${cls}">${esc(s.text)}</span>`;
  }
  if (t.length > w.keys.length) {
    const extra = t.slice(w.keys.length);
    const shown = settings.lang === 'bangla' ? bijoyToUnicode(extra) || extra : extra;
    html += `<span class="l extra">${esc(shown)}</span>`;
  }
  return html;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function renderAllWords() {
  wordsEl.innerHTML = words.map((_, i) => `<div class="word">${wordHTML(i)}</div>`).join('');
  markWords();
}

function renderWord(i: number) {
  const el = wordsEl.children[i] as HTMLElement | undefined;
  if (el) el.innerHTML = wordHTML(i);
  markWords();
}

function markWords() {
  for (let i = 0; i < words.length; i++) {
    const el = wordsEl.children[i] as HTMLElement;
    el.classList.toggle('active', i === current);
    el.classList.toggle('error', i < current && !isCorrect(i));
  }
}

/** What the typist should press next, for the keyboard hint. */
function nextKey(): string | null {
  const want = words[current]?.keys;
  if (want === undefined) return null;
  const t = typed[current];
  if (t !== want.slice(0, t.length)) return 'backspace';
  if (t.length < want.length) return want[t.length];
  return current === words.length - 1 ? null : 'space';
}

// The caret moves sideways with a transform and up or down with `top`, so
// each has its own timing: a steady glide from letter to letter, and a line
// change in step with the words scrolling up.
function placeCaret(x: number, y: number) {
  caretEl.style.transform = `translate3d(${x}px, 0, 0)`;
  caretEl.style.top = `${y}px`;
}

// solid while you type, blinking again once you pause
let caretIdle = 0;
function caretTyping() {
  caretEl.classList.remove('blink');
  clearTimeout(caretIdle);
  caretIdle = window.setTimeout(() => { if (!finished) caretEl.classList.add('blink'); }, 1000);
}

function updateCaret() {
  const wordEl = wordsEl.children[current] as HTMLElement | undefined;
  if (!wordEl) return;
  const w = words[current];
  const n = typed[current].length;
  // caret sits before the first segment that is not fully typed yet
  let idx = w.segs.findIndex(s => s.end > n);
  if (n > w.keys.length) idx = -1;
  const atEnd = idx === -1;
  const letters = wordEl.children;
  const letter = letters[atEnd ? letters.length - 1 : idx] as HTMLElement;
  // offsetParent of both word and letter is the positioned .words-wrap,
  // and layout offsets are not affected by the scroll transform
  const x = letter.offsetLeft + (atEnd ? letter.offsetWidth : 0);
  const h = letter.offsetHeight;
  // block and underline carets cover the next letter (or one letter's width at the end)
  const cw = atEnd ? Math.min(letter.offsetWidth, h * 0.6) : letter.offsetWidth;
  const lineH = parseFloat(getComputedStyle(wordEl).lineHeight) || h;

  // keep the active line as the second visible line (three lines shown)
  const top = wordEl.offsetTop;
  const desired = Math.max(0, top - lineH);
  if (Math.abs(desired - lineOffset) > 2) {
    lineOffset = desired;
    wordsEl.style.transform = `translateY(${-lineOffset}px)`;
  }
  const y = top - lineOffset + (lineH - h) / 2;

  if (prefs.caret === 'block') {
    caretEl.style.width = `${cw}px`;
    caretEl.style.height = `${h * 0.85}px`;
    placeCaret(x, y + h * 0.08);
  } else if (prefs.caret === 'underline') {
    caretEl.style.width = `${cw}px`;
    caretEl.style.height = '3px';
    placeCaret(x, y + h * 0.9);
  } else {
    caretEl.style.width = '';
    caretEl.style.height = `${h * 0.85}px`;
    placeCaret(x - 1, y + h * 0.08);
  }
  if (started) caretTyping(); else caretEl.classList.add('blink');
  if (showKeyboard()) keyboard.hint(nextKey());
}

// ---------- input ----------
function focusInput() {
  inputEl.focus({ preventScroll: true });
}

wrapEl.addEventListener('click', focusInput);
inputEl.addEventListener('focus', () => wrapEl.classList.remove('blurred'));
inputEl.addEventListener('blur', () => wrapEl.classList.add('blurred'));

let tabArmed = false;

document.addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]')) return; // the share panel handles its own keys
  if (e.key === 'Escape' && !themeMenu.hidden) { e.preventDefault(); openThemeMenu(false); if (view === 'test' && !finished) focusInput(); return; }
  if (e.key === 'Escape' && replay.closeFull()) { e.preventDefault(); return; } // leave the expanded replay first
  if (view === 'learn') { if (e.key === 'Escape') learn.escape(); return; } // lessons handle their own keys
  if (view !== 'test') { if (e.key === 'Escape') showView('test'); return; }
  // keys still flying when the test ends must not start a new one
  if (finished && performance.now() - finishedAt < 700) { if (e.key !== 'Escape') e.preventDefault(); return; }
  if (e.key === 'Tab') { e.preventDefault(); tabArmed = true; $('restart').focus(); return; }
  if (e.key === 'Enter' && tabArmed) { e.preventDefault(); tabArmed = false; reset(); return; }
  tabArmed = false;
  if (e.key === 'Escape') { e.preventDefault(); reset(); return; }
  if (finished) return;
  if (document.activeElement !== inputEl && e.key.length === 1 && !e.ctrlKey && !e.metaKey) focusInput();
});

inputEl.addEventListener('keydown', e => {
  if (finished) return;
  if (e.key === 'Backspace') {
    e.preventDefault();
    backspace(e.ctrlKey || e.altKey);
  } else if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    space();
  } else if (settings.lang === 'bangla' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    // Bijoy works on physical keys, whatever the system keyboard is set to
    const ch = usKey(e.code, e.shiftKey);
    if (ch) { e.preventDefault(); typeChar(ch); }
  }
});

inputEl.addEventListener('input', () => {
  const v = inputEl.value;
  inputEl.value = '';
  if (finished) return;
  for (const ch of v) {
    if (ch === ' ') space();
    // Bangla: real key presses are handled on keydown; this catches input
    // that arrives without them (some on-screen and remote keyboards)
    else if (settings.lang === 'english' || /[\x21-\x7e]/.test(ch)) typeChar(ch);
  }
});

function startIfNeeded() {
  if (started) return;
  started = true;
  startTime = performance.now();
  document.body.classList.add('typing');
  configEl.classList.add('faded');
  if (!themeMenu.hidden) openThemeMenu(false);
  tick = window.setInterval(onSecond, 1000);
  if (timed()) setProgress(1 / settings.amount, true);
}

function typeChar(ch: string) {
  startIfNeeded();
  const want = words[current].keys;
  const pos = typed[current].length;
  if (pos >= want.length + 20) return; // limit runaway extra keys
  const ok = pos < want.length && want[pos] === ch;
  keyTotal++; secKeys++;
  if (ok) keyCorrect++; else secErrors++;
  if (showKeyboard()) keyboard.flash(ch, ok);
  keySound(prefs, ok);
  if (!pos) wordStart = performance.now();
  updateLiveAcc();
  // stop on error (letter): a wrong key counts as a mistake but is not typed
  if (!ok && prefs.stopOnError === 'letter') { logKey(ch, false, current); shakeCaret(); return; }
  typed[current] += ch;
  logKey(ch, ok, current);
  renderWord(current);
  updateCaret();

  // words mode: finish as soon as the last word is typed correctly
  if (settings.mode !== 'time' && current === words.length - 1 && typed[current] === want) finish();
}

function space() {
  if (!typed[current].length) return; // ignore leading spaces
  startIfNeeded();
  const ok = isCorrect(current);
  keyTotal++; secKeys++;
  if (ok) keyCorrect++; else secErrors++;
  if (showKeyboard()) keyboard.flash(' ', ok);
  keySound(prefs, ok);
  updateLiveAcc();
  // stop on error (word): the word has to be right before moving on
  if (!ok && prefs.stopOnError === 'word') { logKey(' ', false, current); shakeCaret(); return; }
  if (wordStart) {
    lastBurst = wpmFrom(typed[current].length + 1, (performance.now() - wordStart) / 1000);
    liveBurstEl.querySelector('b')!.textContent = String(Math.round(lastBurst));
  }
  if (current === words.length - 1) { logKey(' ', ok, current); finish(); return; }
  current++;
  logKey(' ', ok, current - 1);
  if (settings.mode === 'time' && words.length - current < 40) appendWords(50);
  markWords();
  updateCaret();
  updateLive();
}

function backspace(wholeWord: boolean) {
  if (prefs.confidence === 'max') { shakeCaret(); return; } // no corrections at all
  if (!typed[current].length) {
    // step back only into a previous word that has a mistake
    // (confidence mode keeps finished words finished)
    if (current > 0 && !isCorrect(current - 1) && prefs.confidence === 'off') {
      current--;
      if (wholeWord) typed[current] = '';
      logKey('backspace', true, current);
      renderWord(current);
      updateCaret();
      updateLive();
    }
    return;
  }
  typed[current] = wholeWord ? '' : typed[current].slice(0, -1);
  if (started) logKey('backspace', true, current);
  renderWord(current);
  updateCaret();
}

/** A small shake to show a key was refused. */
function shakeCaret() {
  caretEl.classList.remove('refused');
  void caretEl.offsetWidth;
  caretEl.classList.add('refused');
}

function appendWords(n: number) {
  for (const w of pickWords(n)) {
    words.push(w);
    typed.push('');
    const div = document.createElement('div');
    div.className = 'word';
    div.innerHTML = wordHTML(words.length - 1);
    wordsEl.appendChild(div);
  }
}

// ---------- stats ----------
// Speed is counted in keystrokes: 5 keystrokes = 1 word, for both languages.
function elapsedSec() {
  return started ? (performance.now() - startTime) / 1000 : 0;
}

interface Counts { correctWordChars: number; allChars: number; correct: number; incorrect: number; extra: number; missed: number }

function counts(includeCurrent: boolean): Counts {
  const c: Counts = { correctWordChars: 0, allChars: 0, correct: 0, incorrect: 0, extra: 0, missed: 0 };
  const last = includeCurrent ? current : current - 1;
  for (let i = 0; i <= last && i < words.length; i++) {
    const w = words[i].keys, t = typed[i];
    const done = i < current;
    if (isCorrect(i)) {
      c.correct += w.length;
    } else {
      for (let j = 0; j < Math.max(w.length, t.length); j++) {
        if (j >= w.length) c.extra++;
        else if (j >= t.length) { if (done) c.missed++; }
        else if (t[j] === w[j]) c.correct++;
        else c.incorrect++;
      }
    }
    c.allChars += t.length + (done ? 1 : 0);
    if (isCorrect(i)) c.correctWordChars += w.length + (done ? 1 : 0);
  }
  return c;
}

function wpmFrom(chars: number, sec: number) {
  return sec > 0 ? (chars / 5) / (sec / 60) : 0;
}

function onSecond() {
  const sec = elapsedSec();
  const c = counts(true);
  samples.push({ wpm: wpmFrom(c.correctWordChars, sec), raw: wpmFrom(secKeys, 1), errors: secErrors });
  secKeys = secErrors = 0;
  if (timed() && sec >= settings.amount - 0.05) finish();
  else {
    updateLive();
    liveWpmEl.querySelector('b')!.textContent = String(Math.round(wpmFrom(c.correctWordChars, sec)));
    if (timed()) setProgress((Math.round(sec) + 1) / settings.amount, true);
  }
}

function updateLiveAcc() {
  liveAccEl.querySelector('b')!.textContent = `${keyTotal ? Math.round((keyCorrect / keyTotal) * 100) : 100}%`;
}

function updateLive() {
  if (!started) {
    liveWpmEl.querySelector('b')!.textContent = '0';
    liveAccEl.querySelector('b')!.textContent = '100%';
    liveBurstEl.querySelector('b')!.textContent = '0';
  }
  if (timed()) {
    const left = started ? Math.max(0, Math.round(settings.amount - elapsedSec())) : settings.amount;
    liveEl.textContent = settings.amount >= 120 && left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : String(left);
    liveEl.classList.toggle('warn', started && left <= 5);
  } else {
    liveEl.textContent = `${current}/${words.length}`;
    liveEl.classList.remove('warn');
    setProgress(current / words.length, false);
  }
}

function finish() {
  if (finished) return;
  finished = true;
  finishedAt = performance.now();
  clearInterval(tick);
  const sec = timed() ? Math.min(elapsedSec(), settings.amount) : elapsedSec();
  if (secKeys > 0 && sec - samples.length > 0.2) {
    samples.push({ wpm: 0, raw: wpmFrom(secKeys, sec - samples.length), errors: secErrors });
  }
  const lastDone = settings.mode !== 'time' && current === words.length - 1;
  current = Math.min(current + 1, words.length); // count the word in progress
  const c = counts(false);
  if (lastDone) c.correctWordChars = Math.max(0, c.correctWordChars - 1); // no space after the last word
  const wpm = wpmFrom(c.correctWordChars, sec);
  const raw = wpmFrom(c.allChars, sec);
  const acc = keyTotal ? (keyCorrect / keyTotal) * 100 : 0;
  if (samples.length) samples[samples.length - 1].wpm = wpm;
  lastWpm = wpm;
  showResult({ wpm, raw, acc, sec, c });
  const testWords = words;
  replay.load(keyLog, testWords.length, settings.lang, (i, t) => wordHTMLFor(testWords[i], t));

  // net speed: gross minus wrong words per minute
  let attempted = 0, wrong = 0;
  for (let i = 0; i < current; i++) {
    if (!typed[i]) continue;
    attempted++;
    if (!isCorrect(i)) wrong++;
  }
  const net = sec > 0 ? Math.max(0, raw - wrong / (sec / 60)) : 0;

  // save it, unless it was too short to mean anything
  const pb = $('r-pb');
  pb.hidden = true;
  if (sec >= 5 && c.correct > 0) {
    const entry: Entry = {
      id: newId(), t: Date.now(), lang: settings.lang, mode: settings.mode, amount: settings.amount, label: testLabel(),
      wpm: round1(wpm), net: round1(net), raw: round1(raw), acc: round1(acc), sec: round1(sec),
      chars: [c.correct, c.incorrect, c.extra, timed() ? 0 : c.missed],
      cons: round1(consistency(samples.map(x => x.raw))),
      words: attempted, wrong,
      hw: samples.map(x => Math.round(x.wpm)), hr: samples.map(x => Math.round(x.raw)), he: samples.map(x => x.errors),
      dev: deviceKind(),
    };
    const { previousBest } = addEntry(entry);
    saveToAccount(entry);
    if (previousBest !== null && Math.round(wpm) > Math.round(previousBest)) {
      $('r-pb-text').textContent = `new personal best · was ${Math.round(previousBest)}`;
      pb.hidden = false;
    }
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function testLabel() {
  if (settings.mode === 'custom') {
    const n = typeableWords(customText(settings.lang), settings.lang).words.length;
    return `custom ${n} words${settings.amount ? ` ${settings.amount / 60}m` : ''}`;
  }
  const amount = settings.mode === 'lesson' ? lessonsFor(settings.lang)[settings.amount].name : fmtAmount(settings.mode, settings.amount);
  const extras = randomWordsMode() ? `${settings.punctuation ? ' punctuation' : ''}${settings.numbers ? ' numbers' : ''}` : '';
  return `${settings.mode} ${amount}${extras}`;
}

let lastWpm = 0; // the last result's speed, for the chart's average line

function consistency(values: number[]) {
  if (values.length < 2) return 100;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  return Math.max(0, Math.min(100, 100 * (1 - sd / mean)));
}

function showResult(r: { wpm: number; raw: number; acc: number; sec: number; c: Counts }) {
  testEl.hidden = true;
  resultEl.hidden = false;
  document.body.classList.remove('typing');
  configEl.classList.remove('faded');
  countUp($('r-wpm'), r.wpm);
  countUp($('r-acc'), r.acc, '%');
  countUp($('r-raw'), r.raw);
  $('r-chars').textContent = `${r.c.correct}/${r.c.incorrect}/${r.c.extra}/${timed() ? 0 : r.c.missed}`;
  countUp($('r-cons'), consistency(samples.map(s => s.raw)), '%');
  $('r-time').textContent = `${Math.round(r.sec)}s`;
  $('r-type').innerHTML = `${testLabel()}<br>${settings.lang === 'bangla' ? 'বাংলা (বিজয়)' : 'english'}`;
  enter(resultEl);
  drawChart(true);
  // focus the result itself, not a button, so a stray Space or Enter does nothing
  resultEl.focus({ preventScroll: true });
}

function drawChart(animate = false) {
  renderSpeedChart($('chart-wrap'), {
    wpm: samples.map(s => s.wpm), raw: samples.map(s => s.raw), err: samples.map(s => s.errors), avg: lastWpm,
  }, 'result', animate);
}

// ---------- pages: test, profile, settings ----------
type View = 'test' | 'profile' | 'settings' | 'shared' | 'about' | 'learn';
let view: View = 'test';
const profileEl = $('history');
const settingsEl = $('settings');
const aboutEl = $('about');
const learnEl = $('learn');
const profileView: ProfileView = { lang: settings.lang, filter: 'all', shown: 25, open: null, dev: deviceKind() };

/** Open the profile on this device's results, or the other device's if this one has none. */
function pickDevice(list: Entry[], prefer: Device): Device {
  const other: Device = prefer === 'mobile' ? 'desktop' : 'mobile';
  return list.some(e => deviceOf(e) === prefer) || !list.some(e => deviceOf(e) === other) ? prefer : other;
}
let sharedData: SharedData | null = null; // someone's shared profile, when viewing one

function profileUser() {
  const u = currentUser();
  return u ? { name: u.name, email: u.email, photo: u.photo, joined: u.joined } : null;
}

function drawProfile(animateChart = false) {
  const list = view === 'shared' && sharedData
    ? renderProfile(profileEl, profileView, null, { shared: sharedData })
    : renderProfile(profileEl, profileView, profileUser(), { sharing: !!currentShareId() });
  movePills(profileEl);
  revealProfile(animateChart);
  const pg = profileEl.querySelector<HTMLElement>('.pg-wrap');
  if (pg) renderProgressChart(pg, list, id => openResult(list, id), animateChart);
  // the activity calendar scrolls sideways on small screens: show the latest weeks
  profileEl.querySelectorAll<HTMLElement>('.p-act-scroll').forEach(el => { el.scrollLeft = el.scrollWidth; });
  const results = view === 'shared' && sharedData ? sharedData.results : loadHistory();
  // draw the opened result's graph at its real size, so the text stays sharp
  profileEl.querySelectorAll<HTMLElement>('.d-chart-wrap').forEach(box => {
    const e = results.find(x => x.id === box.dataset.id);
    if (e?.hw) renderSpeedChart(box, { wpm: e.hw, raw: e.hr ?? [], err: e.he ?? [], avg: e.wpm }, `d-${e.id.replace(/[^a-z0-9]/gi, '')}`, true);
  });
}

/** On a fresh visit, parts of the profile slide in as they scroll into view and their numbers count up. */
let profileIO: IntersectionObserver | null = null;
function revealProfile(fresh: boolean) {
  profileIO?.disconnect();
  profileEl.classList.toggle('reveal', fresh && !reduceMotion());
  if (!fresh || reduceMotion()) return;
  let seen = false;
  const parts = [...profileEl.querySelectorAll<HTMLElement>('[data-pr]')];
  // a hidden or background page gets no visibility checks: never leave the profile invisible
  window.setTimeout(() => { if (!seen) parts.forEach(p => p.classList.add('in')); }, 1500);
  profileIO = new IntersectionObserver(entries => {
    seen = true;
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const part = en.target as HTMLElement;
      part.classList.add('in');
      part.querySelectorAll<HTMLElement>('[data-count]').forEach(n => countUp(n, Number(n.dataset.count), n.dataset.suffix || '', 800));
      profileIO?.unobserve(part);
    }
  }, { threshold: 0.12 });
  profileEl.querySelectorAll('[data-pr]').forEach(part => profileIO!.observe(part));
}

/** Open a result from the progress chart: show enough rows to include it, then open it. */
function openResult(list: Entry[], id: string) {
  const fromNewest = list.length - 1 - list.findIndex(e => e.id === id);
  if (fromNewest >= profileView.shown) profileView.shown = Math.ceil((fromNewest + 1) / 25) * 25;
  profileView.open = null;
  toggleResult(id);
}

/** Open or close a result's details. */
function toggleResult(id: string) {
  profileView.open = profileView.open === id ? null : id;
  drawProfile();
  const row = profileEl.querySelector<HTMLElement>(`.h-row[data-id="${CSS.escape(id)}"]`);
  row?.focus({ preventScroll: true });
  if (profileView.open) profileEl.querySelector('.h-detail')?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
}

/** The page's own title from index.html, put back after a shared profile. */
const PAGE_TITLE = document.title;

function showView(v: View) {
  // leaving a shared profile: drop ?p= from the address
  if (view === 'shared' && v !== 'shared') {
    history.replaceState(null, '', location.pathname);
    document.title = PAGE_TITLE;
    sharedData = null;
  }
  view = v;
  document.body.dataset.view = v;
  profileEl.hidden = v !== 'profile' && v !== 'shared';
  settingsEl.hidden = v !== 'settings';
  aboutEl.hidden = v !== 'about';
  learnEl.hidden = v !== 'learn';
  $('nav-learn').classList.toggle('active', v === 'learn');
  if (v !== 'learn') learn.hide();
  $('nav-about').classList.toggle('active', v === 'about');
  configEl.hidden = v !== 'test';
  cornerEl.querySelectorAll<HTMLElement>('[data-toggle]').forEach(b => { b.hidden = v !== 'test'; });
  $('nav-test').classList.toggle('active', v === 'test');
  $('nav-history').classList.toggle('active', v === 'profile');
  $('nav-settings').classList.toggle('active', v === 'settings');
  if (v === 'test') { reset(); return; }
  clearInterval(tick);
  replay.stop();
  testEl.hidden = true;
  resultEl.hidden = true;
  document.body.classList.remove('typing');
  window.scrollTo({ top: 0 });
  if (v === 'shared') return; // openShared() draws it once loaded
  if (v === 'about') { renderAbout(aboutEl, to => showView(to)); enter(aboutEl); return; }
  if (v === 'learn') { learn.show(); return; }
  if (v === 'profile') {
    profileView.lang = settings.lang;
    profileView.shown = 25;
    profileView.open = null;
    profileView.dev = pickDevice(loadHistory(), deviceKind());
    drawProfile(true);
    enter(profileEl);
  } else {
    refreshSettings();
    enter(settingsEl);
    movePills(settingsEl);
  }
}

/** Show someone's shared profile, from a ?p= link. */
async function openShared(id: string) {
  showView('shared');
  profileEl.innerHTML = `<div class="h-empty-box">${icon('user', 32)}<p class="h-empty">Loading the profile…</p></div>`;
  let data: SharedData | null = null;
  try { data = await loadShared(id); } catch (err) { console.warn('Could not load the shared profile', err); }
  if (view !== 'shared') return; // the visitor moved on while it loaded
  if (!data) {
    profileEl.innerHTML = `<div class="h-empty-box">${icon('user', 32)}<p class="h-empty">This profile is not shared any more, or the link is wrong.</p>
      <button id="p-start" class="btn primary">${icon('keyboard', 15)}start typing</button></div>`;
    return;
  }
  sharedData = data;
  document.title = `${data.name} · Jolpai Typing`;
  // open on the language they type most
  const bn = data.results.filter(e => e.lang === 'bangla').length;
  profileView.lang = bn * 2 >= data.results.length && bn > 0 ? 'bangla' : 'english';
  profileView.filter = 'all';
  profileView.shown = 25;
  profileView.open = null;
  const phone = data.results.filter(e => deviceOf(e) === 'mobile').length;
  profileView.dev = phone * 2 > data.results.length ? 'mobile' : 'desktop'; // where they type most
  drawProfile(true);
  enter(profileEl);
}

const sharePanel = new SharePanel({
  signedIn: () => !!currentUser(),
  shareId: currentShareId,
  name: () => currentUser()?.name || 'my',
  start: startSharing,
  stop: stopSharing,
  signIn: () => { signIn().catch(err => alert(`Sign-in failed: ${(err as Error).message}`)); },
}, () => { if (view === 'profile') drawProfile(); });

$('nav-history').addEventListener('click', () => showView(view === 'profile' ? 'test' : 'profile'));
$('nav-settings').addEventListener('click', () => showView(view === 'settings' ? 'test' : 'settings'));
$('nav-about').addEventListener('click', () => showView(view === 'about' ? 'test' : 'about'));
$('nav-learn').addEventListener('click', () => showView('learn'));
const learn = new Learn(learnEl, {
  prefs,
  onLeave: () => showView('test'),
  signedIn: () => !!currentUser(),
  onProgress: p => saveLearnToAccount(p),
  onReset: () => resetLearnEverywhere(),
  onExamDone: (rec, s, setup) => {
    // a mock exam is a passage test too: it joins the history and the profile
    const entry: Entry = {
      id: newId(), t: rec.t, lang: rec.lang, mode: 'passage', amount: setup.secs, label: `exam ${setup.secs / 60}m`,
      wpm: round1(s.wpm), net: round1(s.net), raw: round1(s.gross), acc: round1(s.acc), sec: rec.secs,
      words: s.typed, wrong: s.errors, dev: deviceKind(),
    };
    addEntry(entry);
    saveToAccount(entry);
  },
});
onLearnChange(() => learn.refresh());
$('nav-test').addEventListener('click', () => showView('test'));
$('nav-test').classList.add('active');
profileEl.addEventListener('keydown', e => {
  const row = (e.target as HTMLElement).closest<HTMLElement>('.h-row');
  if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleResult(row.dataset.id!); }
});
profileEl.addEventListener('click', e => {
  const row = (e.target as HTMLElement).closest<HTMLElement>('.h-row');
  if (row) { toggleResult(row.dataset.id!); return; }
  const b = (e.target as HTMLElement).closest('button');
  if (!b) return;
  if (b.dataset.dev) {
    profileView.dev = b.dataset.dev as Device;
    profileView.shown = 25;
    profileView.open = null;
    drawProfile(true);
  } else if (b.dataset.hlang) {
    profileView.lang = b.dataset.hlang as Lang;
    drawProfile();
  } else if (b.dataset.filter) {
    profileView.filter = b.dataset.filter as ResultFilter;
    profileView.shown = 25;
    drawProfile();
  } else if (b.id === 'h-more') {
    profileView.shown += 25;
    drawProfile();
  } else if (b.id === 'p-share') {
    sharePanel.open();
  } else if (b.id === 'p-start') {
    showView('test');
  } else if (b.id === 'p-sign-out') {
    signOut().catch(err => alert(`Could not sign out: ${(err as Error).message}`));
  } else if (b.id === 'p-sign-in') {
    signIn().catch(err => alert(`Sign-in failed: ${(err as Error).message}`));
  } else if (b.id === 'h-clear') {
    const where = currentUser() ? 'from your account and this browser' : 'from this browser';
    if (!confirm(`Delete all saved test results ${where}? This cannot be undone.`)) return;
    clearHistory();
    drawProfile();
    clearAccountHistory().catch(err => alert(`Could not delete the results in your account: ${err.message || err}`));
  }
});

// ---------- settings page ----------
type BoolPref = 'liveSpeed' | 'liveAcc' | 'liveBurst' | 'timerBar' | 'smoothCaret' | 'blind' | 'errorSound';
type PickPref = 'fontSize' | 'caret' | 'stopOnError' | 'confidence' | 'sound';
const choices = (...xs: [string, string][]) => xs.map(([value, label]) => ({ value, label }));
const bool = (key: BoolPref) =>
  ({ choices: ON_OFF, get: () => onOff(prefs[key]), set: (v: string) => { prefs[key] = v === 'on'; } });
const pick = (key: PickPref) =>
  ({ get: () => prefs[key] as string, set: (v: string) => { (prefs as unknown as Record<string, string>)[key] = v; } });

/** A typing line that shows the chosen text size and caret, typing itself. */
function appearancePreview() {
  const text = 'practise a little every day';
  return `<div class="s-preview" data-pv-type style="--pv-fs:${Math.min(FONT_PX[prefs.fontSize], 36)}px">
    <span class="s-pv-label">${icon('eye', 13)}preview</span>
    <div class="s-pv-line"><span class="s-pv-text">${[...text].map(c => `<i>${c === ' ' ? '&nbsp;' : c}</i>`).join('')}</span><b class="s-pv-caret ${prefs.caret}${prefs.smoothCaret ? ' smooth' : ''}"></b></div>
  </div>`;
}

const SECTIONS: Section[] = [
  { title: 'behaviour', icon: 'pointer', desc: 'How a test reacts to your mistakes.', options: [
    { id: 'stopOnError', icon: 'shield', title: 'stop on error',
      desc: 'Letter: a wrong key is counted but not typed. Word: you cannot move on until the word is right.',
      choices: choices(['off', 'off'], ['letter', 'letter'], ['word', 'word']), ...pick('stopOnError') },
    { id: 'confidence', icon: 'backspace', title: 'confidence mode',
      desc: 'On: you cannot go back to fix an earlier word. Max: backspace is turned off completely.',
      choices: choices(['off', 'off'], ['on', 'on'], ['max', 'max']), ...pick('confidence') },
    { id: 'blind', icon: 'eye', title: 'blind mode', desc: 'Mistakes are not shown while you type; you see them on the result.', ...bool('blind') },
  ] },
  { title: 'live stats', icon: 'chart', desc: 'Numbers shown above the words while you type.', options: [
    { id: 'liveSpeed', icon: 'gauge', title: 'live speed', desc: 'Your speed in wpm while you type, updated every second.', ...bool('liveSpeed') },
    { id: 'liveAcc', icon: 'target', title: 'live accuracy', desc: 'The share of keys you pressed correctly so far.', ...bool('liveAcc') },
    { id: 'liveBurst', icon: 'zap', title: 'live burst', desc: 'How fast you typed the last word, in wpm.', ...bool('liveBurst') },
    { id: 'timerBar', icon: 'bar', title: 'progress bar', desc: 'A thin bar next to the timer that fills as the test goes on.', ...bool('timerBar') },
  ] },
  { title: 'appearance', icon: 'palette', desc: 'How the words, the caret and the whole site look.', preview: appearancePreview, options: [
    { id: 'fontSize', icon: 'font', title: 'text size', desc: 'Size of the words you type.',
      choices: choices(['s', 'small'], ['m', 'medium'], ['l', 'large'], ['xl', 'extra large']), ...pick('fontSize') },
    { id: 'caret', icon: 'cursor', title: 'caret style', desc: 'The marker that shows where you are typing.',
      choices: choices(['line', 'line'], ['block', 'block'], ['underline', 'underline'], ['off', 'off']), ...pick('caret') },
    { id: 'smoothCaret', icon: 'next', title: 'smooth caret', desc: 'The caret glides from letter to letter instead of jumping.', ...bool('smoothCaret') },
    { id: 'keyboard', icon: 'keyboard', title: 'on-screen keyboard', desc: 'Show the keyboard under the words, with the next key lit up.',
      choices: ON_OFF, get: () => onOff(settings.showKeyboard), set: v => { settings.showKeyboard = v === 'on'; } },
    { id: 'theme', icon: 'palette', title: 'theme', desc: 'Colours for the whole site.',
      choices: THEMES.map(t => ({ value: t.id, label: t.name, colors: [t.bg, t.main] as [string, string] })), get: currentTheme, set: v => { applyTheme(v); drawThemes(); } },
  ] },
  { title: 'sound', icon: 'volume', desc: 'Sounds while you type.', options: [
    { id: 'sound', icon: 'volume', title: 'key sound', desc: 'A sound on every key press. Pick one to hear it.',
      choices: choices(['off', 'off'], ['click', 'click'], ['pop', 'pop'], ['typewriter', 'typewriter']), ...pick('sound') },
    { id: 'errorSound', icon: 'x', title: 'error sound', desc: 'A low buzz when you press a wrong key.', ...bool('errorSound') },
  ] },
  { title: 'reset', icon: 'restart', desc: 'Start over with the settings. Your results are kept.', options: [],
    extra: `<div class="s-row s-reset"><span class="s-ico">${icon('restart', 18)}</span><div class="s-text"><div class="s-title">reset settings</div><p>Put every setting on this page back to how it started. Your results are kept.</p></div><div class="s-ctl"><button id="s-reset" class="btn danger">${icon('restart', 15)}reset</button></div></div>` },
];

const refreshSettings = renderSettings(settingsEl, SECTIONS, id => {
  savePrefs(prefs);
  if (id === 'keyboard') { saveSettings(); renderConfig(); }
  if (id === 'sound') previewSound(prefs);
  if (id === 'errorSound' && prefs.errorSound) keySound(prefs, false);
  applyPrefs();
});
settingsEl.addEventListener('click', e => {
  if (!(e.target as HTMLElement).closest('#s-reset')) return;
  if (!confirm('Reset all settings to how they started? Your results are kept.')) return;
  Object.assign(prefs, DEFAULT_PREFS);
  savePrefs(prefs);
  settings.showKeyboard = false;
  saveSettings();
  applyTheme('jolpai');
  drawThemes();
  renderConfig();
  applyPrefs();
  refreshSettings();
});

// ---------- replay ----------
const replayEl = $('replay');
const replay = new Replay(replayEl);
$('replay-btn').addEventListener('click', () => {
  replayEl.hidden = !replayEl.hidden;
  $('replay-btn').classList.toggle('active', !replayEl.hidden);
  if (replayEl.hidden) { replay.stop(); return; }
  enter(replayEl);
  replayEl.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
  replay.play();
});

$('restart').addEventListener('click', () => reset());
$('next').addEventListener('click', () => reset());
$('repeat').addEventListener('click', () => reset(true));
$('to-history').addEventListener('click', () => showView('profile'));
window.addEventListener('resize', () => {
  movePills();
  if (!finished) updateCaret(); else drawChart();
});
// pills measure text, so place them again once the web fonts arrive
document.fonts?.ready.then(() => { movePills(); updateCaret(); });

// ---------- account ----------
const accountEl = $('account');

/** Signed out: a "sign in" button. Signed in: your photo becomes the profile button. */
function renderAccount(u: AccountUser | null) {
  const btn = $('nav-history');
  if (u) {
    const initial = esc((u.name || u.email || '?').trim().charAt(0).toUpperCase());
    btn.innerHTML = u.photo
      ? `<img src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer" />`
      : `<span class="initial">${initial}</span>`;
    btn.classList.add('has-avatar');
    btn.title = `${u.name}: your profile`;
  } else {
    btn.innerHTML = icon('user', 20);
    btn.classList.remove('has-avatar');
    btn.title = 'Your profile: personal bests, stats and history';
  }
  accountEl.hidden = !accountsEnabled() || !!u;
  if (!u) accountEl.innerHTML = `<button id="sign-in" class="sign-in" title="Sign in to save your progress on every device">${icon('login', 15)}<span>sign in</span></button>`;
}

accountEl.addEventListener('click', async e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('#sign-in');
  if (!b) return;
  b.classList.add('busy');
  b.querySelector('span')!.textContent = 'signing in…';
  try { await signIn(); } catch (err) { alert(`Sign-in failed: ${(err as Error).message}`); }
  renderAccount(currentUser());
});

renderAccount(null);
initAccount(u => {
  renderAccount(u);
  if (view === 'profile') drawProfile();
  if (u && document.querySelector('.share-dlg[open]')) sharePanel.open();
}).catch(err => console.warn('Accounts are unavailable', err));

// ---------- theme menu in the corner ----------
const themeMenu = $('theme-menu');
const themeBtn = $('theme-btn');

/** Show the current theme's colours on the corner button. */
function drawThemeButton() {
  const t = THEMES.find(x => x.id === currentTheme()) ?? THEMES[0];
  themeBtn.style.setProperty('--sw-bg', t.bg);
  themeBtn.style.setProperty('--sw-main', t.main);
  themeBtn.dataset.tip = `theme: ${t.name}`;
}

function openThemeMenu(open: boolean) {
  themeMenu.hidden = !open;
  themeBtn.setAttribute('aria-expanded', String(open));
  themeBtn.classList.toggle('active', open);
  if (open) { enter(themeMenu); themeMenu.querySelector<HTMLElement>('.theme-row.active')?.focus(); }
}

themeBtn.addEventListener('click', () => openThemeMenu(themeMenu.hidden));
document.addEventListener('click', e => {
  if (!themeMenu.hidden && !cornerEl.contains(e.target as Node)) openThemeMenu(false);
});

const drawMenuThemes = renderThemePicker($('themes'), () => {
  drawThemeButton();
  if (view === 'profile' || view === 'shared') drawProfile();
  if (view === 'settings') refreshSettings();
});
/** Redraw the theme pickers after the theme changed elsewhere. */
function drawThemes() { drawMenuThemes(); drawThemeButton(); }
drawThemeButton();

// links from the guide pages and search results: ?lang=bangla or ?lang=english starts that
// test, ?view=learn opens the Bijoy course
const linkParams = new URLSearchParams(location.search);
const linkLang = linkParams.get('lang');
if (linkLang === 'bangla' || linkLang === 'english') {
  settings.lang = linkLang;
  if (settings.mode === 'custom' || settings.mode === 'lesson') { settings.mode = 'time'; settings.amount = 30; }
  saveSettings();
}

applyPrefs();
renderConfig();
reset();
// a shared-profile link: ?p=<share id>
const sharedParam = linkParams.get('p');
if (sharedParam) openShared(sharedParam);
else {
  if (linkParams.get('view') === 'learn') showView('learn');
  // one clean address for the page, whichever link brought you here
  if (linkLang || linkParams.has('view')) history.replaceState(null, '', location.pathname);
}
