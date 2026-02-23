const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

/**
 * GET /api/missions
 * Récupérer toutes les missions avec pagination et filtres
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');

        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            client_id: req.query.client_id,
            statut: req.query.statut,
            type_mission: req.query.type_mission,
            business_unit_id: req.query.business_unit_id,
            division_id: req.query.division_id,
            code: req.query.code,
            search: req.query.search,
            fiscal_year_id: req.query.fiscal_year_id,
            view: req.query.view // 'my_scope', 'active', 'finished'
        };

        const user = req.user; // Authenticated user
        const userRoles = user.roles || [];
        const isSuperAdmin = userRoles.some(r => ['SUPER_ADMIN', 'RESPONSABLE_FINANCE'].includes(r));

        // Joins de base nécessaires pour la sécurité/filtrage
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;
        let extraJoins = "";

        // Logique de filtrage par Vue
        // 'my_scope', 'active', 'finished' => Filtrage strict par Rôle (Responsable, Manager, Associé)
        // 'all' => Filtrage par Périmètre BU (sauf SuperAdmin qui voit tout)

        const isPersonalView = ['my_scope', 'active', 'finished'].includes(options.view);
        // On applique les restrictions de sécurité (et donc les jointures nécessaires) si :
        // 1. C'est une vue personnelle (pour tout le monde)
        // 2. OU si l'utilisateur N'EST PAS SuperAdmin (pour la vue 'all')
        const shouldApplyRestrictions = isPersonalView || !isSuperAdmin;

        if (shouldApplyRestrictions) {
            extraJoins += ` LEFT JOIN users u_req ON u_req.id = $${paramIndex} `;
            queryParams.push(user.id);
            paramIndex++;
            extraJoins += ` LEFT JOIN collaborateurs col_req ON u_req.collaborateur_id = col_req.id `;
            extraJoins += ` LEFT JOIN user_business_unit_access ubua ON ubua.user_id = u_req.id AND ubua.business_unit_id = m.business_unit_id `;

            if (isPersonalView) {
                // Vue Personnelle : Je dois être impliqué directement
                whereConditions.push(`(
                    m.collaborateur_id = u_req.collaborateur_id OR
                    m.manager_id = u_req.collaborateur_id OR
                    m.associe_id = u_req.collaborateur_id
                )`);

                // Filtres de statut spécifiques aux vues personnelles
                if (options.view === 'active') {
                    whereConditions.push(`m.statut = 'EN_COURS'`);
                } else if (options.view === 'finished') {
                    whereConditions.push(`m.statut IN ('TERMINEE', 'ARCHIVEE')`);
                }
            } else {
                // Vue "Toutes les missions" (Non-SuperAdmin)
                // Restriction au périmètre BU (Principale + Secondaires) + Mes implications directes
                whereConditions.push(`(
                    m.business_unit_id = col_req.business_unit_id OR 
                    ubua.business_unit_id IS NOT NULL OR
                    m.collaborateur_id = u_req.collaborateur_id OR
                    m.manager_id = u_req.collaborateur_id OR
                    m.associe_id = u_req.collaborateur_id
                )`);
            }
        }
        // Si SuperAdmin ET view='all', on ne rentre pas dans le if, donc pas de restrictions ni de jointures inutiles.

        // Filtres additionnels standards (s'appliquent par-dessus la vue)
        if (options.client_id) {
            whereConditions.push(`m.client_id = $${paramIndex++}`);
            queryParams.push(options.client_id);
        }

        if (options.statut) {
            whereConditions.push(`m.statut = $${paramIndex++}`);
            queryParams.push(options.statut);
        }

        if (options.type_mission) {
            whereConditions.push(`m.type_mission = $${paramIndex++}`);
            queryParams.push(options.type_mission);
        }

        if (options.business_unit_id) {
            whereConditions.push(`m.business_unit_id = $${paramIndex++}`);
            queryParams.push(options.business_unit_id);
        }

        if (options.division_id) {
            whereConditions.push(`m.division_id = $${paramIndex++}`);
            queryParams.push(options.division_id);
        }

        if (options.code) {
            whereConditions.push(`m.code ILIKE $${paramIndex++}`);
            queryParams.push(`%${options.code}%`);
        }

        if (options.fiscal_year_id) {
            whereConditions.push(`m.fiscal_year_id = $${paramIndex++}`);
            queryParams.push(options.fiscal_year_id);
        }

        if (options.search) {
            whereConditions.push(`(
                m.nom ILIKE $${paramIndex} OR 
                m.description ILIKE $${paramIndex} OR
                c.nom ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${options.search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Requête pour le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            ${extraJoins}
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const offset = (options.page - 1) * options.limit;
        const dataQuery = `
            SELECT 
                m.*,
                c.nom as client_nom,
                c.sigle as client_sigle,
                bu.nom as business_unit_nom,
                d.nom as division_nom
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            ${extraJoins}
            ${whereClause}
            ORDER BY m.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        queryParams.push(options.limit, offset);
        const result = await pool.query(dataQuery, queryParams);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: options.page,
                limit: options.limit,
                total,
                totalPages: Math.ceil(total / options.limit)
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des missions:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des missions',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/stats
 * Récupérer les statistiques globales des missions (filtrées par scope user)
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        const user = req.user;
        let conditions = [];
        let values = [];
        let valueIndex = 1;
        let joins = `
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
        `;

        const userRoles = user.roles || [];
        // SEUL le SUPER_ADMIN voit tout par défaut
        const isSuperAdmin = userRoles.includes('SUPER_ADMIN');

        // Distinction logique Vue Personnelle vs Vue "Toutes les missions"
        const isPersonalView = ['my_scope', 'active', 'finished'].includes(req.query.view);
        const shouldApplyRestrictions = isPersonalView || !isSuperAdmin;

        if (shouldApplyRestrictions) {
            // Joins de base nécessaires pour la sécurité/filtrage (identique à GET /)
            joins += ` LEFT JOIN users u_req ON u_req.id = $${valueIndex} `;
            values.push(user.id);
            valueIndex++;
            joins += ` LEFT JOIN collaborateurs col_req ON u_req.collaborateur_id = col_req.id `;
            joins += ` LEFT JOIN user_business_unit_access ubua ON ubua.user_id = u_req.id AND ubua.business_unit_id = m.business_unit_id `;

            if (isPersonalView) {
                // Vue Personnelle : Je dois être impliqué directement
                conditions.push(`(
                    m.collaborateur_id = u_req.collaborateur_id OR
                    m.manager_id = u_req.collaborateur_id OR
                    m.associe_id = u_req.collaborateur_id
                )`);
            } else {
                // Vue "Toutes les missions" (Non-SuperAdmin)
                conditions.push(`(
                    m.business_unit_id = col_req.business_unit_id OR 
                    ubua.business_unit_id IS NOT NULL OR
                    m.collaborateur_id = u_req.collaborateur_id OR
                    m.manager_id = u_req.collaborateur_id OR
                    m.associe_id = u_req.collaborateur_id
                )`);
            }
        }

        // Apply standard filters
        if (req.query.view === 'active') {
            conditions.push(`m.statut = 'EN_COURS'`);
        }
        else if (req.query.view === 'finished') {
            conditions.push(`m.statut IN ('TERMINEE', 'ARCHIVEE')`);
        }

        if (req.query.client_id) {
            conditions.push(`m.client_id = $${valueIndex++}`);
            values.push(req.query.client_id);
        }

        if (req.query.statut) {
            conditions.push(`m.statut = $${valueIndex++}`);
            values.push(req.query.statut);
        }

        if (req.query.business_unit_id) {
            conditions.push(`m.business_unit_id = $${valueIndex++}`);
            values.push(req.query.business_unit_id);
        }

        if (req.query.fiscal_year_id) {
            conditions.push(`m.fiscal_year_id = $${valueIndex++}`);
            values.push(req.query.fiscal_year_id);
        }

        if (req.query.division_id) {
            conditions.push(`m.division_id = $${valueIndex++}`);
            values.push(req.query.division_id);
        }

        if (req.query.code) {
            conditions.push(`m.code ILIKE $${valueIndex++}`);
            values.push(`%${req.query.code}%`);
        }

        if (req.query.search) {
            // Need to join clients if not already joined?
            // The query already has `LEFT JOIN clients c ON m.client_id = c.id`?
            // Wait, the original query in /stats ONLY joins BU (line 183).
            // I need to add Client join if I want to search by client name, like in GET /
            joins += ` LEFT JOIN clients c ON m.client_id = c.id `;
            conditions.push(`(
                m.nom ILIKE $${valueIndex} OR 
                m.description ILIKE $${valueIndex} OR
                c.nom ILIKE $${valueIndex}
            )`);
            values.push(`%${req.query.search}%`);
            // The placeholder $valueIndex is reused 3 times, which PG supports?
            // Actually, node-postgres usually expects distinct placeholders like $1, $2 if the value is passed once?
            // "paramIndex" in GET / uses `queryParams.push(...)` for each placeholder.
            // Let's look at GET / implementation again.
            // GET /: 
            // whereConditions.push(`(m.nom ILIKE $${paramIndex} OR ... c.nom ILIKE $${paramIndex})`);
            // queryParams.push(`%${options.search}%`);
            // paramIndex++;
            // YES, if we pass the value ONCE in the array at index (paramIndex-1), we can refer to it as $paramIndex multiple times in the query.
            valueIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT
                COUNT(*) as total_missions,
                COUNT(CASE WHEN m.statut = 'EN_COURS' THEN 1 END) as missions_actives,
                COUNT(CASE WHEN m.statut IN ('TERMINEE', 'ARCHIVEE') THEN 1 END) as missions_terminees,
                COALESCE(SUM(m.budget_estime), 0) as total_budget
            FROM missions m
            ${joins}
            ${whereClause}
        `;

        const result = await pool.query(query, values);
        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Erreur stats missions:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la récupération des statistiques' });
    }
});


// GET /api/missions/planned - Missions planifiées pour l'utilisateur connecté
router.get('/planned', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        const userId = req.user.id;
        console.log(`[API] Fetching planned missions for user: ${userId}`);

        const query = `
            SELECT DISTINCT 
                m.id, 
                m.nom, 
                m.code, 
                c.nom as client_nom,
                c.sigle as client_sigle
            FROM missions m
            JOIN mission_tasks mt ON m.id = mt.mission_id
            JOIN task_assignments ta ON mt.id = ta.mission_task_id
            JOIN collaborateurs col ON ta.collaborateur_id = col.id
            LEFT JOIN clients c ON m.client_id = c.id
            WHERE col.user_id = $1
            AND m.statut IN ('EN_COURS', 'PLANIFIEE')
            ORDER BY m.nom
        `;

        const result = await pool.query(query, [userId]);
        console.log(`[API] Found ${result.rows.length} planned missions`);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des missions planifiées:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des missions planifiées',
            error: error.message
        });
    }
});

/**
 * GET /api/missions/:id
 * Récupérer une mission par ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');

        const query = `
            SELECT 
                m.*,
                c.nom as client_nom,
                mt.libelle as mission_type_nom,
                u.nom as responsable_nom,
                u.prenom as responsable_prenom,
                manager.nom as manager_nom,
                manager.prenom as manager_prenom,
                associe.nom as associe_nom,
                associe.prenom as associe_prenom,
                bu.nom as business_unit_nom,
                d.nom as division_nom,
                creator.nom as created_by_nom,
                creator.prenom as created_by_prenom,
                fy.annee as fiscal_year_annee
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN mission_types mt ON m.mission_type_id = mt.id
            LEFT JOIN collaborateurs u ON m.collaborateur_id = u.id
            LEFT JOIN collaborateurs manager ON m.manager_id = manager.id
            LEFT JOIN collaborateurs associe ON m.associe_id = associe.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            LEFT JOIN users creator ON m.created_by = creator.id
            LEFT JOIN fiscal_years fy ON m.fiscal_year_id = fy.id
            WHERE m.id = $1
        `;

        const result = await pool.query(query, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mission non trouvée'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la mission:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la mission',
            details: error.message
        });
    }
});

/**
 * POST /api/missions
 * Créer une nouvelle mission avec toutes les données du wizard
 */
router.post('/', authenticateToken, async (req, res) => {
    const { pool } = require('../utils/database');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            // Données de base de la mission
            code, nom, description, client_id, opportunity_id, mission_type_id,
            date_debut, date_fin_prevue, budget_prevue, taux_horaire_moyen,
            division_id, responsable_id, associe_id, priorite, statut, notes,

            // Configuration financière
            montant_honoraires, devise, description_honoraires,
            montant_debours, description_debours,
            conditions_paiement, pourcentage_avance,

            // Business Unit et Division (viennent du type de mission)
            business_unit_id,

            // Tâches et affectations
            tasks,

            // Documents
            kyc_path,
            contract_path
        } = req.body;

        // 1. Créer la mission
        const missionQuery = `
            INSERT INTO missions (
                code, nom, description, client_id, collaborateur_id, statut, type_mission,
                priorite, date_debut, date_fin, budget_estime, devise, notes, created_by,
                fiscal_year_id, opportunity_id, mission_type_id, montant_honoraires,
                description_honoraires, montant_debours, description_debours,
                conditions_paiement, pourcentage_avance, business_unit_id, associe_id,
                division_id, kyc_path, contract_path
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
            ) RETURNING *
        `;

        // Récupérer l'année fiscale en cours
        const fiscalYearQuery = `
            SELECT id FROM fiscal_years 
            WHERE date_debut <= CURRENT_DATE AND date_fin >= CURRENT_DATE 
            AND statut = 'EN_COURS' 
            LIMIT 1
        `;
        const fiscalYearResult = await client.query(fiscalYearQuery);
        const fiscal_year_id = fiscalYearResult.rows.length > 0 ? fiscalYearResult.rows[0].id : null;

        const missionResult = await client.query(missionQuery, [
            code, nom, description, client_id, responsable_id, statut || 'PLANIFIEE', 'MISSION',
            priorite, date_debut, date_fin_prevue, budget_prevue, devise || 'XAF', notes, req.user.id,
            fiscal_year_id, opportunity_id, mission_type_id, montant_honoraires,
            description_honoraires, montant_debours, description_debours,
            conditions_paiement ? JSON.stringify(conditions_paiement) : null, pourcentage_avance, business_unit_id, associe_id,
            division_id, kyc_path, contract_path
        ]);

        const mission = missionResult.rows[0];

        // 2. Créer les tâches de mission et les affectations
        if (tasks && Array.isArray(tasks)) {
            for (const task of tasks) {
                // Créer la tâche de mission
                const missionTaskQuery = `
                    INSERT INTO mission_tasks (
                        mission_id, task_id, statut, date_debut, date_fin,
                        duree_planifiee, notes, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING *
                `;

                const missionTaskResult = await client.query(missionTaskQuery, [
                    mission.id, task.task_id, 'PLANIFIEE',
                    task.date_debut_prevue, task.date_fin_prevue, task.heures_prevues,
                    task.description || ''
                ]);

                const missionTask = missionTaskResult.rows[0];

                // Créer les affectations de collaborateurs
                if (task.assignments && Array.isArray(task.assignments)) {
                    for (const assignment of task.assignments) {
                        const assignmentQuery = `
                            INSERT INTO task_assignments (
                                mission_task_id, collaborateur_id, heures_planifiees,
                                taux_horaire, statut, created_at, updated_at
                            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        `;

                        await client.query(assignmentQuery, [
                            missionTask.id, assignment.collaborateur_id,
                            assignment.heures_prevues, assignment.taux_horaire,
                            'PLANIFIE'
                        ]);
                    }
                }
            }
        }

        await client.query('COMMIT');

        try {
            if (mission && mission.id) {
                await NotificationService.sendMissionCreatedNotification(mission.id);
            }
        } catch (notifError) {
            console.error('Erreur lors de l\'envoi de la notification de création de mission:', notifError);
        }

        res.status(201).json({
            success: true,
            data: {
                mission: mission,
                message: 'Mission créée avec succès avec toutes ses tâches et affectations'
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur lors de la création de la mission:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la création de la mission',
            details: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/missions/:id
 * Mise à jour partielle d'une mission (supporte Nom/Description uniquement)
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');

        // Détecter dynamiquement les colonnes présentes (compat schémas différents)
        const colsResult = await pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='missions'"
        );
        const columns = colsResult.rows.map(r => r.column_name);

        const hasNom = columns.includes('nom');
        const hasTitre = columns.includes('titre');
        const hasDateFin = columns.includes('date_fin');
        const hasDateFinPrevue = columns.includes('date_fin_prevue');
        const hasBudgetEstime = columns.includes('budget_estime');
        const hasBudgetPrevue = columns.includes('budget_prevue');

        const fieldMap = {
            nom: hasNom ? 'nom' : (hasTitre ? 'titre' : null),
            titre: hasTitre ? 'titre' : (hasNom ? 'nom' : null),
            description: columns.includes('description') ? 'description' : null,
            statut: columns.includes('statut') ? 'statut' : null,
            date_debut: columns.includes('date_debut') ? 'date_debut' : null,
            date_fin: hasDateFin ? 'date_fin' : (hasDateFinPrevue ? 'date_fin_prevue' : null),
            date_fin_prevue: hasDateFinPrevue ? 'date_fin_prevue' : (hasDateFin ? 'date_fin' : null),
            budget_estime: hasBudgetEstime ? 'budget_estime' : (hasBudgetPrevue ? 'budget_prevue' : null),
            budget_prevue: hasBudgetPrevue ? 'budget_prevue' : (hasBudgetEstime ? 'budget_estime' : null),
            devise: columns.includes('devise') ? 'devise' : null,
            client_id: columns.includes('client_id') ? 'client_id' : null,
            type_mission: columns.includes('type_mission') ? 'type_mission' : null,
            business_unit_id: columns.includes('business_unit_id') ? 'business_unit_id' : null,
            division_id: columns.includes('division_id') ? 'division_id' : null,
            conditions_paiement: columns.includes('conditions_paiement') ? 'conditions_paiement' : null,
            montant_honoraires: columns.includes('montant_honoraires') ? 'montant_honoraires' : null,
            montant_debours: columns.includes('montant_debours') ? 'montant_debours' : null,
            manager_id: columns.includes('manager_id') ? 'manager_id' : null,
            collaborateur_id: columns.includes('collaborateur_id') ? 'collaborateur_id' : null, // Responsable
            associe_id: columns.includes('associe_id') ? 'associe_id' : null
        };

        const setClauses = [];
        const values = [];
        let index = 1;

        Object.keys(req.body || {}).forEach((key) => {
            const column = fieldMap[key];
            if (column) {
                setClauses.push(`${column} = $${index++}`);
                // Pour conditions_paiement (si jamais il passe par ici, bien que non mappé explicitement ci-dessus), on stringify
                // Mais attendez, conditions_paiement n'est pas dans le fieldMap ci-dessus.
                // Vérifions si on doit l'ajouter ou si c'est géré ailleurs.
                // Le PUT actuel ne semble pas gérer conditions_paiement dans le fieldMap.
                // Si on l'ajoute, il faudra le stringify.
                // Pour l'instant, je ne touche pas à cette boucle car conditions_paiement n'est pas dans fieldMap.
                values.push(req.body[key]);
            }
        });

        // Logs utiles
        console.log('[PUT /api/missions/:id] body:', req.body);
        console.log('[PUT /api/missions/:id] table columns:', columns);
        console.log('[PUT /api/missions/:id] update columns:', setClauses.join(', '));
        console.log('[PUT /api/missions/:id] values:', values);

        if (setClauses.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Aucun champ valide fourni pour la mise à jour'
            });
        }

        const selectOldQuery = `
            SELECT statut FROM missions WHERE id = $1
        `;

        const oldResult = await pool.query(selectOldQuery, [req.params.id]);
        const oldStatus = oldResult.rows.length > 0 ? oldResult.rows[0].statut : null;

        const updateQuery = `
            UPDATE missions
            SET ${setClauses.join(', ')}
            WHERE id = $${index}
            RETURNING *
        `;

        values.push(req.params.id);

        const result = await pool.query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mission non trouvée'
            });
        }

        const updatedMission = result.rows[0];

        try {
            if (oldStatus && updatedMission.statut && oldStatus !== updatedMission.statut) {
                await NotificationService.sendMissionStatusChangedNotification(updatedMission.id, oldStatus, updatedMission.statut);
            }
        } catch (notifError) {
            console.error('Erreur lors de l\'envoi de la notification de changement de statut de mission:', notifError);
        }

        res.json({
            success: true,
            data: updatedMission,
            message: 'Mission mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la mission:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la mise à jour de la mission',
            details: error.message
        });
    }
});

/**
 * DELETE /api/missions/:id
 * Supprimer une mission
 */
router.delete('/:id', async (req, res) => {
    try {
        const { pool } = require('../utils/database');

        const result = await pool.query('DELETE FROM missions WHERE id = $1', [req.params.id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mission non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Mission supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de la mission:', error);
        res.status(400).json({
            success: false,
            error: 'Erreur lors de la suppression de la mission',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id/available-tasks
 * Récupérer les tâches disponibles pour une mission (basées sur le type de mission)
 */
router.get('/:id/available-tasks', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');

        // 1. Récupérer le type de mission de cette mission
        const missionQuery = `
            SELECT mission_type_id 
            FROM missions 
            WHERE id = $1
        `;

        const missionResult = await pool.query(missionQuery, [req.params.id]);

        if (missionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mission non trouvée'
            });
        }

        const missionTypeId = missionResult.rows[0].mission_type_id;

        if (!missionTypeId) {
            return res.json({
                success: true,
                data: []
            });
        }

        // 2. Récupérer les tâches disponibles pour ce type de mission
        const tasksQuery = `
            SELECT 
                t.id,
                t.code,
                t.libelle,
                t.description,
                t.duree_estimee,
                t.priorite,
                tmt.ordre,
                tmt.obligatoire
            FROM tasks t
            INNER JOIN task_mission_types tmt ON t.id = tmt.task_id
            WHERE tmt.mission_type_id = $1 AND t.actif = true
            ORDER BY tmt.ordre, t.libelle
        `;

        const tasksResult = await pool.query(tasksQuery, [missionTypeId]);

        res.json({
            success: true,
            data: tasksResult.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des tâches disponibles:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des tâches disponibles',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id/tasks
 * Récupérer les tâches configurées d'une mission avec les collaborateurs affectés
 * Filtre pour ne retourner que les tâches où l'utilisateur connecté est assigné
 */
router.get('/:id/tasks', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        const userId = req.user.id;

        console.log(`[API] Fetching tasks for mission ${req.params.id} and user ${userId}`);

        // Récupérer le collaborateur_id de l'utilisateur connecté
        const userQuery = `
            SELECT collaborateur_id 
            FROM users 
            WHERE id = $1
        `;
        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rows.length === 0 || !userResult.rows[0].collaborateur_id) {
            console.log(`[API] User ${userId} has no associated collaborateur`);
            return res.json({
                success: true,
                data: []
            });
        }

        const collaborateurId = userResult.rows[0].collaborateur_id;
        console.log(`[API] User ${userId} is collaborateur ${collaborateurId}`);

        const query = `
            SELECT 
                mt.id as mission_task_id,
                mt.task_id,
                mt.statut,
                mt.date_debut,
                mt.date_fin,
                mt.date_fin,
                -- Calculer duree_planifiee comme la somme des heures planifiées des collaborateurs
                COALESCE(
                    (SELECT SUM(ta.heures_planifiees)
                     FROM task_assignments ta
                     WHERE ta.mission_task_id = mt.id),
                    0
                ) as duree_planifiee,
                -- Heures saisies (submitted + saved - en attente de validation ou brouillon)
                COALESCE(
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND (ts.statut IN ('soumis', 'submitted') OR ts.statut IN ('sauvegardé', 'saved'))),
                    0
                ) as heures_saisies,
                -- Heures validées (approved - réellement validées)
                COALESCE(
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND ts.statut IN ('validé', 'approved')),
                    0
                ) as heures_validees,
                -- Duree reelle = priorité aux validées, sinon saisies/brouillons
                COALESCE(
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND ts.statut IN ('validé', 'approved')),
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND (ts.statut IN ('soumis', 'submitted') OR ts.statut IN ('sauvegardé', 'saved'))),
                    0
                ) as duree_reelle,
                mt.notes,
                t.id,
                t.code,
                t.libelle as task_libelle,
                t.description as task_description,
                t.duree_estimee,
                t.priorite,
                -- Informations sur les collaborateurs affectés
                COALESCE(
                    (SELECT json_agg(
                        json_build_object(
                            'id', c.id,
                            'nom', c.nom,
                            'prenom', c.prenom,
                            'email', c.email,
                            'grade_nom', g.nom,
                            'heures_planifiees', ta.heures_planifiees,
                            'heures_saisies', COALESCE(
                                (SELECT SUM(te.heures)
                                 FROM time_entries te
                                 JOIN time_sheets ts ON te.time_sheet_id = ts.id
                                 WHERE te.task_id = mt.task_id
                                 AND te.mission_id = mt.mission_id
                                 AND ts.user_id = (SELECT user_id FROM collaborateurs WHERE id = ta.collaborateur_id)
                                 AND ts.statut IN ('soumis', 'submitted')),
                                0
                            ),
                            'heures_validees', COALESCE(
                                (SELECT SUM(te.heures)
                                 FROM time_entries te
                                 JOIN time_sheets ts ON te.time_sheet_id = ts.id
                                 WHERE te.task_id = mt.task_id
                                 AND te.mission_id = mt.mission_id
                                 AND ts.user_id = (SELECT user_id FROM collaborateurs WHERE id = ta.collaborateur_id)
                                 AND ts.statut IN ('validé', 'approved')),
                                0
                            ),
                            'heures_effectuees', COALESCE(
                                (SELECT SUM(te.heures)
                                 FROM time_entries te
                                 JOIN time_sheets ts ON te.time_sheet_id = ts.id
                                 WHERE te.task_id = mt.task_id
                                 AND te.mission_id = mt.mission_id
                                 AND ts.user_id = (SELECT user_id FROM collaborateurs WHERE id = ta.collaborateur_id)
                                 AND ts.statut IN ('validé', 'approved')),
                                (SELECT SUM(te.heures)
                                 FROM time_entries te
                                 JOIN time_sheets ts ON te.time_sheet_id = ts.id
                                 WHERE te.task_id = mt.task_id
                                 AND te.mission_id = mt.mission_id
                                 AND ts.user_id = (SELECT user_id FROM collaborateurs WHERE id = ta.collaborateur_id)
                                 AND ts.statut IN ('soumis', 'submitted')),
                                0
                            ),
                            'taux_horaire', ta.taux_horaire,
                            'statut', ta.statut
                        )
                    )
                    FROM task_assignments ta
                    JOIN collaborateurs c ON ta.collaborateur_id = c.id
                    LEFT JOIN grades g ON c.grade_actuel_id = g.id
                    WHERE ta.mission_task_id = mt.id), 
                    '[]'::json
                ) as collaborateurs_affectes
            FROM mission_tasks mt
            LEFT JOIN tasks t ON mt.task_id = t.id
            WHERE mt.mission_id = $1
            -- Filtrer pour ne retourner que les tâches où le collaborateur connecté est assigné
            AND EXISTS (
                SELECT 1 
                FROM task_assignments ta 
                WHERE ta.mission_task_id = mt.id 
                AND ta.collaborateur_id = $2
            )
            ORDER BY mt.date_debut, t.libelle
        `;

        const result = await pool.query(query, [req.params.id, collaborateurId]);

        console.log(`[API] Found ${result.rows.length} tasks for collaborateur ${collaborateurId} on mission ${req.params.id}`);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des tâches:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des tâches',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id/assignments
 * Récupérer les affectations de collaborateurs d'une mission
 */
router.get('/:id/assignments', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');

        const query = `
            SELECT 
                ta.id,
                ta.heures_planifiees,
                ta.heures_effectuees,
                ta.taux_horaire,
                ta.statut as assignment_statut,
                c.nom as collaborateur_nom,
                c.prenom as collaborateur_prenom,
                c.email as collaborateur_email,
                t.libelle as task_libelle,
                mt.statut as task_statut
            FROM task_assignments ta
            LEFT JOIN mission_tasks mt ON ta.mission_task_id = mt.id
            LEFT JOIN tasks t ON mt.task_id = t.id
            LEFT JOIN collaborateurs c ON ta.collaborateur_id = c.id
            WHERE mt.mission_id = $1
            ORDER BY c.nom, t.libelle
        `;

        const result = await pool.query(query, [req.params.id]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des affectations:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des affectations',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id/team
 * Récupérer l'équipe complète d'une mission
 */
router.get('/:id/team', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');

        const query = `
            SELECT DISTINCT
                c.id,
                c.nom,
                c.prenom,
                c.email,
                c.telephone,
                g.nom as grade_nom,
                COUNT(ta.id) as nb_assignments,
                SUM(ta.heures_planifiees) as total_heures_planifiees,
                SUM(ta.heures_effectuees) as total_heures_effectuees
            FROM collaborateurs c
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN task_assignments ta ON c.id = ta.collaborateur_id
            LEFT JOIN mission_tasks mt ON ta.mission_task_id = mt.id
            WHERE mt.mission_id = $1
            GROUP BY c.id, c.nom, c.prenom, c.email, c.telephone, g.nom
            ORDER BY c.nom, c.prenom
        `;

        const result = await pool.query(query, [req.params.id]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'équipe:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'équipe',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id/planning
 * Récupérer le planning complet d'une mission (tâches + affectations)
 */
router.get('/:id/planning', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');

        // 1. Récupérer les tâches de la mission
        const tasksQuery = `
            SELECT 
                mt.id as mission_task_id,
                mt.task_id,
                t.code,
                t.libelle,
                t.description,
                mt.statut,
                mt.duree_planifiee,
                mt.date_debut,
                mt.date_fin,
                mt.notes
            FROM mission_tasks mt
            LEFT JOIN tasks t ON mt.task_id = t.id
            WHERE mt.mission_id = $1
            ORDER BY mt.created_at
        `;

        const tasksResult = await pool.query(tasksQuery, [req.params.id]);

        // 2. Pour chaque tâche, récupérer les affectations avec heures saisies
        const tasksWithAssignments = [];

        for (const task of tasksResult.rows) {
            const assignmentsQuery = `
                SELECT 
                    ta.id,
                    ta.collaborateur_id,
                    c.nom,
                    c.prenom,
                    g.nom as grade_nom,
                    g.taux_horaire_default,
                    ta.heures_planifiees,
                    ta.taux_horaire,
                    ta.statut,
                    COALESCE(SUM(te.heures), 0) as heures_saisies
                FROM task_assignments ta
                LEFT JOIN collaborateurs c ON ta.collaborateur_id = c.id
                LEFT JOIN grades g ON c.grade_actuel_id = g.id
                LEFT JOIN time_entries te ON te.mission_id = $2 
                    AND te.task_id = $3 
                    AND te.user_id = c.user_id
                    AND te.type_heures = 'HC'
                WHERE ta.mission_task_id = $1
                GROUP BY ta.id, ta.collaborateur_id, c.nom, c.prenom, g.nom, 
                         g.taux_horaire_default, ta.heures_planifiees, ta.taux_horaire, ta.statut
                ORDER BY c.nom, c.prenom
            `;

            const assignmentsResult = await pool.query(assignmentsQuery, [
                task.mission_task_id,
                req.params.id,
                task.task_id
            ]);

            tasksWithAssignments.push({
                ...task,
                assignments: assignmentsResult.rows
            });
        }

        // 3. Calculer les totaux
        const summaryQuery = `
            SELECT 
                SUM(ta.heures_planifiees) as total_heures_planifiees,
                COALESCE(SUM(te.heures), 0) as total_heures_saisies,
                COUNT(DISTINCT ta.collaborateur_id) as nombre_collaborateurs,
                COUNT(DISTINCT mt.id) as nombre_taches
            FROM task_assignments ta
            LEFT JOIN mission_tasks mt ON ta.mission_task_id = mt.id
            LEFT JOIN collaborateurs c ON ta.collaborateur_id = c.id
            LEFT JOIN time_entries te ON te.mission_id = $1 
                AND te.task_id = mt.task_id 
                AND te.user_id = c.user_id
                AND te.type_heures = 'HC'
            WHERE mt.mission_id = $1
        `;

        const summaryResult = await pool.query(summaryQuery, [req.params.id]);

        res.json({
            success: true,
            tasks: tasksWithAssignments,
            summary: summaryResult.rows[0]
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du planning:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du planning',
            details: error.message
        });
    }
});






/**
 * PUT /api/missions/:id/planning
 * Mettre à jour le planning d'une mission
 */
router.put('/:id/planning', authenticateToken, async (req, res) => {
    const { pool } = require('../utils/database');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { tasks } = req.body;
        const missionId = req.params.id;

        // 1. Supprimer toutes les affectations existantes
        const deleteAssignmentsQuery = `
            DELETE FROM task_assignments 
            WHERE mission_task_id IN (
                SELECT id FROM mission_tasks WHERE mission_id = $1
            )
        `;
        await client.query(deleteAssignmentsQuery, [missionId]);

        // 2. Supprimer toutes les tâches de mission existantes
        const deleteTasksQuery = `
            DELETE FROM mission_tasks WHERE mission_id = $1
        `;
        await client.query(deleteTasksQuery, [missionId]);

        // 3. Collecter tous les collaborateurs uniques qui seront planifiés
        const collaborateursSet = new Set();

        // 4. Créer les nouvelles tâches et affectations
        if (tasks && Array.isArray(tasks)) {
            for (const task of tasks) {
                // Créer la tâche de mission
                const missionTaskQuery = `
                    INSERT INTO mission_tasks (
                        mission_id, task_id, statut, date_debut, date_fin,
                        duree_planifiee, notes, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING *
                `;

                const missionTaskResult = await client.query(missionTaskQuery, [
                    missionId, task.task_id, task.statut || 'PLANIFIEE',
                    task.date_debut, task.date_fin, task.duree_planifiee || 0,
                    task.notes || ''
                ]);

                const missionTask = missionTaskResult.rows[0];

                // Créer les affectations de collaborateurs
                if (task.assignments && Array.isArray(task.assignments)) {
                    for (const assignment of task.assignments) {
                        if (assignment.collaborateur_id) {
                            // Ajouter le collaborateur au Set
                            collaborateursSet.add(assignment.collaborateur_id);

                            const assignmentQuery = `
                                INSERT INTO task_assignments (
                                    mission_task_id, collaborateur_id, heures_planifiees,
                                    taux_horaire, statut, created_at, updated_at
                                ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                            `;

                            await client.query(assignmentQuery, [
                                missionTask.id, assignment.collaborateur_id,
                                assignment.heures_planifiees || 0, assignment.taux_horaire || 0,
                                assignment.statut || 'PLANIFIE'
                            ]);
                        }
                    }
                }
            }
        }

        // 5. Ajouter automatiquement les collaborateurs à equipes_mission
        // Récupérer les membres actuels de l'équipe
        const currentMembersQuery = `
            SELECT collaborateur_id FROM equipes_mission WHERE mission_id = $1
        `;
        const currentMembersResult = await client.query(currentMembersQuery, [missionId]);
        const currentMemberIds = new Set(currentMembersResult.rows.map(r => r.collaborateur_id));

        // Ajouter les nouveaux collaborateurs qui ne sont pas déjà dans l'équipe
        for (const collaborateurId of collaborateursSet) {
            if (!currentMemberIds.has(collaborateurId)) {
                const addMemberQuery = `
                    INSERT INTO equipes_mission (
                        mission_id, collaborateur_id, role, date_creation
                    ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                    ON CONFLICT (mission_id, collaborateur_id) DO NOTHING
                `;
                await client.query(addMemberQuery, [missionId, collaborateurId, 'Membre']);
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Planning mis à jour avec succès',
            collaborateurs_ajoutes: collaborateursSet.size - currentMemberIds.size
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur lors de la mise à jour du planning:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du planning',
            details: error.message
        });
    } finally {
        client.release();
    }
});

/**
 * GET /api/missions/:id/collaborateurs-taux
 * Récupérer les taux horaires des collaborateurs assignés à une mission
 */
router.get('/:id/collaborateurs-taux', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');

        const query = `
            SELECT 
                c.nom,
                c.prenom,
                g.taux_horaire_default
            FROM missions m
            LEFT JOIN collaborateurs c ON m.collaborateur_id = c.id OR m.associe_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            WHERE m.id = $1 AND c.id IS NOT NULL AND g.taux_horaire_default IS NOT NULL
        `;

        const result = await pool.query(query, [req.params.id]);

        const tauxHoraires = result.rows.map(row => parseFloat(row.taux_horaire_default || 0)).filter(t => t > 0);

        res.json({
            success: true,
            collaborateurs: result.rows,
            taux_horaires: tauxHoraires,
            moyenne: tauxHoraires.length > 0 ? tauxHoraires.reduce((a, b) => a + b, 0) / tauxHoraires.length : 0
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des taux horaires:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des taux horaires',
            details: error.message
        });
    }
});

/**
 * GET /api/missions/:id/progress
 * Récupérer la progression d'une mission avec les heures validées
 */
router.get('/:id/progress', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');

        // Statistiques des tâches avec heures validées
        const tasksStatsQuery = `
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(CASE 
                    WHEN mt.statut = 'TERMINEE' THEN 1 
                    END) as completed_tasks,
                COUNT(CASE 
                    WHEN COALESCE(
                        (SELECT SUM(te.heures)
                         FROM time_entries te
                         JOIN time_sheets ts ON te.time_sheet_id = ts.id
                         WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                         AND te.mission_id = mt.mission_id
                         AND ts.statut IN ('valid�', 'approved')),
                        0
                    ) > 0 THEN 1
                    WHEN mt.statut = 'EN_COURS' THEN 1 
                    END) as in_progress_tasks,
                COUNT(CASE 
                    WHEN COALESCE(
                        (SELECT SUM(te.heures)
                         FROM time_entries te
                         JOIN time_sheets ts ON te.time_sheet_id = ts.id
                         WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                         AND te.mission_id = mt.mission_id
                         AND ts.statut IN ('valid�', 'approved')),
                        0
                    ) = 0 
                    AND mt.statut = 'PLANIFIEE' THEN 1 
                    END) as planned_tasks,
                SUM(COALESCE(
                    (SELECT SUM(ta.heures_planifiees)
                     FROM task_assignments ta
                     WHERE ta.mission_task_id = mt.id),
                    0
                )) as total_planned_hours,
                -- Calculate duree_reelle instead of referencing it
                SUM(COALESCE(
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND ts.statut IN ('valid�', 'approved')),
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND (ts.statut IN ('soumis', 'submitted') OR ts.statut IN ('sauvegard�', 'saved'))),
                    0
                )) as total_actual_hours,
                COALESCE(SUM(
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND ts.statut IN ('valid�', 'approved'))
                ), 0) as total_validated_hours
            FROM mission_tasks mt
            WHERE mt.mission_id = $1
        `;

        const tasksStatsResult = await pool.query(tasksStatsQuery, [req.params.id]);
        const tasksStats = tasksStatsResult.rows[0];

        // Progression par tâche avec heures validées
        const tasksProgressQuery = `
            SELECT 
                mt.id,
                mt.statut,
                -- Calculer duree_planifiee comme la somme des heures planifiées des collaborateurs
                COALESCE(
                    (SELECT SUM(ta.heures_planifiees)
                     FROM task_assignments ta
                     WHERE ta.mission_task_id = mt.id),
                    0
                ) as duree_planifiee,
                -- Calculate duree_reelle instead of referencing it
                COALESCE(
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND ts.statut IN ('valid�', 'approved')),
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND (ts.statut IN ('soumis', 'submitted') OR ts.statut IN ('sauvegard�', 'saved'))),
                    0
                ) as duree_reelle,
                t.libelle as task_libelle,
                -- Heures validées (approved)
                COALESCE(
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND ts.statut IN ('valid�', 'approved')),
                    0
                ) as heures_validees,
                -- Heures saisies (submitted + saved)
                COALESCE(
                    (SELECT SUM(te.heures)
                     FROM time_entries te
                     JOIN time_sheets ts ON te.time_sheet_id = ts.id
                     WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                     AND te.mission_id = mt.mission_id
                     AND (ts.statut IN ('soumis', 'submitted') OR ts.statut IN ('sauvegard�', 'saved'))),
                    0
                ) as heures_saisies,
                ROUND(
                    CASE 
                        WHEN COALESCE(
                            (SELECT SUM(ta.heures_planifiees)
                             FROM task_assignments ta
                             WHERE ta.mission_task_id = mt.id),
                            0
                        ) > 0 
                        THEN (COALESCE(
                            (SELECT SUM(te.heures)
                             FROM time_entries te
                             JOIN time_sheets ts ON te.time_sheet_id = ts.id
                             WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                             AND te.mission_id = mt.mission_id
                             AND ts.statut IN ('valid�', 'approved')),
                            0
                        ) / COALESCE(
                            (SELECT SUM(ta.heures_planifiees)
                             FROM task_assignments ta
                             WHERE ta.mission_task_id = mt.id),
                            1
                        )) * 100
                        ELSE 0 
                    END, 2
                ) as progress_percentage,
                CASE 
                    WHEN COALESCE(
                        (SELECT SUM(te.heures)
                         FROM time_entries te
                         JOIN time_sheets ts ON te.time_sheet_id = ts.id
                         WHERE (te.task_id = mt.task_id OR te.task_id = mt.id)
                         AND te.mission_id = mt.mission_id
                         AND ts.statut IN ('valid�', 'approved')),
                        0
                    ) > 0 THEN 'EN_COURS'
                    WHEN mt.statut = 'PLANIFIEE' THEN 'PLANIFIEE'
                    WHEN mt.statut = 'TERMINEE' THEN 'TERMINEE'
                    ELSE mt.statut
                END as effective_status
            FROM mission_tasks mt
            LEFT JOIN tasks t ON mt.task_id = t.id
            WHERE mt.mission_id = $1
            ORDER BY mt.date_debut
        `;

        const tasksProgressResult = await pool.query(tasksProgressQuery, [req.params.id]);

        // Mettre à jour le statut de la mission si des heures sont validées
        const hasValidatedHours = tasksStats.total_validated_hours > 0;
        if (hasValidatedHours) {
            const updateMissionStatusQuery = `
                UPDATE missions 
                SET statut = CASE 
                    WHEN statut = 'PLANIFIEE' THEN 'EN_COURS'
                    ELSE statut
                END
                WHERE id = $1 AND statut = 'PLANIFIEE'
            `;
            await pool.query(updateMissionStatusQuery, [req.params.id]);
        }

        res.json({
            success: true,
            data: {
                stats: tasksStats,
                tasks: tasksProgressResult.rows,
                has_validated_hours: hasValidatedHours
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la progression:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la progression',
            details: error.message
        });
    }
});

// API POUR LE DASHBOARD PERSONNEL

// GET /api/missions/active/:userId - Missions actives de l'utilisateur
router.get('/active/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Vérifier que l'utilisateur demande ses propres missions
        if (userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const pool = require('../utils/database');

        // Récupérer les missions actives de l'utilisateur
        const missionsQuery = `
            SELECT DISTINCT
                m.id,
                m.nom as titre,
                m.statut,
                m.date_fin as date_fin_prevue,
                m.priorite,
                c.nom as client_nom,
                COALESCE(SUM(te.heures), 0) as heures_totales,
                ROUND(
                    CASE 
                        WHEN m.montant_honoraires > 0 
                        THEN (COALESCE(SUM(te.heures), 0) / m.montant_honoraires) * 100
                        ELSE 0 
                    END, 2
                ) as progression
            FROM missions m
            LEFT JOIN time_entries te ON m.id = te.mission_id AND te.user_id = $1
            LEFT JOIN clients c ON m.client_id = c.id
            WHERE m.statut IN ('EN_COURS', 'PLANIFIEE')
            AND EXISTS (
                SELECT 1 FROM time_entries te2 
                WHERE te2.mission_id = m.id 
                AND te2.user_id = $1
            )
            GROUP BY m.id, m.nom, m.statut, m.date_fin, m.priorite, c.nom, m.montant_honoraires
            ORDER BY m.date_fin ASC
            LIMIT 10
        `;

        const missionsResult = await pool.query(missionsQuery, [userId]);

        // Si pas de missions réelles, retourner des missions simulées
        let missions = missionsResult.rows;
        if (missions.length === 0) {
            missions = [
                {
                    id: '1',
                    titre: 'Développement Frontend',
                    statut: 'EN_COURS',
                    date_fin_prevue: '2025-08-15',
                    priorite: 'HAUTE',
                    client_nom: 'TechCorp',
                    heures_totales: 45.5,
                    progression: 75.0
                },
                {
                    id: '2',
                    titre: 'Maintenance Backend',
                    statut: 'EN_COURS',
                    date_fin_prevue: '2025-08-20',
                    priorite: 'NORMALE',
                    client_nom: 'DataSoft',
                    heures_totales: 32.0,
                    progression: 60.0
                },
                {
                    id: '3',
                    titre: 'Optimisation Base de Données',
                    statut: 'PLANIFIEE',
                    date_fin_prevue: '2025-08-25',
                    priorite: 'URGENTE',
                    client_nom: 'CloudTech',
                    heures_totales: 0,
                    progression: 0
                }
            ];
        }

        res.json({
            success: true,
            data: missions
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des missions actives:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des missions actives',
            error: error.message
        });
    }
});


// GET /api/missions/planned - Missions planifiées pour l'utilisateur connecté
router.get('/planned', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`[API] Fetching planned missions for user: ${userId}`);

        const query = `
            SELECT DISTINCT 
                m.id, 
                m.nom, 
                m.code, 
                c.nom as client_nom
            FROM missions m
            JOIN mission_tasks mt ON m.id = mt.mission_id
            JOIN task_assignments ta ON mt.id = ta.mission_task_id
            JOIN collaborateurs col ON ta.collaborateur_id = col.id
            LEFT JOIN clients c ON m.client_id = c.id
            WHERE col.user_id = $1
            AND m.statut IN ('EN_COURS', 'PLANIFIEE')
            ORDER BY m.nom
        `;

        const result = await pool.query(query, [userId]);
        console.log(`[API] Found ${result.rows.length} planned missions`);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des missions planifiées:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des missions planifiées',
            error: error.message
        });
    }
});

// GET /api/missions/:missionId/planned-tasks - Tâches planifiées pour une mission spécifique
router.get('/:missionId/planned-tasks', authenticateToken, async (req, res) => {
    try {
        const { pool } = require('../utils/database');
        const userId = req.user.id;
        const { missionId } = req.params;

        const query = `
            SELECT 
                t.id, 
                t.nom, 
                t.code,
                mt.id as mission_task_id
            FROM tasks t
            JOIN mission_tasks mt ON t.id = mt.task_id
            JOIN task_assignments ta ON mt.id = ta.mission_task_id
            JOIN collaborateurs col ON ta.collaborateur_id = col.id
            WHERE mt.mission_id = $1
            AND col.user_id = $2
            ORDER BY t.nom
        `;

        const result = await pool.query(query, [missionId, userId]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des tâches planifiées:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des tâches planifiées',
            error: error.message
        });
    }
});

module.exports = router;


