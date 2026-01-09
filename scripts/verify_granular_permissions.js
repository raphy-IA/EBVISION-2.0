const { pool } = require('../src/utils/database');

// List of expected granular permissions
const EXPECTED_PERMISSIONS = [
    // Config
    'config.view', 'config.edit', 'config.manage_permissions', 'config.admin',

    // Dashboard
    'dashboard.view', 'dashboard:read', 'dashboard_analytics:read',

    // Reports
    'reports.view', 'reports.create',

    // Campaigns
    'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.delete', 'campaigns.validate', 'campaigns.execute',

    // Objectives (Restored)
    'objectives.global.view', 'objectives.global.distribute',
    'objectives.bu.view', 'objectives.bu.edit', 'objectives.bu.distribute',
    'objectives.division.view', 'objectives.division.edit', 'objectives.division.distribute',
    'objectives.individual.view', 'objectives.individual.edit'
];

async function verifyGranularPermissions() {
    console.log('🔍 Verifying presence of granular permissions...\n');
    const client = await pool.connect();

    try {
        const found = [];
        const missing = [];

        for (const code of EXPECTED_PERMISSIONS) {
            const res = await client.query('SELECT 1 FROM permissions WHERE code = $1', [code]);
            if (res.rows.length > 0) {
                found.push(code);
            } else {
                missing.push(code);
            }
        }

        console.log(`✅ Found: ${found.length}`);
        if (found.length > 0) {
            console.log(JSON.stringify(found, null, 2));
        }

        console.log(`\n❌ Missing: ${missing.length}`);
        if (missing.length > 0) {
            console.log(JSON.stringify(missing, null, 2));
        }

    } catch (e) {
        console.error('❌ Error during verification:', e);
    } finally {
        client.release();
        pool.end();
    }
}

// Execute if run directly
if (require.main === module) {
    verifyGranularPermissions();
}
