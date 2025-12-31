import { useState } from 'react';
import './App.css';

// Define the shape of a Recipe object coming from the API
interface Recipe {
  title: string;
  ingredients: string[];
  matchPercentage: string;
}

function App() {
  // State 1: The current text in the input box
  const [currentIng, setCurrentIng] = useState('');
  
  // State 2: The list of ingredients the user has added (The "Pantry")
  const [pantry, setPantry] = useState<string[]>([]);
  
  // State 3: The results back from the C++ Engine
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Helper: Add ingredient to pantry
  const addIngredient = () => {
    const cleanIng = currentIng.trim(); // Removes leading/trailing spaces
    if (cleanIng && !pantry.includes(cleanIng)) {
      setPantry([...pantry, cleanIng]);
      setCurrentIng('');
    }
  };

  // Helper: Remove ingredient
  const removeIngredient = (ing: string) => {
    setPantry(pantry.filter(i => i !== ing));
  };

  // API Call: Send pantry to Backend -> C++ Engine -> Database
  const searchRecipes = async () => {
    if (pantry.length === 0) return;

    // Create the query string: ?ingredients=Tomato,Pasta,Garlic
    const queryString = pantry.join(',');
    
    try {
      const res = await fetch(`http://localhost:3001/api/search?ingredients=${queryString}`);
      const data = await res.json();
      setRecipes(data);
    } catch (err) {
      console.error("Failed to connect to backend", err);
    }
  };

  return (
    <div className="container">
      <h1>🍅 C++ Recipe Matcher</h1>
      
      {/* SECTION 1: The Pantry */}
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

      {/* SECTION 2: The Action */}
      <div className="action-area">
        <button className="search-btn" onClick={searchRecipes}>
          Find Recipes (Run C++ Engine)
        </button>
      </div>

      {/* SECTION 3: The Results */}
      <div className="results">
        {recipes.map((r, idx) => (
          <div key={idx} className="recipe-card">
            <div className="score-badge" style={{
              backgroundColor: parseInt(r.matchPercentage) > 50 ? '#4caf50' : '#ff9800'
            }}>
              {r.matchPercentage} Match
            </div>
            <h3>{r.title}</h3>
            <p><strong>Needs:</strong> {r.ingredients.join(', ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;