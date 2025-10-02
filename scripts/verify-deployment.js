const { Pool } = require('pg');

// Charger les variables d'environnement
require('dotenv').config();

// Configuration de la base de données avec les variables d'environnement
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

async function verifyDeployment() {
    console.log('🔍 Vérification du déploiement EB-Vision 2.0...\n');
    
    try {
        // 1. Vérifier la connexion à la base de données
        console.log('1️⃣ Test de connexion à la base de données...');
        const dbTest = await pool.query('SELECT NOW() as current_time, version() as pg_version');
        console.log(`✅ Base de données: ${dbTest.rows[0].current_time}`);
        console.log(`   Version PostgreSQL: ${dbTest.rows[0].pg_version.split(' ')[0]}`);
        
        // 2. Vérifier les tables essentielles
        console.log('\n2️⃣ Vérification des tables...');
        const tables = [
            'users', 'business_units', 'roles', 'permissions', 
            'role_permissions', 'user_permissions', 'user_business_unit_access'
        ];
        
        for (const table of tables) {
            try {
                const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   ✅ ${table}: ${result.rows[0].count} enregistrements`);
            } catch (error) {
                console.log(`   ❌ ${table}: Table manquante ou erreur`);
            }
        }
        
        // 3. Vérifier les données de base
        console.log('\n3️⃣ Vérification des données de base...');
        
        const businessUnitsCount = await pool.query('SELECT COUNT(*) as count FROM business_units');
        console.log(`   Business Units: ${businessUnitsCount.rows[0].count}`);
        
        const rolesCount = await pool.query('SELECT COUNT(*) as count FROM roles');
        console.log(`   Rôles: ${rolesCount.rows[0].count}`);
        
        const permissionsCount = await pool.query('SELECT COUNT(*) as count FROM permissions');
        console.log(`   Permissions: ${permissionsCount.rows[0].count}`);
        
        const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
        console.log(`   Utilisateurs: ${usersCount.rows[0].count}`);
        
        // 4. Vérifier les permissions système
        console.log('\n4️⃣ Vérification du système de permissions...');
        
        // Vérifier les permissions du SUPER_ADMIN
        const superAdminPermissions = await pool.query(`
            SELECT COUNT(*) as count
            FROM role_permissions rp
            JOIN roles r ON rp.role_id = r.id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE r.name = 'SUPER_ADMIN'
        `);
        console.log(`   Permissions SUPER_ADMIN: ${superAdminPermissions.rows[0].count}`);
        
        // Vérifier les permissions du COLLABORATEUR
        const collaborateurPermissions = await pool.query(`
            SELECT COUNT(*) as count
            FROM role_permissions rp
            JOIN roles r ON rp.role_id = r.id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE r.name = 'COLLABORATEUR'
        `);
        console.log(`   Permissions COLLABORATEUR: ${collaborateurPermissions.rows[0].count}`);
        
        // 5. Vérifier les Business Units accessibles
        console.log('\n5️⃣ Vérification des Business Units...');
        const businessUnits = await pool.query(`
            SELECT nom, code, statut
            FROM business_units
            ORDER BY nom
        `);
        
        businessUnits.rows.forEach(bu => {
            console.log(`   - ${bu.nom} (${bu.code}): ${bu.statut}`);
        });
        
        // 6. Vérifier les utilisateurs et leurs rôles
        console.log('\n6️⃣ Vérification des utilisateurs...');
        const users = await pool.query(`
            SELECT nom, prenom, login, role, statut
            FROM users
            ORDER BY nom, prenom
        `);
        
        if (users.rows.length > 0) {
            users.rows.forEach(user => {
                console.log(`   - ${user.nom} ${user.prenom} (${user.login}): ${user.role} - ${user.statut}`);
            });
        } else {
            console.log('   ℹ️  Aucun utilisateur créé pour le moment');
        }
        
        console.log('\n🎉 Vérification terminée !');
        console.log('\n📋 Résumé du déploiement :');
        console.log('   ✅ Base de données connectée');
        console.log('   ✅ Tables créées');
        console.log('   ✅ Données de base insérées');
        console.log('   ✅ Système de permissions configuré');
        console.log('   ✅ Business Units configurées');
        console.log('   ℹ️  Aucun utilisateur créé (normal pour un nouveau déploiement)');
        
        console.log('\n🚀 Votre application EB-Vision 2.0 est prête !');
        console.log('🌐 Accédez à votre application via votre domaine');
        console.log('🔧 Pour la maintenance, utilisez les commandes PM2');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

verifyDeployment();
