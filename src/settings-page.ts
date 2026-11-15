// The settings page: sections of options, each a row of choice buttons.
import { icon, movePills, type IconName } from './icons';

export interface Choice { value: string; label: string }
export interface Option {
  id: string;
  title: string;
  desc: string;
  icon: IconName;
  choices: Choice[];
  get(): string;
  set(value: string): void;
}
export interface Section { title: string; options: Option[]; extra?: string }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export const onOff = (on: boolean) => (on ? 'on' : 'off');
export const ON_OFF: Choice[] = [{ value: 'off', label: 'off' }, { value: 'on', label: 'on' }];

/** Draw the page once; call the returned refresh() when settings change elsewhere. */
export function renderSettings(el: HTMLElement, sections: Section[], onChange: (id: string) => void) {
  const all = new Map<string, Option>();
  el.innerHTML = `
    <div class="s-head">
      <h1>settings</h1>
      <p>Saved in this browser. Changes apply right away.</p>
    </div>
    <nav class="s-jump" aria-label="Settings sections">${sections.map((s, i) => `<a href="#s-sec-${i}">${esc(s.title)}</a>`).join('')}</nav>
    ${sections.map((s, i) => `
      <section class="s-section" id="s-sec-${i}">
        <h2>${esc(s.title)}</h2>
        ${s.options.map(o => {
          all.set(o.id, o);
          return `<div class="s-row">
            <div class="s-text"><div class="s-title">${icon(o.icon, 16)}${esc(o.title)}</div><p>${esc(o.desc)}</p></div>
            <div class="group seg s-choices" data-opt="${o.id}">${o.choices.map(c =>
              `<button data-value="${esc(c.value)}">${esc(c.label)}</button>`).join('')}</div>
          </div>`;
        }).join('')}
        ${s.extra ?? ''}
      </section>`).join('')}`;

  const refresh = () => {
    el.querySelectorAll<HTMLElement>('[data-opt]').forEach(g => {
      const cur = all.get(g.dataset.opt!)!.get();
      g.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.classList.toggle('active', b.dataset.value === cur));
    });
    movePills(el);
  };

  el.addEventListener('click', e => {
    const jump = (e.target as HTMLElement).closest<HTMLAnchorElement>('.s-jump a');
    if (jump) {
      e.preventDefault();
      el.querySelector(jump.getAttribute('href')!)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-opt] button');
    if (!b) return;
    const id = b.closest<HTMLElement>('[data-opt]')!.dataset.opt!;
    all.get(id)!.set(b.dataset.value!);
    refresh();
    onChange(id);
  });

  refresh();
  return refresh;
}
