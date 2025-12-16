const { pool } = require('./src/utils/database');

async function testAllMissionsMembers() {
    console.log('🔍 Test complet des membres de missions\n');
    console.log('='.repeat(80));

    try {
        // Récupérer toutes les missions EN_COURS avec leurs équipes
        console.log('\n📊 Analyse de toutes les missions EN_COURS...\n');

        const missionsQuery = `
            SELECT 
                m.id,
                m.nom,
                m.statut,
                m.collaborateur_id as responsable_id,
                m.manager_id,
                m.associe_id,
                COUNT(DISTINCT em.collaborateur_id) as nb_equipes_mission,
                COUNT(DISTINCT CASE WHEN em.role IN ('RESPONSABLE', 'MANAGER', 'ASSOCIE') THEN em.collaborateur_id END) as nb_leaders
            FROM missions m
            LEFT JOIN equipes_mission em ON m.id = em.mission_id
            WHERE m.statut IN ('EN_COURS', 'PLANIFIEE')
            GROUP BY m.id, m.nom, m.statut, m.collaborateur_id, m.manager_id, m.associe_id
            ORDER BY nb_equipes_mission DESC, m.nom
            LIMIT 20
        `;

        const missionsResult = await pool.query(missionsQuery);
        console.log(`Missions trouvées: ${missionsResult.rows.length}\n`);

        for (const mission of missionsResult.rows) {
            console.log('─'.repeat(80));
            console.log(`\n📋 Mission: ${mission.nom}`);
            console.log(`   ID: ${mission.id}`);
            console.log(`   Statut: ${mission.statut}`);

            // Compter les membres de différentes sources
            const stats = {
                equipes_mission_total: parseInt(mission.nb_equipes_mission),
                equipes_mission_leaders: parseInt(mission.nb_leaders),
                colonnes_missions: 0
            };

            if (mission.responsable_id) stats.colonnes_missions++;
            if (mission.manager_id) stats.colonnes_missions++;
            if (mission.associe_id) stats.colonnes_missions++;

            console.log(`\n   📊 Statistiques:`);
            console.log(`      • Membres dans equipes_mission: ${stats.equipes_mission_total}`);
            console.log(`      • Leaders (RESPONSABLE/MANAGER/ASSOCIE): ${stats.equipes_mission_leaders}`);
            console.log(`      • Membres via colonnes missions: ${stats.colonnes_missions}`);

            // Détail des membres equipes_mission
            const membersQuery = `
                SELECT 
                    c.nom,
                    c.prenom,
                    em.role,
                    c.user_id,
                    u.email
                FROM equipes_mission em
                JOIN collaborateurs c ON em.collaborateur_id = c.id
                LEFT JOIN users u ON c.user_id = u.id
                WHERE em.mission_id = $1
                ORDER BY em.role, c.nom
            `;
            const membersResult = await pool.query(membersQuery, [mission.id]);

            if (membersResult.rows.length > 0) {
                console.log(`\n   👥 Membres equipes_mission (${membersResult.rows.length}):`);
                membersResult.rows.forEach(m => {
                    const hasUser = m.user_id ? '✅' : '❌';
                    console.log(`      ${hasUser} ${m.prenom} ${m.nom} (${m.role}) - ${m.email || 'Pas de compte user'}`);
                });
            }

            // Membres via colonnes
            if (stats.colonnes_missions > 0) {
                console.log(`\n   👔 Membres via colonnes missions:`);
                if (mission.responsable_id) {
                    const resp = await pool.query('SELECT nom, prenom FROM collaborateurs WHERE id = $1', [mission.responsable_id]);
                    if (resp.rows[0]) console.log(`      • RESPONSABLE: ${resp.rows[0].prenom} ${resp.rows[0].nom}`);
                }
                if (mission.manager_id) {
                    const mgr = await pool.query('SELECT nom, prenom FROM collaborateurs WHERE id = $1', [mission.manager_id]);
                    if (mgr.rows[0]) console.log(`      • MANAGER: ${mgr.rows[0].prenom} ${mgr.rows[0].nom}`);
                }
                if (mission.associe_id) {
                    const assoc = await pool.query('SELECT nom, prenom FROM collaborateurs WHERE id = $1', [mission.associe_id]);
                    if (assoc.rows[0]) console.log(`      • ASSOCIE: ${assoc.rows[0].prenom} ${assoc.rows[0].nom}`);
                }
            }

            // Test de la requête CTE du dashboard
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            const cteQuery = `
                WITH team_members AS (
                    SELECT 
                        c.id,
                        c.nom,
                        c.prenom,
                        mp.role
                    FROM equipes_mission mp
                    JOIN collaborateurs c ON mp.collaborateur_id = c.id
                    WHERE mp.mission_id = $1
                    
                    UNION
                    
                    SELECT 
                        c.id,
                        c.nom,
                        c.prenom,
                        'RESPONSABLE' as role
                    FROM missions m
                    JOIN collaborateurs c ON m.collaborateur_id = c.id
                    WHERE m.id = $1 AND m.collaborateur_id IS NOT NULL
                    
                    UNION
                    
                    SELECT 
                        c.id,
                        c.nom,
                        c.prenom,
                        'MANAGER' as role
                    FROM missions m
                    JOIN collaborateurs c ON m.manager_id = c.id
                    WHERE m.id = $1 AND m.manager_id IS NOT NULL
                    
                    UNION
                    
                    SELECT 
                        c.id,
                        c.nom,
                        c.prenom,
                        'ASSOCIE' as role
                    FROM missions m
                    JOIN collaborateurs c ON m.associe_id = c.id
                    WHERE m.id = $1 AND m.associe_id IS NOT NULL
                )
                SELECT 
                    tm.id,
                    tm.nom,
                    tm.prenom,
                    tm.role
                FROM team_members tm
                ORDER BY tm.nom
            `;
            const cteResult = await pool.query(cteQuery, [mission.id]);

            console.log(`\n   🎯 Résultat requête Dashboard CTE: ${cteResult.rows.length} membres`);
            if (cteResult.rows.length > 0) {
                cteResult.rows.forEach(m => {
                    console.log(`      • ${m.prenom} ${m.nom} (${m.role})`);
                });
            }

            // Comparaison
            const expected = stats.equipes_mission_total + stats.colonnes_missions;
            const actual = cteResult.rows.length;

            if (expected !== actual) {
                console.log(`\n   ⚠️  DIFFÉRENCE DÉTECTÉE!`);
                console.log(`      Attendu: ${expected} membres (${stats.equipes_mission_total} equipes + ${stats.colonnes_missions} colonnes)`);
                console.log(`      Obtenu: ${actual} membres dans le dashboard`);
                console.log(`      Manquants: ${expected - actual}`);
            } else {
                console.log(`\n   ✅ Nombre de membres correct!`);
            }

            console.log('');
        }

        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

testAllMissionsMembers();
