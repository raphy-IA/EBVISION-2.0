#!/usr/bin/env node

/**
 * 🚀 SCRIPT D'INITIALISATION COMPLÈTE AUTOMATIQUE
 * ===============================================
 * 
 * Ce script exécute automatiquement les 5 étapes d'initialisation :
 * 1️⃣  Structure de la base de données (1-init-database-tables.js)
 * 2️⃣  Création du Super Admin (2-create-super-admin.js)
 * 3️⃣  Insertion des données de référence (3-insert-reference-data.js)
 * 4️⃣  Synchronisation des permissions (sync-all-permissions-complete.js)
 * 5️⃣  Assignation au SUPER_ADMIN (4-assign-all-permissions.js)
 * 
 * ⚠️  IMPORTANT: Ce script doit être exécuté dans une base de données vide ou nouvelle.
 * Si vous avez déjà des données, utilisez les scripts individuels.
 * 
 * Usage: node scripts/database/0-init-complete.js
 */

const { fork } = require('child_process');
const path = require('path');

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║     🚀 INITIALISATION COMPLÈTE AUTOMATIQUE                      ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const scripts = [
    {
        name: 'ÉTAPE 1/5 : Structure de la Base de Données',
        path: path.join(__dirname, '1-init-database-tables.js'),
        description: '📦 Création de 81 tables et 11 rôles système'
    },
    {
        name: 'ÉTAPE 2/5 : Création du Super Admin',
        path: path.join(__dirname, '2-create-super-admin.js'),
        description: '👤 Création du compte Super Administrateur'
    },
    {
        name: 'ÉTAPE 3/5 : Insertion des Données de Référence',
        path: path.join(__dirname, '3-insert-reference-data.js'),
        description: '📚 Insertion des données de référence (secteurs, pays, années fiscales, etc.)'
    },
    {
        name: 'ÉTAPE 4/5 : Synchronisation des Permissions',
        path: path.join(__dirname, 'sync-all-permissions-complete.js'),
        description: '🔐 Création de 321+ permissions depuis le code source'
    },
    {
        name: 'ÉTAPE 5/5 : Assignation des Permissions',
        path: path.join(__dirname, '4-assign-all-permissions.js'),
        description: '✅ Assignation de toutes les permissions au SUPER_ADMIN'
    }
];

let currentStep = 0;

function runScript(script) {
    return new Promise((resolve, reject) => {
        console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
        console.log(`║  ${script.name.padEnd(64)} ║`);
        console.log('╚═══════════════════════════════════════════════════════════════════╝');
        console.log(`\n${script.description}\n`);

        // Utiliser fork pour gérer correctement les chemins avec espaces
        const child = fork(script.path, [], {
            stdio: 'inherit'
        });

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`❌ ${script.name} a échoué avec le code ${code}`));
            } else {
                console.log(`\n✅ ${script.name} terminée avec succès!\n`);
                resolve();
            }
        });

        child.on('error', (error) => {
            reject(new Error(`❌ Erreur lors de l'exécution de ${script.name}: ${error.message}`));
        });
    });
}

async function runAllScripts() {
    const startTime = Date.now();

    try {
        for (const script of scripts) {
            currentStep++;
            await runScript(script);
            
            // Pause de 2 secondes entre chaque étape
            if (currentStep < scripts.length) {
                console.log('⏳ Pause de 2 secondes avant la prochaine étape...\n');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
        console.log('║                 🎉 INITIALISATION TERMINÉE !                      ║');
        console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

        console.log('📊 RÉSUMÉ COMPLET :');
        console.log('═══════════════════════════════════════════════════════════════════\n');
        console.log('   ✅ Structure de base      : 81 tables créées');
        console.log('   ✅ Rôles                  : 11 rôles système');
        console.log('   ✅ Super Admin            : 1 utilisateur créé');
        console.log('   ✅ Données de référence   : Types RH, missions, pays, secteurs, etc.');
        console.log('   ✅ Entreprises            : 100 entreprises réelles chargées');
        console.log('   ✅ Types d\'opportunités   : 10 types avec 27 étapes configurées');
        console.log('   ✅ Tâches de mission      : 5 tâches configurées pour Marketing');
        console.log('   ✅ Permissions            : 321+ permissions créées et synchronisées');
        console.log('   ✅ Assignations           : Toutes les permissions assignées au SUPER_ADMIN');
        console.log(`   ⏱️  Durée totale          : ${duration} secondes\n`);

        console.log('🔑 IDENTIFIANTS DE CONNEXION :');
        console.log('═══════════════════════════════════════════════════════════════════\n');
        console.log('   📧 Email       : admin@ebvision.com');
        console.log('   🔑 Mot de passe: Admin@2025\n');

        console.log('🚀 PROCHAINES ÉTAPES :');
        console.log('═══════════════════════════════════════════════════════════════════\n');
        console.log('   1. Démarrer le serveur :');
        console.log('      npm start\n');
        console.log('   2. Ouvrir votre navigateur :');
        console.log('      http://localhost:3000/login.html\n');
        console.log('   3. Se connecter avec les identifiants ci-dessus\n');
        console.log('   4. (Optionnel) Ajouter des tâches aux autres types de mission :');
        console.log('      Exemple: node scripts/database/add-marketing-tasks.js\n');

        console.log('✅ Votre base de données est maintenant 100% opérationnelle !\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERREUR FATALE :', error.message);
        console.error('\n💡 SUGGESTIONS :');
        console.error('   1. Vérifiez que PostgreSQL est démarré');
        console.error('   2. Vérifiez votre fichier .env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)');
        console.error('   3. Consultez les logs ci-dessus pour plus de détails');
        console.error('\n📚 Pour plus d\'aide, consultez : scripts/database/README-INITIALISATION-COMPLETE.md\n');
        process.exit(1);
    }
}

// Exécution
console.log('⏳ Démarrage de l\'initialisation automatique...\n');
runAllScripts();

