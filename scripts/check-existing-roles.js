const { pool } = require('../src/utils/database');

async function checkExistingRoles() {
    try {
        const client = await pool.connect();
        console.log('🔍 Vérification du système de rôles existant...');
        
        // Vérifier toutes les tables liées aux rôles
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%role%' OR table_name LIKE '%permission%'
            ORDER BY table_name
        `);
        
        console.log('📋 Tables liées aux rôles et permissions:');
        tables.rows.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });
        
        // Vérifier s'il y a une table roles
        const rolesTable = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'roles'
        `);
        
        if (rolesTable.rows.length > 0) {
            console.log('\n✅ Table roles existe');
            const roles = await client.query('SELECT * FROM roles');
            console.log(`📊 Nombre de rôles: ${roles.rows.length}`);
            roles.rows.forEach(role => {
                console.log(`   - ${JSON.stringify(role)}`);
            });
        } else {
            console.log('\n❌ Table roles n\'existe pas');
        }
        
        // Vérifier la table users pour voir comment les rôles sont gérés
        const userColumns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users'
            AND column_name LIKE '%role%'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Colonnes de rôles dans users:');
        userColumns.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        // Vérifier les données de quelques utilisateurs
        const users = await client.query(`
            SELECT id, username, role, role_id 
            FROM users 
            LIMIT 5
        `);
        
        console.log('\n📋 Exemples d\'utilisateurs:');
        users.rows.forEach(user => {
            console.log(`   - ${user.username}: role=${user.role}, role_id=${user.role_id}`);
        });
        
        client.release();
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    }
}

checkExistingRoles()
    .then(() => {
        console.log('✅ Vérification terminée');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec de la vérification:', error);
        process.exit(1);
    });
