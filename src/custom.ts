// Custom tests: your own time or word count, and your own text to practise.
import { bijoyToUnicode, unicodeToSegments } from './bijoy';
import { icon } from './icons';

export type Lang = 'english' | 'bangla';
export type AmountMode = 'time' | 'words' | 'passage';

/** Limits for custom amounts, in the mode's own unit (seconds or words). */
export const LIMITS: Record<AmountMode, { min: number; max: number }> = {
  time: { min: 5, max: 3600 },
  words: { min: 5, max: 1000 },
  passage: { min: 60, max: 1800 },
};
/** Time limits offered for custom text, in seconds (0 = none). */
export const TEXT_LIMITS = [0, 60, 120, 300, 600];

interface Saved { amounts: Partial<Record<AmountMode, number>>; text: Partial<Record<Lang, string>> }
const KEY = 'jolpai-type:custom';

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { amounts: s.amounts && typeof s.amounts === 'object' ? s.amounts : {}, text: s.text && typeof s.text === 'object' ? s.text : {} };
  } catch { return { amounts: {}, text: {} }; }
}
const saved = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* ignore */ } }

export const clampAmount = (mode: AmountMode, n: number) =>
  Math.round(Math.min(LIMITS[mode].max, Math.max(LIMITS[mode].min, n)));

/** The custom amount saved for a mode, if any. */
export function customAmount(mode: AmountMode): number | null {
  const n = saved.amounts[mode];
  return typeof n === 'number' && n >= LIMITS[mode].min && n <= LIMITS[mode].max ? n : null;
}
export function setCustomAmount(mode: AmountMode, n: number) { saved.amounts[mode] = clampAmount(mode, n); save(); }

export const customText = (lang: Lang) => saved.text[lang] ?? '';
export function setCustomText(lang: Lang, text: string) { saved.text[lang] = text.slice(0, 20000); save(); }

/** The words of a custom text that can be typed, and how many were left out. */
export function typeableWords(text: string, lang: Lang): { words: string[]; dropped: string[] } {
  const words: string[] = [], dropped: string[] = [];
  for (const raw of text.split(/\s+/)) {
    const w = raw.normalize('NFC');
    if (!w) continue;
    if (lang === 'english') {
      // printable keyboard characters only; curly quotes and dashes become plain ones
      const plain = w.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...');
      if (/^[\x21-\x7e]+$/.test(plain)) words.push(plain); else dropped.push(w);
    } else {
      // Bangla: the word must come back exactly from its Bijoy key presses
      const keys = unicodeToSegments(w).map(s => s.keys).join('');
      // (and every key must be on a keyboard: the engine passes unknown characters through)
      if (keys && /^[\x21-\x7e]+$/.test(keys) && bijoyToUnicode(keys) === w) words.push(w); else dropped.push(w);
    }
  }
  return { words, dropped };
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** A small dialog; resolves with true when saved. */
function dialog(title: string, body: string, wire: (d: HTMLDialogElement, done: (ok: boolean) => void) => void): Promise<boolean> {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.className = 'share-dlg custom-dlg';
    d.innerHTML = `<div class="sh-top"><h2>${icon('gear', 18)}${title}</h2><button class="sh-close" aria-label="Close">${icon('x', 18)}</button></div>
      <form method="dialog" class="cu-form">${body}
        <div class="cu-actions"><button type="button" class="btn" data-cancel>cancel</button><button type="submit" class="btn primary">${icon('check', 15)}start</button></div>
      </form>`;
    document.body.appendChild(d);
    let finished = false;
    // settle once, directly: the dialog's own close event is not always delivered
    const done = (ok: boolean) => {
      if (finished) return;
      finished = true;
      if (d.open) d.close();
      d.remove();
      resolve(ok);
    };
    d.addEventListener('close', () => done(false)); // Esc
    d.addEventListener('click', e => {
      if (e.target === d || (e.target as Element).closest('.sh-close, [data-cancel]')) done(false);
    });
    wire(d, done);
    d.showModal();
    d.querySelector<HTMLElement>('input, textarea')?.focus();
  });
}

/** Ask for a custom time, word count or passage length. */
export function askAmount(mode: AmountMode, current: number): Promise<number | null> {
  const minutes = mode === 'passage';
  const unit = mode === 'words' ? 'words' : minutes ? 'minutes' : 'seconds';
  const { min, max } = LIMITS[mode];
  const show = (n: number) => (minutes ? n / 60 : n);
  const body = `
    <label class="cu-label" for="cu-amount">${mode === 'words' ? 'How many words?' : mode === 'time' ? 'How long? Type seconds, or minutes like 2:30' : 'How many minutes?'}</label>
    <div class="cu-amount"><input id="cu-amount" inputmode="decimal" autocomplete="off" value="${esc(String(show(current)))}" /><span>${unit}</span></div>
    <p class="cu-hint">From ${show(min)} to ${show(max)} ${unit}.</p>
    <div class="cu-quick">${(mode === 'words' ? [15, 75, 200, 500] : mode === 'time' ? [45, 90, 180, 900, 1800] : [180, 900, 1200, 1800])
      .map(n => `<button type="button" data-quick="${n}">${mode === 'time' ? (n >= 60 ? `${n / 60}m` : `${n}s`) : mode === 'passage' ? `${n / 60}m` : n}</button>`).join('')}</div>`;
  let value: number | null = null;
  return dialog(`custom ${mode === 'words' ? 'word count' : mode === 'time' ? 'time' : 'passage length'}`, body, (d, done) => {
    const input = d.querySelector<HTMLInputElement>('#cu-amount')!;
    const hint = d.querySelector<HTMLElement>('.cu-hint')!;
    const parse = () => {
      const v = input.value.trim();
      let n: number;
      if (mode === 'time' && /^\d+:\d{1,2}$/.test(v)) { const [m, s] = v.split(':').map(Number); n = m * 60 + s; }
      else n = Number(v) * (minutes ? 60 : 1);
      return Number.isFinite(n) && n > 0 ? n : NaN;
    };
    d.querySelector('.cu-quick')!.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLButtonElement>('[data-quick]');
      if (b) { value = Number(b.dataset.quick); done(true); }
    });
    d.querySelector('form')!.addEventListener('submit', e => {
      const n = parse();
      if (Number.isNaN(n) || n < min || n > max) {
        e.preventDefault();
        hint.textContent = `Please enter a number from ${show(min)} to ${show(max)} ${unit}.`;
        hint.classList.add('bad');
        input.focus();
        return;
      }
      value = clampAmount(mode, n);
      e.preventDefault();
      done(true);
    });
  }).then(ok => (ok ? value : null));
}

/** Ask for custom text and a time limit. Resolves with the time limit, or null if cancelled. */
export function askText(lang: Lang, limit: number): Promise<number | null> {
  const bn = lang === 'bangla';
  const body = `
    <label class="cu-label" for="cu-text">Paste or type the ${bn ? 'Bangla' : 'English'} text you want to practise</label>
    <textarea id="cu-text" class="cu-text ${bn ? 'bn' : ''}" rows="7" spellcheck="false" placeholder="${bn ? 'যেমন: কোনো বইয়ের একটি অনুচ্ছেদ, কবিতা বা গল্প' : 'For example a paragraph from a book, a poem or a story'}">${esc(customText(lang))}</textarea>
    <p class="cu-hint" aria-live="polite"></p>
    <div class="cu-label">Time limit</div>
    <div class="group seg cu-limit" role="group" aria-label="Time limit">${TEXT_LIMITS.map(n =>
      `<button type="button" data-limit="${n}" class="${n === limit ? 'active' : ''}">${n ? `${n / 60}m` : 'none'}</button>`).join('')}</div>
    <p class="cu-hint small">${bn ? 'The text is typed with Bijoy keys. Words that cannot be typed in Bijoy are left out.' : 'Only characters on an English keyboard can be typed; other words are left out.'} Your text stays in this browser.</p>`;
  let chosen = TEXT_LIMITS.includes(limit) ? limit : 0;
  return dialog(`custom text · ${bn ? 'বাংলা' : 'english'}`, body, (d, done) => {
    const ta = d.querySelector<HTMLTextAreaElement>('#cu-text')!;
    const hint = d.querySelector<HTMLElement>('.cu-hint')!;
    const check = () => {
      const { words, dropped } = typeableWords(ta.value, lang);
      hint.classList.toggle('bad', dropped.length > 0 || (ta.value.trim() !== '' && words.length === 0));
      hint.textContent = !ta.value.trim() ? '' : `${words.length} word${words.length === 1 ? '' : 's'} to type`
        + (dropped.length ? ` · ${dropped.length} left out: ${dropped.slice(0, 4).join(' ')}${dropped.length > 4 ? ' …' : ''}` : '');
      return words.length;
    };
    check();
    ta.addEventListener('input', check);
    d.querySelector('.cu-limit')!.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLButtonElement>('[data-limit]');
      if (!b) return;
      chosen = Number(b.dataset.limit);
      d.querySelectorAll('.cu-limit button').forEach(x => x.classList.toggle('active', x === b));
    });
    d.querySelector('form')!.addEventListener('submit', e => {
      e.preventDefault();
      if (check() === 0) { hint.textContent = 'Add some text that can be typed first.'; hint.classList.add('bad'); ta.focus(); return; }
      setCustomText(lang, ta.value);
      done(true);
    });
  }).then(ok => (ok ? chosen : null));
}
