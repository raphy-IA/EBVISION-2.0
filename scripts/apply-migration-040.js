const { query } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

async function applyMigration040() {
    console.log('🔧 APPLICATION DE LA MIGRATION 040');
    console.log('==================================');

    try {
        // Lire le contenu de la migration
        const migrationPath = path.join(__dirname, '../database/migrations/040_add_user_collaborateur_relation.sql');
        const migrationContent = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Contenu de la migration:');
        console.log(migrationContent);

        // Exécuter la migration
        console.log('\n🚀 Exécution de la migration...');
        
        const result = await query(migrationContent);
        
        console.log('✅ Migration 040 appliquée avec succès');
        
        // Vérifier que les colonnes ont été ajoutées
        console.log('\n🔍 Vérification des colonnes ajoutées...');
        
        const usersColumns = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('collaborateur_id')
            ORDER BY column_name
        `);
        
        const collaborateursColumns = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'collaborateurs' 
            AND column_name IN ('user_id')
            ORDER BY column_name
        `);
        
        console.log('✅ Colonnes dans users:', usersColumns.rows.map(r => r.column_name));
        console.log('✅ Colonnes dans collaborateurs:', collaborateursColumns.rows.map(r => r.column_name));
        
        console.log('\n✅ MIGRATION 040 TERMINÉE AVEC SUCCÈS');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'application de la migration:', error);
        throw error;
    }
}

// Exécuter la migration
if (require.main === module) {
    applyMigration040().then(() => {
        console.log('\n🎉 Migration appliquée avec succès');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });
}

module.exports = { applyMigration040 }; 