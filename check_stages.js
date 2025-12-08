
require('dotenv').config();
const { pool } = require('./src/utils/database');

async function check() {
    try {
        console.log('--- Opportunity Stage Templates ---');
        const templates = await pool.query('SELECT id, stage_name, required_actions, required_documents FROM opportunity_stage_templates ORDER BY id');
        templates.rows.forEach(t => {
            console.log(`${t.id}: ${t.stage_name}`);
            console.log(`  Actions (${typeof t.required_actions}): ${JSON.stringify(t.required_actions)}`);
            console.log(`  Docs (${typeof t.required_documents}): ${JSON.stringify(t.required_documents)}`);
        });

        console.log('\n--- Required Actions ---');
        const actions = await pool.query('SELECT * FROM stage_required_actions');
        console.log(`Count: ${actions.rows.length}`);
        actions.rows.forEach(a => console.log(`Stage ${a.stage_template_id}: ${a.action_type} (Mandatory: ${a.is_mandatory})`));

        console.log('\n--- Required Documents ---');
        const docs = await pool.query('SELECT * FROM stage_required_documents');
        console.log(`Count: ${docs.rows.length}`);
        docs.rows.forEach(d => console.log(`Stage ${d.stage_template_id}: ${d.document_type} (Mandatory: ${d.is_mandatory})`));

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
