const { pool } = require('./src/utils/database');

async function checkMissionTeams() {
    console.log('🔍 Vérification des équipes de mission (LECTURE SEULE)\n');
    console.log('='.repeat(80));

    try {
        // Trouver toutes les missions avec des collaborateurs planifiés mais pas dans equipes_mission
        const query = `
            SELECT DISTINCT
                m.id as mission_id,
                m.nom as mission_nom,
                m.statut,
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

        const result = await pool.query(query);

        console.log(`\n📊 Collaborateurs manquants trouvés: ${result.rows.length}\n`);

        if (result.rows.length === 0) {
            console.log('✅ Aucune correction nécessaire !');
            console.log('   Toutes les missions ont leurs équipes correctement configurées.\n');
            return;
        }

        // Grouper par mission
        const missionGroups = {};
        result.rows.forEach(row => {
            if (!missionGroups[row.mission_id]) {
                missionGroups[row.mission_id] = {
                    nom: row.mission_nom,
                    statut: row.statut,
                    collaborateurs: []
                };
            }
            missionGroups[row.mission_id].collaborateurs.push({
                id: row.collaborateur_id,
                nom: `${row.prenom} ${row.nom}`
            });
        });

        // Afficher le rapport
        console.log(`📋 Missions affectées: ${Object.keys(missionGroups).length}\n`);

        for (const [missionId, data] of Object.entries(missionGroups)) {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📋 Mission: ${data.nom}`);
            console.log(`   Statut: ${data.statut}`);
            console.log(`   ID: ${missionId}`);
            console.log(`   Collaborateurs à ajouter: ${data.collaborateurs.length}`);
            console.log(`   ─────────────────────────────────────────────────────────`);

            data.collaborateurs.forEach((collab, i) => {
                console.log(`   ${i + 1}. ${collab.nom}`);
            });
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log(`\n📊 RÉSUMÉ:`);
        console.log(`   • Missions à corriger: ${Object.keys(missionGroups).length}`);
        console.log(`   • Collaborateurs à ajouter: ${result.rows.length}`);
        console.log(`\n💡 Pour appliquer les corrections, exécutez:`);
        console.log(`   node fix-mission-teams.js\n`);

    } catch (error) {
        console.error('\n❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkMissionTeams();
