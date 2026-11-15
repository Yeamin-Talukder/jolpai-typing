// Firestore security rules tests. Run with: npm run test:rules
// (starts the Firestore emulator; needs Java).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

const result = (id: string, over: Record<string, unknown> = {}) => ({
  id, t: 1763200000000, lang: 'bangla', mode: 'time', amount: 30, label: 'time 30',
  wpm: 21.5, net: 20, raw: 23, acc: 96.2, sec: 30, ...over,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-jolpai-type',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

describe('results', () => {
  it('owner can save and read a valid result', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice/results/r1'), result('r1')));
    await assertSucceeds(getDoc(doc(db, 'users/alice/results/r1')));
  });

  it('nobody else can read or write them', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'users/alice/results/r1'), result('r1')));
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bob, 'users/alice/results/r1')));
    await assertFails(setDoc(doc(bob, 'users/alice/results/r2'), result('r2')));
    const guest = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(guest, 'users/alice/results/r1')));
  });

  it('rejects bad data', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/results/r1'), result('other-id')));
    await assertFails(setDoc(doc(db, 'users/alice/results/r1'), result('r1', { wpm: 5000 })));
    await assertFails(setDoc(doc(db, 'users/alice/results/r1'), result('r1', { lang: 'hindi' })));
    await assertFails(setDoc(doc(db, 'users/alice/results/r1'), result('r1', { admin: true })));
    await assertFails(setDoc(doc(db, 'users/alice/results/r1'), result('r1', { acc: 120 })));
  });

  it('results cannot be edited, only deleted', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await setDoc(doc(db, 'users/alice/results/r1'), result('r1'));
    await assertFails(updateDoc(doc(db, 'users/alice/results/r1'), { wpm: 99 }));
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/results/r1')));
  });
});

describe('profile', () => {
  it('owner can write name and lastSeen only', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice'), { name: 'Alice', lastSeen: serverTimestamp() }));
    await assertFails(setDoc(doc(db, 'users/alice'), { name: 'Alice', role: 'admin' }));
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bob, 'users/alice')));
  });
});
