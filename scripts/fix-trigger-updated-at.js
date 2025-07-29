require('dotenv').config();
const { pool } = require('../src/utils/database');

async function fixTriggerUpdatedAt() {
    try {
        console.log('🔧 Correction du trigger updated_at...\n');
        
        // 1. Supprimer l'ancien trigger avec CASCADE
        console.log('1. Suppression de l\'ancien trigger...');
        await pool.query(`
            DROP TRIGGER IF EXISTS update_modified_column ON clients CASCADE;
        `);
        console.log('✅ Ancien trigger supprimé');
        
        // 2. Supprimer l'ancienne fonction avec CASCADE
        console.log('\n2. Suppression de l\'ancienne fonction...');
        await pool.query(`
            DROP FUNCTION IF EXISTS update_modified_column() CASCADE;
        `);
        console.log('✅ Ancienne fonction supprimée');
        
        // 3. Créer la nouvelle fonction
        console.log('\n3. Création de la nouvelle fonction...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);
        console.log('✅ Nouvelle fonction créée');
        
        // 4. Créer le nouveau trigger
        console.log('\n4. Création du nouveau trigger...');
        await pool.query(`
            CREATE TRIGGER update_updated_at_column
                BEFORE UPDATE ON clients
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log('✅ Nouveau trigger créé');
        
        console.log('\n✅ Trigger corrigé avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction du trigger:', error);
    } finally {
        await pool.end();
    }
}

fixTriggerUpdatedAt(); 