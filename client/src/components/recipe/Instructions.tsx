import { useState } from 'react';
interface InstructionsProps {
  instructions: Array<{
    heading?: string;
    steps: string[];
  }>;
}

export default function Instructions({ instructions }: InstructionsProps) {
  if (!instructions || instructions.length === 0) return null;
  const [checked, setChecked] = useState<{[k:string]:boolean}>({});
  return (
    <div className="mb-3">
      <h5>Instructions</h5>
      {instructions.map((group, gi) => (
        <div key={gi} className="mb-2">
          {group.heading && <div className="fw-bold mb-1">{group.heading}</div>}
          <div>
            {group.steps.map((step, i) => {
              const key = (group.heading || '') + '_' + step;
              const onChecked = () => setChecked(c => ({...c, [key]:!c[key]}));
              return (
                <div className="form-check mb-1" key={key}>
                  <input type="checkbox" className="form-check-input me-2" checked={!!checked[key]} onChange={onChecked} id={`inst-check-${gi}-${i}`} />
                  <label className="form-check-label" htmlFor={`inst-check-${gi}-${i}`} style={{marginBottom:0}}>{step}</label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
