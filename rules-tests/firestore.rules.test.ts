// Firestore security rules tests. Run with: npm run test:rules
// (starts the Firestore emulator; needs Java).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

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

  it('accepts custom tests and longer custom times', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice/results/c1'), result('c1', { mode: 'custom', amount: 0, label: 'custom 120 words' })));
    await assertSucceeds(setDoc(doc(db, 'users/alice/results/c2'), result('c2', { mode: 'time', amount: 1800, sec: 1800 })));
    await assertFails(setDoc(doc(db, 'users/alice/results/c3'), result('c3', { mode: 'race' })));
    await assertFails(setDoc(doc(db, 'users/alice/results/c4'), result('c4', { amount: 5000 })));
  });

  it('rejects bad data', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/results/r1'), result('other-id')));
    await assertFails(setDoc(doc(db, 'users/alice/results/r1'), result('r1', { wpm: 5000 })));
    await assertFails(setDoc(doc(db, 'users/alice/results/r1'), result('r1', { lang: 'hindi' })));
    await assertFails(setDoc(doc(db, 'users/alice/results/r1'), result('r1', { admin: true })));
    await assertFails(setDoc(doc(db, 'users/alice/results/r1'), result('r1', { acc: 120 })));
  });

  it('accepts the optional detail fields, within limits', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const detail = { chars: [120, 3, 1, 0], cons: 88.5, words: 25, wrong: 1, hw: [60, 70, 72], hr: [62, 75, 74], he: [0, 1, 0], dev: 'mobile' };
    await assertSucceeds(setDoc(doc(db, 'users/alice/results/r1'), result('r1', detail)));
    await assertFails(setDoc(doc(db, 'users/alice/results/r2'), result('r2', { cons: 150 })));
    await assertFails(setDoc(doc(db, 'users/alice/results/r3'), result('r3', { chars: [1, 2, 3, 4, 5] })));
    await assertFails(setDoc(doc(db, 'users/alice/results/r4'), result('r4', { hw: 'fast' })));
    await assertFails(setDoc(doc(db, 'users/alice/results/r6'), result('r6', { dev: 'watch' })));
    await assertFails(setDoc(doc(db, 'users/alice/results/r5'), result('r5', { hw: Array(701).fill(1) })));
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

describe('shared profiles', () => {
  const share = (owner: string, over: Record<string, unknown> = {}) => ({
    owner, name: 'Alice', photo: null, joined: 1763200000000, updated: serverTimestamp(), tests: 3, time: 90.5,
    results: [result('r1')], ...over,
  });

  it('the owner can publish, update and delete it', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'shared/abc'), share('alice')));
    await assertSucceeds(setDoc(doc(db, 'shared/abc'), share('alice', { tests: 4 })));
    await assertSucceeds(deleteDoc(doc(db, 'shared/abc')));
  });

  it('anyone with the link can read it, but nobody can list them', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'shared/abc'), share('alice', { updated: new Date() })));
    const guest = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(guest, 'shared/abc')));
    await assertFails(getDocs(collection(guest, 'shared')));
  });

  it('nobody else can write it, and bad data is refused', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'shared/abc'), share('alice', { updated: new Date() })));
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(setDoc(doc(bob, 'shared/abc'), share('bob')));
    await assertFails(deleteDoc(doc(bob, 'shared/abc')));
    await assertFails(setDoc(doc(bob, 'shared/xyz'), share('alice')));        // pretending to be alice
    await assertFails(setDoc(doc(bob, 'shared/xyz'), share('bob', { email: 'b@x.com' })));
    await assertFails(setDoc(doc(bob, 'shared/xyz'), share('bob', { results: Array(501).fill(result('r')) })));
    const guest = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(guest, 'shared/new'), share('alice')));
  });

  it('the owner can keep the share id in their profile', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice'), { name: 'Alice', lastSeen: serverTimestamp(), shareId: 'abc' }));
    await assertSucceeds(setDoc(doc(db, 'users/alice'), { name: 'Alice', shareId: null }));
  });
});
