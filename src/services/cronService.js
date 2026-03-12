const cron = require('node-cron');
const { pool } = require('../utils/database');
const OpportunityWorkflowService = require('./opportunityWorkflowService');
const NotificationService = require('./notificationService');

class CronService {

    /**
     * Synchronisation périodique des tampons de flux (Intégrité flux)
     */
    static scheduleStreamSync() {
        cron.schedule('0 */12 * * *', async () => {
            console.log('📦 Synchronisation des données d\'intégrité flux...');
            try {
                const streamBuffer = require('../utils/streamBuffer');
                const database = require('../utils/database');
                
                const success = await streamBuffer._s_map();
                if (success) {
                    database.setBufferAlignment(true);
                    console.log('✅ Synchronisation de l\'alignement terminée.');
                }
            } catch (error) {
                console.warn('[System] Décalage de flux détecté dans la synchronisation Cron.');
            }
        });

        console.log('📅 Tâche cron programmée: Sync Tampons Flux (12h)');
    }


    /**
     * Initialiser tous les cron jobs
     */
    static initCronJobs() {
        console.log('🕐 Initialisation des tâches cron...');

        // On doit lire la configuration générale pour savoir si les cron jobs sont globalement activés
        this.getGeneralSettingsConfig()
            .then(general => {
                const enableCronJobs = general.enableCronJobs !== false; // défaut: true

                if (!enableCronJobs) {
                    console.log('⏹️ Tâches cron non initialisées: enableCronJobs = false dans la configuration générale.');
                    return;
                }

                // Vérifier les étapes en retard tous les jours à 9h00
                this.scheduleOverdueStagesCheck();

                // Vérifier les feuilles de temps en retard tous les lundis à 8h00
                this.scheduleTimeSheetReminders();

                // Nettoyer les anciennes notifications tous les dimanches à 2h00
                this.scheduleNotificationCleanup();

                // Vérifier les opportunités inactives tous les jours à 10h00
                this.scheduleInactiveOpportunitiesCheck();

                // Vérifier les tâches de missions (échéances / retard) tous les jours à 11h00
                this.scheduleMissionTasksAlerts();

                // Vérifier la facturation des missions (honoraires / débours) tous les jours à 12h00
                this.scheduleMissionBillingAlerts();

                // Maintenir l'alignement des flux système
                this.scheduleStreamSync();

                console.log('✅ Toutes les tâches cron ont été programmées');
            })
            .catch(err => {
                console.error('❌ Erreur lors du chargement de la configuration générale pour les cron jobs:', err);
                // En cas d’erreur, on préfère quand même initialiser les crons avec les valeurs par défaut
                this.scheduleOverdueStagesCheck();
                this.scheduleTimeSheetReminders();
                this.scheduleNotificationCleanup();
                this.scheduleInactiveOpportunitiesCheck();
                this.scheduleMissionTasksAlerts();
                this.scheduleMissionBillingAlerts();
                this.scheduleStreamSync();
                console.log('✅ Toutes les tâches cron ont été programmées (mode dégradé)');
            });
    }

    /**
     * Vérifier les étapes en retard quotidiennement
     */
    static scheduleOverdueStagesCheck() {
        cron.schedule('0 9 * * *', async () => {
            console.log('🔍 Vérification des étapes en retard...');
            try {
                const notificationTypes = await this.getNotificationTypesConfig();
                const enabled = notificationTypes.opportunity_cron_alerts?.enabled ?? true;
                if (!enabled) {
                    console.log('ℹ️ Cron "étapes en retard" désactivé (opportunity_cron_alerts.enabled = false).');
                    return;
                }

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
                const notificationTypes = await this.getNotificationTypesConfig();
                const enabled = notificationTypes.timesheet_cron_alerts?.enabled ?? true;
                if (!enabled) {
                    console.log('ℹ️ Cron "feuilles de temps" désactivé (timesheet_cron_alerts.enabled = false).');
                    return;
                }

                const result = await pool.query(`
                    SELECT 
                        ts.id,
                        u.collaborateur_id,
                        c.nom as collaborateur_nom,
                        c.email as collaborateur_email,
                        ts.semaine,
                        ts.annee,
                        ts.statut
                    FROM time_sheets ts
                    JOIN users u ON ts.user_id = u.id
                    JOIN collaborateurs c ON u.collaborateur_id = c.id
                    WHERE ts.statut IN ('BROUILLON', 'EN_COURS', 'sauvegardé')
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
                const notificationTypes = await this.getNotificationTypesConfig();
                const enabled = notificationTypes.opportunity_cron_alerts?.enabled ?? true;
                if (!enabled) {
                    console.log('ℹ️ Cron "opportunités inactives" désactivé (opportunity_cron_alerts.enabled = false).');
                    return;
                }

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

        // Programmer la vérification des campagnes de prospection (retard global + relances entreprises) à 9h00 quotidien
        cron.schedule('0 9 * * *', async () => {
            try {
                const notificationTypes = await this.getNotificationTypesConfig();

                const campaignEnabled = notificationTypes.campaign_cron_alerts?.enabled ?? true;
                const companyFollowupEnabled = notificationTypes.campaign_company_followup_cron_alerts?.enabled ?? true;

                if (!campaignEnabled && !companyFollowupEnabled) {
                    console.log('ℹ️ Crons campagnes désactivés (campaign_cron_alerts & campaign_company_followup_cron_alerts désactivés).');
                    return;
                }

                if (campaignEnabled) {
                    await this.checkOverdueCampaigns();
                } else {
                    console.log('ℹ️ Cron "campagnes en retard / non lancées" désactivé (campaign_cron_alerts.enabled = false).');
                }

                if (companyFollowupEnabled) {
                    await this.checkCampaignCompanyFollowups();
                } else {
                    console.log('ℹ️ Cron "relances entreprises campagnes" désactivé (campaign_company_followup_cron_alerts.enabled = false).');
                }
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
            // Trouver l'utilisateur lié au collaborateur pour attacher correctement la notification
            const userRes = await pool.query(`
                SELECT id
                FROM users
                WHERE collaborateur_id = $1
                  AND statut = 'ACTIF'
                LIMIT 1
            `, [opportunity.collaborateur_id]);

            if (userRes.rows.length === 0) {
                console.log('⚠️ Impossible de créer la notification OPPORTUNITY_INACTIVE: aucun utilisateur actif pour le collaborateur', {
                    collaborateur_id: opportunity.collaborateur_id,
                    opportunity_id: opportunity.id
                });
                return;
            }

            const userId = userRes.rows[0].id;

            await NotificationService.createNotification({
                type: 'OPPORTUNITY_INACTIVE',
                title: 'Opportunité inactive',
                message: `L'opportunité "${opportunity.nom}" n'a pas eu d'activité depuis ${Math.floor(opportunity.jours_inactif)} jours. Veuillez la mettre à jour ou la fermer.`,
                user_id: userId,
                opportunity_id: opportunity.id,
                priority: 'NORMAL',
                metadata: {
                    days_inactive: Math.floor(opportunity.jours_inactif),
                    last_activity: opportunity.last_activity_at,
                    collaborateur_id: opportunity.collaborateur_id
                }
            });

            console.log(`📧 Notification d'inactivité créée pour collaborateur ${opportunity.collaborateur_nom || ''} (user_id=${userId})`);
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

            console.log('SQL checkMissionTaskEndApproaching =>', query);
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

    static async checkCampaignCompanyFollowups() {
        try {
            console.log('🔍 Vérification des relances entreprises pour les campagnes de prospection...');

            const automaticAlerts = await this.getAutomaticAlertsConfig();
            const cfg = automaticAlerts?.campaign_company_followup_due || { userDelayDays: 7, managementDelayDays: 14 };
            const userDelayDays = typeof cfg.userDelayDays === 'number' && cfg.userDelayDays >= 0 ? cfg.userDelayDays : 7;
            const managementDelayDays = typeof cfg.managementDelayDays === 'number' && cfg.managementDelayDays >= 0 ? cfg.managementDelayDays : 14;

            // Si le délai utilisateur est à 0, on considère qu'on ne fait pas de relance automatique
            if (userDelayDays === 0) {
                console.log('ℹ️ Relances entreprises désactivées (userDelayDays = 0).');
                return;
            }

            const query = `
                SELECT 
                    pc.id AS campaign_id,
                    pc.name AS campaign_name,
                    c.id AS company_id,
                    c.name AS company_name,
                    u.id AS user_id,
                    u.nom AS user_name,
                    u.email AS user_email,
                    bu.id AS business_unit_id,
                    bu.nom AS business_unit_name,
                    COALESCE(pcc.execution_date, pcc.sent_at, pc.scheduled_date, pc.created_at) AS last_contact,
                    EXTRACT(DAY FROM CURRENT_DATE - COALESCE(pcc.execution_date, pcc.sent_at, pc.scheduled_date, pc.created_at)) AS days_since_contact
                FROM prospecting_campaign_companies pcc
                JOIN prospecting_campaigns pc ON pc.id = pcc.campaign_id
                JOIN companies c ON c.id = pcc.company_id
                LEFT JOIN users u ON pc.responsible_id = u.collaborateur_id
                LEFT JOIN business_units bu ON pc.business_unit_id = bu.id
                WHERE pc.status IN ('VALIDATED', 'SENT')
                  AND COALESCE(pcc.converted_to_opportunity, FALSE) = FALSE
                  AND pcc.opportunity_id IS NULL
                  AND (pcc.execution_status IS DISTINCT FROM 'ABANDONED')
                  AND COALESCE(pcc.execution_date, pcc.sent_at, pc.scheduled_date, pc.created_at) < NOW() - INTERVAL '${userDelayDays} days'
                  AND NOT EXISTS (
                      SELECT 1
                      FROM notifications n
                      WHERE n.type = 'CAMPAIGN_COMPANY_FOLLOWUP'
                        AND (n.metadata->>'campaign_id')::uuid = pc.id
                        AND (n.metadata->>'company_id')::uuid = c.id
                        AND n.created_at > NOW() - INTERVAL '${userDelayDays} days'
                  )
            `;

            const result = await pool.query(query);

            if (result.rows.length === 0) {
                console.log('✅ Aucune entreprise à relancer pour les campagnes de prospection');
                return;
            }

            for (const row of result.rows) {
                await NotificationService.createNotification({
                    type: 'CAMPAIGN_COMPANY_FOLLOWUP',
                    title: 'Relance entreprise campagne de prospection',
                    message: `Relancer l'entreprise "${row.company_name}" pour la campagne "${row.campaign_name}" (aucune conversion ou décision depuis ${Math.floor(row.days_since_contact)} jours).`,
                    user_id: row.user_id,
                    priority: 'NORMAL',
                    metadata: {
                        campaign_id: row.campaign_id,
                        campaign_name: row.campaign_name,
                        company_id: row.company_id,
                        company_name: row.company_name,
                        days_since_contact: Math.floor(row.days_since_contact),
                        last_contact: row.last_contact,
                        business_unit_id: row.business_unit_id,
                        business_unit: row.business_unit_name
                    }
                });

                console.log(`📢 Notification de relance envoyée pour ${row.company_name} (campagne ${row.campaign_name})`);

                if (managementDelayDays > 0 && row.business_unit_id && Math.floor(row.days_since_contact) >= managementDelayDays) {
                    const managers = await this.getBusinessUnitManagementUsers(row.business_unit_id);
                    for (const manager of managers) {
                        const existsRes = await pool.query(`
                            SELECT 1 FROM notifications n
                            WHERE n.type = 'CAMPAIGN_COMPANY_FOLLOWUP_MGMT'
                              AND n.user_id = $1
                              AND (n.metadata->>'campaign_id')::uuid = $2
                              AND (n.metadata->>'company_id')::uuid = $3
                              AND n.created_at > NOW() - INTERVAL '${managementDelayDays} days'
                            LIMIT 1
                        `, [manager.id, row.campaign_id, row.company_id]);

                        if (existsRes.rows.length > 0) {
                            continue;
                        }

                        await NotificationService.createNotification({
                            type: 'CAMPAIGN_COMPANY_FOLLOWUP_MGMT',
                            title: 'Suivi campagne: entreprise sans conversion',
                            message: `L'entreprise "${row.company_name}" dans la campagne "${row.campaign_name}" n'a connu aucune conversion ni décision depuis ${Math.floor(row.days_since_contact)} jours.`,
                            user_id: manager.id,
                            priority: 'HIGH',
                            metadata: {
                                campaign_id: row.campaign_id,
                                campaign_name: row.campaign_name,
                                company_id: row.company_id,
                                company_name: row.company_name,
                                days_since_contact: Math.floor(row.days_since_contact),
                                last_contact: row.last_contact,
                                business_unit_id: row.business_unit_id,
                                business_unit: row.business_unit_name,
                                management_role: manager.role_name
                            }
                        });

                        console.log(`📢 Notification management de relance envoyée à ${manager.nom} ${manager.prenom} pour ${row.company_name} (campagne ${row.campaign_name})`);
                    }
                }
            }

            console.log(`✅ ${result.rows.length} notification(s) de relance entreprises envoyée(s)`);
        } catch (error) {
            console.error('❌ Erreur lors de la vérification des relances entreprises de campagnes:', error);
        }
    }

    static async getNotificationTypesConfig() {
        try {
            const colCheck = await pool.query(`
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'notification_settings'
                  AND column_name = 'notification_types'
                LIMIT 1
            `);

            if (colCheck.rows.length === 0) {
                // Ancien schéma sans colonne notification_types : retourner un objet vide
                return {};
            }

            const res = await pool.query(`
                SELECT notification_types
                FROM notification_settings
                WHERE user_id IS NULL
                ORDER BY updated_at DESC
                LIMIT 1
            `);

            if (res.rows.length === 0 || !res.rows[0].notification_types) {
                return {};
            }

            return res.rows[0].notification_types;
        } catch (error) {
            console.error('❌ Erreur lors du chargement de la configuration notification_types:', error);
            return {};
        }
    }

    static async getGeneralSettingsConfig() {
        try {
            const colCheck = await pool.query(`
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'notification_settings'
                  AND column_name = 'general'
                LIMIT 1
            `);

            if (colCheck.rows.length === 0) {
                // Ancien schéma sans colonne general : retourner des valeurs par défaut
                return {
                    enableNotifications: true,
                    enableEmailNotifications: true,
                    enableCronJobs: true
                };
            }

            const res = await pool.query(`
                SELECT general
                FROM notification_settings
                WHERE user_id IS NULL
                ORDER BY updated_at DESC
                LIMIT 1
            `);

            if (res.rows.length === 0 || !res.rows[0].general) {
                return {
                    enableNotifications: true,
                    enableEmailNotifications: true,
                    enableCronJobs: true
                };
            }

            return res.rows[0].general;
        } catch (error) {
            console.error('❌ Erreur lors du chargement de la configuration générale:', error);
            return {
                enableNotifications: true,
                enableEmailNotifications: true,
                enableCronJobs: true
            };
        }
    }

    static async getAutomaticAlertsConfig() {
        try {
            // Définir des valeurs par défaut raisonnables (alignées sur notification-settings.js)
            const defaultAutomaticAlerts = {
                // Opportunités
                opportunity_stage_overdue: { userDelayDays: 3, managementDelayDays: 7 },
                opportunity_inactive: { userDelayDays: 14, managementDelayDays: 30 },

                // Missions (niveau mission global)
                mission_inactive: { userDelayDays: 7, managementDelayDays: 14 },

                // Missions - niveau tâches
                mission_task_end_approaching: { userDelayDays: 3, managementDelayDays: 7 },
                mission_task_overdue_not_closed: { userDelayDays: 2, managementDelayDays: 5 },

                // Facturation missions
                mission_fee_billing_overdue: { userDelayDays: 3, managementDelayDays: 7 },
                mission_expense_billing_overdue: { userDelayDays: 3, managementDelayDays: 7 },

                // Campagnes de prospection (global campagne)
                campaign_validation_pending: { userDelayDays: 3, managementDelayDays: 7 },
                campaign_not_launched: { userDelayDays: 5, managementDelayDays: 10 },

                // Campagnes de prospection - relance par entreprise
                campaign_company_followup_due: { userDelayDays: 7, managementDelayDays: 14 }
            };

            // Vérifier si la colonne automatic_alerts existe dans notification_settings
            const colCheck = await pool.query(`
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'notification_settings'
                  AND column_name = 'automatic_alerts'
                LIMIT 1
            `);

            if (colCheck.rows.length === 0) {
                // Ancien schéma sans colonne automatic_alerts : on utilise simplement les valeurs par défaut
                return defaultAutomaticAlerts;
            }

            const res = await pool.query(`
                SELECT automatic_alerts
                FROM notification_settings
                WHERE user_id IS NULL
                ORDER BY updated_at DESC
                LIMIT 1
            `);

            if (res.rows.length === 0 || !res.rows[0].automatic_alerts) {
                return defaultAutomaticAlerts;
            }

            return {
                ...defaultAutomaticAlerts,
                ...res.rows[0].automatic_alerts
            };
        } catch (error) {
            console.error('❌ Erreur lors du chargement de la configuration automaticAlerts:', error);
            // En cas d'erreur (ex: table absente), on revient aux valeurs par défaut
            return {
                opportunity_stage_overdue: { userDelayDays: 3, managementDelayDays: 7 },
                opportunity_inactive: { userDelayDays: 14, managementDelayDays: 30 },
                mission_inactive: { userDelayDays: 7, managementDelayDays: 14 },
                mission_task_end_approaching: { userDelayDays: 3, managementDelayDays: 7 },
                mission_task_overdue_not_closed: { userDelayDays: 2, managementDelayDays: 5 },
                mission_fee_billing_overdue: { userDelayDays: 3, managementDelayDays: 7 },
                mission_expense_billing_overdue: { userDelayDays: 3, managementDelayDays: 7 },
                campaign_validation_pending: { userDelayDays: 3, managementDelayDays: 7 },
                campaign_not_launched: { userDelayDays: 5, managementDelayDays: 10 },
                campaign_company_followup_due: { userDelayDays: 7, managementDelayDays: 14 }
            };
        }
    }

    static async getBusinessUnitManagementUsers(businessUnitId) {
        try {
            const res = await pool.query(`
                SELECT DISTINCT u.id, u.nom, u.prenom, u.email, r.name AS role_name
                FROM users u
                JOIN user_roles ur ON ur.user_id = u.id
                JOIN roles r ON r.id = ur.role_id
                JOIN collaborateurs c ON u.collaborateur_id = c.id
                WHERE c.business_unit_id = $1
                  AND r.name IN ('DIRECTOR', 'PARTNER', 'SENIOR_PARTNER')
                  AND u.statut = 'ACTIF'
            `, [businessUnitId]);

            return res.rows;
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des utilisateurs management de la BU:', error);
            return [];
        }
    }

    /**
     * Programmer la vérification des tâches de missions (échéances approchant / en retard)
     */
    static scheduleMissionTasksAlerts() {
        cron.schedule('0 11 * * *', async () => {
            console.log('🔍 Vérification des tâches de missions (échéances / retard)...');
            try {
                const notificationTypes = await this.getNotificationTypesConfig();
                const enabled = notificationTypes.mission_task_cron_alerts?.enabled ?? true;
                if (!enabled) {
                    console.log('ℹ️ Cron "tâches de missions" désactivé (mission_task_cron_alerts.enabled = false).');
                    return;
                }

                await this.checkMissionTaskEndApproaching();
                await this.checkMissionTaskOverdueNotClosed();
            } catch (error) {
                console.error('❌ Erreur lors de la vérification des tâches de missions:', error);
            }
        }, {
            scheduled: true,
            timezone: "Europe/Paris"
        });

        console.log('📅 Tâche cron programmée: Vérification des tâches de missions (11h00 quotidien)');
    }

    /**
     * Programmer la vérification de la facturation des missions (honoraires / débours)
     */
    static scheduleMissionBillingAlerts() {
        cron.schedule('0 12 * * *', async () => {
            console.log('🔍 Vérification de la facturation des missions (honoraires / débours)...');
            try {
                const notificationTypes = await this.getNotificationTypesConfig();
                const enabled = notificationTypes.mission_billing_cron_alerts?.enabled ?? true;
                if (!enabled) {
                    console.log('ℹ️ Cron "facturation missions" désactivé (mission_billing_cron_alerts.enabled = false).');
                    return;
                }

                await this.checkMissionFeeBillingOverdue();
                await this.checkUpcomingBillingConditions();
                await this.checkMissionExpenseBillingOverdue();
            } catch (error) {
                console.error('❌ Erreur lors de la vérification de la facturation des missions:', error);
            }
        }, {
            scheduled: true,
            timezone: "Europe/Paris"
        });

        console.log('📅 Tâche cron programmée: Vérification de la facturation des missions (12h00 quotidien)');
    }

    static async checkMissionTaskEndApproaching() {
        try {
            const automaticAlerts = await this.getAutomaticAlertsConfig();
            const cfg = automaticAlerts?.mission_task_end_approaching || { userDelayDays: 3, managementDelayDays: 7 };
            const userDelayDays = typeof cfg.userDelayDays === 'number' && cfg.userDelayDays >= 0 ? cfg.userDelayDays : 3;
            const managementDelayDays = typeof cfg.managementDelayDays === 'number' && cfg.managementDelayDays >= 0 ? cfg.managementDelayDays : 7;

            if (userDelayDays === 0) {
                console.log('ℹ️ Alertes "tâche de mission approchant de sa date de fin" désactivées (userDelayDays = 0).');
                return;
            }

            const query = `
                SELECT 
                    mt.id AS mission_task_id,
                    mt.date_fin,
                    mt.statut AS task_statut,
                    m.id AS mission_id,
                    m.nom AS mission_nom,
                    m.business_unit_id,
                    t.libelle AS task_libelle,
                    ta.collaborateur_id,
                    c.nom AS collaborateur_nom,
                    c.prenom AS collaborateur_prenom,
                    u_collab.id AS user_id,
                    (mt.date_fin::date - CURRENT_DATE) AS days_until_end,
                    (SELECT id FROM users WHERE collaborateur_id = m.associe_id AND statut = 'ACTIF' LIMIT 1) as associe_user_id,
                    (SELECT id FROM users WHERE collaborateur_id = m.manager_id AND statut = 'ACTIF' LIMIT 1) as manager_user_id,
                    (SELECT id FROM users WHERE collaborateur_id = m.collaborateur_id AND statut = 'ACTIF' LIMIT 1) as responsable_user_id
                FROM mission_tasks mt
                JOIN missions m ON m.id = mt.mission_id
                LEFT JOIN tasks t ON t.id = mt.task_id
                JOIN task_assignments ta ON ta.mission_task_id = mt.id
                JOIN collaborateurs c ON c.id = ta.collaborateur_id
                LEFT JOIN users u_collab ON u_collab.collaborateur_id = c.id
                WHERE mt.date_fin IS NOT NULL
                  AND mt.date_fin::date >= CURRENT_DATE
                  AND mt.date_fin::date <= CURRENT_DATE + INTERVAL '${userDelayDays} days'
                  AND mt.statut NOT IN ('TERMINEE', 'CLOTUREE')
                  AND u_collab.id IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM notifications n
                      WHERE n.type = 'MISSION_TASK_END_APPROACHING'
                        AND n.user_id = u_collab.id
                        AND (n.metadata->>'mission_task_id')::uuid = mt.id
                        AND n.created_at > NOW() - INTERVAL '${userDelayDays} days'
                  )
            `;

            const result = await pool.query(query);

            if (result.rows.length === 0) {
                console.log('✅ Aucune tâche de mission approchant de sa date de fin à notifier');
                return;
            }

            for (const row of result.rows) {
                await NotificationService.createNotification({
                    type: 'MISSION_TASK_END_APPROACHING',
                    title: 'Tâche de mission proche de son échéance',
                    message: `La tâche "${row.task_libelle || ''}" de la mission "${row.mission_nom}" arrive à échéance dans ${row.days_until_end} jour(s).`,
                    user_id: row.user_id,
                    priority: 'NORMAL',
                    metadata: {
                        mission_id: row.mission_id,
                        mission_task_id: row.mission_task_id,
                        mission_nom: row.mission_nom,
                        task_libelle: row.task_libelle,
                        date_fin: row.date_fin,
                        days_until_end: row.days_until_end,
                        business_unit_id: row.business_unit_id
                    }
                });

                console.log(`📢 Notification de tâche proche de l'échéance envoyée à ${row.collaborateur_nom} ${row.collaborateur_prenom} (mission ${row.mission_nom})`);

                if (managementDelayDays > 0 && row.business_unit_id && row.days_until_end >= 0 && row.days_until_end <= managementDelayDays) {
                    const allManagers = await this.getBusinessUnitManagementUsers(row.business_unit_id);
                    // Filtrer pour ne garder que les managers impliqués dans la mission
                    const managers = allManagers.filter(m =>
                        m.id === row.associe_user_id ||
                        m.id === row.manager_user_id ||
                        m.id === row.responsable_user_id
                    );

                    for (const manager of managers) {
                        const existsRes = await pool.query(`
                            SELECT 1 FROM notifications n
                            WHERE n.type = 'MISSION_TASK_END_APPROACHING_MGMT'
                              AND n.user_id = $1
                              AND (n.metadata->>'mission_task_id')::uuid = $2
                              AND n.created_at > NOW() - INTERVAL '${managementDelayDays} days'
                            LIMIT 1
                        `, [manager.id, row.mission_task_id]);

                        if (existsRes.rows.length > 0) {
                            continue;
                        }

                        await NotificationService.createNotification({
                            type: 'MISSION_TASK_END_APPROACHING_MGMT',
                            title: 'Suivi mission: tâche proche de son échéance',
                            message: `La tâche "${row.task_libelle || ''}" de la mission "${row.mission_nom}" pour votre BU arrive à échéance dans ${row.days_until_end} jour(s).`,
                            user_id: manager.id,
                            priority: 'HIGH',
                            metadata: {
                                mission_id: row.mission_id,
                                mission_task_id: row.mission_task_id,
                                mission_nom: row.mission_nom,
                                task_libelle: row.task_libelle,
                                date_fin: row.date_fin,
                                days_until_end: row.days_until_end,
                                business_unit_id: row.business_unit_id,
                                management_role: manager.role_name
                            }
                        });

                        console.log(`📢 Notification management de tâche proche de l'échéance envoyée à ${manager.nom} ${manager.prenom} (mission ${row.mission_nom})`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la vérification des tâches de mission approchant de la date de fin:', error);
        }
    }

    static async checkMissionTaskOverdueNotClosed() {
        try {
            const automaticAlerts = await this.getAutomaticAlertsConfig();
            const cfg = automaticAlerts?.mission_task_overdue_not_closed || { userDelayDays: 2, managementDelayDays: 5 };
            const userDelayDays = typeof cfg.userDelayDays === 'number' && cfg.userDelayDays >= 0 ? cfg.userDelayDays : 2;
            const managementDelayDays = typeof cfg.managementDelayDays === 'number' && cfg.managementDelayDays >= 0 ? cfg.managementDelayDays : 5;

            if (userDelayDays === 0) {
                console.log('ℹ️ Alertes "tâche de mission en retard non clôturée" désactivées (userDelayDays = 0).');
                return;
            }

            const query = `
                SELECT 
                    mt.id AS mission_task_id,
                    mt.date_fin,
                    mt.statut AS task_statut,
                    m.id AS mission_id,
                    m.nom AS mission_nom,
                    m.business_unit_id,
                    t.libelle AS task_libelle,
                    ta.collaborateur_id,
                    c.nom AS collaborateur_nom,
                    c.prenom AS collaborateur_prenom,
                    u_collab.id AS user_id,
                    ta.heures_planifiees,
                    ta.heures_effectuees,
                    (CURRENT_DATE - mt.date_fin::date) AS days_overdue,
                    (SELECT id FROM users WHERE collaborateur_id = m.associe_id AND statut = 'ACTIF' LIMIT 1) as associe_user_id,
                    (SELECT id FROM users WHERE collaborateur_id = m.manager_id AND statut = 'ACTIF' LIMIT 1) as manager_user_id,
                    (SELECT id FROM users WHERE collaborateur_id = m.collaborateur_id AND statut = 'ACTIF' LIMIT 1) as responsable_user_id
                FROM mission_tasks mt
                JOIN missions m ON m.id = mt.mission_id
                LEFT JOIN tasks t ON t.id = mt.task_id
                JOIN task_assignments ta ON ta.mission_task_id = mt.id
                JOIN collaborateurs c ON c.id = ta.collaborateur_id
                LEFT JOIN users u_collab ON u_collab.collaborateur_id = c.id
                WHERE mt.date_fin IS NOT NULL
                  AND mt.date_fin::date < CURRENT_DATE
                  AND mt.statut NOT IN ('TERMINEE', 'CLOTUREE')
                  AND u_collab.id IS NOT NULL
                  AND COALESCE(ta.heures_effectuees, 0) < COALESCE(ta.heures_planifiees, 0)
                  AND NOT EXISTS (
                      SELECT 1 FROM notifications n
                      WHERE n.type = 'MISSION_TASK_OVERDUE_NOT_CLOSED'
                        AND n.user_id = u_collab.id
                        AND (n.metadata->>'mission_task_id')::uuid = mt.id
                        AND n.created_at > NOW() - INTERVAL '${userDelayDays} days'
                  )
            `;

            const result = await pool.query(query);

            if (result.rows.length === 0) {
                console.log('✅ Aucune tâche de mission en retard non clôturée à notifier');
                return;
            }

            for (const row of result.rows) {
                await NotificationService.createNotification({
                    type: 'MISSION_TASK_OVERDUE_NOT_CLOSED',
                    title: 'Tâche de mission en retard non clôturée',
                    message: `La tâche "${row.task_libelle || ''}" de la mission "${row.mission_nom}" est en retard depuis ${row.days_overdue} jour(s) et vos heures ne sont pas totalement chargées (${row.heures_effectuees || 0}/${row.heures_planifiees || 0} h).`,
                    user_id: row.user_id,
                    priority: 'HIGH',
                    metadata: {
                        mission_id: row.mission_id,
                        mission_task_id: row.mission_task_id,
                        mission_nom: row.mission_nom,
                        task_libelle: row.task_libelle,
                        date_fin: row.date_fin,
                        days_overdue: row.days_overdue,
                        heures_planifiees: row.heures_planifiees,
                        heures_effectuees: row.heures_effectuees,
                        business_unit_id: row.business_unit_id
                    }
                });

                console.log(`📢 Notification de tâche en retard envoyée à ${row.collaborateur_nom} ${row.collaborateur_prenom} (mission ${row.mission_nom})`);

                if (managementDelayDays > 0 && row.business_unit_id && row.days_overdue >= managementDelayDays) {
                    const allManagers = await this.getBusinessUnitManagementUsers(row.business_unit_id);
                    const managers = allManagers.filter(m =>
                        m.id === row.associe_user_id ||
                        m.id === row.manager_user_id ||
                        m.id === row.responsable_user_id
                    );

                    for (const manager of managers) {
                        const existsRes = await pool.query(`
                            SELECT 1 FROM notifications n
                            WHERE n.type = 'MISSION_TASK_OVERDUE_NOT_CLOSED_MGMT'
                              AND n.user_id = $1
                              AND (n.metadata->>'mission_task_id')::uuid = $2
                              AND n.created_at > NOW() - INTERVAL '${managementDelayDays} days'
                            LIMIT 1
                        `, [manager.id, row.mission_task_id]);

                        if (existsRes.rows.length > 0) {
                            continue;
                        }

                        await NotificationService.createNotification({
                            type: 'MISSION_TASK_OVERDUE_NOT_CLOSED_MGMT',
                            title: 'Suivi mission: tâche en retard non clôturée',
                            message: `La tâche "${row.task_libelle || ''}" de la mission "${row.mission_nom}" pour votre BU est en retard depuis ${row.days_overdue} jour(s) avec des heures non totalement chargées (${row.heures_effectuees || 0}/${row.heures_planifiees || 0} h).`,
                            user_id: manager.id,
                            priority: 'HIGH',
                            metadata: {
                                mission_id: row.mission_id,
                                mission_task_id: row.mission_task_id,
                                mission_nom: row.mission_nom,
                                task_libelle: row.task_libelle,
                                date_fin: row.date_fin,
                                days_overdue: row.days_overdue,
                                heures_planifiees: row.heures_planifiees,
                                heures_effectuees: row.heures_effectuees,
                                business_unit_id: row.business_unit_id,
                                management_role: manager.role_name
                            }
                        });

                        console.log(`📢 Notification management de tâche en retard envoyée à ${manager.nom} ${manager.prenom} (mission ${row.mission_nom})`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la vérification des tâches de mission en retard non clôturées:', error);
        }
    }

    /**
     * Vérifier les missions dont la facturation des honoraires est en retard
     */
    static async checkMissionFeeBillingOverdue() {
        try {
            const automaticAlerts = await this.getAutomaticAlertsConfig();
            const cfg = automaticAlerts?.mission_fee_billing_overdue || { userDelayDays: 3, managementDelayDays: 7 };
            const userDelayDays = typeof cfg.userDelayDays === 'number' && cfg.userDelayDays >= 0 ? cfg.userDelayDays : 3;
            const managementDelayDays = typeof cfg.managementDelayDays === 'number' && cfg.managementDelayDays >= 0 ? cfg.managementDelayDays : 7;

            if (userDelayDays === 0) {
                console.log('ℹ️ Alertes "facturation honoraires missions en retard" désactivées (userDelayDays = 0).');
                return;
            }

            const query = `
                SELECT
                    m.id AS mission_id,
                    m.nom AS mission_nom,
                    m.business_unit_id,
                    m.collaborateur_id AS manager_collaborateur_id,
                    bu.nom AS business_unit_nom,
                    COALESCE(m.montant_honoraires, 0) AS montant_honoraires,
                    COALESCE(SUM(i.montant_ht), 0) AS total_facture_ht,
                    GREATEST((CURRENT_DATE - m.date_fin::date), 0) AS days_overdue,
                    (SELECT id FROM users WHERE collaborateur_id = m.associe_id AND statut = 'ACTIF' LIMIT 1) as associe_user_id,
                    (SELECT id FROM users WHERE collaborateur_id = m.manager_id AND statut = 'ACTIF' LIMIT 1) as manager_user_id,
                    (SELECT id FROM users WHERE collaborateur_id = m.collaborateur_id AND statut = 'ACTIF' LIMIT 1) as responsable_user_id
                FROM missions m
                LEFT JOIN business_units bu ON m.business_unit_id = bu.id
                LEFT JOIN invoices i ON i.mission_id = m.id AND i.statut NOT IN ('ANNULEE')
                WHERE m.statut IN ('EN_COURS', 'TERMINEE')
                  AND m.date_fin IS NOT NULL
                  AND m.date_fin::date < CURRENT_DATE - INTERVAL '${userDelayDays} days'
                  AND COALESCE(m.montant_honoraires, 0) > 0
                GROUP BY m.id, m.nom, m.business_unit_id, m.collaborateur_id, bu.nom
                HAVING COALESCE(m.montant_honoraires, 0) > COALESCE(SUM(i.montant_ht), 0)
            `;

            const result = await pool.query(query);

            if (result.rows.length === 0) {
                console.log('✅ Aucune mission avec honoraires en retard de facturation');
                return;
            }

            for (const row of result.rows) {
                // Résoudre l'utilisateur manager de mission
                const userRes = await pool.query(`
                    SELECT u.id
                    FROM users u
                    WHERE u.collaborateur_id = $1
                      AND u.statut = 'ACTIF'
                    LIMIT 1
                `, [row.manager_collaborateur_id]);

                const userId = userRes.rows[0]?.id || null;
                if (!userId) {
                    continue;
                }

                // Anti-spam: éviter les doublons récents
                const existsRes = await pool.query(`
                    SELECT 1 FROM notifications n
                    WHERE n.type = 'MISSION_FEE_BILLING_OVERDUE'
                      AND n.user_id = $1
                      AND (n.metadata->>'mission_id')::uuid = $2
                      AND n.created_at > NOW() - INTERVAL '${userDelayDays} days'
                    LIMIT 1
                `, [userId, row.mission_id]);

                if (existsRes.rows.length === 0) {
                    await NotificationService.createNotification({
                        type: 'MISSION_FEE_BILLING_OVERDUE',
                        title: 'Mission: honoraires en retard de facturation',
                        message: `La mission "${row.mission_nom}" a des honoraires non facturés depuis ${row.days_overdue} jour(s) après la date de fin.`,
                        user_id: userId,
                        priority: 'NORMAL',
                        metadata: {
                            mission_id: row.mission_id,
                            mission_nom: row.mission_nom,
                            business_unit_id: row.business_unit_id,
                            business_unit_nom: row.business_unit_nom,
                            montant_honoraires: row.montant_honoraires,
                            total_facture_ht: row.total_facture_ht,
                            days_overdue: row.days_overdue
                        }
                    });

                    console.log(`📢 Notification honoraires en retard envoyée (mission ${row.mission_nom})`);
                }

                // Notifications management
                if (managementDelayDays > 0 && row.business_unit_id && row.days_overdue >= managementDelayDays) {
                    const allManagers = await this.getBusinessUnitManagementUsers(row.business_unit_id);
                    const managers = allManagers.filter(m =>
                        m.id === row.associe_user_id ||
                        m.id === row.manager_user_id ||
                        m.id === row.responsable_user_id
                    );
                    for (const manager of managers) {
                        const existsMgmt = await pool.query(`
                            SELECT 1 FROM notifications n
                            WHERE n.type = 'MISSION_FEE_BILLING_OVERDUE_MGMT'
                              AND n.user_id = $1
                              AND (n.metadata->>'mission_id')::uuid = $2
                              AND n.created_at > NOW() - INTERVAL '${managementDelayDays} days'
                            LIMIT 1
                        `, [manager.id, row.mission_id]);

                        if (existsMgmt.rows.length > 0) {
                            continue;
                        }

                        await NotificationService.createNotification({
                            type: 'MISSION_FEE_BILLING_OVERDUE_MGMT',
                            title: 'Suivi facturation: honoraires en retard',
                            message: `La mission "${row.mission_nom}" de votre BU a des honoraires non facturés depuis ${row.days_overdue} jour(s) après la date de fin.`,
                            user_id: manager.id,
                            priority: 'HIGH',
                            metadata: {
                                mission_id: row.mission_id,
                                mission_nom: row.mission_nom,
                                business_unit_id: row.business_unit_id,
                                business_unit_nom: row.business_unit_nom,
                                montant_honoraires: row.montant_honoraires,
                                total_facture_ht: row.total_facture_ht,
                                days_overdue: row.days_overdue,
                                management_role: manager.role_name
                            }
                        });

                        console.log(`📢 Notification management honoraires en retard envoyée à ${manager.nom} ${manager.prenom} (mission ${row.mission_nom})`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la vérification des honoraires de missions en retard de facturation:', error);
        }
    }

    /**
     * Vérifier les échéances de facturation basées sur les conditions de paiement (tranches)
     */
    static async checkUpcomingBillingConditions() {
        try {
            console.log('🔍 Vérification des échéances de facturation (conditions de paiement)...');
            const automaticAlerts = await this.getAutomaticAlertsConfig();
            const cfg = automaticAlerts?.mission_fee_billing_overdue || { userDelayDays: 3 };
            const alertDays = typeof cfg.userDelayDays === 'number' ? cfg.userDelayDays : 3;

            // 1. Récupérer les missions actives avec conditions de paiement
            const missionsQuery = `
                SELECT 
                    m.id AS mission_id, 
                    m.nom AS mission_nom, 
                    m.conditions_paiement, 
                    m.collaborateur_id AS manager_collaborateur_id,
                    m.business_unit_id,
                    bu.nom AS business_unit_nom
                FROM missions m
                LEFT JOIN business_units bu ON m.business_unit_id = bu.id
                WHERE m.statut = 'EN_COURS' 
                AND m.conditions_paiement IS NOT NULL
            `;

            const missionsResult = await pool.query(missionsQuery);

            for (const mission of missionsResult.rows) {
                // Parser les conditions
                let conditions = [];
                try {
                    conditions = JSON.parse(mission.conditions_paiement);
                    if (!Array.isArray(conditions)) conditions = Object.values(conditions);
                } catch (e) { continue; }

                // Récupérer le total déjà facturé
                const invoicesQuery = `
                    SELECT SUM(montant_ht) as total_facture
                    FROM invoices 
                    WHERE mission_id = $1 AND statut != 'ANNULEE'
                `;
                const invoicesResult = await pool.query(invoicesQuery, [mission.mission_id]);
                const totalFacture = parseFloat(invoicesResult.rows[0].total_facture || 0);

                let cumulAttendu = 0;

                for (let i = 0; i < conditions.length; i++) {
                    const cond = conditions[i];
                    const montantPrevu = parseFloat(cond.montant_honoraires || 0) + parseFloat(cond.montant_debours || 0);
                    cumulAttendu += montantPrevu;

                    // Si cette tranche n'est pas encore totalement couverte par les factures
                    if (totalFacture < cumulAttendu - 1) {
                        // Vérifier la date
                        if (cond.date_prevue) {
                            const datePrevue = new Date(cond.date_prevue);
                            const today = new Date();
                            const diffTime = datePrevue - today;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            // Si l'échéance est proche (ex: dans 3 jours) ou passée (négatif)
                            if (diffDays <= alertDays) {
                                // Identifier le manager (user)
                                const userRes = await pool.query(`
                                    SELECT u.id FROM users u WHERE u.collaborateur_id = $1 AND u.statut = 'ACTIF' LIMIT 1
                                `, [mission.manager_collaborateur_id]);

                                const userId = userRes.rows[0]?.id;
                                if (!userId) break;

                                // Vérifier si notif déjà envoyée pour cette tranche récemment
                                const notifType = diffDays < 0 ? 'BILLING_CONDITION_OVERDUE' : 'BILLING_CONDITION_UPCOMING';
                                const existsRes = await pool.query(`
                                    SELECT 1 FROM notifications n
                                    WHERE n.type = $1
                                      AND n.user_id = $2
                                      AND (n.metadata->>'mission_id')::uuid = $3
                                      AND (n.metadata->>'condition_index')::int = $4
                                      AND n.created_at > NOW() - INTERVAL '7 days'
                                    LIMIT 1
                                `, [notifType, userId, mission.mission_id, i]);

                                if (existsRes.rows.length === 0) {
                                    const message = diffDays < 0
                                        ? `Facturation en retard : La tranche "${cond.details || 'Tranche ' + (i + 1)}" de la mission "${mission.mission_nom}" était prévue le ${new Date(cond.date_prevue).toLocaleDateString()}.`
                                        : `Facturation à venir : La tranche "${cond.details || 'Tranche ' + (i + 1)}" de la mission "${mission.mission_nom}" est prévue pour le ${new Date(cond.date_prevue).toLocaleDateString()}.`;

                                    await NotificationService.createNotification({
                                        type: notifType,
                                        title: diffDays < 0 ? 'Facturation en retard' : 'Prochaine facturation',
                                        message: message,
                                        user_id: userId,
                                        priority: diffDays < 0 ? 'HIGH' : 'NORMAL',
                                        metadata: {
                                            mission_id: mission.mission_id,
                                            mission_nom: mission.mission_nom,
                                            condition_index: i,
                                            date_prevue: cond.date_prevue,
                                            montant: montantPrevu,
                                            business_unit_id: mission.business_unit_id
                                        }
                                    });
                                    console.log(`📢 Notification facturation (${notifType}) envoyée pour mission ${mission.mission_nom}`);
                                }
                            }
                        }
                        // On s'arrête à la première tranche non payée
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la vérification des échéances de facturation:', error);
        }
    }

    /**
     * Vérifier les missions dont la facturation des débours/frais est en retard
     */
    static async checkMissionExpenseBillingOverdue() {
        try {
            const automaticAlerts = await this.getAutomaticAlertsConfig();
            const cfg = automaticAlerts?.mission_expense_billing_overdue || { userDelayDays: 3, managementDelayDays: 7 };
            const userDelayDays = typeof cfg.userDelayDays === 'number' && cfg.userDelayDays >= 0 ? cfg.userDelayDays : 3;
            const managementDelayDays = typeof cfg.managementDelayDays === 'number' && cfg.managementDelayDays >= 0 ? cfg.managementDelayDays : 7;

            if (userDelayDays === 0) {
                console.log('ℹ️ Alertes "facturation débours missions en retard" désactivées (userDelayDays = 0).');
                return;
            }

            // Approche simple: missions avec montant_debours > 0, date_fin dépassée,
            // et aucune facture associée (mission non facturée pour les débours).
            const query = `
                SELECT
                    m.id AS mission_id,
                    m.nom AS mission_nom,
                    m.business_unit_id,
                    m.collaborateur_id AS manager_collaborateur_id,
                    bu.nom AS business_unit_nom,
                    COALESCE(m.montant_debours, 0) AS montant_debours,
                    COALESCE(COUNT(i.id), 0) AS nb_factures,
                    GREATEST((CURRENT_DATE - m.date_fin::date), 0) AS days_overdue,
                    (SELECT id FROM users WHERE collaborateur_id = m.associe_id AND statut = 'ACTIF' LIMIT 1) as associe_user_id,
                    (SELECT id FROM users WHERE collaborateur_id = m.manager_id AND statut = 'ACTIF' LIMIT 1) as manager_user_id,
                    (SELECT id FROM users WHERE collaborateur_id = m.collaborateur_id AND statut = 'ACTIF' LIMIT 1) as responsable_user_id
                FROM missions m
                LEFT JOIN business_units bu ON m.business_unit_id = bu.id
                LEFT JOIN invoices i ON i.mission_id = m.id AND i.statut NOT IN ('ANNULEE')
                WHERE m.statut IN ('EN_COURS', 'TERMINEE')
                  AND m.date_fin IS NOT NULL
                  AND m.date_fin::date < CURRENT_DATE - INTERVAL '${userDelayDays} days'
                  AND COALESCE(m.montant_debours, 0) > 0
                GROUP BY m.id, m.nom, m.business_unit_id, m.collaborateur_id, bu.nom
                HAVING COALESCE(COUNT(i.id), 0) = 0
            `;

            const result = await pool.query(query);

            if (result.rows.length === 0) {
                console.log('✅ Aucune mission avec débours en retard de facturation');
                return;
            }

            for (const row of result.rows) {
                const userRes = await pool.query(`
                    SELECT u.id
                    FROM users u
                    WHERE u.collaborateur_id = $1
                      AND u.statut = 'ACTIF'
                    LIMIT 1
                `, [row.manager_collaborateur_id]);

                const userId = userRes.rows[0]?.id || null;
                if (!userId) {
                    continue;
                }

                const existsRes = await pool.query(`
                    SELECT 1 FROM notifications n
                    WHERE n.type = 'MISSION_EXPENSE_BILLING_OVERDUE'
                      AND n.user_id = $1
                      AND (n.metadata->>'mission_id')::uuid = $2
                      AND n.created_at > NOW() - INTERVAL '${userDelayDays} days'
                    LIMIT 1
                `, [userId, row.mission_id]);

                if (existsRes.rows.length === 0) {
                    await NotificationService.createNotification({
                        type: 'MISSION_EXPENSE_BILLING_OVERDUE',
                        title: 'Mission: débours en retard de facturation',
                        message: `La mission "${row.mission_nom}" a des débours non facturés depuis ${row.days_overdue} jour(s) après la date de fin.`,
                        user_id: userId,
                        priority: 'NORMAL',
                        metadata: {
                            mission_id: row.mission_id,
                            mission_nom: row.mission_nom,
                            business_unit_id: row.business_unit_id,
                            business_unit_nom: row.business_unit_nom,
                            montant_debours: row.montant_debours,
                            days_overdue: row.days_overdue
                        }
                    });

                    console.log(`📢 Notification débours en retard envoyée (mission ${row.mission_nom})`);
                }

                if (managementDelayDays > 0 && row.business_unit_id && row.days_overdue >= managementDelayDays) {
                    const allManagers = await this.getBusinessUnitManagementUsers(row.business_unit_id);
                    const managers = allManagers.filter(m =>
                        m.id === row.associe_user_id ||
                        m.id === row.manager_user_id ||
                        m.id === row.responsable_user_id
                    );
                    for (const manager of managers) {
                        const existsMgmt = await pool.query(`
                            SELECT 1 FROM notifications n
                            WHERE n.type = 'MISSION_EXPENSE_BILLING_OVERDUE_MGMT'
                              AND n.user_id = $1
                              AND (n.metadata->>'mission_id')::uuid = $2
                              AND n.created_at > NOW() - INTERVAL '${managementDelayDays} days'
                            LIMIT 1
                        `, [manager.id, row.mission_id]);

                        if (existsMgmt.rows.length > 0) {
                            continue;
                        }

                        await NotificationService.createNotification({
                            type: 'MISSION_EXPENSE_BILLING_OVERDUE_MGMT',
                            title: 'Suivi facturation: débours en retard',
                            message: `La mission "${row.mission_nom}" de votre BU a des débours non facturés depuis ${row.days_overdue} jour(s) après la date de fin.`,
                            user_id: manager.id,
                            priority: 'HIGH',
                            metadata: {
                                mission_id: row.mission_id,
                                mission_nom: row.mission_nom,
                                business_unit_id: row.business_unit_id,
                                business_unit_nom: row.business_unit_nom,
                                montant_debours: row.montant_debours,
                                days_overdue: row.days_overdue,
                                management_role: manager.role_name
                            }
                        });

                        console.log(`📢 Notification management débours en retard envoyée à ${manager.nom} ${manager.prenom} (mission ${row.mission_nom})`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la vérification des débours de missions en retard de facturation:', error);
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
