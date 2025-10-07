// Script pour corriger les tables manquantes sur la production
require('dotenv').config();
const { Pool } = require('pg');

async function fixMissingTablesProduction() {
    console.log('🔧 Correction des tables manquantes sur la production...\n');
    
    try {
        const productionPool = new Pool({
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

        console.log('1️⃣ Test de connexion...');
        const testResult = await productionPool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion réussie - Heure: ${testResult.rows[0].current_time}`);

        console.log('\n2️⃣ Création des tables d\'authentification manquantes...');

        // Créer la table users
        try {
            await productionPool.query(`
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
        } catch (error) {
            console.log(`❌ Erreur avec users: ${error.message}`);
        }

        // Créer la table business_units
        try {
            await productionPool.query(`
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
        } catch (error) {
            console.log(`❌ Erreur avec business_units: ${error.message}`);
        }

        console.log('\n3️⃣ Insertion des données d\'authentification de base...');

        // Insérer les business units de base
        try {
            await productionPool.query(`
                INSERT INTO business_units (id, name, description) VALUES
                ('550e8400-e29b-41d4-a716-446655440001', 'TRS', 'Taxation, Réglementation et Stratégie'),
                ('550e8400-e29b-41d4-a716-446655440002', 'Audit', 'Audit et Contrôle'),
                ('550e8400-e29b-41d4-a716-446655440003', 'Conseil', 'Conseil et Accompagnement'),
                ('550e8400-e29b-41d4-a716-446655440004', 'Formation', 'Formation et Développement')
                ON CONFLICT (id) DO NOTHING
            `);
            console.log('✅ Business units de base insérées');
        } catch (error) {
            console.log(`❌ Erreur avec business units: ${error.message}`);
        }

        // Créer un utilisateur administrateur par défaut
        try {
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            await productionPool.query(`
                INSERT INTO users (id, nom, prenom, email, login, password_hash, role, statut) VALUES
                ('550e8400-e29b-41d4-a716-446655440010', 'Administrateur', 'Système', 'admin@ebvision.com', 'admin', $1, 'SUPER_ADMIN', 'ACTIF')
                ON CONFLICT (id) DO NOTHING
            `, [hashedPassword]);
            console.log('✅ Utilisateur administrateur créé');
        } catch (error) {
            console.log(`❌ Erreur avec utilisateur admin: ${error.message}`);
        }

        console.log('\n4️⃣ Vérification finale...');
        
        // Vérifier les tables d'authentification
        const authTables = ['users', 'business_units', 'roles', 'permissions'];
        
        for (const table of authTables) {
            try {
                const countResult = await productionPool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`📊 ${table}: ${countResult.rows[0].count} enregistrements`);
                
                if (table === 'users' && countResult.rows[0].count > 0) {
                    const usersResult = await productionPool.query(`
                        SELECT nom, prenom, email, role, statut
                        FROM users
                        LIMIT 3
                    `);
                    console.log('👥 Utilisateurs:');
                    usersResult.rows.forEach(user => {
                        console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - ${user.role}`);
                    });
                }
            } catch (error) {
                console.log(`❌ Erreur avec ${table}: ${error.message}`);
            }
        }

        await productionPool.end();
        
        console.log('\n🎉 Correction terminée !');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Testez la connexion avec: admin@ebvision.com / admin123');
        console.log('3. Ou avec vos identifiants locaux si disponibles');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

fixMissingTablesProduction().catch(console.error);











