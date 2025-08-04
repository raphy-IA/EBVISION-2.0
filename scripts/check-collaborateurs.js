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

async function checkCollaborateurs() {
    const client = await pool.connect();
    try {
        console.log('👥 Vérification des collaborateurs...\n');

        // Vérifier la structure de la table collaborateurs
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'collaborateurs' 
            ORDER BY ordinal_position
        `;
        const structureResult = await client.query(structureQuery);
        
        console.log('📊 Structure de la table collaborateurs:');
        console.table(structureResult.rows.map(row => ({
            'Colonne': row.column_name,
            'Type': row.data_type,
            'Nullable': row.is_nullable,
            'Défaut': row.column_default
        })));

        // Vérifier les collaborateurs existants
        const collaborateursQuery = `
            SELECT id, nom, prenom, email, statut
            FROM collaborateurs 
            LIMIT 5
        `;
        const collaborateursResult = await client.query(collaborateursQuery);
        
        console.log('\n👥 Collaborateurs disponibles:');
        if (collaborateursResult.rows.length > 0) {
            collaborateursResult.rows.forEach((collab, index) => {
                console.log(`   ${index + 1}. ${collab.prenom} ${collab.nom} (${collab.email}) - ${collab.statut} (ID: ${collab.id})`);
            });
        } else {
            console.log('   Aucun collaborateur trouvé');
        }

        // Vérifier la relation avec users
        const usersQuery = `
            SELECT u.id, u.nom, u.prenom, c.id as collaborateur_id
            FROM users u
            LEFT JOIN collaborateurs c ON u.id = c.user_id
            LIMIT 5
        `;
        const usersResult = await client.query(usersQuery);
        
        console.log('\n👤 Utilisateurs et leurs collaborateurs:');
        usersResult.rows.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.prenom} ${user.nom} (User ID: ${user.id}) - Collaborateur ID: ${user.collaborateur_id || 'NULL'}`);
        });

    } catch (error) {
        console.error('❌ Erreur:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

checkCollaborateurs(); 