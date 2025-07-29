const { pool } = require('../utils/database');

class OpportunityWorkflowService {
    
    /**
     * Démarrer une étape d'opportunité
     */
    static async startStage(stageId, userId) {
        try {
            const stage = await this.getStageById(stageId);
            if (!stage) {
                throw new Error('Étape non trouvée');
            }

            if (stage.status !== 'PENDING') {
                throw new Error('Cette étape ne peut pas être démarrée');
            }

            // Vérifier si l'étape précédente est terminée
            const previousStage = await this.getPreviousStage(stage.opportunity_id, stage.stage_order);
            if (previousStage && previousStage.status !== 'COMPLETED') {
                throw new Error('L\'étape précédente doit être terminée avant de démarrer cette étape');
            }

            // Mettre à jour le statut de l'étape
            const updateQuery = `
                UPDATE opportunity_stages 
                SET 
                    status = 'IN_PROGRESS',
                    start_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const result = await pool.query(updateQuery, [stageId]);
            const updatedStage = result.rows[0];

            // Ajouter une action de démarrage
            await this.addStageAction(stageId, {
                action_type: 'STAGE_START',
                action_title: 'Étape démarrée',
                action_description: `L'étape "${updatedStage.nom}" a été démarrée`,
                performed_by: userId
            });

            // Calculer et mettre à jour les risques/priorités
            await this.updateStageRiskAndPriority(stageId);

            return updatedStage;
        } catch (error) {
            console.error('Erreur lors du démarrage de l\'étape:', error);
            throw error;
        }
    }

    /**
     * Terminer une étape d'opportunité
     */
    static async completeStage(stageId, userId, outcome = null) {
        try {
            const stage = await this.getStageById(stageId);
            if (!stage) {
                throw new Error('Étape non trouvée');
            }

            if (stage.status !== 'IN_PROGRESS') {
                throw new Error('Cette étape ne peut pas être terminée');
            }

            // Mettre à jour le statut de l'étape
            const updateQuery = `
                UPDATE opportunity_stages 
                SET 
                    status = 'COMPLETED',
                    completed_date = CURRENT_TIMESTAMP,
                    outcome = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;

            const result = await pool.query(updateQuery, [outcome, stageId]);
            const updatedStage = result.rows[0];

            // Ajouter une action de finalisation
            await this.addStageAction(stageId, {
                action_type: 'STAGE_COMPLETE',
                action_title: 'Étape terminée',
                action_description: `L'étape "${updatedStage.nom}" a été terminée${outcome ? ` avec le résultat: ${outcome}` : ''}`,
                performed_by: userId
            });

            // Vérifier si c'est la dernière étape et mettre à jour l'opportunité
            await this.checkOpportunityCompletion(updatedStage.opportunity_id);

            // Démarrer automatiquement l'étape suivante si elle existe
            await this.autoStartNextStage(updatedStage.opportunity_id, updatedStage.stage_order);

            return updatedStage;
        } catch (error) {
            console.error('Erreur lors de la finalisation de l\'étape:', error);
            throw error;
        }
    }

    /**
     * Passer à l'étape suivante
     */
    static async moveToNextStage(stageId, userId) {
        try {
            const stage = await this.getStageById(stageId);
            if (!stage) {
                throw new Error('Étape non trouvée');
            }

            // Terminer l'étape actuelle
            await this.completeStage(stageId, userId);

            // Démarrer l'étape suivante
            const nextStage = await this.getNextStage(stage.opportunity_id, stage.stage_order);
            if (nextStage) {
                return await this.startStage(nextStage.id, userId);
            }

            return null;
        } catch (error) {
            console.error('Erreur lors du passage à l\'étape suivante:', error);
            throw error;
        }
    }

    /**
     * Calculer et mettre à jour les risques et priorités d'une étape
     */
    static async updateStageRiskAndPriority(stageId) {
        try {
            const stage = await this.getStageById(stageId);
            if (!stage) {
                throw new Error('Étape non trouvée');
            }

            const riskLevel = this.calculateRiskLevel(stage);
            const priorityLevel = this.calculatePriorityLevel(stage);

            const updateQuery = `
                UPDATE opportunity_stages 
                SET 
                    risk_level = $1,
                    priority_level = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;

            const result = await pool.query(updateQuery, [riskLevel, priorityLevel, stageId]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la mise à jour des risques/priorités:', error);
            throw error;
        }
    }

    /**
     * Calculer le niveau de risque d'une étape
     */
    static calculateRiskLevel(stage) {
        if (!stage.due_date) {
            return 'MEDIUM'; // Risque moyen si pas de date limite
        }

        const now = new Date();
        const dueDate = new Date(stage.due_date);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) {
            return 'CRITICAL'; // En retard
        } else if (daysUntilDue <= 3) {
            return 'HIGH'; // Échéance proche
        } else if (daysUntilDue <= 7) {
            return 'MEDIUM'; // Échéance dans la semaine
        } else {
            return 'LOW'; // Pas d'urgence
        }
    }

    /**
     * Calculer le niveau de priorité d'une étape
     */
    static calculatePriorityLevel(stage) {
        // Priorité basée sur l'ordre de l'étape et le risque
        const stageOrder = stage.stage_order || 1;
        const riskLevel = stage.risk_level || 'MEDIUM';

        if (riskLevel === 'CRITICAL') {
            return 'URGENT';
        } else if (riskLevel === 'HIGH' || stageOrder <= 2) {
            return 'HIGH';
        } else {
            return 'NORMAL';
        }
    }

    /**
     * Vérifier si l'opportunité est terminée
     */
    static async checkOpportunityCompletion(opportunityId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_stages,
                    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_stages
                FROM opportunity_stages 
                WHERE opportunity_id = $1
            `;

            const result = await pool.query(query, [opportunityId]);
            const { total_stages, completed_stages } = result.rows[0];

            if (parseInt(completed_stages) === parseInt(total_stages) && parseInt(total_stages) > 0) {
                // Toutes les étapes sont terminées, mettre à jour l'opportunité
                await pool.query(`
                    UPDATE opportunities 
                    SET 
                        statut = 'GAGNEE',
                        date_fermeture_reelle = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [opportunityId]);
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de completion:', error);
        }
    }

    /**
     * Démarrer automatiquement l'étape suivante
     */
    static async autoStartNextStage(opportunityId, currentStageOrder) {
        try {
            const nextStageQuery = `
                SELECT id FROM opportunity_stages 
                WHERE opportunity_id = $1 AND stage_order = $2 AND status = 'PENDING'
            `;

            const result = await pool.query(nextStageQuery, [opportunityId, currentStageOrder + 1]);
            
            if (result.rows.length > 0) {
                const nextStage = result.rows[0];
                // Démarrer automatiquement l'étape suivante
                await this.startStage(nextStage.id, null); // userId null pour action automatique
            }
        } catch (error) {
            console.error('Erreur lors du démarrage automatique de l\'étape suivante:', error);
        }
    }

    /**
     * Obtenir une étape par ID
     */
    static async getStageById(stageId) {
        try {
            const query = `
                SELECT * FROM opportunity_stages 
                WHERE id = $1
            `;

            const result = await pool.query(query, [stageId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'étape:', error);
            throw error;
        }
    }

    /**
     * Obtenir l'étape précédente
     */
    static async getPreviousStage(opportunityId, currentStageOrder) {
        try {
            const query = `
                SELECT * FROM opportunity_stages 
                WHERE opportunity_id = $1 AND stage_order = $2
            `;

            const result = await pool.query(query, [opportunityId, currentStageOrder - 1]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'étape précédente:', error);
            return null;
        }
    }

    /**
     * Obtenir l'étape suivante
     */
    static async getNextStage(opportunityId, currentStageOrder) {
        try {
            const query = `
                SELECT * FROM opportunity_stages 
                WHERE opportunity_id = $1 AND stage_order = $2
            `;

            const result = await pool.query(query, [opportunityId, currentStageOrder + 1]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'étape suivante:', error);
            return null;
        }
    }

    /**
     * Ajouter une action à une étape
     */
    static async addStageAction(stageId, actionData) {
        try {
            const query = `
                INSERT INTO stage_actions 
                (stage_id, action_type, action_title, action_description, performed_by, action_date)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                RETURNING *
            `;

            const values = [
                stageId,
                actionData.action_type,
                actionData.action_title,
                actionData.action_description,
                actionData.performed_by
            ];

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'action:', error);
            throw error;
        }
    }

    /**
     * Obtenir les statistiques d'une opportunité
     */
    static async getOpportunityStats(opportunityId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_stages,
                    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_stages,
                    COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_stages,
                    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_stages,
                    COUNT(CASE WHEN risk_level = 'CRITICAL' THEN 1 END) as critical_risks,
                    COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as high_risks,
                    COUNT(CASE WHEN priority_level = 'URGENT' THEN 1 END) as urgent_priorities
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

    /**
     * Vérifier les étapes en retard et envoyer des alertes
     */
    static async checkOverdueStages() {
        try {
            const query = `
                SELECT 
                    os.id,
                    os.nom,
                    os.due_date,
                    os.opportunity_id,
                    o.nom as opportunity_name,
                    u.nom as responsible_name,
                    u.email as responsible_email
                FROM opportunity_stages os
                JOIN opportunities o ON os.opportunity_id = o.id
                LEFT JOIN users u ON o.collaborateur_id = u.id
                WHERE os.status IN ('PENDING', 'IN_PROGRESS')
                AND os.due_date < CURRENT_TIMESTAMP
                AND os.risk_level != 'CRITICAL'
            `;

            const result = await pool.query(query);
            const overdueStages = result.rows;

            for (const stage of overdueStages) {
                // Mettre à jour le niveau de risque
                await this.updateStageRiskAndPriority(stage.id);
                
                // Ajouter une action d'alerte
                await this.addStageAction(stage.id, {
                    action_type: 'OVERDUE_ALERT',
                    action_title: 'Étape en retard',
                    action_description: `L'étape "${stage.nom}" est en retard depuis le ${new Date(stage.due_date).toLocaleDateString('fr-FR')}`,
                    performed_by: null // Action système
                });

                // TODO: Envoyer une notification email au responsable
                console.log(`Alerte: Étape en retard - ${stage.opportunity_name} - ${stage.nom}`);
            }

            return overdueStages;
        } catch (error) {
            console.error('Erreur lors de la vérification des étapes en retard:', error);
            throw error;
        }
    }
}

module.exports = OpportunityWorkflowService; 