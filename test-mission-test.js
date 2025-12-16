const { pool } = require('./src/utils/database');

async function testMissionTest() {
    console.log('🔍 Test détaillé de la mission "mission_Test"\n');
    console.log('='.repeat(80));

    try {
        // 1. Trouver la mission
        console.log('\n1️⃣ Recherche de la mission "mission_Test"...');
        const missionQuery = `
            SELECT id, nom, statut, 
                   collaborateur_id, manager_id, associe_id
            FROM missions
            WHERE nom = 'mission_Test'
        `;
        const missionResult = await pool.query(missionQuery);

        if (missionResult.rows.length === 0) {
            console.log('❌ Mission non trouvée');
            return;
        }

        const mission = missionResult.rows[0];
        console.log('✅ Mission trouvée:');
        console.log(`   ID: ${mission.id}`);
        console.log(`   Nom: ${mission.nom}`);
        console.log(`   Statut: ${mission.statut}`);
        console.log(`   Responsable ID: ${mission.collaborateur_id}`);
        console.log(`   Manager ID: ${mission.manager_id}`);
        console.log(`   Associé ID: ${mission.associe_id}`);

        // 2. Vérifier Alvine Oum
        console.log('\n2️⃣ Vérification Alvine Oum...');
        const alvineQuery = `
            SELECT c.id, c.nom, c.prenom, c.user_id, u.email
            FROM collaborateurs c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.nom ILIKE '%oum%' AND c.prenom ILIKE '%alvine%'
        `;
        const alvineResult = await pool.query(alvineQuery);

        if (alvineResult.rows.length > 0) {
            const alvine = alvineResult.rows[0];
            console.log(`✅ Alvine Oum trouvée:`);
            console.log(`   Collaborateur ID: ${alvine.id}`);
            console.log(`   User ID: ${alvine.user_id}`);
            console.log(`   Email: ${alvine.email}`);

            // Vérifier si elle est associée
            if (mission.associe_id === alvine.id) {
                console.log(`   ✅ CONFIRMÉ: Alvine est ASSOCIÉE de cette mission`);
            } else {
                console.log(`   ⚠️  Alvine n'est PAS l'associée (associe_id = ${mission.associe_id})`);
            }
        }

        // 3. Membres via equipes_mission
        console.log('\n3️⃣ Membres dans equipes_mission...');
        const equipesQuery = `
            SELECT 
                em.collaborateur_id,
                em.role,
                c.nom,
                c.prenom,
                c.user_id,
                u.email
            FROM equipes_mission em
            JOIN collaborateurs c ON em.collaborateur_id = c.id
            LEFT JOIN users u ON c.user_id = u.id
            WHERE em.mission_id = $1
            ORDER BY c.nom
        `;
        const equipesResult = await pool.query(equipesQuery, [mission.id]);
        console.log(`Membres trouvés: ${equipesResult.rows.length}`);
        equipesResult.rows.forEach((m, i) => {
            const hasUser = m.user_id ? '✅' : '❌';
            console.log(`   ${i + 1}. ${hasUser} ${m.prenom} ${m.nom} (${m.role}) - ${m.email || 'Pas de compte'}`);
        });

        // 4. Tâches planifiées
        console.log('\n4️⃣ Tâches planifiées...');
        const tasksQuery = `
            SELECT 
                mta.id,
                mta.task_id,
                t.libelle as task_nom,
                mta.collaborateur_id,
                c.nom,
                c.prenom,
                mta.heures_planifiees,
                mta.date_debut,
                mta.date_fin
            FROM mission_task_assignments mta
            JOIN tasks t ON mta.task_id = t.id
            JOIN collaborateurs c ON mta.collaborateur_id = c.id
            WHERE mta.mission_id = $1
            ORDER BY t.libelle, c.nom
        `;
        const tasksResult = await pool.query(tasksQuery, [mission.id]);
        console.log(`Affectations de tâches: ${tasksResult.rows.length}`);

        const taskGroups = {};
        tasksResult.rows.forEach(ta => {
            if (!taskGroups[ta.task_nom]) {
                taskGroups[ta.task_nom] = [];
            }
            taskGroups[ta.task_nom].push(ta);
        });

        Object.keys(taskGroups).forEach(taskName => {
            console.log(`\n   📋 Tâche: ${taskName}`);
            taskGroups[taskName].forEach(ta => {
                console.log(`      • ${ta.prenom} ${ta.nom} - ${ta.heures_planifiees}h planifiées`);
            });
        });

        // 5. Heures saisies
        console.log('\n5️⃣ Heures saisies...');
        const hoursQuery = `
            SELECT 
                te.id,
                te.user_id,
                u.nom as user_nom,
                u.prenom as user_prenom,
                te.date_saisie,
                te.heures,
                te.type_heures,
                t.libelle as task_nom
            FROM time_entries te
            JOIN users u ON te.user_id = u.id
            LEFT JOIN tasks t ON te.task_id = t.id
            WHERE te.mission_id = $1
            ORDER BY te.date_saisie DESC
        `;
        const hoursResult = await pool.query(hoursQuery, [mission.id]);
        console.log(`Entrées de temps: ${hoursResult.rows.length}`);

        if (hoursResult.rows.length > 0) {
            hoursResult.rows.forEach(h => {
                console.log(`   • ${h.user_prenom} ${h.user_nom} - ${h.heures}h (${h.type_heures}) - ${h.task_nom || 'Sans tâche'} - ${h.date_saisie.toISOString().split('T')[0]}`);
            });
        }

        // 6. Test de la requête CTE complète
        console.log('\n6️⃣ Test requête CTE du dashboard...');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const cteQuery = `
            WITH team_members AS (
                SELECT 
                    c.id,
                    c.nom,
                    c.prenom,
                    c.photo_url,
                    c.user_id,
                    mp.role
                FROM equipes_mission mp
                JOIN collaborateurs c ON mp.collaborateur_id = c.id
                WHERE mp.mission_id = $1
                
                UNION
                
                SELECT 
                    c.id,
                    c.nom,
                    c.prenom,
                    c.photo_url,
                    c.user_id,
                    'RESPONSABLE' as role
                FROM missions m
                JOIN collaborateurs c ON m.collaborateur_id = c.id
                WHERE m.id = $1 AND m.collaborateur_id IS NOT NULL
                
                UNION
                
                SELECT 
                    c.id,
                    c.nom,
                    c.prenom,
                    c.photo_url,
                    c.user_id,
                    'MANAGER' as role
                FROM missions m
                JOIN collaborateurs c ON m.manager_id = c.id
                WHERE m.id = $1 AND m.manager_id IS NOT NULL
                
                UNION
                
                SELECT 
                    c.id,
                    c.nom,
                    c.prenom,
                    c.photo_url,
                    c.user_id,
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
                tm.user_id,
                COALESCE(SUM(te.heures), 0) as total_heures,
                COUNT(DISTINCT te.task_id) as nb_taches
            FROM team_members tm
            LEFT JOIN users u ON tm.user_id = u.id
            LEFT JOIN time_entries te ON u.id = te.user_id 
                AND te.mission_id = $1
                AND te.date_saisie >= $2
            GROUP BY tm.id, tm.nom, tm.prenom, tm.role, tm.user_id
            ORDER BY total_heures DESC
        `;

        const cteResult = await pool.query(cteQuery, [mission.id, startDate.toISOString()]);
        console.log(`\n✅ Membres retournés par la requête dashboard: ${cteResult.rows.length}`);

        cteResult.rows.forEach((m, i) => {
            const hasUser = m.user_id ? '✅' : '❌';
            console.log(`   ${i + 1}. ${hasUser} ${m.prenom} ${m.nom} (${m.role}) - ${m.total_heures}h - ${m.nb_taches} tâches`);
        });

        // 7. Comparaison
        const totalExpected = equipesResult.rows.length +
            (mission.collaborateur_id ? 1 : 0) +
            (mission.manager_id ? 1 : 0) +
            (mission.associe_id ? 1 : 0);

        console.log(`\n📊 RÉSUMÉ:`);
        console.log(`   • Membres equipes_mission: ${equipesResult.rows.length}`);
        console.log(`   • Responsable: ${mission.collaborateur_id ? 'Oui' : 'Non'}`);
        console.log(`   • Manager: ${mission.manager_id ? 'Oui' : 'Non'}`);
        console.log(`   • Associé: ${mission.associe_id ? 'Oui' : 'Non'}`);
        console.log(`   • Total attendu (max): ${totalExpected}`);
        console.log(`   • Total retourné: ${cteResult.rows.length}`);

        if (totalExpected !== cteResult.rows.length) {
            console.log(`\n⚠️  DIFFÉRENCE DÉTECTÉE!`);
            console.log(`   Manquants: ${totalExpected - cteResult.rows.length}`);
        } else {
            console.log(`\n✅ Nombre correct!`);
        }

        console.log('\n' + '='.repeat(80));

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

testMissionTest();
