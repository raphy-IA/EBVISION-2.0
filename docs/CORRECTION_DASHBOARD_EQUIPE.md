# Correction Dashboard Équipe - Autorisations Managériales

**Date** : 29 octobre 2025  
**Problème** : Dashboard équipe ne vérifie pas les autorisations managériales  
**Solution** : Utiliser le système existant (`Manager.isBusinessUnitManager`, `Manager.isDivisionManager`)

---

## 🔍 **PROBLÈME IDENTIFIÉ**

L'API `/api/analytics/team-performance` accepte n'importe quelle Business Unit ou Division sans vérifier si le manager connecté est autorisé à voir ces données.

**Conséquence** : Un manager de la Division A peut voir les données de la Division B en modifiant l'URL.

---

## ✅ **SYSTÈME EXISTANT À UTILISER**

Le système d'autorisations managériales **existe déjà** :

### Tables
- `business_units` : `responsable_principal_id`, `responsable_adjoint_id`
- `divisions` : `responsable_principal_id`, `responsable_adjoint_id`

### Modèle existant : `src/models/Manager.js`
```javascript
// Méthodes existantes à réutiliser
Manager.isBusinessUnitManager(collaborateurId, businessUnitId)  // → boolean
Manager.isDivisionManager(collaborateurId, divisionId)          // → boolean
Manager.getBusinessUnitManagers(businessUnitId)                 // → {principal_id, adjoint_id}
Manager.getDivisionManagers(divisionId)                         // → {principal_id, adjoint_id}
```

---

## 🔧 **CORRECTIONS À APPLIQUER**

### Fichier 1 : `src/routes/dashboard-analytics.js`

#### Modification de `/api/analytics/team-performance`

**AVANT** (ligne 981-1111) :
```javascript
router.get('/team-performance', authenticateToken, async (req, res) => {
    try {
        const { 
            period = 90, 
            businessUnit,   // ⚠️ Pas de vérification !
            division        // ⚠️ Pas de vérification !
        } = req.query;
        
        // ... requêtes SQL directes ...
    }
});
```

**APRÈS** :
```javascript
router.get('/team-performance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = 90, businessUnit, division } = req.query;
        
        // 1. Récupérer le collaborateur_id de l'utilisateur
        const collaborateurQuery = `SELECT id FROM collaborateurs WHERE user_id = $1`;
        const collabResult = await pool.query(collaborateurQuery, [userId]);
        
        if (collabResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Vous devez être un collaborateur pour accéder à ce dashboard'
            });
        }
        
        const collaborateurId = collabResult.rows[0].id;
        
        // 2. Vérifier les rôles de l'utilisateur (SUPER_ADMIN, ADMIN, etc. ont accès total)
        const rolesQuery = `
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `;
        const rolesResult = await pool.query(rolesQuery, [userId]);
        const userRoles = rolesResult.rows.map(r => r.name);
        
        const isAdmin = userRoles.includes('SUPER_ADMIN') || 
                        userRoles.includes('ADMIN') || 
                        userRoles.includes('DIRECTEUR') || 
                        userRoles.includes('ASSOCIE');
        
        // 3. Si pas admin, vérifier les autorisations managériales
        let authorizedBusinessUnit = businessUnit;
        let authorizedDivision = division;
        
        if (!isAdmin) {
            const Manager = require('../models/Manager');
            
            // Vérifier autorisation pour Business Unit demandée
            if (businessUnit) {
                const isAuthorizedBU = await Manager.isBusinessUnitManager(collaborateurId, businessUnit);
                if (!isAuthorizedBU) {
                    return res.status(403).json({
                        success: false,
                        error: 'Vous n\'êtes pas autorisé à voir les données de cette Business Unit'
                    });
                }
            }
            
            // Vérifier autorisation pour Division demandée
            if (division) {
                const isAuthorizedDiv = await Manager.isDivisionManager(collaborateurId, division);
                if (!isAuthorizedDiv) {
                    return res.status(403).json({
                        success: false,
                        error: 'Vous n\'êtes pas autorisé à voir les données de cette Division'
                    });
                }
            }
            
            // Si aucun filtre spécifié, charger la première équipe gérée
            if (!businessUnit && !division) {
                // Récupérer les BU gérées
                const managedBUsQuery = `
                    SELECT id FROM business_units
                    WHERE responsable_principal_id = $1 OR responsable_adjoint_id = $1
                    ORDER BY nom
                    LIMIT 1
                `;
                const managedBUs = await pool.query(managedBUsQuery, [collaborateurId]);
                
                // Récupérer les Divisions gérées
                const managedDivsQuery = `
                    SELECT id FROM divisions
                    WHERE responsable_principal_id = $1 OR responsable_adjoint_id = $1
                    ORDER BY nom
                    LIMIT 1
                `;
                const managedDivs = await pool.query(managedDivsQuery, [collaborateurId]);
                
                // Priorité aux divisions
                if (managedDivs.rows.length > 0) {
                    authorizedDivision = managedDivs.rows[0].id;
                } else if (managedBUs.rows.length > 0) {
                    authorizedBusinessUnit = managedBUs.rows[0].id;
                } else {
                    return res.status(403).json({
                        success: false,
                        error: 'Vous ne gérez aucune équipe'
                    });
                }
            }
        }
        
        // 4. Calculer les dates
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));
        
        // 5. Construire les conditions WHERE (en utilisant authorizedBusinessUnit et authorizedDivision)
        let whereConditions = ['te.date_saisie >= $1 AND te.date_saisie <= $2'];
        let params = [startDate.toISOString(), endDate.toISOString()];
        let paramIndex = 3;
        
        if (authorizedBusinessUnit) {
            whereConditions.push(`bu.id = $${paramIndex++}`);
            params.push(authorizedBusinessUnit);
        }
        
        if (authorizedDivision) {
            whereConditions.push(`d.id = $${paramIndex++}`);
            params.push(authorizedDivision);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // 6. Continuer avec les requêtes existantes...
        // (reste identique)
        
    } catch (error) {
        console.error('Erreur team-performance:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la performance équipe'
        });
    }
});
```

---

### Fichier 2 : Créer un nouvel endpoint `/managed-teams`

**Nouveau fichier** : Ajouter dans `src/routes/dashboard-analytics.js` (après `/team-performance`)

```javascript
// GET /api/analytics/managed-teams - Récupérer les équipes gérées par le manager
router.get('/managed-teams', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Récupérer le collaborateur_id
        const collabQuery = `SELECT id FROM collaborateurs WHERE user_id = $1`;
        const collabResult = await pool.query(collabQuery, [userId]);
        
        if (collabResult.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    business_units: [],
                    divisions: [],
                    is_manager: false
                }
            });
        }
        
        const collaborateurId = collabResult.rows[0].id;
        
        // Récupérer les BU gérées
        const busQuery = `
            SELECT id, nom, code, description
            FROM business_units
            WHERE responsable_principal_id = $1 OR responsable_adjoint_id = $1
            ORDER BY nom
        `;
        const busResult = await pool.query(busQuery, [collaborateurId]);
        
        // Récupérer les Divisions gérées
        const divsQuery = `
            SELECT id, nom, code, description, business_unit_id
            FROM divisions
            WHERE responsable_principal_id = $1 OR responsable_adjoint_id = $1
            ORDER BY nom
        `;
        const divsResult = await pool.query(divsQuery, [collaborateurId]);
        
        res.json({
            success: true,
            data: {
                business_units: busResult.rows,
                divisions: divsResult.rows,
                is_manager: busResult.rows.length > 0 || divsResult.rows.length > 0
            }
        });
        
    } catch (error) {
        console.error('Erreur managed-teams:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des équipes gérées'
        });
    }
});
```

---

### Fichier 3 : Modifier le frontend `public/js/dashboard-equipe.js`

**Modification 1** : Ajouter au début du fichier

```javascript
// Au chargement du dashboard
document.addEventListener('DOMContentLoaded', async function() {
    await initializeDashboard();
});

async function initializeDashboard() {
    try {
        console.log('🚀 Initialisation du Dashboard Équipe...');
        
        // 1. Charger les équipes gérées
        const response = await authenticatedFetch('/api/analytics/managed-teams');
        const result = await response.json();
        
        if (!result.success) {
            showError('Erreur', 'Impossible de charger vos équipes');
            return;
        }
        
        const { business_units, divisions, is_manager } = result.data;
        
        // 2. Vérifier si l'utilisateur est un manager
        if (!is_manager) {
            showWarning(
                'Accès restreint',
                'Vous devez être responsable d\'une Business Unit ou Division pour accéder à ce dashboard.'
            );
            return;
        }
        
        // 3. Peupler les filtres avec UNIQUEMENT les équipes gérées
        populateBusinessUnitFilter(business_units);
        populateDivisionFilter(divisions);
        
        // 4. Charger automatiquement la première équipe
        let initialBusinessUnit = null;
        let initialDivision = null;
        
        if (divisions.length > 0) {
            // Priorité aux divisions
            initialDivision = divisions[0].id;
        } else if (business_units.length > 0) {
            // Sinon, BU
            initialBusinessUnit = business_units[0].id;
        }
        
        // 5. Charger les données
        await loadTeamPerformance(initialBusinessUnit, initialDivision);
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showError('Erreur technique', 'Impossible d\'initialiser le dashboard');
    }
}

// Fonction pour afficher un avertissement
function showWarning(title, message) {
    const mainContent = document.querySelector('.main-content-area');
    if (!mainContent) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-warning alert-dismissible fade show mb-4';
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>
        <strong>${title}</strong><br>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    mainContent.insertBefore(alertDiv, mainContent.firstChild);
}
```

---

## 📋 **RÉSUMÉ DES CORRECTIONS**

### Backend
1. ✅ Vérifier `collaborateur_id` de l'utilisateur
2. ✅ Vérifier si ADMIN/SUPER_ADMIN (bypass)
3. ✅ Utiliser `Manager.isBusinessUnitManager()` pour vérifier autorisation BU
4. ✅ Utiliser `Manager.isDivisionManager()` pour vérifier autorisation Division
5. ✅ Créer endpoint `/managed-teams` pour lister les équipes gérées
6. ✅ Charger automatiquement la première équipe gérée si aucun filtre

### Frontend
1. ✅ Charger les équipes gérées au démarrage
2. ✅ Afficher message si pas manager
3. ✅ Charger automatiquement la première équipe
4. ✅ Peupler les filtres avec UNIQUEMENT les équipes gérées

---

## 🔒 **SÉCURITÉ**

### Avant
- ❌ Manager Division A voit Division B
- ❌ Pas de vérification d'autorisation
- ❌ Violation confidentialité / RGPD

### Après
- ✅ Manager ne voit QUE ses équipes
- ✅ Vérification via `Manager.isBusinessUnitManager/isDivisionManager`
- ✅ Respect de la hiérarchie organisationnelle
- ✅ ADMIN/SUPER_ADMIN ont accès total (bypass)

---

**Document préparé par** : Assistant IA  
**Date** : 29 octobre 2025  
**Statut** : Prêt à implémenter





