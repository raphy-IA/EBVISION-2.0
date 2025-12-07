
require('dotenv').config();
const { pool } = require('../src/utils/database');

async function analyzeSchema() {
    const tables = ['companies', 'missions', 'business_units', 'divisions', 'collaborateurs'];

    try {
        for (const table of tables) {
            console.log(`\n=== SCHEMA: ${table} ===`);
            const res = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [table]);

            if (res.rows.length === 0) {
                console.log('Table not found.');
            } else {
                res.rows.forEach(row => {
                    console.log(`${row.column_name} (${row.data_type}, ${row.is_nullable})`);
                });
            }
        }
    } catch (err) {
        console.error('Error analyzing schema:', err);
    } finally {
        await pool.end();
    }
}

analyzeSchema();
