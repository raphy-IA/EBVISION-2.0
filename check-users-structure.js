const { pool } = require('./src/utils/database');

async function checkUsersStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table users...');
        
        const columns = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Colonnes de la table users:');
        columns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkUsersStructure(); 