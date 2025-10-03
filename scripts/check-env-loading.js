#!/usr/bin/env node

/**
 * Script pour vérifier pourquoi le fichier .env n'est pas lu correctement
 * Usage: node scripts/check-env-loading.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DU CHARGEMENT DU FICHIER .ENV');
console.log('==============================================\n');

function checkEnvLoading() {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        
        // 1. Vérifier l'existence du fichier
        console.log('1. 📁 Vérification de l\'existence du fichier:');
        if (fs.existsSync(envPath)) {
            console.log('   ✅ Fichier .env trouvé');
            console.log(`   📍 Chemin: ${envPath}`);
        } else {
            console.log('   ❌ Fichier .env non trouvé');
            return;
        }
        
        // 2. Vérifier les permissions
        console.log('\n2. 🔒 Vérification des permissions:');
        const stats = fs.statSync(envPath);
        const permissions = (stats.mode & parseInt('777', 8)).toString(8);
        console.log(`   📊 Permissions: ${permissions}`);
        
        if (permissions === '600') {
            console.log('   ✅ Permissions correctes (600)');
        } else {
            console.log('   ⚠️  Permissions non optimales (recommandé: 600)');
        }
        
        // 3. Lire le contenu brut
        console.log('\n3. 📖 Lecture du contenu brut:');
        const content = fs.readFileSync(envPath, 'utf8');
        console.log(`   📏 Taille: ${content.length} caractères`);
        console.log(`   📄 Lignes: ${content.split('\n').length}`);
        
        // 4. Parser les variables manuellement
        console.log('\n4. 🔍 Parsing manuel des variables:');
        const lines = content.split('\n');
        const variables = {};
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            
            // Ignorer les commentaires et lignes vides
            if (trimmedLine.startsWith('#') || trimmedLine === '') {
                return;
            }
            
            // Parser les variables
            const match = trimmedLine.match(/^([^=]+)=(.*)$/);
            if (match) {
                const [, key, value] = match;
                variables[key] = value;
                console.log(`   ✅ ${key} = ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
            } else {
                console.log(`   ⚠️  Ligne ${index + 1} mal formatée: ${trimmedLine}`);
            }
        });
        
        console.log(`\n   📊 Total variables trouvées: ${Object.keys(variables).length}`);
        
        // 5. Vérifier les variables critiques
        console.log('\n5. 🎯 Vérification des variables critiques:');
        const criticalVars = [
            'JWT_SECRET',
            'BCRYPT_ROUNDS', 
            'RATE_LIMIT_MAX_REQUESTS',
            'NODE_ENV',
            'CORS_ORIGIN'
        ];
        
        criticalVars.forEach(varName => {
            if (variables[varName]) {
                const value = variables[varName];
                let status = '✅';
                let message = `${varName} trouvé`;
                
                // Vérifications spécifiques
                if (varName === 'JWT_SECRET' && value.length < 50) {
                    status = '❌';
                    message = `${varName} trop court (${value.length} caractères)`;
                } else if (varName === 'BCRYPT_ROUNDS' && (!/^\d+$/.test(value) || parseInt(value) < 10)) {
                    status = '❌';
                    message = `${varName} invalide (${value})`;
                } else if (varName === 'RATE_LIMIT_MAX_REQUESTS' && !/^\d+$/.test(value)) {
                    status = '❌';
                    message = `${varName} invalide (${value})`;
                } else if (varName === 'NODE_ENV' && value !== 'production') {
                    status = '⚠️';
                    message = `${varName} = ${value} (recommandé: production)`;
                } else if (varName === 'CORS_ORIGIN' && !value.startsWith('https://')) {
                    status = '⚠️';
                    message = `${varName} = ${value} (recommandé: https://)`;
                }
                
                console.log(`   ${status} ${message}`);
            } else {
                console.log(`   ❌ ${varName} manquant`);
            }
        });
        
        // 6. Test de chargement avec dotenv
        console.log('\n6. 🧪 Test de chargement avec dotenv:');
        
        // Sauvegarder l'environnement actuel
        const originalEnv = { ...process.env };
        
        try {
            // Charger dotenv
            require('dotenv').config();
            
            // Vérifier si les variables sont chargées
            console.log('   📋 Variables chargées par dotenv:');
            criticalVars.forEach(varName => {
                const loadedValue = process.env[varName];
                if (loadedValue) {
                    console.log(`   ✅ ${varName} = ${loadedValue.substring(0, 20)}${loadedValue.length > 20 ? '...' : ''}`);
                } else {
                    console.log(`   ❌ ${varName} non chargé`);
                }
            });
            
            // Comparer avec le parsing manuel
            console.log('\n   🔄 Comparaison parsing manuel vs dotenv:');
            let differences = 0;
            criticalVars.forEach(varName => {
                const manualValue = variables[varName];
                const dotenvValue = process.env[varName];
                
                if (manualValue && dotenvValue) {
                    if (manualValue === dotenvValue) {
                        console.log(`   ✅ ${varName}: Identique`);
                    } else {
                        console.log(`   ❌ ${varName}: Différent`);
                        console.log(`      Manuel: ${manualValue.substring(0, 20)}...`);
                        console.log(`      Dotenv: ${dotenvValue.substring(0, 20)}...`);
                        differences++;
                    }
                } else if (manualValue && !dotenvValue) {
                    console.log(`   ❌ ${varName}: Trouvé manuellement mais pas par dotenv`);
                    differences++;
                } else if (!manualValue && dotenvValue) {
                    console.log(`   ⚠️  ${varName}: Trouvé par dotenv mais pas manuellement`);
                }
            });
            
            if (differences === 0) {
                console.log('\n   ✅ Aucune différence détectée - dotenv fonctionne correctement');
            } else {
                console.log(`\n   ❌ ${differences} différence(s) détectée(s)`);
            }
            
        } catch (error) {
            console.log(`   ❌ Erreur lors du chargement dotenv: ${error.message}`);
        }
        
        // 7. Recommandations
        console.log('\n7. 💡 RECOMMANDATIONS:');
        
        const issues = [];
        if (!variables.JWT_SECRET || variables.JWT_SECRET.length < 50) {
            issues.push('JWT_SECRET manquant ou trop court');
        }
        if (!variables.BCRYPT_ROUNDS || parseInt(variables.BCRYPT_ROUNDS) < 10) {
            issues.push('BCRYPT_ROUNDS manquant ou invalide');
        }
        if (!variables.RATE_LIMIT_MAX_REQUESTS) {
            issues.push('RATE_LIMIT_MAX_REQUESTS manquant');
        }
        if (permissions !== '600') {
            issues.push('Permissions du fichier .env non sécurisées');
        }
        
        if (issues.length === 0) {
            console.log('   ✅ Votre fichier .env semble correct');
            console.log('   🔧 Le problème pourrait être dans le script de vérification');
            console.log('   💡 Essayez: node scripts/verify-server-security.js');
        } else {
            issues.forEach(issue => {
                console.log(`   ❌ ${issue}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    }
}

// Exécuter la vérification
checkEnvLoading();
