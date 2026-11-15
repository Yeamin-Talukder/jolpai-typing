// Colour themes. Each one is a set of CSS variables in style.css under
// [data-theme="id"]; "jolpai" is the default and uses :root.

export const THEMES = [
  { id: 'jolpai', name: 'jolpai', bn: 'জলপাই', bg: '#1e2118', main: '#a3b84a' },
  { id: 'jolpai-light', name: 'jolpai light', bn: 'জলপাই (আলো)', bg: '#f3f1e6', main: '#5f7019' },
  { id: 'shapla', name: 'shapla', bn: 'শাপলা', bg: '#2a1f2b', main: '#f28cb0' },
  { id: 'nodi', name: 'nodi', bn: 'নদী', bg: '#10222e', main: '#4fc3d9' },
  { id: 'mati', name: 'mati', bn: 'মাটি', bg: '#2b211a', main: '#d9a05b' },
  { id: 'doel', name: 'doel', bn: 'দোয়েল', bg: '#121417', main: '#6aa8ff' },
] as const;

const KEY = 'jolpai-type:theme';

export function currentTheme(): string {
  return document.documentElement.dataset.theme || 'jolpai';
}

export function applyTheme(id: string) {
  if (id === 'jolpai') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = id;
  try {
    if (id === 'jolpai') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, id);
  } catch { /* ignore */ }
}

/** Draw the picker; returns a function that redraws it. */
export function renderThemePicker(el: HTMLElement, onChange: () => void) {
  const draw = () => {
    const cur = currentTheme();
    el.innerHTML = THEMES.map(t =>
      `<button data-theme-id="${t.id}" class="theme-row ${t.id === cur ? 'active' : ''}" aria-pressed="${t.id === cur}" style="--sw-bg:${t.bg};--sw-main:${t.main}">`
      + `<span class="sw-dot"></span><span class="tr-name">${t.name}</span><span class="tr-bn">${t.bn}</span></button>`).join('');
  };
  draw();
  el.addEventListener('click', e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-theme-id]');
    if (!b) return;
    const change = () => { applyTheme(b.dataset.themeId!); draw(); onChange(); };
    // cross-fade between themes where the browser supports it
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(change);
    else change();
  });
  return draw;
}
