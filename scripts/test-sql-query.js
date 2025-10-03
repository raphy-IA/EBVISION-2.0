#!/usr/bin/env node

/**
 * Script pour tester directement la requête SQL
 * Usage: node scripts/test-sql-query.js
 */

const { Pool } = require('pg');
require('dotenv').config();

console.log('🧪 TEST DE LA REQUÊTE SQL');
console.log('=========================\n');

async function testSQLQuery() {
    const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'eb_vision_2_0',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 5432,
    });

    try {
        console.log('🔄 Test de connexion...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie');
        
        console.log('🔄 Test de la requête SQL exacte...');
        const rolesQuery = `
            SELECT id, name, description
            FROM roles
            ORDER BY name
        `;
        
        console.log('📋 Requête SQL:', rolesQuery);
        
        const rolesResult = await pool.query(rolesQuery);
        const roles = rolesResult.rows;
        
        console.log(`✅ ${roles.length} rôles récupérés`);
        console.log('📊 Rôles:');
        roles.forEach((role, index) => {
            console.log(`   ${index + 1}. ${role.name} (${role.id}) - ${role.description || 'Pas de description'}`);
        });
        
        console.log('\n✅ Requête SQL fonctionne correctement!');
        
    } catch (error) {
        console.error('❌ Erreur SQL:', error.message);
        console.error('💡 Détails:', error);
    } finally {
        await pool.end();
    }
}

testSQLQuery().catch(console.error);

