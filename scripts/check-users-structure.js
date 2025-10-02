// Script pour vérifier la structure de la table users
const { pool } = require('../src/utils/database');

async function checkUsersStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table users...\n');
        
        // 1. Vérifier la structure de la colonne role
        const roleColumn = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role'
        `);
        
        console.log('📋 Colonne role:', roleColumn.rows[0]);
        
        // 2. Vérifier les contraintes sur la table users
        const constraints = await pool.query(`
            SELECT tc.constraint_name, tc.constraint_type, cc.check_clause
            FROM information_schema.table_constraints tc
            LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
            WHERE tc.table_name = 'users' AND tc.constraint_type = 'CHECK'
        `);
        
        console.log('\n🔒 Contraintes CHECK:', constraints.rows);
        
        // 3. Vérifier les valeurs actuelles dans la colonne role
        const currentRoles = await pool.query(`
            SELECT DISTINCT role FROM users WHERE role IS NOT NULL
        `);
        
        console.log('\n👥 Rôles actuels en base:', currentRoles.rows.map(r => r.role));
        
        // 4. Vérifier s'il y a une table roles
        const rolesTable = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_name = 'roles'
        `);
        
        if (rolesTable.rows.length > 0) {
            const rolesData = await pool.query('SELECT name, description FROM roles');
            console.log('\n🎭 Table roles:', rolesData.rows);
        } else {
            console.log('\n❌ Table roles n\'existe pas');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkUsersStructure();
