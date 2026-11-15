// Firebase settings for accounts. A Firebase web config is not a secret:
// it only identifies the project; the security rules in firestore.rules
// decide what anyone can read or write.
import type { FirebaseOptions } from 'firebase/app';

export const useEmulators = import.meta.env.VITE_FIREBASE_EMULATORS === 'true';

/** The real project's web config (Firebase project "jolpai-type").
 *  Set it to null to turn accounts off: the site then saves history only
 *  in the browser. */
const projectConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyCiYGV_fUpO7BR1qyyzF0Tj4pj2_wGPDOc',
  authDomain: 'jolpai-type.firebaseapp.com',
  projectId: 'jolpai-type',
  storageBucket: 'jolpai-type.firebasestorage.app',
  messagingSenderId: '571533861811',
  appId: '1:571533861811:web:2d1bb176cfa8cc40b861c6',
};

/** Local emulators use a demo project, which needs no real Firebase project. */
const emulatorConfig: FirebaseOptions = {
  apiKey: 'demo-key',
  authDomain: 'demo-jolpai-type.firebaseapp.com',
  projectId: 'demo-jolpai-type',
  appId: 'demo-app',
};

export const firebaseConfig: FirebaseOptions | null = useEmulators ? emulatorConfig : projectConfig;
