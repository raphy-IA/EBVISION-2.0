const { pool } = require('../src/utils/database');

async function checkPermissionsStructure() {
    try {
        const client = await pool.connect();
        console.log('🔍 Vérification de la structure de la table permissions...');
        
        // Vérifier la structure exacte de la table permissions
        const columns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'permissions'
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Structure de la table permissions:');
        columns.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
        });
        
        // Vérifier les données existantes
        const data = await client.query('SELECT * FROM permissions LIMIT 5');
        console.log('\n📋 Données existantes dans permissions:');
        data.rows.forEach(row => {
            console.log(`   - ${JSON.stringify(row)}`);
        });
        
        client.release();
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    }
}

checkPermissionsStructure()
    .then(() => {
        console.log('✅ Vérification terminée');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec de la vérification:', error);
        process.exit(1);
    });
