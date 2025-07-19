const { pool } = require('../src/utils/database');

async function createTimeEntries() {
    console.log('🚀 Création des time entries...');
    
    try {
        // Récupérer un utilisateur existant
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');
        if (userResult.rows.length === 0) {
            throw new Error('Aucun utilisateur trouvé dans la table users');
        }
        const userId = userResult.rows[0].id;
        console.log(`✅ Utilisateur trouvé: ${userId}`);
        
        // Récupérer une mission existante
        const missionResult = await pool.query('SELECT id FROM missions LIMIT 1');
        if (missionResult.rows.length === 0) {
            throw new Error('Aucune mission trouvée dans la table missions');
        }
        const missionId = missionResult.rows[0].id;
        console.log(`✅ Mission trouvée: ${missionId}`);
        
        // Créer plusieurs time entries avec les bonnes valeurs de statut
        const timeEntries = [
            {
                user_id: userId,
                mission_id: missionId,
                date_saisie: '2024-01-15',
                heures: 8.0,
                type_heures: 'NORMALES',
                description: 'Développement frontend - Dashboard',
                statut: 'VALIDEE',
                semaine: 3,
                annee: 2024
            },
            {
                user_id: userId,
                mission_id: missionId,
                date_saisie: '2024-01-16',
                heures: 6.5,
                type_heures: 'NORMALES',
                description: 'Réunion client - Analyse des besoins',
                statut: 'VALIDEE',
                semaine: 3,
                annee: 2024
            },
            {
                user_id: userId,
                mission_id: missionId,
                date_saisie: '2024-01-17',
                heures: 2.0,
                type_heures: 'SUPPLEMENTAIRES',
                description: 'Développement backend - API REST',
                statut: 'VALIDEE',
                semaine: 3,
                annee: 2024
            },
            {
                user_id: userId,
                mission_id: missionId,
                date_saisie: '2024-01-18',
                heures: 8.0,
                type_heures: 'NORMALES',
                description: 'Tests et débogage',
                statut: 'SAISIE',
                semaine: 3,
                annee: 2024
            },
            {
                user_id: userId,
                mission_id: missionId,
                date_saisie: '2024-01-19',
                heures: 4.0,
                type_heures: 'NORMALES',
                description: 'Documentation technique',
                statut: 'SAISIE',
                semaine: 3,
                annee: 2024
            }
        ];
        
        console.log('📝 Insertion des time entries...');
        for (const entry of timeEntries) {
            const result = await pool.query(`
                INSERT INTO time_entries (
                    user_id, mission_id, date_saisie, heures, type_heures, 
                    description, statut, semaine, annee
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, date_saisie, heures, type_heures, description, statut
            `, [
                entry.user_id, entry.mission_id, entry.date_saisie, entry.heures,
                entry.type_heures, entry.description, entry.statut, entry.semaine, entry.annee
            ]);
            console.log(`✅ Time entry créé: ${result.rows[0].id} - ${result.rows[0].date_saisie} (${result.rows[0].heures}h ${result.rows[0].type_heures})`);
        }
        
        // Vérifier le nombre total de time entries
        const countResult = await pool.query('SELECT COUNT(*) as count FROM time_entries');
        console.log(`📊 Nombre total de time entries: ${countResult.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

createTimeEntries(); 