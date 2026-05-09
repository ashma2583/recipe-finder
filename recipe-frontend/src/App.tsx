import { useEffect, useState } from 'react';
import './App.css';
import CameraCapture from './CameraCapture';

interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string;
  matchPercentage: string;
  image_name: string | null;
}

type Theme = 'dark' | 'light';

function App() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
  const [currentIng, setCurrentIng] = useState('');
  const [pantry, setPantry] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const recipesPerPage = 10;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const addIngredient = () => {
    const cleanIng = currentIng.trim();
    if (cleanIng && !pantry.includes(cleanIng)) {
      setPantry([...pantry, cleanIng]);
      setCurrentIng('');
    }
  };

  const removeIngredient = (ing: string) => {
    setPantry(pantry.filter(i => i !== ing));
  };

  const detectFromFile = async (file: File) => {
    setDetecting(true);
    setDetectMsg(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('http://localhost:3001/api/detect', { method: 'POST', body: form });
      if (!res.ok) throw new Error(`server returned ${res.status}`);
      const data: { ingredients: string[] } = await res.json();
      const detected = data.ingredients ?? [];
      if (detected.length === 0) {
        setDetectMsg({ tone: 'warn', text: 'No ingredients detected. Try a clear photo of a banana, apple, broccoli, carrot, orange, pizza, sandwich, or hot dog.' });
      } else {
        setPantry(prev => Array.from(new Set([...prev, ...detected])));
        setDetectMsg({ tone: 'ok', text: `Added: ${detected.join(', ')}` });
      }
    } catch (err) {
      setDetectMsg({ tone: 'err', text: `Detection failed: ${(err as Error).message}` });
    } finally {
      setDetecting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await detectFromFile(file);
    e.target.value = '';
  };

  const searchRecipes = async () => {
    if (pantry.length === 0) return;
    try {
      const queryString = pantry.join(',');
      const res = await fetch(`http://localhost:3001/api/search?ingredients=${queryString}`);
      const data = await res.json();
      setRecipes(data);
      setCurrentPage(1);
      setHasSearched(true);
    } catch (err) {
      console.error("Failed to connect to backend", err);
    }
  };

  const indexOfLastRecipe = currentPage * recipesPerPage;
  const indexOfFirstRecipe = indexOfLastRecipe - recipesPerPage;
  const currentRecipes = recipes.slice(indexOfFirstRecipe, indexOfLastRecipe);
  const totalPages = Math.ceil(recipes.length / recipesPerPage);

  const placeholderGradient = (title: string) => {
    const hash = Array.from(title).reduce((a, c) => a + c.charCodeAt(0), 0);
    const hue = hash % 360;
    return `linear-gradient(135deg, hsl(${hue}, 50%, 35%), hsl(${(hue + 60) % 360}, 55%, 25%))`;
  };

  return (
    <div className="container">
      <header className="app-header">
        <div className="brand">
          <h1>Recipe Finder</h1>
          <p className="subtitle">Match what's in your pantry to thousands of recipes.</p>
        </div>
        <button
          className="theme-toggle"
          onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>

      <section className="card pantry-card">
        <div className="card-head">
          <h2>Your Pantry</h2>
          <span className="count-pill">{pantry.length} {pantry.length === 1 ? 'item' : 'items'}</span>
        </div>

        <div className="input-group">
          <input
            type="text"
            value={currentIng}
            onChange={(e) => setCurrentIng(e.target.value)}
            placeholder="Type an ingredient — e.g. tomato"
            onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
          />
          <button className="add-btn" onClick={addIngredient}>Add</button>
        </div>

        <div className="divider"><span>or</span></div>

        <div className="upload-row">
          <div className="upload-buttons">
            <label className={`upload-btn ${detecting ? 'is-loading' : ''}`}>
              {detecting ? 'Detecting…' : '📷 Upload photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={detecting}
                style={{ display: 'none' }}
              />
            </label>
            <button
              type="button"
              className="upload-btn"
              onClick={() => setCameraOpen(true)}
              disabled={detecting}
            >
              📹 Use camera
            </button>
          </div>
          {detectMsg && (
            <p className={`detect-msg detect-${detectMsg.tone}`}>{detectMsg.text}</p>
          )}
        </div>

        {pantry.length === 0 ? (
          <p className="empty-hint">Add ingredients above or upload a fridge photo to start.</p>
        ) : (
          <div className="tags">
            {pantry.map(ing => (
              <span key={ing} className="tag" onClick={() => removeIngredient(ing)} title="Remove">
                {ing} <span className="tag-x">✕</span>
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="action-area">
        <button
          className="search-btn"
          onClick={searchRecipes}
          disabled={pantry.length === 0}
        >
          Find Recipes
        </button>
        <p className="engine-note">Ranked by a C++ matching engine</p>
      </div>

      {hasSearched && recipes.length === 0 && (
        <p className="empty-hint big">No recipes found. Try adding more ingredients.</p>
      )}

      <div className="results">
        {currentRecipes.map((r, idx) => {
          const score = parseInt(r.matchPercentage);
          const badgeClass = score >= 70 ? 'badge-high' : score >= 40 ? 'badge-mid' : 'badge-low';
          return (
            <div key={idx} className="recipe-card clickable" onClick={() => setSelectedRecipe(r)}>
              <div className={`score-badge ${badgeClass}`}>{r.matchPercentage}</div>
              <h3>{r.title}</h3>
              <p className="recipe-meta">{r.ingredients.length} ingredients</p>
              <p className="recipe-ings">
                {r.ingredients.slice(0, 8).join(' · ')}
                {r.ingredients.length > 8 && ' …'}
              </p>
            </div>
          );
        })}
      </div>

      {recipes.length > 0 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Previous</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
        </div>
      )}

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={detectFromFile}
      />

      {selectedRecipe && (
        <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedRecipe(null)} aria-label="Close">×</button>

            <div className="modal-hero">
              {selectedRecipe.image_name ? (
                <img
                  src={`/food_images/${selectedRecipe.image_name}`}
                  alt={selectedRecipe.title}
                  className="modal-img"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    img.parentElement!.classList.add('hero-fallback');
                    img.parentElement!.style.background = placeholderGradient(selectedRecipe.title);
                  }}
                />
              ) : (
                <div
                  className="hero-fallback"
                  style={{ background: placeholderGradient(selectedRecipe.title) }}
                >
                  <span>{selectedRecipe.title.split(' ').slice(0, 3).map(w => w[0]).join('')}</span>
                </div>
              )}
              <h2 className="modal-title">{selectedRecipe.title}</h2>
            </div>

            <div className="modal-body">
              <div className="ingredients-section">
                <h3>Ingredients <span className="muted">({selectedRecipe.ingredients.length})</span></h3>
                <ul>
                  {selectedRecipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                </ul>
              </div>

              <div className="instructions-section">
                <h3>Instructions</h3>
                <p>{selectedRecipe.instructions}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
