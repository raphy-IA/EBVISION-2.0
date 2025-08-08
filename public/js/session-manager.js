/**
 * Gestionnaire de session centralisé
 * Charge et met en cache les informations utilisateur/collaborateur
 */
class SessionManager {
    constructor() {
        this.user = null;
        this.collaborateur = null;
        this.isLoaded = false;
        this.loadingPromise = null;
    }

    /**
     * Initialise la session en chargeant les données utilisateur
     */
    async initialize() {
        if (this.isLoaded) {
            return this.user;
        }

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this._loadUserData();
        return this.loadingPromise;
    }

    /**
     * Charge les données utilisateur depuis l'API
     */
    async _loadUserData() {
        try {
            console.log('🔍 SessionManager: Chargement des données utilisateur...');
            
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Aucun token d\'authentification trouvé');
            }

            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Erreur lors du chargement du profil');
            }

            this.user = data.data.user;
            this.collaborateur = this._extractCollaborateurInfo(data.data.user);
            this.isLoaded = true;

            console.log('✅ SessionManager: Données utilisateur chargées:', {
                user: {
                    id: this.user.id,
                    nom: this.user.nom,
                    prenom: this.user.prenom,
                    role: this.user.role,
                    collaborateur_id: this.user.collaborateur_id
                },
                collaborateur: this.collaborateur ? {
                    id: this.collaborateur.id,
                    nom: this.collaborateur.nom,
                    prenom: this.collaborateur.prenom,
                    business_unit_id: this.collaborateur.business_unit_id,
                    business_unit_nom: this.collaborateur.business_unit_nom,
                    division_id: this.collaborateur.division_id,
                    division_nom: this.collaborateur.division_nom
                } : null
            });

            return this.user;

        } catch (error) {
            console.error('❌ SessionManager: Erreur lors du chargement:', error);
            this.isLoaded = false;
            this.loadingPromise = null;
            throw error;
        }
    }

    /**
     * Extrait les informations collaborateur des données utilisateur
     */
                    _extractCollaborateurInfo(userData) {
                    if (!userData.collaborateur_id) {
                        return null;
                    }

                    return {
                        id: userData.collaborateur_id,
                        nom: userData.nom,
                        prenom: userData.prenom,
                        email: userData.collaborateur_email || userData.email,
                        business_unit_id: userData.business_unit_id,
                        business_unit_nom: userData.business_unit_nom,
                        division_id: userData.division_id,
                        division_nom: userData.division_nom,
                        grade_nom: userData.grade_nom,
                        poste_nom: userData.poste_nom
                    };
                }

    /**
     * Récupère les informations utilisateur (depuis le cache)
     */
    getUser() {
        if (!this.isLoaded) {
            throw new Error('SessionManager non initialisé. Appelez initialize() d\'abord.');
        }
        return this.user;
    }

    /**
     * Récupère les informations collaborateur (depuis le cache)
     */
    getCollaborateur() {
        if (!this.isLoaded) {
            throw new Error('SessionManager non initialisé. Appelez initialize() d\'abord.');
        }
        return this.collaborateur;
    }

    /**
     * Vérifie si l'utilisateur est un administrateur
     */
    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'ADMIN';
    }

    /**
     * Vérifie si l'utilisateur a un collaborateur associé
     */
    hasCollaborateur() {
        return this.collaborateur !== null;
    }

    /**
     * Récupère la business unit du collaborateur
     */
    getBusinessUnit() {
        if (!this.hasCollaborateur()) {
            return null;
        }
        return {
            id: this.collaborateur.business_unit_id,
            nom: this.collaborateur.business_unit_nom
        };
    }

    /**
     * Récupère la division du collaborateur
     */
    getDivision() {
        if (!this.hasCollaborateur()) {
            return null;
        }
        return {
            id: this.collaborateur.division_id,
            nom: this.collaborateur.division_nom
        };
    }

    /**
     * Force le rechargement des données (utile après mise à jour)
     */
    async refresh() {
        console.log('🔄 SessionManager: Rechargement des données...');
        this.isLoaded = false;
        this.loadingPromise = null;
        return await this.initialize();
    }

    /**
     * Nettoie la session (logout)
     */
    clear() {
        this.user = null;
        this.collaborateur = null;
        this.isLoaded = false;
        this.loadingPromise = null;
        console.log('🧹 SessionManager: Session nettoyée');
    }

    /**
     * Récupère un résumé des informations de session
     */
    getSessionInfo() {
        if (!this.isLoaded) {
            return { loaded: false };
        }

        return {
            loaded: true,
            user: {
                id: this.user.id,
                nom: this.user.nom,
                prenom: this.user.prenom,
                role: this.user.role,
                hasCollaborateur: this.hasCollaborateur()
            },
            collaborateur: this.collaborateur ? {
                id: this.collaborateur.id,
                nom: this.collaborateur.nom,
                prenom: this.collaborateur.prenom,
                business_unit: this.getBusinessUnit(),
                division: this.getDivision()
            } : null,
            isAdmin: this.isAdmin()
        };
    }
}

// Instance globale du SessionManager
window.sessionManager = new SessionManager();

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionManager;
}
