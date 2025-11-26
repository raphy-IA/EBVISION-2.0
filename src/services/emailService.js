const nodemailer = require('nodemailer');
const { pool } = require('../utils/database');

class EmailService {
    
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.warningLogged = false; // Pour éviter les répétitions d'avertissements
        // Initialisation asynchrone (non bloquante)
        this.initTransporter();
    }
    
    /**
     * Initialiser le transporteur email
     * - Priorité 1 : variables d'environnement (déjà positionnées)
     * - Priorité 2 : configuration globale en base (notification_settings, user_id IS NULL)
     */
    async initTransporter() {
        try {
            let emailUser = process.env.EMAIL_USER;
            let emailPassword = process.env.EMAIL_PASSWORD;

            // Si les variables d'environnement ne sont pas définies, tenter de les recharger depuis la configuration globale
            if (!emailUser || !emailPassword) {
                try {
                    const result = await pool.query(
                        `SELECT email FROM notification_settings WHERE user_id IS NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1`
                    );

                    if (result.rows[0] && result.rows[0].email) {
                        let settingsRaw = result.rows[0].email;
                        let settings;

                        // La colonne peut être json/jsonb (objet) ou texte JSON (string)
                        if (typeof settingsRaw === 'string') {
                            try {
                                settings = JSON.parse(settingsRaw);
                            } catch (parseError) {
                                console.warn('⚠️ Impossible de parser la configuration email globale (string):', parseError.message);
                                settings = {};
                            }
                        } else {
                            settings = settingsRaw || {};
                        }

                        emailUser = settings.smtpUser || '';
                        emailPassword = settings.smtpPassword || '';

                        process.env.EMAIL_USER = emailUser;
                        if (emailPassword) {
                            process.env.EMAIL_PASSWORD = emailPassword;
                        }
                        process.env.EMAIL_FROM = settings.smtpFrom || process.env.EMAIL_FROM || '';
                        process.env.SMTP_HOST = settings.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
                        process.env.SMTP_PORT = String(settings.smtpPort || process.env.SMTP_PORT || '587');
                        process.env.SMTP_SECURE = settings.enableSSL ? 'true' : (process.env.SMTP_SECURE || 'false');
                        process.env.SMTP_DEBUG = settings.enableDebug ? 'true' : (process.env.SMTP_DEBUG || 'false');

                        console.log('✅ Configuration email rechargée depuis notification_settings (global)', {
                            smtpHost: process.env.SMTP_HOST,
                            smtpPort: process.env.SMTP_PORT,
                            smtpUser: emailUser,
                            hasPassword: !!emailPassword
                        });
                    }
                } catch (dbError) {
                    console.warn('⚠️ Impossible de recharger la configuration email depuis la base:', dbError.message);
                }
            }

            // Vérifier à nouveau après tentative de rechargement
            if (!emailUser || !emailPassword) {
                if (!this.warningLogged) {
                    console.warn('⚠️ Service email non configuré: paramètres manquants (EMAIL_USER, EMAIL_PASSWORD)');
                    console.warn('   Configurez l\'onglet "Configuration email" pour activer l\'envoi des notifications.');
                    this.warningLogged = true;
                }
                this.isConfigured = false;
                return;
            }

            // Paramètres SMTP issus de la configuration notifications (notification-settings)
            const host = process.env.SMTP_HOST || 'smtp.gmail.com';
            const port = parseInt(process.env.SMTP_PORT || '587', 10);
            const secure = process.env.SMTP_SECURE === 'true' || port === 465;
            const debug = process.env.SMTP_DEBUG === 'true';

            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure,
                auth: {
                    user: emailUser,
                    pass: emailPassword
                },
                debug
            });
            
            this.isConfigured = true;
            console.log('✅ Service email configuré');
        } catch (error) {
            if (!this.warningLogged) {
                console.warn('⚠️ Service email non configuré:', error.message);
                this.warningLogged = true;
            }
            this.isConfigured = false;
        }
    }
    
    /**
     * Envoyer un email de notification
     */
    async sendNotificationEmail(to, subject, htmlContent, textContent = null) {
        if (!this.isConfigured) {
            // Service non configuré : retourner false et loguer une seule fois au besoin
            if (!this.warningLogged) {
                console.warn('⚠️ Tentative d\'envoi d\'email alors que le service email n\'est pas configuré.');
                console.warn('   Vérifiez la configuration dans l\'onglet "Configuration email" (EMAIL_USER / EMAIL_PASSWORD / SMTP_HOST / SMTP_PORT).');
                this.warningLogged = true;
            }
            return false;
        }
        
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'TRS Notifications <trs.notifications@gmail.com>',
                to: to,
                subject: subject,
                html: htmlContent,
                text: textContent || this.stripHtml(htmlContent)
            };
            
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`📧 Email envoyé à ${to}: ${result.messageId}`);
            return true;
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
            return false;
        }
    }
    
    /**
     * Envoyer une notification d'étape en retard
     */
    async sendOverdueStageEmail(userEmail, userName, opportunityName, stageName, daysOverdue) {
        const subject = `⚠️ Étape en retard - ${opportunityName}`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #ff6b6b; color: white; padding: 20px; text-align: center;">
                    <h1>⚠️ Étape en retard</h1>
                </div>
                
                <div style="padding: 20px; background-color: #f8f9fa;">
                    <p>Bonjour ${userName},</p>
                    
                    <p>L'étape <strong>${stageName}</strong> de l'opportunité <strong>${opportunityName}</strong> 
                    est en retard de <strong>${daysOverdue} jour(s)</strong>.</p>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
                        <h3>Action requise :</h3>
                        <ul>
                            <li>Vérifier l'état de l'étape</li>
                            <li>Compléter les actions manquantes</li>
                            <li>Mettre à jour le planning si nécessaire</li>
                        </ul>
                    </div>
                    
                    <p>Veuillez vous connecter à l'application pour traiter cette étape.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/opportunity-stages.html" 
                           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                            Accéder à l'opportunité
                        </a>
                    </div>
                    
                    <p>Cordialement,<br>L'équipe TRS</p>
                </div>
            </div>
        `;
        
        return await this.sendNotificationEmail(userEmail, subject, htmlContent);
    }
    
    /**
     * Envoyer une notification d'opportunité inactive
     */
    async sendInactiveOpportunityEmail(userEmail, userName, opportunityName, daysInactive) {
        const subject = `📊 Opportunité inactive - ${opportunityName}`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #ffa726; color: white; padding: 20px; text-align: center;">
                    <h1>📊 Opportunité inactive</h1>
                </div>
                
                <div style="padding: 20px; background-color: #f8f9fa;">
                    <p>Bonjour ${userName},</p>
                    
                    <p>L'opportunité <strong>${opportunityName}</strong> n'a pas eu d'activité 
                    depuis <strong>${daysInactive} jour(s)</strong>.</p>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
                        <h3>Actions recommandées :</h3>
                        <ul>
                            <li>Relancer le prospect/client</li>
                            <li>Mettre à jour le statut de l'opportunité</li>
                            <li>Fermer l'opportunité si elle n'est plus d'actualité</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/opportunity-stages.html" 
                           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                            Gérer l'opportunité
                        </a>
                    </div>
                    
                    <p>Cordialement,<br>L'équipe TRS</p>
                </div>
            </div>
        `;
        
        return await this.sendNotificationEmail(userEmail, subject, htmlContent);
    }
    
    /**
     * Envoyer une notification de feuille de temps en retard
     */
    async sendTimeSheetOverdueEmail(userEmail, userName, week, year) {
        const subject = `📋 Feuille de temps en retard - Semaine ${week}/${year}`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #ef5350; color: white; padding: 20px; text-align: center;">
                    <h1>📋 Feuille de temps en retard</h1>
                </div>
                
                <div style="padding: 20px; background-color: #f8f9fa;">
                    <p>Bonjour ${userName},</p>
                    
                    <p>Votre feuille de temps pour la <strong>semaine ${week}/${year}</strong> 
                    est en retard et doit être complétée et soumise.</p>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
                        <h3>Action requise :</h3>
                        <ul>
                            <li>Compléter les heures travaillées</li>
                            <li>Ajouter les activités réalisées</li>
                            <li>Soumettre la feuille de temps</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/time-sheet-supervisors.html" 
                           style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                            Compléter ma feuille de temps
                        </a>
                    </div>
                    
                    <p>Cordialement,<br>L'équipe TRS</p>
                </div>
            </div>
        `;
        
        return await this.sendNotificationEmail(userEmail, subject, htmlContent);
    }
    
    /**
     * Envoyer une notification d'opportunité gagnée
     */
    async sendOpportunityWonEmail(userEmail, userName, opportunityName, amount) {
        const subject = `🎉 Opportunité gagnée - ${opportunityName}`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #66bb6a; color: white; padding: 20px; text-align: center;">
                    <h1>🎉 Félicitations !</h1>
                </div>
                
                <div style="padding: 20px; background-color: #f8f9fa;">
                    <p>Bonjour ${userName},</p>
                    
                    <p>Félicitations ! L'opportunité <strong>${opportunityName}</strong> 
                    a été <strong>gagnée</strong> !</p>
                    
                    ${amount ? `<p>Montant : <strong>${amount} €</strong></p>` : ''}
                    
                    <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 20px 0; border-radius: 5px;">
                        <h3>Prochaines étapes :</h3>
                        <ul>
                            <li>Préparer la contractualisation</li>
                            <li>Planifier le démarrage du projet</li>
                            <li>Mettre à jour le CRM</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/opportunity-stages.html" 
                           style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                            Voir les détails
                        </a>
                    </div>
                    
                    <p>Cordialement,<br>L'équipe TRS</p>
                </div>
            </div>
        `;
        
        return await this.sendNotificationEmail(userEmail, subject, htmlContent);
    }
    
    /**
     * Envoyer une notification d'opportunité perdue
     */
    async sendOpportunityLostEmail(userEmail, userName, opportunityName, reason) {
        const subject = `❌ Opportunité perdue - ${opportunityName}`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #ef5350; color: white; padding: 20px; text-align: center;">
                    <h1>❌ Opportunité perdue</h1>
                </div>
                
                <div style="padding: 20px; background-color: #f8f9fa;">
                    <p>Bonjour ${userName},</p>
                    
                    <p>L'opportunité <strong>${opportunityName}</strong> a été marquée comme <strong>perdue</strong>.</p>
                    
                    ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
                    
                    <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 20px 0; border-radius: 5px;">
                        <h3>Actions recommandées :</h3>
                        <ul>
                            <li>Analyser les raisons de la perte</li>
                            <li>Mettre à jour le CRM</li>
                            <li>Identifier les leçons apprises</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/opportunity-stages.html" 
                           style="background-color: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                            Voir les détails
                        </a>
                    </div>
                    
                    <p>Cordialement,<br>L'équipe TRS</p>
                </div>
            </div>
        `;
        
        return await this.sendNotificationEmail(userEmail, subject, htmlContent);
    }
    
    /**
     * Convertir HTML en texte brut
     */
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '');
    }
    
    /**
     * Tester la configuration email
     */
    async testConnection() {
        if (!this.isConfigured) {
            return { success: false, error: 'Service email non configuré' };
        }
        
        try {
            await this.transporter.verify();
            return { success: true, message: 'Connexion email réussie' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();
