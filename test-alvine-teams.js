const { pool } = require('./src/utils/database');

async function testAlvineTeams() {
    console.log('🔍 Test des équipes pour Alvine Aoum\n');

    try {
        // 1. Trouver Alvine Aoum
        console.log('1️⃣ Recherche de Alvine Aoum...');
        const userQuery = `
            SELECT u.id as user_id, u.nom, u.prenom, u.email,
                   c.id as collaborateur_id
            FROM users u
            LEFT JOIN collaborateurs c ON c.user_id = u.id
            WHERE u.nom ILIKE '%aoum%' OR u.prenom ILIKE '%alvine%'
        `;
        const userResult = await pool.query(userQuery);
        console.log('Utilisateurs trouvés:', userResult.rows);

        if (userResult.rows.length === 0) {
            console.log('❌ Aucun utilisateur trouvé');
            return;
        }

        const user = userResult.rows[0];
        console.log(`\n✅ Utilisateur: ${user.prenom} ${user.nom}`);
        console.log(`   User ID: ${user.user_id}`);
        console.log(`   Collaborateur ID: ${user.collaborateur_id}\n`);

        // 2. Missions via equipes_mission
        console.log('2️⃣ Missions via equipes_mission...');
        const equipesQuery = `
            SELECT 
                m.id,
                m.nom as mission_nom,
                m.statut,
                em.role,
                em.collaborateur_id
            FROM equipes_mission em
            JOIN missions m ON em.mission_id = m.id
            WHERE em.collaborateur_id = $1
            ORDER BY m.nom
        `;
        const equipesResult = await pool.query(equipesQuery, [user.collaborateur_id]);
        console.log(`Missions trouvées: ${equipesResult.rows.length}`);
        equipesResult.rows.forEach(m => {
            console.log(`   - ${m.mission_nom} (${m.statut}) - Rôle: ${m.role}`);
        });

        // 3. Missions via colonnes de missions
        console.log('\n3️⃣ Missions via colonnes missions...');
        const missionsColQuery = `
            SELECT 
                m.id,
                m.nom as mission_nom,
                m.statut,
                CASE 
                    WHEN m.collaborateur_id = $1 THEN 'RESPONSABLE'
                    WHEN m.manager_id = $1 THEN 'MANAGER'
                    WHEN m.associe_id = $1 THEN 'ASSOCIE'
                END as role
            FROM missions m
            WHERE m.collaborateur_id = $1 
               OR m.manager_id = $1 
               OR m.associe_id = $1
            ORDER BY m.nom
        `;
        const missionsColResult = await pool.query(missionsColQuery, [user.collaborateur_id]);
        console.log(`Missions trouvées: ${missionsColResult.rows.length}`);
        missionsColResult.rows.forEach(m => {
            console.log(`   - ${m.mission_nom} (${m.statut}) - Rôle: ${m.role}`);
        });

        // 4. Test de la requête complète du dashboard
        console.log('\n4️⃣ Test requête complète dashboard...');
        const dashboardQuery = `
            SELECT DISTINCT 
                m.id,
                m.nom as nom,
                CASE 
                    WHEN m.collaborateur_id = $1 THEN 'RESPONSABLE'
                    WHEN m.manager_id = $1 THEN 'MANAGER'
                    WHEN m.associe_id = $1 THEN 'ASSOCIE'
                    ELSE mp.role
                END as role,
                COUNT(DISTINCT COALESCE(mp2.collaborateur_id, em.collaborateur_id)) as nb_membres
            FROM missions m
            LEFT JOIN equipes_mission mp ON m.id = mp.mission_id AND mp.collaborateur_id = $1 
                AND mp.role IN ('RESPONSABLE', 'MANAGER', 'ASSOCIE')
            LEFT JOIN equipes_mission mp2 ON m.id = mp2.mission_id
            LEFT JOIN equipes_mission em ON m.id = em.mission_id
            WHERE (
                mp.collaborateur_id = $1 
                OR m.collaborateur_id = $1 
                OR m.manager_id = $1 
                OR m.associe_id = $1
            )
            AND m.statut IN ('EN_COURS', 'PLANIFIEE')
            GROUP BY m.id, m.nom, m.collaborateur_id, m.manager_id, m.associe_id, mp.role
            ORDER BY m.nom
        `;
        const dashboardResult = await pool.query(dashboardQuery, [user.collaborateur_id]);
        console.log(`Missions trouvées: ${dashboardResult.rows.length}`);
        dashboardResult.rows.forEach(m => {
            console.log(`   - ${m.nom} - Rôle: ${m.role} - Membres: ${m.nb_membres}`);
        });

        // 5. Toutes les missions EN_COURS ou PLANIFIEE
        console.log('\n5️⃣ Toutes les missions EN_COURS ou PLANIFIEE...');
        const allMissionsQuery = `
            SELECT id, nom, statut
            FROM missions
            WHERE statut IN ('EN_COURS', 'PLANIFIEE')
            ORDER BY nom
        `;
        const allMissionsResult = await pool.query(allMissionsQuery);
        console.log(`Total missions actives: ${allMissionsResult.rows.length}`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

testAlvineTeams();
