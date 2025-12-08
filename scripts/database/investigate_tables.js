const { pool } = require('../../src/utils/database');

async function investigateTables() {
    const client = await pool.connect();

    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔍 INVESTIGATION DES TABLES SUSPECTES');
        console.log('='.repeat(80) + '\n');

        // 1. opportunities vs opportunites
        console.log('1️⃣  OPPORTUNITIES vs OPPORTUNITES\n');

        const oppResult = await client.query('SELECT COUNT(*) as count FROM opportunities');
        const oppitesResult = await client.query('SELECT COUNT(*) as count FROM opportunites');

        console.log(`   📊 opportunities:  ${oppResult.rows[0].count} lignes`);
        console.log(`   📊 opportunites:   ${oppitesResult.rows[0].count} lignes`);

        if (parseInt(oppResult.rows[0].count) > 0) {
            const sample = await client.query('SELECT id, nom, created_at FROM opportunities ORDER BY created_at DESC LIMIT 3');
            console.log('\n   📋 Dernières opportunités dans "opportunities":');
            sample.rows.forEach(o => {
                console.log(`      - ${o.nom} (${new Date(o.created_at).toLocaleDateString()})`);
            });
        }

        if (parseInt(oppitesResult.rows[0].count) > 0) {
            const sample = await client.query('SELECT id, titre, created_at FROM opportunites ORDER BY created_at DESC LIMIT 3');
            console.log('\n   📋 Dernières entrées dans "opportunites":');
            sample.rows.forEach(o => {
                console.log(`      - ${o.titre} (${new Date(o.created_at).toLocaleDateString()})`);
            });
        }

        console.log('\n   ✅ TABLE ACTIVE: ' + (parseInt(oppResult.rows[0].count) > parseInt(oppitesResult.rows[0].count) ? 'opportunities' : 'opportunites'));
        console.log();

        // 2. hourly_rates vs taux_horaires
        console.log('2️⃣  HOURLY_RATES vs TAUX_HORAIRES\n');

        const hourlyResult = await client.query('SELECT COUNT(*) as count FROM hourly_rates');
        const tauxResult = await client.query('SELECT COUNT(*) as count FROM taux_horaires');

        console.log(`   📊 hourly_rates:   ${hourlyResult.rows[0].count} lignes`);
        console.log(`   📊 taux_horaires:  ${tauxResult.rows[0].count} lignes`);

        // Vérifier la structure
        const hourlyColumns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'hourly_rates' 
            ORDER BY ordinal_position
        `);

        const tauxColumns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'taux_horaires' 
            ORDER BY ordinal_position
        `);

        console.log(`\n   📋 Colonnes hourly_rates (${hourlyColumns.rows.length}): ${hourlyColumns.rows.map(c => c.column_name).join(', ')}`);
        console.log(`   📋 Colonnes taux_horaires (${tauxColumns.rows.length}): ${tauxColumns.rows.map(c => c.column_name).join(', ')}`);

        console.log('\n   ✅ TABLE ACTIVE: ' + (parseInt(tauxResult.rows[0].count) > parseInt(hourlyResult.rows[0].count) ? 'taux_horaires' : 'hourly_rates'));
        console.log();

        // 3. menu_items, menu_sections, pages
        console.log('3️⃣  MENU_ITEMS, MENU_SECTIONS, PAGES\n');

        const menuItemsResult = await client.query('SELECT COUNT(*) as count FROM menu_items');
        const menuSectionsResult = await client.query('SELECT COUNT(*) as count FROM menu_sections');
        const pagesResult = await client.query('SELECT COUNT(*) as count FROM pages');

        console.log(`   📊 menu_items:     ${menuItemsResult.rows[0].count} lignes`);
        console.log(`   📊 menu_sections:  ${menuSectionsResult.rows[0].count} lignes`);
        console.log(`   📊 pages:          ${pagesResult.rows[0].count} lignes`);

        if (parseInt(menuItemsResult.rows[0].count) > 0) {
            const sample = await client.query('SELECT * FROM menu_items LIMIT 2');
            console.log('\n   📋 Exemple menu_items:');
            console.log('      ' + JSON.stringify(sample.rows[0], null, 2).split('\n').join('\n      '));
        }

        if (parseInt(pagesResult.rows[0].count) > 0) {
            const sample = await client.query('SELECT * FROM pages LIMIT 2');
            console.log('\n   📋 Exemple pages:');
            console.log('      ' + JSON.stringify(sample.rows[0], null, 2).split('\n').join('\n      '));
        }

        console.log();

        // 4. test_permissions
        console.log('4️⃣  TEST_PERMISSIONS\n');

        const testPermResult = await client.query('SELECT COUNT(*) as count FROM test_permissions');
        console.log(`   📊 test_permissions: ${testPermResult.rows[0].count} lignes`);

        if (parseInt(testPermResult.rows[0].count) > 0) {
            const sample = await client.query('SELECT * FROM test_permissions LIMIT 3');
            console.log('\n   📋 Contenu:');
            sample.rows.forEach(row => {
                console.log('      ' + JSON.stringify(row));
            });
        }

        console.log('\n   ✅ RECOMMANDATION: Peut être supprimée (table de test)');
        console.log();

        console.log('='.repeat(80));
        console.log('📋 RÉSUMÉ DES RECOMMANDATIONS');
        console.log('='.repeat(80) + '\n');

        console.log('✅ À CONSERVER:');
        console.log('   - ' + (parseInt(oppResult.rows[0].count) > parseInt(oppitesResult.rows[0].count) ? 'opportunities' : 'opportunites'));
        console.log('   - ' + (parseInt(tauxResult.rows[0].count) > parseInt(hourlyResult.rows[0].count) ? 'taux_horaires' : 'hourly_rates'));

        console.log('\n⚠️  À INVESTIGUER (routes API):');
        console.log('   - menu_items (' + menuItemsResult.rows[0].count + ' lignes)');
        console.log('   - menu_sections (' + menuSectionsResult.rows[0].count + ' lignes)');
        console.log('   - pages (' + pagesResult.rows[0].count + ' lignes)');

        console.log('\n🗑️  À SUPPRIMER:');
        console.log('   - ' + (parseInt(oppResult.rows[0].count) <= parseInt(oppitesResult.rows[0].count) ? 'opportunities' : 'opportunites') + ' (vide ou obsolète)');
        console.log('   - ' + (parseInt(tauxResult.rows[0].count) <= parseInt(hourlyResult.rows[0].count) ? 'taux_horaires' : 'hourly_rates') + ' (doublon)');
        console.log('   - test_permissions (table de test)');

        console.log();

    } catch (e) {
        console.error('❌ Erreur:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

investigateTables();
