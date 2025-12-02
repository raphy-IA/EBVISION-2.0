const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'eb_vision_2',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function checkSheets() {
    try {
        console.log('--- LISTE DES FEUILLES DE TEMPS ---');

        const res = await pool.query(`
            SELECT 
                ts.id,
                ts.week_start,
                ts.week_end,
                ts.status,
                ts.created_at,
                ts.updated_at,
                u.nom,
                u.prenom,
                (SELECT COUNT(*) FROM time_entries te WHERE te.time_sheet_id = ts.id) as entry_count
            FROM time_sheets ts
            JOIN users u ON ts.user_id = u.id
            ORDER BY ts.created_at DESC
            LIMIT 10
        `);

        console.log('\nDernières feuilles de temps:');
        console.table(res.rows);

        // Vérifier les approbations
        const approvals = await pool.query(`
            SELECT 
                tsa.id,
                tsa.time_sheet_id,
                tsa.action,
                tsa.created_at,
                ts.status as current_sheet_status
            FROM time_sheet_approvals tsa
            JOIN time_sheets ts ON tsa.time_sheet_id = ts.id
            ORDER BY tsa.created_at DESC
            LIMIT 5
        `);

        console.log('\nDernières approbations:');
        console.table(approvals.rows);

    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        await pool.end();
    }
}

checkSheets();
