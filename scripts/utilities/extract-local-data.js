// Script pour extraire les données locales et les recréer sur la production
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

async function extractLocalData() {
    console.log('🔍 Extraction des données locales...\n');
    
    try {
        // Configuration pour la base locale
        const localPool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'eb_vision_2_0',
            user: 'postgres',
            password: 'Canaan@2020', // Mot de passe correct
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        });

        console.log('1️⃣ Test de connexion à la base locale...');
        const testResult = await localPool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion locale réussie - Heure: ${testResult.rows[0].current_time}`);

        const extractedData = {
            users: [],
            business_units: [],
            roles: [],
            permissions: [],
            role_permissions: [],
            user_permissions: [],
            user_business_unit_access: [],
            companies: [],
            collaborators: [],
            missions: [],
            opportunities: []
        };

        console.log('\n2️⃣ Extraction des données d\'authentification...');
        
        // Extraire users
        try {
            const usersResult = await localPool.query(`
                SELECT id, nom, prenom, email, login, password_hash, role, statut, collaborateur_id, created_at, updated_at
                FROM users
            `);
            extractedData.users = usersResult.rows;
            console.log(`📊 Users: ${usersResult.rows.length} enregistrements extraits`);
        } catch (error) {
            console.log(`❌ Erreur avec users: ${error.message}`);
        }

        // Extraire business_units
        try {
            const buResult = await localPool.query(`
                SELECT id, name, description, responsable_principal_id, responsable_adjoint_id, created_at, updated_at
                FROM business_units
            `);
            extractedData.business_units = buResult.rows;
            console.log(`📊 Business Units: ${buResult.rows.length} enregistrements extraits`);
        } catch (error) {
            console.log(`❌ Erreur avec business_units: ${error.message}`);
        }

        // Extraire roles
        try {
            const rolesResult = await localPool.query(`
                SELECT id, name, description, created_at, updated_at
                FROM roles
            `);
            extractedData.roles = rolesResult.rows;
            console.log(`📊 Roles: ${rolesResult.rows.length} enregistrements extraits`);
        } catch (error) {
            console.log(`❌ Erreur avec roles: ${error.message}`);
        }

        // Extraire permissions
        try {
            const permissionsResult = await localPool.query(`
                SELECT id, name, description, created_at, updated_at
                FROM permissions
            `);
            extractedData.permissions = permissionsResult.rows;
            console.log(`📊 Permissions: ${permissionsResult.rows.length} enregistrements extraits`);
        } catch (error) {
            console.log(`❌ Erreur avec permissions: ${error.message}`);
        }

        // Extraire role_permissions
        try {
            const rolePermsResult = await localPool.query(`
                SELECT id, role_id, permission_id, created_at
                FROM role_permissions
            `);
            extractedData.role_permissions = rolePermsResult.rows;
            console.log(`📊 Role Permissions: ${rolePermsResult.rows.length} enregistrements extraits`);
        } catch (error) {
            console.log(`❌ Erreur avec role_permissions: ${error.message}`);
        }

        // Extraire user_permissions
        try {
            const userPermsResult = await localPool.query(`
                SELECT id, user_id, permission_id, created_at
                FROM user_permissions
            `);
            extractedData.user_permissions = userPermsResult.rows;
            console.log(`📊 User Permissions: ${userPermsResult.rows.length} enregistrements extraits`);
        } catch (error) {
            console.log(`❌ Erreur avec user_permissions: ${error.message}`);
        }

        // Extraire user_business_unit_access
        try {
            const userBUResult = await localPool.query(`
                SELECT id, user_id, business_unit_id, created_at
                FROM user_business_unit_access
            `);
            extractedData.user_business_unit_access = userBUResult.rows;
            console.log(`📊 User Business Unit Access: ${userBUResult.rows.length} enregistrements extraits`);
        } catch (error) {
            console.log(`❌ Erreur avec user_business_unit_access: ${error.message}`);
        }

        console.log('\n3️⃣ Extraction des autres données importantes...');
        
        // Extraire companies
        try {
            const companiesResult = await localPool.query(`
                SELECT id, name, sigle, description, created_at, updated_at
                FROM companies
                LIMIT 100
            `);
            extractedData.companies = companiesResult.rows;
            console.log(`📊 Companies: ${companiesResult.rows.length} enregistrements extraits (limité à 100)`);
        } catch (error) {
            console.log(`❌ Erreur avec companies: ${error.message}`);
        }

        // Extraire collaborateurs
        try {
            const collaboratorsResult = await localPool.query(`
                SELECT id, nom, prenom, email, matricule, statut, created_at, updated_at
                FROM collaborateurs
                LIMIT 50
            `);
            extractedData.collaborators = collaboratorsResult.rows;
            console.log(`📊 Collaborateurs: ${collaboratorsResult.rows.length} enregistrements extraits (limité à 50)`);
        } catch (error) {
            console.log(`❌ Erreur avec collaborateurs: ${error.message}`);
        }

        // Extraire missions
        try {
            const missionsResult = await localPool.query(`
                SELECT id, code, titre, description, statut, created_at, updated_at
                FROM missions
                LIMIT 50
            `);
            extractedData.missions = missionsResult.rows;
            console.log(`📊 Missions: ${missionsResult.rows.length} enregistrements extraits (limité à 50)`);
        } catch (error) {
            console.log(`❌ Erreur avec missions: ${error.message}`);
        }

        // Extraire opportunities
        try {
            const opportunitiesResult = await localPool.query(`
                SELECT id, titre, description, statut, created_at, updated_at
                FROM opportunities
                LIMIT 50
            `);
            extractedData.opportunities = opportunitiesResult.rows;
            console.log(`📊 Opportunities: ${opportunitiesResult.rows.length} enregistrements extraits (limité à 50)`);
        } catch (error) {
            console.log(`❌ Erreur avec opportunities: ${error.message}`);
        }

        await localPool.end();

        // Sauvegarder les données extraites
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `extracted_data_${timestamp}.json`;
        fs.writeFileSync(filename, JSON.stringify(extractedData, null, 2));
        
        console.log('\n🎯 Extraction terminée !');
        console.log(`📁 Données sauvegardées dans: ${filename}`);
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Transférez ce fichier sur le serveur de production');
        console.log('2. Exécutez: node scripts/recreate-from-extracted.js');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

extractLocalData().catch(console.error);
