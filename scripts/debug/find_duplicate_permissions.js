const pool = require('../../src/utils/database').pool;

async function findDuplicatePermissions() {
    try {
        console.log('🔍 Recherche des permissions en double...\n');

        // Trouver les permissions en double par code
        const duplicatesQuery = `
            SELECT 
                code, 
                name, 
                category, 
                COUNT(*) as count,
                ARRAY_AGG(id ORDER BY id) as ids,
                ARRAY_AGG(created_at ORDER BY id) as created_dates
            FROM permissions
            GROUP BY code, name, category
            HAVING COUNT(*) > 1
            ORDER BY count DESC, code;
        `;

        const result = await pool.query(duplicatesQuery);

        if (result.rows.length === 0) {
            console.log('✅ Aucune permission en double trouvée!');
            return;
        }

        console.log(`❌ ${result.rows.length} permissions en double trouvées:\n`);

        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. Code: ${row.code}`);
            console.log(`   Nom: ${row.name}`);
            console.log(`   Catégorie: ${row.category}`);
            console.log(`   Nombre de doublons: ${row.count}`);
            console.log(`   IDs: ${row.ids.join(', ')}`);
            console.log(`   Dates de création: ${row.created_dates.map(d => d?.toISOString().split('T')[0] || 'N/A').join(', ')}`);
            console.log('');
        });

        // Compter les permissions affectées
        const affectedQuery = `
            WITH duplicates AS (
                SELECT code
                FROM permissions
                GROUP BY code
                HAVING COUNT(*) > 1
            )
            SELECT COUNT(*) as total_duplicates
            FROM permissions p
            WHERE p.code IN (SELECT code FROM duplicates);
        `;

        const affectedResult = await pool.query(affectedQuery);
        console.log(`📊 Total de permissions en double dans la base: ${affectedResult.rows[0].total_duplicates}`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

findDuplicatePermissions();
