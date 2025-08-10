const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function run(file) {
  const full = path.resolve(__dirname, '..', 'database', 'migrations', file);
  if (!fs.existsSync(full)) {
    console.error('Migration file not found:', full);
    process.exit(1);
  }
  const sql = fs.readFileSync(full, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`);
    const done = await client.query('SELECT 1 FROM migrations WHERE filename = $1', [file]);
    if (done.rows.length > 0) {
      console.log('Already executed:', file);
    } else {
      await client.query(sql);
      await client.query('INSERT INTO migrations(filename) VALUES ($1)', [file]);
      console.log('Executed migration:', file);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
  }
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-single-migration.js <filename.sql>');
  process.exit(1);
}
run(file);


