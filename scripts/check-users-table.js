const { query } = require('../src/utils/database');

async function checkUsersTable() {
    try {
        console.log('🔍 Vérification de la structure de la table users...');
        
        // 1. Vérifier les colonnes de la table users
        console.log('\n1. Colonnes de la table users:');
        const columnsResult = await query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Colonnes trouvées:');
        columnsResult.rows.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        });
        
        // 2. Vérifier les contraintes
        console.log('\n2. Contraintes de la table users:');
        const constraintsResult = await query(`
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'users'
        `);
        
        console.log('📊 Contraintes trouvées:');
        constraintsResult.rows.forEach(constraint => {
            console.log(`   - ${constraint.constraint_name} (${constraint.constraint_type})`);
        });
        
        // 3. Vérifier les index
        console.log('\n3. Index de la table users:');
        const indexesResult = await query(`
            SELECT indexname, indexdef
            FROM pg_indexes 
            WHERE tablename = 'users'
        `);
        
        console.log('📊 Index trouvés:');
        indexesResult.rows.forEach(index => {
            console.log(`   - ${index.indexname}`);
        });
        
        // 4. Vérifier les données existantes
        console.log('\n4. Données existantes:');
        const dataResult = await query(`
            SELECT id, nom, prenom, email, initiales, grade, login, collaborateur_id, statut
            FROM users 
            LIMIT 3
        `);
        
        console.log('📊 Données (3 premiers enregistrements):');
        dataResult.rows.forEach(user => {
            console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - Login: ${user.login}`);
        });

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

checkUsersTable(); 