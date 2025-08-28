const cron = require('node-cron');
const { pool } = require('../utils/database');
const OpportunityWorkflowService = require('./opportunityWorkflowService');
const NotificationService = require('./notificationService');

class CronService {
    
    /**
     * Initialiser tous les cron jobs
     */
    static initCronJobs() {
        console.log('🕐 Initialisation des tâches cron...');
        
        // Vérifier les étapes en retard tous les jours à 9h00
        this.scheduleOverdueStagesCheck();
        
        // Vérifier les feuilles de temps en retard tous les lundis à 8h00
        this.scheduleTimeSheetReminders();
        
        // Nettoyer les anciennes notifications tous les dimanches à 2h00
        this.scheduleNotificationCleanup();
        
        // Vérifier les opportunités inactives tous les jours à 10h00
        this.scheduleInactiveOpportunitiesCheck();
        
        console.log('✅ Toutes les tâches cron ont été programmées');
    }
    
    /**
     * Vérifier les étapes en retard quotidiennement
     */
    static scheduleOverdueStagesCheck() {
        cron.schedule('0 9 * * *', async () => {
            console.log('🔍 Vérification des étapes en retard...');
            try {
                const overdueStages = await OpportunityWorkflowService.checkOverdueStages();
                
                if (overdueStages.length > 0) {
                    console.log(`⚠️ ${overdueStages.length} étape(s) en retard détectée(s)`);
                    
                    // Envoyer des notifications pour chaque étape en retard
                    for (const stage of overdueStages) {
                        await NotificationService.sendOverdueNotification(stage.id, stage.opportunity_id);
                    }
                } else {
                    console.log('✅ Aucune étape en retard détectée');
                }
            } catch (error) {
                console.error('❌ Erreur lors de la vérification des étapes en retard:', error);
            }
        }, {
            scheduled: true,
            timezone: "Europe/Paris"
        });
        
        console.log('📅 Tâche cron programmée: Vérification des étapes en retard (9h00 quotidien)');
    }
    
    /**
     * Vérifier les feuilles de temps en retard
     */
    static scheduleTimeSheetReminders() {
        cron.schedule('0 8 * * 1', async () => {
            console.log('📋 Vérification des feuilles de temps en retard...');
            try {
                const result = await pool.query(`
                    SELECT 
                        ts.id,
                        ts.collaborateur_id,
                        c.nom as collaborateur_nom,
                        c.email as collaborateur_email,
                        ts.semaine,
                        ts.annee,
                        ts.statut
                    FROM time_sheets ts
                    JOIN collaborateurs c ON ts.collaborateur_id = c.id
                    WHERE ts.statut IN ('BROUILLON', 'EN_COURS')
                    AND ts.semaine < EXTRACT(WEEK FROM CURRENT_DATE)
                    AND ts.annee <= EXTRACT(YEAR FROM CURRENT_DATE)
                `);
                
                const overdueTimeSheets = result.rows;
                
                if (overdueTimeSheets.length > 0) {
                    console.log(`⚠️ ${overdueTimeSheets.length} feuille(s) de temps en retard détectée(s)`);
                    
                    for (const timeSheet of overdueTimeSheets) {
                        await this.createTimeSheetNotification(timeSheet);
                    }
                } else {
                    console.log('✅ Aucune feuille de temps en retard détectée');
                }
            } catch (error) {
                console.error('❌ Erreur lors de la vérification des feuilles de temps:', error);
            }
        }, {
            scheduled: true,
            timezone: "Europe/Paris"
        });
        
        console.log('📅 Tâche cron programmée: Vérification des feuilles de temps (8h00 lundi)');
    }
    
    /**
     * Nettoyer les anciennes notifications
     */
    static scheduleNotificationCleanup() {
        cron.schedule('0 2 * * 0', async () => {
            console.log('🧹 Nettoyage des anciennes notifications...');
            try {
                // Supprimer les notifications lues de plus de 30 jours
                const result = await pool.query(`
                    DELETE FROM notifications 
                    WHERE read_at IS NOT NULL 
                    AND read_at < CURRENT_DATE - INTERVAL '30 days'
                `);
                
                console.log(`🗑️ ${result.rowCount} notification(s) ancienne(s) supprimée(s)`);
                
                // Supprimer les notifications non lues de plus de 90 jours
                const result2 = await pool.query(`
                    DELETE FROM notifications 
                    WHERE read_at IS NULL 
                    AND created_at < CURRENT_DATE - INTERVAL '90 days'
                `);
                
                console.log(`🗑️ ${result2.rowCount} notification(s) non lue(s) ancienne(s) supprimée(s)`);
                
            } catch (error) {
                console.error('❌ Erreur lors du nettoyage des notifications:', error);
            }
        }, {
            scheduled: true,
            timezone: "Europe/Paris"
        });
        
        console.log('📅 Tâche cron programmée: Nettoyage des notifications (2h00 dimanche)');
    }
    
    /**
     * Vérifier les opportunités inactives
     */
    static scheduleInactiveOpportunitiesCheck() {
        cron.schedule('0 10 * * *', async () => {
            console.log('🔍 Vérification des opportunités inactives...');
            try {
                const result = await pool.query(`
                    SELECT 
                        o.id,
                        o.nom,
                        o.collaborateur_id,
                        u.nom as collaborateur_nom,
                        u.email as collaborateur_email,
                        o.last_activity_at,
                        EXTRACT(DAY FROM CURRENT_TIMESTAMP - o.last_activity_at) as jours_inactif
                    FROM opportunities o
                    LEFT JOIN users u ON o.collaborateur_id = u.id
                    WHERE o.statut = 'EN_COURS'
                    AND o.last_activity_at < CURRENT_DATE - INTERVAL '7 days'
                    AND o.last_activity_at > CURRENT_DATE - INTERVAL '30 days'
                `);
                
                const inactiveOpportunities = result.rows;
                
                if (inactiveOpportunities.length > 0) {
                    console.log(`⚠️ ${inactiveOpportunities.length} opportunité(s) inactive(s) détectée(s)`);
                    
                    for (const opportunity of inactiveOpportunities) {
                        await this.createInactiveOpportunityNotification(opportunity);
                    }
                } else {
                    console.log('✅ Aucune opportunité inactive détectée');
                }
            } catch (error) {
                console.error('❌ Erreur lors de la vérification des opportunités inactives:', error);
            }
        }, {
            scheduled: true,
            timezone: "Europe/Paris"
        });
        
        console.log('📅 Tâche cron programmée: Vérification des opportunités inactives (10h00 quotidien)');

        // Programmer la vérification des campagnes de prospection en retard (9h00 quotidien)
        cron.schedule('0 9 * * *', async () => {
            try {
                await this.checkOverdueCampaigns();
            } catch (error) {
                console.error('❌ Erreur lors de la vérification des campagnes en retard:', error);
            }
        }, {
            scheduled: true,
            timezone: "Europe/Paris"
        });
        
        console.log('📅 Tâche cron programmée: Vérification des campagnes en retard (9h00 quotidien)');
    }
    
    /**
     * Créer une notification pour feuille de temps en retard
     */
    static async createTimeSheetNotification(timeSheet) {
        try {
            await pool.query(`
                INSERT INTO time_sheet_notifications (
                    collaborateur_id,
                    time_sheet_id,
                    type_notification,
                    message,
                    semaine,
                    annee,
                    date_creation
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            `, [
                timeSheet.collaborateur_id,
                timeSheet.id,
                'FEUILLE_EN_RETARD',
                `Votre feuille de temps pour la semaine ${timeSheet.semaine}/${timeSheet.annee} est en retard. Veuillez la compléter et la soumettre.`,
                timeSheet.semaine,
                timeSheet.annee
            ]);
            
            console.log(`📧 Notification créée pour ${timeSheet.collaborateur_nom}`);
        } catch (error) {
            console.error('❌ Erreur lors de la création de la notification de feuille de temps:', error);
        }
    }
    
    /**
     * Créer une notification pour opportunité inactive
     */
    static async createInactiveOpportunityNotification(opportunity) {
        try {
            await NotificationService.createNotification({
                type: 'OPPORTUNITY_INACTIVE',
                title: 'Opportunité inactive',
                message: `L'opportunité "${opportunity.nom}" n'a pas eu d'activité depuis ${Math.floor(opportunity.jours_inactif)} jours. Veuillez la mettre à jour ou la fermer.`,
                user_id: opportunity.collaborateur_id,
                opportunity_id: opportunity.id,
                priority: 'NORMAL',
                metadata: {
                    days_inactive: Math.floor(opportunity.jours_inactif),
                    last_activity: opportunity.last_activity_at
                }
            });
            
            console.log(`📧 Notification d'inactivité créée pour ${opportunity.collaborateur_nom}`);
        } catch (error) {
            console.error('❌ Erreur lors de la création de la notification d\'inactivité:', error);
        }
    }

    /**
     * Vérifier les campagnes de prospection en retard et envoyer des notifications
     */
    static async checkOverdueCampaigns() {
        try {
            console.log('🔍 Vérification des campagnes de prospection en retard...');
            
            const query = `
                SELECT 
                    pc.id as campaign_id,
                    pc.name as campaign_name,
                    pc.scheduled_date,
                    pc.created_at,
                    u.id as user_id,
                    u.nom as user_name,
                    u.email as user_email,
                    COUNT(pcc.company_id) as total_companies,
                    COUNT(CASE WHEN pcc.execution_status IN ('sent', 'deposed') THEN 1 END) as completed_companies
                FROM prospecting_campaigns pc
                LEFT JOIN users u ON pc.responsible_id = u.collaborateur_id
                LEFT JOIN prospecting_campaign_companies pcc ON pc.id = pcc.campaign_id
                WHERE pc.status = 'VALIDATED' 
                AND pc.scheduled_date < NOW() - INTERVAL '7 days'
                AND pc.id NOT IN (
                    SELECT metadata->>'campaign_id' FROM notifications 
                    WHERE type = 'CAMPAIGN_OVERDUE' 
                    AND created_at > NOW() - INTERVAL '3 days'
                )
                GROUP BY pc.id, pc.name, pc.scheduled_date, pc.created_at, u.id, u.nom, u.email
            `;
            
            const result = await pool.query(query);
            
            for (const campaign of result.rows) {
                const progressPercentage = campaign.total_companies > 0 
                    ? Math.round((campaign.completed_companies / campaign.total_companies) * 100) 
                    : 0;
                
                await NotificationService.createNotification({
                    type: 'CAMPAIGN_OVERDUE',
                    title: 'Campagne en retard',
                    message: `La campagne "${campaign.campaign_name}" est en retard de plus de 7 jours. Progression: ${progressPercentage}% (${campaign.completed_companies}/${campaign.total_companies} entreprises traitées).`,
                    user_id: campaign.user_id,
                    priority: 'HIGH',
                    metadata: {
                        campaign_id: campaign.campaign_id,
                        campaign_name: campaign.campaign_name,
                        scheduled_date: campaign.scheduled_date,
                        progress_percentage: progressPercentage,
                        completed_companies: campaign.completed_companies,
                        total_companies: campaign.total_companies
                    }
                });
                
                console.log(`📢 Notification de campagne en retard envoyée pour ${campaign.campaign_name}`);
            }
            
            console.log(`✅ ${result.rows.length} notifications de campagnes en retard envoyées`);
        } catch (error) {
            console.error('❌ Erreur lors de la vérification des campagnes en retard:', error);
        }
    }
    
    /**
     * Arrêter tous les cron jobs
     */
    static stopAllCronJobs() {
        console.log('🛑 Arrêt de tous les cron jobs...');
        cron.getTasks().forEach(task => task.stop());
        console.log('✅ Tous les cron jobs ont été arrêtés');
    }
}

module.exports = CronService;
