const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'eb_vision_2_0',
    password: process.env.DB_PASSWORD || 'root',
    port: process.env.DB_PORT || 5432,
});

async function simulateApiCall() {
    try {
        console.log('--- Simulating API Call for Individual Objectives ---');

        // 1. Get Fiscal Year 2025
        const fyRes = await pool.query("SELECT id FROM fiscal_years WHERE annee = 2025");
        if (fyRes.rows.length === 0) {
            console.log('❌ Fiscal Year 2025 not found!');
            return;
        }
        const fyId = fyRes.rows[0].id;
        console.log(`✅ Fiscal Year 2025 found: ${fyId}`);

        // 2. Collaborator ID
        const collaboratorId = 'ad0482c3-9f16-450a-8277-b7908154a73c';

        // 3. Execute the query exactly as it is in Objective.js
        const sql = `
        SELECT io.id, io.description 
        FROM individual_objectives io
        LEFT JOIN division_objectives do ON io.division_objective_id = do.id
        LEFT JOIN business_unit_objectives buo ON do.business_unit_objective_id = buo.id
        LEFT JOIN global_objectives go ON buo.global_objective_id = go.id
        WHERE io.collaborator_id = $1 
        AND (go.fiscal_year_id = $2 OR io.fiscal_year_id = $2)
        `;
        const result = await pool.query(sql, [collaboratorId, fyId]);

        console.log(`📊 API would return ${result.rows.length} objectives.`);
        console.log(JSON.stringify(result.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

simulateApiCall();
