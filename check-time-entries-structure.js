const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'postgres'
});

async function checkTimeEntriesStructure() {
    const client = await pool.connect();
    try {
        console.log('🔍 Vérification de la structure de la table time_entries...');
        
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Colonnes de la table time_entries:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTimeEntriesStructure(); 