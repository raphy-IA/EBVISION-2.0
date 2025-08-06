const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function checkTimeSheetsTable() {
    try {
        console.log('🔍 Vérification de la structure de la table time_sheets...');
        
        // Vérifier si la table time_sheets existe
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'time_sheets'
            );
        `);
        
        if (!tableExists.rows[0].exists) {
            console.log('❌ La table time_sheets n\'existe pas');
            return;
        }
        
        console.log('✅ La table time_sheets existe');
        
        // Récupérer la structure de la table time_sheets
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'time_sheets'
            ORDER BY ordinal_position;
        `);
        
        console.log('\n📋 Structure de la table time_sheets:');
        structure.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
        });
        
        // Vérifier s'il y a des données
        const count = await pool.query('SELECT COUNT(*) FROM time_sheets');
        console.log(`\n📊 Nombre de feuilles de temps: ${count.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
    } finally {
        await pool.end();
    }
}

checkTimeSheetsTable(); 