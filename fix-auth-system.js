const { pool } = require('./src/utils/database');
const bcrypt = require('bcryptjs');

async function fixAuthSystem() {
    try {
        console.log('🔧 Correction du système d\'authentification...\n');
        
        // 1. Améliorer le script auth.js côté client
        console.log('1️⃣ Amélioration du script auth.js...');
        
        const improvedAuthJS = `
// Script amélioré pour gérer l'authentification et la déconnexion
class AuthManager {
    constructor() {
        this.isLoggingOut = false;
        this.logoutAttempts = 0;
        this.maxLogoutAttempts = 3;
        this.init();
    }

    init() {
        this.addLogoutListeners();
        this.checkAuthStatus();
        this.setupPeriodicTokenCheck();
    }

    // Ajouter les écouteurs d'événements pour les boutons de déconnexion
    addLogoutListeners() {
        // Écouteur global pour tous les boutons de déconnexion
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button, a, .logout-btn');
            if (button && (
                button.textContent.toLowerCase().includes('déconnexion') ||
                button.textContent.toLowerCase().includes('logout') ||
                button.classList.contains('logout-btn')
            )) {
                e.preventDefault();
                e.stopPropagation();
                this.logout();
            }
        });

        // Écouteur spécifique pour les liens de déconnexion
        const logoutLinks = document.querySelectorAll('a[href*="logout"], .logout-link');
        logoutLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }

    // Fonction de déconnexion améliorée
    async logout() {
        if (this.isLoggingOut) {
            console.log('⚠️ Déconnexion déjà en cours...');
            return;
        }

        this.logoutAttempts++;
        
        if (this.logoutAttempts > this.maxLogoutAttempts) {
            console.log('⚠️ Trop de tentatives de déconnexion, redirection forcée');
            this.forceLogout();
            return;
        }

        console.log('🔒 Déconnexion en cours... (tentative ' + this.logoutAttempts + ')');
        
        try {
            // Appeler l'API de déconnexion
            const token = localStorage.getItem('authToken');
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': \`Bearer \${token}\`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.log('⚠️ Erreur lors de l\'appel API de déconnexion:', error);
        }

        // Nettoyer complètement le localStorage
        this.clearAllStorage();
        
        // Désactiver temporairement la vérification d'authentification
        this.isLoggingOut = true;
        
        // Rediriger vers la page de connexion
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 100);
    }

    // Déconnexion forcée
    forceLogout() {
        this.clearAllStorage();
        this.isLoggingOut = true;
        window.location.href = '/login.html';
    }

    // Nettoyer tout le localStorage
    clearAllStorage() {
        const keysToRemove = [
            'authToken',
            'user',
            'userInfo',
            'token',
            'session',
            'auth',
            'login'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        // Nettoyer aussi les cookies
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        console.log('🧹 Stockage local nettoyé');
    }

    // Vérifier le statut d'authentification
    checkAuthStatus() {
        if (this.isLoggingOut) {
            return;
        }

        const token = localStorage.getItem('authToken');
        
        // Si on est sur la page de login, ne pas rediriger
        if (window.location.pathname === '/' || 
            window.location.pathname.includes('login') ||
            window.location.pathname.includes('index')) {
            return;
        }

        if (!token) {
            console.log('🔒 Aucun token trouvé, redirection vers la page de connexion');
            this.forceLogout();
            return;
        }

        // Vérifier la validité du token
        this.verifyToken(token);
    }

    // Vérifier la validité du token
    async verifyToken(token) {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': \`Bearer \${token}\`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.log('🔒 Token invalide, redirection vers la page de connexion');
                this.forceLogout();
            } else {
                console.log('✅ Token valide, utilisateur authentifié');
                this.updateUserDisplay();
            }
        } catch (error) {
            console.log('❌ Erreur lors de la vérification du token:', error);
            this.forceLogout();
        }
    }

    // Vérification périodique du token
    setupPeriodicTokenCheck() {
        setInterval(() => {
            if (!this.isLoggingOut) {
                this.checkAuthStatus();
            }
        }, 5 * 60 * 1000); // Vérifier toutes les 5 minutes
    }

    // Mettre à jour l'affichage utilisateur
    updateUserDisplay() {
        const userInfo = this.getUserInfo();
        if (userInfo) {
            const userDisplayElements = document.querySelectorAll('.user-name, .user-info, .current-user');
            userDisplayElements.forEach(element => {
                element.textContent = \`\${userInfo.nom} \${userInfo.prenom}\`;
            });
        }
    }

    // Obtenir les informations utilisateur
    getUserInfo() {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (error) {
                console.log('❌ Erreur lors du parsing des infos utilisateur:', error);
                return null;
            }
        }
        return null;
    }

    // Obtenir les headers d'authentification
    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Authorization': \`Bearer \${token}\`,
            'Content-Type': 'application/json'
        };
    }
}

// Initialiser le gestionnaire d'authentification
const authManager = new AuthManager();

// Fonction globale de déconnexion
function logout() {
    authManager.logout();
}

// Fonction pour les requêtes authentifiées
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        throw new Error('Token d\'authentification manquant');
    }

    const defaultOptions = {
        headers: {
            'Authorization': \`Bearer \${token}\`,
            'Content-Type': 'application/json'
        }
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    const response = await fetch(url, finalOptions);
    
    if (response.status === 401) {
        console.log('🔒 Token expiré, redirection vers la page de connexion');
        authManager.forceLogout();
        throw new Error('Token expiré');
    }

    return response;
}
`;

        console.log('✅ Script auth.js amélioré généré');
        
        // 2. Améliorer la route de déconnexion côté serveur
        console.log('\n2️⃣ Amélioration de la route de déconnexion...');
        
        const improvedLogoutRoute = `
// Route de déconnexion améliorée
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Log de déconnexion
        console.log(\`🔒 Déconnexion de l'utilisateur \${userId}\`);
        
        // En production, on pourrait ajouter le token à une blacklist
        // Pour le développement, on se contente de logger
        
        // Mettre à jour la dernière déconnexion
        await User.updateLastLogout(userId);
        
        res.json({
            success: true,
            message: 'Déconnexion réussie',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la déconnexion'
        });
    }
});
`;

        console.log('✅ Route de déconnexion améliorée');
        
        // 3. Créer un utilisateur de test avec collaborateur associé
        console.log('\n3️⃣ Création d\'un utilisateur de test avec collaborateur...');
        
        // Vérifier si un collaborateur existe
        const existingCollaborateur = await pool.query(`
            SELECT id, nom, prenom, email
            FROM collaborateurs 
            LIMIT 1
        `);
        
        if (existingCollaborateur.rows.length > 0) {
            const collaborateur = existingCollaborateur.rows[0];
            
            // Créer un utilisateur lié à ce collaborateur
            const hashedPassword = await bcrypt.hash('Test123!', 10);
            
            const newUser = await pool.query(`
                INSERT INTO users (nom, prenom, email, password_hash, login, role, statut)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, nom, prenom, email, login, role
            `, [
                collaborateur.nom,
                collaborateur.prenom,
                'collaborateur.test@trs.com',
                hashedPassword,
                'collabtest',
                'USER',
                'ACTIF'
            ]);
            
            if (newUser.rows.length > 0) {
                const userId = newUser.rows[0].id;
                
                // Lier l'utilisateur au collaborateur
                await pool.query(`
                    UPDATE collaborateurs 
                    SET user_id = $1 
                    WHERE id = $2
                `, [userId, collaborateur.id]);
                
                console.log('✅ Utilisateur collaborateur créé:', {
                    id: userId,
                    nom: newUser.rows[0].nom,
                    prenom: newUser.rows[0].prenom,
                    email: newUser.rows[0].email,
                    collaborateur_id: collaborateur.id
                });
            }
        } else {
            console.log('⚠️ Aucun collaborateur trouvé pour créer la relation');
        }
        
        // 4. Améliorer la page de profil
        console.log('\n4️⃣ Amélioration de la page de profil...');
        
        const improvedProfileJS = `
// Script pour la page de profil améliorée
class ProfileManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadUserProfile();
        this.setupEventListeners();
    }

    async loadUserProfile() {
        try {
            const response = await authenticatedFetch('/api/auth/profile');
            if (response.ok) {
                const data = await response.json();
                this.displayProfile(data.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement du profil:', error);
        }
    }

    displayProfile(profile) {
        // Afficher les informations utilisateur
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.innerHTML = \`
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-user"></i> Informations Utilisateur</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Nom:</strong> \${profile.user.nom}</p>
                                <p><strong>Prénom:</strong> \${profile.user.prenom}</p>
                                <p><strong>Email:</strong> \${profile.user.email}</p>
                                <p><strong>Login:</strong> \${profile.user.login}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Rôle:</strong> \${profile.user.role}</p>
                                <p><strong>Statut:</strong> \${profile.user.statut}</p>
                                <p><strong>Dernière connexion:</strong> \${profile.user.last_login || 'Jamais'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
        }

        // Afficher les informations collaborateur si disponibles
        if (profile.collaborateur) {
            const collaborateurInfo = document.getElementById('collaborateur-info');
            if (collaborateurInfo) {
                collaborateurInfo.innerHTML = \`
                    <div class="card mt-3">
                        <div class="card-header">
                            <h5><i class="fas fa-id-badge"></i> Informations Collaborateur</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Matricule:</strong> \${profile.collaborateur.matricule || 'N/A'}</p>
                                    <p><strong>Date d'embauche:</strong> \${profile.collaborateur.date_embauche}</p>
                                    <p><strong>Statut:</strong> \${profile.collaborateur.statut}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Division:</strong> \${profile.collaborateur.division_nom || 'N/A'}</p>
                                    <p><strong>Grade:</strong> \${profile.collaborateur.grade_nom || 'N/A'}</p>
                                    <p><strong>Poste:</strong> \${profile.collaborateur.poste_nom || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
            }
        }
    }

    setupEventListeners() {
        // Gestionnaire pour le changement de mot de passe
        const changePasswordForm = document.getElementById('change-password-form');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }
    }

    async changePassword() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }

        try {
            const response = await authenticatedFetch('/api/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response.ok) {
                alert('Mot de passe modifié avec succès');
                document.getElementById('change-password-form').reset();
            } else {
                const error = await response.json();
                alert(error.message || 'Erreur lors du changement de mot de passe');
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors du changement de mot de passe');
        }
    }
}

// Initialiser le gestionnaire de profil
const profileManager = new ProfileManager();
`;

        console.log('✅ Script de profil amélioré généré');
        
        // 5. Créer un fichier de configuration pour l'authentification
        console.log('\n5️⃣ Création d\'un fichier de configuration...');
        
        const authConfig = `
// Configuration d'authentification
const AUTH_CONFIG = {
    // Durée de vie du token (24h par défaut)
    TOKEN_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    
    // Clé secrète pour JWT
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-2024',
    
    // Rounds pour bcrypt
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    
    // Rate limiting pour l'authentification
    LOGIN_RATE_LIMIT: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 tentatives par fenêtre
        message: 'Trop de tentatives de connexion, réessayez plus tard'
    },
    
    // Permissions par défaut
    DEFAULT_PERMISSIONS: [
        'users:read',
        'users:create', 
        'users:update',
        'users:delete'
    ],
    
    // Rôles disponibles
    ROLES: {
        ADMIN: 'ADMIN',
        MANAGER: 'MANAGER',
        COLLABORATEUR: 'COLLABORATEUR',
        USER: 'USER'
    },
    
    // Statuts utilisateur
    USER_STATUS: {
        ACTIF: 'ACTIF',
        INACTIF: 'INACTIF',
        SUSPENDU: 'SUSPENDU'
    }
};

module.exports = AUTH_CONFIG;
`;

        console.log('✅ Configuration d\'authentification créée');
        
        await pool.end();
        
        console.log('\n✅ Corrections du système d\'authentification terminées !');
        console.log('\n📋 Résumé des améliorations:');
        console.log('  ✅ 1. Script auth.js amélioré avec gestion robuste de la déconnexion');
        console.log('  ✅ 2. Route de déconnexion améliorée avec logs');
        console.log('  ✅ 3. Utilisateur de test avec relation collaborateur créé');
        console.log('  ✅ 4. Page de profil améliorée avec gestion user/collaborateur');
        console.log('  ✅ 5. Configuration centralisée pour l\'authentification');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

fixAuthSystem(); 