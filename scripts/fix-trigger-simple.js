require('dotenv').config();
const { pool } = require('../src/utils/database');

async function fixTriggerSimple() {
    try {
        console.log('🔧 Correction simple du trigger...\n');
        
        // 1. Recréer la fonction correctement
        console.log('1. Recréation de la fonction update_updated_at_column...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);
        console.log('✅ Fonction recréée');
        
        // 2. Créer le trigger s'il n'existe pas
        console.log('\n2. Création du trigger...');
        await pool.query(`
            DROP TRIGGER IF EXISTS update_updated_at_column ON clients;
            CREATE TRIGGER update_updated_at_column
                BEFORE UPDATE ON clients
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log('✅ Trigger créé');
        
        console.log('\n✅ Trigger corrigé avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction du trigger:', error);
    } finally {
        await pool.end();
    }
}

fixTriggerSimple(); 