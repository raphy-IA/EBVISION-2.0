// Script pour vérifier les tables manquantes
require('dotenv').config();
const { Pool } = require('pg');

async function checkMissingTables() {
    console.log('🔍 Vérification des tables manquantes...\n');
    
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

        // 1. Vérifier si les tables existent avec une requête directe
        console.log('1️⃣ Vérification directe des tables...');
        
        try {
            const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
            console.log(`✅ Table users existe: ${usersResult.rows[0].count} enregistrements`);
        } catch (error) {
            console.log(`❌ Table users n'existe pas: ${error.message}`);
        }
        
        try {
            const buResult = await pool.query('SELECT COUNT(*) as count FROM business_units');
            console.log(`✅ Table business_units existe: ${buResult.rows[0].count} enregistrements`);
        } catch (error) {
            console.log(`❌ Table business_units n'existe pas: ${error.message}`);
        }

        // 2. Lister toutes les tables qui contiennent "user" ou "business"
        console.log('\n2️⃣ Recherche de tables similaires...');
        const similarTables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name ILIKE '%user%' OR table_name ILIKE '%business%' OR table_name ILIKE '%unit%')
            ORDER BY table_name
        `);
        
        console.log('📋 Tables trouvées:');
        similarTables.rows.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });

        // 3. Vérifier les tables d'authentification existantes
        console.log('\n3️⃣ Vérification des tables d\'authentification existantes...');
        const authTables = ['roles', 'permissions', 'role_permissions', 'user_permissions', 'user_business_unit_access'];
        
        for (const table of authTables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`📊 ${table}: ${countResult.rows[0].count} enregistrements`);
                
                if (table === 'roles' && countResult.rows[0].count > 0) {
                    const rolesResult = await pool.query(`SELECT name, description FROM roles LIMIT 5`);
                    console.log('🎭 Rôles:');
                    rolesResult.rows.forEach(role => {
                        console.log(`   - ${role.name}: ${role.description || 'Aucune description'}`);
                    });
                }
            } catch (error) {
                console.log(`❌ Erreur avec ${table}: ${error.message}`);
            }
        }

        await pool.end();
        
        console.log('\n🎯 Analyse terminée !');
        console.log('\n💡 Si les tables users et business_units sont manquantes,');
        console.log('   nous devrons les recréer avec le script fix-missing-tables.js');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

checkMissingTables().catch(console.error);










