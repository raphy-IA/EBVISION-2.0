# Analyse du Dashboard Équipe - EB-Vision 2.0

**Date** : 29 octobre 2025  
**Dashboard** : `/dashboard-equipe.html`  
**API** : `/api/analytics/team-performance`

---

## 🎯 **DÉFINITION D'UNE "ÉQUIPE"**

### Dans le contexte de l'application :

Une **équipe** peut être définie de **deux manières** :

#### 1. **Équipe de Mission** (`equipes_mission`)
- **Définition** : Collaborateurs assignés à une mission spécifique
- **Table** : `equipes_mission` (mission_id, collaborateur_id, role, taux_horaire_mission)
- **Contexte** : Collaboration temporaire sur un projet client

#### 2. **Équipe Managériale** (Business Unit / Division)
- **Définition** : Collaborateurs d'une même **Business Unit** ou **Division**
- **Hiérarchie** : 
  - **Business Unit** (niveau supérieur) → ex: "EB-AUDIT", "EB-CONSEIL"
  - **Division** (sous-niveau) → ex: "Division Audit Légal", "Division Finance"
- **Contexte** : Structure organisationnelle permanente

### ✅ **Choix retenu pour le Dashboard Équipe**
Le dashboard utilise la **définition managériale** : équipe = collaborateurs d'une **Business Unit** et/ou **Division**.

---

## 👥 **PUBLIC CIBLE**

### Rôles autorisés :
D'après la hiérarchie des rôles (`src/middleware/auth.js`) :

| Rôle | Niveau | Accès Dashboard Équipe |
|------|--------|------------------------|
| **MANAGER** | 5 | ✅ Oui |
| **SUPERVISEUR** | 4 | ✅ Oui |
| **DIRECTEUR** | 6 | ✅ Oui |
| **ASSOCIE** | 7 | ✅ Oui |
| **ADMIN** | 9 | ✅ Oui |
| **SUPER_ADMIN** | 10 | ✅ Oui |
| CONSULTANT | 3 | ❌ Non |
| COLLABORATEUR | 2 | ❌ Non |
| USER | 1 | ❌ Non |

### Contexte d'utilisation :
- **Managers de Division** : Supervisent une division spécifique
- **Managers de Business Unit** : Supervisent une BU complète (plusieurs divisions)
- **Directeurs / Associés** : Vision multi-BU
- **Admins** : Vision globale

---

## 📊 **PHILOSOPHIE DU DASHBOARD**

D'après le Cahier des Charges (Module 6 - Évaluation & Pilotage) :

### Objectifs :
1. **Pilotage d'équipe** : Vue en temps réel de la performance collective
2. **Équité de charge** : Identifier les déséquilibres de répartition
3. **Détection de besoins** : Repérer collaborateurs en difficulté ou surcharge
4. **Identification des top performers** : Valoriser les meilleurs éléments
5. **Prise de décision** : Basée sur des données objectives

### KPIs attendus :
- Taux de chargeabilité moyen de l'équipe
- Heures totales (facturables vs non-facturables)
- Nombre de membres actifs
- Nombre de missions actives
- Performance individuelle par collaborateur
- Distribution par grade

---

## ❌ **PROBLÈMES CRITIQUES IDENTIFIÉS**

### 1. **🔴 Absence de Vérification d'Autorisation**

**Symptôme** :
L'API `/api/analytics/team-performance` accepte **n'importe quelle** `businessUnit` ou `division` sans vérifier si l'utilisateur connecté est **autorisé** à voir ces données.

**Code actuel (src/routes/dashboard-analytics.js, ligne 981-987)** :
```javascript
router.get('/team-performance', authenticateToken, async (req, res) => {
    const { 
        period = 90, 
        businessUnit,   // ⚠️ Pas de vérification d'autorisation
        division        // ⚠️ Pas de vérification d'autorisation
    } = req.query;
    // ...
}
```

**Problème** :
Un manager de la Division A pourrait voir les données de la Division B en modifiant simplement les paramètres de l'URL.

**Impact** :
- ❌ Violation de la confidentialité
- ❌ Risque de fuite de données sensibles
- ❌ Non-respect du RGPD

---

### 2. **🔴 Pas de Restriction Automatique**

**Problème** :
Si un manager ne spécifie pas de `businessUnit` ou `division`, l'API retourne les données de **TOUS** les collaborateurs de l'entreprise.

**Code actuel (ligne 995-1009)** :
```javascript
let whereConditions = ['te.date_saisie >= $1 AND te.date_saisie <= $2'];

if (businessUnit) {
    whereConditions.push(`bu.id = $${paramIndex++}`);
}

if (division) {
    whereConditions.push(`d.id = $${paramIndex++}`);
}
```

**Conséquence** :
Si `businessUnit` et `division` sont `null` → **Pas de filtre** → Toutes les données sont renvoyées.

**Impact** :
- ❌ Un MANAGER voit les données de toute l'entreprise
- ❌ Violation de la séparation des responsabilités

---

### 3. **🔴 Pas de Fallback sur l'Équipe du Manager**

**Problème** :
Le dashboard ne charge **pas automatiquement** l'équipe du manager connecté.

**Comportement attendu** :
1. Manager de Division se connecte → Dashboard affiche **SA division** par défaut
2. Manager de BU se connecte → Dashboard affiche **SA BU** par défaut

**Comportement actuel** :
1. Manager se connecte → Dashboard vide ou données globales
2. Manager doit **manuellement** sélectionner sa BU/Division dans les filtres

**Impact** :
- ❌ Expérience utilisateur dégradée
- ❌ Risque d'erreur (manager sélectionne mauvaise BU/Division)

---

### 4. **🔴 Données Vides Sans Message Explicatif**

Identique au problème du Dashboard Personnel :
- Si aucune `time_entries` pour la période → Dashboard vide
- Pas de message explicatif
- Pas de call-to-action

---

### 5. **🔴 Gestion d'Erreurs Silencieuse**

Identique au Dashboard Personnel :
```javascript
catch (error) {
    console.error('Erreur team-performance:', error);  // ⚠️ Silencieux
    res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de la performance équipe'
    });
}
```

Pas de feedback utilisateur visible côté frontend.

---

## ✅ **POINTS FORTS IDENTIFIÉS**

### 1. **Structure HTML Cohérente**
- ✅ Utilise `.page-wrapper` → `.sidebar-container` → `.main-content-area`
- ✅ Cohérent avec l'architecture globale

### 2. **KPIs Pertinents**
- ✅ Total membres
- ✅ Total heures
- ✅ Taux de chargeabilité
- ✅ Missions actives
- ✅ Performance par collaborateur

### 3. **Graphiques Adaptés**
- ✅ Performance par collaborateur (bar chart)
- ✅ Distribution par grade (pie chart)

### 4. **Filtres Bien Pensés**
- ✅ Période (90, 30, 7 jours)
- ✅ Business Unit
- ✅ Division

---

## 🔧 **SOLUTIONS PROPOSÉES**

### **Solution 1 : Ajouter Vérification d'Autorisation**

#### Backend (src/routes/dashboard-analytics.js)

**Étape 1** : Récupérer les BU/Divisions gérées par le manager

```javascript
router.get('/team-performance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = 90, businessUnit, division } = req.query;
        
        // 1. Vérifier si l'utilisateur est un manager
        const { pool } = require('../utils/database');
        
        const collaborateurQuery = `
            SELECT c.id, c.business_unit_id, c.division_id
            FROM collaborateurs c
            WHERE c.user_id = $1
        `;
        const collabResult = await pool.query(collaborateurQuery, [userId]);
        
        if (collabResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Collaborateur non trouvé'
            });
        }
        
        const collaborateurId = collabResult.rows[0].id;
        
        // 2. Récupérer les BU/Divisions gérées
        const managedQuery = `
            SELECT 
                bu_principal.id as bu_principal_id,
                bu_adjoint.id as bu_adjoint_id,
                div_principal.id as div_principal_id,
                div_adjoint.id as div_adjoint_id
            FROM collaborateurs c
            LEFT JOIN business_units bu_principal ON bu_principal.responsable_principal_id = c.id
            LEFT JOIN business_units bu_adjoint ON bu_adjoint.responsable_adjoint_id = c.id
            LEFT JOIN divisions div_principal ON div_principal.responsable_principal_id = c.id
            LEFT JOIN divisions div_adjoint ON div_adjoint.responsable_adjoint_id = c.id
            WHERE c.id = $1
        `;
        
        const managedResult = await pool.query(managedQuery, [collaborateurId]);
        const managed = managedResult.rows[0];
        
        // 3. Construire la liste des BU/Divisions autorisées
        const managedBUs = [];
        const managedDivisions = [];
        
        if (managed.bu_principal_id) managedBUs.push(managed.bu_principal_id);
        if (managed.bu_adjoint_id) managedBUs.push(managed.bu_adjoint_id);
        if (managed.div_principal_id) managedDivisions.push(managed.div_principal_id);
        if (managed.div_adjoint_id) managedDivisions.push(managed.div_adjoint_id);
        
        // 4. Vérifier si l'utilisateur a le rôle ADMIN/SUPER_ADMIN (accès total)
        const rolesQuery = `
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        `;
        const rolesResult = await pool.query(rolesQuery, [userId]);
        const userRoles = rolesResult.rows.map(r => r.name);
        
        const isAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('ADMIN') || userRoles.includes('DIRECTEUR') || userRoles.includes('ASSOCIE');
        
        // 5. Appliquer les restrictions si pas admin
        let authorizedBusinessUnit = businessUnit;
        let authorizedDivision = division;
        
        if (!isAdmin) {
            // Vérifier l'autorisation pour la BU demandée
            if (businessUnit && !managedBUs.includes(businessUnit)) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé à cette Business Unit'
                });
            }
            
            // Vérifier l'autorisation pour la Division demandée
            if (division && !managedDivisions.includes(division)) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé à cette Division'
                });
            }
            
            // Si aucun filtre spécifié, utiliser la première BU/Division gérée
            if (!businessUnit && !division) {
                if (managedDivisions.length > 0) {
                    authorizedDivision = managedDivisions[0];
                } else if (managedBUs.length > 0) {
                    authorizedBusinessUnit = managedBUs[0];
                } else {
                    return res.status(403).json({
                        success: false,
                        error: 'Vous ne gérez aucune équipe'
                    });
                }
            }
        }
        
        // Continuer avec les requêtes existantes en utilisant authorizedBusinessUnit et authorizedDivision
        // ...
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

### **Solution 2 : Ajouter Endpoint pour Récupérer Équipes Gérées**

**Nouveau endpoint** : `GET /api/analytics/managed-teams`

```javascript
// GET /api/analytics/managed-teams - Récupérer les équipes gérées par le manager
router.get('/managed-teams', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { pool } = require('../utils/database');
        
        // Récupérer le collaborateur
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
            SELECT id, nom, code
            FROM business_units
            WHERE responsable_principal_id = $1 OR responsable_adjoint_id = $1
        `;
        const busResult = await pool.query(busQuery, [collaborateurId]);
        
        // Récupérer les Divisions gérées
        const divsQuery = `
            SELECT id, nom, code, business_unit_id
            FROM divisions
            WHERE responsable_principal_id = $1 OR responsable_adjoint_id = $1
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

### **Solution 3 : Modifier le Frontend pour Charger Automatiquement**

**Fichier** : `public/js/dashboard-equipe.js`

```javascript
// Au chargement du dashboard
async function initializeDashboard() {
    try {
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
                'Vous devez être manager pour accéder à ce dashboard.'
            );
            return;
        }
        
        // 3. Peupler les filtres
        populateBusinessUnitFilter(business_units);
        populateDivisionFilter(divisions);
        
        // 4. Charger automatiquement la première équipe
        if (divisions.length > 0) {
            // Priorité aux divisions
            currentDivision = divisions[0].id;
            await loadTeamPerformance(null, currentDivision);
        } else if (business_units.length > 0) {
            // Sinon, BU
            currentBusinessUnit = business_units[0].id;
            await loadTeamPerformance(currentBusinessUnit, null);
        }
        
    } catch (error) {
        console.error('Erreur initialisation:', error);
        showError('Erreur technique', 'Impossible d\'initialiser le dashboard');
    }
}
```

---

## 📊 **SCORE D'ALIGNEMENT CDC**

| Fonctionnalité CDC | Statut Actuel | Alignement |
|--------------------|---------------|------------|
| **Dashboard équipe** | ✅ Existe | ✅ 60% |
| KPIs équipe | ✅ Présents | ✅ 90% |
| Performance individuelle | ✅ Présente | ✅ 100% |
| Distribution par grade | ✅ Présente | ✅ 100% |
| **Autorisation manager** | ❌ Absent | ❌ 0% |
| **Restriction automatique** | ❌ Absent | ❌ 0% |
| **Chargement auto équipe** | ❌ Absent | ❌ 0% |
| Gestion d'erreurs | ❌ Silencieuse | ❌ 20% |
| Graphiques vides | ❌ Sans message | ❌ 0% |
| Comparaison vs objectifs | ❌ Absent | ❌ 0% |
| Alertes équipe | ❌ Absent | ❌ 0% |

**Score Global** : **34% d'alignement** avec le CDC

---

## 📋 **RECOMMANDATIONS PRIORITAIRES**

### 🔴 Priorité 1 : CRITIQUE (1-2 jours)

1. **Ajouter vérification d'autorisation**
   - Vérifier que le manager a le droit de voir la BU/Division
   - Bloquer accès non autorisé avec erreur 403

2. **Ajouter endpoint `/managed-teams`**
   - Retourner les BU/Divisions gérées par le manager
   - Permettre au frontend de charger automatiquement

3. **Modifier frontend pour chargement auto**
   - Charger automatiquement la première équipe gérée
   - Afficher message si pas manager

4. **Ajouter gestion d'erreurs visible**
   - Alertes Bootstrap pour erreurs API
   - Boutons "Rafraîchir" / "Fermer"

5. **Gérer graphiques vides**
   - Messages explicatifs si pas de données
   - Call-to-action

### 🟡 Priorité 2 : IMPORTANTE (1 semaine)

6. **Ajouter comparaison vs objectifs**
   - Objectifs de chargeabilité par équipe
   - Progression en %

7. **Ajouter alertes équipe**
   - Surcharge détectée (> X heures/semaine)
   - Sous-activité détectée (< Y heures/semaine)
   - Déséquilibre de charge

8. **Améliorer graphiques**
   - Tooltips détaillés
   - Zoom/drill-down sur collaborateur

### 🟢 Priorité 3 : AMÉLIORATIONS (1 mois)

9. **Ajouter tendances**
   - Évolution vs mois précédent
   - Prévisions basées sur historique

10. **Ajouter exports**
    - PDF de rapport équipe
    - Excel avec données détaillées

---

## 🚀 **PLAN D'ACTION IMMÉDIAT**

### Étape 1 : Corrections Critiques (Priorité 1)
1. Créer endpoint `/api/analytics/managed-teams`
2. Modifier `/api/analytics/team-performance` pour vérifier autorisations
3. Modifier `public/js/dashboard-equipe.js` pour charger automatiquement
4. Ajouter gestion d'erreurs visible
5. Gérer graphiques vides

### Étape 2 : Tests
- Test avec manager de Division
- Test avec manager de BU
- Test avec non-manager (doit être bloqué)
- Test avec ADMIN (accès total)

### Étape 3 : Améliorations (Priorités 2 & 3)
- Objectifs équipe
- Alertes
- Tendances
- Exports

---

## 📄 **CONCLUSION**

### État actuel
Le dashboard équipe est **fonctionnel** mais **très incomplet et non sécurisé** :
- ✅ Structure cohérente
- ✅ KPIs de base présents
- ✅ Graphiques pertinents
- ❌ **Aucune vérification d'autorisation** (critique)
- ❌ **Pas de restriction automatique** (critique)
- ❌ **Pas de chargement auto de l'équipe**
- ❌ Manque 66% des fonctionnalités prévues

### Priorité immédiate
🔴 **CRITIQUE** : Ajouter les autorisations (sécurité & RGPD)

---

**Document préparé par** : Assistant IA  
**Date** : 29 octobre 2025  
**Prochaine action** : Implémenter les corrections critiques








