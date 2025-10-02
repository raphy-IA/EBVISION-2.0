// Script simple pour recréer les tables manquantes
require('dotenv').config();
const { Pool } = require('pg');

async function fixMissingTables() {
    console.log('🔧 Réparation des tables manquantes...\n');
    
    try {
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

        console.log('1️⃣ Création de la table users...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                login VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'COLLABORATEUR',
                statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF',
                collaborateur_id UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table users créée');

        console.log('\n2️⃣ Création de la table business_units...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_units (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                responsable_principal_id UUID,
                responsable_adjoint_id UUID,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table business_units créée');

        console.log('\n3️⃣ Insertion des business units de base...');
        await pool.query(`
            INSERT INTO business_units (name, description) VALUES
            ('TRS', 'Taxation, Réglementation et Stratégie'),
            ('Audit', 'Audit et Contrôle'),
            ('Conseil', 'Conseil et Accompagnement'),
            ('Formation', 'Formation et Développement')
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('✅ Business units insérées');

        console.log('\n4️⃣ Création de l\'utilisateur administrateur...');
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        await pool.query(`
            INSERT INTO users (nom, prenom, email, login, password_hash, role, statut) VALUES
            ('Administrateur', 'Système', 'admin@ebvision.com', 'admin', $1, 'SUPER_ADMIN', 'ACTIF')
            ON CONFLICT (email) DO NOTHING
        `, [hashedPassword]);
        console.log('✅ Utilisateur administrateur créé');

        console.log('\n5️⃣ Vérification finale...');
        const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
        const buCount = await pool.query('SELECT COUNT(*) as count FROM business_units');
        
        console.log(`📊 Users: ${usersCount.rows[0].count} enregistrements`);
        console.log(`📊 Business Units: ${buCount.rows[0].count} enregistrements`);

        await pool.end();
        
        console.log('\n🎉 Tables manquantes réparées avec succès !');
        console.log('\n💡 Identifiants de connexion:');
        console.log('   Email: admin@ebvision.com');
        console.log('   Mot de passe: admin123');
        console.log('\n🔄 Redémarrez l\'application: pm2 restart eb-vision-2-0');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

fixMissingTables().catch(console.error);
