// The settings page: a side menu of sections, cards of options, search,
// on/off switches, theme chips, an optional live preview per section, and a
// small "saved" note after every change.
import { icon, movePills, type IconName } from './icons';

export interface Choice { value: string; label: string; colors?: [string, string] }
export interface Option {
  id: string;
  title: string;
  desc: string;
  icon: IconName;
  choices: Choice[];
  get(): string;
  set(value: string): void;
}
export interface Section {
  title: string;
  icon?: IconName;
  desc?: string;
  options: Option[];
  extra?: string;
  /** A live preview drawn above the options, redrawn after every change. */
  preview?: () => string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export const onOff = (on: boolean) => (on ? 'on' : 'off');
export const ON_OFF: Choice[] = [{ value: 'off', label: 'off' }, { value: 'on', label: 'on' }];
const isSwitch = (o: Option) => o.choices.length === 2 && o.choices[0].value === 'off' && o.choices[1].value === 'on';

function control(o: Option): string {
  if (isSwitch(o)) {
    return `<button class="s-switch" role="switch" aria-checked="false" data-switch="${o.id}" aria-label="${esc(o.title)}"><i></i></button>`;
  }
  if (o.choices.some(c => c.colors)) {
    return `<div class="s-swatches" data-opt="${o.id}" role="group" aria-label="${esc(o.title)}">${o.choices.map(c =>
      `<button data-value="${esc(c.value)}" style="--sw-bg:${c.colors![0]};--sw-main:${c.colors![1]}" title="${esc(c.label)}"><span class="sw-dot"></span><span>${esc(c.label)}</span></button>`).join('')}</div>`;
  }
  return `<div class="group seg s-choices" data-opt="${o.id}" role="group" aria-label="${esc(o.title)}">${o.choices.map(c =>
    `<button data-value="${esc(c.value)}">${esc(c.label)}</button>`).join('')}</div>`;
}

/** Draw the page once; call the returned refresh() when settings change elsewhere. */
export function renderSettings(el: HTMLElement, sections: Section[], onChange: (id: string) => void) {
  const all = new Map<string, Option>();
  sections.forEach(s => s.options.forEach(o => all.set(o.id, o)));
  el.innerHTML = `
    <div class="s-wrap">
      <aside class="s-side">
        <div class="s-head">
          <h1>${icon('gear', 22)}settings</h1>
          <p>Changes apply right away and are saved in this browser.</p>
        </div>
        <label class="s-search">${icon('search', 16)}<input type="search" placeholder="Find a setting" aria-label="Find a setting" /></label>
        <nav class="s-nav" aria-label="Settings sections">${sections.map((s, i) =>
          `<a href="#s-sec-${i}" class="${i === 0 ? 'active' : ''}"><span>${icon(s.icon ?? 'gear', 16)}</span>${esc(s.title)}${s.options.length ? `<em>${s.options.length}</em>` : ''}</a>`).join('')}</nav>
      </aside>
      <div class="s-main">
        ${sections.map((s, i) => `
          <section class="s-card" id="s-sec-${i}" style="--i:${i}">
            <header class="s-card-head">
              <span class="s-card-icon">${icon(s.icon ?? 'gear', 20)}</span>
              <div><h2>${esc(s.title)}</h2>${s.desc ? `<p>${esc(s.desc)}</p>` : ''}</div>
            </header>
            ${s.preview ? `<div class="s-preview-slot" data-preview="${i}"></div>` : ''}
            ${s.options.map(o => `
              <div class="s-row ${isSwitch(o) ? 'is-switch' : ''} ${o.choices.some(c => c.colors) ? 'is-wide' : ''}" data-row="${o.id}">
                <span class="s-ico">${icon(o.icon, 18)}</span>
                <div class="s-text"><div class="s-title">${esc(o.title)}</div><p>${esc(o.desc)}</p></div>
                <div class="s-ctl">${control(o)}</div>
              </div>`).join('')}
            ${s.extra ?? ''}
          </section>`).join('')}
        <p class="s-none" hidden>${icon('info', 16)}No setting matches that.</p>
      </div>
    </div>
    <div class="s-toast" role="status" aria-live="polite">${icon('check', 15)}<span>saved</span></div>`;

  const toast = el.querySelector<HTMLElement>('.s-toast')!;
  let toastTimer = 0;
  const saved = (o: Option) => {
    const what = o.title;
    const row = el.querySelector<HTMLElement>(`[data-row="${o.id}"]`);
    if (row) { row.classList.remove('changed'); void row.offsetWidth; row.classList.add('changed'); }
    toast.querySelector('span')!.textContent = `${what} saved`;
    toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1600);
  };

  const refresh = () => {
    el.querySelectorAll<HTMLElement>('[data-opt]').forEach(g => {
      const cur = all.get(g.dataset.opt!)!.get();
      g.querySelectorAll<HTMLButtonElement>('button').forEach(b => {
        const on = b.dataset.value === cur;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    });
    el.querySelectorAll<HTMLElement>('[data-switch]').forEach(b => {
      const on = all.get(b.dataset.switch!)!.get() === 'on';
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('on', on);
      b.closest('.s-row')?.classList.toggle('on', on);
    });
    el.querySelectorAll<HTMLElement>('[data-preview]').forEach(p => { p.innerHTML = sections[Number(p.dataset.preview)].preview!(); });
    movePills(el);
    typePreview(false);
  };

  // the preview types itself, so the caret style and smooth caret can be seen
  let pv = 9;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const typePreview = (step: boolean) => {
    const line = el.querySelector<HTMLElement>('[data-pv-type]');
    if (!line || !line.offsetParent) return;
    const letters = [...line.querySelectorAll<HTMLElement>('.s-pv-text i')];
    const caret = line.querySelector<HTMLElement>('.s-pv-caret')!;
    if (step && !still.matches) pv = (pv + 1) % (letters.length + 8);
    const n = Math.min(pv, letters.length);
    letters.forEach((l, i) => l.classList.toggle('typed', i < n));
    const at = letters[Math.min(n, letters.length - 1)];
    const x = n < letters.length ? at.offsetLeft : at.offsetLeft + at.offsetWidth;
    caret.style.transform = `translateX(${x}px)`;
    caret.style.width = caret.classList.contains('line') ? '' : `${at.offsetWidth}px`;
  };
  window.setInterval(() => typePreview(true), 160);

  el.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const jump = t.closest<HTMLAnchorElement>('.s-nav a');
    if (jump) {
      e.preventDefault();
      el.querySelector(jump.getAttribute('href')!)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const sw = t.closest<HTMLElement>('[data-switch]');
    if (sw) {
      const o = all.get(sw.dataset.switch!)!;
      o.set(o.get() === 'on' ? 'off' : 'on');
      refresh();
      onChange(o.id);
      saved(o);
      return;
    }
    const b = t.closest<HTMLButtonElement>('[data-opt] button');
    if (!b) return;
    const o = all.get(b.closest<HTMLElement>('[data-opt]')!.dataset.opt!)!;
    if (o.get() === b.dataset.value) return;
    o.set(b.dataset.value!);
    refresh();
    onChange(o.id);
    saved(o);
  });

  // search: show only the settings whose name or description matches
  const search = el.querySelector<HTMLInputElement>('.s-search input')!;
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let any = false;
    el.querySelectorAll<HTMLElement>('.s-card').forEach(card => {
      let shown = 0;
      card.querySelectorAll<HTMLElement>('[data-row]').forEach(row => {
        const o = all.get(row.dataset.row!)!;
        const hit = !q || `${o.title} ${o.desc}`.toLowerCase().includes(q);
        row.hidden = !hit;
        if (hit) shown++;
      });
      const head = card.querySelector('h2')!.textContent!.toLowerCase();
      const match = shown > 0 || (!!q && head.includes(q));
      if (match && !shown) card.querySelectorAll<HTMLElement>('[data-row]').forEach(r => { r.hidden = false; });
      card.hidden = !match;
      card.querySelectorAll<HTMLElement>('.s-preview-slot, .s-reset').forEach(x => { x.hidden = !!q; });
      any ||= match;
    });
    el.querySelector<HTMLElement>('.s-none')!.hidden = any;
    movePills(el);
  });

  // the menu follows the section you are reading
  const links = [...el.querySelectorAll<HTMLAnchorElement>('.s-nav a')];
  const io = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const id = `#${en.target.id}`;
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
    }
  }, { rootMargin: '-30% 0px -60% 0px' });
  el.querySelectorAll('.s-card').forEach(c => io.observe(c));

  refresh();
  return refresh;
}
