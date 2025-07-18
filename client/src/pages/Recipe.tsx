
import './Recipe.css';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getRecipeFromUrl, type Recipe } from '../firebase';
import Chat from '../components/Chat';
import { useAiChatState } from '../ai-chat';
import Ingredients from '../components/recipe/Ingredients';
import Instructions from '../components/recipe/Instructions';

export default function Recipe() {
  const [searchParams] = useSearchParams();
  const recipeUrl = searchParams.get('url');

  // const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recipe, setRecipe] = useAiChatState('recipe');

  useEffect(() => {
    if (!recipeUrl) {
      return;
    }
    setLoading(true);
    setError(null);
    getRecipeFromUrl({ url: recipeUrl })
      .then((res) => setRecipe(res.data))
      .catch((err) => setError(`Failed to fetch recipe ${err.message}`))
      .finally(() => setLoading(false));
  }, [recipeUrl]);

  return (
    <>
      <div className="background-div" />
      <main className="recipe-page">
        {recipe && (
          <div className="mb-4 text-center">
            <h1 className="mb-2 mt-2 text-white d-inline-block align-middle">{recipe.title}
              <a href={recipeUrl || ''} target="_blank" rel="noopener noreferrer" className="ms-4 align-middle text-secondary recipe-info-link" title="View original recipe">
                <InfoIcon />
              </a>
            </h1>
          </div>
        )}
        <div className="recipe-flex">
          <div className="recipe-left">
            {loading && <div>Loading...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            {recipe && (
              <div className="recipe-content row text-white g-3">
                <div className="col-12 col-md-6">
                  <div className="ps-3 pe-3">
                    <Ingredients ingredientGroups={recipe.ingredientGroups} />
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="ps-3 pe-3">
                    <Instructions instructions={recipe.instructions} />
                  </div>
                </div>
              </div>
            )}

            <pre className="recipe-json bg-dark text-white rounded p-3 border border-secondary">{JSON.stringify(recipe, null, 2)}</pre>
          </div>
          <div className="recipe-right p-4">
            <Chat additionalContext={{ recipe }} />
          </div>
        </div>
      </main>
    </>
  );
}


function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" style={{verticalAlign:'middle',display:'block'}}>
      <circle cx="8" cy="8" r="8" fill="#888"/>
      <text x="8" y="12" textAnchor="middle" fontSize="10" fill="#fff" fontFamily="Arial" fontWeight="bold">i</text>
    </svg>
  );
}
