/**
 * Script pour exécuter la migration de la table super_admin_audit_log
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function runMigration() {
    console.log('🚀 Début de la migration super_admin_audit_log...\n');
    
    try {
        // Lire le fichier SQL
        const migrationPath = path.join(__dirname, '..', 'migrations', '004_create_super_admin_audit_log.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Fichier de migration chargé');
        
        // Exécuter la migration
        await pool.query(sql);
        
        console.log('✅ Table super_admin_audit_log créée avec succès');
        
        // Vérifier que la table existe
        const checkResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'super_admin_audit_log'
            )
        `);
        
        if (checkResult.rows[0].exists) {
            console.log('✅ Vérification: Table super_admin_audit_log existe');
            
            // Afficher la structure de la table
            const structureResult = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'super_admin_audit_log'
                ORDER BY ordinal_position
            `);
            
            console.log('\n📊 Structure de la table:');
            console.table(structureResult.rows);
            
            // Compter les index
            const indexResult = await pool.query(`
                SELECT indexname
                FROM pg_indexes
                WHERE tablename = 'super_admin_audit_log'
            `);
            
            console.log(`\n🔍 ${indexResult.rows.length} index créés:`);
            indexResult.rows.forEach(row => {
                console.log(`   - ${row.indexname}`);
            });
        } else {
            console.error('❌ Erreur: La table n\'a pas été créée');
        }
        
        console.log('\n✅ Migration terminée avec succès!');
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Exécuter la migration
runMigration();


