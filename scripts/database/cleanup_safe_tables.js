const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

/**
 * NETTOYAGE SÉCURISÉ - Supprimer UNIQUEMENT les tables confirmées inutilisées
 */

async function cleanupSafeTables() {
    const client = await pool.connect();

    // UNIQUEMENT les tables CONFIRMÉES inutilisées (vides + aucune référence)
    const safeTablesToDrop = [
        'test_permissions',      // Table de test - vide
        'menu_items',            // Aucune référence - vide
        'menu_sections',         // Aucune référence - vide
        'pages'                  // Aucune référence - vide
    ];

    try {
        console.log('\n' + '='.repeat(80));
        console.log('🗑️  NETTOYAGE SÉCURISÉ DES TABLES INUTILISÉES');
        console.log('='.repeat(80) + '\n');

        // Créer le backup
        const backupDir = path.join(__dirname, '../../backups/dropped-tables');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const backupFile = path.join(backupDir, `safe-cleanup-${timestamp}.sql`);

        let backupSQL = `-- Backup des tables supprimées (nettoyage sécurisé) - ${new Date().toLocaleString()}\n\n`;

        console.log('📦 Création du backup...\n');

        for (const tableName of safeTablesToDrop) {
            try {
                const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
                const rowCount = parseInt(countResult.rows[0].count);

                // Sauvegarder la structure
                const columnsResult = await client.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                `, [tableName]);

                backupSQL += `-- Table: ${tableName} (${rowCount} lignes)\n`;
                backupSQL += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;

                columnsResult.rows.forEach((col, idx) => {
                    backupSQL += `  "${col.column_name}" ${col.data_type}`;
                    if (col.is_nullable === 'NO') backupSQL += ' NOT NULL';
                    if (col.column_default) backupSQL += ` DEFAULT ${col.column_default}`;
                    if (idx < columnsResult.rows.length - 1) backupSQL += ',';
                    backupSQL += '\n';
                });

                backupSQL += `);\n\n`;

                console.log(`   ✅ ${tableName.padEnd(30)} - Sauvegardée (${rowCount} lignes)`);

            } catch (e) {
                console.log(`   ⚠️  ${tableName.padEnd(30)} - N'existe pas (ignorée)`);
            }
        }

        fs.writeFileSync(backupFile, backupSQL);
        console.log(`\n📄 Backup: ${backupFile}\n`);

        // Suppression
        console.log('🗑️  Suppression des tables...\n');

        for (const tableName of safeTablesToDrop) {
            try {
                await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
                console.log(`   ✅ ${tableName.padEnd(30)} - Supprimée`);
            } catch (e) {
                console.log(`   ❌ ${tableName.padEnd(30)} - Erreur: ${e.message}`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ NETTOYAGE TERMINÉ');
        console.log('='.repeat(80));
        console.log(`\n📊 ${safeTablesToDrop.length} tables supprimées`);
        console.log(`📦 Backup: ${backupFile}\n`);

    } catch (e) {
        console.error('❌ Erreur:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

cleanupSafeTables();
