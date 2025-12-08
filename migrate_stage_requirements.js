
require('dotenv').config();
const { pool } = require('./src/utils/database');

async function migrate() {
    console.log('🚀 Starting migration of stage requirements...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get all templates with JSON data
        const res = await client.query('SELECT id, stage_name, required_actions, required_documents FROM opportunity_stage_templates');
        console.log(`📋 Found ${res.rows.length} templates.`);

        let actionsCount = 0;
        let docsCount = 0;

        for (const t of res.rows) {
            // Migrating Actions
            if (Array.isArray(t.required_actions) && t.required_actions.length > 0) {
                for (let i = 0; i < t.required_actions.length; i++) {
                    const actionType = t.required_actions[i];

                    // Check if already exists to be safe
                    const check = await client.query(
                        'SELECT id FROM stage_required_actions WHERE stage_template_id = $1 AND action_type = $2',
                        [t.id, actionType]
                    );

                    if (check.rows.length === 0) {
                        await client.query(
                            'INSERT INTO stage_required_actions (stage_template_id, action_type, is_mandatory, validation_order) VALUES ($1, $2, $3, $4)',
                            [t.id, actionType, true, i + 1]
                        );
                        actionsCount++;
                    }
                }
            }

            // Migrating Documents
            if (Array.isArray(t.required_documents) && t.required_documents.length > 0) {
                for (const docType of t.required_documents) {
                    // Check if already exists
                    const check = await client.query(
                        'SELECT id FROM stage_required_documents WHERE stage_template_id = $1 AND document_type = $2',
                        [t.id, docType]
                    );

                    if (check.rows.length === 0) {
                        await client.query(
                            'INSERT INTO stage_required_documents (stage_template_id, document_type, is_mandatory) VALUES ($1, $2, $3)',
                            [t.id, docType, true]
                        );
                        docsCount++;
                    }
                }
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Migration completed successfully!`);
        console.log(`   - Migrated ${actionsCount} actions.`);
        console.log(`   - Migrated ${docsCount} documents.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
