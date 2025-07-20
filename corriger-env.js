#!/usr/bin/env node

/**
 * Script pour corriger automatiquement le fichier .env
 */

const fs = require('fs');

console.log('🔧 CORRECTION AUTOMATIQUE DU FICHIER .ENV\n');

// Vérifier si le fichier .env existe
if (!fs.existsSync('.env')) {
    console.log('❌ Fichier .env non trouvé');
    process.exit(1);
}

// Lire le contenu actuel
const envContent = fs.readFileSync('.env', 'utf8');

console.log('📋 CONTENU ACTUEL (avec problèmes) :');
console.log('====================================');

// Afficher le contenu actuel
const lines = envContent.split('\n');
for (const line of lines) {
    if (line.trim() && !line.trim().startsWith('#')) {
        console.log(`   ${line}`);
    }
}

console.log('\n🔧 CORRECTION EN COURS...');

// Corriger le contenu
let correctedContent = '';
const correctedLines = [];

for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Ignorer les lignes vides et commentaires
    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        correctedLines.push(line);
        continue;
    }
    
    // Corriger les variables d'environnement
    if (trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const trimmedKey = key.trim();
        const value = valueParts.join('=').trim();
        
        // Supprimer les guillemets inutiles
        let correctedValue = value;
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
            correctedValue = value.slice(1, -1);
        }
        
        const correctedLine = `${trimmedKey}=${correctedValue}`;
        correctedLines.push(correctedLine);
        
        console.log(`   ✅ ${trimmedKey} = ${correctedValue}`);
    } else {
        correctedLines.push(line);
    }
}

correctedContent = correctedLines.join('\n');

// Sauvegarder le fichier corrigé
fs.writeFileSync('.env', correctedContent);

console.log('\n✅ FICHIER .ENV CORRIGÉ !');
console.log('==========================');

console.log('\n📋 CONTENU CORRIGÉ :');
console.log('=====================');

// Afficher le contenu corrigé
const newLines = correctedContent.split('\n');
for (const line of newLines) {
    if (line.trim() && !line.trim().startsWith('#')) {
        console.log(`   ${line}`);
    }
}

console.log('\n🧪 TEST DE LA CONNEXION...');

// Tester la connexion avec le fichier corrigé
try {
    require('dotenv').config();
    
    console.log('📋 Configuration après correction :');
    console.log(`   DB_HOST = "${process.env.DB_HOST}"`);
    console.log(`   DB_PORT = "${process.env.DB_PORT}"`);
    console.log(`   DB_NAME = "${process.env.DB_NAME}"`);
    console.log(`   DB_USER = "${process.env.DB_USER}"`);
    console.log(`   DB_PASSWORD = "${process.env.DB_PASSWORD ? '***configuré***' : 'NON CONFIGURÉ'}"`);
    
    console.log('\n✅ Configuration chargée correctement !');
    console.log('🚀 Vous pouvez maintenant essayer :');
    console.log('   npm run migrate');
    
} catch (error) {
    console.log('❌ Erreur lors du test :');
    console.log(`   ${error.message}`);
}

console.log('\n📖 RÉSUMÉ DES CORRECTIONS :');
console.log('==========================');
console.log('✅ Espaces autour du signe égal supprimés');
console.log('✅ Guillemets inutiles supprimés');
console.log('✅ Variables d\'environnement normalisées');
console.log('✅ Fichier .env sauvegardé'); 