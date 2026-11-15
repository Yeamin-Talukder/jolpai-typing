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
let shareId: string | null = null; // set while the profile is shared

export const accountsEnabled = () => firebaseConfig !== null;
export const currentUser = () => user;
export const currentShareId = () => shareId;

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
      shareId = null;
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
  const profileRef = f.doc(db, 'users', u.uid);
  const profile = await f.getDoc(profileRef);
  shareId = (profile.data()?.shareId as string | null | undefined) ?? null;
  await f.setDoc(profileRef, { name: u.name, lastSeen: f.serverTimestamp() }, { merge: true });
  replaceHistory(merged);
  setOwner(u.uid);
  if (shareId) publishShare(); // name, photo or results may have changed
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
  if (shareId) publishShare();
}

// ---------- shared profile ----------
// A public copy of the profile at shared/{shareId}, made only when the owner
// asks for it. It holds name, photo, join date, totals and recent results;
// never the email address.

/** What a shared profile holds, as read back for viewers. */
export interface SharedProfile {
  name: string; photo: string | null; joined: number | null; updated: number | null;
  tests: number; time: number; results: Entry[];
}

const SHARE_RESULTS = 500;  // newest results in the public copy
const SHARE_GRAPHS = 30;    // of those, how many keep their speed graph

function newShareId() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, b => abc[b % abc.length]).join('');
}

function snapshot(u: AccountUser, f: FsMod) {
  const all = loadHistory();
  const recent = all.slice(-SHARE_RESULTS).map((e, i, list) => {
    const c = cleanEntry(e);
    if (i < list.length - SHARE_GRAPHS) { delete c.hw; delete c.hr; delete c.he; }
    return c;
  });
  return {
    owner: u.uid, name: u.name, photo: u.photo, joined: u.joined, updated: f.serverTimestamp(),
    tests: all.length, time: Math.round(all.reduce((a, e) => a + e.sec, 0)), results: recent,
  };
}

let publishTimer = 0;
/** Update the public copy soon (several quick changes make one write). */
export function publishShare() {
  clearTimeout(publishTimer);
  publishTimer = window.setTimeout(() => {
    if (!user || !fb || !shareId) return;
    const { db, f } = fb;
    f.setDoc(f.doc(db, 'shared', shareId), snapshot(user, f))
      .catch(err => console.warn('Could not update your shared profile', err));
  }, 1500);
}

/** Make the profile public; returns its share id. */
export async function startSharing(): Promise<string> {
  if (!user) throw new Error('Sign in first');
  const { db, f } = await load();
  const id = shareId ?? newShareId();
  await f.setDoc(f.doc(db, 'shared', id), snapshot(user, f));
  await f.setDoc(f.doc(db, 'users', user.uid), { name: user.name, shareId: id }, { merge: true });
  shareId = id;
  return id;
}

/** Delete the public copy; the link stops working. */
export async function stopSharing() {
  if (!user || !shareId) return;
  const { db, f } = await load();
  clearTimeout(publishTimer);
  await f.deleteDoc(f.doc(db, 'shared', shareId));
  await f.setDoc(f.doc(db, 'users', user.uid), { name: user.name, shareId: null }, { merge: true });
  shareId = null;
}

/** Read someone's shared profile; null if it does not exist (or was unshared). */
export async function loadShared(id: string): Promise<SharedProfile | null> {
  if (!accountsEnabled()) return null;
  const { db, f } = await load();
  const snap = await f.getDoc(f.doc(db, 'shared', id));
  if (!snap.exists()) return null;
  const d = snap.data();
  const updated = d.updated && typeof d.updated.toMillis === 'function' ? d.updated.toMillis() : null;
  return {
    name: String(d.name || 'someone'), photo: typeof d.photo === 'string' ? d.photo : null,
    joined: typeof d.joined === 'number' ? d.joined : null, updated,
    tests: Number(d.tests) || 0, time: Number(d.time) || 0,
    results: Array.isArray(d.results) ? (d.results as Entry[]).map(cleanEntry).sort((a, b) => a.t - b.t) : [],
  };
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
  if (shareId) publishShare(); // the shared copy empties too
}
