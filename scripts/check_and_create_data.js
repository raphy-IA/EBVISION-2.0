const { pool } = require('../src/utils/database');

async function checkAndCreateData() {
    try {
        console.log('🔍 Vérification des données existantes...');
        
        // Vérifier les collaborateurs
        const collaborateursResult = await pool.query('SELECT COUNT(*) as count FROM collaborateurs');
        console.log(`📊 Nombre de collaborateurs: ${collaborateursResult.rows[0].count}`);
        
        // Vérifier les missions
        const missionsResult = await pool.query('SELECT COUNT(*) as count FROM missions');
        console.log(`📊 Nombre de missions: ${missionsResult.rows[0].count}`);
        
        // Vérifier les utilisateurs
        const utilisateursResult = await pool.query('SELECT COUNT(*) as count FROM utilisateurs');
        console.log(`📊 Nombre d'utilisateurs: ${utilisateursResult.rows[0].count}`);
        
        // Vérifier les feuilles de temps
        const feuillesResult = await pool.query('SELECT COUNT(*) as count FROM feuilles_temps');
        console.log(`📊 Nombre de feuilles de temps: ${feuillesResult.rows[0].count}`);
        
        // Vérifier les time entries
        const timeEntriesResult = await pool.query('SELECT COUNT(*) as count FROM time_entries');
        console.log(`📊 Nombre de time entries: ${timeEntriesResult.rows[0].count}`);
        
        // Si pas de collaborateurs, en créer quelques-uns
        if (collaborateursResult.rows[0].count === 0) {
            console.log('➕ Création de collaborateurs de test...');
            await pool.query(`
                INSERT INTO collaborateurs (nom, prenom, initiales, email, grade, taux_horaire, statut) VALUES
                ('Dupont', 'Jean', 'JD', 'jean.dupont@example.com', 'SENIOR', 75.00, 'ACTIF'),
                ('Martin', 'Marie', 'MM', 'marie.martin@example.com', 'MANAGER', 95.00, 'ACTIF'),
                ('Bernard', 'Pierre', 'PB', 'pierre.bernard@example.com', 'ASSISTANT', 55.00, 'ACTIF')
            `);
            console.log('✅ 3 collaborateurs créés');
        }
        
        // Si pas d'utilisateurs, en créer quelques-uns
        if (utilisateursResult.rows[0].count === 0) {
            console.log('➕ Création d\'utilisateurs de test...');
            await pool.query(`
                INSERT INTO utilisateurs (nom, email, mot_de_passe, role, actif) VALUES
                ('Admin', 'admin@example.com', 'password123', 'admin', true),
                ('User1', 'user1@example.com', 'password123', 'utilisateur', true),
                ('User2', 'user2@example.com', 'password123', 'utilisateur', true)
            `);
            console.log('✅ 3 utilisateurs créés');
        }
        
        // Si pas de missions, en créer quelques-unes
        if (missionsResult.rows[0].count === 0) {
            console.log('➕ Création de missions de test...');
            
            // D'abord créer un client
            const clientResult = await pool.query(`
                INSERT INTO clients (nom, email, statut) VALUES
                ('Client Test', 'client@test.com', 'client')
                RETURNING id
            `);
            const clientId = clientResult.rows[0].id;
            
            await pool.query(`
                INSERT INTO missions (titre, description, client_id, statut, type_mission) VALUES
                ('Mission Test 1', 'Description mission 1', $1, 'en_cours', 'Audit'),
                ('Mission Test 2', 'Description mission 2', $1, 'en_cours', 'Conseil')
            `, [clientId]);
            console.log('✅ 2 missions créées');
        }
        
        console.log('✅ Vérification terminée');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkAndCreateData(); 