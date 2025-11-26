const { pool } = require('../utils/database');
const EmailService = require('./emailService');

class NotificationService {
    
    /**
     * Envoyer une notification d'étape en retard
     */
    static async sendOverdueNotification(stageId, opportunityId) {
        try {
            const query = `
                SELECT 
                    os.id as stage_id,
                    os.nom as stage_name,
                    os.due_date,
                    o.id as opportunity_id,
                    o.nom as opportunity_name,
                    u.id as user_id,
                    u.nom as user_name,
                    u.email as user_email,
                    bu.nom as business_unit_name
                FROM opportunity_stages os
                JOIN opportunities o ON os.opportunity_id = o.id
                LEFT JOIN users u ON o.collaborateur_id = u.id
                LEFT JOIN business_units bu ON o.business_unit_id = bu.id
                WHERE os.id = $1 AND o.id = $2
            `;

            const result = await pool.query(query, [stageId, opportunityId]);
            const data = result.rows[0];

            if (!data) {
                throw new Error('Données de notification non trouvées');
            }

            // Créer la notification en base
            await this.createNotification({
                type: 'STAGE_OVERDUE',
                title: 'Étape en retard',
                message: `L'étape "${data.stage_name}" de l'opportunité "${data.opportunity_name}" est en retard depuis le ${new Date(data.due_date).toLocaleDateString('fr-FR')}`,
                user_id: data.user_id,
                opportunity_id: data.opportunity_id,
                stage_id: data.stage_id,
                priority: 'HIGH',
                metadata: {
                    business_unit: data.business_unit_name,
                    days_overdue: Math.ceil((new Date() - new Date(data.due_date)) / (1000 * 60 * 60 * 24))
                }
            });

            // Envoyer un email si l'utilisateur a une adresse email
            if (data.user_email) {
                const daysOverdue = Math.ceil((new Date() - new Date(data.due_date)) / (1000 * 60 * 60 * 24));
                await EmailService.sendOverdueStageEmail(
                    data.user_email,
                    data.user_name,
                    data.opportunity_name,
                    data.stage_name,
                    daysOverdue
                );
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la notification de retard:', error);
            return false;
        }
    }

    /**
     * Envoyer une notification de nouvelle étape
     */
    static async sendStageStartedNotification(stageId, opportunityId, startedByUserId) {
        try {
            const query = `
                SELECT 
                    os.id as stage_id,
                    os.nom as stage_name,
                    o.id as opportunity_id,
                    o.nom as opportunity_name,
                    u.id as user_id,
                    u.nom as user_name,
                    u.email as user_email,
                    bu.nom as business_unit_name,
                    starter.nom as started_by_name
                FROM opportunity_stages os
                JOIN opportunities o ON os.opportunity_id = o.id
                LEFT JOIN users u ON o.collaborateur_id = u.id
                LEFT JOIN business_units bu ON o.business_unit_id = bu.id
                LEFT JOIN users starter ON starter.id = $3
                WHERE os.id = $1 AND o.id = $2
            `;

            const result = await pool.query(query, [stageId, opportunityId, startedByUserId]);
            const data = result.rows[0];

            if (!data) {
                throw new Error('Données de notification non trouvées');
            }

            // Créer la notification en base
            await this.createNotification({
                type: 'STAGE_STARTED',
                title: 'Nouvelle étape démarrée',
                message: `L'étape "${data.stage_name}" de l'opportunité "${data.opportunity_name}" a été démarrée par ${data.started_by_name}`,
                user_id: data.user_id,
                opportunity_id: data.opportunity_id,
                stage_id: data.stage_id,
                priority: 'NORMAL',
                metadata: {
                    business_unit: data.business_unit_name,
                    started_by: data.started_by_name
                }
            });

            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la notification de démarrage:', error);
            return false;
        }
    }

    /**
     * Envoyer une notification d'étape terminée
     */
    static async sendStageCompletedNotification(stageId, opportunityId, completedByUserId) {
        try {
            const query = `
                SELECT 
                    os.id as stage_id,
                    os.nom as stage_name,
                    o.id as opportunity_id,
                    o.nom as opportunity_name,
                    u.id as user_id,
                    u.nom as user_name,
                    u.email as user_email,
                    bu.nom as business_unit_name,
                    completer.nom as completed_by_name
                FROM opportunity_stages os
                JOIN opportunities o ON os.opportunity_id = o.id
                LEFT JOIN users u ON o.collaborateur_id = u.id
                LEFT JOIN business_units bu ON o.business_unit_id = bu.id
                LEFT JOIN users completer ON completer.id = $3
                WHERE os.id = $1 AND o.id = $2
            `;

            const result = await pool.query(query, [stageId, opportunityId, completedByUserId]);
            const data = result.rows[0];

            if (!data) {
                throw new Error('Données de notification non trouvées');
            }

            // Créer la notification en base
            await this.createNotification({
                type: 'STAGE_COMPLETED',
                title: 'Étape terminée',
                message: `L'étape "${data.stage_name}" de l'opportunité "${data.opportunity_name}" a été terminée par ${data.completed_by_name}`,
                user_id: data.user_id,
                opportunity_id: data.opportunity_id,
                stage_id: data.stage_id,
                priority: 'NORMAL',
                metadata: {
                    business_unit: data.business_unit_name,
                    completed_by: data.completed_by_name
                }
            });

            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la notification de finalisation:', error);
            return false;
        }
    }

    /**
     * Envoyer une notification d'opportunité gagnée
     */
    static async sendOpportunityWonNotification(opportunityId) {
        try {
            const query = `
                SELECT 
                    o.id as opportunity_id,
                    o.nom as opportunity_name,
                    o.montant_estime,
                    o.devise,
                    u.id as user_id,
                    u.nom as user_name,
                    u.email as user_email,
                    bu.nom as business_unit_name
                FROM opportunities o
                LEFT JOIN users u ON o.collaborateur_id = u.id
                LEFT JOIN business_units bu ON o.business_unit_id = bu.id
                WHERE o.id = $1
            `;

            const result = await pool.query(query, [opportunityId]);
            const data = result.rows[0];

            if (!data) {
                throw new Error('Données de notification non trouvées');
            }

            // Créer la notification en base
            await this.createNotification({
                type: 'OPPORTUNITY_WON',
                title: 'Opportunité gagnée !',
                message: `L'opportunité "${data.opportunity_name}" a été gagnée ! Montant: ${data.montant_estime} ${data.devise}`,
                user_id: data.user_id,
                opportunity_id: data.opportunity_id,
                priority: 'HIGH',
                metadata: {
                    business_unit: data.business_unit_name,
                    amount: data.montant_estime,
                    currency: data.devise
                }
            });

            // Envoyer un email de félicitations si l'utilisateur a une adresse email
            if (data.user_email) {
                await EmailService.sendOpportunityWonEmail(
                    data.user_email,
                    data.user_name,
                    data.opportunity_name,
                    `${data.montant_estime} ${data.devise}`
                );
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la notification de victoire:', error);
            return false;
        }
    }

    /**
     * Créer une notification en base de données
     */
    static async createNotification(notificationData) {
        try {
            const query = `
                INSERT INTO notifications 
                (type, title, message, user_id, opportunity_id, stage_id, priority, metadata, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                RETURNING *
            `;

            const values = [
                notificationData.type,
                notificationData.title,
                notificationData.message,
                notificationData.user_id,
                notificationData.opportunity_id,
                notificationData.stage_id,
                notificationData.priority,
                JSON.stringify(notificationData.metadata || {})
            ];

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
            throw error;
        }
    }

    /**
     * Récupérer les notifications d'un utilisateur
     */
    static async getUserNotifications(userId, limit = 50, offset = 0) {
        try {
            const query = `
                SELECT 
                    n.*,
                    o.nom as opportunity_name,
                    os.stage_name as stage_name
                FROM notifications n
                LEFT JOIN opportunities o ON n.opportunity_id = o.id
                LEFT JOIN opportunity_stages os ON n.stage_id = os.id
                WHERE n.user_id = $1
                ORDER BY n.created_at DESC
                LIMIT $2 OFFSET $3
            `;

            const result = await pool.query(query, [userId, limit, offset]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des notifications:', error);
            throw error;
        }
    }

    /**
     * Marquer une notification comme lue
     */
    static async markAsRead(notificationId, userId) {
        try {
            const query = `
                UPDATE notifications 
                SET read_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND user_id = $2
                RETURNING *
            `;

            const result = await pool.query(query, [notificationId, userId]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors du marquage de la notification:', error);
            throw error;
        }
    }

    /**
     * Supprimer une notification
     */
    static async deleteNotification(notificationId, userId) {
        try {
            const query = `
                DELETE FROM notifications 
                WHERE id = $1 AND user_id = $2
                RETURNING *
            `;

            const result = await pool.query(query, [notificationId, userId]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la suppression de la notification:', error);
            throw error;
        }
    }

    /**
     * Envoyer une notification email (placeholder pour l'instant)
     */
    static async sendEmailNotification(email, emailData) {
        try {
            // TODO: Implémenter l'envoi d'email avec un service comme SendGrid, Mailgun, etc.
            console.log(`Email à envoyer à ${email}:`, emailData);
            
            // Pour l'instant, on simule l'envoi
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            return false;
        }
    }

    /**
     * Obtenir les statistiques de notifications
     */
    static async getNotificationStats(userId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_notifications,
                    COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread_notifications,
                    COUNT(CASE WHEN priority = 'HIGH' AND read_at IS NULL THEN 1 END) as high_priority_unread,
                    COUNT(CASE WHEN type = 'STAGE_OVERDUE' AND read_at IS NULL THEN 1 END) as overdue_notifications,
                    COUNT(CASE WHEN type LIKE 'CAMPAIGN_%' AND read_at IS NULL THEN 1 END) as campaign_notifications
                FROM notifications 
                WHERE user_id = $1
            `;

            const result = await pool.query(query, [userId]);
            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques de notifications:', error);
            throw error;
        }
    }

    // ========================================
    // NOTIFICATIONS POUR CAMPAGNES DE PROSPECTION
    // ========================================

    /**
     * Notification de création de campagne
     */
    static async sendCampaignCreatedNotification(campaignId, createdByUserId) {
        try {
            const query = `
                SELECT 
                    pc.id as campaign_id,
                    pc.name as campaign_name,
                    pc.channel,
                    pc.created_at,
                    u.id as user_id,
                    u.nom as user_name,
                    u.email as user_email,
                    resp.id as responsible_id,
                    resp.nom as responsible_name,
                    resp.prenom as responsible_prenom,
                    bu.nom as business_unit_name,
                    COUNT(pcc.company_id) as companies_count
                FROM prospecting_campaigns pc
                LEFT JOIN users u ON pc.created_by = u.id
                LEFT JOIN collaborateurs resp ON pc.responsible_id = resp.id
                LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
                LEFT JOIN prospecting_campaign_companies pcc ON pc.id = pcc.campaign_id
                WHERE pc.id = $1
                GROUP BY pc.id, pc.name, pc.channel, pc.created_at, u.id, u.nom, u.email, resp.id, resp.nom, resp.prenom, bu.nom
            `;

            console.log('📢 [Notifications] Préparation notification création campagne', { campaignId, createdByUserId });

            const result = await pool.query(query, [campaignId]);
            const data = result.rows[0];

            if (!data) {
                throw new Error('Données de campagne non trouvées');
            }

            // Notification pour le créateur
            await this.createNotification({
                type: 'CAMPAIGN_CREATED',
                title: 'Nouvelle campagne créée',
                message: `Campagne "${data.campaign_name}" créée avec succès. ${data.companies_count} entreprises à traiter.`,
                user_id: data.user_id,
                priority: 'NORMAL',
                metadata: {
                    campaign_id: data.campaign_id,
                    campaign_name: data.campaign_name,
                    channel: data.channel,
                    companies_count: data.companies_count,
                    business_unit: data.business_unit_name
                }
            });

            // Notification + email pour le responsable (s'il existe)
            if (data.responsible_id) {
                const responsibleUser = await pool.query(
                    'SELECT u.id, u.email, u.nom, u.prenom FROM users u JOIN collaborateurs c ON u.collaborateur_id = c.id WHERE c.id = $1',
                    [data.responsible_id]
                );

                if (responsibleUser.rows[0]) {
                    const respUser = responsibleUser.rows[0];

                    // Notification interne
                    await this.createNotification({
                        type: 'CAMPAIGN_ASSIGNED',
                        title: 'Nouvelle campagne assignée',
                        message: `Vous avez été assigné à la campagne "${data.campaign_name}" avec ${data.companies_count} entreprises à traiter.`,
                        user_id: respUser.id,
                        priority: 'NORMAL',
                        metadata: {
                            campaign_id: data.campaign_id,
                            campaign_name: data.campaign_name,
                            channel: data.channel,
                            companies_count: data.companies_count,
                            business_unit: data.business_unit_name
                        }
                    });

                    // Notification email si une adresse est disponible
                    if (respUser.email) {
                        const subject = `Nouvelle campagne de prospection assignée - ${data.campaign_name}`;
                        const htmlContent = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
                                    <h1>Nouvelle campagne assignée</h1>
                                </div>
                                <div style="padding: 20px; background-color: #f8f9fa;">
                                    <p>Bonjour ${respUser.prenom || ''} ${respUser.nom || ''},</p>
                                    <p>Vous avez été désigné responsable de la campagne de prospection <strong>${data.campaign_name}</strong>.</p>
                                    <p><strong>Détails de la campagne :</strong></p>
                                    <ul>
                                        <li>Canal : <strong>${data.channel}</strong></li>
                                        <li>Nombre d'entreprises : <strong>${data.companies_count}</strong></li>
                                        <li>Business Unit : <strong>${data.business_unit_name || 'N/A'}</strong></li>
                                    </ul>
                                    <p>Merci de planifier et piloter l'exécution de cette campagne dans EB-Vision.</p>
                                    <p>Cordialement,<br>L'équipe EB-Vision</p>
                                </div>
                            </div>
                        `;

                        await EmailService.sendNotificationEmail(respUser.email, subject, htmlContent);
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la notification de création de campagne:', error);
            return false;
        }
    }

    /**
     * Notification de soumission pour validation
     */
    static async sendCampaignSubmittedForValidationNotification(campaignId) {
        try {
            const query = `
                SELECT 
                    pc.id as campaign_id,
                    pc.name as campaign_name,
                    pc.channel,
                    pc.created_at,
                    u.id as creator_id,
                    u.nom as creator_name,
                    u.email as creator_email,
                    bu.nom as business_unit_name,
                    COUNT(pcc.company_id) as companies_count,
                    array_agg(DISTINCT pcv.validateur_id) as validators
                FROM prospecting_campaigns pc
                LEFT JOIN users u ON pc.created_by = u.id
                LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
                LEFT JOIN prospecting_campaign_companies pcc ON pc.id = pcc.campaign_id
                LEFT JOIN prospecting_campaign_validations pcv ON pc.id = pcv.campaign_id
                WHERE pc.id = $1
                GROUP BY pc.id, pc.name, pc.channel, pc.created_at, u.id, u.nom, u.email, bu.nom
            `;

            const result = await pool.query(query, [campaignId]);
            const data = result.rows[0];

            if (!data) {
                throw new Error('Données de campagne non trouvées');
            }

            // Notification pour le créateur
            await this.createNotification({
                type: 'CAMPAIGN_SUBMITTED',
                title: 'Campagne soumise pour validation',
                message: `Campagne "${data.campaign_name}" soumise pour validation. ${data.companies_count} entreprises en attente de validation.`,
                user_id: data.creator_id,
                priority: 'NORMAL',
                metadata: {
                    campaign_id: data.campaign_id,
                    campaign_name: data.campaign_name,
                    companies_count: data.companies_count,
                    business_unit: data.business_unit_name
                }
            });

            // Notifications pour tous les validateurs
            if (data.validators && data.validators.length > 0) {
                for (const validatorId of data.validators) {
                    if (validatorId) {
                        const validatorUser = await pool.query(
                            'SELECT u.id, u.email FROM users u JOIN collaborateurs c ON u.collaborateur_id = c.id WHERE c.id = $1',
                            [validatorId]
                        );

                        if (validatorUser.rows[0]) {
                            await this.createNotification({
                                type: 'CAMPAIGN_VALIDATION_REQUIRED',
                                title: 'Validation de campagne requise',
                                message: `Campagne "${data.campaign_name}" en attente de validation. ${data.companies_count} entreprises à valider.`,
                                user_id: validatorUser.rows[0].id,
                                priority: 'HIGH',
                                metadata: {
                                    campaign_id: data.campaign_id,
                                    campaign_name: data.campaign_name,
                                    companies_count: data.companies_count,
                                    business_unit: data.business_unit_name
                                }
                            });
                        }
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la notification de soumission:', error);
            return false;
        }
    }

    /**
     * Notification de décision de validation
     */
    static async sendCampaignValidationDecisionNotification(campaignId, decision, validatorId, comment = '') {
        try {
            const query = `
                SELECT 
                    pc.id as campaign_id,
                    pc.name as campaign_name,
                    pc.channel,
                    u.id as creator_id,
                    u.nom as creator_name,
                    u.email as creator_email,
                    resp.nom as responsible_name,
                    resp.prenom as responsible_prenom,
                    bu.nom as business_unit_name,
                    COUNT(pcc.company_id) as companies_count
                FROM prospecting_campaigns pc
                LEFT JOIN users u ON pc.created_by = u.id
                LEFT JOIN collaborateurs resp ON pc.responsible_id = resp.id
                LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
                LEFT JOIN prospecting_campaign_companies pcc ON pc.id = pcc.campaign_id
                WHERE pc.id = $1
                GROUP BY pc.id, pc.name, pc.channel, u.id, u.nom, u.email, resp.nom, resp.prenom, bu.nom
            `;

            const result = await pool.query(query, [campaignId]);
            const data = result.rows[0];

            if (!data) {
                throw new Error('Données de campagne non trouvées');
            }

            const decisionText = decision === 'APPROUVE' ? 'APPROUVÉE' : 'REJETÉE';
            const priority = decision === 'APPROUVE' ? 'NORMAL' : 'HIGH';

            // Notification pour le créateur
            await this.createNotification({
                type: 'CAMPAIGN_VALIDATION_DECISION',
                title: `Campagne ${decisionText.toLowerCase()}`,
                message: `Campagne "${data.campaign_name}" ${decisionText.toLowerCase()}. ${comment ? `Commentaire: ${comment}` : ''}`,
                user_id: data.creator_id,
                priority: priority,
                metadata: {
                    campaign_id: data.campaign_id,
                    campaign_name: data.campaign_name,
                    decision: decision,
                    comment: comment,
                    business_unit: data.business_unit_name
                }
            });

            // Notification pour le responsable (si différent du créateur)
            if (data.responsible_name) {
                const responsibleUser = await pool.query(
                    'SELECT u.id, u.email FROM users u JOIN collaborateurs c ON u.collaborateur_id = c.id WHERE c.id = $1',
                    [data.responsible_id]
                );

                if (responsibleUser.rows[0] && responsibleUser.rows[0].id !== data.creator_id) {
                    await this.createNotification({
                        type: 'CAMPAIGN_VALIDATION_DECISION',
                        title: `Campagne ${decisionText.toLowerCase()}`,
                        message: `Campagne "${data.campaign_name}" ${decisionText.toLowerCase()}. ${comment ? `Commentaire: ${comment}` : ''}`,
                        user_id: responsibleUser.rows[0].id,
                        priority: priority,
                        metadata: {
                            campaign_id: data.campaign_id,
                            campaign_name: data.campaign_name,
                            decision: decision,
                            comment: comment,
                            business_unit: data.business_unit_name
                        }
                    });
                }
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la notification de décision:', error);
            return false;
        }
    }

    /**
     * Notification de lancement de campagne
     */
    static async sendCampaignStartedNotification(campaignId) {
        try {
            const query = `
                SELECT 
                    pc.id as campaign_id,
                    pc.name as campaign_name,
                    pc.channel,
                    u.id as user_id,
                    u.nom as user_name,
                    u.email as user_email,
                    bu.nom as business_unit_name,
                    COUNT(pcc.company_id) as companies_count
                FROM prospecting_campaigns pc
                LEFT JOIN users u ON pc.responsible_id = u.collaborateur_id
                LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
                LEFT JOIN prospecting_campaign_companies pcc ON pc.id = pcc.campaign_id
                WHERE pc.id = $1
                GROUP BY pc.id, pc.name, pc.channel, u.id, u.nom, u.email, bu.nom
            `;

            const result = await pool.query(query, [campaignId]);
            const data = result.rows[0];

            if (!data) {
                throw new Error('Données de campagne non trouvées');
            }

            await this.createNotification({
                type: 'CAMPAIGN_STARTED',
                title: 'Campagne lancée',
                message: `Campagne "${data.campaign_name}" lancée avec succès. ${data.companies_count} entreprises à contacter.`,
                user_id: data.user_id,
                priority: 'NORMAL',
                metadata: {
                    campaign_id: data.campaign_id,
                    campaign_name: data.campaign_name,
                    channel: data.channel,
                    companies_count: data.companies_count,
                    business_unit: data.business_unit_name
                }
            });

            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la notification de lancement:', error);
            return false;
        }
    }

    /**
     * Notification de progression de campagne
     */
    static async sendCampaignProgressNotification(campaignId, progressPercentage) {
        try {
            const query = `
                SELECT 
                    pc.id as campaign_id,
                    pc.name as campaign_name,
                    pc.channel,
                    u.id as user_id,
                    u.nom as user_name,
                    u.email as user_email,
                    bu.nom as business_unit_name,
                    COUNT(pcc.company_id) as total_companies,
                    COUNT(CASE WHEN pcc.execution_status IN ('sent', 'deposed') THEN 1 END) as completed_companies
                FROM prospecting_campaigns pc
                LEFT JOIN users u ON pc.responsible_id = u.collaborateur_id
                LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
                LEFT JOIN prospecting_campaign_companies pcc ON pc.id = pcc.campaign_id
                WHERE pc.id = $1
                GROUP BY pc.id, pc.name, pc.channel, u.id, u.nom, u.email, bu.nom
            `;

            const result = await pool.query(query, [campaignId]);
            const data = result.rows[0];

            if (!data) {
                throw new Error('Données de campagne non trouvées');
            }

            await this.createNotification({
                type: 'CAMPAIGN_PROGRESS',
                title: 'Progression de campagne',
                message: `Campagne "${data.campaign_name}" : ${progressPercentage}% complété (${data.completed_companies}/${data.total_companies} entreprises traitées).`,
                user_id: data.user_id,
                priority: 'LOW',
                metadata: {
                    campaign_id: data.campaign_id,
                    campaign_name: data.campaign_name,
                    progress_percentage: progressPercentage,
                    completed_companies: data.completed_companies,
                    total_companies: data.total_companies,
                    business_unit: data.business_unit_name
                }
            });

            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la notification de progression:', error);
            return false;
        }
    }

    /**
     * Notification de conversion en opportunité
     */
    static async sendCampaignConversionNotification(campaignId, companyId, opportunityId) {
        try {
            const query = `
                SELECT 
                    pc.id as campaign_id,
                    pc.name as campaign_name,
                    c.nom as company_name,
                    o.nom as opportunity_name,
                    u.id as user_id,
                    u.nom as user_name,
                    u.email as user_email,
                    bu.nom as business_unit_name
                FROM prospecting_campaigns pc
                LEFT JOIN prospecting_campaign_companies pcc ON pc.id = pcc.campaign_id
                LEFT JOIN companies c ON pcc.company_id = c.id
                LEFT JOIN opportunities o ON pcc.opportunity_id = o.id
                LEFT JOIN users u ON pc.responsible_id = u.collaborateur_id
                LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
                WHERE pc.id = $1 AND c.id = $2 AND o.id = $3
            `;

            const result = await pool.query(query, [campaignId, companyId, opportunityId]);
            const data = result.rows[0];

            if (!data) {
                throw new Error('Données de conversion non trouvées');
            }

            // Notification pour le responsable de la campagne
            await this.createNotification({
                type: 'CAMPAIGN_CONVERSION',
                title: 'Conversion réussie !',
                message: `Entreprise "${data.company_name}" de la campagne "${data.campaign_name}" convertie en opportunité "${data.opportunity_name}".`,
                user_id: data.user_id,
                priority: 'HIGH',
                metadata: {
                    campaign_id: data.campaign_id,
                    campaign_name: data.campaign_name,
                    company_name: data.company_name,
                    opportunity_id: opportunityId,
                    opportunity_name: data.opportunity_name,
                    business_unit: data.business_unit_name
                }
            });

            // Notification pour le créateur de la campagne (si différent du responsable)
            const creatorUser = await pool.query(
                'SELECT u.id FROM users u WHERE u.id = (SELECT created_by FROM prospecting_campaigns WHERE id = $1)',
                [campaignId]
            );

            if (creatorUser.rows[0] && creatorUser.rows[0].id !== data.user_id) {
                await this.createNotification({
                    type: 'CAMPAIGN_CONVERSION',
                    title: 'Conversion réussie !',
                    message: `Entreprise "${data.company_name}" de la campagne "${data.campaign_name}" convertie en opportunité "${data.opportunity_name}".`,
                    user_id: creatorUser.rows[0].id,
                    priority: 'HIGH',
                    metadata: {
                        campaign_id: data.campaign_id,
                        campaign_name: data.campaign_name,
                        company_name: data.company_name,
                        opportunity_id: opportunityId,
                        opportunity_name: data.opportunity_name,
                        business_unit: data.business_unit_name
                    }
                });
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la notification de conversion:', error);
            return false;
        }
    }

    /**
     * Notification d'opportunité créée depuis la prospection (pour les responsables)
     */
    static async sendOpportunityCreatedFromProspectionNotification(userId, opportunityData) {
        try {
            await this.createNotification({
                type: 'OPPORTUNITY_CREATED_FROM_PROSPECTION',
                title: 'Nouvelle opportunité créée depuis la prospection',
                message: `Une opportunité a été créée à partir d'une campagne de prospection. Entreprise: ${opportunityData.company_name}`,
                user_id: userId,
                priority: 'MEDIUM',
                metadata: {
                    opportunity_id: opportunityData.opportunity_id,
                    campaign_id: opportunityData.campaign_id,
                    company_name: opportunityData.company_name,
                    business_unit: opportunityData.business_unit,
                    division: opportunityData.division
                }
            });
            
            console.log('✅ Notification d\'opportunité créée envoyée à l\'utilisateur:', userId);
            return true;
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi de la notification d\'opportunité créée:', error);
            return false;
        }
    }
}

module.exports = NotificationService; 