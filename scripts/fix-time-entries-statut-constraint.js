require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function fixTimeEntriesStatutConstraint() {
    try {
        console.log('🔧 Correction de la contrainte time_entries_statut_check...\n');

        // Supprimer la contrainte existante
        console.log('1. Suppression de la contrainte existante...');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_statut_check;');
        console.log('✅ Contrainte supprimée');

        // Créer la nouvelle contrainte
        console.log('\n2. Création de la nouvelle contrainte...');
        await pool.query(`
            ALTER TABLE time_entries 
            ADD CONSTRAINT time_entries_statut_check 
            CHECK (statut IN ('draft', 'submitted', 'approved', 'rejected'));
        `);
        console.log('✅ Nouvelle contrainte créée');

        // Tester avec une valeur valide
        console.log('\n3. Test avec une valeur valide...');
        await pool.query(`
            INSERT INTO time_entries (user_id, date_saisie, heures, mission_id, description, type_heures, statut)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT DO NOTHING;
        `, ['8eb54916-a0b3-4f9e-acd1-75830271feab', '2024-01-15', 8.0, 'f1b5a971-3a94-473d-af5b-7922348d8a1d', 'Test contrainte', 'chargeable', 'draft']);
        
        console.log('✅ Test réussi avec statut "draft"');
        
        // Nettoyer le test
        await pool.query(`
            DELETE FROM time_entries 
            WHERE user_id = $1 AND date_saisie = $2 AND description = $3;
        `, ['8eb54916-a0b3-4f9e-acd1-75830271feab', '2024-01-15', 'Test contrainte']);
        
        console.log('\n✅ Correction terminée');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

fixTimeEntriesStatutConstraint(); 