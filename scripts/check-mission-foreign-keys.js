const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkMissionForeignKeys() {
    const client = await pool.connect();
    try {
        console.log('🔍 Vérification des clés étrangères de la table missions...\n');

        // Vérifier les contraintes de clé étrangère
        const foreignKeysQuery = `
            SELECT 
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'missions'
        `;
        const foreignKeysResult = await client.query(foreignKeysQuery);
        
        console.log('📊 Clés étrangères:');
        if (foreignKeysResult.rows.length > 0) {
            foreignKeysResult.rows.forEach((fk, index) => {
                console.log(`   ${index + 1}. ${fk.constraint_name}: ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            });
        } else {
            console.log('   Aucune clé étrangère trouvée');
        }

        // Vérifier les tables référencées
        console.log('\n📋 Tables référencées:');
        const referencedTables = [...new Set(foreignKeysResult.rows.map(fk => fk.foreign_table_name))];
        referencedTables.forEach(table => {
            console.log(`   - ${table}`);
        });

    } catch (error) {
        console.error('❌ Erreur:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

checkMissionForeignKeys(); 