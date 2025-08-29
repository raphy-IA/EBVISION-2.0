const { pool } = require('../src/utils/database');

async function checkRolesStructure() {
    try {
        const client = await pool.connect();
        console.log('🔍 Vérification de la structure de la table roles...');
        
        // Vérifier la structure exacte de la table roles
        const columns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'roles'
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Structure de la table roles:');
        columns.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
        });
        
        // Vérifier les contraintes
        const constraints = await client.query(`
            SELECT constraint_name, constraint_type, column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'roles'
        `);
        
        console.log('\n📋 Contraintes de la table roles:');
        constraints.rows.forEach(constraint => {
            console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_type} sur ${constraint.column_name}`);
        });
        
        // Vérifier les données existantes
        const data = await client.query('SELECT * FROM roles LIMIT 5');
        console.log('\n📋 Données existantes dans roles:');
        data.rows.forEach(row => {
            console.log(`   - ${JSON.stringify(row)}`);
        });
        
        client.release();
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    }
}

checkRolesStructure()
    .then(() => {
        console.log('✅ Vérification terminée');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec de la vérification:', error);
        process.exit(1);
    });
