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

async function checkUtilisateurs() {
    const client = await pool.connect();
    try {
        console.log('👤 Vérification de la table utilisateurs...\n');

        // Vérifier la structure de la table utilisateurs
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'utilisateurs' 
            ORDER BY ordinal_position
        `;
        const structureResult = await client.query(structureQuery);
        
        console.log('📊 Structure de la table utilisateurs:');
        console.table(structureResult.rows.map(row => ({
            'Colonne': row.column_name,
            'Type': row.data_type,
            'Nullable': row.is_nullable,
            'Défaut': row.column_default
        })));

        // Vérifier les utilisateurs existants
        const utilisateursQuery = `
            SELECT id, nom, email, role, actif
            FROM utilisateurs 
            LIMIT 5
        `;
        const utilisateursResult = await client.query(utilisateursQuery);
        
        console.log('\n👤 Utilisateurs disponibles:');
        if (utilisateursResult.rows.length > 0) {
            utilisateursResult.rows.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.nom} (${user.email}) - ${user.role} - ${user.actif ? 'Actif' : 'Inactif'} (ID: ${user.id})`);
            });
        } else {
            console.log('   Aucun utilisateur trouvé');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

checkUtilisateurs(); 