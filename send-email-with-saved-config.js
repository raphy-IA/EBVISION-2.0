const { pool } = require('./src/utils/database');
const nodemailer = require('nodemailer');

async function sendEmailWithSavedConfig() {
    try {
        console.log('📧 Lecture de la configuration email sauvegardée...');
        
        // Récupérer la configuration email sauvegardée
        const result = await pool.query(`
            SELECT email FROM notification_settings 
            WHERE user_id = 'b306cee5-cab6-453a-b753-cdaa54cad0d4'
        `);
        
        if (result.rows.length === 0 || !result.rows[0].email) {
            console.log('❌ Aucune configuration email trouvée');
            console.log('💡 Veuillez d\'abord configurer les paramètres email dans l\'interface web');
            return;
        }
        
        const emailSettings = JSON.parse(result.rows[0].email);
        console.log('✅ Configuration trouvée:');
        console.log('- Serveur SMTP:', emailSettings.smtpHost);
        console.log('- Port:', emailSettings.smtpPort);
        console.log('- Utilisateur:', emailSettings.smtpUser);
        console.log('- Expéditeur:', emailSettings.smtpFrom);
        console.log('- SSL:', emailSettings.enableSSL);
        console.log('- Debug:', emailSettings.enableDebug);
        
        // Créer le transporteur
        const transporter = nodemailer.createTransporter({
            host: emailSettings.smtpHost,
            port: emailSettings.smtpPort,
            secure: emailSettings.enableSSL,
            auth: {
                user: emailSettings.smtpUser,
                pass: emailSettings.smtpPassword
            },
            debug: emailSettings.enableDebug
        });
        
        // Vérifier la connexion
        console.log('🔍 Vérification de la connexion SMTP...');
        await transporter.verify();
        console.log('✅ Connexion SMTP réussie');
        
        // Envoyer l'email de test
        const mailOptions = {
            from: emailSettings.smtpFrom,
            to: 'rbngos@gmail.com',
            subject: 'Test TRS Notifications - Configuration Sauvegardée',
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
        
        console.log('📤 Envoi de l\'email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Email envoyé avec succès !');
        console.log('📧 Message ID:', info.messageId);
        console.log('📧 Réponse:', info.response);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        
        if (error.code === 'EAUTH') {
            console.log('\n💡 Erreur d\'authentification :');
            console.log('1. Vérifiez vos identifiants SMTP');
            console.log('2. Pour Gmail, utilisez un mot de passe d\'application');
            console.log('3. Vérifiez que l\'authentification à 2 facteurs est activée');
        } else if (error.code === 'ECONNECTION') {
            console.log('\n💡 Erreur de connexion :');
            console.log('1. Vérifiez le serveur SMTP et le port');
            console.log('2. Vérifiez votre connexion internet');
        }
    } finally {
        await pool.end();
    }
}

sendEmailWithSavedConfig();

