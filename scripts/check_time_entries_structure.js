const { pool } = require('../src/utils/database');

async function checkTimeEntriesStructure() {
    try {
        console.log('🔍 Structure de la table time_entries:\n');
        
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' 
            ORDER BY ordinal_position
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ La table time_entries n\'a pas de colonnes ou n\'existe pas');
            return;
        }
        
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
            if (row.column_default) {
                console.log(`    Default: ${row.column_default}`);
            }
        });
        
        // Vérifier s'il y a des données
        const countResult = await pool.query('SELECT COUNT(*) as count FROM time_entries');
        console.log(`\n📊 Nombre de time entries: ${countResult.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkTimeEntriesStructure(); 