const { pool } = require('../../src/utils/database');

/**
 * MIGRATION DES DOUBLONS DE TABLES
 * - hourly_rates → taux_horaires (si données existent)
 * - opportunites → opportunities (migrer données + mettre à jour code)
 */

async function migrateDuplicateTables() {
    const client = await pool.connect();

    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔄 MIGRATION DES TABLES DUPLIQUÉES');
        console.log('='.repeat(80) + '\n');

        await client.query('BEGIN');

        // 1. Migrer hourly_rates → taux_horaires (si données)
        console.log('1️⃣  Migration: hourly_rates → taux_horaires\n');

        const hourlyCount = await client.query('SELECT COUNT(*) as count FROM hourly_rates');
        const hourlyRows = parseInt(hourlyCount.rows[0].count);

        if (hourlyRows > 0) {
            console.log(`   📊 ${hourlyRows} lignes à migrer...`);

            // Vérifier la structure des deux tables
            const hourlyColumns = await client.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'hourly_rates' 
                ORDER BY ordinal_position
            `);

            const tauxColumns = await client.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'taux_horaires' 
                ORDER BY ordinal_position
            `);

            console.log(`   📋 Colonnes hourly_rates: ${hourlyColumns.rows.map(c => c.column_name).join(', ')}`);
            console.log(`   📋 Colonnes taux_horaires: ${tauxColumns.rows.map(c => c.column_name).join(', ')}`);

            console.log(`\n   ⚠️  ATTENTION: Vérifiez manuellement la compatibilité des structures`);
            console.log(`   ℹ️  Migration manuelle requise - structures différentes\n`);
        } else {
            console.log(`   ✅ hourly_rates est vide - peut être supprimée directement\n`);
        }

        // 2. Migrer opportunites → opportunities
        console.log('2️⃣  Migration: opportunites → opportunities\n');

        const oppitesCount = await client.query('SELECT COUNT(*) as count FROM opportunites');
        const oppitesRows = parseInt(oppitesCount.rows[0].count);

        if (oppitesRows > 0) {
            console.log(`   📊 ${oppitesRows} lignes à migrer...`);

            // Récupérer la structure
            const oppitesStructure = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'opportunites' 
                ORDER BY ordinal_position
            `);

            const oppStructure = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'opportunities' 
                ORDER BY ordinal_position
            `);

            console.log(`   📋 Colonnes opportunites (${oppitesStructure.rows.length})`);
            console.log(`   📋 Colonnes opportunities (${oppStructure.rows.length})`);

            // Mapper les colonnes communes
            const oppitesColumns = new Set(oppitesStructure.rows.map(c => c.column_name));
            const oppColumns = new Set(oppStructure.rows.map(c => c.column_name));

            const commonColumns = [...oppitesColumns].filter(col => oppColumns.has(col));

            if (commonColumns.length > 0) {
                console.log(`\n   ✅ ${commonColumns.length} colonnes communes trouvées`);
                console.log(`   📋 Colonnes: ${commonColumns.join(', ')}`);

                // Migrer les données
                const quotedCols = commonColumns.map(c => `"${c}"`).join(', ');

                await client.query(`
                    INSERT INTO opportunities (${quotedCols})
                    SELECT ${quotedCols}
                    FROM opportunites
                    ON CONFLICT DO NOTHING
                `);

                console.log(`   ✅ Données migrées vers opportunities\n`);
            } else {
                console.log(`   ⚠️  Aucune colonne commune - migration manuelle requise\n`);
            }
        } else {
            console.log(`   ✅ opportunites est vide - peut être supprimée directement\n`);
        }

        await client.query('COMMIT');

        console.log('='.repeat(80));
        console.log('✅ MIGRATION TERMINÉE');
        console.log('='.repeat(80) + '\n');

        console.log('📋 PROCHAINES ÉTAPES:\n');
        console.log('1. Mettre à jour Client.js: opportunites → opportunities');
        console.log('2. Mettre à jour csv-importer.js: hourly_rates → taux_horaires');
        console.log('3. Supprimer les anciennes tables après vérification\n');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur:', e.message);
        console.error(e.stack);
    } finally {
        client.release();
        pool.end();
    }
}

migrateDuplicateTables();
