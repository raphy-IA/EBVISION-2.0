const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');
const EmailService = require('../services/emailService');
const CronService = require('../services/cronService');

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
            opportunity_stage_overdue:      { userDelayDays: 3, managementDelayDays: 7 },
            opportunity_inactive:           { userDelayDays: 14, managementDelayDays: 30 },

            // Missions
            mission_inactive:               { userDelayDays: 7, managementDelayDays: 14 },

            // Feuilles de temps
            timesheet_not_submitted:        { userDelayDays: 2, managementDelayDays: 5 },   // user = collaborateur
            timesheet_not_validated_superv: { userDelayDays: 2, managementDelayDays: 5 },   // user = superviseur

            // Facturation missions
            mission_fee_billing_overdue:     { userDelayDays: 3, managementDelayDays: 7 },  // user = manager mission
            mission_expense_billing_overdue: { userDelayDays: 3, managementDelayDays: 7 },  // user = manager mission

            // Campagnes de prospection
            campaign_validation_pending:    { userDelayDays: 3, managementDelayDays: 7 },
            campaign_not_launched:          { userDelayDays: 5, managementDelayDays: 10 }
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
                    timesheet_rejected: { enabled: true, email: true, notification: true }
                }),
                JSON.stringify({
                    overdueThreshold: 1,
                    inactiveThreshold: 7,
                    notificationRetention: 30,
                    timezone: 'Europe/Paris'
                }),
                JSON.stringify({
                    // Opportunités
                    opportunity_stage_overdue:      { userDelayDays: 3, managementDelayDays: 7 },
                    opportunity_inactive:           { userDelayDays: 14, managementDelayDays: 30 },

                    // Missions
                    mission_inactive:               { userDelayDays: 7, managementDelayDays: 14 },

                    // Feuilles de temps
                    timesheet_not_submitted:        { userDelayDays: 2, managementDelayDays: 5 },
                    timesheet_not_validated_superv: { userDelayDays: 2, managementDelayDays: 5 },

                    // Facturation missions
                    mission_fee_billing_overdue:     { userDelayDays: 3, managementDelayDays: 7 },
                    mission_expense_billing_overdue: { userDelayDays: 3, managementDelayDays: 7 },

                    // Campagnes de prospection
                    campaign_validation_pending:    { userDelayDays: 3, managementDelayDays: 7 },
                    campaign_not_launched:          { userDelayDays: 5, managementDelayDays: 10 }
                })
            ]);
        }
    } catch (error) {
        console.error('Erreur lors de la création de la table de paramètres:', error);
        throw error;
    }
}

module.exports = router;
