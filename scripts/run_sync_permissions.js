const path = require('path');
const { pool } = require('../src/utils/database');
const { syncPermissions, scanHtmlFiles, extractMenuStructure } = require('../src/routes/sync-permissions');

async function run() {
    try {
        console.log('🔄 Starting permission sync...');

        const publicDir = path.join(__dirname, '../public');
        const sidebarPath = path.join(publicDir, 'template-modern-sidebar.html');

        console.log('Scanning HTML files...');
        const htmlFiles = await scanHtmlFiles(publicDir);

        console.log('Extracting menu structure...');
        const menuStructure = await extractMenuStructure(sidebarPath);

        console.log('Syncing permissions...');
        const stats = await syncPermissions(htmlFiles, menuStructure);

        console.log('✅ Sync complete:', stats);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

run();
