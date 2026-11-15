import { defineConfig } from 'vitest/config';

// Security rules tests only; run through `npm run test:rules`, which starts
// the Firestore emulator first.
export default defineConfig({
  test: { include: ['rules-tests/**/*.test.ts'], testTimeout: 20000 },
});
