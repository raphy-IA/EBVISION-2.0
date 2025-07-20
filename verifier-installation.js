#!/usr/bin/env node

/**
 * Script de vérification automatique de l'installation
 * Pour débutants - vérifie chaque étape
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 VÉRIFICATION AUTOMATIQUE DE L\'INSTALLATION - EB-Vision 2.0\n');

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

// Vérification 5: Base de données
console.log('5️⃣ VÉRIFICATION DE LA BASE DE DONNÉES');
console.log('======================================');

try {
    // Essayer de se connecter à PostgreSQL
    const { Pool } = await import('pg');
    const dotenv = await import('dotenv');
    dotenv.config();
    
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'eb_vision_2_0',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        connectionTimeoutMillis: 5000
    });
    
    const client = await pool.connect();
    console.log('✅ Connexion PostgreSQL : Réussie');
    
    // Vérifier si la base de données existe
    const dbResult = await client.query(`
        SELECT datname FROM pg_database 
        WHERE datname = $1
    `, [process.env.DB_NAME || 'eb_vision_2_0']);
    
    if (dbResult.rows.length > 0) {
        console.log('✅ Base de données : Existe');
        
        // Vérifier les tables
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        const expectedTables = [
            'users', 'divisions', 'clients', 'contacts', 
            'fiscal_years', 'roles', 'permissions'
        ];
        
        const foundTables = tablesResult.rows.map(row => row.table_name);
        const missingTables = expectedTables.filter(table => !foundTables.includes(table));
        
        if (missingTables.length === 0) {
            console.log(`✅ Tables : Toutes présentes (${foundTables.length} tables)`);
        } else {
            console.log(`❌ Tables manquantes : ${missingTables.join(', ')}`);
            console.log('   💡 Solution : Exécutez "npm run migrate"');
            allChecksPassed = false;
        }
        
        // Vérifier les données
        const userCount = await client.query('SELECT COUNT(*) as count FROM users');
        if (parseInt(userCount.rows[0].count) > 0) {
            console.log('✅ Données : Présentes');
        } else {
            console.log('❌ Données : MANQUANTES');
            console.log('   💡 Solution : Exécutez "npm run seed"');
            allChecksPassed = false;
        }
        
    } else {
        console.log('❌ Base de données : N\'EXISTE PAS');
        console.log('   💡 Solution : Créez la base de données "eb_vision_2_0"');
        allChecksPassed = false;
    }
    
    client.release();
    await pool.end();
    
} catch (error) {
    console.log('❌ Connexion PostgreSQL : ÉCHEC');
    console.log(`   Erreur : ${error.message}`);
    console.log('   💡 Solutions possibles :');
    console.log('      - Vérifiez que PostgreSQL est démarré');
    console.log('      - Vérifiez les paramètres dans .env');
    console.log('      - Vérifiez que la base de données existe');
    allChecksPassed = false;
}

console.log('');

// Résumé final
console.log('📋 RÉSUMÉ DE LA VÉRIFICATION');
console.log('=============================');

if (allChecksPassed) {
    console.log('🎉 TOUTES LES VÉRIFICATIONS SONT PASSÉES !');
    console.log('');
    console.log('🚀 PROCHAINES ÉTAPES :');
    console.log('   1. npm run test:quick    (Test complet)');
    console.log('   2. npm run dev           (Démarrer le serveur)');
    console.log('   3. Ouvrir http://localhost:3000');
    console.log('');
    console.log('✅ Votre installation est prête !');
} else {
    console.log('⚠️  CERTAINES VÉRIFICATIONS ONT ÉCHOUÉ');
    console.log('');
    console.log('🔧 CORRIGEZ LES PROBLÈMES CI-DESSUS PUIS RELANCEZ CE SCRIPT');
    console.log('');
    console.log('📖 Consultez le guide : guide-debutant.md');
    process.exit(1);
}

// Fonction async wrapper
async function main() {
    // Le code principal est déjà async
}

// Exécuter le script
main().catch(console.error); 