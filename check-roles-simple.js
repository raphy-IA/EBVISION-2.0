const { pool } = require('./src/utils/database');

async function checkRolesSimple() {
    try {
        console.log('🔍 Vérification simple des rôles...\n');
        
        // Vérifier les rôles existants
        const rolesResult = await pool.query(`
            SELECT DISTINCT role, COUNT(*) as count
            FROM users 
            GROUP BY role
            ORDER BY role
        `);
        
        console.log('📊 Rôles existants:');
        rolesResult.rows.forEach(row => {
            console.log(`  - ${row.role}: ${row.count} utilisateurs`);
        });
        
        // Vérifier la structure de la table users
        const structureResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role'
        `);
        
        console.log('\n📋 Structure de la colonne role:');
        structureResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
        });
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

checkRolesSimple(); 