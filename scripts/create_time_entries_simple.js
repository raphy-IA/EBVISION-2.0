const { pool } = require('../src/utils/database');

async function createTimeEntriesSimple() {
    console.log('🚀 Création des time entries (version simple)...');
    
    try {
        // Récupérer un utilisateur et une mission
        const userResult = await pool.query('SELECT id FROM utilisateurs WHERE nom = \'Admin\' LIMIT 1');
        const missionResult = await pool.query('SELECT id FROM missions WHERE titre = \'Audit Financier 2024\' LIMIT 1');
        
        if (userResult.rows.length === 0) {
            console.log('❌ Utilisateur Admin non trouvé');
            return;
        }
        
        const userId = userResult.rows[0].id;
        const missionId = missionResult.rows.length > 0 ? missionResult.rows[0].id : null;
        
        console.log(`✅ Utilisateur ID: ${userId}`);
        console.log(`✅ Mission ID: ${missionId || 'NULL'}`);
        
        // Créer des time entries un par un
        const entries = [
            {
                date_saisie: '2024-01-02',
                heures: 8.0,
                type_heures: 'NORMALES',
                description: 'Analyse des documents comptables',
                mission_id: missionId
            },
            {
                date_saisie: '2024-01-03',
                heures: 7.5,
                type_heures: 'NORMALES',
                description: 'Vérification des procédures',
                mission_id: missionId
            },
            {
                date_saisie: '2024-01-04',
                heures: 2.0,
                type_heures: 'FORMATION',
                description: 'Formation sur les nouvelles procédures',
                mission_id: null
            }
        ];
        
        let createdCount = 0;
        
        for (const entry of entries) {
            try {
                const result = await pool.query(`
                    INSERT INTO time_entries (user_id, mission_id, date_saisie, heures, type_heures, description, statut, semaine, annee)
                    VALUES ($1, $2, $3, $4, $5, $6, 'SAISIE', 1, 2024)
                    RETURNING id, date_saisie, heures, type_heures, description
                `, [
                    userId,
                    entry.mission_id,
                    entry.date_saisie,
                    entry.heures,
                    entry.type_heures,
                    entry.description
                ]);
                
                console.log(`✅ Time entry créé: ${result.rows[0].date_saisie} - ${result.rows[0].heures}h ${result.rows[0].type_heures}`);
                createdCount++;
                
            } catch (error) {
                console.error(`❌ Erreur pour l'entrée ${entry.date_saisie}:`, error.message);
            }
        }
        
        console.log(`🎉 ${createdCount} time entries créés avec succès!`);

    } catch (error) {
        console.error('❌ Erreur générale:', error);
    } finally {
        await pool.end();
    }
}

createTimeEntriesSimple(); 