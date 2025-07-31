const { pool } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

async function runMigration028() {
    try {
        console.log('🚀 Début de l\'exécution de la migration 028 - Types de Mission');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '../database/migrations/028_create_mission_types.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Migration SQL chargée');
        
        // Exécuter la migration
        console.log('⚡ Exécution de la migration...');
        await pool.query(migrationSQL);
        
        console.log('✅ Migration 028 exécutée avec succès');
        
        // Vérifier que la table a été créée
        const checkResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'mission_types'
            );
        `);
        
        if (checkResult.rows[0].exists) {
            console.log('✅ Table mission_types créée avec succès');
            
            // Vérifier les données insérées
            const countResult = await pool.query('SELECT COUNT(*) as count FROM mission_types');
            console.log(`📊 ${countResult.rows[0].count} types de mission créés`);
            
            // Afficher les types créés
            const typesResult = await pool.query(`
                SELECT mt.codification, mt.libelle, d.nom as division_nom
                FROM mission_types mt
                LEFT JOIN divisions d ON mt.division_id = d.id
                ORDER BY mt.codification
            `);
            
            console.log('📋 Types de mission créés :');
            typesResult.rows.forEach(type => {
                console.log(`  - ${type.codification}: ${type.libelle} (${type.division_nom || 'Aucune division'})`);
            });
            
        } else {
            console.log('❌ La table mission_types n\'a pas été créée');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
    runMigration028()
        .then(() => {
            console.log('🎉 Migration terminée avec succès');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Échec de la migration:', error);
            process.exit(1);
        });
}

module.exports = runMigration028; 