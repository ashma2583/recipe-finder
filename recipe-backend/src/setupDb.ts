import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const createTablesQuery = `
  -- 1. Users Table
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL
  );

  -- 2. Ingredients Table
  CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
  );

  -- 3. Recipes Table
  CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    instructions TEXT,
    image_name VARCHAR(500)
  );

  -- 4. Recipe_Ingredients (Links Recipes to Ingredients)
  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    recipe_id INTEGER REFERENCES recipes(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    PRIMARY KEY (recipe_id, ingredient_id)
  );

  -- 5. Pantry (Links Users to Ingredients they have)
  CREATE TABLE IF NOT EXISTS pantry_items (
    user_id INTEGER REFERENCES users(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    PRIMARY KEY (user_id, ingredient_id)
  );
`;

const seedDataQuery = `
  -- Insert a Test User
  INSERT INTO users (username) VALUES ('test_user') ON CONFLICT DO NOTHING;

  -- Insert Basic Ingredients
  INSERT INTO ingredients (name) VALUES 
    ('Tomato'), ('Onion'), ('Garlic'), ('Pasta'), ('Egg'), ('Cheese'), ('Bacon')
  ON CONFLICT DO NOTHING;

  -- Insert a Recipe: Carbonara
  INSERT INTO recipes (title, instructions) VALUES 
    ('Spaghetti Carbonara', 'Boil pasta. Fry bacon. Mix eggs and cheese. Combine.')
  ON CONFLICT DO NOTHING;
  
  -- Link Ingredients to Carbonara (Assuming IDs: 4=Pasta, 5=Egg, 6=Cheese, 7=Bacon)
  -- Note: In a real app, you look up IDs dynamically. This is just for a quick test.
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id)
  SELECT r.id, i.id FROM recipes r, ingredients i 
  WHERE r.title = 'Spaghetti Carbonara' AND i.name IN ('Pasta', 'Egg', 'Cheese', 'Bacon')
  ON CONFLICT DO NOTHING;
`;

async function setup() {
  try {
    console.log('🏗️ Creating tables...');
    await pool.query(createTablesQuery);
    console.log('✅ Tables created.');

    console.log('🌱 Seeding data...');
    await pool.query(seedDataQuery);
    console.log('✅ Dummy data inserted.');
    
  } catch (err) {
    console.error('❌ Error setting up DB:', err);
  } finally {
    pool.end();
  }
}

setup();