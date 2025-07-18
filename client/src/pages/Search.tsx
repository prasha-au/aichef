import './Search.css';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Chat from '../components/Chat';
import { searchForRecipes, type SearchRecipesResult } from '../firebase';

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<SearchRecipesResult[]|undefined>();
  const q = searchParams.get('q') || '';
  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }
    setResults(undefined);
    searchForRecipes({ query: q })
      .then(r => setResults(r.data))
      .catch(() => setResults([]));
  }, [q]);
  return (
    <>
      <div className="background-div" />
      <main className="search-page container-fluid p-4" style={{height:'100vh'}}>
        <div className="row h-100" style={{gap:'2rem'}}>
          <div className="col d-flex flex-column" style={{minWidth:0}}>
            <div className="search-results flex-grow-1 overflow-auto d-flex flex-column mt-3">
              {results === undefined && <div>Loading...</div>}
              {(results ?? []).map((r, i) => (
                <div
                  className="search-result card bg-dark text-white mb-3 p-3 border-secondary"
                  key={i}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/recipe?url=${encodeURIComponent(r.url)}`)}
                >
                  <div className="title h5 mb-1">{r.title} <small className="url text-secondary">{r.url}</small></div>
                  <div className="summary text-light small">{r.summary}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-auto h-100" style={{width:700}}>
            <Chat />
          </div>
        </div>
      </main>
    </>
  );
}
