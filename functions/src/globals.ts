import {onInit, setGlobalOptions} from "firebase-functions";
import {genkit} from "genkit/beta";
import {gemini, googleAI, textEmbedding004} from "@genkit-ai/googleai";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineFirestoreRetriever } from '@genkit-ai/firebase';
import { credential } from 'firebase-admin';
// import { ChatSessionStore } from './chat-session-store';
// import { createInterface } from 'node:readline/promises';


export const app = initializeApp({
  projectId: 'ai-chef-101',
  credential: credential.cert(require('./../servicekey.json'))
});


setGlobalOptions({ maxInstances: 1 });


export const genaiApiKey = defineSecret("GOOGLE_GENAI_API_KEY");
export const googleCustomSearchKey = defineSecret('GOOGLE_CUSTOM_SEARCH_KEY');
export const googleCustomSearchCtx = defineSecret('GOOGLE_CUSTOM_SEARCH_CTX');



export const firestore = getFirestore(app);
firestore.settings({
  ignoreUndefinedProperties: true,
});

export const ai = genkit({
  plugins: [googleAI()],
  model: gemini('gemini-2.5-flash'),
});


export const recipeIndexConfig = {
  collection: 'recipes',
  contentField: 'scraped',
  vectorField: 'embedding',
  embedder: textEmbedding004,
} as const;

export const retriever = defineFirestoreRetriever(ai, {
  name: 'recipeRetriever',
  firestore,
  ...recipeIndexConfig,
  distanceMeasure: 'COSINE',
});
