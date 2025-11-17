require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false
});

async function checkSuperAdmin() {
    try {
        const result = await pool.query(`
            SELECT 
                u.email, 
                u.role as role_column,
                r.nom as role_from_user_roles,
                r.id as role_id
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.email = 'super_usr@trs.com'
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ Utilisateur super_usr@trs.com non trouvé');
        } else {
            const user = result.rows[0];
            console.log('\n👤 Utilisateur: super_usr@trs.com');
            console.log('   📋 Colonne "role":', user.role_column);
            console.log('   👑 Rôle assigné (user_roles):', user.role_from_user_roles || '❌ AUCUN');
            console.log('   🆔 Role ID:', user.role_id || '❌ AUCUN');
            
            if (!user.role_from_user_roles) {
                console.log('\n⚠️  PROBLÈME: Le rôle Super Administrateur n\'est PAS assigné dans user_roles !');
            } else {
                console.log('\n✅ Le rôle est bien assigné');
            }
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        await pool.end();
    }
}

checkSuperAdmin();







