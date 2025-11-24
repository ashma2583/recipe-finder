import express from 'express';
import { Pool } from 'pg'; // Use Pool for better connection management
import 'dotenv/config'; // Load environment variables

const app = express();
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});