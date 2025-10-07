#!/usr/bin/env node

/**
 * Script pour générer une clé JWT sécurisée
 * Usage: node scripts/generate-secure-jwt-key.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Génération d\'une clé JWT sécurisée...\n');

// Générer une clé de 64 bytes (512 bits)
const jwtSecret = crypto.randomBytes(64).toString('base64');

console.log('✅ Clé JWT générée avec succès !');
console.log('📋 Clé générée :');
console.log(jwtSecret);
console.log('\n📝 Instructions :');
console.log('1. Copiez cette clé dans votre fichier .env :');
console.log(`   JWT_SECRET=${jwtSecret}`);
console.log('\n2. Ou exécutez ce script avec --update pour mettre à jour automatiquement :');
console.log('   node scripts/generate-secure-jwt-key.js --update');

// Option pour mettre à jour automatiquement le fichier .env
if (process.argv.includes('--update')) {
    const envPath = path.join(__dirname, '..', '.env');
    const envExamplePath = path.join(__dirname, '..', 'env.example');
    
    let envContent = '';
    
    // Lire le fichier .env s'il existe, sinon utiliser env.example
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    } else if (fs.existsSync(envExamplePath)) {
        envContent = fs.readFileSync(envExamplePath, 'utf8');
    } else {
        console.log('❌ Aucun fichier .env ou env.example trouvé');
        process.exit(1);
    }
    
    // Remplacer la clé JWT
    const updatedContent = envContent.replace(
        /JWT_SECRET=.*/,
        `JWT_SECRET=${jwtSecret}`
    );
    
    // Écrire le fichier .env
    fs.writeFileSync(envPath, updatedContent);
    console.log('\n✅ Fichier .env mis à jour avec la nouvelle clé JWT !');
    console.log('⚠️  IMPORTANT : Redémarrez votre serveur pour appliquer les changements');
}

console.log('\n🔒 SÉCURITÉ :');
console.log('- Cette clé est cryptographiquement forte (512 bits)');
console.log('- Ne la partagez JAMAIS publiquement');
console.log('- Sauvegardez-la de manière sécurisée');
console.log('- Changez-la régulièrement en production');


