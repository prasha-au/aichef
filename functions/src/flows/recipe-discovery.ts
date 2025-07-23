import {z} from "genkit/beta";
import { gemini, gemini20FlashLite } from '@genkit-ai/googleai';
import { retriever, ai, googleCustomSearchKey, googleCustomSearchCtx, recipeIndexConfig, firestore } from '../globals';
import * as cheerio from 'cheerio';
import { IngredientSchema, RecipeSchema, RecipeSearchResultsSchema } from '../schemas';
import { FieldValue } from 'firebase-admin/firestore';



const convertUnitsTool = ai.defineTool({
  name: 'convertUnits',
  description: 'Converts a list of ingredient quantity and units to a different unit.',
  inputSchema: z.object({
    ingredients: z.array(z.object({
      amount: z.number().describe('The quantity of the ingredient as a decimal number'),
      unit: z.enum(['pound', 'ounce']).describe('The unit of the ingredient'),
    })),
  }),
  outputSchema: z.array(z.object({
    convertedAmount: z.number().describe('The quantity of the ingredient as a decimal number'),
    convertedUnit: IngredientSchema.shape.unit.describe('The converted unit of the ingredient'),
  })),
}, async (input) => {
  return input.ingredients.map(ingredient => {
    const { amount, unit } = ingredient;
    console.log(`Converting ${amount} ${unit}`);
    switch (unit) {
      case 'pound':
        return { convertedAmount: amount * 0.453592, convertedUnit: 'kilogram' as const };
      case 'ounce':
        return { convertedAmount: amount * 0.0283495, convertedUnit: 'milliliter' as const };
      default:
        throw new Error(`Unknown unit: ${unit}`);
    }
  });
});


export const getRecipeFromUrlTool = ai.defineTool(
  {
    name: 'getRecipeFromUrl',
    description: 'Gets a recipe from a given URL',
    inputSchema: z.object({
      url: z.string().describe('The url to get the recipe from'),
    }),
    outputSchema: RecipeSchema
  },
  async (input) => {
    console.log(`Retrieving recipe url: ${input.url}`);

    const url = new URL(input.url);
    const simpleUrl = `${url.origin}${url.pathname}`;

    const docId = `${url.hostname}__${url.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '_')}`;

    const existing = await firestore.collection('recipes').doc(docId).get();
    if (existing.exists) {
      console.log(`Recipe already exists in DB: ${docId}`);
      return JSON.parse(existing.data()![recipeIndexConfig.contentField]);
    }

    const webResult = await fetch(simpleUrl);
    if (!webResult.ok) {
      throw new Error(`Failed to fetch recipe from ${simpleUrl}: ${webResult.statusText}`);
    }
    const webContentRaw = await webResult.text();
    const $ = cheerio.load(webContentRaw);
    const recipeContent = $('.wprm-recipe').first().html() ?? $('[itemType="http://schema.org/Recipe"]').html() ?? $('main').html() ?? $('#main').html() ?? '';
    if (!recipeContent) {
      throw new Error(`Could not select recipe content from ${simpleUrl}.`);
    }

    const recipeParseRes = await ai.generate({
      config: { temperature: 0.0, topP: 0.0, seed: 0 },
      model: gemini('gemini-2.5-pro'),
      system: `
        You are a HTML recipe data extractor.
        You **ONLY** task is to extract the recipe data from the provided raw HTML content.

        You **MUST** extract details from the HTML content using the following rules:
        - Do not rephrase, summarize, reinterpret, reorder or modify the content in any way.
        - Ignore content from user comments or reviews sections.
        - If the ingredients or instructions are in a section without a heading then just leave it empty.
        - If ingredient notes have been styled to read alongside the ingredient you can strip those characters (eg. "*", ",", "(note)").
        - Always use metric ingredients where possible. If a metric unit is not specified, call the 'convertUnits' tool before attempting a conversion yourself.
        - Attempt to strip out any resizing query parameters from the image URL.

        If you are unable to parse the recipe you **MUST** set the 'convertError' field to a description of the error.
        `,
        prompt: recipeContent,
        output: { schema: z.object({
          result:  RecipeSchema.omit({ url: true }).nullable().describe('The parsed recipe data'),
          convertError: z.string().default('').describe('Any error that occurred while converting units'),
        }) },
        tools: [convertUnitsTool],
      });
    const recipe = recipeParseRes.output!.result;


    if (!recipe) {
      console.log(recipeParseRes.output);
      throw new Error(`Agent failed to parse recipe from ${simpleUrl}: ${recipeParseRes.output?.convertError ?? 'Unknown error'}`);
    }

    const recipeToStore = { ...recipe, url: simpleUrl };

    const embeddingValue = await ai.embed({
      embedder: recipeIndexConfig.embedder,
      content: JSON.stringify(recipeToStore),
    });

    await firestore.collection('recipes').doc(docId).set({
      [recipeIndexConfig.contentField]: JSON.stringify(recipeToStore),
      [recipeIndexConfig.vectorField]: FieldValue.vector(embeddingValue[0].embedding),
      createdAt: new Date(),
      url: simpleUrl,
    });

    return recipeToStore;
  },
)





const searchWebForRecipesTool = ai.defineTool({
  name: 'searchWebForRecipes',
  description: 'Searches the web for recipes based on a user query',
  inputSchema: z.object({
    query: z.string().describe("The user query"),
    limit: z.number().default(10),
  }),
  outputSchema: z.array(RecipeSearchResultsSchema),
}, async (input) => {
  const searchParams = new URLSearchParams({
    key: googleCustomSearchKey.value(),
    cx: googleCustomSearchCtx.value(),
    exactTerms: 'recipe',
    num: input.limit.toString(),
    safe: 'active',
    q: input.query,
  })
  const url = new URL(`https://www.googleapis.com/customsearch/v1?${searchParams.toString()}`);
  const webResponse = await (await fetch(url.toString())).json();

  const response = await ai.generate({
    model: gemini20FlashLite,
    system: `
      You are a search results parser for recipes.
      Your only task is to parse raw search results from the Google Custom Search API and return a list of recipe search results.
      You **MUST** follow the rules below:
      - Exclude any results that have irrelevant data.
      - Exclude any social media sites like Facebook, Instagram, etc.
      - Remove the website name from the title.
      - Edit the summary so it is a couple of concise sentences.
      - Use the og:description tag for the summary if it exists and is relevant.
      - Exclude any results that fail to parse.
      - Set the source field to 'web' for all results.
    `,
    prompt: JSON.stringify({ query: input.query, results: webResponse.items }),
    output: { schema: z.array(RecipeSearchResultsSchema) },
    config: { temperature: 0.2 },
  });

  return response.output ?? [];
});



const searchDatabaseForRecipesTool = ai.defineTool({
  name: 'searchDatabaseForRecipes',
  description: 'Searches for saved recipes in the database based on a user query',
  inputSchema: z.object({
    query: z.string().describe("The user query"),
    limit: z.number().default(10),
  }),
  outputSchema: z.array(RecipeSearchResultsSchema),
}, async (input) => {
  const results = await ai.retrieve({
    retriever,
    query: input.query,
    options: { limit: input.limit },
  });
  return results.map(doc => {
    const recipe = JSON.parse(doc.content[0].text!);
    return { title: recipe.title, url: doc.metadata!.url, summary: recipe.description, source: 'saved' as const };
  });
});




export const searchForRecipesFlow = ai.defineFlow({
  name: 'searchForRecipesFlow',
  inputSchema: z.object({
    query: z.string().describe("The user query"),
  }),
  outputSchema: z.array(RecipeSearchResultsSchema),
}, async (input) => {

  const response = await ai.generate({
    system: `
      You are a recipe search engine. You will ONLY return data from the tools provided and not search for or create any new items.

      Order the values based on relevance to the query but prefer saved recipes in the database if relevant.
      Reply with an ordered list of recipes aiming for 10 items with both web and saved recipes.
    `,
    prompt: input.query,
    tools: [searchWebForRecipesTool, searchDatabaseForRecipesTool],
    output: { schema: z.array(RecipeSearchResultsSchema) },
    config: { temperature: 0.0 },
  });

  return response.output!;
});



export const fetchRecipeFromUrlFlow = ai.defineFlow({
  name: 'fetchRecipeFromUrlFlow',
  inputSchema: z.object({
    url: z.string().describe('The URL of the recipe to fetch'),
  }),
  outputSchema: RecipeSchema,
}, async (input) => {
  const data = await getRecipeFromUrlTool({ url: input.url });
  return data;
});

