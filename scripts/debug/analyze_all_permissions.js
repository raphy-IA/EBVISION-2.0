const pool = require('../../src/utils/database').pool;

async function analyzeAllPermissions() {
    try {
        console.log('🔍 Analyse complète de toutes les permissions...\n');

        // Récupérer toutes les catégories
        const categoriesQuery = `
            SELECT DISTINCT category 
            FROM permissions 
            ORDER BY category;
        `;

        const categoriesResult = await pool.query(categoriesQuery);
        console.log(`📊 Catégories trouvées: ${categoriesResult.rows.length}\n`);

        let totalDuplicates = 0;
        const duplicatesByCategory = {};

        for (const catRow of categoriesResult.rows) {
            const category = catRow.category;

            // Trouver les doublons par nom dans cette catégorie
            const duplicatesQuery = `
                WITH duplicates AS (
                    SELECT 
                        name,
                        COUNT(*) as count,
                        ARRAY_AGG(id ORDER BY created_at, id) as ids,
                        ARRAY_AGG(code ORDER BY created_at, id) as codes
                    FROM permissions
                    WHERE category = $1
                    GROUP BY name
                    HAVING COUNT(*) > 1
                )
                SELECT * FROM duplicates
                ORDER BY count DESC, name;
            `;

            const duplicatesResult = await pool.query(duplicatesQuery, [category]);

            if (duplicatesResult.rows.length > 0) {
                console.log(`\n❌ Catégorie "${category}": ${duplicatesResult.rows.length} noms en double`);
                duplicatesByCategory[category] = duplicatesResult.rows;
                totalDuplicates += duplicatesResult.rows.length;

                // Afficher quelques exemples
                duplicatesResult.rows.slice(0, 3).forEach(dup => {
                    console.log(`   - "${dup.name}" (${dup.count} occurrences)`);
                    console.log(`     Codes: ${dup.codes.join(', ')}`);
                });

                if (duplicatesResult.rows.length > 3) {
                    console.log(`   ... et ${duplicatesResult.rows.length - 3} autres`);
                }
            } else {
                console.log(`✅ Catégorie "${category}": Aucun doublon`);
            }
        }

        console.log(`\n\n📊 RÉSUMÉ GLOBAL:`);
        console.log(`   - Total de catégories: ${categoriesResult.rows.length}`);
        console.log(`   - Catégories avec doublons: ${Object.keys(duplicatesByCategory).length}`);
        console.log(`   - Total de noms en double: ${totalDuplicates}`);

        if (totalDuplicates > 0) {
            console.log(`\n⚠️  Catégories nécessitant un nettoyage:`);
            Object.entries(duplicatesByCategory).forEach(([cat, dups]) => {
                console.log(`   - ${cat}: ${dups.length} doublons`);
            });
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

analyzeAllPermissions();
