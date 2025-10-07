const pool = require('../src/utils/database');

async function main() {
    try {
        const result = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                character_maximum_length,
                is_nullable
            FROM information_schema.columns
            WHERE table_name = 'permissions'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 Structure de la table permissions:\n');
        console.table(result.rows);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        process.exit(0);
    }
}

main();





