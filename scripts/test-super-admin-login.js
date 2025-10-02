// Script pour tester la connexion du SUPER_ADMIN
const bcrypt = require('bcryptjs');
const { pool } = require('../src/utils/database');

async function testSuperAdminLogin() {
    try {
        console.log('🔐 Test de connexion SUPER_ADMIN...\n');
        
        // Récupérer le hash du mot de passe
        const result = await pool.query(`
            SELECT email, password_hash 
            FROM users 
            WHERE role = 'SUPER_ADMIN'
            LIMIT 1
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ SUPER_ADMIN non trouvé');
            return;
        }
        
        const admin = result.rows[0];
        console.log('👤 Email:', admin.email);
        
        // Tester différents mots de passe possibles
        const possiblePasswords = [
            'SuperAdmin2024!',
            'admin123',
            'TempPass123!',
            'Canaan@2020',
            'super_admin_password'
        ];
        
        console.log('\n🔍 Test des mots de passe possibles...');
        
        for (const password of possiblePasswords) {
            const isValid = await bcrypt.compare(password, admin.password_hash);
            if (isValid) {
                console.log(`✅ Mot de passe trouvé: "${password}"`);
                console.log('\n💡 Credentials de connexion:');
                console.log(`   Email: ${admin.email}`);
                console.log(`   Mot de passe: ${password}`);
                return;
            } else {
                console.log(`❌ "${password}" - incorrect`);
            }
        }
        
        console.log('\n❌ Aucun mot de passe testé ne fonctionne');
        console.log('💡 Vous devrez peut-être réinitialiser le mot de passe');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

testSuperAdminLogin();







