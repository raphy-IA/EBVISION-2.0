require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
});

async function checkTimeSheetsStructure() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Vérification de la structure de la table time_sheets...');
        
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'time_sheets' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Structure de la table time_sheets:');
        console.log('=' .repeat(60));
        
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'} ${row.column_default ? `DEFAULT: ${row.column_default}` : ''}`);
        });
        
        console.log('\n📊 Nombre de colonnes:', result.rows.length);
        
        // Vérifier si les colonnes nécessaires existent
        const columnNames = result.rows.map(row => row.column_name);
        const requiredColumns = ['id', 'user_id', 'week_start', 'week_end', 'status'];
        
        console.log('\n✅ Colonnes requises:');
        requiredColumns.forEach(col => {
            if (columnNames.includes(col)) {
                console.log(`  ✅ ${col}`);
            } else {
                console.log(`  ❌ ${col} - MANQUANTE`);
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTimeSheetsStructure(); 