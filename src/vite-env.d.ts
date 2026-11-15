/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" to use the local Firebase emulators (npm run dev:emulators). */
  readonly VITE_FIREBASE_EMULATORS?: string;
}
