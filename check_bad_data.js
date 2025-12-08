
require('dotenv').config();
const { pool } = require('./src/utils/database');

async function check() {
    try {
        console.log('--- Ghost Actions ---');
        const ghostActions = await pool.query("SELECT id, action_type, description, performed_at FROM opportunity_actions WHERE description LIKE 'Action requise:%'");
        console.log(`Found ${ghostActions.rows.length} ghost actions.`);
        if (ghostActions.rows.length > 0) {
            console.log('Sample:', ghostActions.rows[0]);
        }

        console.log('\n--- Ghost Documents ---');
        const ghostDocs = await pool.query("SELECT id, document_type, file_name, file_path FROM opportunity_documents WHERE file_path IS NULL");
        console.log(`Found ${ghostDocs.rows.length} ghost documents.`);
        if (ghostDocs.rows.length > 0) {
            console.log('Sample:', ghostDocs.rows[0]);
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
