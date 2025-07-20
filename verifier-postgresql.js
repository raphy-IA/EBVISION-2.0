#!/usr/bin/env node

/**
 * Script spécial pour vérifier PostgreSQL
 * Vérifie plusieurs emplacements possibles
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 VÉRIFICATION SPÉCIALISÉE POSTGRESQL\n');

// Chemins possibles pour PostgreSQL
const possiblePaths = [
    'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\13\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\14\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\13\\bin\\psql.exe'
];

console.log('1️⃣ RECHERCHE DE POSTGRESQL');
console.log('==========================');

let psqlFound = false;
let psqlPath = '';

// Vérifier d'abord si psql est dans le PATH
try {
    execSync('psql --version', { stdio: 'pipe' });
    console.log('✅ PostgreSQL trouvé dans le PATH');
    psqlFound = true;
} catch (error) {
    console.log('❌ PostgreSQL non trouvé dans le PATH');
    console.log('   🔍 Recherche dans les emplacements standards...\n');
    
    // Chercher dans les emplacements possibles
    for (const pgPath of possiblePaths) {
        if (fs.existsSync(pgPath)) {
            console.log(`✅ PostgreSQL trouvé : ${pgPath}`);
            psqlPath = pgPath;
            psqlFound = true;
            break;
        }
    }
    
    if (!psqlFound) {
        console.log('❌ PostgreSQL non trouvé dans les emplacements standards');
        console.log('   💡 Solutions :');
        console.log('      1. Vérifiez que PostgreSQL est bien installé');
        console.log('      2. Ajoutez PostgreSQL au PATH Windows');
        console.log('      3. Utilisez le chemin complet vers psql.exe');
    }
}

console.log('');

// Test de connexion si PostgreSQL est trouvé
if (psqlFound) {
    console.log('2️⃣ TEST DE CONNEXION POSTGRESQL');
    console.log('===============================');
    
    try {
        // Charger les variables d'environnement
        require('dotenv').config();
        
        const dbName = process.env.DB_NAME || 'eb_vision_2_0';
        const dbUser = process.env.DB_USER || 'postgres';
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || '5432';
        
        console.log(`   Base de données : ${dbName}`);
        console.log(`   Utilisateur : ${dbUser}`);
        console.log(`   Hôte : ${dbHost}:${dbPort}`);
        
        // Tester la connexion
        const psqlCommand = psqlPath || 'psql';
        const testCommand = `"${psqlCommand}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "SELECT version();"`;
        
        try {
            execSync(testCommand, { 
                stdio: 'pipe',
                env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
            });
            console.log('✅ Connexion PostgreSQL réussie !');
            console.log('   🎉 PostgreSQL fonctionne correctement');
            
        } catch (error) {
            console.log('❌ Échec de la connexion PostgreSQL');
            console.log(`   Erreur : ${error.message}`);
            console.log('   💡 Solutions possibles :');
            console.log('      - Vérifiez le mot de passe dans .env');
            console.log('      - Vérifiez que la base de données existe');
            console.log('      - Vérifiez que PostgreSQL est démarré');
        }
        
    } catch (error) {
        console.log('❌ Erreur lors du chargement de la configuration');
        console.log(`   Erreur : ${error.message}`);
    }
}

console.log('');

// Instructions pour ajouter au PATH
if (!psqlFound || !psqlPath) {
    console.log('3️⃣ INSTRUCTIONS POUR AJOUTER POSTGRESQL AU PATH');
    console.log('================================================');
    console.log('Pour ajouter PostgreSQL au PATH Windows :');
    console.log('');
    console.log('1. Clic droit sur "Ce PC" > Propriétés');
    console.log('2. Paramètres système avancés');
    console.log('3. Variables d\'environnement');
    console.log('4. Dans "Variables système", trouvez "Path"');
    console.log('5. Modifier > Nouveau');
    console.log('6. Ajoutez le chemin vers le dossier bin de PostgreSQL');
    console.log('   Exemple : C:\\Program Files\\PostgreSQL\\15\\bin\\');
    console.log('7. OK partout et redémarrez votre terminal');
    console.log('');
    console.log('Ou utilisez PowerShell en tant qu\'administrateur :');
    console.log('$pgPath = "C:\\Program Files\\PostgreSQL\\15\\bin"');
    console.log('$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")');
    console.log('[Environment]::SetEnvironmentVariable("Path", "$currentPath;$pgPath", "Machine")');
}

console.log('');

// Résumé
console.log('📋 RÉSUMÉ');
console.log('==========');

if (psqlFound) {
    console.log('✅ PostgreSQL est installé et accessible');
    console.log('🚀 Vous pouvez maintenant continuer avec :');
    console.log('   npm run migrate');
    console.log('   npm run seed');
    console.log('   npm run test:quick');
} else {
    console.log('❌ PostgreSQL n\'est pas accessible');
    console.log('🔧 Résolvez le problème PATH avant de continuer');
} 