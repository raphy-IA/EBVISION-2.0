require('dotenv').config();
const { pool } = require('../src/utils/database');

async function fixClientsTable() {
    try {
        console.log('🔧 Correction de la structure de la table clients...\n');
        
        // 1. Renommer les colonnes de dates
        console.log('1. Renommage des colonnes de dates...');
        await pool.query('ALTER TABLE clients RENAME COLUMN date_creation TO created_at');
        await pool.query('ALTER TABLE clients RENAME COLUMN date_modification TO updated_at');
        console.log('✅ Colonnes de dates renommées');
        
        // 2. Ajouter les colonnes manquantes
        console.log('\n2. Ajout des colonnes manquantes...');
        await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS nombre_missions INTEGER DEFAULT 0');
        await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS nombre_opportunites INTEGER DEFAULT 0');
        await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS chiffre_affaires_total NUMERIC(15,2) DEFAULT 0');
        console.log('✅ Colonnes manquantes ajoutées');
        
        // 3. Mettre à jour les valeurs par défaut
        console.log('\n3. Mise à jour des valeurs par défaut...');
        await pool.query(`
            UPDATE clients SET 
                nombre_missions = 0,
                nombre_opportunites = 0,
                chiffre_affaires_total = COALESCE(chiffre_affaires, 0)
            WHERE nombre_missions IS NULL OR nombre_opportunites IS NULL OR chiffre_affaires_total IS NULL
        `);
        console.log('✅ Valeurs par défaut mises à jour');
        
        // 4. Vérifier la structure finale
        console.log('\n4. Vérification de la structure finale...');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'clients' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Structure finale de la table clients:');
        console.log('=' .repeat(80));
        result.rows.forEach((row, index) => {
            console.log(`${(index + 1).toString().padStart(2, '0')}. ${row.column_name.padEnd(25)} | ${row.data_type.padEnd(15)} | ${row.is_nullable}`);
        });
        
        console.log(`\n✅ Structure corrigée ! Nombre total de colonnes: ${result.rows.length}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error);
    } finally {
        await pool.end();
    }
}

fixClientsTable(); 