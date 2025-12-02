const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'eb_vision_2',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function fixTimeSheetLinks() {
    try {
        const approvedSheet = 'b2b2edb5-78b1-4a9a-867a-13bc279fc559';
        const wrongSheet = '21341321-8984-45e2-b7a9-2990dfa4b012';

        console.log('--- CORRECTION DU LIEN time_sheet_id ---');

        // 1. Vérifier les entrées à corriger
        const checkRes = await pool.query(`
            SELECT COUNT(*) as count
            FROM time_entries
            WHERE time_sheet_id = $1
        `, [wrongSheet]);

        console.log(`Entrées à corriger: ${checkRes.rows[0].count}`);

        // 2. Corriger le lien
        const updateRes = await pool.query(`
            UPDATE time_entries
            SET time_sheet_id = $1
            WHERE time_sheet_id = $2
        `, [approvedSheet, wrongSheet]);

        console.log(`✅ ${updateRes.rowCount} entrées corrigées !`);

        // 3. Vérifier le résultat
        const verifyRes = await pool.query(`
            SELECT te.id, te.heures, ts.status
            FROM time_entries te
            JOIN time_sheets ts ON te.time_sheet_id = ts.id
            WHERE ts.id = $1
        `, [approvedSheet]);

        console.log('\nEntrées maintenant liées à la feuille approuvée:');
        console.log(JSON.stringify(verifyRes.rows, null, 2));

    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        await pool.end();
    }
}

fixTimeSheetLinks();
