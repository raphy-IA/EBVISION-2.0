#!/usr/bin/env node

/**
 * Script de diagnostic du fichier .env
 * Usage: node scripts/diagnose-env.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNOSTIC DU FICHIER .ENV');
console.log('==============================\n');

function diagnoseEnv() {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        
        // Vérifier si le fichier existe
        if (!fs.existsSync(envPath)) {
            console.log('❌ Fichier .env non trouvé');
            console.log('💡 Solution: Exécutez node scripts/fix-production-env.js');
            return;
        }
        
        console.log('✅ Fichier .env trouvé');
        
        // Lire le contenu
        const content = fs.readFileSync(envPath, 'utf8');
        console.log(`📏 Taille du fichier: ${content.length} caractères\n`);
        
        // Analyser les variables
        const lines = content.split('\n');
        const variables = {};
        let lineNumber = 0;
        
        lines.forEach(line => {
            lineNumber++;
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
            } else {
                console.log(`⚠️  Ligne ${lineNumber} mal formatée: ${trimmedLine}`);
            }
        });
        
        console.log(`📊 Variables trouvées: ${Object.keys(variables).length}\n`);
        
        // Vérifier les variables critiques
        const criticalVars = [
            'JWT_SECRET',
            'BCRYPT_ROUNDS',
            'RATE_LIMIT_MAX_REQUESTS',
            'NODE_ENV',
            'CORS_ORIGIN',
            'DB_PASSWORD'
        ];
        
        console.log('🔍 Vérification des variables critiques:');
        criticalVars.forEach(varName => {
            if (variables[varName]) {
                const value = variables[varName];
                let status = '✅';
                let message = `${varName} défini`;
                
                // Vérifications spécifiques
                switch (varName) {
                    case 'JWT_SECRET':
                        if (value.length < 50) {
                            status = '❌';
                            message = `${varName} trop court (${value.length} caractères)`;
                        } else {
                            message = `${varName} correct (${value.length} caractères)`;
                        }
                        break;
                    case 'BCRYPT_ROUNDS':
                        if (!/^\d+$/.test(value) || parseInt(value) < 10) {
                            status = '❌';
                            message = `${varName} invalide (${value})`;
                        } else {
                            message = `${varName} correct (${value})`;
                        }
                        break;
                    case 'RATE_LIMIT_MAX_REQUESTS':
                        if (!/^\d+$/.test(value)) {
                            status = '❌';
                            message = `${varName} invalide (${value})`;
                        } else {
                            message = `${varName} correct (${value})`;
                        }
                        break;
                    case 'NODE_ENV':
                        if (value !== 'production') {
                            status = '⚠️';
                            message = `${varName} = ${value} (recommandé: production)`;
                        } else {
                            message = `${varName} correct (${value})`;
                        }
                        break;
                    case 'CORS_ORIGIN':
                        if (!value.startsWith('https://')) {
                            status = '⚠️';
                            message = `${varName} = ${value} (recommandé: https://)`;
                        } else {
                            message = `${varName} correct (${value})`;
                        }
                        break;
                    case 'DB_PASSWORD':
                        if (value === 'your_db_password_here') {
                            status = '❌';
                            message = `${varName} non configuré (valeur par défaut)`;
                        } else {
                            message = `${varName} configuré`;
                        }
                        break;
                }
                
                console.log(`   ${status} ${message}`);
            } else {
                console.log(`   ❌ ${varName} manquant`);
            }
        });
        
        // Vérifier les permissions
        const stats = fs.statSync(envPath);
        const permissions = (stats.mode & parseInt('777', 8)).toString(8);
        console.log(`\n🔒 Permissions du fichier: ${permissions}`);
        
        if (permissions !== '600') {
            console.log('⚠️  Permissions non sécurisées (recommandé: 600)');
            console.log('💡 Solution: chmod 600 .env');
        } else {
            console.log('✅ Permissions sécurisées');
        }
        
        // Test de chargement avec dotenv
        console.log('\n🧪 Test de chargement avec dotenv:');
        try {
            // Sauvegarder les variables d'environnement actuelles
            const originalEnv = { ...process.env };
            
            // Charger dotenv
            require('dotenv').config();
            
            // Vérifier si les variables sont chargées
            const loadedVars = criticalVars.filter(varName => process.env[varName]);
            console.log(`   ✅ ${loadedVars.length}/${criticalVars.length} variables chargées`);
            
            if (loadedVars.length < criticalVars.length) {
                console.log('   ❌ Certaines variables ne sont pas chargées');
                const missingVars = criticalVars.filter(varName => !process.env[varName]);
                console.log(`   Variables manquantes: ${missingVars.join(', ')}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Erreur lors du chargement: ${error.message}`);
        }
        
        // Recommandations
        console.log('\n💡 RECOMMANDATIONS:');
        const issues = [];
        
        if (!variables.JWT_SECRET || variables.JWT_SECRET.length < 50) {
            issues.push('JWT_SECRET trop court ou manquant');
        }
        
        if (!variables.BCRYPT_ROUNDS || parseInt(variables.BCRYPT_ROUNDS) < 10) {
            issues.push('BCRYPT_ROUNDS invalide');
        }
        
        if (!variables.RATE_LIMIT_MAX_REQUESTS) {
            issues.push('RATE_LIMIT_MAX_REQUESTS manquant');
        }
        
        if (variables.NODE_ENV !== 'production') {
            issues.push('NODE_ENV devrait être "production"');
        }
        
        if (permissions !== '600') {
            issues.push('Permissions du fichier .env non sécurisées');
        }
        
        if (issues.length === 0) {
            console.log('   ✅ Configuration .env correcte');
        } else {
            issues.forEach(issue => {
                console.log(`   ❌ ${issue}`);
            });
            console.log('\n🔧 Solution: Exécutez node scripts/fix-production-env.js');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    }
}

// Exécuter le diagnostic
diagnoseEnv();
