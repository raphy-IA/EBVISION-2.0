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
                    COUNT(CASE WHEN type = 'STAGE_OVERDUE' AND read_at IS NULL THEN 1 END) as overdue_notifications
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
}

module.exports = NotificationService; 