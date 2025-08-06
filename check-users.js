const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function checkUsers() {
    try {
        console.log('🔍 Vérification des utilisateurs...');
        
        // Récupérer tous les utilisateurs
        const users = await pool.query('SELECT id, email, nom, prenom FROM users LIMIT 5');
        
        console.log('\n📋 Utilisateurs trouvés:');
        users.rows.forEach(user => {
            console.log(`  - ${user.id}: ${user.nom} ${user.prenom} (${user.email})`);
        });
        
        // Vérifier l'utilisateur spécifique
        const specificUser = await pool.query('SELECT id, email, nom, prenom FROM users WHERE id = $1', ['19c1a739-38d0-429d-a739-38d0-429d']);
        
        if (specificUser.rows.length > 0) {
            console.log('\n✅ Utilisateur de test trouvé:', specificUser.rows[0]);
        } else {
            console.log('\n❌ Utilisateur de test non trouvé');
            console.log('Création d\'un utilisateur de test...');
            
            // Créer un utilisateur de test
            const testUser = await pool.query(`
                INSERT INTO users (id, email, nom, prenom, password_hash, statut, role)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, email, nom, prenom
            `, [
                '19c1a739-38d0-429d-a739-38d0-429d',
                'test@example.com',
                'Test',
                'User',
                '$2b$12$test',
                'ACTIF',
                'ADMIN'
            ]);
            
            console.log('✅ Utilisateur de test créé:', testUser.rows[0]);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkUsers(); 