const pool = require('../../src/utils/database').pool;

async function analyzeNavigationPermissions() {
    try {
        console.log('🔍 Analyse des permissions de navigation...\n');

        // Récupérer toutes les permissions de navigation
        const query = `
            SELECT 
                id,
                code,
                name,
                category,
                description,
                created_at
            FROM permissions
            WHERE category = 'navigation'
            ORDER BY name, id;
        `;

        const result = await pool.query(query);

        console.log(`📊 Total de permissions de navigation: ${result.rows.length}\n`);

        // Grouper par nom pour voir les doublons potentiels
        const byName = {};
        result.rows.forEach(perm => {
            if (!byName[perm.name]) {
                byName[perm.name] = [];
            }
            byName[perm.name].push(perm);
        });

        // Afficher les permissions qui ont le même nom
        const duplicateNames = Object.entries(byName).filter(([name, perms]) => perms.length > 1);

        if (duplicateNames.length > 0) {
            console.log(`❌ ${duplicateNames.length} noms de permissions en double:\n`);
            duplicateNames.forEach(([name, perms]) => {
                console.log(`📝 "${name}" (${perms.length} occurrences):`);
                perms.forEach(perm => {
                    console.log(`   - ID: ${perm.id}, Code: ${perm.code}`);
                });
                console.log('');
            });
        } else {
            console.log('✅ Aucun nom de permission en double!\n');
        }

        // Afficher quelques exemples
        console.log('📋 Exemples de permissions de navigation:');
        result.rows.slice(0, 10).forEach(perm => {
            console.log(`   - ${perm.name} (${perm.code})`);
        });

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

analyzeNavigationPermissions();
