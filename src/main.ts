import './style.css';
import { randomWords } from './words';
import { BANGLA_PASSAGES, ENGLISH_PASSAGES } from './passages';
import { BANGLA_WORDS } from './words-bn';
import { bijoyToUnicode, unicodeToSegments, usKey } from './bijoy';
import { Keyboard } from './keyboard';
import { lessonItems, lessonsFor } from './lessons';

type Mode = 'time' | 'words' | 'passage' | 'lesson';
type Lang = 'english' | 'bangla';

const AMOUNTS: Record<Exclude<Mode, 'lesson'>, number[]> = {
  time: [15, 30, 60, 120, 300, 600],
  words: [10, 25, 50, 100],
  passage: [60, 120, 300, 600],
};

/** Choices for the current mode; in lesson mode the amount is the lesson number. */
function amountsFor(mode: Mode, lang: Lang): number[] {
  return mode === 'lesson' ? lessonsFor(lang).map((_, i) => i) : AMOUNTS[mode];
}

const LESSON_LENGTH = 25;

const SETTINGS_KEY = 'jolpai-type:settings';

interface Settings { lang: Lang; mode: Mode; amount: number; keyboard: boolean }

function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '');
    const lang: Lang = s.lang === 'bangla' ? 'bangla' : 'english';
    if (['time', 'words', 'passage', 'lesson'].includes(s.mode) && amountsFor(s.mode, lang).includes(s.amount)) {
      return { lang, mode: s.mode, amount: s.amount, keyboard: s.keyboard !== false };
    }
  } catch { /* first visit or storage blocked */ }
  return { lang: 'english', mode: 'time', amount: 30, keyboard: true };
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

const settings = loadSettings();

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
const amountsEl = $('amounts');
const hintEl = $('lang-hint');
const keyboard = new Keyboard($('keyboard'));
const showKeyboard = () => settings.keyboard || settings.mode === 'lesson';

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
const timed = () => settings.mode === 'time' || settings.mode === 'passage';

function pickWords(n: number): Word[] {
  return randomWords(n, settings.lang === 'bangla' ? BANGLA_WORDS : undefined).map(makeWord);
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
  configEl.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === settings.lang));
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
      b.textContent = (settings.mode === 'passage' || (settings.mode === 'time' && n >= 300)) ? `${n / 60}m` : String(n);
    }
    b.dataset.amount = String(n);
    b.classList.toggle('active', n === settings.amount);
    amountsEl.appendChild(b);
  }
  const bn = settings.lang === 'bangla';
  wrapEl.classList.toggle('bn', bn);
  hintEl.hidden = !bn;
  const kbBtn = configEl.querySelector<HTMLButtonElement>('[data-toggle="keyboard"]')!;
  kbBtn.classList.toggle('active', showKeyboard());
  kbBtn.disabled = settings.mode === 'lesson'; // lessons always show it
  keyboard.render(settings.lang);
  $('keyboard').hidden = !showKeyboard();
}

configEl.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.toggle === 'keyboard') {
    settings.keyboard = !settings.keyboard;
    saveSettings();
    renderConfig();
    updateCaret();
    focusInput();
    return;
  } else if (b.dataset.lang) {
    settings.lang = b.dataset.lang as Lang;
    if (settings.mode === 'lesson') settings.amount = Math.min(settings.amount, lessonsFor(settings.lang).length - 1);
  } else if (b.dataset.mode) {
    const mode = b.dataset.mode as Mode;
    if (mode !== settings.mode) {
      settings.mode = mode;
      settings.amount = { time: 30, words: 25, passage: 60, lesson: 0 }[mode];
    }
  } else if (b.dataset.amount) {
    settings.amount = Number(b.dataset.amount);
  } else return;
  saveSettings();
  renderConfig();
  reset();
});

function reset() {
  clearInterval(tick);
  if (settings.mode === 'lesson') {
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
  wordsEl.style.transform = 'translateY(0)';
  inputEl.value = '';
  document.body.classList.remove('typing');
  resultEl.hidden = true;
  testEl.hidden = false;
  configEl.classList.remove('faded');
  renderAllWords();
  updateLive();
  focusInput();
  requestAnimationFrame(updateCaret);
}

// ---------- rendering ----------
function wordHTML(i: number): string {
  const w = words[i];
  const t = typed[i];
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
  return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
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
  const lineH = parseFloat(getComputedStyle(wordEl).lineHeight) || h;

  // keep the active line as the second visible line (three lines shown)
  const top = wordEl.offsetTop;
  const desired = Math.max(0, top - lineH);
  if (Math.abs(desired - lineOffset) > 2) {
    lineOffset = desired;
    wordsEl.style.transform = `translateY(${-lineOffset}px)`;
  }
  const y = top - lineOffset + (lineH - h) / 2;

  caretEl.style.height = `${h * 0.85}px`;
  caretEl.style.transform = `translate(${x - 1}px, ${y + h * 0.08}px)`;
  caretEl.classList.toggle('blink', !started);
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
  tick = window.setInterval(onSecond, 1000);
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
  typed[current] += ch;
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
  if (current === words.length - 1) { finish(); return; }
  current++;
  if (settings.mode === 'time' && words.length - current < 40) appendWords(50);
  markWords();
  updateCaret();
  updateLive();
}

function backspace(wholeWord: boolean) {
  if (!typed[current].length) {
    // step back only into a previous word that has a mistake
    if (current > 0 && !isCorrect(current - 1)) {
      current--;
      if (wholeWord) typed[current] = '';
      renderWord(current);
      updateCaret();
      updateLive();
    }
    return;
  }
  typed[current] = wholeWord ? '' : typed[current].slice(0, -1);
  renderWord(current);
  updateCaret();
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
  else updateLive();
}

function updateLive() {
  if (timed()) {
    liveEl.textContent = String(started ? Math.max(0, Math.round(settings.amount - elapsedSec())) : settings.amount);
  } else {
    liveEl.textContent = `${current}/${words.length}`;
  }
}

function finish() {
  if (finished) return;
  finished = true;
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
  showResult({ wpm, raw, acc, sec, c });
  if (settings.mode === 'lesson') $('exam').innerHTML = ''; // lessons are practice, not an exam
  else showExam(raw, sec);
}

// ---------- exam check ----------
// Minimum speeds from recent Bangladesh government job circulars.
// The circulars do not say how a word is counted; Jolpai Type uses the
// common 5-keystroke word and the usual net-speed formula.
const POSTS = [
  { name: 'Office Assistant-cum-Computer Typist', bangla: 20, english: 20 },
  { name: 'Computer Operator', bangla: 25, english: 30 },
];

function showExam(gross: number, sec: number) {
  let attempted = 0, wrong = 0;
  for (let i = 0; i < current; i++) {
    if (!typed[i]) continue;
    attempted++;
    if (!isCorrect(i)) wrong++;
  }
  const min = sec / 60;
  const net = min > 0 ? Math.max(0, gross - wrong / min) : 0;
  const lang = settings.lang;
  const rows = POSTS.map(p => {
    const need = p[lang];
    const ok = net >= need;
    return `<li class="${ok ? 'pass' : 'fail'}"><span class="mark">${ok ? '✓' : '✗'}</span>${p.name}<span class="need">needs ${need} wpm</span></li>`;
  }).join('');
  $('exam').innerHTML = `
    <div class="exam-nums">
      <div><div class="label">net speed</div><div class="val">${Math.round(net)} <small>wpm</small></div></div>
      <div><div class="label">gross speed</div><div class="val">${Math.round(gross)} <small>wpm</small></div></div>
      <div><div class="label">words typed</div><div class="val">${attempted}</div></div>
      <div><div class="label">wrong words</div><div class="val">${wrong}</div></div>
    </div>
    <ul class="posts">${rows}</ul>
    <p class="exam-note">Minimum ${lang === 'bangla' ? 'Bangla' : 'English'} speeds from recent government job circulars. Net speed = gross speed minus wrong words per minute, with 5 keystrokes counted as one word. Check your own circular, since boards can count differently.</p>`;
}

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
  $('r-wpm').textContent = String(Math.round(r.wpm));
  $('r-acc').textContent = `${Math.round(r.acc)}%`;
  $('r-raw').textContent = String(Math.round(r.raw));
  $('r-chars').textContent = `${r.c.correct}/${r.c.incorrect}/${r.c.extra}/${timed() ? 0 : r.c.missed}`;
  $('r-cons').textContent = `${Math.round(consistency(samples.map(s => s.raw)))}%`;
  $('r-time').textContent = `${Math.round(r.sec)}s`;
  const amount = settings.mode === 'passage' ? `${settings.amount / 60}m`
    : settings.mode === 'lesson' ? lessonsFor(settings.lang)[settings.amount].name : settings.amount;
  $('r-type').innerHTML = `${settings.mode} ${amount}<br>${settings.lang === 'bangla' ? 'বাংলা (বিজয়)' : 'english'}`;
  drawChart();
  $('next').focus();
}

function drawChart() {
  const svg = $('chart') as unknown as SVGSVGElement;
  const W = svg.clientWidth || 800;
  const H = svg.clientHeight || 200;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const n = samples.length;
  if (n === 0) { svg.innerHTML = ''; return; }
  const padL = 36, padR = 30, padT = 10, padB = 24;
  const maxY = Math.max(10, ...samples.map(s => Math.max(s.wpm, s.raw)));
  const top = Math.ceil(maxY / 20) * 20;
  const maxE = Math.max(1, ...samples.map(s => s.errors));
  const x = (i: number) => padL + (n === 1 ? 0 : (i / (n - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - v / top) * (H - padT - padB);
  const line = (k: 'wpm' | 'raw') => samples.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join('');

  let g = '';
  for (let v = 0; v <= top; v += top / 4) {
    g += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${padL - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${Math.round(v)}</text>`;
  }
  const step = Math.max(1, Math.ceil(n / 10));
  for (let i = 0; i < n; i += step) g += `<text x="${x(i)}" y="${H - 6}" class="axis" text-anchor="middle">${i + 1}</text>`;
  let errs = '';
  samples.forEach((s, i) => {
    if (!s.errors) return;
    const ey = padT + (1 - s.errors / maxE) * (H - padT - padB) * 0.9;
    errs += `<g class="err" transform="translate(${x(i)},${ey})"><path d="M-3,-3L3,3M3,-3L-3,3"/><title>${s.errors} error${s.errors > 1 ? 's' : ''} in second ${i + 1}</title></g>`;
  });
  svg.innerHTML = `${g}<path d="${line('raw')}" class="raw"/><path d="${line('wpm')}" class="wpm"/>${errs}`;
}

$('restart').addEventListener('click', reset);
$('next').addEventListener('click', reset);
window.addEventListener('resize', () => { if (!finished) updateCaret(); else drawChart(); });

renderConfig();
reset();
