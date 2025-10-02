const { pool } = require('../utils/database');
const bcrypt = require('bcryptjs');

// Service pour la gestion des accès utilisateur
class UserAccessService {
    
    // Créer un compte utilisateur pour un collaborateur
    static async createUserAccessForCollaborateur(collaborateurData) {
        try {
            // Utiliser les données du formulaire ou générer des valeurs par défaut
            const email = collaborateurData.email;
            const login = collaborateurData.login || await this.generateUniqueLogin(collaborateurData.nom, collaborateurData.prenom);
            const role = collaborateurData.role || 'COLLABORATEUR';
            const password = collaborateurData.password || this.generateTempPassword();
            
            // Hasher le mot de passe
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);
            
            // Créer l'utilisateur
            const userData = {
                nom: collaborateurData.nom,
                prenom: collaborateurData.prenom,
                email: email,
                password_hash: passwordHash,
                login: login,
                role: role,
                statut: 'ACTIF'
            };
            
            const sql = `
                INSERT INTO users (nom, prenom, email, password_hash, login, role, statut)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, nom, prenom, email, login, role
            `;
            
            const result = await pool.query(sql, [
                userData.nom,
                userData.prenom,
                userData.email,
                userData.password_hash,
                userData.login,
                userData.role,
                userData.statut
            ]);
            
            if (result.rows.length > 0) {
                const userId = result.rows[0].id;
                
                // Lier l'utilisateur au collaborateur
                await pool.query(`
                    UPDATE collaborateurs 
                    SET user_id = $1 
                    WHERE id = $2
                `, [userId, collaborateurData.id]);
                
                console.log('✅ Compte utilisateur créé pour le collaborateur:', {
                    collaborateur_id: collaborateurData.id,
                    user_id: userId,
                    email: email,
                    login: login,
                    password: password
                });
                
                return {
                    success: true,
                    user: result.rows[0],
                    password: password,
                    message: 'Compte utilisateur créé avec succès'
                };
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la création du compte utilisateur:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Générer un mot de passe temporaire
    static generateTempPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password + '!';
    }
    
    // Générer un login unique
    static async generateUniqueLogin(nom, prenom) {
        // Première lettre du prénom + premier nom
        const firstLetterPrenom = prenom.charAt(0).toLowerCase();
        const firstNom = nom.toLowerCase().split(' ')[0]; // Prendre le premier nom si plusieurs
        let baseLogin = firstLetterPrenom + firstNom;
        
        // Vérifier si le login existe déjà
        let counter = 0;
        let login = baseLogin;
        
        while (counter < 100) { // Limite de sécurité
            const sql = `
                SELECT COUNT(*) as count
                FROM users 
                WHERE login = $1
            `;
            
            const result = await pool.query(sql, [login]);
            
            if (parseInt(result.rows[0].count) === 0) {
                // Login disponible
                return login;
            } else {
                // Login existe déjà, ajouter un chiffre
                counter++;
                login = baseLogin + counter;
            }
        }
        
        // Si on arrive ici, générer un login avec timestamp
        const timestamp = Date.now();
        return baseLogin + timestamp;
    }
    
    // Réinitialiser le mot de passe d'un utilisateur
    static async resetPassword(userId) {
        try {
            const tempPassword = this.generateTempPassword();
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
            
            const sql = `
                UPDATE users 
                SET password_hash = $1 
                WHERE id = $2
                RETURNING id, email, login
            `;
            
            const result = await pool.query(sql, [passwordHash, userId]);
            
            if (result.rows.length > 0) {
                return {
                    success: true,
                    user: result.rows[0],
                    tempPassword: tempPassword,
                    message: 'Mot de passe réinitialisé avec succès'
                };
            }
            
        } catch (error) {
            console.error('❌ Erreur lors de la réinitialisation du mot de passe:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Vérifier si un collaborateur a un compte utilisateur
    static async hasUserAccess(collaborateurId) {
        try {
            const sql = `
                SELECT u.id, u.email, u.login, u.role, u.statut
                FROM users u
                JOIN collaborateurs c ON u.id = c.user_id
                WHERE c.id = $1
            `;
            
            const result = await pool.query(sql, [collaborateurId]);
            return result.rows.length > 0 ? result.rows[0] : null;
            
        } catch (error) {
            console.error('❌ Erreur lors de la vérification de l\'accès utilisateur:', error);
            return null;
        }
    }
}

module.exports = UserAccessService; 