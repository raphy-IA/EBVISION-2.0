const { pool } = require('../../src/utils/database');

/**
 * Suppression finale des anciennes tables dupliquées
 * À exécuter APRÈS avoir vérifié que le code fonctionne avec les nouvelles tables
 */

async function dropOldDuplicateTables() {
    const client = await pool.connect();

    const tablesToDrop = [
        'hourly_rates',    // Remplacée par taux_horaires
        'opportunites'     // Remplacée par opportunities
    ];

    try {
        console.log('\n' + '='.repeat(80));
        console.log('🗑️  SUPPRESSION DES ANCIENNES TABLES DUPLIQUÉES');
        console.log('='.repeat(80) + '\n');

        console.log('⚠️  ATTENTION: Vérifiez que tout fonctionne avant d\'exécuter ce script!\n');

        for (const tableName of tablesToDrop) {
            try {
                const count = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
                console.log(`   📊 ${tableName.padEnd(25)} - ${count.rows[0].count} lignes`);

                await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
                console.log(`   ✅ ${tableName.padEnd(25)} - Supprimée\n`);
            } catch (e) {
                console.log(`   ❌ ${tableName.padEnd(25)} - Erreur: ${e.message}\n`);
            }
        }

        console.log('='.repeat(80));
        console.log('✅ SUPPRESSION TERMINÉE');
        console.log('='.repeat(80) + '\n');

    } catch (e) {
        console.error('❌ Erreur:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

dropOldDuplicateTables();
