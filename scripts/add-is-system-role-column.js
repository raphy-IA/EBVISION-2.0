require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false
});

async function addIsSystemRoleColumn() {
    try {
        console.log('📋 Ajout de la colonne is_system_role à la table roles...');
        
        await pool.query(`
            ALTER TABLE roles 
            ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT false
        `);
        
        console.log('✅ Colonne is_system_role ajoutée');
        
        console.log('🔄 Marquage des rôles système...');
        
        const result = await pool.query(`
            UPDATE roles 
            SET is_system_role = true 
            WHERE nom IN ('SUPER_ADMIN', 'ADMIN')
        `);
        
        console.log(`✅ ${result.rowCount} rôle(s) système marqué(s)`);
        
        await pool.end();
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        await pool.end();
        process.exit(1);
    }
}

addIsSystemRoleColumn();

