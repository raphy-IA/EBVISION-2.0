
require('dotenv').config();
const { pool } = require('./src/utils/database');

async function cleanup() {
    console.log('🧹 Starting cleanup of ghost data...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const deletedActions = await client.query("DELETE FROM opportunity_actions WHERE description LIKE 'Action requise:%'");
        console.log(`✅ Deleted ${deletedActions.rowCount} ghost actions.`);

        const deletedDocs = await client.query("DELETE FROM opportunity_documents WHERE file_path IS NULL");
        console.log(`✅ Deleted ${deletedDocs.rowCount} ghost documents.`);

        await client.query('COMMIT');
        console.log('Cleanup completed successfully.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Cleanup failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

cleanup();
