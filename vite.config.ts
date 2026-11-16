import { defineConfig } from 'vitest/config';

// Relative base so the built site works from any folder, including a
// GitHub Pages project URL like https://<user>.github.io/jolpai-typing/
export default defineConfig({
  base: './',
  test: {
    // security rules tests need the Firestore emulator: npm run test:rules
    exclude: ['**/node_modules/**', 'rules-tests/**', '.claude/**'],
  },
});
