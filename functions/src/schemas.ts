import {z} from "genkit/beta";

export const IngredientSchema = z.object({
  name: z.string(),
  amount: z.number().nullable(),
  unit: z.enum(['tablespoon', 'teaspoon', 'cup', 'kilogram', 'gram', 'liter', 'milliliter', 'each']).default('each'),
  notes: z.string().nullable()
})


export const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  ingredientGroups: z.array(
    z.object({
      heading: z.string().optional().default(''),
      ingredients: z.array(IngredientSchema)
    })
  ),
  instructions: z.array(
    z.object({
      heading: z.string().optional().default(''),
      steps: z.array(z.string()),
    })
  ),
  notes: z.array(z.string()).optional().nullable(),
  url: z.string(),
});


export const RecipeSearchResultsSchema = z.object({
  title: z.string(),
  // site: z.string().describe('The name of the website that the recipe came from'),
  url: z.string().describe('The formatted URL that the recipe came from'),
  summary: z.string().default(''),
  source: z.enum(['web', 'saved']),
});



