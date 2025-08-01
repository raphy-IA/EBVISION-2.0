const { query } = require('../src/utils/database');

async function fixUsersData() {
    try {
        console.log('🔧 Correction des données utilisateurs...');
        
        // 1. Vérifier la structure actuelle
        console.log('\n1. Structure actuelle de la table users:');
        const structureResult = await query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Colonnes trouvées:');
        structureResult.rows.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        });
        
        // 2. Vérifier les données existantes
        console.log('\n2. Données existantes:');
        const dataResult = await query(`
            SELECT id, nom, prenom, email, login, role, statut
            FROM users 
            LIMIT 5
        `);
        
        console.log('📊 Données (5 premiers enregistrements):');
        dataResult.rows.forEach(user => {
            console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - Login: ${user.login} - Role: ${user.role}`);
        });
        
        // 3. Corriger les données si nécessaire
        console.log('\n3. Correction des données...');
        
        // Mettre à jour les rôles manquants
        const updateResult = await query(`
            UPDATE users 
            SET role = 'ADMIN' 
            WHERE email = 'admin@trs.com' AND (role IS NULL OR role = '')
        `);
        console.log(`✅ ${updateResult.rowCount} utilisateur(s) mis à jour avec le rôle ADMIN`);
        
        // Mettre à jour les autres utilisateurs avec un rôle par défaut
        const updateResult2 = await query(`
            UPDATE users 
            SET role = 'USER' 
            WHERE role IS NULL OR role = ''
        `);
        console.log(`✅ ${updateResult2.rowCount} utilisateur(s) mis à jour avec le rôle USER`);
        
        // 4. Vérifier les données après correction
        console.log('\n4. Données après correction:');
        const dataResult2 = await query(`
            SELECT id, nom, prenom, email, login, role, statut
            FROM users 
            LIMIT 5
        `);
        
        console.log('📊 Données corrigées:');
        dataResult2.rows.forEach(user => {
            console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - Login: ${user.login} - Role: ${user.role}`);
        });

    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

fixUsersData(); 