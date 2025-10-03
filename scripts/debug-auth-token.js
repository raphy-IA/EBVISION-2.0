#!/usr/bin/env node

/**
 * Script pour déboguer les problèmes d'authentification
 * Usage: node scripts/debug-auth-token.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DÉBOGAGE DES PROBLÈMES D\'AUTHENTIFICATION');
console.log('==============================================\n');

function debugAuth() {
    console.log('📋 VÉRIFICATIONS:');
    
    // 1. Vérifier que le fichier .env existe
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        console.log('✅ Fichier .env trouvé');
        
        const envContent = fs.readFileSync(envPath, 'utf8');
        const hasJwtSecret = envContent.includes('JWT_SECRET=');
        if (hasJwtSecret) {
            console.log('✅ JWT_SECRET configuré');
        } else {
            console.log('❌ JWT_SECRET manquant dans .env');
        }
    } else {
        console.log('❌ Fichier .env non trouvé');
    }
    
    // 2. Vérifier la configuration de la base de données
    console.log('\n🔍 Configuration de la base de données:');
    require('dotenv').config();
    
    const dbConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'eb_vision',
        password: process.env.DB_PASSWORD ? '***' : 'non défini',
        port: process.env.DB_PORT || 5432,
    };
    
    console.log('📊 Configuration DB:', dbConfig);
    
    // 3. Vérifier les variables d'environnement critiques
    console.log('\n🔍 Variables d\'environnement critiques:');
    const criticalVars = ['JWT_SECRET', 'DB_USER', 'DB_NAME', 'DB_HOST'];
    criticalVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
            console.log(`✅ ${varName}: ${varName === 'JWT_SECRET' ? '***' : value}`);
        } else {
            console.log(`❌ ${varName}: non défini`);
        }
    });
    
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('1. ✅ Vérifiez que l\'utilisateur est connecté dans le navigateur');
    console.log('2. ✅ Vérifiez que le token JWT est valide');
    console.log('3. ✅ Vérifiez que la base de données est accessible');
    console.log('4. ✅ Vérifiez les logs du serveur pour plus de détails');
    
    console.log('\n🔧 SOLUTION PROBABLE:');
    console.log('Le problème vient probablement de l\'authentification côté client.');
    console.log('L\'utilisateur doit se reconnecter ou le token a expiré.');
    console.log('Vérifiez dans la console du navigateur si le token est présent.');
}

debugAuth();
