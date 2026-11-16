import { defineConfig, type Plugin } from 'vitest/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const page = (f: string) => fileURLToPath(new URL(f, import.meta.url));

/** Where the site is served: the GitHub Pages project address. Development uses '/'. */
const SITE_BASE = '/jolpai-typing/';

/**
 * Every page address the app knows (src/router.ts) gets a real copy of the app page,
 * so a refresh, a bookmark or a shared link opens with a normal 200 response.
 * 404.html catches anything else; the app then shows the right page itself.
 */
function routePages(): Plugin {
  return {
    name: 'route-pages',
    apply: 'build',
    closeBundle() {
      const out = page('./dist/');
      const html = readFileSync(`${out}index.html`, 'utf8');
      // lesson ids from both courses (Bijoy and English)
      const course = ['./src/learn/course.ts', './src/learn/course-en.ts'].map(f => readFileSync(page(f), 'utf8')).join('\n');
      const lessons = [...course.matchAll(/\{ id: '([a-z0-9-]+)', unit: \d+,/g)].map(m => m[1]);
      const routes = ['learn', 'learn/english', 'learn/exam', 'profile', 'settings', 'about', ...lessons.map(id => `learn/${id}`)];
      for (const r of routes) {
        mkdirSync(`${out}${r}`, { recursive: true });
        writeFileSync(`${out}${r}/index.html`, html);
      }
      writeFileSync(`${out}404.html`, html);
    },
  };
}

export default defineConfig(({ command }) => ({
  // absolute in the build, so pages at /learn/ or /learn/home-1/ still find their files
  base: command === 'build' ? SITE_BASE : '/',
  plugins: [routePages()],
  build: {
    rollupOptions: {
      // the app, plus static guide pages written for search: one page per thing people look for
      input: {
        main: page('./index.html'),
        banglaTypingTest: page('./bangla-typing-test/index.html'),
        bijoyTypingTutor: page('./bijoy-typing-tutor/index.html'),
      },
    },
  },
  test: {
    // security rules tests need the Firestore emulator: npm run test:rules
    exclude: ['**/node_modules/**', 'rules-tests/**', '.claude/**'],
  },
}));
