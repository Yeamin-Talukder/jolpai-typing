// On-screen keyboard: shows the Bijoy (or English) character on each key,
// lights up the next key to press, and flashes keys as they are typed.
import { KEY_LABELS } from './bijoy';

type Pair = [string, string]; // unshifted, shifted (US layout)

const ROWS: Pair[][] = [
  [['`', '~'], ['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '^'], ['7', '&'], ['8', '*'], ['9', '('], ['0', ')'], ['-', '_'], ['=', '+']],
  [['q', 'Q'], ['w', 'W'], ['e', 'E'], ['r', 'R'], ['t', 'T'], ['y', 'Y'], ['u', 'U'], ['i', 'I'], ['o', 'O'], ['p', 'P'], ['[', '{'], [']', '}'], ['\\', '|']],
  [['a', 'A'], ['s', 'S'], ['d', 'D'], ['f', 'F'], ['g', 'G'], ['h', 'H'], ['j', 'J'], ['k', 'K'], ['l', 'L'], [';', ':'], ["'", '"']],
  [['z', 'Z'], ['x', 'X'], ['c', 'C'], ['v', 'V'], ['b', 'B'], ['n', 'N'], ['m', 'M'], [',', '<'], ['.', '>'], ['/', '?']],
];

// Combining signs need a dotted circle to be visible on their own.
const SIGN = /^[ঁ-ঃ়া-্ৗ]/;
const show = (s: string) => (SIGN.test(s) ? '◌' + s : s);

export class Keyboard {
  private el: HTMLElement;
  private keyEls = new Map<string, HTMLElement>(); // character -> key element
  private shiftEls: HTMLElement[] = [];
  private spaceEl!: HTMLElement;
  private backEl!: HTMLElement;
  private lit: HTMLElement[] = [];

  constructor(el: HTMLElement) {
    this.el = el;
  }

  render(lang: 'english' | 'bangla') {
    const bn = lang === 'bangla';
    this.keyEls.clear();
    this.shiftEls = [];
    this.lit = [];
    this.el.innerHTML = '';
    this.el.classList.toggle('bn', bn);
    const extra: Record<number, [string, string]> = { 0: ['', 'backspace'], 1: ['tab', ''], 2: ['caps', 'enter'], 3: ['shift', 'shift'] };
    ROWS.forEach((row, r) => {
      const rowEl = document.createElement('div');
      rowEl.className = `kb-row r${r}`;
      const [left, right] = extra[r];
      if (left) rowEl.appendChild(this.special(left));
      for (const [lo, hi] of row) {
        const k = document.createElement('div');
        k.className = 'kb-key';
        if (bn) {
          const a = KEY_LABELS[lo] ?? '', b = KEY_LABELS[hi] ?? '';
          k.innerHTML = `<span class="hi">${show(b)}</span><span class="lo">${show(a)}</span><span class="en">${lo.toUpperCase()}</span>`;
          if (!a && !b) k.classList.add('dim');
        } else {
          k.innerHTML = /[a-z]/.test(lo) ? `<span class="lo">${lo}</span>` : `<span class="hi">${hi}</span><span class="lo">${lo}</span>`;
        }
        if ('fj'.includes(lo)) k.classList.add('home');
        this.keyEls.set(lo, k);
        this.keyEls.set(hi, k);
        rowEl.appendChild(k);
      }
      if (right) rowEl.appendChild(this.special(right));
      this.el.appendChild(rowEl);
    });
    const spaceRow = document.createElement('div');
    spaceRow.className = 'kb-row';
    this.spaceEl = this.special('space');
    spaceRow.appendChild(this.spaceEl);
    this.el.appendChild(spaceRow);
  }

  private special(name: string) {
    const k = document.createElement('div');
    k.className = `kb-key wide ${name}`;
    k.textContent = name;
    if (name === 'shift') this.shiftEls.push(k);
    if (name === 'backspace') this.backEl = k;
    return k;
  }

  /** Light up what to press next: a character, 'space' or 'backspace'. */
  hint(next: string | null) {
    for (const k of this.lit) k.classList.remove('next');
    this.lit = [];
    if (!next) return;
    if (next === 'space') this.lit.push(this.spaceEl);
    else if (next === 'backspace') this.lit.push(this.backEl);
    else {
      const k = this.keyEls.get(next);
      if (k) this.lit.push(k);
      if (/[A-Z~!@#$%^&*()_+{}|:"<>?]/.test(next)) this.lit.push(...this.shiftEls);
    }
    for (const k of this.lit) k.classList.add('next');
  }

  /** Show a key going down, with shift for shifted characters (used by the replay). */
  press(ch: string, ok: boolean) {
    const keys: HTMLElement[] = [];
    if (ch === ' ') keys.push(this.spaceEl);
    else if (ch === 'backspace') keys.push(this.backEl);
    else {
      const k = this.keyEls.get(ch);
      if (k) keys.push(k);
      if (/[A-Z~!@#$%^&*()_+{}|:"<>?]/.test(ch)) keys.push(...this.shiftEls);
    }
    for (const k of keys) {
      k.classList.remove('press', 'good', 'bad');
      void k.offsetWidth; // restart the animation
      k.classList.add('press', ok ? 'good' : 'bad');
    }
  }

  /** Brief feedback on a key press. */
  flash(ch: string, ok: boolean) {
    const k = ch === ' ' ? this.spaceEl : this.keyEls.get(ch);
    if (!k) return;
    k.classList.remove('ok', 'bad');
    void k.offsetWidth; // restart the animation
    k.classList.add(ok ? 'ok' : 'bad');
  }
}
