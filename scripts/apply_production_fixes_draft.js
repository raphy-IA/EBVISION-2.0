const cleanupLegacy = require('./database/cleanup_legacy_permissions');
const cleanupObjectives = require('./database/cleanup_objectives');
const seedGranularObjectives = require('./database/seed_granular_objectives'); // We need to export a function from this file first!

// Helper to run steps sequentially
async function runFixes() {
    console.log('🚀 STARING PRODUCTION PERMISSION FIXES...\n');

    try {
        console.log('--- STEP 1: Cleaning Legacy Page Permissions ---');
        await cleanupLegacy();
        console.log('✅ STEP 1 COMPLETE\n');

        console.log('--- STEP 2: Cleaning Duplicate Objectives ---');
        await cleanupObjectives();
        console.log('✅ STEP 2 COMPLETE\n');

        console.log('--- STEP 3: Restoring Granular Objectives ---');
        // Note: I need to ensure seed_granular_objectives exports a function. 
        // I will assume for now I will edit it or execute it via child_process if it's not exported.
        // But since I control the file, I will modify seed_granular_objectives.js to export its main function first.

        // Actually, let's just use child_process to run them as scripts to ensure clean slate for each
        // But requiring them is better if they are written as modules. 
        // Let's assume they are modules.
        // Wait, I need to check if proper exports exist in the files I created. 
        // cleanup_legacy_permissions.js: "module.exports = cleanupLegacyPermissions;" (Checked in step 863: Yes)
        // cleanup_objectives.js: "module.exports = cleanupObjectives;" (Checked in step 902: Yes)
        // seed_granular_objectives.js: "if (require.main === module) ..." (Checked in step 920: NO EXPORT)

        // I need to update seed_granular_objectives.js to export its function.
    } catch (e) {
        console.error('❌ FATAL ERROR DURING FIXES:', e);
        process.exit(1);
    }
}
