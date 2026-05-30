import { doc, runTransaction } from 'firebase/firestore';
import { getFirestoreDb } from './firebase-config';

/**
 * Counter collection name on Firestore.
 * Each document stores `{ seq: number }` for a given prefix+dateKey combo.
 *
 * Structure:
 *   _counters/CL_300526  → { seq: 3 }
 *   _counters/ISS_300526 → { seq: 1 }
 */
const COUNTER_COLLECTION = '_counters';

/**
 * Get the current date key in DDMMYY format (6 digits).
 * Example: 30/05/2026 → "300526"
 */
export function getDateKey6(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

/**
 * Atomically increment and return the next sequence number for a prefix+date.
 * Uses Firestore `runTransaction` to guarantee no collisions across tabs/users.
 *
 * @param prefix - Business prefix (e.g. 'CL', 'ISS', 'TSK')
 * @param dateKey - Date portion (DDMMYY), defaults to today
 * @returns The next sequence number (1, 2, 3, ...)
 *
 * @example
 * const seq = await getNextSequence('CL');         // → 1 (first of the day)
 * const seq2 = await getNextSequence('CL');        // → 2
 * const seq3 = await getNextSequence('CL', '310526'); // → 1 (new day)
 */
export async function getNextSequence(prefix: string, dateKey?: string): Promise<number> {
  const db = getFirestoreDb();
  const key = dateKey || getDateKey6();
  const counterDocId = `${prefix}_${key}`;
  const counterRef = doc(db, COUNTER_COLLECTION, counterDocId);

  const nextSeq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const currentSeq = snap.exists() ? (snap.data().seq as number) || 0 : 0;
    const seq = currentSeq + 1;
    tx.set(counterRef, { seq, prefix, dateKey: key, updatedAt: new Date().toISOString() }, { merge: true });
    return seq;
  });

  return nextSeq;
}

/**
 * Generate a complete business ID: {PREFIX}{DDMMYY}{SEQ padded to 3 digits}
 *
 * Uses Firestore counter transaction for guaranteed uniqueness.
 * Falls back to client counter + random suffix if transaction fails.
 *
 * @param prefix - Business prefix (e.g. 'CL', 'ISS')
 * @returns Promise<string> - e.g. "CL300526001"
 */
export async function generateBusinessId(prefix: string): Promise<string> {
  const dateKey = getDateKey6();
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const seq = await getNextSequence(prefix, dateKey);
      return `${prefix}${dateKey}${String(seq).padStart(3, '0')}`;
    } catch (error) {
      console.warn(`Counter transaction attempt ${attempt}/${MAX_RETRIES} failed for ${prefix}:`, error);
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }

  // Numeric fallback: keep business-ID shape without base36/random letters.
  const ms = String(Date.now() % 100000).padStart(5, '0');
  const rand = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `${prefix}${dateKey}${ms}${rand}`;
}
