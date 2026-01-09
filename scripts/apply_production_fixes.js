const cleanupLegacy = require('./database/cleanup_legacy_permissions');
const cleanupObjectives = require('./database/cleanup_objectives');
const seedGranularObjectives = require('./database/seed_granular_objectives');

async function runFixes() {
    console.log('🚀 STARTING PRODUCTION PERMISSION FIXES...\n');

    try {
        console.log('--- STEP 1: Cleaning Legacy Page Permissions ---');
        await cleanupLegacy();
        console.log('✅ STEP 1 COMPLETE\n');

        console.log('--- STEP 2: Cleaning Duplicate Objectives ---');
        await cleanupObjectives();
        console.log('✅ STEP 2 COMPLETE\n');

        console.log('--- STEP 3: Restoring Granular Objectives ---');
        await seedGranularObjectives();
        console.log('✅ STEP 3 COMPLETE\n');

        console.log('🎉 ALL FIXES APPLIED SUCCESSFULLY!');
        process.exit(0);

    } catch (e) {
        console.error('❌ FATAL ERROR DURING FIXES:', e);
        process.exit(1);
    }
}

if (require.main === module) {
    runFixes();
}
