const { pool } = require('../src/utils/database');

async function executeNotificationsMigration() {
    try {
        console.log('🚀 Début de l\'exécution de la migration des notifications...');
        
        // Lire le fichier de migration
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, '../database/migrations/027_create_notifications_table.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error('Fichier de migration non trouvé');
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Exécuter la migration
        console.log('📊 Exécution de la migration...');
        await pool.query(migrationSQL);
        
        console.log('✅ Migration des notifications exécutée avec succès !');
        
        // Vérifier que la table a été créée
        const checkQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications'
        `;
        
        const result = await pool.query(checkQuery);
        
        if (result.rows.length > 0) {
            console.log('✅ Table notifications créée avec succès');
            
            // Afficher la structure de la table
            const structureQuery = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'notifications'
                ORDER BY ordinal_position
            `;
            
            const structure = await pool.query(structureQuery);
            console.log('📋 Structure de la table notifications:');
            structure.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
            });
            
        } else {
            console.log('❌ Erreur: La table notifications n\'a pas été créée');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la migration:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la migration
executeNotificationsMigration(); 