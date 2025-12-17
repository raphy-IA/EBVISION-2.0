const pool = require('../../src/utils/database').pool;

async function analyzeSpecificCategories() {
    try {
        console.log('🔍 Analyse des catégories Opportunities et Missions...\n');

        const categories = ['opportunities', 'missions'];

        for (const category of categories) {
            console.log(`\n📊 Catégorie: ${category.toUpperCase()}`);
            console.log('='.repeat(50));

            // Récupérer toutes les permissions de cette catégorie
            const query = `
                SELECT id, code, name, description
                FROM permissions
                WHERE category = $1
                ORDER BY name, code;
            `;

            const result = await pool.query(query, [category]);

            console.log(`\nTotal: ${result.rows.length} permissions\n`);

            // Grouper par nom similaire (ignorer "les" et variations)
            const normalized = {};
            result.rows.forEach(perm => {
                // Normaliser le nom en retirant "les", "des", etc.
                const normalizedName = perm.name
                    .toLowerCase()
                    .replace(/\s+les\s+/g, ' ')
                    .replace(/\s+des\s+/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!normalized[normalizedName]) {
                    normalized[normalizedName] = [];
                }
                normalized[normalizedName].push(perm);
            });

            // Afficher les groupes
            Object.entries(normalized).forEach(([normName, perms]) => {
                if (perms.length > 1) {
                    console.log(`❌ "${normName}" - ${perms.length} variations:`);
                    perms.forEach(p => {
                        console.log(`   - "${p.name}" (${p.code})`);
                    });
                    console.log('');
                } else {
                    console.log(`✅ "${perms[0].name}" (${perms[0].code})`);
                }
            });
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

analyzeSpecificCategories();
