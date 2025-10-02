const { pool } = require('../src/utils/database');

async function checkMenuStructure() {
    console.log('🔍 Vérification de la structure des menus...\n');

    try {
        // 1. Vérifier les sections de menu
        const sectionsResult = await pool.query(`
            SELECT ms.id, ms.code, ms.name, COUNT(mi.id) as items_count
            FROM menu_sections ms
            LEFT JOIN menu_items mi ON ms.id = mi.section_id
            GROUP BY ms.id, ms.code, ms.name
            ORDER BY ms.name
        `);

        console.log('📋 Sections de menu:');
        console.log('='.repeat(80));
        sectionsResult.rows.forEach(section => {
            console.log(`Section: ${section.name} (${section.code})`);
            console.log(`  - Items: ${section.items_count}`);
        });

        // 2. Vérifier les items de menu pour chaque section
        for (const section of sectionsResult.rows) {
            console.log(`\n📂 Items de la section "${section.name}":`);
            console.log('-'.repeat(80));

            const itemsResult = await pool.query(`
                SELECT mi.code, mi.label, mi.url, mi.display_order
                FROM menu_items mi
                WHERE mi.section_id = $1
                ORDER BY mi.display_order
            `, [section.id]);

            if (itemsResult.rows.length === 0) {
                console.log('  ⚠️ Aucun item dans cette section');
            } else {
                itemsResult.rows.forEach(item => {
                    console.log(`  ${item.display_order}. ${item.label}`);
                    console.log(`     Code: ${item.code}`);
                    console.log(`     URL: ${item.url}`);
                });
            }
        }

        // 3. Vérifier les permissions de menu
        console.log('\n\n🔐 Permissions de menu:');
        console.log('='.repeat(80));
        
        const permissionsResult = await pool.query(`
            SELECT code, name, description, category
            FROM permissions
            WHERE code LIKE 'menu.%'
            ORDER BY category, code
        `);

        let currentCategory = '';
        permissionsResult.rows.forEach(perm => {
            if (perm.category !== currentCategory) {
                console.log(`\n📁 ${perm.category}:`);
                currentCategory = perm.category;
            }
            console.log(`  - ${perm.code}`);
            console.log(`    ${perm.name}`);
        });

        console.log('\n\n📊 Résumé:');
        console.log('='.repeat(80));
        console.log(`Total sections: ${sectionsResult.rows.length}`);
        console.log(`Total items: ${sectionsResult.rows.reduce((acc, s) => acc + parseInt(s.items_count), 0)}`);
        console.log(`Total permissions menu: ${permissionsResult.rows.length}`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkMenuStructure();


