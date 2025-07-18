import { initializeApp } from 'firebase/app';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDB7KfOKAIDHpeLj5NbvNtdRKzyJMzIqlM",
  authDomain: "ai-chef-101.firebaseapp.com",
  projectId: "ai-chef-101",
  storageBucket: "ai-chef-101.firebasestorage.app",
  messagingSenderId: "1053367325595",
  appId: "1:1053367325595:web:9e6e03ae43fc69b5aec73e"
} as const;

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

connectFunctionsEmulator(functions, "localhost", 5001);



export const queryReply = httpsCallable(functions, 'queryReply');
export const searchForRecipes = httpsCallable<{ query: string; }, SearchRecipesResult[]>(functions, 'searchForRecipes');
export const getRecipeFromUrl = httpsCallable<{ url: string }, Recipe>(functions, 'getRecipeFromUrl');
export const getSessionInfo = httpsCallable<{ sessionId: string }, ChatSessionInfo>(functions, 'getSessionInfo');

export interface ChatSessionInfo {
  messages: { role: 'ai' | 'user'; text: string; }[];
  state: Record<string, unknown>;
}


export interface SearchRecipesResult {
  title: string;
  url: string;
  summary?: string;
  source: 'web' | 'saved';
}


export interface Ingredient {
  name: string;
  amount: number | null;
  unit: 'tablespoon' | 'teaspoon' | 'cup' | 'kilogram' | 'gram' | 'liter' | 'milliliter' | 'each';
  notes: string | null;
}

export interface Recipe {
  title: string;
  description: string;
  ingredientGroups: Array<{
    heading?: string;
    ingredients: Ingredient[];
  }>;
  instructions: Array<{
    heading?: string;
    steps: string[];
  }>;
  notes?: string[] | null;
  url: string;
}
