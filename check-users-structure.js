require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function checkUsersTable() {
    try {
        console.log('🔍 Vérification de la structure de la table users...');
        
        // Vérifier si la table users existe
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        
        if (!tableExists.rows[0].exists) {
            console.log('❌ La table users n\'existe pas');
            return;
        }
        
        console.log('✅ La table users existe');
        
        // Récupérer la structure de la table users
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
            ORDER BY ordinal_position;
        `);
        
        console.log('\n📋 Structure de la table users:');
        console.table(structure.rows);
        
        // Vérifier spécifiquement la colonne id
        const idColumn = structure.rows.find(col => col.column_name === 'id');
        if (idColumn) {
            console.log('\n✅ Colonne id trouvée:', idColumn);
        } else {
            console.log('\n❌ Colonne id non trouvée');
        }
        
        // Vérifier s'il y a des données
        const count = await pool.query('SELECT COUNT(*) FROM users');
        console.log(`\n📊 Nombre d'utilisateurs: ${count.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsersTable(); 