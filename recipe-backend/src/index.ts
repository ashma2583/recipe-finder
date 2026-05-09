import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import 'dotenv/config';
import { createRequire } from 'module';
import multer from 'multer';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import path from 'path';
import fs from 'fs/promises';

const require = createRequire(import.meta.url);
const cppMatcher = require('../build/Release/matcher.node');

const app = express();
app.use(cors());
const port = 3001;

const upload = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname) || '.jpg'}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

const PYTHON_BIN = process.env.PYTHON_PATH || 'python';
const DETECT_SCRIPT = path.resolve('detect.py');

app.get('/', (req, res) => {
  res.send('Welcome to the Recipe Finder API! Try /api/health to check the database.');
});

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const time = await client.query('SELECT NOW()');
    client.release();

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
    const myPantry = ["Tomato", "Garlic", "Pasta", "Onion"];
    const recipeIngredients = ["Pasta", "Tomato", "Basil", "Garlic", "Olive Oil"];

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
      SELECT
        r.title,
        r.instructions,
        r.image_name,
        ARRAY_AGG(i.name) AS all_ingredients
      FROM recipes r
      JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      JOIN ingredients i ON ri.ingredient_id = i.id
      GROUP BY r.id, r.title, r.instructions, r.image_name;
    `);

    const recipesWithScores = result.rows.map((row: any) => {
      const score = cppMatcher.calculateMatch(userPantry, row.all_ingredients);
      return {
        title: row.title,
        instructions: row.instructions,
        ingredients: row.all_ingredients,
        matchScore: score,
        matchPercentage: (score * 100).toFixed(0) + '%',
        image_name: row.image_name
      };
    });

    recipesWithScores.sort((a, b) => b.matchScore - a.matchScore);
    const top50 = recipesWithScores.slice(0, 50);

    res.json(top50);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

app.post('/api/detect', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const imagePath = req.file.path;
  try {
    const detected = await new Promise<string[]>((resolve, reject) => {
      const proc = spawn(PYTHON_BIN, [DETECT_SCRIPT, imagePath]);
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code !== 0) return reject(new Error(`detect.py exited ${code}: ${stderr}`));
        try {
          const lastLine = stdout.trim().split('\n').filter(Boolean).pop() || '[]';
          resolve(JSON.parse(lastLine));
        } catch (e) {
          reject(new Error(`Bad detect.py output: ${stdout}`));
        }
      });
    });

    res.json({ ingredients: detected });
  } catch (err) {
    console.error('detect failed:', err);
    res.status(500).json({ error: 'Detection failed', details: (err as Error).message });
  } finally {
    fs.unlink(imagePath).catch(() => {});
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
