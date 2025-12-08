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
                    os.stage_name as stage_name,
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
     * Notifications de création d'opportunité (création directe ou conversion)
     * - Créateur de l'opportunité : notification interne
     * - Responsable désigné de l'opportunité : notification interne + email
     * - Responsable BU (DIRECTOR de la BU) : notification interne + email
     * - PARTNER de la BU (rôle PARTNER) : notification interne + email (si différent du responsable BU)
     * - SENIOR_PARTNER (global) : notification interne + email
     */
    static async sendOpportunityCreatedNotification(opportunityId, options = {}) {
        const { fromCampaign = false, campaignId = null, companyName = null } = options;

        try {
            const oppQuery = `
                SELECT 
                    o.id as opportunity_id,
                    o.nom as opportunity_name,
                    o.montant_estime,
                    o.devise,
                    o.business_unit_id,
                    o.created_by,
                    o.source,
                    bu.nom as business_unit_name,
                    col.id as collaborateur_id,
                    col.nom as collaborateur_nom,
                    col.prenom as collaborateur_prenom,
                    col.email as collaborateur_email
                FROM opportunities o
                LEFT JOIN business_units bu ON o.business_unit_id = bu.id
                LEFT JOIN collaborateurs col ON o.collaborateur_id = col.id
                WHERE o.id = $1
            `;

            const oppRes = await pool.query(oppQuery, [opportunityId]);
            const opp = oppRes.rows[0];

            if (!opp) {
                throw new Error('Données d\'opportunité non trouvées');
            }

            const amountLabel = opp.montant_estime ? `${opp.montant_estime} ${opp.devise || 'FCFA'}` : 'N/A';

            // Créateur de l'opportunité
            let creatorUser = null;
            if (opp.created_by) {
                const creatorRes = await pool.query(
                    'SELECT id, nom, prenom, email FROM users WHERE id = $1 AND statut = \'ACTIF\'',
                    [opp.created_by]
                );
                creatorUser = creatorRes.rows[0] || null;
            }

            // Responsable désigné de l'opportunité (user lié au collaborateur)
            let opportunityOwner = null;
            if (opp.collaborateur_id) {
                const ownerRes = await pool.query(
                    'SELECT u.id, u.nom, u.prenom, u.email FROM users u WHERE u.collaborateur_id = $1 AND u.statut = \'ACTIF\' LIMIT 1',
                    [opp.collaborateur_id]
                );
                opportunityOwner = ownerRes.rows[0] || null;
            }

            // Responsable BU (DIRECTOR sur cette BU)
            let buDirectorUsers = [];
            if (opp.business_unit_id) {
                const buDirRes = await pool.query(
                    `SELECT DISTINCT u.id, u.nom, u.prenom, u.email
                     FROM users u
                     JOIN user_roles ur ON ur.user_id = u.id
                     JOIN roles r ON r.id = ur.role_id
                     JOIN collaborateurs c ON u.collaborateur_id = c.id
                     WHERE c.business_unit_id = $1
                       AND r.name = 'DIRECTOR'
                       AND u.statut = 'ACTIF'`,
                    [opp.business_unit_id]
                );
                buDirectorUsers = buDirRes.rows;
            }

            // PARTNER de la BU
            let buPartners = [];
            if (opp.business_unit_id) {
                const partnersRes = await pool.query(
                    `SELECT DISTINCT u.id, u.nom, u.prenom, u.email
                     FROM users u
                     JOIN user_roles ur ON ur.user_id = u.id
                     JOIN roles r ON r.id = ur.role_id
                     JOIN collaborateurs c ON u.collaborateur_id = c.id
                     WHERE c.business_unit_id = $1
                       AND r.name = 'PARTNER'
                       AND u.statut = 'ACTIF'`,
                    [opp.business_unit_id]
                );
                buPartners = partnersRes.rows;
            }

            // SENIOR_PARTNER (global)
            const seniorPartnerRes = await pool.query(
                `SELECT DISTINCT u.id, u.nom, u.prenom, u.email
                 FROM users u
                 JOIN user_roles ur ON ur.user_id = u.id
                 JOIN roles r ON r.id = ur.role_id
                 WHERE r.name = 'SENIOR_PARTNER'
                   AND u.statut = 'ACTIF'`
            );
            const seniorPartners = seniorPartnerRes.rows;

            const baseMetadata = {
                opportunity_id: opp.opportunity_id,
                opportunity_name: opp.opportunity_name,
                amount: opp.montant_estime,
                currency: opp.devise || 'FCFA',
                business_unit_id: opp.business_unit_id,
                business_unit_name: opp.business_unit_name,
                source: opp.source,
                from_campaign: fromCampaign,
                campaign_id: campaignId,
                company_name: companyName
            };

            const baseMessage = fromCampaign
                ? `Nouvelle opportunité "${opp.opportunity_name}" créée à partir d'une campagne de prospection${companyName ? ` (entreprise: ${companyName})` : ''}. Montant estimé: ${amountLabel}.`
                : `Nouvelle opportunité "${opp.opportunity_name}" créée. Montant estimé: ${amountLabel}.`;

            // 1) Notification interne au créateur
            if (creatorUser) {
                await this.createNotification({
                    type: 'OPPORTUNITY_CREATED',
                    title: 'Nouvelle opportunité créée',
                    message: baseMessage,
                    user_id: creatorUser.id,
                    opportunity_id: opp.opportunity_id,
                    priority: 'NORMAL',
                    metadata: baseMetadata
                });
            }

            // Préparer les destinataires pour éviter les doublons
            const notifiedUsers = new Set();

            const pushRecipient = (user, roleLabel) => {
                if (!user || !user.id) return null;
                if (notifiedUsers.has(user.id)) return null;
                notifiedUsers.add(user.id);
                return {
                    id: user.id,
                    nom: user.nom,
                    prenom: user.prenom,
                    email: user.email,
                    roleLabel
                };
            };

            const recipients = [];

            // 2) Responsable désigné de l'opportunité
            const ownerRecipient = pushRecipient(opportunityOwner, 'Responsable opportunité');
            if (ownerRecipient) recipients.push(ownerRecipient);

            // 3) Directeur de la BU
            for (const u of buDirectorUsers) {
                const r = pushRecipient(u, 'Directeur BU');
                if (r) recipients.push(r);
            }

            // 4) PARTNER(s) de la BU
            for (const u of buPartners) {
                const r = pushRecipient(u, 'Partner BU');
                if (r) recipients.push(r);
            }

            // 5) SENIOR_PARTNER(s) globaux
            for (const u of seniorPartners) {
                const r = pushRecipient(u, 'Senior Partner');
                if (r) recipients.push(r);
            }

            const subject = fromCampaign
                ? `Nouvelle opportunité (prospection) - ${opp.opportunity_name}`
                : `Nouvelle opportunité - ${opp.opportunity_name}`;

            for (const rec of recipients) {
                // Notification interne
                await this.createNotification({
                    type: 'OPPORTUNITY_CREATED_NOTIFICATION',
                    title: subject,
                    message: `${baseMessage} (Rôle destinataire: ${rec.roleLabel})`,
                    user_id: rec.id,
                    opportunity_id: opp.opportunity_id,
                    priority: 'HIGH',
                    metadata: {
                        ...baseMetadata,
                        recipient_role: rec.roleLabel
                    }
                });

                // Email si disponible
                if (rec.email) {
                    const htmlContent = `
                        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
                            <div style="background-color: #0d6efd; color: white; padding: 20px; text-align: center;">
                                <h1>Nouvelle opportunité</h1>
                            </div>
                            <div style="padding: 20px; background-color: #f8f9fa;">
                                <p>Bonjour ${rec.prenom || ''} ${rec.nom || ''},</p>
                                <p>${fromCampaign
                            ? `Une nouvelle opportunité a été créée à partir d'une campagne de prospection.`
                            : `Une nouvelle opportunité a été créée dans EB-Vision.`}
                                </p>
                                <p><strong>Détails de l'opportunité :</strong></p>
                                <ul>
                                    <li>Nom : <strong>${opp.opportunity_name}</strong></li>
                                    ${companyName ? `<li>Entreprise : <strong>${companyName}</strong></li>` : ''}
                                    <li>Montant estimé : <strong>${amountLabel}</strong></li>
                                    <li>Business Unit : <strong>${opp.business_unit_name || 'N/A'}</strong></li>
                                    ${opp.source ? `<li>Source : <strong>${opp.source}</strong></li>` : ''}
                                    ${campaignId ? `<li>Campagne liée : <strong>${campaignId}</strong></li>` : ''}
                                </ul>
                                <p>Rôle destinataire : <strong>${rec.roleLabel}</strong></p>
                                <p>Vous pouvez consulter tous les détails de l'opportunité dans EB-Vision.</p>
                                <p>Cordialement,<br>L'équipe EB-Vision</p>
                            </div>
                        </div>
                    `;

                    console.log('📧 [Opportunity] Envoi email de création d\'opportunité', {
                        to: rec.email,
                        userId: rec.id,
                        opportunityId: opp.opportunity_id,
                        role: rec.roleLabel
                    });

                    await EmailService.sendNotificationEmail(rec.email, subject, htmlContent);
                }
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi des notifications de création d\'opportunité:', error);
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
                    resp.id as responsible_collaborator_id,
                    resp.nom as responsible_name,
                    resp.prenom as responsible_prenom,
                    bu.nom as business_unit_name,
                    COUNT(pcc.company_id) as companies_count,
                    array_agg(DISTINCT pcv.validateur_id) as validators
                FROM prospecting_campaigns pc
                LEFT JOIN users u ON pc.created_by = u.id
                LEFT JOIN collaborateurs resp ON pc.responsible_id = resp.id
                LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
                LEFT JOIN prospecting_campaign_companies pcc ON pc.id = pcc.campaign_id
                LEFT JOIN prospecting_campaign_validations pcv ON pc.id = pcv.campaign_id
                WHERE pc.id = $1
                GROUP BY pc.id, pc.name, pc.channel, pc.created_at, u.id, u.nom, u.email, resp.id, resp.nom, resp.prenom, bu.nom
            `;

            const result = await pool.query(query, [campaignId]);
            const data = result.rows[0];

            if (!data) {
                throw new Error('Données de campagne non trouvées');
            }

            // Notification pour le créateur (s'il existe)
            if (data.creator_id) {
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
            }

            // Notification pour le responsable de la campagne (si différent du créateur)
            if (data.responsible_collaborator_id) {
                const responsibleUserRes = await pool.query(
                    'SELECT u.id, u.email FROM users u JOIN collaborateurs c ON u.collaborateur_id = c.id WHERE c.id = $1',
                    [data.responsible_collaborator_id]
                );

                if (responsibleUserRes.rows[0]) {
                    const responsibleUser = responsibleUserRes.rows[0];

                    // Éviter de dupliquer la notif si le responsable est aussi le créateur
                    if (!data.creator_id || responsibleUser.id !== data.creator_id) {
                        await this.createNotification({
                            type: 'CAMPAIGN_SUBMITTED',
                            title: 'Campagne soumise pour validation',
                            message: `Campagne "${data.campaign_name}" a été soumise pour validation. ${data.companies_count} entreprises en attente de validation.`,
                            user_id: responsibleUser.id,
                            priority: 'NORMAL',
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

            // Notifications pour tous les validateurs (interne + email)
            if (data.validators && data.validators.length > 0) {
                for (const validatorId of data.validators) {
                    if (validatorId) {
                        const validatorUser = await pool.query(
                            'SELECT u.id, u.email, u.nom, u.prenom FROM users u JOIN collaborateurs c ON u.collaborateur_id = c.id WHERE c.id = $1',
                            [validatorId]
                        );

                        if (validatorUser.rows[0]) {
                            const vUser = validatorUser.rows[0];

                            // Notification interne
                            await this.createNotification({
                                type: 'CAMPAIGN_VALIDATION_REQUIRED',
                                title: 'Validation de campagne requise',
                                message: `Campagne "${data.campaign_name}" en attente de validation. ${data.companies_count} entreprises à valider.`,
                                user_id: vUser.id,
                                priority: 'HIGH',
                                metadata: {
                                    campaign_id: data.campaign_id,
                                    campaign_name: data.campaign_name,
                                    companies_count: data.companies_count,
                                    business_unit: data.business_unit_name
                                }
                            });

                            // Email de notification si une adresse est disponible
                            if (vUser.email) {
                                const subject = `Validation requise - Campagne ${data.campaign_name}`;
                                const htmlContent = `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center;">
                                            <h1>Validation de campagne requise</h1>
                                        </div>
                                        <div style="padding: 20px; background-color: #f8f9fa;">
                                            <p>Bonjour ${vUser.prenom || ''} ${vUser.nom || ''},</p>
                                            <p>La campagne de prospection <strong>${data.campaign_name}</strong> a été soumise pour validation.</p>
                                            <p><strong>Détails de la campagne :</strong></p>
                                            <ul>
                                                <li>Canal : <strong>${data.channel}</strong></li>
                                                <li>Nombre d'entreprises : <strong>${data.companies_count}</strong></li>
                                                <li>Business Unit : <strong>${data.business_unit_name || 'N/A'}</strong></li>
                                            </ul>
                                            <p>Merci de vous connecter à EB-Vision pour examiner et valider (ou rejeter) cette campagne.</p>
                                            <p>Cordialement,<br>L'équipe EB-Vision</p>
                                        </div>
                                    </div>
                                `;

                                console.log('📧 [Notifications] Envoi email de validation au validateur', {
                                    email: vUser.email,
                                    userId: vUser.id,
                                    campaignId: data.campaign_id
                                });

                                const emailResult = await EmailService.sendNotificationEmail(vUser.email, subject, htmlContent);
                                console.log('📧 [Notifications] Résultat envoi email validateur:', emailResult);
                            }
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
     * - Notifications internes : créateur, responsable (si différent), validateur
     * - Emails : créateur et responsable (si emails disponibles), avec liste des entreprises validées / rejetées et motifs
     */
    static async sendCampaignValidationDecisionNotification(campaignId, decision, validatorId, comment = '', validationId = null) {
        try {
            const query = `
                SELECT 
                    pc.id as campaign_id,
                    pc.name as campaign_name,
                    pc.channel,
                    u.id as creator_id,
                    u.nom as creator_name,
                    u.email as creator_email,
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
                GROUP BY pc.id, pc.name, pc.channel, u.id, u.nom, u.email, resp.id, resp.nom, resp.prenom, bu.nom
            `;

            const result = await pool.query(query, [campaignId]);
            const data = result.rows[0];

            if (!data) {
                throw new Error('Données de campagne non trouvées');
            }

            const decisionText = decision === 'APPROUVE' ? 'APPROUVÉE' : 'REJETÉE';
            const priority = decision === 'APPROUVE' ? 'NORMAL' : 'HIGH';

            // Récupérer les informations du validateur (utilisateur)
            const validatorUserRes = await pool.query(
                'SELECT id, nom, prenom, email FROM users WHERE id = $1',
                [validatorId]
            );
            const validatorUser = validatorUserRes.rows[0] || null;

            // Récupérer les entreprises validées / rejetées pour cette validation (si validationId fourni)
            let approvedCompanies = [];
            let rejectedCompanies = [];
            if (validationId) {
                const companiesRes = await pool.query(
                    `SELECT c.name, pcvc.validation, pcvc.note
                     FROM prospecting_campaign_validation_companies pcvc
                     JOIN companies c ON c.id = pcvc.company_id
                     WHERE pcvc.validation_id = $1
                     ORDER BY c.name`,
                    [validationId]
                );

                for (const row of companiesRes.rows) {
                    const entry = { name: row.name, note: row.note };
                    if (row.validation === 'OK') {
                        approvedCompanies.push(entry);
                    } else if (row.validation === 'NOT_OK') {
                        rejectedCompanies.push(entry);
                    }
                }
            }

            const metaBase = {
                campaign_id: data.campaign_id,
                campaign_name: data.campaign_name,
                decision: decision,
                comment: comment,
                business_unit: data.business_unit_name,
                approved_companies: approvedCompanies,
                rejected_companies: rejectedCompanies
            };

            const baseMessage = `Campagne "${data.campaign_name}" ${decisionText.toLowerCase()}. ${comment ? `Commentaire: ${comment}` : ''}`;

            // Notification pour le créateur
            if (data.creator_id) {
                await this.createNotification({
                    type: 'CAMPAIGN_VALIDATION_DECISION',
                    title: `Campagne ${decisionText.toLowerCase()}`,
                    message: baseMessage,
                    user_id: data.creator_id,
                    priority: priority,
                    metadata: metaBase
                });
            }

            // Notification pour le responsable (si différent du créateur)
            let responsibleUser = null;
            if (data.responsible_id) {
                const responsibleUserRes = await pool.query(
                    'SELECT u.id, u.email FROM users u JOIN collaborateurs c ON u.collaborateur_id = c.id WHERE c.id = $1',
                    [data.responsible_id]
                );

                if (responsibleUserRes.rows[0]) {
                    responsibleUser = responsibleUserRes.rows[0];
                    if (!data.creator_id || responsibleUser.id !== data.creator_id) {
                        await this.createNotification({
                            type: 'CAMPAIGN_VALIDATION_DECISION',
                            title: `Campagne ${decisionText.toLowerCase()}`,
                            message: baseMessage,
                            user_id: responsibleUser.id,
                            priority: priority,
                            metadata: metaBase
                        });
                    }
                }
            }

            // Notification pour le validateur lui-même
            if (validatorUser) {
                await this.createNotification({
                    type: 'CAMPAIGN_VALIDATION_DECISION',
                    title: `Décision envoyée - campagne ${decisionText.toLowerCase()}`,
                    message: baseMessage,
                    user_id: validatorUser.id,
                    priority: 'NORMAL',
                    metadata: metaBase
                });
            }

            // Notification pour les AUTRES validateurs (qui n'ont pas fait l'action mais étaient sollicités)
            const otherValidatorsRes = await pool.query(`
                SELECT DISTINCT u.id, u.email, u.nom, u.prenom
                FROM prospecting_campaign_validations pcv
                JOIN collaborateurs c ON pcv.validateur_id = c.id
                JOIN users u ON c.user_id = u.id
                WHERE pcv.campaign_id = $1
                  AND (pcv.statut_validation = 'RESOLU_AUTRE' OR (pcv.statut_validation = 'EN_ATTENTE' AND u.id != $2))
                  AND u.id != $2
            `, [campaignId, validatorId]);

            for (const otherVal of otherValidatorsRes.rows) {
                await this.createNotification({
                    type: 'CAMPAIGN_VALIDATION_INFO',
                    title: `Campagne ${decisionText.toLowerCase()} par un autre validateur`,
                    message: `La campagne "${data.campaign_name}" a été traitée par ${validatorUser ? validatorUser.nom : 'un autre responsable'}. Aucune action requise de votre part.`,
                    user_id: otherVal.id,
                    priority: 'LOW',
                    metadata: { ...metaBase, handled_by: validatorUser ? validatorUser.nom : 'Autre' }
                });
            }

            // Construire l'email détaillé pour créateur / responsable
            const companiesSection = (list, title) => {
                if (!list || list.length === 0) return '';
                const items = list.map(c => `<li>${c.name}${c.note ? ` - <em>${c.note}</em>` : ''}</li>`).join('');
                return `
                    <h4>${title}</h4>
                    <ul>${items}</ul>
                `;
            };

            const subject = `Décision de validation - Campagne ${data.campaign_name} (${decisionText})`;
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
                    <div style="background-color: ${decision === 'APPROUVE' ? '#28a745' : '#dc3545'}; color: white; padding: 20px; text-align: center;">
                        <h1>Campagne ${decisionText}</h1>
                    </div>
                    <div style="padding: 20px; background-color: #f8f9fa;">
                        <p>Bonjour,</p>
                        <p>La campagne de prospection <strong>${data.campaign_name}</strong> a été <strong>${decisionText.toLowerCase()}</strong> par ${validatorUser ? `${validatorUser.prenom || ''} ${validatorUser.nom || ''}` : 'le validateur'}.</p>
                        <p><strong>Détails de la décision :</strong></p>
                        <ul>
                            <li>Canal : <strong>${data.channel}</strong></li>
                            <li>Business Unit : <strong>${data.business_unit_name || 'N/A'}</strong></li>
                            <li>Nombre total d'entreprises : <strong>${data.companies_count}</strong></li>
                            ${comment ? `<li>Commentaire du validateur : <em>${comment}</em></li>` : ''}
                        </ul>
                        ${companiesSection(approvedCompanies, 'Entreprises validées')}
                        ${companiesSection(rejectedCompanies, 'Entreprises rejetées')}
                        <p>Vous pouvez consulter le détail de la campagne dans EB-Vision.</p>
                        <p>Cordialement,<br>L'équipe EB-Vision</p>
                    </div>
                </div>
            `;

            // Email au créateur
            if (data.creator_email) {
                console.log('📧 [Décision] Destinataires email - créateur', {
                    creator_email: data.creator_email,
                    responsible_email: responsibleUser ? responsibleUser.email : null,
                    campaign_id: data.campaign_id,
                    decision
                });
                await EmailService.sendNotificationEmail(data.creator_email, subject, htmlContent);
            }

            // Email au responsable (si différent et avec email)
            if (responsibleUser && responsibleUser.email && responsibleUser.email !== data.creator_email) {
                console.log('📧 [Décision] Destinataires email - responsable', {
                    creator_email: data.creator_email,
                    responsible_email: responsibleUser.email,
                    campaign_id: data.campaign_id,
                    decision
                });
                await EmailService.sendNotificationEmail(responsibleUser.email, subject, htmlContent);
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

    // =========================================================================
    // NOTIFICATIONS FACTURATION
    // =========================================================================

    /**
     * Notification de soumission de facture pour validation
     * Destinataires : Associé de la mission + Responsable de la BU
     */
    static async sendInvoiceSubmittedNotification(invoiceId, submittedByUserId) {
        try {
            const query = `
                SELECT 
                    i.id as invoice_id,
                    i.numero_facture,
                    i.montant_ttc,
                    m.devise,
                    m.id as mission_id,
                    m.nom as mission_title,
                    bu.id as business_unit_id,
                    bu.nom as business_unit_name,
                    u.nom as submitter_name,
                    u.prenom as submitter_prenom,
                    -- Responsables à notifier
                    m.associe_id,
                    bu.responsable_principal_id,
                    bu.responsable_adjoint_id
                FROM invoices i
                JOIN missions m ON i.mission_id = m.id
                JOIN business_units bu ON m.business_unit_id = bu.id
                JOIN users u ON i.created_by = u.id
                WHERE i.id = $1
            `;

            const result = await pool.query(query, [invoiceId]);
            if (result.rows.length === 0) return false;

            const data = result.rows[0];
            const submitter = `${data.submitter_prenom} ${data.submitter_name}`;

            // Liste des destinataires (déduplication)
            const recipients = new Set([
                data.associe_id,
                data.responsable_principal_id,
                data.responsable_adjoint_id
            ].filter(id => id && id !== submittedByUserId)); // Exclure l'émetteur s'il est aussi validateur

            const promises = Array.from(recipients).map(recipientId =>
                this.createNotification({
                    type: 'INVOICE_SUBMITTED',
                    title: 'Facture en attente de validation',
                    message: `${submitter} a soumis la facture ${data.numero_facture} (${data.montant_ttc} ${data.devise}) pour la mission "${data.mission_title}".`,
                    user_id: recipientId,
                    priority: 'HIGH',
                    metadata: {
                        invoice_id: data.invoice_id,
                        invoice_number: data.numero_facture,
                        mission_id: data.mission_id,
                        business_unit: data.business_unit_name,
                        amount: data.montant_ttc,
                        currency: data.devise
                    }
                })
            );

            await Promise.all(promises);
            return true;
        } catch (error) {
            console.error('Erreur notification soumission facture:', error);
            return false;
        }
    }

    /**
     * Notification de validation de facture (Prête pour approbation)
     * Destinataires : Senior Partners
     */
    static async sendInvoiceValidatedNotification(invoiceId, validatedByUserId) {
        try {
            const query = `
                SELECT 
                    i.id as invoice_id,
                    i.numero_facture,
                    m.nom as mission_title,
                    u.nom as validator_name
                FROM invoices i
                JOIN missions m ON i.mission_id = m.id
                JOIN users u ON i.validated_by = u.id
                WHERE i.id = $1
            `;
            const result = await pool.query(query, [invoiceId]);
            if (result.rows.length === 0) return false;
            const data = result.rows[0];

            // Trouver les Senior Partners
            const spQuery = `
                SELECT u.id 
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'SENIOR_PARTNER'
            `;
            const spResult = await pool.query(spQuery);

            const promises = spResult.rows.map(sp =>
                this.createNotification({
                    type: 'INVOICE_VALIDATED',
                    title: 'Facture à approuver',
                    message: `La facture ${data.numero_facture} a été validée par ${data.validator_name} et nécessite votre approbation finale.`,
                    user_id: sp.id,
                    priority: 'HIGH',
                    metadata: {
                        invoice_id: data.invoice_id,
                        invoice_number: data.numero_facture
                    }
                })
            );

            await Promise.all(promises);
            return true;
        } catch (error) {
            console.error('Erreur notification validation facture:', error);
            return false;
        }
    }

    /**
     * Notification d'approbation (Prête pour émission)
     * Destinataires : Admin / Finance
     */
    static async sendInvoiceApprovedNotification(invoiceId, approvedByUserId) {
        try {
            const query = `
                SELECT i.id, i.numero_facture FROM invoices i WHERE i.id = $1
            `;
            const result = await pool.query(query, [invoiceId]);
            if (result.rows.length === 0) return false;
            const data = result.rows[0];

            // Pour l'instant, notifier les ADMINS
            const adminQuery = `
                SELECT u.id 
                FROM users u 
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'SUPER_ADMIN' OR r.name = 'ADMIN_METIER' OR r.name = 'ADMIN_IT'
            `;
            const adminResult = await pool.query(adminQuery);

            const promises = adminResult.rows.map(admin =>
                this.createNotification({
                    type: 'INVOICE_APPROVED',
                    title: 'Facture prête pour émission',
                    message: `La facture ${data.numero_facture} a été approuvée et peut être émise.`,
                    user_id: admin.id,
                    priority: 'NORMAL',
                    metadata: {
                        invoice_id: data.id,
                        invoice_number: data.numero_facture
                    }
                })
            );

            await Promise.all(promises);
            return true;
        } catch (error) {
            console.error('Erreur notification approbation facture:', error);
            return false;
        }
    }

    /**
     * Notification de rejet
     * Destinataire : Créateur de la facture
     */
    static async sendInvoiceRejectedNotification(invoiceId, rejectedByUserId, reason) {
        try {
            const query = `
                SELECT 
                    i.id, i.numero_facture, i.created_by,
                    u.nom as rejector_name
                FROM invoices i
                JOIN users u ON u.id = $2
                WHERE i.id = $1
            `;
            const result = await pool.query(query, [invoiceId, rejectedByUserId]);
            if (result.rows.length === 0) return false;
            const data = result.rows[0];

            await this.createNotification({
                type: 'INVOICE_REJECTED',
                title: 'Facture rejetée',
                message: `Votre facture ${data.numero_facture} a été rejetée par ${data.rejector_name}. Motif : ${reason}`,
                user_id: data.created_by,
                priority: 'HIGH',
                metadata: {
                    invoice_id: data.id,
                    invoice_number: data.numero_facture,
                    reason: reason
                }
            });
            return true;
        } catch (error) {
            console.error('Erreur notification rejet facture:', error);
            return false;
        }
    }
}

module.exports = NotificationService; 