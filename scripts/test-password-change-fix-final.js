#!/usr/bin/env node

/**
 * Script pour tester la correction finale du changement de mot de passe
 */

const User = require('../src/models/User');

async function testPasswordChangeFix() {
    console.log('🧪 TEST DE LA CORRECTION FINALE DU CHANGEMENT DE MOT DE PASSE');
    console.log('============================================================\n');

    try {
        // Récupérer l'utilisateur admin (le plus récemment modifié)
        console.log('🔍 Récupération de l\'utilisateur admin...');
        const adminUser = await User.findByLogin('admin');
        
        if (!adminUser) {
            console.log('❌ Utilisateur admin non trouvé');
            return;
        }

        console.log('✅ Utilisateur admin trouvé:');
        console.log(`   ID: ${adminUser.id}`);
        console.log(`   Login: ${adminUser.login}`);
        console.log(`   Email: ${adminUser.email}`);
        console.log(`   Nom: ${adminUser.nom} ${adminUser.prenom}`);
        console.log(`   Rôle: ${adminUser.role}`);
        console.log(`   Password Hash: ${adminUser.password_hash ? '✅ Défini' : '❌ Manquant'}`);
        console.log(`   Longueur Hash: ${adminUser.password_hash ? adminUser.password_hash.length : 0} caractères\n`);

        // Tester la méthode findById
        console.log('🔍 Test de la méthode findById...');
        const userById = await User.findById(adminUser.id);
        
        if (!userById) {
            console.log('❌ Utilisateur non trouvé par ID');
            return;
        }

        console.log('✅ Utilisateur trouvé par ID:');
        console.log(`   Password Hash: ${userById.password_hash ? '✅ Défini' : '❌ Manquant'}`);
        console.log(`   Longueur Hash: ${userById.password_hash ? userById.password_hash.length : 0} caractères\n`);

        // Vérifier que les deux méthodes retournent le même password_hash
        const hashesMatch = adminUser.password_hash === userById.password_hash;
        console.log(`🔍 Correspondance des hash: ${hashesMatch ? '✅ Identiques' : '❌ Différents'}\n`);

        if (hashesMatch && userById.password_hash) {
            console.log('🎉 CORRECTION RÉUSSIE !');
            console.log('======================');
            console.log('✅ La méthode findById retourne maintenant le password_hash');
            console.log('✅ Le changement de mot de passe devrait fonctionner');
            console.log('✅ L\'utilisateur peut maintenant changer son mot de passe');
        } else {
            console.log('❌ PROBLÈME PERSISTANT');
            console.log('======================');
            console.log('❌ La méthode findById ne retourne toujours pas le password_hash');
        }

    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
    } finally {
        // Fermer la connexion à la base de données
        const { pool } = require('../src/utils/database');
        await pool.end();
    }
}

// Exécuter le test
testPasswordChangeFix().catch(console.error);
