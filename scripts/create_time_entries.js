const { pool } = require('../src/utils/database');

async function createTimeEntries() {
    console.log('🚀 Création des time entries...');
    
    try {
        // Créer des time entries avec la bonne structure
        console.log('1. Création des time entries...');
        const timeEntriesResult = await pool.query(`
            INSERT INTO time_entries (user_id, mission_id, date_saisie, heures, type_heures, description, statut, semaine, annee) VALUES
            ((SELECT id FROM utilisateurs WHERE nom = 'Admin' LIMIT 1), 
             (SELECT id FROM missions WHERE titre = 'Audit Financier 2024' LIMIT 1),
             '2024-01-02', 8.0, 'NORMALES', 'Analyse des documents comptables', 'SAISIE', 1, 2024),
            ((SELECT id FROM utilisateurs WHERE nom = 'Admin' LIMIT 1), 
             (SELECT id FROM missions WHERE titre = 'Audit Financier 2024' LIMIT 1),
             '2024-01-03', 7.5, 'NORMALES', 'Vérification des procédures', 'SAISIE', 1, 2024),
            ((SELECT id FROM utilisateurs WHERE nom = 'Admin' LIMIT 1), 
             (SELECT id FROM missions WHERE titre = 'Conseil Stratégique' LIMIT 1),
             '2024-01-04', 6.0, 'NORMALES', 'Réunion avec le comité de direction', 'SAISIE', 1, 2024),
            ((SELECT id FROM utilisateurs WHERE nom = 'Admin' LIMIT 1), 
             (SELECT id FROM missions WHERE titre = 'Conseil Stratégique' LIMIT 1),
             '2024-01-05', 8.0, 'NORMALES', 'Analyse des processus organisationnels', 'SAISIE', 1, 2024),
            ((SELECT id FROM utilisateurs WHERE nom = 'Admin' LIMIT 1), 
             (SELECT id FROM missions WHERE titre = 'Optimisation Processus' LIMIT 1),
             '2024-01-08', 7.0, 'NORMALES', 'Cartographie des processus actuels', 'SAISIE', 2, 2024),
            ((SELECT id FROM utilisateurs WHERE nom = 'Admin' LIMIT 1), 
             NULL,
             '2024-01-09', 2.0, 'FORMATION', 'Formation sur les nouvelles procédures', 'SAISIE', 2, 2024),
            ((SELECT id FROM utilisateurs WHERE nom = 'Admin' LIMIT 1), 
             NULL,
             '2024-01-10', 1.5, 'ADMINISTRATIF', 'Réunion d''équipe et planification', 'SAISIE', 2, 2024)
            RETURNING id, date_saisie, heures, type_heures, description
        `);
        console.log('✅ Time entries créés:', timeEntriesResult.rows.map(t => `${t.date_saisie}: ${t.heures}h ${t.type_heures} - ${t.description}`));

        console.log('🎉 Time entries créés avec succès!');

    } catch (error) {
        console.error('❌ Erreur lors de la création des time entries:', error);
    } finally {
        await pool.end();
    }
}

createTimeEntries(); 