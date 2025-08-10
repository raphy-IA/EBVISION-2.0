const nodemailer = require('nodemailer');

class EmailService {
    
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.initTransporter();
    }
    
    /**
     * Initialiser le transporteur email
     */
    initTransporter() {
        try {
            // Vérifier si les paramètres email sont configurés
            const emailUser = process.env.EMAIL_USER;
            const emailPassword = process.env.EMAIL_PASSWORD;
            
            if (!emailUser || !emailPassword) {
                console.warn('⚠️ Service email non configuré: paramètres manquants');
                this.isConfigured = false;
                return;
            }
            
            // Configuration pour le développement (Gmail avec app password)
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: emailUser,
                    pass: emailPassword
                }
            });
            
            this.isConfigured = true;
            console.log('✅ Service email configuré');
        } catch (error) {
            console.warn('⚠️ Service email non configuré:', error.message);
            this.isConfigured = false;
        }
    }
    
    /**
     * Envoyer un email de notification
     */
    async sendNotificationEmail(to, subject, htmlContent, textContent = null) {
        if (!this.isConfigured) {
            console.warn('⚠️ Service email non configuré, email non envoyé');
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
