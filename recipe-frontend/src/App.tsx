import { useState } from 'react';
import './App.css';

interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string;
  matchPercentage: string;
  image_name: string | null; // Optional for now
}

function App() {
  const [currentIng, setCurrentIng] = useState('');
  const [pantry, setPantry] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null); // NEW: Track clicked recipe

  const recipesPerPage = 10;

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

  const searchRecipes = async () => {
    if (pantry.length === 0) return;
    try {
      const queryString = pantry.join(',');
      const res = await fetch(`http://localhost:3001/api/search?ingredients=${queryString}`);
      const data = await res.json();
      setRecipes(data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to connect to backend", err);
    }
  };

  const indexOfLastRecipe = currentPage * recipesPerPage;
  const indexOfFirstRecipe = indexOfLastRecipe - recipesPerPage;
  const currentRecipes = recipes.slice(indexOfFirstRecipe, indexOfLastRecipe);
  const totalPages = Math.ceil(recipes.length / recipesPerPage);

  return (
    <div className="container">
      <h1>🍅 C++ Recipe Matcher</h1>
      
      {/* 1. Build Pantry */}
      <div className="card">
        <h2>1. Build Your Pantry</h2>
        <div className="input-group">
          <input 
            type="text" 
            value={currentIng}
            onChange={(e) => setCurrentIng(e.target.value)}
            placeholder="e.g. Tomato"
            onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
          />
          <button onClick={addIngredient}>Add</button>
        </div>
        <div className="tags">
          {pantry.map(ing => (
            <span key={ing} className="tag" onClick={() => removeIngredient(ing)}>
              {ing} ✕
            </span>
          ))}
        </div>
      </div>

      {/* 2. Action */}
      <div className="action-area">
        <button className="search-btn" onClick={searchRecipes}>
          Find Recipes (Run C++ Engine)
        </button>
      </div>

      {/* 3. Results - NOW CLICKABLE */}
      <div className="results">
        {currentRecipes.map((r, idx) => (
          <div 
            key={idx} 
            className="recipe-card clickable" 
            onClick={() => setSelectedRecipe(r)} // NEW: Click handler
          >
            <div className="score-badge" style={{
              backgroundColor: parseInt(r.matchPercentage) > 50 ? '#4caf50' : '#ff9800'
            }}>
              {r.matchPercentage} Match
            </div>
            <h3>{r.title}</h3>
            <p><strong>Needs:</strong> {r.ingredients.slice(0, 10).join(', ')} {r.ingredients.length > 10 && '...'}</p>
          </div>
        ))}
      </div>

      {/* 4. Pagination */}
      {recipes.length > 0 && (
        <div className="pagination">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Previous</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Next</button>
        </div>
      )}

      {/* 5. THE MODAL (Popup) */}
      {selectedRecipe && (
        <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedRecipe(null)}>×</button>
            
            {/* Image Placeholder */}
            <div className="modal-header">
              <h2>{selectedRecipe.title}</h2>
              
              {/* IMAGE LOGIC */}
              <img 
                src={selectedRecipe.image_name 
                  ? `/food_images/${selectedRecipe.image_name}` 
                  : "https://via.placeholder.com/600x300?text=No+Image+Available"
                } 
                alt={selectedRecipe.title} 
                className="modal-img"
                onError={(e) => {
                  // Fallback if the specific JPG is missing
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/600x300?text=Image+Not+Found";
                }}
              />
            </div>

            <div className="modal-body">
              <div className="ingredients-section">
                <h3>Ingredients</h3>
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