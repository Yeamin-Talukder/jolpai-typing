import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const page = (f: string) => fileURLToPath(new URL(f, import.meta.url));

// Relative base so the built site works from any folder, including a
// GitHub Pages project URL like https://<user>.github.io/jolpai-typing/
export default defineConfig({
  base: './',
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
});
