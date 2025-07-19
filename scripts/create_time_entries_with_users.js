const { pool } = require('../src/utils/database');

async function createTimeEntriesWithUsers() {
    console.log('🚀 Création des time entries avec utilisateur de la table users...');
    
    try {
        // Récupérer un utilisateur de la table users
        const userResult = await pool.query('SELECT id, nom, prenom FROM users LIMIT 1');
        
        if (userResult.rows.length === 0) {
            console.log('❌ Aucun utilisateur trouvé dans la table users');
            return;
        }
        
        const user = userResult.rows[0];
        console.log(`✅ Utilisateur trouvé: ${user.nom} ${user.prenom} (ID: ${user.id})`);
        
        // Créer des time entries
        const entries = [
            {
                date_saisie: '2024-01-02',
                heures: 8.0,
                type_heures: 'NORMALES',
                description: 'Analyse des documents comptables'
            },
            {
                date_saisie: '2024-01-03',
                heures: 7.5,
                type_heures: 'NORMALES',
                description: 'Vérification des procédures'
            },
            {
                date_saisie: '2024-01-04',
                heures: 2.0,
                type_heures: 'SUPPLEMENTAIRES',
                description: 'Travail supplémentaire'
            },
            {
                date_saisie: '2024-01-05',
                heures: 6.0,
                type_heures: 'NORMALES',
                description: 'Finalisation du rapport'
            }
        ];
        
        let createdCount = 0;
        
        for (const entry of entries) {
            try {
                const result = await pool.query(`
                    INSERT INTO time_entries (user_id, date_saisie, heures, type_heures, description, statut, semaine, annee)
                    VALUES ($1, $2, $3, $4, $5, 'SAISIE', 1, 2024)
                    RETURNING id, date_saisie, heures, type_heures, description
                `, [
                    user.id,
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

createTimeEntriesWithUsers(); 