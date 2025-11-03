#!/usr/bin/env node

/**
 * Script pour vérifier la table roles dans la base de données
 * Usage: node scripts/check-roles-table.js
 */

const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 VÉRIFICATION DE LA TABLE ROLES');
console.log('==================================\n');

async function checkRolesTable() {
    const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'eb_vision_2_0',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 5432,
    });

    try {
        console.log('📋 VÉRIFICATIONS:');
        
        // 1. Vérifier la connexion
        console.log('🔄 Test de connexion...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie');
        
        // 2. Vérifier l'existence de la table roles
        console.log('🔍 Vérification de la table roles...');
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'roles'
            );
        `);
        
        if (tableExists.rows[0].exists) {
            console.log('✅ Table roles existe');
            
            // 3. Compter les rôles
            const countResult = await pool.query('SELECT COUNT(*) as count FROM roles');
            const count = parseInt(countResult.rows[0].count);
            console.log(`📊 Nombre de rôles: ${count}`);
            
            if (count > 0) {
                // 4. Lister les rôles
                console.log('📋 Liste des rôles:');
                const roles = await pool.query('SELECT id, name, description FROM roles ORDER BY name');
                roles.rows.forEach((role, index) => {
                    console.log(`   ${index + 1}. ${role.name} (${role.id})`);
                });
            } else {
                console.log('❌ Aucun rôle trouvé dans la table');
            }
        } else {
            console.log('❌ Table roles n\'existe pas');
            console.log('💡 Exécutez: node scripts/setup-roles-system.js');
        }
        
        // 5. Vérifier la table user_roles
        console.log('\n🔍 Vérification de la table user_roles...');
        const userRolesExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'user_roles'
            );
        `);
        
        if (userRolesExists.rows[0].exists) {
            console.log('✅ Table user_roles existe');
            
            const userRolesCount = await pool.query('SELECT COUNT(*) as count FROM user_roles');
            console.log(`📊 Nombre d\'assignations de rôles: ${userRolesCount.rows[0].count}`);
        } else {
            console.log('❌ Table user_roles n\'existe pas');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error('💡 Vérifiez la configuration de la base de données');
    } finally {
        await pool.end();
    }
}

checkRolesTable().catch(console.error);










