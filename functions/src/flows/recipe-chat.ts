import { ai } from '../globals';
import { RecipeSchema } from '../schemas';
import { z } from 'genkit/beta';


const RecipeEditFlowSchema = z.object({
  updatedRecipe: RecipeSchema.describe("The updated recipe after applying the edit"),
  changesMade: z.array(z.string()).describe("A list of changes made to the recipe"),
});


export const editRecipeTool = ai.defineTool({
  name: "editRecipe",
  description: "Applies an edit to a recipe and returns the updated recipe.",
  inputSchema: z.object({
    recipe: RecipeSchema.describe("The recipe to apply the edit to"),
    edit: z.string().describe("The edit to apply to the recipe"),
  }),
  outputSchema: RecipeEditFlowSchema,
}, async (input) => {
  console.log('tool call for editRecipe', input.edit, JSON.stringify(input.recipe.ingredientGroups));
  const response = await ai.generate({
    config: { temperature: 0.0, topK: 0.0 },
    prompt: `
      You are a personal recipe helper. Update the recipe below given the requested edit.
      If you are making changes to ingredients ensure you note down any changes in quantity, units or names in "changesMade" as single items.

      Requested edit:
      """
      ${input.edit}
      """

      Recipe (JSON):
      """
      ${JSON.stringify(input.recipe)}
      """
    `,
    output: { schema: RecipeEditFlowSchema },
  });


  console.log('changes made by edit: ', response.output!.changesMade)

  return response.output!;
})


const RecipeResponseSchema = z.object({
  changesMade: z.array(z.string()).default([]).describe("A list of changes made to the recipe"),
  recipe: RecipeSchema.describe("The end result of the recipe or the input item if no changes were made"),
});



export const recipeChatFlow = ai.defineFlow({
  name: "recipePageFlow",
  inputSchema: z.object({
    recipe: RecipeSchema.describe('The recipe the user is looking at'),
    query: z.string().describe('The user query'),
  }),
  outputSchema: RecipeResponseSchema
}, async (input) => {

    const response = await ai.generate({
      config: { temperature: 0.4 },
      prompt: `
        You are a personal recipe helper. Keep on topic and relate questions back to this specific recipe.
        If the user asks to edit the recipe, use the editRecipeTool to apply the edit.

        Query:
        """
        ${input.query}
        """

        Recipe (JSON):
        """
        ${JSON.stringify(input.recipe)}
        """
      `,
      tools: [editRecipeTool],
      output: { schema: RecipeResponseSchema },
    });


  return response.output!
});
