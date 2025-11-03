// Charger les variables d'environnement
require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Configuration de la base de données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0',
    user: process.env.DB_USER || 'ebpadfbq_eb_admin20',
    password: process.env.DB_PASSWORD || '87ifet-Z)&',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: false,
    family: 4
});

async function createAdminUser() {
    console.log('🔐 Création d\'un utilisateur administrateur...\n');
    
    try {
        // Informations de l'utilisateur administrateur
        const adminUser = {
            nom: 'Administrateur',
            prenom: 'Système',
            login: 'admin',
            email: 'admin@ebvision.com',
            password: 'admin123',
            role: 'SUPER_ADMIN'
        };
        
        console.log('📋 Informations de l\'utilisateur :');
        console.log(`   Nom: ${adminUser.nom} ${adminUser.prenom}`);
        console.log(`   Login: ${adminUser.login}`);
        console.log(`   Email: ${adminUser.email}`);
        console.log(`   Rôle: ${adminUser.role}`);
        console.log(`   Mot de passe: ${adminUser.password}\n`);
        
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await pool.query(
            'SELECT id, login, email FROM users WHERE login = $1 OR email = $2',
            [adminUser.login, adminUser.email]
        );
        
        if (existingUser.rows.length > 0) {
            console.log('⚠️  Un utilisateur avec ce login ou email existe déjà :');
            existingUser.rows.forEach(user => {
                console.log(`   - ID: ${user.id}, Login: ${user.login}, Email: ${user.email}`);
            });
            console.log('\n💡 Pour créer un nouvel utilisateur, modifiez les informations dans le script.');
            return;
        }
        
        // Hasher le mot de passe
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(adminUser.password, saltRounds);
        
        // Créer l'utilisateur
        const result = await pool.query(`
            INSERT INTO users (nom, prenom, login, email, password_hash, role, statut)
            VALUES ($1, $2, $3, $4, $5, $6, 'ACTIF')
            RETURNING id, nom, prenom, login, email, role, created_at
        `, [
            adminUser.nom,
            adminUser.prenom,
            adminUser.login,
            adminUser.email,
            passwordHash,
            adminUser.role
        ]);
        
        const newUser = result.rows[0];
        
        console.log('✅ Utilisateur administrateur créé avec succès !');
        console.log('\n📊 Détails de l\'utilisateur :');
        console.log(`   ID: ${newUser.id}`);
        console.log(`   Nom: ${newUser.nom} ${newUser.prenom}`);
        console.log(`   Login: ${newUser.login}`);
        console.log(`   Email: ${newUser.email}`);
        console.log(`   Rôle: ${newUser.role}`);
        console.log(`   Créé le: ${newUser.created_at}`);
        
        console.log('\n🔑 Informations de connexion :');
        console.log(`   URL: https://ebvision2.0.eb-partnersgroup.cm`);
        console.log(`   Email: ${adminUser.email}`);
        console.log(`   Mot de passe: ${adminUser.password}`);
        
        console.log('\n⚠️  IMPORTANT : Changez le mot de passe après la première connexion !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'utilisateur:', error);
    } finally {
        await pool.end();
    }
}

createAdminUser();
