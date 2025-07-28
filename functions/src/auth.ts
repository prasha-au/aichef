import { AuthData } from 'firebase-functions/tasks';
import { firestore } from './globals';

export const isAuthenticatedAndHasRequests = async (auth: AuthData | null): Promise<boolean> => {
  const uid = auth?.uid;
  if (!uid) {
    return false;
  }

  const now = Date.now();
  const userRef = firestore.collection('user-request-counts').doc(uid);
  const doc = await userRef.get();
  const data = doc.data() ?? { count: 0, windowStart: now };

  const expired = now - data.windowStart > 24 * 60 * 60 * 1000;
  if (expired) {
    await userRef.set({ count: 1, windowStart: now }, { merge: true });
  } else if (data.count < 100) {
    await userRef.set({ count: data.count + 1, windowStart: data.windowStart }, { merge: true });
  } else {
    return false;
  }
  return true;
}

