#!/usr/bin/env node

/**
 * Script pour créer automatiquement le fichier .env
 */

const fs = require('fs');

console.log('🔧 CRÉATION AUTOMATIQUE DU FICHIER .ENV\n');

// Contenu du fichier .env
const envContent = `# Configuration de la base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eb_vision_2_0
DB_USER=postgres
DB_PASSWORD=Calypso2024

# Configuration JWT
JWT_SECRET=eb_vision_2_0_super_secret_key_2024
JWT_EXPIRES_IN=24h

# Configuration du serveur
PORT=3000
NODE_ENV=development

# Configuration de sécurité
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configuration des logs
LOG_LEVEL=info
`;

// Vérifier si le fichier existe déjà
if (fs.existsSync('.env')) {
    console.log('⚠️  Le fichier .env existe déjà');
    console.log('📋 Contenu actuel :');
    console.log('==================');
    const currentContent = fs.readFileSync('.env', 'utf8');
    console.log(currentContent);
    
    console.log('\n❓ Voulez-vous le remplacer ? (y/n)');
    process.stdin.once('data', (data) => {
        const answer = data.toString().trim().toLowerCase();
        if (answer === 'y' || answer === 'yes' || answer === 'o' || answer === 'oui') {
            createEnvFile();
        } else {
            console.log('❌ Fichier .env non modifié');
            process.exit(0);
        }
    });
} else {
    createEnvFile();
}

function createEnvFile() {
    try {
        fs.writeFileSync('.env', envContent);
        
        console.log('✅ FICHIER .ENV CRÉÉ AVEC SUCCÈS !');
        console.log('==================================');
        
        console.log('\n📋 CONTENU CRÉÉ :');
        console.log('==================');
        console.log(envContent);
        
        console.log('\n🧪 TEST DE LA CONFIGURATION...');
        
        // Tester la configuration
        require('dotenv').config();
        
        console.log('📋 Configuration chargée :');
        console.log(`   DB_HOST = "${process.env.DB_HOST}"`);
        console.log(`   DB_PORT = "${process.env.DB_PORT}"`);
        console.log(`   DB_NAME = "${process.env.DB_NAME}"`);
        console.log(`   DB_USER = "${process.env.DB_USER}"`);
        console.log(`   DB_PASSWORD = "${process.env.DB_PASSWORD ? '***configuré***' : 'NON CONFIGURÉ'}"`);
        console.log(`   JWT_SECRET = "${process.env.JWT_SECRET ? '***configuré***' : 'NON CONFIGURÉ'}"`);
        
        console.log('\n✅ Configuration chargée correctement !');
        console.log('🚀 Vous pouvez maintenant essayer :');
        console.log('   npm run migrate');
        
    } catch (error) {
        console.log('❌ Erreur lors de la création :');
        console.log(`   ${error.message}`);
    }
} 