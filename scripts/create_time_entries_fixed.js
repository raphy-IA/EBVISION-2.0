const { pool } = require('../src/utils/database');

async function createTimeEntriesFixed() {
    console.log('🚀 Création des time entries (version corrigée)...');
    
    try {
        // Vérifier d'abord les données existantes
        console.log('1. Vérification des données existantes...');
        const usersResult = await pool.query('SELECT id, nom FROM utilisateurs LIMIT 1');
        const missionsResult = await pool.query('SELECT id, titre FROM missions LIMIT 3');
        
        if (usersResult.rows.length === 0) {
            console.log('❌ Aucun utilisateur trouvé');
            return;
        }
        
        if (missionsResult.rows.length === 0) {
            console.log('❌ Aucune mission trouvée');
            return;
        }
        
        console.log(`✅ Utilisateur trouvé: ${usersResult.rows[0].nom}`);
        console.log(`✅ Missions trouvées: ${missionsResult.rows.length}`);
        
        // Créer des time entries avec la bonne structure
        console.log('2. Création des time entries...');
        const timeEntriesResult = await pool.query(`
            INSERT INTO time_entries (user_id, mission_id, date_saisie, heures, type_heures, description, statut, semaine, annee) VALUES
            ($1, $2, '2024-01-02', 8.0, 'NORMALES', 'Analyse des documents comptables', 'SAISIE', 1, 2024),
            ($1, $2, '2024-01-03', 7.5, 'NORMALES', 'Vérification des procédures', 'SAISIE', 1, 2024),
            ($1, $3, '2024-01-04', 6.0, 'NORMALES', 'Réunion avec le comité de direction', 'SAISIE', 1, 2024),
            ($1, $3, '2024-01-05', 8.0, 'NORMALES', 'Analyse des processus organisationnels', 'SAISIE', 1, 2024),
            ($1, $4, '2024-01-08', 7.0, 'NORMALES', 'Cartographie des processus actuels', 'SAISIE', 2, 2024),
            ($1, NULL, '2024-01-09', 2.0, 'FORMATION', 'Formation sur les nouvelles procédures', 'SAISIE', 2, 2024),
            ($1, NULL, '2024-01-10', 1.5, 'ADMINISTRATIF', 'Réunion d''équipe et planification', 'SAISIE', 2, 2024)
            RETURNING id, date_saisie, heures, type_heures, description
        `, [
            usersResult.rows[0].id,
            missionsResult.rows[0]?.id,
            missionsResult.rows[1]?.id,
            missionsResult.rows[2]?.id
        ]);
        
        console.log('✅ Time entries créés:', timeEntriesResult.rows.map(t => `${t.date_saisie}: ${t.heures}h ${t.type_heures} - ${t.description}`));
        console.log(`🎉 ${timeEntriesResult.rows.length} time entries créés avec succès!`);

    } catch (error) {
        console.error('❌ Erreur lors de la création des time entries:', error);
        console.error('Détails:', error.message);
    } finally {
        await pool.end();
    }
}

createTimeEntriesFixed(); 