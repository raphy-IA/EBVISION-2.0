const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'eb_vision_2',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function checkApprovals() {
    try {
        console.log('--- VÉRIFICATION DES APPROBATIONS ---');

        // 1. Vérifier s'il y a des approbations dans la base
        const approvalsRes = await pool.query(`
            SELECT 
                tsa.id,
                tsa.action,
                tsa.created_at,
                ts.id as sheet_id,
                ts.status as sheet_status
            FROM time_sheet_approvals tsa
            JOIN time_sheets ts ON tsa.time_sheet_id = ts.id
            ORDER BY tsa.created_at DESC
            LIMIT 10
        `);

        console.log(`\n1. Dernières approbations (${approvalsRes.rows.length}):`);

        const output = {
            approvals: approvalsRes.rows,
            analysis: []
        };

        if (approvalsRes.rows.length === 0) {
            output.analysis.push('❌ Aucune approbation trouvée dans la base de données !');
            output.analysis.push('Cela signifie que le bouton de validation ne crée pas d\'enregistrement.');
        } else {
            output.analysis.push(`✅ ${approvalsRes.rows.length} approbations trouvées.`);

            // Vérifier la cohérence entre action et status
            approvalsRes.rows.forEach(row => {
                const expectedStatus = row.action === 'approve' ? 'approved' : 'rejected';
                if (row.sheet_status !== expectedStatus) {
                    output.analysis.push(`⚠️ Incohérence: Approbation ${row.id} a action='${row.action}' mais le timesheet a status='${row.sheet_status}' (attendu: '${expectedStatus}')`);
                }
            });
        }

        // 2. Vérifier les feuilles de temps par statut
        const statusRes = await pool.query(`
            SELECT status, COUNT(*) as count
            FROM time_sheets
            GROUP BY status
        `);

        output.status_counts = statusRes.rows;

        fs.writeFileSync('approval_diagnostic.json', JSON.stringify(output, null, 2));
        console.log('\nRésultat écrit dans approval_diagnostic.json');

    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        await pool.end();
    }
}

checkApprovals();
