require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function fixTimeEntriesConstraints() {
    try {
        console.log('🔧 Correction des contraintes de la table time_entries...\n');

        // 1. Supprimer les contraintes existantes
        console.log('1. Suppression des contraintes existantes...');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_statut_check;');
        await pool.query('ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_type_heures_check;');
        console.log('✅ Contraintes supprimées');

        // 2. Créer les nouvelles contraintes
        console.log('\n2. Création des nouvelles contraintes...');
        
        // Contrainte pour statut
        await pool.query(`
            ALTER TABLE time_entries 
            ADD CONSTRAINT time_entries_statut_check 
            CHECK (statut IN ('draft', 'submitted', 'approved', 'rejected'));
        `);
        console.log('✅ Contrainte statut créée');
        
        // Contrainte pour type_heures
        await pool.query(`
            ALTER TABLE time_entries 
            ADD CONSTRAINT time_entries_type_heures_check 
            CHECK (type_heures IN ('chargeable', 'non_chargeable'));
        `);
        console.log('✅ Contrainte type_heures créée');

        // 3. Tester avec des valeurs valides
        console.log('\n3. Test avec des valeurs valides...');
        await pool.query(`
            INSERT INTO time_entries (user_id, date_saisie, heures, mission_id, description, type_heures, statut)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT DO NOTHING;
        `, ['8eb54916-a0b3-4f9e-acd1-75830271feab', '2024-01-15', 8.0, 'f1b5a971-3a94-473d-af5b-7922348d8a1d', 'Test contrainte', 'chargeable', 'draft']);
        
        console.log('✅ Test réussi avec statut "draft" et type_heures "chargeable"');
        
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

fixTimeEntriesConstraints(); 