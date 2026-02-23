const { pool } = require('./src/utils/database');
async function checkSchema() {
    try {
        console.log('--- PROSPECTING_CAMPAIGNS ---');
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'prospecting_campaigns' ORDER BY column_name");
        res.rows.forEach(r => console.log(r.column_name));

        console.log('\n--- PROSPECTING_CAMPAIGN_SUMMARY ---');
        const resView = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'prospecting_campaign_summary' ORDER BY column_name");
        resView.rows.forEach(r => console.log(r.column_name));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
checkSchema();
