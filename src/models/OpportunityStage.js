const { pool } = require('../utils/database');

class OpportunityStage {
    constructor(data) {
        this.id = data.id;
        this.opportunity_id = data.opportunity_id;
        this.stage_template_id = data.stage_template_id;
        this.stage_name = data.stage_name;
        this.stage_order = data.stage_order;
        this.status = data.status;
        this.start_date = data.start_date;
        this.completed_date = data.completed_date;
        this.due_date = data.due_date;
        this.notes = data.notes;
        this.risk_level = data.risk_level;
        this.priority_level = data.priority_level;
        this.documents = data.documents || [];
        this.actions = data.actions || [];
        this.validated_by = data.validated_by;
        this.validated_at = data.validated_at;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Récupérer toutes les étapes
    static async findAll() {
        try {
            const query = `
                SELECT os.*, 
                       ost.description as template_description,
                       ost.required_documents,
                       ost.required_actions,
                       ost.max_duration_days,
                       ost.validation_required
                FROM opportunity_stages os
                LEFT JOIN opportunity_stage_templates ost ON os.stage_template_id = ost.id
                ORDER BY os.opportunity_id, os.stage_order ASC
            `;
            const result = await pool.query(query);
            return result.rows.map(row => new OpportunityStage(row));
        } catch (error) {
            console.error('Erreur lors de la récupération des étapes:', error);
            throw error;
        }
    }

    // Récupérer toutes les étapes d'une opportunité
    static async findByOpportunityId(opportunityId) {
        try {
            const query = `
                SELECT os.*, 
                       ost.description as template_description,
                       ost.required_documents,
                       ost.required_actions,
                       ost.max_duration_days,
                       ost.validation_required
                FROM opportunity_stages os
                LEFT JOIN opportunity_stage_templates ost ON os.stage_template_id = ost.id
                WHERE os.opportunity_id = $1
                ORDER BY os.stage_order ASC
            `;
            const result = await pool.query(query, [opportunityId]);
            return result.rows.map(row => new OpportunityStage(row));
        } catch (error) {
            console.error('Erreur lors de la récupération des étapes:', error);
            throw error;
        }
    }

    // Récupérer une étape par ID
    static async findById(id) {
        try {
            const query = `
                SELECT os.*, 
                       ost.description as template_description,
                       ost.required_documents,
                       ost.required_actions,
                       ost.max_duration_days,
                       ost.validation_required
                FROM opportunity_stages os
                LEFT JOIN opportunity_stage_templates ost ON os.stage_template_id = ost.id
                WHERE os.id = $1
            `;
            const result = await pool.query(query, [id]);
            if (result.rows.length === 0) return null;
            return new OpportunityStage(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'étape:', error);
            throw error;
        }
    }

    // Créer une nouvelle étape
    static async create(data) {
        try {
            const query = `
                INSERT INTO opportunity_stages (
                    opportunity_id, stage_template_id, stage_name, stage_order,
                    status, start_date, due_date, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
            
            const values = [
                data.opportunity_id,
                data.stage_template_id,
                data.stage_name,
                data.stage_order,
                data.status || 'PENDING',
                data.start_date || new Date(),
                data.due_date,
                data.notes
            ];
            
            const result = await pool.query(query, values);
            return new OpportunityStage(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la création de l\'étape:', error);
            throw error;
        }
    }

    // Mettre à jour une étape
    async update(data) {
        try {
            const query = `
                UPDATE opportunity_stages SET
                    status = COALESCE($1, status),
                    start_date = COALESCE($2, start_date),
                    completed_date = COALESCE($3, completed_date),
                    due_date = COALESCE($4, due_date),
                    notes = COALESCE($5, notes),
                    risk_level = COALESCE($6, risk_level),
                    priority_level = COALESCE($7, priority_level),
                    documents = COALESCE($8, documents),
                    actions = COALESCE($9, actions),
                    validated_by = COALESCE($10, validated_by),
                    validated_at = COALESCE($11, validated_at),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $12
                RETURNING *
            `;
            
            const values = [
                data.status,
                data.start_date,
                data.completed_date,
                data.due_date,
                data.notes,
                data.risk_level,
                data.priority_level,
                data.documents,
                data.actions,
                data.validated_by,
                data.validated_at,
                this.id
            ];
            
            const result = await pool.query(query, values);
            if (result.rows.length > 0) {
                Object.assign(this, result.rows[0]);
            }
            return this;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'étape:', error);
            throw error;
        }
    }

    // Supprimer une étape
    async delete() {
        try {
            const query = 'DELETE FROM opportunity_stages WHERE id = $1';
            await pool.query(query, [this.id]);
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'étape:', error);
            throw error;
        }
    }

    // Démarrer une étape
    async start() {
        try {
            await this.update({
                status: 'IN_PROGRESS',
                start_date: new Date()
            });
            return this;
        } catch (error) {
            console.error('Erreur lors du démarrage de l\'étape:', error);
            throw error;
        }
    }

    // Terminer une étape
    async complete(validatedBy = null) {
        try {
            const updateData = {
                status: 'COMPLETED',
                completed_date: new Date()
            };

            if (validatedBy) {
                updateData.validated_by = validatedBy;
                updateData.validated_at = new Date();
            }

            await this.update(updateData);
            return this;
        } catch (error) {
            console.error('Erreur lors de la finalisation de l\'étape:', error);
            throw error;
        }
    }

    // Passer à l'étape suivante
    async moveToNext() {
        try {
            // Terminer l'étape actuelle
            await this.complete();

            // Démarrer l'étape suivante
            const nextStageQuery = `
                SELECT * FROM opportunity_stages 
                WHERE opportunity_id = $1 AND stage_order = $2
            `;
            const nextStageResult = await pool.query(nextStageQuery, [
                this.opportunity_id, 
                this.stage_order + 1
            ]);

            if (nextStageResult.rows.length > 0) {
                const nextStage = new OpportunityStage(nextStageResult.rows[0]);
                await nextStage.start();
                return nextStage;
            }

            return null;
        } catch (error) {
            console.error('Erreur lors du passage à l\'étape suivante:', error);
            throw error;
        }
    }

    // Calculer le niveau de risque
    async calculateRiskLevel() {
        try {
            if (!this.due_date) return 'LOW';

            const now = new Date();
            const dueDate = new Date(this.due_date);
            const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            // Récupérer les paramètres de risque
            const riskParamsQuery = 'SELECT parameter_name, parameter_value FROM risk_parameters WHERE is_active = true';
            const riskParamsResult = await pool.query(riskParamsQuery);
            const riskParams = {};
            riskParamsResult.rows.forEach(row => {
                riskParams[row.parameter_name] = row.parameter_value;
            });

            if (daysUntilDue <= (riskParams.CRITICAL_RISK_DAYS || 3)) {
                return 'CRITICAL';
            } else if (daysUntilDue <= (riskParams.HIGH_RISK_DAYS || 7)) {
                return 'HIGH';
            } else if (daysUntilDue <= (riskParams.MEDIUM_RISK_DAYS || 14)) {
                return 'MEDIUM';
            } else {
                return 'LOW';
            }
        } catch (error) {
            console.error('Erreur lors du calcul du niveau de risque:', error);
            return 'LOW';
        }
    }

    // Calculer le niveau de priorité
    async calculatePriorityLevel() {
        try {
            if (!this.due_date) return 'NORMAL';

            const now = new Date();
            const dueDate = new Date(this.due_date);
            const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            // Récupérer les paramètres de priorité
            const priorityParamsQuery = 'SELECT parameter_name, parameter_value FROM risk_parameters WHERE is_active = true';
            const priorityParamsResult = await pool.query(priorityParamsQuery);
            const priorityParams = {};
            priorityParamsResult.rows.forEach(row => {
                priorityParams[row.parameter_name] = row.parameter_value;
            });

            if (daysUntilDue <= (priorityParams.URGENT_PRIORITY_DAYS || 2)) {
                return 'URGENT';
            } else if (daysUntilDue <= (priorityParams.HIGH_PRIORITY_DAYS || 5)) {
                return 'HIGH';
            } else {
                return 'NORMAL';
            }
        } catch (error) {
            console.error('Erreur lors du calcul du niveau de priorité:', error);
            return 'NORMAL';
        }
    }

    // Mettre à jour les niveaux de risque et priorité
    async updateRiskAndPriority() {
        try {
            const riskLevel = await this.calculateRiskLevel();
            const priorityLevel = await this.calculatePriorityLevel();

            await this.update({
                risk_level: riskLevel,
                priority_level: priorityLevel
            });

            return this;
        } catch (error) {
            console.error('Erreur lors de la mise à jour des niveaux:', error);
            throw error;
        }
    }

    // Ajouter une action à l'étape
    async addAction(actionData) {
        try {
            const query = `
                INSERT INTO stage_actions (
                    stage_id, action_type, action_title, action_description,
                    performed_by, duration_minutes, outcome, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
            
            const values = [
                this.id,
                actionData.action_type,
                actionData.action_title,
                actionData.action_description,
                actionData.performed_by,
                actionData.duration_minutes,
                actionData.outcome || 'SUCCESS',
                actionData.notes
            ];
            
            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'action:', error);
            throw error;
        }
    }

    // Récupérer les actions de l'étape
    async getActions() {
        try {
            const query = `
                SELECT sa.*, u.nom as performer_name, u.prenom as performer_firstname
                FROM stage_actions sa
                LEFT JOIN users u ON sa.performed_by = u.id
                WHERE sa.stage_id = $1
                ORDER BY sa.action_date DESC
            `;
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des actions:', error);
            throw error;
        }
    }

    // Obtenir les statistiques des étapes pour une opportunité
    static async getStageStats(opportunityId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_stages,
                    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_stages,
                    COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_stages,
                    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_stages,
                    COUNT(CASE WHEN status = 'BLOCKED' THEN 1 END) as blocked_stages,
                    COUNT(CASE WHEN risk_level = 'CRITICAL' THEN 1 END) as critical_risk_stages,
                    COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as high_risk_stages,
                    COUNT(CASE WHEN priority_level = 'URGENT' THEN 1 END) as urgent_priority_stages
                FROM opportunity_stages 
                WHERE opportunity_id = $1
            `;
            
            const result = await pool.query(query, [opportunityId]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            throw error;
        }
    }
}

module.exports = OpportunityStage; 