#!/usr/bin/env node

/**
 * Script de vérification simplifié pour débutants
 * Version compatible avec require()
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 VÉRIFICATION SIMPLIFIÉE - EB-Vision 2.0\n');

let allChecksPassed = true;

// Fonction pour vérifier si une commande existe
function checkCommand(command, name) {
    try {
        execSync(`${command} --version`, { stdio: 'pipe' });
        console.log(`✅ ${name} : Installé`);
        return true;
    } catch (error) {
        console.log(`❌ ${name} : NON INSTALLÉ`);
        console.log(`   💡 Solution : Installez ${name} depuis le site officiel`);
        return false;
    }
}

// Fonction pour vérifier si un fichier existe
function checkFile(filePath, name) {
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${name} : Présent`);
        return true;
    } else {
        console.log(`❌ ${name} : MANQUANT`);
        console.log(`   💡 Solution : Créez le fichier ${name}`);
        return false;
    }
}

// Vérification 1: Outils de base
console.log('1️⃣ VÉRIFICATION DES OUTILS DE BASE');
console.log('=====================================');

const nodeCheck = checkCommand('node', 'Node.js');
const npmCheck = checkCommand('npm', 'npm');
const gitCheck = checkCommand('git', 'Git');
const psqlCheck = checkCommand('psql', 'PostgreSQL');

if (!nodeCheck || !npmCheck || !gitCheck || !psqlCheck) {
    allChecksPassed = false;
    console.log('\n⚠️  Certains outils ne sont pas installés.');
    console.log('   Veuillez les installer avant de continuer.\n');
} else {
    console.log('\n✅ Tous les outils de base sont installés !\n');
}

// Vérification 2: Structure du projet
console.log('2️⃣ VÉRIFICATION DE LA STRUCTURE DU PROJET');
console.log('==========================================');

const projectFiles = [
    { path: 'package.json', name: 'package.json' },
    { path: 'server.js', name: 'server.js' },
    { path: 'env.example', name: 'env.example' },
    { path: 'src/models/User.js', name: 'Modèle User' },
    { path: 'database/migrations/001_create_tables.sql', name: 'Migration SQL' }
];

let projectFilesOk = true;
for (const file of projectFiles) {
    if (!checkFile(file.path, file.name)) {
        projectFilesOk = false;
    }
}

if (!projectFilesOk) {
    allChecksPassed = false;
    console.log('\n⚠️  Certains fichiers du projet sont manquants.');
    console.log('   Vérifiez que vous êtes dans le bon dossier.\n');
} else {
    console.log('\n✅ Structure du projet correcte !\n');
}

// Vérification 3: Dépendances installées
console.log('3️⃣ VÉRIFICATION DES DÉPENDANCES');
console.log('================================');

if (fs.existsSync('node_modules')) {
    console.log('✅ node_modules : Présent');
    
    // Vérifier quelques dépendances importantes
    const importantDeps = [
        'node_modules/express',
        'node_modules/pg',
        'node_modules/bcryptjs',
        'node_modules/jsonwebtoken'
    ];
    
    let depsOk = true;
    for (const dep of importantDeps) {
        if (!fs.existsSync(dep)) {
            console.log(`❌ Dépendance manquante : ${dep.split('/').pop()}`);
            depsOk = false;
        }
    }
    
    if (depsOk) {
        console.log('✅ Toutes les dépendances importantes sont installées');
    } else {
        console.log('⚠️  Certaines dépendances sont manquantes');
        console.log('   💡 Solution : Exécutez "npm install"');
        allChecksPassed = false;
    }
} else {
    console.log('❌ node_modules : MANQUANT');
    console.log('   💡 Solution : Exécutez "npm install"');
    allChecksPassed = false;
}

console.log('');

// Vérification 4: Configuration
console.log('4️⃣ VÉRIFICATION DE LA CONFIGURATION');
console.log('====================================');

if (checkFile('.env', 'Fichier .env')) {
    // Lire le contenu du fichier .env
    const envContent = fs.readFileSync('.env', 'utf8');
    
    const requiredVars = [
        'DB_HOST',
        'DB_PORT', 
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'JWT_SECRET'
    ];
    
    let configOk = true;
    for (const varName of requiredVars) {
        if (envContent.includes(varName + '=')) {
            console.log(`✅ ${varName} : Configuré`);
        } else {
            console.log(`❌ ${varName} : NON CONFIGURÉ`);
            configOk = false;
        }
    }
    
    if (!configOk) {
        console.log('   💡 Solution : Configurez les variables dans .env');
        allChecksPassed = false;
    }
} else {
    console.log('   💡 Solution : Copiez env.example vers .env et configurez-le');
    allChecksPassed = false;
}

console.log('');

// Vérification 5: Test de connexion simple
console.log('5️⃣ TEST DE CONNEXION À LA BASE DE DONNÉES');
console.log('==========================================');

try {
    // Charger les variables d'environnement
    require('dotenv').config();
    
    console.log('✅ Variables d\'environnement chargées');
    console.log(`   Base de données : ${process.env.DB_NAME || 'Non configurée'}`);
    console.log(`   Utilisateur : ${process.env.DB_USER || 'Non configuré'}`);
    console.log(`   Hôte : ${process.env.DB_HOST || 'Non configuré'}`);
    
    if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
        console.log('❌ Configuration incomplète');
        console.log('   💡 Solution : Configurez toutes les variables dans .env');
        allChecksPassed = false;
    } else {
        console.log('✅ Configuration de base de données complète');
        console.log('   💡 Pour tester la connexion : npm run test:quick');
    }
    
} catch (error) {
    console.log('❌ Erreur lors du chargement de la configuration');
    console.log(`   Erreur : ${error.message}`);
    allChecksPassed = false;
}

console.log('');

// Résumé final
console.log('📋 RÉSUMÉ DE LA VÉRIFICATION');
console.log('=============================');

if (allChecksPassed) {
    console.log('🎉 VÉRIFICATIONS DE BASE PASSÉES !');
    console.log('');
    console.log('🚀 PROCHAINES ÉTAPES :');
    console.log('   1. npm run migrate       (Créer les tables)');
    console.log('   2. npm run seed          (Ajouter les données)');
    console.log('   3. npm run test:quick    (Test complet)');
    console.log('   4. npm run dev           (Démarrer le serveur)');
    console.log('');
    console.log('✅ Votre environnement est prêt pour la suite !');
} else {
    console.log('⚠️  CERTAINES VÉRIFICATIONS ONT ÉCHOUÉ');
    console.log('');
    console.log('🔧 CORRIGEZ LES PROBLÈMES CI-DESSUS PUIS RELANCEZ CE SCRIPT');
    console.log('');
    console.log('📖 Consultez le guide : guide-debutant.md');
    process.exit(1);
} 