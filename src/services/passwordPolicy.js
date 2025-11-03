const bcrypt = require('bcryptjs');

/**
 * Service de politique de mots de passe
 * Définit et applique les règles de sécurité pour les mots de passe
 */
class PasswordPolicyService {
    
    // Configuration de la politique
    static POLICY = {
        minLength: 12,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        minSpecialChars: 2,
        forbiddenWords: [
            'password', 'motdepasse', '123456', 'qwerty', 'azerty',
            'admin', 'administrateur', 'user', 'utilisateur', 'login',
            'ebvision', 'eb-vision', 'company', 'entreprise'
        ],
        maxConsecutiveChars: 3,
        maxRepeatedChars: 2
    };
    
    /**
     * Valider un mot de passe selon la politique
     */
    static validatePassword(password, userInfo = {}) {
        const errors = [];
        const warnings = [];
        
        // Vérification de la longueur
        if (password.length < this.POLICY.minLength) {
            errors.push(`Le mot de passe doit contenir au moins ${this.POLICY.minLength} caractères`);
        }
        
        if (password.length > this.POLICY.maxLength) {
            errors.push(`Le mot de passe ne peut pas dépasser ${this.POLICY.maxLength} caractères`);
        }
        
        // Vérification des caractères requis
        if (this.POLICY.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
        }
        
        if (this.POLICY.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Le mot de passe doit contenir au moins une lettre minuscule');
        }
        
        if (this.POLICY.requireNumbers && !/[0-9]/.test(password)) {
            errors.push('Le mot de passe doit contenir au moins un chiffre');
        }
        
        if (this.POLICY.requireSpecialChars) {
            const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/g;
            const matches = password.match(specialChars);
            
            if (!matches) {
                errors.push('Le mot de passe doit contenir au moins un caractère spécial');
            } else if (matches.length < this.POLICY.minSpecialChars) {
                errors.push(`Le mot de passe doit contenir au moins ${this.POLICY.minSpecialChars} caractères spéciaux`);
            }
        }
        
        // Vérification des mots interdits
        const lowerPassword = password.toLowerCase();
        for (const forbiddenWord of this.POLICY.forbiddenWords) {
            if (lowerPassword.includes(forbiddenWord.toLowerCase())) {
                errors.push(`Le mot de passe ne peut pas contenir le mot "${forbiddenWord}"`);
            }
        }
        
        // Vérification des informations personnelles
        if (userInfo.nom && lowerPassword.includes(userInfo.nom.toLowerCase())) {
            errors.push('Le mot de passe ne peut pas contenir votre nom');
        }
        
        if (userInfo.prenom && lowerPassword.includes(userInfo.prenom.toLowerCase())) {
            errors.push('Le mot de passe ne peut pas contenir votre prénom');
        }
        
        if (userInfo.email) {
            const emailLocal = userInfo.email.split('@')[0].toLowerCase();
            if (lowerPassword.includes(emailLocal)) {
                errors.push('Le mot de passe ne peut pas contenir votre adresse email');
            }
        }
        
        // Vérification des caractères consécutifs
        if (this.hasConsecutiveChars(password, this.POLICY.maxConsecutiveChars)) {
            errors.push(`Le mot de passe ne peut pas contenir plus de ${this.POLICY.maxConsecutiveChars} caractères consécutifs`);
        }
        
        // Vérification des caractères répétés
        if (this.hasRepeatedChars(password, this.POLICY.maxRepeatedChars)) {
            errors.push(`Le mot de passe ne peut pas contenir plus de ${this.POLICY.maxRepeatedChars} caractères identiques consécutifs`);
        }
        
        // Vérifications de sécurité avancées
        const securityScore = this.calculateSecurityScore(password);
        
        if (securityScore < 60) {
            warnings.push('Le mot de passe est faible. Considérez utiliser un gestionnaire de mots de passe.');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            securityScore,
            strength: this.getPasswordStrength(securityScore)
        };
    }
    
    /**
     * Vérifier s'il y a des caractères consécutifs
     */
    static hasConsecutiveChars(password, maxConsecutive) {
        for (let i = 0; i < password.length - maxConsecutive; i++) {
            let consecutive = true;
            for (let j = 1; j <= maxConsecutive; j++) {
                if (password.charCodeAt(i + j) !== password.charCodeAt(i + j - 1) + 1) {
                    consecutive = false;
                    break;
                }
            }
            if (consecutive) return true;
        }
        return false;
    }
    
    /**
     * Vérifier s'il y a des caractères répétés
     */
    static hasRepeatedChars(password, maxRepeated) {
        for (let i = 0; i < password.length - maxRepeated; i++) {
            let repeated = true;
            for (let j = 1; j <= maxRepeated; j++) {
                if (password[i] !== password[i + j]) {
                    repeated = false;
                    break;
                }
            }
            if (repeated) return true;
        }
        return false;
    }
    
    /**
     * Calculer le score de sécurité d'un mot de passe
     */
    static calculateSecurityScore(password) {
        let score = 0;
        
        // Longueur
        if (password.length >= 8) score += 10;
        if (password.length >= 12) score += 10;
        if (password.length >= 16) score += 10;
        
        // Diversité des caractères
        if (/[a-z]/.test(password)) score += 5;
        if (/[A-Z]/.test(password)) score += 5;
        if (/[0-9]/.test(password)) score += 5;
        if (/[^a-zA-Z0-9]/.test(password)) score += 10;
        
        // Complexité
        const uniqueChars = new Set(password).size;
        score += Math.min(uniqueChars * 2, 20);
        
        // Patterns
        if (!this.hasConsecutiveChars(password, 3)) score += 10;
        if (!this.hasRepeatedChars(password, 2)) score += 10;
        
        // Entropie
        const entropy = this.calculateEntropy(password);
        score += Math.min(entropy / 2, 15);
        
        return Math.min(score, 100);
    }
    
    /**
     * Calculer l'entropie d'un mot de passe
     */
    static calculateEntropy(password) {
        const charset = new Set(password);
        const charsetSize = charset.size;
        return password.length * Math.log2(charsetSize);
    }
    
    /**
     * Obtenir la force du mot de passe
     */
    static getPasswordStrength(score) {
        if (score >= 80) return 'Très fort';
        if (score >= 60) return 'Fort';
        if (score >= 40) return 'Moyen';
        if (score >= 20) return 'Faible';
        return 'Très faible';
    }
    
    /**
     * Générer un mot de passe sécurisé
     */
    static generateSecurePassword(length = 16) {
        const charset = {
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            numbers: '0123456789',
            special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        };
        
        let password = '';
        
        // Assurer au moins un caractère de chaque type
        password += this.getRandomChar(charset.lowercase);
        password += this.getRandomChar(charset.uppercase);
        password += this.getRandomChar(charset.numbers);
        password += this.getRandomChar(charset.special);
        
        // Remplir le reste
        const allChars = charset.lowercase + charset.uppercase + charset.numbers + charset.special;
        for (let i = password.length; i < length; i++) {
            password += this.getRandomChar(allChars);
        }
        
        // Mélanger le mot de passe
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
    
    /**
     * Obtenir un caractère aléatoire
     */
    static getRandomChar(charset) {
        return charset[Math.floor(Math.random() * charset.length)];
    }
    
    /**
     * Vérifier si un mot de passe a été compromis (simulation)
     * En production, utiliser l'API HaveIBeenPwned
     */
    static async isPasswordCompromised(password) {
        // Simulation - en production, utiliser l'API HaveIBeenPwned
        const commonPasswords = [
            'password', '123456', 'password123', 'admin', 'qwerty',
            'azerty', 'motdepasse', '123456789', 'password1'
        ];
        
        return commonPasswords.includes(password.toLowerCase());
    }
    
    /**
     * Valider un mot de passe avec toutes les vérifications
     */
    static async validatePasswordComplete(password, userInfo = {}) {
        const validation = this.validatePassword(password, userInfo);
        
        // Vérifier si le mot de passe est compromis
        const isCompromised = await this.isPasswordCompromised(password);
        if (isCompromised) {
            validation.errors.push('Ce mot de passe a été compromis et ne peut pas être utilisé');
            validation.isValid = false;
        }
        
        return validation;
    }
    
    /**
     * Obtenir des suggestions d'amélioration
     */
    static getPasswordSuggestions(validation) {
        const suggestions = [];
        
        if (validation.securityScore < 60) {
            suggestions.push('Utilisez un gestionnaire de mots de passe pour générer des mots de passe sécurisés');
        }
        
        if (validation.errors.some(e => e.includes('longueur'))) {
            suggestions.push('Augmentez la longueur de votre mot de passe (minimum 12 caractères)');
        }
        
        if (validation.errors.some(e => e.includes('majuscule'))) {
            suggestions.push('Ajoutez des lettres majuscules à votre mot de passe');
        }
        
        if (validation.errors.some(e => e.includes('minuscule'))) {
            suggestions.push('Ajoutez des lettres minuscules à votre mot de passe');
        }
        
        if (validation.errors.some(e => e.includes('chiffre'))) {
            suggestions.push('Ajoutez des chiffres à votre mot de passe');
        }
        
        if (validation.errors.some(e => e.includes('spécial'))) {
            suggestions.push('Ajoutez des caractères spéciaux (!@#$%^&*) à votre mot de passe');
        }
        
        if (validation.errors.some(e => e.includes('consécutifs'))) {
            suggestions.push('Évitez les séquences de caractères consécutifs (abc, 123)');
        }
        
        if (validation.errors.some(e => e.includes('répétés'))) {
            suggestions.push('Évitez les caractères répétés (aaa, 111)');
        }
        
        return suggestions;
    }
}

module.exports = PasswordPolicyService;










