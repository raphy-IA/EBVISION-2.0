// Script pour vérifier l'état réel de l'import
require('dotenv').config();
const { Pool } = require('pg');

async function checkImportStatus() {
    console.log('🔍 Vérification détaillée de l\'état de l\'import...\n');
    
    try {
        // 1. Configuration de la base de données
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

        // 2. Lister toutes les tables
        console.log('1️⃣ Liste complète des tables...');
        const tablesResult = await pool.query(`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log(`📋 Nombre total de tables: ${tablesResult.rows.length}`);
        
        // Chercher les tables d'authentification
        const authTables = ['users', 'business_units', 'roles', 'permissions', 'role_permissions', 'user_permissions', 'user_business_unit_access'];
        const foundAuthTables = [];
        const missingAuthTables = [];
        
        tablesResult.rows.forEach(table => {
            if (authTables.includes(table.table_name)) {
                foundAuthTables.push(table.table_name);
            }
        });
        
        authTables.forEach(table => {
            if (!foundAuthTables.includes(table)) {
                missingAuthTables.push(table);
            }
        });
        
        console.log('\n🔐 Tables d\'authentification trouvées:');
        if (foundAuthTables.length > 0) {
            foundAuthTables.forEach(table => console.log(`   ✅ ${table}`));
        } else {
            console.log('   ❌ Aucune table d\'authentification trouvée');
        }
        
        console.log('\n❌ Tables d\'authentification manquantes:');
        if (missingAuthTables.length > 0) {
            missingAuthTables.forEach(table => console.log(`   - ${table}`));
        } else {
            console.log('   ✅ Toutes les tables d\'authentification sont présentes');
        }

        // 3. Vérifier les données dans les tables d'authentification existantes
        console.log('\n2️⃣ Vérification des données dans les tables d\'authentification...');
        
        for (const table of foundAuthTables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   📊 ${table}: ${countResult.rows[0].count} enregistrements`);
                
                // Si c'est la table users, afficher les utilisateurs
                if (table === 'users' && countResult.rows[0].count > 0) {
                    const usersResult = await pool.query(`
                        SELECT nom, prenom, email, role, statut 
                        FROM users 
                        LIMIT 5
                    `);
                    console.log('   👥 Utilisateurs:');
                    usersResult.rows.forEach(user => {
                        console.log(`      - ${user.nom} ${user.prenom} (${user.email}) - ${user.role} - ${user.statut}`);
                    });
                }
            } catch (error) {
                console.log(`   ❌ Erreur lors de la vérification de ${table}: ${error.message}`);
            }
        }

        // 4. Vérifier les autres tables importantes
        console.log('\n3️⃣ Vérification des autres tables importantes...');
        const importantTables = ['utilisateurs', 'collaborateurs', 'missions', 'opportunities', 'companies'];
        
        for (const table of importantTables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   📊 ${table}: ${countResult.rows[0].count} enregistrements`);
            } catch (error) {
                console.log(`   ❌ Table ${table} non trouvée ou erreur: ${error.message}`);
            }
        }

        await pool.end();
        
        console.log('\n🎯 Analyse terminée !');
        
        if (missingAuthTables.length > 0) {
            console.log('\n💡 Recommandations:');
            console.log('1. L\'import a probablement échoué partiellement à cause des erreurs d\'encodage');
            console.log('2. Les tables d\'authentification manquantes doivent être recréées');
            console.log('3. Exécutez: node scripts/fix-missing-tables.js');
        } else {
            console.log('\n✅ L\'import semble avoir réussi !');
            console.log('💡 Si vous ne pouvez pas vous connecter, vérifiez les logs de l\'application');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
    }
}

checkImportStatus().catch(console.error);











