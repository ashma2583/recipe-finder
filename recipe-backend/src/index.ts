import express from 'express';
import { Pool } from 'pg'; // Use Pool for better connection management
import cors from 'cors';
import 'dotenv/config'; // Load environment variables
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cppMatcher = require('../build/Release/matcher.node');

const app = express();
app.use(cors());
const port = 3001;

app.get('/', (req, res) => {
  res.send('Welcome to the Recipe Finder API! Try /api/health to check the database.');
});

// Set up the PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  ssl: { // AWS RDS often requires SSL
    rejectUnauthorized: false 
  }
});

// test route to check DB connection
app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const time = await client.query('SELECT NOW()'); // Simple query
    client.release(); // Release the client back to the pool

    res.json({
      message: 'Server is healthy!',
      db_time: time.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({
      message: 'Error connecting to database',
      error: (err as Error).message,
    });
  }
});

app.get('/api/test-cpp', (req, res) => {
  try {
    // Simulated data
    const myPantry = ["Tomato", "Garlic", "Pasta", "Onion"];
    const recipeIngredients = ["Pasta", "Tomato", "Basil", "Garlic", "Olive Oil"];

    // Call the C++ function
    // (Pantry has 3 out of the 5 ingredients needed)
    const score = cppMatcher.calculateMatch(myPantry, recipeIngredients);

    res.json({
      engine: "C++ High-Performance Matcher",
      pantry: myPantry,
      recipe_needs: recipeIngredients,
      match_score: (score * 100).toFixed(0) + "% match"
    });
  } catch (err) {
    res.status(500).json({ error: "Matching failed", details: err });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const ingredientsParam = req.query.ingredients as string;
    if (!ingredientsParam) return res.status(400).json({ error: 'No ingredients' });
    
    const userPantry = ingredientsParam.split(',');

    const result = await pool.query(`
      SELECT r.title, r.instructions, ARRAY_AGG(i.name) AS all_ingredients 
      FROM recipes r
      JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      JOIN ingredients i ON ri.ingredient_id = i.id
      GROUP BY r.id, r.title, r.instructions;
    `);

    const recipesWithScores = result.rows.map((row: any) => {
      const score = cppMatcher.calculateMatch(userPantry, row.all_ingredients);
      return {
        title: row.title,
        instructions: row.instructions,
        ingredients: row.all_ingredients,
        matchScore: score,
        matchPercentage: (score * 100).toFixed(0) + '%'
      };
    });

    // sort by highest score
    recipesWithScores.sort((a, b) => b.matchScore - a.matchScore);

    // top 50
    const top50 = recipesWithScores.slice(0, 50);

    res.json(top50);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});