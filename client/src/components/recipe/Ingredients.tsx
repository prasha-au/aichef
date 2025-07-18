import type { Ingredient } from '../../firebase';
import { useState } from 'react';
import { useAiChat } from '../../ai-chat';

interface IngredientsProps {
  ingredientGroups: Array<{
    heading?: string;
    ingredients: Ingredient[];
  }>;
}


function checkboxKey(group: IngredientsProps['ingredientGroups'][number], ingredient: Ingredient) {
  return ((group.heading || '') + '_' + ingredient.name).toLowerCase();
}

export default function Ingredients({ ingredientGroups }: IngredientsProps) {
  const [checked, setChecked] = useState<{[k:string]:boolean}>({});
  const [, , , submitChatMessage] = useAiChat();
  return (
    <div className="mb-3">
      <h5>Ingredients</h5>
      {ingredientGroups.map((group, gi) => (
        <div key={gi} className="mb-2">
          {group.heading && <div className="fw-bold mb-1">{group.heading}</div>}
          <div>
            {group.ingredients.map((ing, i) => {
              const key = checkboxKey(group, ing);
              const toggleChecked = () => setChecked(c => ({...c, [key]:!c[key]}));
              const handleSub = () => submitChatMessage(`I want to substitute ${ing.name}`);
              return (
                <div className="form-check align-items-center mb-1" key={i}>
                  <input type="checkbox" className="form-check-input me-2" checked={!!checked[key]} onChange={toggleChecked} id={`ing-check-${gi}-${i}`} />
                  <label className="form-check-label text-white" htmlFor={`ing-check-${gi}-${i}`} style={{marginBottom:0}}>
                    {ing.amount !== null ? <>{ing.amount} </> : null}
                    {ing.unit !== 'each' ? <>{ing.unit} </> : null}
                    {ing.name}
                    {ing.notes ? <span className="text-secondary"> — {ing.notes}</span> : null}
                  </label>
                  <button type="button" onClick={handleSub} title="Suggest substitute" className="btn btn-link btn-icon p-0 ms-2" tabIndex={0}>
                    <RecycleIcon />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecycleIcon() {
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <path d="M6 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 4l4 3-4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 15H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 18l-4-3 4-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
