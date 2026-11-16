// Addresses for each page, so back/forward, refresh, bookmarks and shared links
// all land where you were:
//   /                 the typing test
//   /learn/           the Bijoy course     /learn/english/   the English course
//   /learn/<lesson id>/   a lesson (English ids start with en-)     /learn/exam/   the mock exam
//   /profile/  /settings/  /about/
// A shared profile stays /?p=<id>, so printed QR codes keep working.
// The build writes a real page at each of these addresses (see vite.config.ts).

export type Page = 'test' | 'learn' | 'profile' | 'settings' | 'about';
export interface Route { page: Page; lesson?: string; exam?: boolean; track?: 'english' }

/** Where the site lives: '/jolpai-typing/' on GitHub Pages, '/' in development. */
export const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

const PAGES: Page[] = ['learn', 'profile', 'settings', 'about'];

/** Read a route from an address path. Anything unknown is the typing test. */
export function routeFromPath(path: string): Route {
  const rest = path.startsWith(BASE) ? path.slice(BASE.length) : path.replace(/^\/+/, '');
  const [first, second] = rest.split('/').filter(Boolean).map(decodeURIComponent);
  if (!PAGES.includes(first as Page)) return { page: 'test' };
  if (first === 'learn' && second) {
    if (second === 'exam') return { page: 'learn', exam: true };
    if (second === 'english') return { page: 'learn', track: 'english' };
    return { page: 'learn', lesson: second };
  }
  return { page: first as Page };
}

/** The address of a route, always ending in a slash. */
export function pathFor(r: Route): string {
  if (r.page === 'test') return BASE;
  if (r.page === 'learn' && r.exam) return `${BASE}learn/exam/`;
  if (r.page === 'learn' && r.lesson) return `${BASE}learn/${encodeURIComponent(r.lesson)}/`;
  if (r.page === 'learn' && r.track === 'english') return `${BASE}learn/english/`;
  return `${BASE}${r.page}/`;
}

/** A plain left click that the page should handle itself (not a new tab or window). */
export const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
