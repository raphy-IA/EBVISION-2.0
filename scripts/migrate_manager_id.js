const { Pool } = require('pg');
require('dotenv').config();

async function migrate() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'Back-EB-Prod',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Information@2025'
    });

    try {
        console.log('Checking for manager_id column in missions table...');
        const checkRes = await pool.query(`
            SELECT count(*) FROM information_schema.columns 
            WHERE table_name='missions' AND column_name='manager_id'
        `);

        if (parseInt(checkRes.rows[0].count) === 0) {
            console.log('Adding manager_id column to missions table...');
            await pool.query(`
                ALTER TABLE missions 
                ADD COLUMN manager_id UUID REFERENCES collaborateurs(id);
            `);
            console.log('Column added successfully.');
        } else {
            console.log('manager_id column already exists.');
        }
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
