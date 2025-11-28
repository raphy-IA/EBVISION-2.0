const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkStructure() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns 
            WHERE table_name='fiscal_years' 
            ORDER BY ordinal_position
        `);

        console.log('Structure de fiscal_years:');
        result.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type} (${row.udt_name})`);
        });

    } catch (error) {
        console.error('Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkStructure();
