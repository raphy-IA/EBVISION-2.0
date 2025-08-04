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

async function checkOpportunitiesStructure() {
    const client = await pool.connect();
    try {
        console.log('🔍 Vérification de la structure de la table opportunites...\n');

        // Vérifier la structure de la table
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'opportunites' 
            ORDER BY ordinal_position
        `;
        const structureResult = await client.query(structureQuery);
        
        console.log('📊 Structure de la table opportunites:');
        console.table(structureResult.rows.map(row => ({
            'Colonne': row.column_name,
            'Type': row.data_type,
            'Nullable': row.is_nullable,
            'Défaut': row.column_default
        })));

        // Vérifier quelques données existantes
        const dataQuery = `
            SELECT * FROM opportunites LIMIT 3
        `;
        const dataResult = await client.query(dataQuery);
        
        console.log('\n📋 Données existantes:');
        if (dataResult.rows.length > 0) {
            dataResult.rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${JSON.stringify(row, null, 2)}`);
            });
        } else {
            console.log('   Aucune donnée trouvée');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

checkOpportunitiesStructure(); 