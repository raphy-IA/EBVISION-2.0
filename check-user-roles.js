const { pool } = require('./src/utils/database');

async function checkUserRoles() {
    try {
        console.log('🔍 Vérification des rôles utilisateur...\n');
        
        // 1. Vérifier la contrainte de rôle
        console.log('1️⃣ Contrainte de rôle:');
        const constraintResult = await pool.query(`
            SELECT 
                conname,
                pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conname = 'users_role_check'
        `);
        
        if (constraintResult.rows.length > 0) {
            console.log('✅ Contrainte trouvée:', constraintResult.rows[0]);
        } else {
            console.log('❌ Contrainte non trouvée');
        }
        
        // 2. Vérifier les rôles existants
        console.log('\n2️⃣ Rôles existants:');
        const rolesResult = await pool.query(`
            SELECT DISTINCT role, COUNT(*) as count
            FROM users 
            GROUP BY role
            ORDER BY role
        `);
        
        rolesResult.rows.forEach(row => {
            console.log(`  - ${row.role}: ${row.count} utilisateurs`);
        });
        
        // 3. Vérifier les valeurs autorisées pour le rôle
        console.log('\n3️⃣ Valeurs autorisées pour role:');
        const enumResult = await pool.query(`
            SELECT 
                t.typname,
                e.enumlabel
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid  
            WHERE t.typname = 'role_enum'
            ORDER BY e.enumsortorder
        `);
        
        if (enumResult.rows.length > 0) {
            console.log('✅ Valeurs autorisées:');
            enumResult.rows.forEach(row => {
                console.log(`  - ${row.enumlabel}`);
            });
        } else {
            console.log('❌ Pas de type enum trouvé');
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

checkUserRoles(); 