const { query } = require('../src/utils/database');

async function checkMissionsStructure() {
    console.log('🔧 Vérification de la structure de la table missions...\n');

    try {
        // Vérifier la structure de la table
        const structureResult = await query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'missions' 
            ORDER BY ordinal_position
        `);

        console.log('📋 Structure de la table missions:');
        structureResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'} ${row.column_default ? `[default: ${row.column_default}]` : ''}`);
        });

        // Vérifier les contraintes
        const constraintsResult = await query(`
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'missions'
        `);

        console.log('\n🔒 Contraintes de la table missions:');
        constraintsResult.rows.forEach(row => {
            console.log(`  - ${row.constraint_name}: ${row.constraint_type}`);
        });

        // Compter les missions existantes
        const countResult = await query('SELECT COUNT(*) as total FROM missions');
        console.log(`\n📊 Nombre total de missions: ${countResult.rows[0].total}`);

        // Vérifier quelques missions pour voir les colonnes disponibles
        const sampleResult = await query('SELECT * FROM missions LIMIT 1');
        if (sampleResult.rows.length > 0) {
            console.log('\n📋 Exemple de mission:');
            console.log(JSON.stringify(sampleResult.rows[0], null, 2));
        }

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    }
}

// Exécuter le script
checkMissionsStructure().catch(console.error); 