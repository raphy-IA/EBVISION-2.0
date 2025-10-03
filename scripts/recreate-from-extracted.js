// Script pour recréer les données extraites sur le serveur de production
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path'); // Added missing import for path

async function recreateFromExtracted() {
    console.log('🚀 Recréation des données sur le serveur de production...\n');
    
    try {
        // Configuration pour la base de production
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

        console.log('1️⃣ Test de connexion à la base de production...');
        const testResult = await productionPool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion production réussie - Heure: ${testResult.rows[0].current_time}`);

        // Rechercher le fichier de données extraites
        console.log('\n2️⃣ Recherche du fichier de données extraites...');
        const files = fs.readdirSync(__dirname + '/..');
        const extractedFiles = files.filter(file => 
            file.startsWith('extracted_data_') && file.endsWith('.json')
        ).sort().reverse();

        if (extractedFiles.length === 0) {
            console.error('❌ Aucun fichier de données extraites trouvé !');
            console.log('💡 Exécutez d\'abord: node scripts/extract-local-data.js');
            return;
        }

        const extractedFile = extractedFiles[0];
        const extractedPath = path.join(__dirname, '..', extractedFile);
        console.log(`✅ Fichier trouvé: ${extractedFile}`);

        // Lire les données extraites
        const extractedData = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
        console.log('✅ Données extraites chargées');

        console.log('\n3️⃣ Recréation des tables manquantes...');
        
        // Créer la table users si elle n'existe pas
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
            console.log('✅ Table users créée/vérifiée');
        } catch (error) {
            console.log(`❌ Erreur avec users: ${error.message}`);
        }

        // Créer la table business_units si elle n'existe pas
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
            console.log('✅ Table business_units créée/vérifiée');
        } catch (error) {
            console.log(`❌ Erreur avec business_units: ${error.message}`);
        }

        console.log('\n4️⃣ Insertion des données...');

        // Insérer les business units
        if (extractedData.business_units && extractedData.business_units.length > 0) {
            console.log('📊 Insertion des business units...');
            for (const bu of extractedData.business_units) {
                try {
                    await productionPool.query(`
                        INSERT INTO business_units (id, name, description, responsable_principal_id, responsable_adjoint_id, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (id) DO NOTHING
                    `, [bu.id, bu.name, bu.description, bu.responsable_principal_id, bu.responsable_adjoint_id, bu.created_at, bu.updated_at]);
                } catch (error) {
                    console.log(`⚠️ Erreur avec business unit ${bu.name}: ${error.message}`);
                }
            }
            console.log(`✅ ${extractedData.business_units.length} business units insérées`);
        }

        // Insérer les utilisateurs
        if (extractedData.users && extractedData.users.length > 0) {
            console.log('📊 Insertion des utilisateurs...');
            for (const user of extractedData.users) {
                try {
                    await productionPool.query(`
                        INSERT INTO users (id, nom, prenom, email, login, password_hash, role, statut, collaborateur_id, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        ON CONFLICT (id) DO NOTHING
                    `, [user.id, user.nom, user.prenom, user.email, user.login, user.password_hash, user.role, user.statut, user.collaborateur_id, user.created_at, user.updated_at]);
                } catch (error) {
                    console.log(`⚠️ Erreur avec utilisateur ${user.email}: ${error.message}`);
                }
            }
            console.log(`✅ ${extractedData.users.length} utilisateurs insérés`);
        }

        // Insérer les rôles
        if (extractedData.roles && extractedData.roles.length > 0) {
            console.log('📊 Insertion des rôles...');
            for (const role of extractedData.roles) {
                try {
                    await productionPool.query(`
                        INSERT INTO roles (id, name, description, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (id) DO NOTHING
                    `, [role.id, role.name, role.description, role.created_at, role.updated_at]);
                } catch (error) {
                    console.log(`⚠️ Erreur avec rôle ${role.name}: ${error.message}`);
                }
            }
            console.log(`✅ ${extractedData.roles.length} rôles insérés`);
        }

        // Insérer les permissions
        if (extractedData.permissions && extractedData.permissions.length > 0) {
            console.log('📊 Insertion des permissions...');
            for (const permission of extractedData.permissions) {
                try {
                    await productionPool.query(`
                        INSERT INTO permissions (id, name, description, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (id) DO NOTHING
                    `, [permission.id, permission.name, permission.description, permission.created_at, permission.updated_at]);
                } catch (error) {
                    console.log(`⚠️ Erreur avec permission ${permission.name}: ${error.message}`);
                }
            }
            console.log(`✅ ${extractedData.permissions.length} permissions insérées`);
        }

        // Insérer les role_permissions
        if (extractedData.role_permissions && extractedData.role_permissions.length > 0) {
            console.log('📊 Insertion des role_permissions...');
            for (const rolePerm of extractedData.role_permissions) {
                try {
                    await productionPool.query(`
                        INSERT INTO role_permissions (id, role_id, permission_id, created_at)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (id) DO NOTHING
                    `, [rolePerm.id, rolePerm.role_id, rolePerm.permission_id, rolePerm.created_at]);
                } catch (error) {
                    console.log(`⚠️ Erreur avec role_permission: ${error.message}`);
                }
            }
            console.log(`✅ ${extractedData.role_permissions.length} role_permissions insérées`);
        }

        // Insérer les user_permissions
        if (extractedData.user_permissions && extractedData.user_permissions.length > 0) {
            console.log('📊 Insertion des user_permissions...');
            for (const userPerm of extractedData.user_permissions) {
                try {
                    await productionPool.query(`
                        INSERT INTO user_permissions (id, user_id, permission_id, created_at)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (id) DO NOTHING
                    `, [userPerm.id, userPerm.user_id, userPerm.permission_id, userPerm.created_at]);
                } catch (error) {
                    console.log(`⚠️ Erreur avec user_permission: ${error.message}`);
                }
            }
            console.log(`✅ ${extractedData.user_permissions.length} user_permissions insérées`);
        }

        // Insérer les user_business_unit_access
        if (extractedData.user_business_unit_access && extractedData.user_business_unit_access.length > 0) {
            console.log('📊 Insertion des user_business_unit_access...');
            for (const userBU of extractedData.user_business_unit_access) {
                try {
                    await productionPool.query(`
                        INSERT INTO user_business_unit_access (id, user_id, business_unit_id, created_at)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (id) DO NOTHING
                    `, [userBU.id, userBU.user_id, userBU.business_unit_id, userBU.created_at]);
                } catch (error) {
                    console.log(`⚠️ Erreur avec user_business_unit_access: ${error.message}`);
                }
            }
            console.log(`✅ ${extractedData.user_business_unit_access.length} user_business_unit_access insérés`);
        }

        await productionPool.end();
        
        console.log('\n🎉 Recréation terminée avec succès !');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Testez la connexion avec vos identifiants locaux');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

recreateFromExtracted().catch(console.error);









