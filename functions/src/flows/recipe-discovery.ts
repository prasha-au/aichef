import {z} from "genkit/beta";
import { gemini20FlashLite } from '@genkit-ai/googleai';
import { retriever, ai, googleCustomSearchKey, googleCustomSearchCtx, recipeIndexConfig, firestore } from '../globals';
import * as cheerio from 'cheerio';
import { FieldValue } from 'firebase-admin/firestore';
import { RecipeSchema, RecipeSearchResultsSchema } from '../schemas';



const RawReciepeExtractorSchema = z.object({
  title: z.string(),
  description: z.string(),
  ingredientGroups: z.array(
    z.object({
      heading: z.string().optional(),
      ingredients: z.array(z.string()),
    })
  ),
  instructions: z.array(
    z.object({
      heading: z.string().optional(),
      steps: z.array(z.string()),
    })
  ),
  notes: z.array(z.string()).optional().default([]),
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


    const webContentRaw = await (await fetch(simpleUrl)).text();
    const $ = cheerio.load(webContentRaw);
    const recipeContent = $('.wprm-recipe').first().html() ?? webContentRaw;


    console.log(`Parsing recipe content`);

    const reciepeRawRes = await ai.generate({
      config: { temperature: 0.0, topP: 0.0 },
      prompt: `
        You are a HTML recipe data extractor. Your only task is to pull out reciepe data from the provided HTML content.
        Do not rephrase, summarize, interpret, reorder or modify the text in any way.

        Content:"""
        ${recipeContent}
        """
        `,
        output: { schema: RawReciepeExtractorSchema },
      });
      const reciepeRaw = reciepeRawRes.output!;


    console.log(`Converting ingredients`);

    const ingredientsRes = await ai.generate({
      model: gemini20FlashLite,
      config: { temperature: 0.0, topP: 0.0 },
      prompt: `
        You are an ingredients extractor. Your only task is to convert the input schema to the output schema.
        Try to keep the name simple and put alternative values in the notes field.

        Input value (JSON): """
        ${JSON.stringify(reciepeRaw.ingredientGroups)}
        """
      `,
      output: { schema: RecipeSchema.shape.ingredientGroups },
    });
    const convertedIngredients = ingredientsRes.output!;


    console.log(`Storing in DB`);


    const recipeToStore = {
      ...reciepeRaw,
      ingredientGroups: convertedIngredients,
      instructions: reciepeRaw.instructions.map((inst) => ({ heading: '', ...inst })),
      url: simpleUrl,
    };

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
  const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleCustomSearchKey.value()}&cx=${googleCustomSearchCtx.value()}&exactTerms=recipe&num=${input.limit ?? 10}&q=${encodeURIComponent(input.query)}`;
  const webResponse = await (await fetch(searchUrl)).json();

  type WebSearchResult = Omit<z.infer<typeof RecipeSearchResultsSchema>, 'source'>;

  const rawResults: WebSearchResult[] = webResponse.items.map(({ title, formattedUrl, pagemap }: Record<string, any>) => {
    return { title, url: formattedUrl, summary: pagemap['metatags'][0]['og:description'] };
  });

  const response = await ai.generate({
    model: gemini20FlashLite,
    prompt: `
      Clean the JSON list of recipes below by:
      - Excluding any results that have irrelvant data.
      - Excluding any social media sites like Facebook, Instagram, etc.
      - Removing the website name from the title.
      - Editing the summary so it is a couple of concise sentences if required.

      """json
      ${JSON.stringify(rawResults)}
      """
    `,
    output: { schema: z.array(RecipeSearchResultsSchema.omit({ source: true })) },
    config: { temperature: 0.2 },
  });

  return (response.output ?? rawResults).map(item => ({ ...item, source: 'web' as const }));

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

