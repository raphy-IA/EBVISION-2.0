const { pool } = require('./src/utils/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function diagnosticAuth() {
    try {
        console.log('🔍 Diagnostic complet du système d\'authentification...\n');
        
        // 1. Vérifier la structure des tables
        console.log('1️⃣ Structure des tables d\'authentification:');
        
        // Table users
        const usersStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Table users:');
        usersStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
        });
        
        // Table collaborateurs
        const collaborateursStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'collaborateurs' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Table collaborateurs:');
        collaborateursStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
        });
        
        // 2. Vérifier les relations user-collaborateur
        console.log('\n2️⃣ Relations user-collaborateur:');
        
        const userCollaborateurRelations = await pool.query(`
            SELECT 
                u.id as user_id,
                u.nom as user_nom,
                u.prenom as user_prenom,
                u.email as user_email,
                c.id as collaborateur_id,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom,
                c.user_id
            FROM users u
            LEFT JOIN collaborateurs c ON u.id = c.user_id
            ORDER BY u.created_at DESC
            LIMIT 10
        `);
        
        console.log(`📊 ${userCollaborateurRelations.rows.length} relations trouvées:`);
        userCollaborateurRelations.rows.forEach((rel, index) => {
            console.log(`  ${index + 1}. User: ${rel.user_nom} ${rel.user_prenom} (${rel.user_email})`);
            console.log(`     Collaborateur: ${rel.collaborateur_nom || 'N/A'} ${rel.collaborateur_prenom || 'N/A'}`);
            console.log(`     collaborateur.user_id: ${rel.user_id || 'NULL'}`);
            console.log('');
        });
        
        // 3. Vérifier les utilisateurs de test
        console.log('3️⃣ Utilisateurs de test:');
        const testUsers = await pool.query(`
            SELECT id, nom, prenom, email, login, role, statut, last_login
            FROM users 
            WHERE email LIKE '%test%' OR login LIKE '%test%'
            ORDER BY created_at DESC
        `);
        
        console.log(`📊 ${testUsers.rows.length} utilisateurs de test:`);
        testUsers.rows.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.nom} ${user.prenom} (${user.email})`);
            console.log(`     Login: ${user.login}, Role: ${user.role}, Statut: ${user.statut}`);
            console.log(`     Dernière connexion: ${user.last_login || 'Jamais'}`);
            console.log('');
        });
        
        // 4. Vérifier les tokens JWT
        console.log('4️⃣ Configuration JWT:');
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-2024';
        const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
        
        console.log(`  - JWT_SECRET: ${JWT_SECRET.substring(0, 10)}...`);
        console.log(`  - JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}`);
        
        // 5. Tester la création d'un token
        console.log('\n5️⃣ Test de création de token:');
        if (testUsers.rows.length > 0) {
            const testUser = testUsers.rows[0];
            const token = jwt.sign(
                {
                    id: testUser.id,
                    email: testUser.email,
                    nom: testUser.nom,
                    prenom: testUser.prenom,
                    role: testUser.role,
                    permissions: ['users:read', 'users:create', 'users:update', 'users:delete']
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );
            
            console.log('✅ Token créé avec succès');
            console.log(`  - Longueur: ${token.length} caractères`);
            
            // Vérifier le token
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                console.log('✅ Token vérifié avec succès');
                console.log(`  - User ID: ${decoded.id}`);
                console.log(`  - Email: ${decoded.email}`);
                console.log(`  - Expiration: ${new Date(decoded.exp * 1000).toLocaleString()}`);
            } catch (error) {
                console.log('❌ Erreur de vérification du token:', error.message);
            }
        }
        
        // 6. Vérifier les problèmes de déconnexion
        console.log('\n6️⃣ Analyse des problèmes de déconnexion:');
        
        // Vérifier le localStorage dans le navigateur
        console.log('  - Problème potentiel: localStorage persistant');
        console.log('  - Solution: Vérifier la suppression du localStorage');
        
        // Vérifier les tokens multiples
        console.log('  - Problème potentiel: Tokens multiples en cache');
        console.log('  - Solution: Nettoyer tous les tokens au logout');
        
        // 7. Recommandations
        console.log('\n7️⃣ Recommandations pour corriger les problèmes:');
        console.log('  ✅ 1. Améliorer la gestion du localStorage');
        console.log('  ✅ 2. Ajouter une vérification de token côté serveur');
        console.log('  ✅ 3. Implémenter un système de blacklist de tokens');
        console.log('  ✅ 4. Améliorer la relation user-collaborateur');
        console.log('  ✅ 5. Ajouter des logs de déconnexion');
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

diagnosticAuth(); 