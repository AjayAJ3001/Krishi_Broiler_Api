require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: true,
    ca: process.env.DB_CA,
    } : false
});

const connectDB = async () => {
  try {
    await pool.connect();
    console.log('Connected to PostgreSQL database');
  } catch (err) {
    console.error('Database connection error:', err);
  }
};

const query = async (qry, params=[]) => {
  try {
    const res = await pool.query(qry, params);
    return res.rows;
  } catch (err) {
    console.error("Query Exec Error: \n", err);
  }
}

module.exports = { pool, connectDB, query };
