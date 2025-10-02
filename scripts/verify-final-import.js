// Script pour vérifier l'état final de l'import
require('dotenv').config();
const { Pool } = require('pg');

async function verifyFinalImport() {
    console.log('🔍 Vérification finale de l\'import...\n');
    
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

        // 1. Test de connexion
        console.log('1️⃣ Test de connexion...');
        const testResult = await pool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion réussie - Heure serveur: ${testResult.rows[0].current_time}`);

        // 2. Lister toutes les tables
        console.log('\n2️⃣ Liste complète des tables...');
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
        
        tablesResult.rows.forEach(table => {
            if (authTables.includes(table.table_name)) {
                foundAuthTables.push(table.table_name);
            }
        });
        
        console.log('\n🔐 Tables d\'authentification trouvées:');
        if (foundAuthTables.length > 0) {
            foundAuthTables.forEach(table => console.log(`   ✅ ${table}`));
        } else {
            console.log('   ❌ Aucune table d\'authentification trouvée');
        }

        // 3. Vérifier les données dans les tables d'authentification
        console.log('\n3️⃣ Vérification des données...');
        
        for (const table of foundAuthTables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`📊 ${table}: ${countResult.rows[0].count} enregistrements`);
                
                // Si c'est la table users, afficher les utilisateurs
                if (table === 'users' && countResult.rows[0].count > 0) {
                    const usersResult = await pool.query(`
                        SELECT nom, prenom, email, role, statut 
                        FROM users 
                        LIMIT 5
                    `);
                    console.log('👥 Utilisateurs:');
                    usersResult.rows.forEach(user => {
                        console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - ${user.role} - ${user.statut}`);
                    });
                }
                
                // Si c'est la table business_units, afficher les business units
                if (table === 'business_units' && countResult.rows[0].count > 0) {
                    const buResult = await pool.query(`
                        SELECT name, description 
                        FROM business_units 
                        LIMIT 5
                    `);
                    console.log('🏢 Business Units:');
                    buResult.rows.forEach(bu => {
                        console.log(`   - ${bu.name}: ${bu.description || 'Aucune description'}`);
                    });
                }
            } catch (error) {
                console.log(`❌ Erreur lors de la vérification de ${table}: ${error.message}`);
            }
        }

        // 4. Vérifier les autres tables importantes
        console.log('\n4️⃣ Vérification des autres tables importantes...');
        const importantTables = ['utilisateurs', 'collaborateurs', 'missions', 'opportunities', 'companies'];
        
        for (const table of importantTables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`📊 ${table}: ${countResult.rows[0].count} enregistrements`);
            } catch (error) {
                console.log(`❌ Table ${table} non trouvée ou erreur: ${error.message}`);
            }
        }

        await pool.end();
        
        console.log('\n🎯 Vérification terminée !');
        
        if (foundAuthTables.includes('users') && foundAuthTables.includes('business_units')) {
            console.log('\n✅ Import réussi ! Toutes les tables d\'authentification sont présentes.');
            console.log('\n💡 Prochaines étapes:');
            console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
            console.log('2. Testez la connexion avec vos identifiants locaux');
            console.log('   - admin@trs.com');
            console.log('   - admin.test@trs.com');
            console.log('   - cdjiki@eb-partnersgroup.cm');
        } else {
            console.log('\n❌ Problème détecté : certaines tables d\'authentification sont manquantes.');
            console.log('💡 Essayez de redémarrer l\'application et de vérifier à nouveau.');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
    }
}

verifyFinalImport().catch(console.error);








