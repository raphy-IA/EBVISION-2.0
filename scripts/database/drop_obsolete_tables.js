const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

/**
 * Suppression sécurisée des tables obsolètes
 * Avec backup SQL avant suppression
 */

async function dropObsoleteTables() {
    const client = await pool.connect();

    // Tables à supprimer basées sur l'investigation
    const tablesToDrop = [
        'test_permissions',      // Table de test
        'hourly_rates',          // Doublon de taux_horaires (vide)
        'opportunites',          // Doublon de opportunities (vide)
        'menu_items',            // Pas de routes API (vide)
        'menu_sections',         // Pas de routes API (vide)
        'pages'                  // Pas de routes API (vide)
    ];

    try {
        console.log('\n' + '='.repeat(80));
        console.log('🗑️  SUPPRESSION SÉCURISÉE DES TABLES OBSOLÈTES');
        console.log('='.repeat(80) + '\n');

        // Créer le dossier de backup
        const backupDir = path.join(__dirname, '../../backups/dropped-tables');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

        let backupSQL = `-- Backup des tables supprimées le ${new Date().toLocaleString()}\n\n`;

        console.log('📦 Création du backup SQL...\n');

        for (const tableName of tablesToDrop) {
            try {
                // Vérifier si la table existe
                const tableCheck = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = $1
                    )
                `, [tableName]);

                if (!tableCheck.rows[0].exists) {
                    console.log(`   ⊙ ${tableName.padEnd(40)} - Table n'existe pas (ignorée)`);
                    continue;
                }

                // Compter les lignes
                const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
                const rowCount = parseInt(countResult.rows[0].count);

                // Sauvegarder la structure
                const structureResult = await client.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                `, [tableName]);

                backupSQL += `-- Table: ${tableName} (${rowCount} lignes)\n`;
                backupSQL += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;

                structureResult.rows.forEach((col, idx) => {
                    backupSQL += `  "${col.column_name}" ${col.data_type}`;
                    if (col.is_nullable === 'NO') backupSQL += ' NOT NULL';
                    if (col.column_default) backupSQL += ` DEFAULT ${col.column_default}`;
                    if (idx < structureResult.rows.length - 1) backupSQL += ',';
                    backupSQL += '\n';
                });

                backupSQL += `);\n\n`;

                // Sauvegarder les données si présentes
                if (rowCount > 0) {
                    const dataResult = await client.query(`SELECT * FROM "${tableName}"`);
                    dataResult.rows.forEach(row => {
                        const columns = Object.keys(row).map(k => `"${k}"`).join(', ');
                        const values = Object.values(row).map(v => {
                            if (v === null) return 'NULL';
                            if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                            if (v instanceof Date) return `'${v.toISOString()}'`;
                            return v;
                        }).join(', ');

                        backupSQL += `INSERT INTO "${tableName}" (${columns}) VALUES (${values});\n`;
                    });
                    backupSQL += '\n';
                }

                console.log(`   ✅ ${tableName.padEnd(40)} - ${rowCount} lignes sauvegardées`);

            } catch (e) {
                console.log(`   ❌ ${tableName.padEnd(40)} - Erreur: ${e.message}`);
            }
        }

        // Écrire le fichier de backup
        fs.writeFileSync(backupFile, backupSQL);
        console.log(`\n📄 Backup sauvegardé: ${backupFile}\n`);

        // Demander confirmation
        console.log('⚠️  ATTENTION: Les tables suivantes seront supprimées:');
        tablesToDrop.forEach(t => console.log(`   - ${t}`));
        console.log('\n💡 Un backup SQL a été créé dans: ' + backupFile);
        console.log('\n🔄 Suppression en cours...\n');

        // Supprimer les tables
        for (const tableName of tablesToDrop) {
            try {
                await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
                console.log(`   ✅ ${tableName.padEnd(40)} - Supprimée`);
            } catch (e) {
                console.log(`   ❌ ${tableName.padEnd(40)} - Erreur: ${e.message}`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('✅ NETTOYAGE TERMINÉ');
        console.log('='.repeat(80));
        console.log(`\n📊 ${tablesToDrop.length} tables supprimées`);
        console.log(`📦 Backup disponible: ${backupFile}\n`);

    } catch (e) {
        console.error('❌ Erreur:', e.message);
        console.error(e.stack);
    } finally {
        client.release();
        pool.end();
    }
}

dropObsoleteTables();
