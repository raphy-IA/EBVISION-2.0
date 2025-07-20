#!/usr/bin/env node

/**
 * Script pour vérifier le fichier .env de manière sécurisée
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DU FICHIER .ENV\n');

// Vérifier si le fichier .env existe
if (!fs.existsSync('.env')) {
    console.log('❌ Fichier .env non trouvé');
    console.log('💡 Solution : Copiez env.example vers .env');
    process.exit(1);
}

// Lire le contenu du fichier .env
const envContent = fs.readFileSync('.env', 'utf8');

console.log('📋 CONTENU DU FICHIER .ENV :');
console.log('============================');

// Variables requises
const requiredVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME', 
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET'
];

let allVarsPresent = true;

// Analyser chaque ligne
const lines = envContent.split('\n');
for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Ignorer les lignes vides et les commentaires
    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        continue;
    }
    
    // Vérifier si c'est une variable d'environnement
    if (trimmedLine.includes('=')) {
        const [key, value] = trimmedLine.split('=', 2);
        const trimmedKey = key.trim();
        const trimmedValue = value.trim();
        
        // Afficher la variable de manière sécurisée
        if (trimmedKey === 'DB_PASSWORD') {
            // Masquer le mot de passe
            const maskedPassword = trimmedValue.length > 2 
                ? trimmedValue.substring(0, 2) + '*'.repeat(trimmedValue.length - 2)
                : '***';
            console.log(`✅ ${trimmedKey} = ${maskedPassword} (${trimmedValue.length} caractères)`);
        } else if (trimmedKey === 'JWT_SECRET') {
            // Masquer partiellement le secret JWT
            const maskedSecret = trimmedValue.length > 4 
                ? trimmedValue.substring(0, 4) + '*'.repeat(trimmedValue.length - 4)
                : '***';
            console.log(`✅ ${trimmedKey} = ${maskedSecret} (${trimmedValue.length} caractères)`);
        } else {
            console.log(`✅ ${trimmedKey} = ${trimmedValue}`);
        }
        
        // Vérifier si c'est une variable requise
        if (requiredVars.includes(trimmedKey)) {
            if (!trimmedValue || trimmedValue === '') {
                console.log(`❌ ${trimmedKey} : VALEUR VIDE`);
                allVarsPresent = false;
            }
        }
    } else {
        console.log(`⚠️  Ligne mal formatée : ${trimmedLine}`);
    }
}

console.log('\n📊 VÉRIFICATION DES VARIABLES REQUISES :');
console.log('========================================');

// Vérifier que toutes les variables requises sont présentes
for (const varName of requiredVars) {
    if (envContent.includes(varName + '=')) {
        console.log(`✅ ${varName} : Présente`);
    } else {
        console.log(`❌ ${varName} : MANQUANTE`);
        allVarsPresent = false;
    }
}

console.log('\n🔧 DÉTECTION DES PROBLÈMES COURANTS :');
console.log('=====================================');

// Vérifier les problèmes courants
const problems = [];

// Vérifier les espaces autour du signe égal
if (envContent.includes(' = ') || envContent.includes('= ')) {
    problems.push('Espaces autour du signe égal (peut causer des problèmes)');
}

// Vérifier les guillemets inutiles
if (envContent.includes('DB_PASSWORD="') || envContent.includes("DB_PASSWORD='")) {
    problems.push('Guillemets autour du mot de passe (peuvent causer des problèmes)');
}

// Vérifier les caractères spéciaux non échappés
if (envContent.includes('\\') && !envContent.includes('\\\\')) {
    problems.push('Caractères d\'échappement potentiellement mal gérés');
}

if (problems.length === 0) {
    console.log('✅ Aucun problème détecté');
} else {
    for (const problem of problems) {
        console.log(`⚠️  ${problem}`);
    }
}

console.log('\n📋 EXEMPLE DE CONFIGURATION CORRECTE :');
console.log('=====================================');
console.log('DB_HOST=localhost');
console.log('DB_PORT=5432');
console.log('DB_NAME=eb_vision_2_0');
console.log('DB_USER=postgres');
console.log('DB_PASSWORD=votre_mot_de_passe_sans_guillemets');
console.log('JWT_SECRET=votre_secret_jwt_super_securise');

console.log('\n📋 RÉSUMÉ :');
console.log('===========');

if (allVarsPresent) {
    console.log('✅ Toutes les variables requises sont présentes');
    console.log('🔧 Si vous avez encore des problèmes d\'authentification :');
    console.log('   1. Vérifiez que le mot de passe PostgreSQL est correct');
    console.log('   2. Testez avec : psql -U postgres');
    console.log('   3. Vérifiez qu\'il n\'y a pas d\'espaces en trop');
    console.log('   4. Vérifiez qu\'il n\'y a pas de guillemets autour du mot de passe');
} else {
    console.log('❌ Certaines variables sont manquantes ou vides');
    console.log('💡 Complétez le fichier .env avec les variables manquantes');
}

console.log('\n🧪 Pour tester la connexion : npm run test:db'); 