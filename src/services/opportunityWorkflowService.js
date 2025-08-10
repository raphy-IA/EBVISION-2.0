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

            // Mettre à jour l'opportunité (étape courante et dates)
            await pool.query(
                `UPDATE opportunities SET 
                    current_stage_id = $1,
                    stage_entered_at = COALESCE($2, CURRENT_TIMESTAMP),
                    last_activity_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [updatedStage.id, updatedStage.start_date, updatedStage.opportunity_id]
            );

            return updatedStage;
        } catch (error) {
            console.error('Erreur lors du démarrage de l\'étape:', error);
            throw error;
        }
    }

    /**
     * Terminer une étape d'opportunité
     */
    static async completeStage(stageId, userId, outcome = null, reason = null, details = null) {
        try {
            const stage = await this.getStageById(stageId);
            if (!stage) {
                throw new Error('Étape non trouvée');
            }

            if (stage.status !== 'IN_PROGRESS') {
                throw new Error('Cette étape ne peut pas être terminée');
            }

            // Validation Phase 2: vérifier exigences (actions/documents) pour le template de cette étape
            const validationOk = await this.validateStageRequirements(stage.opportunity_id, stage);
            if (!validationOk) {
                throw new Error("Conditions de validation non satisfaites (actions/documents requis)");
            }

            // Logique spéciale pour la phase de négociation
            let stageOutcome = outcome;
            if (stage.stage_name === 'Négociation' && !outcome) {
                // Pour la négociation, demander le résultat si pas fourni
                throw new Error("Pour la phase de négociation, veuillez spécifier le résultat (gagnée/perdue)");
            }

            // Mettre à jour le statut de l'étape (schéma sans colonne outcome)
            const updateQuery = `
                UPDATE opportunity_stages 
                SET 
                    status = 'COMPLETED',
                    completed_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const result = await pool.query(updateQuery, [stageId]);
            const updatedStage = result.rows[0];

            // Ajouter une action de finalisation avec raisons si disponibles
            let actionDescription = `L'étape "${updatedStage.nom || updatedStage.stage_name}" a été terminée`;
            if (stageOutcome) {
                actionDescription += ` (résultat: ${stageOutcome})`;
                if (reason) {
                    actionDescription += ` - Raison: ${reason}`;
                }
                if (details) {
                    actionDescription += ` - Détails: ${details}`;
                }
            }
            
            await this.addStageAction(stageId, {
                action_type: 'STAGE_COMPLETE',
                action_title: 'Étape terminée',
                action_description: actionDescription,
                performed_by: userId,
                data: reason ? { reason, details } : null
            });

            // Logique spéciale pour la négociation
            if (stage.stage_name === 'Négociation' && stageOutcome) {
                if (stageOutcome.toLowerCase() === 'gagnée') {
                    // Si négociation gagnée, passer directement à "GAGNEE"
                    await pool.query(`
                        UPDATE opportunities 
                        SET 
                            statut = 'GAGNEE',
                            date_fermeture_reelle = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $1
                    `, [stage.opportunity_id]);
                    
                    // Marquer l'étape "Décision" comme terminée automatiquement
                    await pool.query(`
                        UPDATE opportunity_stages 
                        SET 
                            status = 'COMPLETED',
                            completed_date = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE opportunity_id = $1 AND stage_name = 'Décision'
                    `, [stage.opportunity_id]);
                    
                    return updatedStage;
                } else if (stageOutcome.toLowerCase() === 'perdue') {
                    // Si négociation perdue, passer à "PERDUE"
                    await pool.query(`
                        UPDATE opportunities 
                        SET 
                            statut = 'PERDUE',
                            date_fermeture_reelle = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $1
                    `, [stage.opportunity_id]);
                    
                    // Marquer l'étape "Décision" comme terminée automatiquement
                    await pool.query(`
                        UPDATE opportunity_stages 
                        SET 
                            status = 'COMPLETED',
                            completed_date = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE opportunity_id = $1 AND stage_name = 'Décision'
                    `, [stage.opportunity_id]);
                    
                    return updatedStage;
                }
            }

            // Logique spéciale pour la phase de décision
            if (stage.stage_name === 'Décision') {
                // Demander le résultat final si pas fourni
                if (!stageOutcome) {
                    throw new Error("Pour la phase de décision, veuillez spécifier le résultat final (gagnée/perdue)");
                }
                
                if (stageOutcome.toLowerCase() === 'gagnée') {
                    await pool.query(`
                        UPDATE opportunities 
                        SET 
                            statut = 'GAGNEE',
                            date_fermeture_reelle = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $1
                    `, [stage.opportunity_id]);
                } else if (stageOutcome.toLowerCase() === 'perdue') {
                    await pool.query(`
                        UPDATE opportunities 
                        SET 
                            statut = 'PERDUE',
                            date_fermeture_reelle = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $1
                    `, [stage.opportunity_id]);
                }
                
                return updatedStage;
            }

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
     * Valider les exigences d'une étape (actions/documents obligatoires)
     */
    static async validateStageRequirements(opportunityId, stage) {
        try {
            // Récupérer exigences du template
            const reqActionsQuery = `
                SELECT action_type, is_mandatory
                FROM stage_required_actions
                WHERE stage_template_id = $1 AND is_mandatory = true
            `;
            const reqDocsQuery = `
                SELECT document_type, is_mandatory
                FROM stage_required_documents
                WHERE stage_template_id = $1 AND is_mandatory = true
            `;
            const [ra, rd] = await Promise.all([
                pool.query(reqActionsQuery, [stage.stage_template_id]),
                pool.query(reqDocsQuery, [stage.stage_template_id])
            ]);

            const requiredActions = ra.rows.map(r => r.action_type);
            const requiredDocs = rd.rows.map(r => r.document_type);

            // Si aucune exigence configurée, considérer OK pour compatibilité
            if (requiredActions.length === 0 && requiredDocs.length === 0) return true;

            // Actions effectuées (validantes) pour l'opportunité et l'étape
            const doneActionsQuery = `
                SELECT DISTINCT action_type
                FROM opportunity_actions
                WHERE opportunity_id = $1 AND (stage_id = $2 OR $2 IS NULL) AND is_validating = true
            `;
            const doneActions = await pool.query(doneActionsQuery, [opportunityId, stage.id]);
            const doneActionsSet = new Set(doneActions.rows.map(r => r.action_type));

            // Documents validés pour l'opportunité et l'étape
            const doneDocsQuery = `
                SELECT DISTINCT document_type
                FROM opportunity_documents
                WHERE opportunity_id = $1 AND (stage_id = $2 OR $2 IS NULL) AND validation_status = 'validated'
            `;
            const doneDocs = await pool.query(doneDocsQuery, [opportunityId, stage.id]);
            const doneDocsSet = new Set(doneDocs.rows.map(r => r.document_type));

            const actionsOk = requiredActions.every(a => doneActionsSet.has(a));
            const docsOk = requiredDocs.every(d => doneDocsSet.has(d));

            return actionsOk && docsOk;
        } catch (e) {
            console.error('Erreur validation exigences étape:', e);
            // Par sécurité, ne pas bloquer en prod si erreur requêtes: considérer non valide
            return false;
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

    /**
     * Vérifier les étapes en retard
     */
    static async checkOverdueStages() {
        try {
            const query = `
                SELECT 
                    os.id,
                    os.opportunity_id,
                    os.stage_name,
                    os.due_date,
                    o.nom as opportunity_name,
                    o.collaborateur_id,
                    u.nom as collaborateur_nom,
                    u.email as collaborateur_email
                FROM opportunity_stages os
                JOIN opportunities o ON os.opportunity_id = o.id
                LEFT JOIN users u ON o.collaborateur_id = u.id
                WHERE os.status = 'IN_PROGRESS'
                AND os.due_date < CURRENT_DATE
                AND o.statut = 'EN_COURS'
            `;
            
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la vérification des étapes en retard:', error);
            throw error;
        }
    }

    /**
     * Récupérer l'historique complet d'une opportunité
     */
    static async getOpportunityHistory(opportunityId) {
        try {
            // Récupérer les informations de l'opportunité
            const opportunityResult = await pool.query(`
                SELECT 
                    o.*,
                    c.nom as client_name,
                    col.nom as collaborateur_name,
                    bu.nom as business_unit_name,
                    ot.name as opportunity_type_name
                FROM opportunities o
                LEFT JOIN clients c ON o.client_id = c.id
                LEFT JOIN collaborateurs col ON o.collaborateur_id = col.id
                LEFT JOIN business_units bu ON o.business_unit_id = bu.id
                LEFT JOIN opportunity_types ot ON o.opportunity_type_id = ot.id
                WHERE o.id = $1
            `, [opportunityId]);

            if (opportunityResult.rows.length === 0) {
                throw new Error('Opportunité non trouvée');
            }

            const opportunity = opportunityResult.rows[0];

            // Récupérer toutes les étapes avec leurs actions et documents
            const stagesResult = await pool.query(`
                SELECT 
                    os.*,
                    ost.stage_name as template_name,
                    ost.stage_order as template_order
                FROM opportunity_stages os
                LEFT JOIN opportunity_stage_templates ost ON os.stage_template_id = ost.id
                WHERE os.opportunity_id = $1
                ORDER BY os.stage_order ASC
            `, [opportunityId]);

            // Récupérer toutes les actions de l'opportunité
            const actionsResult = await pool.query(`
                SELECT 
                    oa.*,
                    os.stage_name,
                    os.stage_order
                FROM opportunity_actions oa
                LEFT JOIN opportunity_stages os ON oa.stage_id = os.id
                WHERE oa.opportunity_id = $1
                ORDER BY oa.performed_at ASC
            `, [opportunityId]);

            // Récupérer tous les documents de l'opportunité
            const documentsResult = await pool.query(`
                SELECT 
                    od.*,
                    os.stage_name,
                    os.stage_order
                FROM opportunity_documents od
                LEFT JOIN opportunity_stages os ON od.stage_id = os.id
                WHERE od.opportunity_id = $1
                ORDER BY od.uploaded_at ASC
            `, [opportunityId]);

            // Organiser l'historique chronologiquement
            const history = {
                opportunity: opportunity,
                stages: stagesResult.rows,
                timeline: []
            };

            // Ajouter les actions à la timeline
            actionsResult.rows.forEach(action => {
                history.timeline.push({
                    type: 'action',
                    date: action.performed_at,
                    stage: action.stage_name,
                    stage_order: action.stage_order,
                    title: action.action_title,
                    description: action.action_description,
                    data: action
                });
            });

            // Ajouter les documents à la timeline
            documentsResult.rows.forEach(doc => {
                history.timeline.push({
                    type: 'document',
                    date: doc.uploaded_at,
                    stage: doc.stage_name,
                    stage_order: doc.stage_order,
                    title: `Document ${doc.document_type}`,
                    description: doc.file_name,
                    data: doc
                });
            });

            // Ajouter les changements de statut des étapes
            stagesResult.rows.forEach(stage => {
                if (stage.started_at) {
                    history.timeline.push({
                        type: 'stage_start',
                        date: stage.started_at,
                        stage: stage.stage_name,
                        stage_order: stage.stage_order,
                        title: `Début de l'étape: ${stage.stage_name}`,
                        description: `L'étape ${stage.stage_name} a commencé`,
                        data: stage
                    });
                }
                if (stage.completed_date) {
                    history.timeline.push({
                        type: 'stage_complete',
                        date: stage.completed_date,
                        stage: stage.stage_name,
                        stage_order: stage.stage_order,
                        title: `Fin de l'étape: ${stage.stage_name}`,
                        description: `L'étape ${stage.stage_name} a été terminée`,
                        data: stage
                    });
                }
            });

            // Trier la timeline par date
            history.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

            return history;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            throw error;
        }
    }
}

module.exports = OpportunityWorkflowService; 