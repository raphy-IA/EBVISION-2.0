const { pool } = require('../src/utils/database');

async function checkFeuillesTempsStructure() {
    try {
        console.log('🔍 Structure de la table feuilles_temps:\n');
        
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'feuilles_temps' 
            ORDER BY ordinal_position
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ La table feuilles_temps n\'a pas de colonnes ou n\'existe pas');
            return;
        }
        
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
            if (row.column_default) {
                console.log(`    Default: ${row.column_default}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkFeuillesTempsStructure(); 