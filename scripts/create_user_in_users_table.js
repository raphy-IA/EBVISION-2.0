const { pool } = require('../src/utils/database');

async function createUserInUsersTable() {
    console.log('🚀 Création d\'un utilisateur dans la table users...');
    try {
        const userResult = await pool.query(`
            INSERT INTO users (nom, prenom, email, password_hash, initiales, grade, date_embauche, taux_horaire, statut)
            VALUES ('Admin', 'User', 'admin@example.com', 'password123', 'AU', 'SENIOR', '2023-01-01', 85.00, 'ACTIF')
            RETURNING id, nom, prenom, email, initiales, grade
        `);
        console.log('✅ Utilisateur créé:', userResult.rows[0]);
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

createUserInUsersTable(); 