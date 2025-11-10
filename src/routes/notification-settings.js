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
        
        // Mettre à jour les variables d'environnement seulement si le mot de passe est fourni
        process.env.EMAIL_USER = emailSettings.smtpUser;
        if (emailSettings.smtpPassword) {
            process.env.EMAIL_PASSWORD = emailSettings.smtpPassword;
        }
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

// Envoyer un email de test avec les paramètres sauvegardés
router.post('/send-test-email', authenticateToken, async (req, res) => {
    try {
        const { testEmail } = req.body;
        
        if (!testEmail) {
            return res.status(400).json({
                success: false,
                error: 'Adresse email de test requise'
            });
        }
        
        // Récupérer les paramètres email sauvegardés
        const result = await pool.query(`
            SELECT email FROM ${NOTIFICATION_SETTINGS_TABLE} 
            WHERE user_id = $1
        `, [req.user.id]);
        
        if (result.rows.length === 0 || !result.rows[0].email) {
            return res.status(400).json({
                success: false,
                error: 'Aucune configuration email trouvée. Veuillez d\'abord configurer les paramètres email.'
            });
        }
        
        const emailSettings = JSON.parse(result.rows[0].email);
        
        // Créer un transporteur avec les paramètres sauvegardés
        const testTransporter = require('nodemailer').createTransporter({
            host: emailSettings.smtpHost,
            port: emailSettings.smtpPort,
            secure: emailSettings.enableSSL,
            auth: {
                user: emailSettings.smtpUser,
                pass: emailSettings.smtpPassword
            },
            debug: emailSettings.enableDebug
        });
        
        // Envoyer un email de test avec les paramètres sauvegardés
        const mailOptions = {
            from: emailSettings.smtpFrom,
            to: testEmail,
            subject: 'Test de configuration - TRS Notifications (Paramètres sauvegardés)',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
                        <h1>📧 Test Email - Configuration Sauvegardée</h1>
                    </div>
                    <div style="padding: 20px; background-color: #f8f9fa;">
                        <p>Bonjour,</p>
                        <p>Ceci est un email de test envoyé avec les paramètres de configuration sauvegardés dans TRS.</p>
                        
                        <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <h3>Configuration utilisée :</h3>
                            <ul>
                                <li><strong>Serveur SMTP:</strong> ${emailSettings.smtpHost}</li>
                                <li><strong>Port:</strong> ${emailSettings.smtpPort}</li>
                                <li><strong>SSL/TLS:</strong> ${emailSettings.enableSSL ? 'Activé' : 'Désactivé'}</li>
                                <li><strong>Utilisateur:</strong> ${emailSettings.smtpUser}</li>
                                <li><strong>Expéditeur:</strong> ${emailSettings.smtpFrom}</li>
                                <li><strong>Mode debug:</strong> ${emailSettings.enableDebug ? 'Activé' : 'Désactivé'}</li>
                            </ul>
                        </div>
                        
                        <p><strong>Date et heure du test :</strong> ${new Date().toLocaleString('fr-FR')}</p>
                        
                        <p>Si vous recevez cet email, cela confirme que :</p>
                        <ul>
                            <li>✅ La configuration SMTP est correcte</li>
                            <li>✅ Les paramètres sont bien sauvegardés</li>
                            <li>✅ Les notifications par email fonctionneront</li>
                        </ul>
                        
                        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <h3>🎉 Test réussi !</h3>
                            <p>Votre configuration email est opérationnelle et prête à envoyer des notifications automatiques.</p>
                        </div>
                        
                        <p>Cordialement,<br>L'équipe TRS</p>
                    </div>
                </div>
            `
        };
        
        await testTransporter.sendMail(mailOptions);
        
        console.log(`📧 Email de test envoyé à ${testEmail} avec les paramètres sauvegardés`);
        
        res.json({
            success: true,
            message: 'Email de test envoyé avec succès avec les paramètres sauvegardés',
            data: {
                sentTo: testEmail,
                sentAt: new Date().toISOString(),
                configuration: {
                    smtpHost: emailSettings.smtpHost,
                    smtpPort: emailSettings.smtpPort,
                    smtpUser: emailSettings.smtpUser,
                    smtpFrom: emailSettings.smtpFrom,
                    enableSSL: emailSettings.enableSSL,
                    enableDebug: emailSettings.enableDebug
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de test:', error);
        res.status(500).json({
            success: false,
            error: `Erreur lors de l'envoi de l'email de test: ${error.message}`
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
        const { user_id, type, limit = 100, offset = 0 } = req.query;
        
        // Vérifier si l'utilisateur est administrateur
        const userResult = await pool.query(`
            SELECT role FROM users WHERE id = $1
        `, [req.user.id]);
        
        if (!userResult.rows || userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }
        
        const isAdmin = userResult.rows[0]?.role === 'ADMIN' || userResult.rows[0]?.role === 'IT_ADMIN';
        
        // Vérifier si la table notifications existe
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'notifications'
            )
        `);
        
        if (!tableCheck.rows[0].exists) {
            // Si la table n'existe pas, retourner un tableau vide
            return res.json({
                success: true,
                data: [],
                pagination: isAdmin ? {
                    total: 0,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                } : null,
                isAdmin: isAdmin
            });
        }
        
        // Vérifier si la colonne campaign_id existe dans notifications
        let campaignIdExists = false;
        try {
            const columnCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'notifications' 
                    AND column_name = 'campaign_id'
                )
            `);
            campaignIdExists = columnCheck.rows[0].exists;
        } catch (error) {
            console.warn('Erreur lors de la vérification de la colonne campaign_id:', error.message);
            campaignIdExists = false; // Par sécurité, on considère que la colonne n'existe pas
        }
        
        // Vérifier quelle colonne existe pour le statut de lecture
        let readColumnName = 'is_read'; // Par défaut, utiliser is_read
        try {
            const readColumnCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'notifications' 
                    AND column_name = 'is_read'
                )
            `);
            if (!readColumnCheck.rows[0].exists) {
                // Si is_read n'existe pas, vérifier si 'read' existe
                const readCheck = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_schema = 'public' 
                        AND table_name = 'notifications' 
                        AND column_name = 'read'
                    )
                `);
                if (readCheck.rows[0].exists) {
                    readColumnName = 'read';
                }
            }
        } catch (error) {
            console.warn('Erreur lors de la vérification de la colonne read/is_read:', error.message);
        }
        
        // Construire la liste des colonnes explicitement
        // Les tables opportunities, opportunity_stages et prospecting_campaigns existent dans la base de données
        let notificationColumns = [
            'n.id', 'n.type', 'n.title', 'n.message', 'n.user_id', 
            'n.opportunity_id', 'n.stage_id', `n.${readColumnName} as read`, 'n.created_at'
        ];
        
        // Ajouter campaign_id seulement si la colonne existe dans la table notifications
        if (campaignIdExists) {
            notificationColumns.push('n.campaign_id');
        }
        
        // Construire la requête SELECT avec toutes les colonnes nécessaires
        // Table opportunities : colonne 'nom'
        // Table opportunity_stages : colonne 'stage_name'
        // Table prospecting_campaigns : colonne 'name' (pas 'nom')
        let selectColumns = [
            ...notificationColumns,
            'u.nom as user_nom',
            'u.prenom as user_prenom'
        ];
        
        // Vérifier si les tables existent avant d'ajouter les colonnes et JOINs
        let opportunitiesExists = true;
        let opportunityStagesExists = true;
        let prospectingCampaignsExists = true;
        
        try {
            const oppCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'opportunities'
                )
            `);
            opportunitiesExists = oppCheck.rows[0].exists;
        } catch (error) {
            console.warn('Erreur lors de la vérification de opportunities:', error.message);
            opportunitiesExists = false;
        }
        
        try {
            const stageCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'opportunity_stages'
                )
            `);
            opportunityStagesExists = stageCheck.rows[0].exists;
        } catch (error) {
            console.warn('Erreur lors de la vérification de opportunity_stages:', error.message);
            opportunityStagesExists = false;
        }
        
        if (campaignIdExists) {
            try {
                const campaignCheck = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'prospecting_campaigns'
                    )
                `);
                prospectingCampaignsExists = campaignCheck.rows[0].exists;
            } catch (error) {
                console.warn('Erreur lors de la vérification de prospecting_campaigns:', error.message);
                prospectingCampaignsExists = false;
            }
        }
        
        // Ajouter les colonnes conditionnellement
        if (opportunitiesExists) {
            selectColumns.push('o.nom as opportunity_name');
        } else {
            selectColumns.push('NULL as opportunity_name');
        }
        
        if (opportunityStagesExists) {
            selectColumns.push('os.stage_name as stage_name');
        } else {
            selectColumns.push('NULL as stage_name');
        }
        
        let campaignNameColumn = null;
        if (campaignIdExists && prospectingCampaignsExists) {
            try {
                const campaignColumnCheck = await pool.query(`
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                    AND table_name = 'prospecting_campaigns'
                    AND column_name IN ('name', 'nom')
                `);

                const availableColumns = campaignColumnCheck.rows.map(row => row.column_name);
                if (availableColumns.includes('name')) {
                    campaignNameColumn = 'name';
                } else if (availableColumns.includes('nom')) {
                    campaignNameColumn = 'nom';
                }
            } catch (error) {
                console.warn('Erreur lors de la vérification des colonnes prospecting_campaigns:', error.message);
            }

            if (campaignNameColumn) {
                selectColumns.push(`pc.${campaignNameColumn} as campaign_name`);
            } else {
                selectColumns.push('NULL as campaign_name');
            }
        } else if (campaignIdExists) {
            selectColumns.push('NULL as campaign_name');
        }
        
        let query = `
            SELECT 
                ${selectColumns.join(', ')}
            FROM notifications n
            LEFT JOIN users u ON n.user_id = u.id
        `;
        
        // Ajouter les JOINs seulement si les tables existent
        if (opportunitiesExists) {
            query += ` LEFT JOIN opportunities o ON n.opportunity_id = o.id`;
        }
        
        if (opportunityStagesExists) {
            query += ` LEFT JOIN opportunity_stages os ON n.stage_id = os.id`;
        }
        
        if (campaignIdExists && prospectingCampaignsExists && campaignNameColumn) {
            query += ` LEFT JOIN prospecting_campaigns pc ON n.campaign_id = pc.id`;
        }
        
        const queryParams = [];
        let whereConditions = [];
        
        // Si pas admin, filtrer par utilisateur connecté
        if (!isAdmin) {
            whereConditions.push(`n.user_id = $${queryParams.length + 1}`);
            queryParams.push(req.user.id);
        }
        
        // Filtre par utilisateur spécifique (admin seulement)
        if (isAdmin && user_id) {
            whereConditions.push(`n.user_id = $${queryParams.length + 1}`);
            queryParams.push(user_id);
        }
        
        // Filtre par type de notification
        if (type) {
            whereConditions.push(`n.type = $${queryParams.length + 1}`);
            queryParams.push(type);
        }
        
        if (whereConditions.length > 0) {
            query += ` WHERE ${whereConditions.join(' AND ')}`;
        }
        
        query += ` ORDER BY n.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(parseInt(limit), parseInt(offset));
        
        let result;
        try {
            // Log de la requête pour le débogage (uniquement en développement)
            if (process.env.NODE_ENV === 'development') {
                console.log('🔍 Requête SQL:', query);
                console.log('🔍 Paramètres:', queryParams);
            }
            
            result = await pool.query(query, queryParams);
        } catch (queryError) {
            console.error('❌ Erreur SQL lors de la récupération de l\'historique:', queryError);
            console.error('❌ Message d\'erreur:', queryError.message);
            console.error('❌ Code d\'erreur:', queryError.code);
            console.error('❌ Détails:', queryError.detail);
            console.error('❌ Requête SQL:', query);
            console.error('❌ Paramètres:', queryParams);
            throw queryError;
        }
        
        // Récupérer le total pour la pagination (admin seulement)
        let totalCount = null;
        if (isAdmin) {
            let countQuery = `
                SELECT COUNT(*) as total
                FROM notifications n
            `;
            
            const countParams = [];
            const countConditions = [];
            
            if (user_id) {
                countConditions.push(`n.user_id = $${countParams.length + 1}`);
                countParams.push(user_id);
            }
            
            if (type) {
                countConditions.push(`n.type = $${countParams.length + 1}`);
                countParams.push(type);
            }
            
            if (countConditions.length > 0) {
                countQuery += ` WHERE ${countConditions.join(' AND ')}`;
            }
            
            const countResult = await pool.query(countQuery, countParams);
            totalCount = parseInt(countResult.rows[0].total);
        }
        
        res.json({
            success: true,
            data: result.rows,
            pagination: isAdmin ? {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset)
            } : null,
            isAdmin: isAdmin
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'historique',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Vider l'historique des notifications
router.delete('/clear-history', authenticateToken, async (req, res) => {
    try {
        const { user_id } = req.query;
        
        // Vérifier si l'utilisateur est administrateur
        const userResult = await pool.query(`
            SELECT role FROM users WHERE id = $1
        `, [req.user.id]);
        
        const isAdmin = userResult.rows[0]?.role === 'ADMIN' || userResult.rows[0]?.role === 'IT_ADMIN';
        
        let query = `DELETE FROM notifications`;
        const queryParams = [];
        let whereConditions = [];
        
        // Si pas admin, supprimer seulement ses propres notifications
        if (!isAdmin) {
            whereConditions.push(`user_id = $${queryParams.length + 1}`);
            queryParams.push(req.user.id);
        }
        
        // Si admin et user_id spécifié, supprimer les notifications de cet utilisateur
        if (isAdmin && user_id) {
            whereConditions.push(`user_id = $${queryParams.length + 1}`);
            queryParams.push(user_id);
        }
        
        // Si admin sans user_id, supprimer toutes les notifications (avec confirmation)
        if (isAdmin && !user_id) {
            // Pour la sécurité, demander une confirmation spéciale
            const { confirm_all } = req.query;
            if (!confirm_all) {
                return res.status(400).json({
                    success: false,
                    error: 'Confirmation requise pour supprimer toutes les notifications. Ajoutez ?confirm_all=true'
                });
            }
        }
        
        if (whereConditions.length > 0) {
            query += ` WHERE ${whereConditions.join(' AND ')}`;
        }
        
        const result = await pool.query(query, queryParams);
        
        res.json({
            success: true,
            message: `${result.rowCount} notification(s) supprimée(s) avec succès`,
            deletedCount: result.rowCount
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
