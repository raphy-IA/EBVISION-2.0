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
            }
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
        
        // Mettre à jour les variables d'environnement
        process.env.EMAIL_USER = emailSettings.smtpUser;
        process.env.EMAIL_PASSWORD = emailSettings.smtpPassword;
        process.env.EMAIL_FROM = emailSettings.smtpFrom;
        
        // Réinitialiser le service email avec les nouveaux paramètres
        EmailService.initTransporter();
        
        await pool.query(`
            INSERT INTO ${NOTIFICATION_SETTINGS_TABLE} (user_id, email, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                email = $2,
                updated_at = CURRENT_TIMESTAMP
        `, [req.user.id, JSON.stringify(emailSettings)]);
        
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

// Tester la configuration email
router.post('/test-email', authenticateToken, async (req, res) => {
    try {
        const { emailSettings, testEmail } = req.body;
        
        // Créer un transporteur temporaire pour le test
        const testTransporter = require('nodemailer').createTransport({
            host: emailSettings.smtpHost,
            port: emailSettings.smtpPort,
            secure: emailSettings.enableSSL,
            auth: {
                user: emailSettings.smtpUser,
                pass: emailSettings.smtpPassword
            },
            debug: emailSettings.enableDebug
        });
        
        // Envoyer un email de test
        const mailOptions = {
            from: emailSettings.smtpFrom,
            to: testEmail,
            subject: 'Test de configuration - TRS Notifications',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
                        <h1>✅ Test de Configuration Réussi</h1>
                    </div>
                    <div style="padding: 20px; background-color: #f8f9fa;">
                        <p>Bonjour,</p>
                        <p>Ceci est un email de test pour vérifier que la configuration SMTP de TRS est correcte.</p>
                        <p><strong>Configuration testée :</strong></p>
                        <ul>
                            <li>Serveur SMTP: ${emailSettings.smtpHost}</li>
                            <li>Port: ${emailSettings.smtpPort}</li>
                            <li>SSL/TLS: ${emailSettings.enableSSL ? 'Activé' : 'Désactivé'}</li>
                            <li>Utilisateur: ${emailSettings.smtpUser}</li>
                        </ul>
                        <p>Si vous recevez cet email, cela signifie que la configuration est correcte et que les notifications par email fonctionneront correctement.</p>
                        <p>Cordialement,<br>L'équipe TRS</p>
                    </div>
                </div>
            `
        };
        
        await testTransporter.sendMail(mailOptions);
        
        res.json({
            success: true,
            message: 'Email de test envoyé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors du test email:', error);
        res.status(500).json({
            success: false,
            error: `Erreur lors du test email: ${error.message}`
        });
    }
});

// Tester les tâches cron
router.post('/test-cron', authenticateToken, async (req, res) => {
    try {
        // Lancer manuellement les vérifications
        console.log('🧪 Test manuel des tâches cron...');
        
        // Test de vérification des étapes en retard
        const overdueStages = await require('../services/opportunityWorkflowService').checkOverdueStages();
        console.log(`📊 ${overdueStages.length} étape(s) en retard détectée(s)`);
        
        // Test de vérification des opportunités inactives
        const inactiveResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM opportunities o
            WHERE o.statut = 'EN_COURS'
            AND o.last_activity_at < CURRENT_DATE - INTERVAL '7 days'
        `);
        console.log(`📊 ${inactiveResult.rows[0].count} opportunité(s) inactive(s) détectée(s)`);
        
        res.json({
            success: true,
            message: 'Test des tâches cron terminé',
            data: {
                overdueStages: overdueStages.length,
                inactiveOpportunities: parseInt(inactiveResult.rows[0].count)
            }
        });
    } catch (error) {
        console.error('Erreur lors du test des tâches cron:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du test des tâches cron'
        });
    }
});

// Récupérer l'historique des notifications
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                n.*,
                o.nom as opportunity_name,
                os.stage_name as stage_name
            FROM notifications n
            LEFT JOIN opportunities o ON n.opportunity_id = o.id
            LEFT JOIN opportunity_stages os ON n.stage_id = os.id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
            LIMIT 100
        `, [req.user.id]);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'historique'
        });
    }
});

// Vider l'historique des notifications
router.delete('/clear-history', authenticateToken, async (req, res) => {
    try {
        await pool.query(`
            DELETE FROM notifications 
            WHERE user_id = $1
        `, [req.user.id]);
        
        res.json({
            success: true,
            message: 'Historique vidé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors du vidage de l\'historique:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du vidage de l\'historique'
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
                INSERT INTO ${NOTIFICATION_SETTINGS_TABLE} (user_id, general, email, notification_types, alerts)
                VALUES (NULL, $1, $2, $3, $4)
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
                })
            ]);
        }
    } catch (error) {
        console.error('Erreur lors de la création de la table de paramètres:', error);
        throw error;
    }
}

module.exports = router;
