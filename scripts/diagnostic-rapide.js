// Script de diagnostic rapide pour identifier le problème de démarrage
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function diagnosticRapide() {
    console.log('🔍 DIAGNOSTIC RAPIDE - Identification du problème de démarrage...\n');
    
    try {
        console.log('1️⃣ VÉRIFICATION DU PERMISSIONMANAGER...');
        
        const permissionManagerPath = path.join(__dirname, '../src/utils/PermissionManager.js');
        if (fs.existsSync(permissionManagerPath)) {
            const content = fs.readFileSync(permissionManagerPath, 'utf8');
            console.log('✅ PermissionManager.js existe et fait', content.length, 'caractères');
            
            // Vérifier la syntaxe
            try {
                require(permissionManagerPath);
                console.log('✅ PermissionManager.js peut être chargé sans erreur');
            } catch (error) {
                console.log('❌ Erreur de syntaxe dans PermissionManager.js:', error.message);
            }
        } else {
            console.log('❌ PermissionManager.js n\'existe pas !');
        }
        
        console.log('\n2️⃣ VÉRIFICATION DU MIDDLEWARE DES PERMISSIONS...');
        
        const permissionsPath = path.join(__dirname, '../src/routes/permissions.js');
        if (fs.existsSync(permissionsPath)) {
            const content = fs.readFileSync(permissionsPath, 'utf8');
            console.log('✅ permissions.js existe et fait', content.length, 'caractères');
            
            // Vérifier la syntaxe
            try {
                require(permissionsPath);
                console.log('✅ permissions.js peut être chargé sans erreur');
            } catch (error) {
                console.log('❌ Erreur de syntaxe dans permissions.js:', error.message);
            }
        } else {
            console.log('❌ permissions.js n\'existe pas !');
        }
        
        console.log('\n3️⃣ VÉRIFICATION DE LA SYNTAXE GLOBALE...');
        
        // Vérifier les fichiers principaux
        const filesToCheck = [
            '../src/routes/permissions.js',
            '../src/utils/PermissionManager.js',
            '../src/utils/database.js'
        ];
        
        for (const file of filesToCheck) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                try {
                    require(filePath);
                    console.log(`✅ ${file} - OK`);
                } catch (error) {
                    console.log(`❌ ${file} - Erreur:`, error.message);
                }
            } else {
                console.log(`❌ ${file} - Fichier manquant`);
            }
        }
        
        console.log('\n4️⃣ VÉRIFICATION DES IMPORTS...');
        
        // Vérifier les imports critiques
        try {
            const { pool } = require('../src/utils/database');
            console.log('✅ Import database.js - OK');
        } catch (error) {
            console.log('❌ Import database.js - Erreur:', error.message);
        }
        
        console.log('\n🎯 DIAGNOSTIC TERMINÉ');
        console.log('\n💡 Si des erreurs sont trouvées, corrigez-les avant de redémarrer l\'application');
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error.message);
    }
}

diagnosticRapide().catch(console.error);










