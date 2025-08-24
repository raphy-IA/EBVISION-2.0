const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration de la base de données
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'eb_vision_2_0',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432
});

async function runMigration() {
    try {
        console.log('🔧 Exécution de la migration des responsables...');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, 'database', 'migrations', '063_add_managers_system.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Exécuter la migration
        await pool.query(migrationSQL);
        
        console.log('✅ Migration 063_add_managers_system.sql exécutée avec succès');
        
        // Vérifier que les tables sont créées
        const checkValidations = await pool.query(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_name = 'prospecting_campaign_validations'
        `);
        
        if (checkValidations.rows[0].count > 0) {
            console.log('✅ Table prospecting_campaign_validations créée');
        }
        
        // Vérifier les nouvelles colonnes dans business_units
        const checkBU = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'business_units' AND column_name IN ('responsable_principal_id', 'responsable_adjoint_id')
        `);
        
        console.log('✅ Nouvelles colonnes BU:', checkBU.rows.map(r => r.column_name));
        
        // Vérifier les nouvelles colonnes dans divisions
        const checkDiv = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'divisions' AND column_name IN ('responsable_principal_id', 'responsable_adjoint_id')
        `);
        
        console.log('✅ Nouvelles colonnes Divisions:', checkDiv.rows.map(r => r.column_name));
        
        // Vérifier les nouvelles colonnes dans prospecting_campaigns
        const checkCamp = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'prospecting_campaigns' AND column_name IN ('validation_statut', 'date_soumission', 'date_validation')
        `);
        
        console.log('✅ Nouvelles colonnes Campagnes:', checkCamp.rows.map(r => r.column_name));
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        console.error('Détails:', error.message);
    } finally {
        await pool.end();
        console.log('🔌 Connexion fermée');
    }
}

runMigration();




