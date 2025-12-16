const { pool } = require('./src/utils/database');

async function fixMissionTeams() {
    console.log('🔧 Correction des équipes de mission\n');
    console.log('='.repeat(80));

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Trouver toutes les missions avec des collaborateurs planifiés mais pas dans equipes_mission
        const query = `
            SELECT DISTINCT
                m.id as mission_id,
                m.nom as mission_nom,
                ta.collaborateur_id,
                c.nom,
                c.prenom
            FROM missions m
            JOIN mission_tasks mt ON m.id = mt.mission_id
            JOIN task_assignments ta ON mt.id = ta.mission_task_id
            JOIN collaborateurs c ON ta.collaborateur_id = c.id
            WHERE NOT EXISTS (
                SELECT 1 FROM equipes_mission em
                WHERE em.mission_id = m.id 
                AND em.collaborateur_id = ta.collaborateur_id
            )
            ORDER BY m.nom, c.nom
        `;

        const result = await client.query(query);

        console.log(`\n📊 Collaborateurs manquants trouvés: ${result.rows.length}\n`);

        if (result.rows.length === 0) {
            console.log('✅ Aucune correction nécessaire !');
            await client.query('ROLLBACK');
            return;
        }

        // Grouper par mission
        const missionGroups = {};
        result.rows.forEach(row => {
            if (!missionGroups[row.mission_id]) {
                missionGroups[row.mission_id] = {
                    nom: row.mission_nom,
                    collaborateurs: []
                };
            }
            missionGroups[row.mission_id].collaborateurs.push({
                id: row.collaborateur_id,
                nom: `${row.prenom} ${row.nom}`
            });
        });

        // Afficher et corriger
        let totalAdded = 0;

        for (const [missionId, data] of Object.entries(missionGroups)) {
            console.log(`\n📋 Mission: ${data.nom}`);
            console.log(`   Collaborateurs à ajouter: ${data.collaborateurs.length}`);

            for (const collab of data.collaborateurs) {
                console.log(`      • ${collab.nom}`);

                const insertQuery = `
                    INSERT INTO equipes_mission (
                        mission_id, collaborateur_id, role, date_creation
                    ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                    ON CONFLICT (mission_id, collaborateur_id) DO NOTHING
                `;

                await client.query(insertQuery, [missionId, collab.id, 'Membre']);
                totalAdded++;
            }
        }

        await client.query('COMMIT');

        console.log(`\n${'='.repeat(80)}`);
        console.log(`\n✅ Migration terminée avec succès !`);
        console.log(`   • Missions corrigées: ${Object.keys(missionGroups).length}`);
        console.log(`   • Collaborateurs ajoutés: ${totalAdded}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Erreur:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

fixMissionTeams();
