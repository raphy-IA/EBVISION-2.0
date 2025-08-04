const { pool } = require('./src/utils/database');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
    try {
        console.log('🔧 Création d\'un utilisateur admin pour les tests...\n');
        
        // 1. Vérifier si l'utilisateur admin existe déjà
        const existingAdmin = await pool.query(`
            SELECT id, nom, prenom, email, login, role
            FROM users 
            WHERE email = 'admin.test@trs.com'
        `);
        
        if (existingAdmin.rows.length > 0) {
            console.log('✅ Utilisateur admin existe déjà:', existingAdmin.rows[0]);
            return existingAdmin.rows[0];
        }
        
        // 2. Créer un utilisateur admin
        console.log('1️⃣ Création de l\'utilisateur admin...');
        const adminData = {
            nom: 'Admin',
            prenom: 'Test',
            email: 'admin.test@trs.com',
            login: 'admin.test',
            role: 'ADMIN',
            password: 'AdminTest123!'
        };
        
        // Hasher le mot de passe
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(adminData.password, saltRounds);
        
        const result = await pool.query(`
            INSERT INTO users (nom, prenom, email, password_hash, login, role, statut)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, nom, prenom, email, login, role, statut
        `, [
            adminData.nom,
            adminData.prenom,
            adminData.email,
            passwordHash,
            adminData.login,
            adminData.role,
            'ACTIF'
        ]);
        
        const newAdmin = result.rows[0];
        console.log('✅ Utilisateur admin créé:', newAdmin);
        console.log(`   Email: ${newAdmin.email}`);
        console.log(`   Mot de passe: ${adminData.password}`);
        console.log(`   Rôle: ${newAdmin.role}`);
        
        return newAdmin;
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'utilisateur admin:', error);
        return null;
    } finally {
        await pool.end();
    }
}

createAdminUser(); 