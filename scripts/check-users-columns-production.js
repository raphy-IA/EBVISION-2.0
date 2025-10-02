const { pool } = require('../src/utils/database');

async function checkUsersColumns() {
    console.log('🔍 VÉRIFICATION DES COLONNES DE LA TABLE USERS');
    console.log('='.repeat(80));
    
    let client;
    try {
        client = await pool.connect();
        
        const query = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `;
        
        const result = await client.query(query);
        
        console.log('\n📋 Colonnes disponibles dans la table "users":');
        console.table(result.rows);
        
        console.log('\n✅ Vérification terminée');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        if (client) {
            client.release();
        }
        process.exit(0);
    }
}

checkUsersColumns();


