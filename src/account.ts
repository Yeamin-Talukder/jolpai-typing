// Accounts: Google sign-in with Firebase Authentication, results stored in
// Firestore under users/{uid}/results/{id}. Firebase is loaded on demand so
// the typing test never waits for it, and the site works without it.
import { firebaseConfig, useEmulators } from './firebase-config';
import { clearHistory, loadHistory, replaceHistory, type Entry } from './history';
import { cleanEntry, mergeHistories } from './account-sync';

export interface AccountUser { uid: string; name: string; email: string; photo: string | null; joined: number | null }

type AuthMod = typeof import('firebase/auth');
type FsMod = typeof import('firebase/firestore');
interface Fb { auth: import('firebase/auth').Auth; db: import('firebase/firestore').Firestore; a: AuthMod; f: FsMod }

const OWNER_KEY = 'jolpai-type:owner'; // whose results are in this browser ('' = guest)

let fb: Fb | null = null;
let user: AccountUser | null = null;

export const accountsEnabled = () => firebaseConfig !== null;
export const currentUser = () => user;

function getOwner(): string {
  try { return localStorage.getItem(OWNER_KEY) || ''; } catch { return ''; }
}
function setOwner(uid: string) {
  try { if (uid) localStorage.setItem(OWNER_KEY, uid); else localStorage.removeItem(OWNER_KEY); } catch { /* ignore */ }
}

async function load(): Promise<Fb> {
  if (fb) return fb;
  const [{ initializeApp }, a, f] = await Promise.all([
    import('firebase/app'), import('firebase/auth'), import('firebase/firestore'),
  ]);
  const app = initializeApp(firebaseConfig!);
  const auth = a.getAuth(app);
  const db = f.getFirestore(app);
  if (useEmulators) {
    a.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    f.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  fb = { auth, db, a, f };
  return fb;
}

/** Start listening for sign-in changes. `onChange` runs after history is synced. */
export async function initAccount(onChange: (u: AccountUser | null) => void) {
  if (!accountsEnabled()) return;
  const { auth, a } = await load();
  a.onAuthStateChanged(auth, async u => {
    if (u) {
      const created = Date.parse(u.metadata.creationTime || '');
      user = { uid: u.uid, name: u.displayName || u.email || 'you', email: u.email || '', photo: u.photoURL, joined: Number.isNaN(created) ? null : created };
      try { await syncHistory(); } catch (err) { console.warn('Could not sync history with your account', err); }
    } else {
      // Signed out: remove this person's results from the browser so the
      // next person on a shared computer does not see them.
      if (getOwner()) { clearHistory(); setOwner(''); }
      user = null;
    }
    onChange(user);
  });
  if (useEmulators) {
    // test hook, emulator builds only: sign in with a fake Google account
    (window as unknown as Record<string, unknown>).__jtTestSignIn = (sub: string, email: string, name: string) =>
      a.signInWithCredential(auth, a.GoogleAuthProvider.credential(JSON.stringify({ sub, email, name, email_verified: true })));
  }
}

async function syncHistory() {
  const { db, f } = await load();
  const u = user!;
  const col = f.collection(db, 'users', u.uid, 'results');
  const snap = await f.getDocs(f.query(col, f.orderBy('t', 'desc'), f.limit(1000)));
  const cloud = snap.docs.map(d => d.data() as Entry);
  const { merged, upload } = mergeHistories(loadHistory(), cloud, getOwner(), u.uid);
  for (let i = 0; i < upload.length; i += 400) {
    const batch = f.writeBatch(db);
    for (const e of upload.slice(i, i + 400)) batch.set(f.doc(col, e.id), e);
    await batch.commit();
  }
  await f.setDoc(f.doc(db, 'users', u.uid), { name: u.name, lastSeen: f.serverTimestamp() }, { merge: true });
  replaceHistory(merged);
  setOwner(u.uid);
}

export async function signIn() {
  const { auth, a } = await load();
  const provider = new a.GoogleAuthProvider();
  try {
    await a.signInWithPopup(auth, provider);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-blocked') await a.signInWithRedirect(auth, provider);
    else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') throw err;
  }
}

export async function signOut() {
  const { auth, a } = await load();
  await a.signOut(auth);
}

/** Save a new result to the account (the browser copy is saved separately). */
export function saveToAccount(e: Entry) {
  if (!user || !fb) return;
  const { db, f } = fb;
  setOwner(user.uid);
  f.setDoc(f.doc(db, 'users', user.uid, 'results', e.id), cleanEntry(e))
    .catch(err => console.warn('Could not save the result to your account', err));
}

/** Delete every result in the account. */
export async function clearAccountHistory() {
  if (!user || !fb) return;
  const { db, f } = fb;
  const col = f.collection(db, 'users', user.uid, 'results');
  for (;;) {
    const snap = await f.getDocs(f.query(col, f.limit(400)));
    if (snap.empty) break;
    const batch = f.writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}
