import type { CollectionReference } from 'firebase-admin/firestore';
import type { SessionData, SessionStore } from 'genkit/beta';

export class ChatSessionStore<S = any> implements SessionStore<S> {
  constructor(private readonly firestoreCollection: CollectionReference) {}

  async get(sessionId: string): Promise<SessionData<S> | undefined> {
    try {
      return (await this.firestoreCollection.doc(sessionId).get()).data() as SessionData<S> | undefined;
    } catch {
      return undefined;
    }
  }

  async save(sessionId: string, sessionData: SessionData<S>): Promise<void> {
    await this.firestoreCollection.doc(sessionId).set(sessionData);
  }
}

