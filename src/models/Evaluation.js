const { query } = require('../utils/database');

class Evaluation {
    // === MODÈLES D'ÉVALUATION ===

    static async getAllTemplates() {
        const sql = `
            SELECT id, name, description, scoring_method, is_active
            FROM evaluation_templates
            WHERE is_active = TRUE
            ORDER BY name
        `;
        const result = await query(sql);
        return result.rows;
    }

    // === CAMPAGNES D'ÉVALUATION ===

    static async createCampaign(data) {
        const { fiscal_year_id, template_id, name, description, start_date, end_date, target_type, target_id, created_by } = data;
        const sql = `
            INSERT INTO evaluation_campaigns (fiscal_year_id, template_id, name, description, start_date, end_date, target_type, target_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const result = await query(sql, [fiscal_year_id, template_id, name, description, start_date, end_date, target_type, target_id, created_by]);
        return result.rows[0];
    }

    static async getCampaigns(fiscalYearId) {
        const sql = `
            SELECT 
                ec.*,
                et.name as template_name,
                et.scoring_method,
                (SELECT COUNT(*) FROM evaluations e WHERE e.campaign_id = ec.id) as total_evaluations,
                (SELECT COUNT(*) FROM evaluations e WHERE e.campaign_id = ec.id AND e.status = 'VALIDATED') as completed_evaluations
            FROM evaluation_campaigns ec
            JOIN evaluation_templates et ON ec.template_id = et.id
            WHERE ec.fiscal_year_id = $1
            ORDER BY ec.start_date DESC
        `;
        const result = await query(sql, [fiscalYearId]);
        return result.rows;
    }

    static async getCampaignById(id) {
        const sql = `
            SELECT ec.*, et.name as template_name, et.scoring_method
            FROM evaluation_campaigns ec
            JOIN evaluation_templates et ON ec.template_id = et.id
            WHERE ec.id = $1
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // === ÉVALUATIONS INDIVIDUELLES ===

    static async createEvaluation(data) {
        const { campaign_id, collaborator_id, evaluator_id } = data;

        // Vérifier si une évaluation existe déjà
        const checkSql = `SELECT id FROM evaluations WHERE campaign_id = $1 AND collaborator_id = $2`;
        const checkResult = await query(checkSql, [campaign_id, collaborator_id]);

        if (checkResult.rows.length > 0) {
            return checkResult.rows[0];
        }

        const sql = `
            INSERT INTO evaluations (campaign_id, collaborator_id, evaluator_id, status)
            VALUES ($1, $2, $3, 'DRAFT')
            RETURNING *
        `;
        const result = await query(sql, [campaign_id, collaborator_id, evaluator_id]);

        // Initialiser les scores pour chaque objectif individuel du collaborateur
        await this.initEvaluationScores(result.rows[0].id, collaborator_id);

        return result.rows[0];
    }

    static async initEvaluationScores(evaluationId, collaboratorId) {
        // Récupérer les objectifs individuels du collaborateur pour l'année fiscale de la campagne
        const sqlObjectives = `
            SELECT io.id, io.target_value
            FROM individual_objectives io
            JOIN division_objectives do ON io.division_objective_id = do.id
            JOIN business_unit_objectives buo ON do.business_unit_objective_id = buo.id
            JOIN global_objectives go ON buo.global_objective_id = go.id
            JOIN evaluations e ON e.id = $1
            JOIN evaluation_campaigns ec ON e.campaign_id = ec.id
            WHERE io.collaborator_id = $2 AND go.fiscal_year_id = ec.fiscal_year_id
        `;
        const objectives = await query(sqlObjectives, [evaluationId, collaboratorId]);

        // Créer une entrée de score pour chaque objectif
        for (const obj of objectives.rows) {
            const sqlScore = `
                INSERT INTO evaluation_objective_scores (evaluation_id, individual_objective_id, target_value, achieved_value)
                VALUES ($1, $2, $3, 0)
            `;
            await query(sqlScore, [evaluationId, obj.id, obj.target_value]);
        }
    }

    static async getEvaluation(id) {
        const sql = `
            SELECT 
                e.*,
                c.prenom, c.nom, c.email,
                g.titre as grade,
                ec.name as campaign_name,
                et.scoring_method
            FROM evaluations e
            JOIN collaborateurs c ON e.collaborator_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            JOIN evaluation_campaigns ec ON e.campaign_id = ec.id
            JOIN evaluation_templates et ON ec.template_id = et.id
            WHERE e.id = $1
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    static async getEvaluationScores(evaluationId) {
        const sql = `
            SELECT 
                eos.*,
                ot.label as objective_label,
                ot.unit,
                io.description as objective_description,
                io.weight
            FROM evaluation_objective_scores eos
            JOIN individual_objectives io ON eos.individual_objective_id = io.id
            JOIN division_objectives do ON io.division_objective_id = do.id
            JOIN business_unit_objectives buo ON do.business_unit_objective_id = buo.id
            JOIN global_objectives go ON buo.global_objective_id = go.id
            JOIN objective_types ot ON go.objective_type_id = ot.id
            WHERE eos.evaluation_id = $1
        `;
        const result = await query(sql, [evaluationId]);
        return result.rows;
    }

    static async updateScore(id, achievedValue, comment) {
        const sql = `
            UPDATE evaluation_objective_scores
            SET achieved_value = $1, comment = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;
        const result = await query(sql, [achievedValue, comment, id]);
        return result.rows[0];
    }

    static async updateEvaluationStatus(id, status, feedback = {}) {
        const { strengths, improvement_areas, general_comment, next_period_objectives } = feedback;

        let sql = `UPDATE evaluations SET status = $1, updated_at = CURRENT_TIMESTAMP`;
        const params = [status];
        let paramIndex = 2;

        if (strengths !== undefined) {
            sql += `, strengths = $${paramIndex++}`;
            params.push(strengths);
        }
        if (improvement_areas !== undefined) {
            sql += `, improvement_areas = $${paramIndex++}`;
            params.push(improvement_areas);
        }
        if (general_comment !== undefined) {
            sql += `, general_comment = $${paramIndex++}`;
            params.push(general_comment);
        }
        if (next_period_objectives !== undefined) {
            sql += `, next_period_objectives = $${paramIndex++}`;
            params.push(next_period_objectives);
        }

        sql += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(id);

        const result = await query(sql, params);
        return result.rows[0];
    }

    static async getEvaluationsByCollaborator(collaboratorId) {
        const sql = `
            SELECT 
                e.*,
                ec.name as campaign_name,
                ec.start_date,
                ec.end_date
            FROM evaluations e
            JOIN evaluation_campaigns ec ON e.campaign_id = ec.id
            WHERE e.collaborator_id = $1
            ORDER BY ec.start_date DESC
        `;
        const result = await query(sql, [collaboratorId]);
        return result.rows;
    }

    static async getEvaluationsByEvaluator(evaluatorId) {
        const sql = `
            SELECT 
                e.*,
                c.prenom, c.nom,
                g.titre as grade,
                ec.name as campaign_name,
                ec.end_date,
                (
                    SELECT COUNT(*) 
                    FROM evaluation_objective_scores eos 
                    WHERE eos.evaluation_id = e.id AND eos.achieved_value > 0
                ) as objectives_scored,
                (
                    SELECT COUNT(*) 
                    FROM evaluation_objective_scores eos 
                    WHERE eos.evaluation_id = e.id
                ) as total_objectives
            FROM evaluations e
            JOIN collaborateurs c ON e.collaborator_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            JOIN evaluation_campaigns ec ON e.campaign_id = ec.id
            WHERE e.evaluator_id = $1
            ORDER BY ec.end_date ASC, e.status ASC
        `;
        const result = await query(sql, [evaluatorId]);
        return result.rows.map(row => ({
            ...row,
            progress: row.total_objectives > 0 ? Math.round((row.objectives_scored / row.total_objectives) * 100) : 0
        }));
    }

    // === MÉTHODES AVANCÉES ===

    /**
     * Générer un rapport complet d'évaluation
     */
    static async getEvaluationReport(evaluationId) {
        const sql = `
            SELECT 
                e.*,
                c.prenom, c.nom, c.email,
                g.titre as grade,
                p.nom as poste,
                bu.nom as business_unit,
                d.nom as division,
                ec.name as campaign_name,
                ec.start_date as campaign_start,
                ec.end_date as campaign_end,
                et.name as template_name,
                et.scoring_method,
                evaluator.prenom as evaluator_prenom,
                evaluator.nom as evaluator_nom,
                (
                    SELECT json_agg(
                        json_build_object(
                            'objective_label', ot.label,
                            'objective_description', io.description,
                            'target_value', eos.target_value,
                            'achieved_value', eos.achieved_value,
                            'achievement_rate', CASE WHEN eos.target_value > 0 THEN (eos.achieved_value / eos.target_value) * 100 ELSE 0 END,
                            'comment', eos.comment,
                            'weight', io.weight,
                            'unit', ot.unit
                        )
                    )
                    FROM evaluation_objective_scores eos
                    JOIN individual_objectives io ON eos.individual_objective_id = io.id
                    JOIN division_objectives do ON io.division_objective_id = do.id
                    JOIN business_unit_objectives buo ON do.business_unit_objective_id = buo.id
                    JOIN global_objectives go ON buo.global_objective_id = go.id
                    JOIN objective_types ot ON go.objective_type_id = ot.id
                    WHERE eos.evaluation_id = e.id
                ) as objectives_detail
            FROM evaluations e
            JOIN collaborateurs c ON e.collaborator_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN postes p ON c.poste_id = p.id
            LEFT JOIN business_units bu ON c.business_unit_id = bu.id
            LEFT JOIN divisions d ON c.division_id = d.id
            JOIN evaluation_campaigns ec ON e.campaign_id = ec.id
            JOIN evaluation_templates et ON ec.template_id = et.id
            LEFT JOIN collaborateurs evaluator_collab ON e.evaluator_id = evaluator_collab.id
            LEFT JOIN users evaluator ON evaluator_collab.user_id = evaluator.id
            WHERE e.id = $1
        `;
        const result = await query(sql, [evaluationId]);
        return result.rows[0];
    }

    /**
     * Comparer les objectifs fixés vs atteints pour un collaborateur
     */
    static async compareObjectivesVsAchieved(collaboratorId, fiscalYearId) {
        const sql = `
            SELECT 
                ot.label as objective_type,
                ot.unit,
                SUM(io.target_value) as total_target,
                SUM(COALESCE(eos.achieved_value, 0)) as total_achieved,
                CASE 
                    WHEN SUM(io.target_value) > 0 
                    THEN (SUM(COALESCE(eos.achieved_value, 0)) / SUM(io.target_value)) * 100 
                    ELSE 0 
                END as achievement_rate,
                COUNT(io.id) as objective_count
            FROM individual_objectives io
            JOIN division_objectives do ON io.division_objective_id = do.id
            JOIN business_unit_objectives buo ON do.business_unit_objective_id = buo.id
            JOIN global_objectives go ON buo.global_objective_id = go.id
            JOIN objective_types ot ON go.objective_type_id = ot.id
            LEFT JOIN evaluation_objective_scores eos ON eos.individual_objective_id = io.id
            LEFT JOIN evaluations e ON eos.evaluation_id = e.id
            WHERE io.collaborator_id = $1 AND go.fiscal_year_id = $2
            GROUP BY ot.label, ot.unit
            ORDER BY ot.label
        `;
        const result = await query(sql, [collaboratorId, fiscalYearId]);
        return result.rows;
    }

    /**
     * Récupérer les évaluations par division
     */
    static async getEvaluationsByDivision(divisionId, fiscalYearId) {
        const sql = `
            SELECT 
                e.*,
                c.prenom, c.nom,
                g.titre as grade,
                ec.name as campaign_name,
                ec.end_date,
                (
                    SELECT AVG(
                        CASE WHEN eos.target_value > 0 
                        THEN (eos.achieved_value / eos.target_value) * 100 
                        ELSE 0 END
                    )
                    FROM evaluation_objective_scores eos
                    WHERE eos.evaluation_id = e.id
                ) as avg_achievement_rate
            FROM evaluations e
            JOIN collaborateurs c ON e.collaborator_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            JOIN evaluation_campaigns ec ON e.campaign_id = ec.id
            WHERE c.division_id = $1 AND ec.fiscal_year_id = $2
            ORDER BY ec.end_date DESC, c.nom ASC
        `;
        const result = await query(sql, [divisionId, fiscalYearId]);
        return result.rows;
    }

    /**
     * Récupérer les évaluations par Business Unit
     */
    static async getEvaluationsByBusinessUnit(businessUnitId, fiscalYearId) {
        const sql = `
            SELECT 
                e.*,
                c.prenom, c.nom,
                g.titre as grade,
                d.nom as division,
                ec.name as campaign_name,
                ec.end_date,
                (
                    SELECT AVG(
                        CASE WHEN eos.target_value > 0 
                        THEN (eos.achieved_value / eos.target_value) * 100 
                        ELSE 0 END
                    )
                    FROM evaluation_objective_scores eos
                    WHERE eos.evaluation_id = e.id
                ) as avg_achievement_rate
            FROM evaluations e
            JOIN collaborateurs c ON e.collaborator_id = c.id
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN divisions d ON c.division_id = d.id
            JOIN evaluation_campaigns ec ON e.campaign_id = ec.id
            WHERE c.business_unit_id = $1 AND ec.fiscal_year_id = $2
            ORDER BY ec.end_date DESC, d.nom ASC, c.nom ASC
        `;
        const result = await query(sql, [businessUnitId, fiscalYearId]);
        return result.rows;
    }
}

module.exports = Evaluation;
