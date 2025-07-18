import { z } from 'zod';
import { ai } from '../globals';
import { RecipeSchema, RecipeSearchResultsSchema } from '../schemas';


const ChatState = z.object({
  searchResults: z.array(RecipeSearchResultsSchema).optional(),
  recipe: RecipeSchema.optional(),
  requestedRedirect: z.string().optional(),
});

export type ChatState = z.infer<typeof ChatState>;


export const getRecipe = ai.defineTool({
  name: 'getRecipe',
  description: 'Gets the recipe the user is currently viewing.',
  inputSchema: z.void(),
  outputSchema: RecipeSchema.nullable().describe('The recipe the user is currently viewing, or null if no recipe is set.'),
}, async () => {
  const session = ai.currentSession<z.infer<typeof ChatState>>();
  console.log('getRecipe')
  const state = await session.state ?? {};
  return state.recipe ?? null;
});


export const setRecipe = ai.defineTool({
  name: 'setRecipe',
  description: 'Sets the recipe for the user to view.',
  inputSchema: RecipeSchema,
  outputSchema: z.object({ success: z.boolean().default(true) }),
}, async (recipe) => {
  console.log('setRecipeTool called');
  const session = ai.currentSession<z.infer<typeof ChatState>>();
  await session.updateState({ recipe });
  return { success: true };
});


export const redirectUserToSearch = ai.defineTool({
  name: 'redirectUserToSearch',
  description: `Redirect the user's browser to the search page with the given query.`,
  inputSchema: z.object({
    query: z.string().describe('The query to search for.'),
  }),
  outputSchema: z.object({ success: z.boolean().default(true) }),
}, async ({ query }) => {
  console.log(`redirectUser called with query: ${query}`);
  const session = ai.currentSession<z.infer<typeof ChatState>>();
  await session.updateState({ requestedRedirect: `/search?q=${encodeURIComponent(query)}` });
  return { success: true };
});


export const redirectUserToRecipe = ai.defineTool({
  name: 'redirectUserToRecipe',
  description: `Redirect the user's browser to the recipe page with the given URL.`,
  inputSchema: z.object({
    url: z.string().describe('The URL of the recipe to view.'),
  }),
  outputSchema: z.object({ success: z.boolean().default(true) }),
}, async ({ url }) => {
  console.log(`redirectUser called with url: ${url}`);
  const session = ai.currentSession<z.infer<typeof ChatState>>();
  await session.updateState({ requestedRedirect: `/recipe?url=${encodeURIComponent(url)}` });
  return { success: true };
});


