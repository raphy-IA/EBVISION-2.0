const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');
const EmailService = require('../services/emailService');
const CronService = require('../services/cronService');
const nodemailer = require('nodemailer');

// Table pour stocker les paramètres de configuration
const NOTIFICATION_SETTINGS_TABLE = 'notification_settings';

// Récupérer tous les paramètres de configuration
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Vérifier si la table existe, sinon la créer
        await createSettingsTableIfNotExists();
        
        const result = await pool.query(`
            SELECT * FROM ${NOTIFICATION_SETTINGS_TABLE} 
            WHERE user_id = $1 OR user_id IS NULL 
            ORDER BY user_id NULLS LAST
        `, [req.user.id]);
        
        // Fusionner les paramètres globaux et utilisateur
        const globalSettings = result.rows.find(row => row.user_id === null) || {};
        const userSettings = result.rows.find(row => row.user_id === req.user.id) || {};

        // Valeurs par défaut pour la configuration des alertes automatiques (globales)
        const defaultAutomaticAlerts = {
            // Opportunités
            opportunity_stage_overdue:      { userDelayDays: 3,  managementDelayDays: 7  },
            opportunity_inactive:           { userDelayDays: 14, managementDelayDays: 30 },

            // Missions (niveau mission global)
            mission_inactive:               { userDelayDays: 7,  managementDelayDays: 14 },

            // Missions - niveau tâches
            mission_task_end_approaching:   { userDelayDays: 3,  managementDelayDays: 7  },
            mission_task_overdue_not_closed:{ userDelayDays: 2,  managementDelayDays: 5  },

            // Feuilles de temps
            timesheet_not_submitted:        { userDelayDays: 2,  managementDelayDays: 5  },   // user = collaborateur
            timesheet_not_validated_superv: { userDelayDays: 2,  managementDelayDays: 5  },   // user = superviseur

            // Facturation missions
            mission_fee_billing_overdue:     { userDelayDays: 3,  managementDelayDays: 7  },  // user = manager mission
            mission_expense_billing_overdue: { userDelayDays: 3,  managementDelayDays: 7  },  // user = manager mission

            // Campagnes de prospection (global campagne)
            campaign_validation_pending:    { userDelayDays: 3,  managementDelayDays: 7  },
            campaign_not_launched:          { userDelayDays: 5,  managementDelayDays: 10 },

            // Campagnes de prospection - relance par entreprise
            campaign_company_followup_due:  { userDelayDays: 7,  managementDelayDays: 14 }
        };

        // Les paramètres sont stockés en snake_case dans la base (automatic_alerts)
        const globalAutomaticAlerts = globalSettings.automatic_alerts || null;
        const userAutomaticAlerts = userSettings.automatic_alerts || null;

        // Pour le moment, la configuration est essentiellement globale.
        // On permet néanmoins une éventuelle surcharge utilisateur si elle existe déjà.
        const mergedAutomaticAlerts = {
            ...defaultAutomaticAlerts,
            ...(globalAutomaticAlerts || {}),
            ...(userAutomaticAlerts || {})
        };

        const settings = {
            general: {
                enableNotifications: userSettings.general?.enableNotifications ?? globalSettings.general?.enableNotifications ?? true,
                enableEmailNotifications: userSettings.general?.enableEmailNotifications ?? globalSettings.general?.enableEmailNotifications ?? true,
                enableCronJobs: userSettings.general?.enableCronJobs ?? globalSettings.general?.enableCronJobs ?? true
            },
            email: {
                smtpHost: userSettings.email?.smtpHost ?? globalSettings.email?.smtpHost ?? 'smtp.gmail.com',
                smtpPort: userSettings.email?.smtpPort ?? globalSettings.email?.smtpPort ?? 587,
                smtpUser: userSettings.email?.smtpUser ?? globalSettings.email?.smtpUser ?? '',
                smtpFrom: userSettings.email?.smtpFrom ?? globalSettings.email?.smtpFrom ?? '',
                enableSSL: userSettings.email?.enableSSL ?? globalSettings.email?.enableSSL ?? true,
                enableDebug: userSettings.email?.enableDebug ?? globalSettings.email?.enableDebug ?? false
            },
            notificationTypes: {
                opportunity_stage_overdue: {
                    enabled: userSettings.notificationTypes?.opportunity_stage_overdue?.enabled ?? globalSettings.notificationTypes?.opportunity_stage_overdue?.enabled ?? true,
                    email: true,
                    notification: true
                },
                opportunity_won: {
                    enabled: userSettings.notificationTypes?.opportunity_won?.enabled ?? globalSettings.notificationTypes?.opportunity_won?.enabled ?? true,
                    email: true,
                    notification: true
                },
                opportunity_lost: {
                    enabled: userSettings.notificationTypes?.opportunity_lost?.enabled ?? globalSettings.notificationTypes?.opportunity_lost?.enabled ?? true,
                    email: true,
                    notification: true
                },
                opportunity_inactive: {
                    enabled: userSettings.notificationTypes?.opportunity_inactive?.enabled ?? globalSettings.notificationTypes?.opportunity_inactive?.enabled ?? true,
                    email: true,
                    notification: true
                },
                timesheet_overdue: {
                    enabled: userSettings.notificationTypes?.timesheet_overdue?.enabled ?? globalSettings.notificationTypes?.timesheet_overdue?.enabled ?? true,
                    email: true,
                    notification: true
                },
                timesheet_approved: {
                    enabled: userSettings.notificationTypes?.timesheet_approved?.enabled ?? globalSettings.notificationTypes?.timesheet_approved?.enabled ?? true,
                    email: true,
                    notification: true
                },
                timesheet_rejected: {
                    enabled: userSettings.notificationTypes?.timesheet_rejected?.enabled ?? globalSettings.notificationTypes?.timesheet_rejected?.enabled ?? true,
                    email: true,
                    notification: true
                },

                // Familles d'alertes automatiques (crons)
                opportunity_cron_alerts: {
                    enabled: userSettings.notificationTypes?.opportunity_cron_alerts?.enabled ?? globalSettings.notificationTypes?.opportunity_cron_alerts?.enabled ?? true,
                    email: true,
                    notification: true
                },
                campaign_cron_alerts: {
                    enabled: userSettings.notificationTypes?.campaign_cron_alerts?.enabled ?? globalSettings.notificationTypes?.campaign_cron_alerts?.enabled ?? true,
                    email: true,
                    notification: true
                },
                campaign_company_followup_cron_alerts: {
                    enabled: userSettings.notificationTypes?.campaign_company_followup_cron_alerts?.enabled ?? globalSettings.notificationTypes?.campaign_company_followup_cron_alerts?.enabled ?? true,
                    email: true,
                    notification: true
                },
                mission_inactive_cron_alerts: {
                    enabled: userSettings.notificationTypes?.mission_inactive_cron_alerts?.enabled ?? globalSettings.notificationTypes?.mission_inactive_cron_alerts?.enabled ?? true,
                    email: true,
                    notification: true
                },
                mission_task_cron_alerts: {
                    enabled: userSettings.notificationTypes?.mission_task_cron_alerts?.enabled ?? globalSettings.notificationTypes?.mission_task_cron_alerts?.enabled ?? true,
                    email: true,
                    notification: true
                },
                timesheet_cron_alerts: {
                    enabled: userSettings.notificationTypes?.timesheet_cron_alerts?.enabled ?? globalSettings.notificationTypes?.timesheet_cron_alerts?.enabled ?? true,
                    email: true,
                    notification: true
                },
                mission_billing_cron_alerts: {
                    enabled: userSettings.notificationTypes?.mission_billing_cron_alerts?.enabled ?? globalSettings.notificationTypes?.mission_billing_cron_alerts?.enabled ?? true,
                    email: true,
                    notification: true
                }
            },
            alerts: {
                overdueThreshold: userSettings.alerts?.overdueThreshold ?? globalSettings.alerts?.overdueThreshold ?? 1,
                inactiveThreshold: userSettings.alerts?.inactiveThreshold ?? globalSettings.alerts?.inactiveThreshold ?? 7,
                notificationRetention: userSettings.alerts?.notificationRetention ?? globalSettings.alerts?.notificationRetention ?? 30,
                timezone: userSettings.alerts?.timezone ?? globalSettings.alerts?.timezone ?? 'Europe/Paris'
            },
            // Nouvelle configuration centrale des délais d'alertes automatiques
            automaticAlerts: mergedAutomaticAlerts
        };
        
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des paramètres:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des paramètres'
        });
    }
});

// Tester la configuration email et envoyer un email de test
router.post('/test-email', authenticateToken, async (req, res) => {
    try {
        const { emailSettings, testEmail } = req.body || {};

        if (!emailSettings || !testEmail) {
            return res.status(400).json({
                success: false,
                error: 'Paramètres emailSettings et testEmail requis'
            });
        }

        const {
            smtpHost,
            smtpPort,
            smtpUser,
            smtpPassword,
            smtpFrom,
            enableSSL,
            enableDebug
        } = emailSettings;

        if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
            return res.status(400).json({
                success: false,
                error: 'SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASSWORD sont requis pour le test'
            });
        }

        const port = parseInt(smtpPort, 10) || 587;
        const secure = enableSSL === true || port === 465;

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port,
            secure,
            auth: {
                user: smtpUser,
                pass: smtpPassword
            },
            debug: !!enableDebug
        });

        // Vérifier la connexion SMTP
        await transporter.verify();

        // Envoyer un email de test simple
        const fromAddress = smtpFrom || smtpUser;

        await transporter.sendMail({
            from: fromAddress,
            to: testEmail,
            subject: 'Test configuration email - EB-Vision 2.0',
            text: 'Ceci est un email de test envoyé depuis la page de configuration des notifications EB-Vision 2.0.',
            html: '<p>Ceci est un <strong>email de test</strong> envoyé depuis la page de configuration des notifications EB-Vision 2.0.</p>'
        });

        return res.json({
            success: true,
            message: `Email de test envoyé avec succès à ${testEmail}`
        });
    } catch (error) {
        console.error('Erreur lors du test de configuration email:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors du test de configuration email'
        });
    }
});

// Sauvegarder les paramètres généraux
router.put('/general', authenticateToken, async (req, res) => {
    try {
        await createSettingsTableIfNotExists();
        
        const { enableNotifications, enableEmailNotifications, enableCronJobs } = req.body;
        
        await pool.query(`
            INSERT INTO ${NOTIFICATION_SETTINGS_TABLE} (user_id, general, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                general = $2,
                updated_at = CURRENT_TIMESTAMP
        `, [req.user.id, JSON.stringify({
            enableNotifications,
            enableEmailNotifications,
            enableCronJobs
        })]);

        // Sauvegarder également une configuration GLOBALE (user_id NULL)
        // qui pourra être utilisée par les services backend (ex: CronService)
        await pool.query(`
            INSERT INTO ${NOTIFICATION_SETTINGS_TABLE} (user_id, general, updated_at)
            VALUES (NULL, $1, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id)
            DO UPDATE SET
                general = $1,
                updated_at = CURRENT_TIMESTAMP
        `, [JSON.stringify({
            enableNotifications,
            enableEmailNotifications,
            enableCronJobs
        })]);
        
        res.json({
            success: true,
            message: 'Paramètres généraux sauvegardés'
        });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres généraux:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la sauvegarde des paramètres généraux'
        });
    }
});

// Sauvegarder la configuration email
router.put('/email', authenticateToken, async (req, res) => {
    try {
        await createSettingsTableIfNotExists();
        
        const emailSettings = req.body;
        
        // Mettre à jour les variables d'environnement pour l'ensemble de l'application
        process.env.EMAIL_USER = emailSettings.smtpUser;
        if (emailSettings.smtpPassword) {
            process.env.EMAIL_PASSWORD = emailSettings.smtpPassword;
        }
        process.env.EMAIL_FROM = emailSettings.smtpFrom;
        process.env.SMTP_HOST = emailSettings.smtpHost;
        process.env.SMTP_PORT = String(emailSettings.smtpPort || '587');
        process.env.SMTP_SECURE = emailSettings.enableSSL ? 'true' : 'false';
        process.env.SMTP_DEBUG = emailSettings.enableDebug ? 'true' : 'false';
        
        // Réinitialiser le service email avec les nouveaux paramètres
        await EmailService.initTransporter();
        
        // Sauvegarder la configuration pour l'utilisateur courant
        await pool.query(`
            INSERT INTO ${NOTIFICATION_SETTINGS_TABLE} (user_id, email, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                email = $2,
                updated_at = CURRENT_TIMESTAMP
        `, [req.user.id, JSON.stringify(emailSettings)]);

        // Sauvegarder également une configuration GLOBALE (user_id NULL)
        // qui servira de référence pour EmailService au démarrage
        await pool.query(`
            INSERT INTO ${NOTIFICATION_SETTINGS_TABLE} (user_id, email, updated_at)
            VALUES (NULL, $1, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id)
            DO UPDATE SET
                email = $1,
                updated_at = CURRENT_TIMESTAMP
        `, [JSON.stringify(emailSettings)]);
        
        res.json({
            success: true,
            message: 'Configuration email sauvegardée'
        });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la configuration email:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la sauvegarde de la configuration email'
        });
    }
});

// Sauvegarder les types de notifications
router.put('/notification-types', authenticateToken, async (req, res) => {
    try {
        await createSettingsTableIfNotExists();
        
        const notificationTypes = req.body;
        
        await pool.query(`
            INSERT INTO ${NOTIFICATION_SETTINGS_TABLE} (user_id, notification_types, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                notification_types = $2,
                updated_at = CURRENT_TIMESTAMP
        `, [req.user.id, JSON.stringify(notificationTypes)]);
        
        res.json({
            success: true,
            message: 'Types de notifications sauvegardés'
        });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des types de notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la sauvegarde des types de notifications'
        });
    }
});

// Sauvegarder les paramètres d'alertes
router.put('/alerts', authenticateToken, async (req, res) => {
    try {
        await createSettingsTableIfNotExists();
        
        const alertSettings = req.body;
        
        await pool.query(`
            INSERT INTO ${NOTIFICATION_SETTINGS_TABLE} (user_id, alerts, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                alerts = $2,
                updated_at = CURRENT_TIMESTAMP
        `, [req.user.id, JSON.stringify(alertSettings)]);
        
        res.json({
            success: true,
            message: 'Paramètres d\'alertes sauvegardés'
        });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres d\'alertes:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la sauvegarde des paramètres d\'alertes'
        });
    }
});

// Sauvegarder la configuration globale des alertes automatiques (délais utilisateur / management)
router.put('/automatic-alerts', authenticateToken, async (req, res) => {
    try {
        await createSettingsTableIfNotExists();

        const automaticAlerts = req.body;

        // Sauvegarde uniquement dans la configuration GLOBALE (user_id NULL)
        await pool.query(`
            INSERT INTO ${NOTIFICATION_SETTINGS_TABLE} (user_id, automatic_alerts, updated_at)
            VALUES (NULL, $1, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id)
            DO UPDATE SET
                automatic_alerts = $1,
                updated_at = CURRENT_TIMESTAMP
        `, [JSON.stringify(automaticAlerts)]);

        res.json({
            success: true,
            message: 'Configuration des alertes automatiques sauvegardée'
        });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la configuration des alertes automatiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la sauvegarde de la configuration des alertes automatiques'
        });
    }
});

// =========================
// Historique des notifications (utilisé par notification-settings.js)
// =========================

// Récupérer l'historique des notifications de l'utilisateur courant (ou globale en mode admin)
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const isAdmin = (req.user && (
            req.user.role === 'SUPER_ADMIN' ||
            (Array.isArray(req.user.roles) && req.user.roles.includes('SUPER_ADMIN'))
        )) || false;

        const baseQuery = `
            SELECT 
                n.id,
                n.type,
                n.title,
                n.message,
                n.priority,
                n.created_at,
                n.read_at,
                u.id   AS user_id,
                u.nom  AS user_nom,
                u.prenom AS user_prenom,
                u.login  AS user_login,
                o.nom  AS opportunity_name,
                (n.metadata->>'campaign_name') AS campaign_name
            FROM notifications n
            LEFT JOIN users u ON n.user_id = u.id
            LEFT JOIN opportunities o ON n.opportunity_id = o.id
        `;

        let whereClause = 'WHERE n.user_id = $1';
        const params = [req.user.id];

        // En mode admin, on peut filtrer sur un utilisateur précis via ?user_id=...
        if (isAdmin && req.query.user_id) {
            whereClause = 'WHERE n.user_id = $1';
            params[0] = req.query.user_id;
        }

        const query = `
            ${baseQuery}
            ${whereClause}
            ORDER BY n.created_at DESC
            LIMIT 200
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            isAdmin
        });
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique de notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement de l\'historique de notifications'
        });
    }
});

// Vider l'historique des notifications
router.delete('/clear-history', authenticateToken, async (req, res) => {
    try {
        const isAdmin = (req.user && (
            req.user.role === 'SUPER_ADMIN' ||
            (Array.isArray(req.user.roles) && req.user.roles.includes('SUPER_ADMIN'))
        )) || false;

        const { user_id: targetUserId, confirm_all } = req.query;

        if (isAdmin && confirm_all === 'true') {
            // Purge complète (admin only)
            await pool.query('DELETE FROM notifications');
            return res.json({
                success: true,
                message: 'Historique des notifications vidé pour tous les utilisateurs'
            });
        }

        if (isAdmin && targetUserId) {
            // Purge ciblée sur un utilisateur (admin only)
            await pool.query('DELETE FROM notifications WHERE user_id = $1', [targetUserId]);
            return res.json({
                success: true,
                message: `Historique des notifications vidé pour l\'utilisateur ${targetUserId}`
            });
        }

        // Cas par défaut : vider l'historique de l'utilisateur courant uniquement
        await pool.query('DELETE FROM notifications WHERE user_id = $1', [req.user.id]);

        res.json({
            success: true,
            message: 'Historique des notifications vidé pour l\'utilisateur courant'
        });
    } catch (error) {
        console.error('Erreur lors du vidage de l\'historique de notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du vidage de l\'historique de notifications'
        });
    }
});

// Endpoint de test des tâches cron (appelé depuis le bouton "Tester les tâches")
router.post('/test-cron', authenticateToken, async (req, res) => {
    try {
        // On ne lance pas réellement les crons depuis ce bouton en prod, on renvoie juste un succès.
        // Si besoin, on pourrait déclencher ici certaines vérifications ciblées.
        res.json({
            success: true,
            message: 'Test des tâches cron déclenché (simulation)'
        });
    } catch (error) {
        console.error('Erreur lors du test des tâches cron:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du test des tâches cron'
        });
    }
});

// Créer la table de paramètres si elle n'existe pas
async function createSettingsTableIfNotExists() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${NOTIFICATION_SETTINGS_TABLE} (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id),
                general JSONB,
                email JSONB,
                notification_types JSONB,
                alerts JSONB,
                automatic_alerts JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            )
        `);
        
        // Insérer les paramètres par défaut si aucun n'existe
        const existingSettings = await pool.query(`
            SELECT COUNT(*) as count FROM ${NOTIFICATION_SETTINGS_TABLE}
        `);
        
        if (parseInt(existingSettings.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO ${NOTIFICATION_SETTINGS_TABLE} (user_id, general, email, notification_types, alerts, automatic_alerts)
                VALUES (NULL, $1, $2, $3, $4, $5)
            `, [
                JSON.stringify({
                    enableNotifications: true,
                    enableEmailNotifications: true,
                    enableCronJobs: true
                }),
                JSON.stringify({
                    smtpHost: 'smtp.gmail.com',
                    smtpPort: 587,
                    smtpUser: '',
                    smtpFrom: '',
                    enableSSL: true,
                    enableDebug: false
                }),
                JSON.stringify({
                    opportunity_stage_overdue: { enabled: true, email: true, notification: true },
                    opportunity_won: { enabled: true, email: true, notification: true },
                    opportunity_lost: { enabled: true, email: true, notification: true },
                    opportunity_inactive: { enabled: true, email: true, notification: true },
                    timesheet_overdue: { enabled: true, email: true, notification: true },
                    timesheet_approved: { enabled: true, email: true, notification: true },
                    timesheet_rejected: { enabled: true, email: true, notification: true },

                    // Familles d'alertes automatiques (crons)
                    opportunity_cron_alerts: { enabled: true, email: true, notification: true },
                    campaign_cron_alerts: { enabled: true, email: true, notification: true },
                    campaign_company_followup_cron_alerts: { enabled: true, email: true, notification: true },
                    mission_inactive_cron_alerts: { enabled: true, email: true, notification: true },
                    mission_task_cron_alerts: { enabled: true, email: true, notification: true },
                    timesheet_cron_alerts: { enabled: true, email: true, notification: true },
                    mission_billing_cron_alerts: { enabled: true, email: true, notification: true }
                }),
                JSON.stringify({
                    overdueThreshold: 1,
                    inactiveThreshold: 7,
                    notificationRetention: 30,
                    timezone: 'Europe/Paris'
                }),
                JSON.stringify({
                    // Opportunités
                    opportunity_stage_overdue:       { userDelayDays: 3,  managementDelayDays: 7  },
                    opportunity_inactive:            { userDelayDays: 14, managementDelayDays: 30 },

                    // Missions (niveau mission global)
                    mission_inactive:                { userDelayDays: 7,  managementDelayDays: 14 },

                    // Missions - niveau tâches
                    mission_task_end_approaching:    { userDelayDays: 3,  managementDelayDays: 7  },
                    mission_task_overdue_not_closed: { userDelayDays: 2,  managementDelayDays: 5  },

                    // Feuilles de temps
                    timesheet_not_submitted:         { userDelayDays: 2,  managementDelayDays: 5  },
                    timesheet_not_validated_superv:  { userDelayDays: 2,  managementDelayDays: 5  },

                    // Facturation missions
                    mission_fee_billing_overdue:     { userDelayDays: 3,  managementDelayDays: 7  },
                    mission_expense_billing_overdue: { userDelayDays: 3,  managementDelayDays: 7  },

                    // Campagnes de prospection (global campagne)
                    campaign_validation_pending:     { userDelayDays: 3,  managementDelayDays: 7  },
                    campaign_not_launched:           { userDelayDays: 5,  managementDelayDays: 10 },

                    // Campagnes de prospection - relance par entreprise
                    campaign_company_followup_due:   { userDelayDays: 7,  managementDelayDays: 14 }
                })
            ]);
        }
    } catch (error) {
        console.error('Erreur lors de la création de la table de paramètres:', error);
        throw error;
    }
}

module.exports = router;
