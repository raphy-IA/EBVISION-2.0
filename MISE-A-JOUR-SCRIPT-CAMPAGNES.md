# ✅ Mise à Jour du Script - Campagnes de Prospection

## 📋 Modifications Apportées

Le script `7-generate-complete-demo.js` a été mis à jour pour créer des campagnes de prospection **réalistes** qui respectent le workflow de validation.

## 🔄 Nouveau Workflow Implémenté

### Campagnes Créées

Le script crée maintenant **6 campagnes** avec différents statuts :

| # | Nom | Canal | Statut | Priorité | Description |
|---|-----|-------|--------|----------|-------------|
| 1 | Campagne Audit Q1 2025 | EMAIL | **DRAFT** | NORMAL | Brouillon en cours de création |
| 2 | Campagne Conseil Management | PHYSIQUE | **PENDING_VALIDATION** | HIGH | Soumise au validateur |
| 3 | Campagne Juridique Entreprises | EMAIL | **VALIDATED** | NORMAL | Validée, prête à être lancée |
| 4 | Campagne Fiscal Q4 2024 | PHYSIQUE | **SENT** | NORMAL | Lancée et en cours |
| 5 | Campagne Audit Financier | EMAIL | **DRAFT** | LOW | Brouillon |
| 6 | Campagne Gestion Finance | PHYSIQUE | **VALIDATED** | HIGH | Validée |

## 🎯 Statuts et Workflow

### 1. DRAFT (Brouillon)
- **Validation_statut** : `BROUILLON`
- **Date_soumission** : `NULL`
- **Date_validation** : `NULL`
- **Action suivante** : Soumettre pour validation

### 2. PENDING_VALIDATION (En validation)
- **Validation_statut** : `EN_VALIDATION`
- **Date_soumission** : Date actuelle
- **Date_validation** : `NULL`
- **Action suivante** : Valider ou rejeter

### 3. VALIDATED (Validée)
- **Validation_statut** : `VALIDE`
- **Date_soumission** : Il y a 2 jours
- **Date_validation** : Il y a 1 jour
- **Action suivante** : Lancer la campagne

### 4. SENT (Soumise/Lancée)
- **Validation_statut** : `VALIDE`
- **Date_soumission** : Il y a 2 jours
- **Date_validation** : Il y a 1 jour
- **Action suivante** : Exécuter et suivre

## 📊 Structure des Données

### Champs Ajoutés

```javascript
{
    name: 'Nom de la campagne',
    channel: 'EMAIL' | 'PHYSIQUE',
    business_unit_id: UUID,
    division_id: UUID,
    responsible_id: UUID,           // Collaborateur responsable
    status: 'DRAFT' | 'PENDING_VALIDATION' | 'VALIDATED' | 'SENT',
    priority: 'LOW' | 'NORMAL' | 'HIGH',
    scheduled_date: DATE,
    description: TEXT,
    validation_statut: 'BROUILLON' | 'EN_VALIDATION' | 'VALIDE',
    date_soumission: TIMESTAMP,     // ✅ NOUVEAU
    date_validation: TIMESTAMP      // ✅ NOUVEAU
}
```

## 🔧 Code Modifié

### Avant

```javascript
const campaigns = [
    { name: 'Campagne Audit DEMO 2025', channel: 'EMAIL', buIdx: 0, divIdx: 0 },
    // ... toutes avec status: 'READY'
];

// Insertion simple
VALUES ($1, $2, $3, $4, $5, 'READY', 'NORMAL', $6, $7)
```

### Après

```javascript
const campaigns = [
    { name: 'Campagne Audit Q1 2025', channel: 'EMAIL', buIdx: 0, divIdx: 0, 
      status: 'DRAFT', priority: 'NORMAL' },
    { name: 'Campagne Conseil Management', channel: 'PHYSIQUE', buIdx: 0, divIdx: 1, 
      status: 'PENDING_VALIDATION', priority: 'HIGH' },
    // ... avec différents statuts
];

// Logique de validation selon le statut
if (campaign.status === 'PENDING_VALIDATION') {
    validationStatut = 'EN_VALIDATION';
    dateSoumission = new Date();
} else if (campaign.status === 'VALIDATED' || campaign.status === 'SENT') {
    validationStatut = 'VALIDE';
    dateSoumission = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    dateValidation = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
}

// Insertion avec dates
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
```

## 🎯 Cas d'Usage Démontrés

### 1. Création de Brouillon
**Campagne** : "Campagne Audit Q1 2025"
- Permet de tester la création et modification
- Peut être soumise pour validation

### 2. Validation en Attente
**Campagne** : "Campagne Conseil Management"
- Permet de tester le processus de validation
- Affiche dans la liste "En attente de validation"
- Peut être validée ou rejetée

### 3. Campagne Validée
**Campagne** : "Campagne Juridique Entreprises"
- Prête à être lancée
- Permet de tester le lancement

### 4. Campagne Active
**Campagne** : "Campagne Fiscal Q4 2024"
- En cours d'exécution
- Permet de tester le suivi et les conversions

## 📈 Résultat Attendu

Après exécution du script :

```bash
📢 Création des Campagnes de prospection...
   📊 Création avec 8 collaborateurs disponibles
   📝 Campagne 1: Campagne Audit Q1 2025 (DRAFT)
   📝 Campagne 2: Campagne Conseil Management (PENDING_VALIDATION)
   📝 Campagne 3: Campagne Juridique Entreprises (VALIDATED)
   📝 Campagne 4: Campagne Fiscal Q4 2024 (SENT)
   📝 Campagne 5: Campagne Audit Financier (DRAFT)
   📝 Campagne 6: Campagne Gestion Finance (VALIDATED)
   ✓ 6 campagnes
```

## 🔍 Vérification

### Dans l'Interface

1. **Page Campagnes de Prospection**
   - Voir les 6 campagnes avec leurs statuts
   - Filtrer par statut
   - Voir les dates de soumission/validation

2. **Actions Disponibles**
   - DRAFT : Modifier, Soumettre, Supprimer
   - PENDING_VALIDATION : Valider, Rejeter
   - VALIDATED : Lancer
   - SENT : Suivre, Créer opportunités

### En Base de Données

```sql
SELECT 
    name,
    channel,
    status,
    validation_statut,
    priority,
    date_soumission,
    date_validation,
    bu.nom as business_unit,
    c.prenom || ' ' || c.nom as responsable
FROM prospecting_campaigns pc
JOIN business_units bu ON pc.business_unit_id = bu.id
JOIN collaborateurs c ON pc.responsible_id = c.id
ORDER BY pc.created_at DESC;
```

## 🚀 Prochaines Étapes

### 1. Ajouter des Entreprises aux Campagnes

Créer la table de liaison et ajouter des entreprises :

```javascript
async function addCompaniesToCampaigns(pool, campaignIds, companyIds) {
    for (const campaignId of campaignIds) {
        // Ajouter 5-10 entreprises par campagne
        const numCompanies = 5 + Math.floor(Math.random() * 6);
        
        for (let i = 0; i < numCompanies; i++) {
            const companyId = companyIds[i % companyIds.length];
            
            await pool.query(`
                INSERT INTO prospecting_campaign_companies (
                    campaign_id, company_id, 
                    execution_status
                )
                VALUES ($1, $2, 'NOT_CONTACTED')
                ON CONFLICT DO NOTHING
            `, [campaignId, companyId]);
        }
    }
}
```

### 2. Créer des Modèles de Prospection

```javascript
async function createProspectingTemplates(pool, buIds) {
    const templates = [
        {
            name: 'Template Audit Financier',
            channel: 'EMAIL',
            content: 'Bonjour, nous proposons des services d\'audit...'
        },
        // ... autres templates
    ];
}
```

### 3. Simuler des Conversions

Pour les campagnes SENT, créer des opportunités :

```javascript
// Convertir 20% des entreprises contactées en opportunités
const conversionRate = 0.2;
```

## 📝 Documentation

J'ai créé **`WORKFLOW-CAMPAGNES-PROSPECTION.md`** qui documente :
- Le cycle de vie complet des campagnes
- Les rôles et permissions
- Les transitions de statut
- Les métriques et KPIs
- La structure des tables

## 🎓 Apprentissage

Cette mise à jour permet de :
- ✅ Comprendre le workflow de validation
- ✅ Tester différents états de campagne
- ✅ Voir l'évolution temporelle (dates)
- ✅ Simuler un processus réel
- ✅ Former les utilisateurs sur le système

---

**Date de mise à jour** : 10 novembre 2025  
**Fichier modifié** : `scripts/database/7-generate-complete-demo.js`  
**Nombre de campagnes** : 6 (au lieu de 4)  
**Statuts variés** : ✅ DRAFT, PENDING_VALIDATION, VALIDATED, SENT
