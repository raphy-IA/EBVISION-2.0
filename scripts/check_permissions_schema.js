const { query } = require('../src/utils/database');

async function checkPermissionsSchema() {
    try {
        const result = await query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'permissions' 
            ORDER BY ordinal_position
        `);

        console.log('📊 Structure de la table permissions:\n');
        result.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '* REQUIRED' : ''}`);
            if (col.column_default) console.log(`    Default: ${col.column_default}`);
        });

        // Afficher aussi un exemple de permission existante
        const samplePerm = await query(`SELECT * FROM permissions LIMIT 1`);
        console.log('\n📝 Exemple de permission existante:');
        console.log(JSON.stringify(samplePerm.rows[0], null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Erreur:', error);
        process.exit(1);
    }
}

checkPermissionsSchema();
