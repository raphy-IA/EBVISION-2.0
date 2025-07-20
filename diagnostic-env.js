#!/usr/bin/env node

/**
 * Script de diagnostic pour les variables d'environnement
 */

console.log('🔍 DIAGNOSTIC DES VARIABLES D\'ENVIRONNEMENT\n');

// 1. Variables système (avant dotenv)
console.log('1️⃣ VARIABLES SYSTÈME (avant dotenv) :');
console.log('=====================================');
console.log(`   DB_HOST = "${process.env.DB_HOST || 'NON DÉFINI'}"`);
console.log(`   DB_PORT = "${process.env.DB_PORT || 'NON DÉFINI'}"`);
console.log(`   DB_NAME = "${process.env.DB_NAME || 'NON DÉFINI'}"`);
console.log(`   DB_USER = "${process.env.DB_USER || 'NON DÉFINI'}"`);
console.log(`   DB_PASSWORD = "${process.env.DB_PASSWORD ? '***configuré***' : 'NON DÉFINI'}"`);

// 2. Charger dotenv
console.log('\n2️⃣ CHARGEMENT DE DOTENV...');
try {
    require('dotenv').config();
    console.log('✅ dotenv chargé avec succès');
} catch (error) {
    console.log('❌ Erreur lors du chargement de dotenv :');
    console.log(`   ${error.message}`);
}

// 3. Variables après dotenv
console.log('\n3️⃣ VARIABLES APRÈS DOTENV :');
console.log('============================');
console.log(`   DB_HOST = "${process.env.DB_HOST || 'NON DÉFINI'}"`);
console.log(`   DB_PORT = "${process.env.DB_PORT || 'NON DÉFINI'}"`);
console.log(`   DB_NAME = "${process.env.DB_NAME || 'NON DÉFINI'}"`);
console.log(`   DB_USER = "${process.env.DB_USER || 'NON DÉFINI'}"`);
console.log(`   DB_PASSWORD = "${process.env.DB_PASSWORD ? '***configuré***' : 'NON DÉFINI'}"`);

// 4. Vérifier le fichier .env
console.log('\n4️⃣ VÉRIFICATION DU FICHIER .ENV :');
console.log('==================================');
const fs = require('fs');

if (fs.existsSync('.env')) {
    console.log('✅ Fichier .env trouvé');
    const envContent = fs.readFileSync('.env', 'utf8');
    console.log('📋 Contenu du fichier .env :');
    console.log('============================');
    
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.trim() && !line.trim().startsWith('#')) {
            console.log(`   ${line}`);
        }
    }
} else {
    console.log('❌ Fichier .env non trouvé');
}

// 5. Test de connexion directe avec les variables
console.log('\n5️⃣ TEST DE CONNEXION DIRECTE :');
console.log('==============================');

if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
    console.log('✅ Variables de connexion présentes');
    
    // Construire la chaîne de connexion
    const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    console.log('📋 Chaîne de connexion (masquée) :');
    console.log(`   postgresql://${process.env.DB_USER}:***@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    
    // Test avec pg
    try {
        const { Pool } = require('pg');
        const pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            max: 1,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        
        console.log('🔗 Tentative de connexion avec pg...');
        
        pool.query('SELECT version()', (err, result) => {
            if (err) {
                console.log('❌ Erreur de connexion avec pg :');
                console.log(`   ${err.message}`);
                console.log(`   Code: ${err.code}`);
                console.log(`   Detail: ${err.detail}`);
            } else {
                console.log('✅ Connexion réussie avec pg !');
                console.log(`   Version: ${result.rows[0].version}`);
            }
            pool.end();
        });
        
    } catch (error) {
        console.log('❌ Erreur lors de l\'import de pg :');
        console.log(`   ${error.message}`);
    }
} else {
    console.log('❌ Variables de connexion manquantes');
    console.log('   Vérifiez votre fichier .env');
}

console.log('\n📖 RÉSUMÉ DU DIAGNOSTIC :');
console.log('==========================');
console.log('🔍 Ce diagnostic montre exactement ce que Node.js voit');
console.log('🔍 Comparez avec ce que psql utilise');
console.log('🔍 Identifiez les différences de configuration'); 