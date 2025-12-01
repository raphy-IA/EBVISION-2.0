/**
 * Script de vérification et correction des permissions en base de données
 * 
 * Ce script scanne le code source (fichiers HTML et template sidebar) pour identifier
 * toutes les permissions nécessaires (pages et menus) et les crée en base de données
 * si elles n'existent pas.
 * 
 * Usage: node scripts/database/check_fix_permission.js
 */

const path = require('path');
const { pool } = require('../../src/utils/database');
const { scanHtmlFiles, extractMenuStructure, syncPermissions } = require('../../src/routes/sync-permissions');

async function main() {
    console.log('🚀 Démarrage du script de vérification des permissions...');

    try {
        // 1. Définir les chemins
        const publicDir = path.join(__dirname, '../../public');
        const sidebarPath = path.join(publicDir, 'template-modern-sidebar.html');

        console.log(`📂 Dossier public: ${publicDir}`);
        console.log(`📄 Template sidebar: ${sidebarPath}`);

        // 2. Scanner les fichiers HTML
        console.log('\n🔍 Scan des fichiers HTML...');
        const htmlFiles = await scanHtmlFiles(publicDir);
        console.log(`✅ ${htmlFiles.length} fichiers HTML trouvés`);

        // 3. Scanner la structure du menu
        console.log('\n🔍 Scan de la structure du menu...');
        const menuStructure = await extractMenuStructure(sidebarPath);
        // Le log du nombre de sections est déjà fait dans extractMenuStructure

        // 4. Synchroniser les permissions
        console.log('\n🔄 Synchronisation des permissions...');
        const result = await syncPermissions(htmlFiles, menuStructure);

        console.log('\n📊 RÉSULTAT DE LA SYNCHRONISATION:');
        console.log('-----------------------------------');
        console.log(`➕ Ajoutées:   ${result.added}`);
        console.log(`🔄 Mises à jour: ${result.updated}`);
        console.log(`⏭️ Ignorées:    ${result.skipped}`);
        console.log(`🗑️ Supprimées:  ${result.deleted}`);
        console.log('-----------------------------------');

        console.log('\n✅ Script terminé avec succès');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERREUR FATALE:', error);
        process.exit(1);
    }
}

// Exécuter le script
main();
