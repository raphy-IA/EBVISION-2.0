const { pool } = require('../src/utils/database');

async function createBasicData() {
    try {
        console.log('🚀 Création des données de base...');
        
        // 1. Créer des utilisateurs s'ils n'existent pas
        console.log('1. Vérification des utilisateurs...');
        const existingUsers = await pool.query('SELECT COUNT(*) as count FROM utilisateurs');
        if (existingUsers.rows[0].count === 0) {
            const usersResult = await pool.query(`
                INSERT INTO utilisateurs (nom, email, mot_de_passe, role, actif) VALUES
                ('Admin', 'admin@example.com', 'password123', 'admin', true),
                ('User1', 'user1@example.com', 'password123', 'utilisateur', true),
                ('User2', 'user2@example.com', 'password123', 'utilisateur', true)
                RETURNING id, nom
            `);
            console.log('✅ Utilisateurs créés:', usersResult.rows.map(u => u.nom));
        } else {
            console.log('✅ Utilisateurs existants déjà');
        }
        
        // 2. Créer des collaborateurs s'ils n'existent pas
        console.log('2. Vérification des collaborateurs...');
        const existingCollab = await pool.query('SELECT COUNT(*) as count FROM collaborateurs');
        if (existingCollab.rows[0].count === 0) {
            const collabResult = await pool.query(`
                INSERT INTO collaborateurs (nom, prenom, initiales, email, grade, taux_horaire, statut) VALUES
                ('Dupont', 'Jean', 'JD', 'jean.dupont@example.com', 'SENIOR', 75.00, 'ACTIF'),
                ('Martin', 'Marie', 'MM', 'marie.martin@example.com', 'MANAGER', 95.00, 'ACTIF'),
                ('Bernard', 'Pierre', 'PB', 'pierre.bernard@example.com', 'ASSISTANT', 55.00, 'ACTIF')
                RETURNING id, nom, prenom
            `);
            console.log('✅ Collaborateurs créés:', collabResult.rows.map(c => `${c.prenom} ${c.nom}`));
        } else {
            console.log('✅ Collaborateurs existants déjà');
        }
        
        // 3. Créer un client s'il n'existe pas
        console.log('3. Vérification des clients...');
        const existingClients = await pool.query('SELECT COUNT(*) as count FROM clients');
        if (existingClients.rows[0].count === 0) {
            const clientResult = await pool.query(`
                INSERT INTO clients (nom, email, statut) VALUES
                ('Client Test', 'client@test.com', 'client')
                RETURNING id, nom
            `);
            console.log('✅ Client créé:', clientResult.rows[0].nom);
        } else {
            console.log('✅ Clients existants déjà');
        }
        
        // 4. Créer des missions si elles n'existent pas
        console.log('4. Vérification des missions...');
        const existingMissions = await pool.query('SELECT COUNT(*) as count FROM missions');
        if (existingMissions.rows[0].count === 0) {
            const clientId = await pool.query('SELECT id FROM clients LIMIT 1');
            if (clientId.rows.length > 0) {
                const missionsResult = await pool.query(`
                    INSERT INTO missions (titre, description, client_id, statut, type_mission) VALUES
                    ('Mission Test 1', 'Description mission 1', $1, 'en_cours', 'Audit'),
                    ('Mission Test 2', 'Description mission 2', $1, 'en_cours', 'Conseil')
                    RETURNING id, titre
                `, [clientId.rows[0].id]);
                console.log('✅ Missions créées:', missionsResult.rows.map(m => m.titre));
            }
        } else {
            console.log('✅ Missions existantes déjà');
        }
        
        // 5. Créer des types d'heures non chargeables s'ils n'existent pas
        console.log('5. Vérification des types d\'heures non chargeables...');
        const existingTypes = await pool.query('SELECT COUNT(*) as count FROM types_heures_non_chargeables');
        if (existingTypes.rows[0].count === 0) {
            const typesResult = await pool.query(`
                INSERT INTO types_heures_non_chargeables (nom, description) VALUES
                ('Formation', 'Heures de formation'),
                ('Réunion interne', 'Réunions d\'équipe'),
                ('Administratif', 'Tâches administratives')
                RETURNING id, nom
            `);
            console.log('✅ Types d\'heures créés:', typesResult.rows.map(t => t.nom));
        } else {
            console.log('✅ Types d\'heures existants déjà');
        }
        
        console.log('✅ Vérification des données terminée!');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification des données:', error.message);
    } finally {
        await pool.end();
    }
}

createBasicData(); 