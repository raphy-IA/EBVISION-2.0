const { pool } = require('./src/utils/database');

async function testMissionMembers() {
    console.log('🔍 Test des membres d\'une mission\n');

    try {
        // Prendre la mission "mission_Test" comme exemple
        const missionName = 'mission_Test';

        console.log(`1️⃣ Recherche de la mission "${missionName}"...`);
        const missionQuery = `
            SELECT id, nom, statut, collaborateur_id, manager_id, associe_id
            FROM missions
            WHERE nom = $1
        `;
        const missionResult = await pool.query(missionQuery, [missionName]);

        if (missionResult.rows.length === 0) {
            console.log('❌ Mission non trouvée');
            return;
        }

        const mission = missionResult.rows[0];
        console.log('Mission trouvée:', mission);

        // 2. Membres via equipes_mission
        console.log('\n2️⃣ Membres via equipes_mission...');
        const equipesQuery = `
            SELECT 
                em.collaborateur_id,
                em.role,
                c.nom,
                c.prenom,
                c.user_id
            FROM equipes_mission em
            JOIN collaborateurs c ON em.collaborateur_id = c.id
            WHERE em.mission_id = $1
            ORDER BY c.nom
        `;
        const equipesResult = await pool.query(equipesQuery, [mission.id]);
        console.log(`Membres trouvés: ${equipesResult.rows.length}`);
        equipesResult.rows.forEach(m => {
            console.log(`   - ${m.prenom} ${m.nom} (${m.role}) - user_id: ${m.user_id}`);
        });

        // 3. Test de la requête CTE du dashboard
        console.log('\n3️⃣ Test requête CTE dashboard...');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const cteQuery = `
            WITH team_members AS (
                -- Membres de equipes_mission
                SELECT 
                    c.id,
                    c.nom,
                    c.prenom,
                    c.photo_url,
                    mp.role
                FROM equipes_mission mp
                JOIN collaborateurs c ON mp.collaborateur_id = c.id
                WHERE mp.mission_id = $1
                
                UNION
                
                -- Responsable de la mission
                SELECT 
                    c.id,
                    c.nom,
                    c.prenom,
                    c.photo_url,
                    'RESPONSABLE' as role
                FROM missions m
                JOIN collaborateurs c ON m.collaborateur_id = c.id
                WHERE m.id = $1 AND m.collaborateur_id IS NOT NULL
                
                UNION
                
                -- Manager de la mission
                SELECT 
                    c.id,
                    c.nom,
                    c.prenom,
                    c.photo_url,
                    'MANAGER' as role
                FROM missions m
                JOIN collaborateurs c ON m.manager_id = c.id
                WHERE m.id = $1 AND m.manager_id IS NOT NULL
                
                UNION
                
                -- Associé de la mission
                SELECT 
                    c.id,
                    c.nom,
                    c.prenom,
                    c.photo_url,
                    'ASSOCIE' as role
                FROM missions m
                JOIN collaborateurs c ON m.associe_id = c.id
                WHERE m.id = $1 AND m.associe_id IS NOT NULL
            )
            SELECT 
                tm.id,
                tm.nom,
                tm.prenom,
                tm.role,
                COALESCE(SUM(te.heures), 0) as total_heures
            FROM team_members tm
            LEFT JOIN collaborateurs c ON c.id = tm.id
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN time_entries te ON u.id = te.user_id 
                AND te.mission_id = $1
                AND te.date_saisie >= $2
            GROUP BY tm.id, tm.nom, tm.prenom, tm.role
            ORDER BY total_heures DESC
        `;
        const cteResult = await pool.query(cteQuery, [mission.id, startDate.toISOString()]);
        console.log(`Membres retournés par CTE: ${cteResult.rows.length}`);
        cteResult.rows.forEach(m => {
            console.log(`   - ${m.prenom} ${m.nom} (${m.role}) - ${m.total_heures}h`);
        });

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

testMissionMembers();
