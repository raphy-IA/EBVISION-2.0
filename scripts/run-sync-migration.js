/**
 * Script pour exécuter la migration 005_create_sync_tables.sql
 * Crée les tables nécessaires pour la synchronisation des permissions et menus
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function runMigration() {
    console.log('🚀 Début de la migration 005_create_sync_tables...\n');
    
    try {
        // Lire le fichier SQL
        const migrationPath = path.join(__dirname, '..', 'migrations', '005_create_sync_tables.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Fichier de migration chargé');
        console.log('📋 Exécution de la migration...\n');
        
        // Exécuter la migration
        await pool.query(sql);
        
        console.log('\n✅ Migration exécutée avec succès');
        
        // Vérifier que les tables existent
        const tablesCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('pages', 'menu_sections', 'menu_items')
            ORDER BY table_name
        `);
        
        console.log(`\n📊 Tables créées (${tablesCheck.rows.length}/3):`);
        tablesCheck.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });
        
        // Vérifier la colonne category dans permissions
        const categoryCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'permissions' 
            AND column_name = 'category'
        `);
        
        if (categoryCheck.rows.length > 0) {
            console.log('   ✓ permissions.category (colonne ajoutée)');
        }
        
        // Afficher les compteurs
        console.log('\n📈 Statistiques actuelles:');
        
        const pagesCount = await pool.query('SELECT COUNT(*) as count FROM pages');
        console.log(`   • Pages: ${pagesCount.rows[0].count}`);
        
        const sectionsCount = await pool.query('SELECT COUNT(*) as count FROM menu_sections');
        console.log(`   • Sections de menu: ${sectionsCount.rows[0].count}`);
        
        const itemsCount = await pool.query('SELECT COUNT(*) as count FROM menu_items');
        console.log(`   • Items de menu: ${itemsCount.rows[0].count}`);
        
        const menuPermsCount = await pool.query("SELECT COUNT(*) as count FROM permissions WHERE code LIKE 'menu.%'");
        console.log(`   • Permissions de menu: ${menuPermsCount.rows[0].count}`);
        
        console.log('\n✅ Migration terminée avec succès!');
        console.log('\n💡 Prochaine étape: Utilisez le bouton "Synchroniser Permissions & Menus"');
        console.log('   sur /permissions-admin.html pour peupler ces tables automatiquement.\n');
        
    } catch (error) {
        console.error('\n❌ Erreur lors de la migration:', error.message);
        console.error('\nDétails:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Exécuter la migration
runMigration();
