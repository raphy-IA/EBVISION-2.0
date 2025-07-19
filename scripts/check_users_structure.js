const { pool } = require('../src/utils/database');

async function checkUsersStructure() {
    try {
        console.log('🔍 Structure de la table users:\n');
        
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ La table users n\'a pas de colonnes ou n\'existe pas');
            return;
        }
        
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
            if (row.column_default) {
                console.log(`    Default: ${row.column_default}`);
            }
        });
        
        // Vérifier les utilisateurs existants
        const usersResult = await pool.query('SELECT * FROM users LIMIT 3');
        console.log(`\n📊 Utilisateurs existants (${usersResult.rows.length}):`);
        usersResult.rows.forEach((user, index) => {
            console.log(`  ${index + 1}. ID: ${user.id}`);
            Object.keys(user).forEach(key => {
                if (key !== 'id') {
                    console.log(`     ${key}: ${user[key]}`);
                }
            });
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkUsersStructure(); 