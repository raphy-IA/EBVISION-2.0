const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');

// GET /api/analytics/team/available - Récupérer les équipes disponibles pour l'utilisateur
router.get('/available', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`📊 Chargement équipes disponibles pour user ${userId}`);

        // Récupérer le collaborateur associé à l'utilisateur
        const collaborateurQuery = `
            SELECT id, business_unit_id, division_id
            FROM collaborateurs
            WHERE user_id = $1
        `;
        const collaborateurResult = await pool.query(collaborateurQuery, [userId]);

        if (collaborateurResult.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    available_team_types: [],
                    teams: {}
                }
            });
        }

        const collaborateur = collaborateurResult.rows[0];
        const collaborateurId = collaborateur.id;

        const teams = {};
        const availableTypes = [];


        // 1. Équipes Mission (Responsable, Manager, Associé)
        // Vérifier à la fois equipes_mission ET les colonnes de la table missions
        const missionsQuery = `
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
        const missionsResult = await pool.query(missionsQuery, [collaborateurId]);

        if (missionsResult.rows.length > 0) {
            teams.mission = missionsResult.rows;
            availableTypes.push('mission');
        }


        // 2. Équipe Business Unit
        if (collaborateur.business_unit_id) {
            const buQuery = `
                SELECT 
                    bu.id,
                    bu.nom,
                    COUNT(DISTINCT c.id) as nb_membres,
                    COUNT(DISTINCT d.id) as nb_divisions
                FROM business_units bu
                LEFT JOIN collaborateurs c ON (
                    c.business_unit_id = bu.id 
                    OR c.division_id IN (
                        SELECT id FROM divisions WHERE business_unit_id = bu.id
                    )
                )
                LEFT JOIN divisions d ON d.business_unit_id = bu.id
                WHERE bu.id = $1
                GROUP BY bu.id, bu.nom
            `;
            const buResult = await pool.query(buQuery, [collaborateur.business_unit_id]);

            if (buResult.rows.length > 0) {
                teams.bu = buResult.rows[0];
                availableTypes.push('bu');
            }
        }

        // 3. Équipe Division
        if (collaborateur.division_id) {
            const divisionQuery = `
                SELECT 
                    d.id,
                    d.nom,
                    COUNT(DISTINCT c.id) as nb_membres
                FROM divisions d
                LEFT JOIN collaborateurs c ON c.division_id = d.id
                WHERE d.id = $1
                GROUP BY d.id, d.nom
            `;
            const divisionResult = await pool.query(divisionQuery, [collaborateur.division_id]);

            if (divisionResult.rows.length > 0) {
                teams.division = divisionResult.rows[0];
                availableTypes.push('division');
            }
        }

        // 4. Équipe de Supervision
        const supervisionQuery = `
            SELECT COUNT(DISTINCT tss.collaborateur_id) as nb_supervises
            FROM time_sheet_supervisors tss
            WHERE tss.supervisor_id = $1
        `;
        const supervisionResult = await pool.query(supervisionQuery, [collaborateurId]);
        const nbSupervises = parseInt(supervisionResult.rows[0].nb_supervises);

        if (nbSupervises > 0) {
            teams.supervision = { nb_supervises: nbSupervises };
            availableTypes.push('supervision');
        }

        console.log('✅ Équipes disponibles:', availableTypes);

        res.json({
            success: true,
            data: {
                available_team_types: availableTypes,
                teams: teams
            }
        });

    } catch (error) {
        console.error('❌ Erreur chargement équipes disponibles:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des équipes disponibles',
            details: error.message
        });
    }
});

// GET /api/analytics/team - Récupérer les analytics d'une équipe
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { team_type, team_id, period = 30 } = req.query;

        console.log(`📊 Analytics équipe - Type: ${team_type}, ID: ${team_id}, Période: ${period}j`);

        if (!team_type) {
            return res.status(400).json({
                success: false,
                error: 'Le paramètre team_type est requis'
            });
        }

        // Récupérer le collaborateur
        const collaborateurQuery = `
            SELECT id, business_unit_id, division_id
            FROM collaborateurs
            WHERE user_id = $1
        `;
        const collaborateurResult = await pool.query(collaborateurQuery, [userId]);

        if (collaborateurResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }

        const collaborateur = collaborateurResult.rows[0];
        const collaborateurId = collaborateur.id;

        // Calculer la date de début
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        let teamData;

        switch (team_type) {
            case 'mission':
                teamData = await getTeamMissionAnalytics(team_id, collaborateurId, startDate);
                break;
            case 'bu':
                teamData = await getTeamBUAnalytics(collaborateur.business_unit_id, startDate);
                break;
            case 'division':
                teamData = await getTeamDivisionAnalytics(collaborateur.division_id, startDate);
                break;
            case 'supervision':
                teamData = await getTeamSupervisionAnalytics(collaborateurId, startDate);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Type d\'équipe invalide'
                });
        }

        res.json({
            success: true,
            data: teamData
        });

    } catch (error) {
        console.error('❌ Erreur analytics équipe:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des analytics',
            details: error.message
        });
    }
});

// Fonction pour analytics équipe mission
async function getTeamMissionAnalytics(missionId, collaborateurId, startDate) {
    // Vérifier l'accès - soit via equipes_mission, soit via les colonnes de missions
    const accessQuery = `
        SELECT 1 as has_access
        FROM missions m
        LEFT JOIN equipes_mission em ON m.id = em.mission_id AND em.collaborateur_id = $2
        WHERE m.id = $1
          AND (
              em.role IN ('RESPONSABLE', 'MANAGER', 'ASSOCIE')
              OR m.collaborateur_id = $2
              OR m.manager_id = $2
              OR m.associe_id = $2
          )
    `;
    const accessResult = await pool.query(accessQuery, [missionId, collaborateurId]);

    if (accessResult.rows.length === 0) {
        throw new Error('Accès non autorisé à cette mission');
    }


    // Membres de l'équipe avec leurs performances
    // Inclure à la fois equipes_mission ET les colonnes de missions
    const membersQuery = `
        WITH team_members AS (
            -- Membres de equipes_mission
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
            
            -- Responsable de la mission
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
            
            -- Manager de la mission
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
            
            -- Associé de la mission
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
            tm.photo_url,
            tm.role,
            COALESCE(SUM(te.heures), 0) as total_heures,
            COUNT(DISTINCT te.task_id) as nb_taches
        FROM team_members tm
        LEFT JOIN users u ON tm.user_id = u.id
        LEFT JOIN time_entries te ON u.id = te.user_id 
            AND te.mission_id = $1
            AND te.date_saisie >= $2
        GROUP BY tm.id, tm.nom, tm.prenom, tm.photo_url, tm.role
        ORDER BY total_heures DESC
    `;
    const membersResult = await pool.query(membersQuery, [missionId, startDate.toISOString()]);

    // KPIs équipe
    const totalHeures = membersResult.rows.reduce((sum, m) => sum + parseFloat(m.total_heures), 0);
    const nbMembres = membersResult.rows.length;

    // Missions actives (pour cette équipe, c'est 1)
    const missionsActives = 1;

    // Tâches de la mission - Simplifié car tasks n'a pas de statut
    const tasksQuery = `
        SELECT COUNT(DISTINCT task_id) as nb_taches
        FROM time_entries
        WHERE mission_id = $1 AND task_id IS NOT NULL
    `;
    const tasksResult = await pool.query(tasksQuery, [missionId]);

    const taskStats = {
        total: 0,
        terminees: 0,
        en_cours: 0,
        a_faire: 0
    };

    tasksResult.rows.forEach(row => {
        taskStats.total += parseInt(row.nb_taches);
        if (row.statut === 'TERMINEE') taskStats.terminees = parseInt(row.nb_taches);
        if (row.statut === 'EN_COURS') taskStats.en_cours = parseInt(row.nb_taches);
        if (row.statut === 'A_FAIRE') taskStats.a_faire = parseInt(row.nb_taches);
    });

    const tauxCompletion = taskStats.total > 0
        ? Math.round((taskStats.terminees / taskStats.total) * 100)
        : 0;

    // Évolution temporelle (7 derniers jours)
    const evolutionQuery = `
        SELECT 
            DATE(te.date_saisie) as date,
            SUM(te.heures) as heures
        FROM time_entries te
        WHERE te.mission_id = $1
          AND te.date_saisie >= $2
        GROUP BY DATE(te.date_saisie)
        ORDER BY date
    `;
    const evolutionResult = await pool.query(evolutionQuery, [missionId, startDate.toISOString()]);

    return {
        kpis: {
            total_heures: totalHeures,
            nb_membres: nbMembres,
            missions_actives: missionsActives,
            taux_completion: tauxCompletion,
            taches_total: taskStats.total,
            taches_terminees: taskStats.terminees
        },
        members: membersResult.rows,
        evolution: evolutionResult.rows,
        task_stats: taskStats
    };
}

// Fonction pour analytics équipe BU
async function getTeamBUAnalytics(buId, startDate) {
    if (!buId) {
        throw new Error('Business Unit non définie');
    }

    // Membres de l'équipe avec leurs performances
    const membersQuery = `
        SELECT 
            c.id,
            c.nom,
            c.prenom,
            c.photo_url,
            d.nom as division_nom,
            COALESCE(SUM(te.heures), 0) as total_heures,
            COALESCE(SUM(CASE WHEN te.type_heures = 'HC' THEN te.heures ELSE 0 END), 0) as heures_facturables,
            COUNT(DISTINCT te.mission_id) as nb_missions,
            COUNT(DISTINCT CASE WHEN m.statut = 'EN_COURS' THEN m.id END) as missions_actives
        FROM collaborateurs c
        LEFT JOIN divisions d ON c.division_id = d.id
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN time_entries te ON u.id = te.user_id
            AND te.date_saisie >= $2
        LEFT JOIN missions m ON te.mission_id = m.id
        WHERE c.business_unit_id = $1
           OR c.division_id IN (
               SELECT id FROM divisions WHERE business_unit_id = $1
           )
        GROUP BY c.id, c.nom, c.prenom, c.photo_url, d.nom
        ORDER BY total_heures DESC
    `;
    const membersResult = await pool.query(membersQuery, [buId, startDate.toISOString()]);

    // Calculer taux de chargeabilité pour chaque membre
    const members = membersResult.rows.map(m => ({
        ...m,
        taux_chargeabilite: parseFloat(m.total_heures) > 0
            ? Math.round((parseFloat(m.heures_facturables) / parseFloat(m.total_heures)) * 100)
            : 0
    }));

    // KPIs équipe
    const totalHeures = members.reduce((sum, m) => sum + parseFloat(m.total_heures), 0);
    const heuresFact = members.reduce((sum, m) => sum + parseFloat(m.heures_facturables), 0);
    const tauxChargeabilite = totalHeures > 0 ? Math.round((heuresFact / totalHeures) * 100) : 0;
    const nbMembres = members.length;
    const missionsActives = members.reduce((sum, m) => sum + parseInt(m.missions_actives), 0);

    // Performance par division
    const divisionQuery = `
        SELECT 
            d.nom as division_nom,
            COUNT(DISTINCT c.id) as nb_membres,
            COALESCE(SUM(te.heures), 0) as total_heures,
            COALESCE(SUM(CASE WHEN te.type_heures = 'HC' THEN te.heures ELSE 0 END), 0) as heures_facturables
        FROM divisions d
        LEFT JOIN collaborateurs c ON c.division_id = d.id
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN time_entries te ON u.id = te.user_id
            AND te.date_saisie >= $2
        LEFT JOIN missions m ON te.mission_id = m.id
        WHERE d.business_unit_id = $1
        GROUP BY d.id, d.nom
        ORDER BY total_heures DESC
    `;
    const divisionResult = await pool.query(divisionQuery, [buId, startDate.toISOString()]);

    return {
        kpis: {
            total_heures: totalHeures,
            heures_facturables: heuresFact,
            taux_chargeabilite: tauxChargeabilite,
            nb_membres: nbMembres,
            missions_actives: missionsActives
        },
        members: members,
        divisions: divisionResult.rows
    };
}

// Fonction pour analytics équipe Division
async function getTeamDivisionAnalytics(divisionId, startDate) {
    if (!divisionId) {
        throw new Error('Division non définie');
    }

    // Membres de l'équipe avec leurs performances
    const membersQuery = `
        SELECT 
            c.id,
            c.nom,
            c.prenom,
            c.photo_url,
            COALESCE(SUM(te.heures), 0) as total_heures,
            COALESCE(SUM(CASE WHEN te.type_heures = 'HC' THEN te.heures ELSE 0 END), 0) as heures_facturables,
            COUNT(DISTINCT te.mission_id) as nb_missions,
            COUNT(DISTINCT CASE WHEN m.statut = 'EN_COURS' THEN m.id END) as missions_actives
        FROM collaborateurs c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN time_entries te ON u.id = te.user_id
            AND te.date_saisie >= $2
        LEFT JOIN missions m ON te.mission_id = m.id
        WHERE c.division_id = $1
        GROUP BY c.id, c.nom, c.prenom, c.photo_url
        ORDER BY total_heures DESC
    `;
    const membersResult = await pool.query(membersQuery, [divisionId, startDate.toISOString()]);

    // Calculer taux de chargeabilité pour chaque membre
    const members = membersResult.rows.map(m => ({
        ...m,
        taux_chargeabilite: parseFloat(m.total_heures) > 0
            ? Math.round((parseFloat(m.heures_facturables) / parseFloat(m.total_heures)) * 100)
            : 0
    }));

    // KPIs équipe
    const totalHeures = members.reduce((sum, m) => sum + parseFloat(m.total_heures), 0);
    const heuresFact = members.reduce((sum, m) => sum + parseFloat(m.heures_facturables), 0);
    const tauxChargeabilite = totalHeures > 0 ? Math.round((heuresFact / totalHeures) * 100) : 0;
    const nbMembres = members.length;
    const missionsActives = members.reduce((sum, m) => sum + parseInt(m.missions_actives), 0);

    return {
        kpis: {
            total_heures: totalHeures,
            heures_facturables: heuresFact,
            taux_chargeabilite: tauxChargeabilite,
            nb_membres: nbMembres,
            missions_actives: missionsActives
        },
        members: members
    };
}

// Fonction pour analytics équipe Supervision
async function getTeamSupervisionAnalytics(superviseurId, startDate) {
    // Membres de l'équipe avec leurs performances
    const membersQuery = `
        SELECT 
            c.id,
            c.nom,
            c.prenom,
            c.photo_url,
            d.nom as division_nom,
            bu.nom as business_unit_nom,
            COALESCE(SUM(te.heures), 0) as total_heures,
            COALESCE(SUM(CASE WHEN te.type_heures = 'HC' THEN te.heures ELSE 0 END), 0) as heures_facturables,
            COUNT(DISTINCT te.mission_id) as nb_missions,
            COUNT(DISTINCT CASE WHEN m.statut = 'EN_COURS' THEN m.id END) as missions_actives
        FROM time_sheet_supervisors tss
        JOIN collaborateurs c ON tss.collaborateur_id = c.id
        LEFT JOIN divisions d ON c.division_id = d.id
        LEFT JOIN business_units bu ON c.business_unit_id = bu.id
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN time_entries te ON u.id = te.user_id
            AND te.date_saisie >= $2
        LEFT JOIN missions m ON te.mission_id = m.id
        WHERE tss.supervisor_id = $1
        GROUP BY c.id, c.nom, c.prenom, c.photo_url, d.nom, bu.nom
        ORDER BY total_heures DESC
    `;
    const membersResult = await pool.query(membersQuery, [superviseurId, startDate.toISOString()]);

    // Calculer taux de chargeabilité pour chaque membre
    const members = membersResult.rows.map(m => ({
        ...m,
        taux_chargeabilite: parseFloat(m.total_heures) > 0
            ? Math.round((parseFloat(m.heures_facturables) / parseFloat(m.total_heures)) * 100)
            : 0
    }));

    // KPIs équipe
    const totalHeures = members.reduce((sum, m) => sum + parseFloat(m.total_heures), 0);
    const heuresFact = members.reduce((sum, m) => sum + parseFloat(m.heures_facturables), 0);
    const tauxChargeabilite = totalHeures > 0 ? Math.round((heuresFact / totalHeures) * 100) : 0;
    const nbMembres = members.length;
    const missionsActives = members.reduce((sum, m) => sum + parseInt(m.missions_actives), 0);

    return {
        kpis: {
            total_heures: totalHeures,
            heures_facturables: heuresFact,
            taux_chargeabilite: tauxChargeabilite,
            nb_membres: nbMembres,
            missions_actives: missionsActives
        },
        members: members
    };
}

module.exports = router;
