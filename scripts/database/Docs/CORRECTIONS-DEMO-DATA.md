# 🔧 Corrections Nécessaires pour 5-generate-demo-data.js

## ❌ Problèmes Identifiés

### 1. **Table `opportunities` - Structure Incorrecte**

**Colonnes utilisées par le script mais qui N'EXISTENT PAS:**
- ❌ `code` - N'existe pas
- ❌ `date_identification` - N'existe pas
- ❌ `date_qualification` - N'existe pas
- ❌ `date_proposition` - N'existe pas
- ❌ `date_negociation` - N'existe pas
- ❌ `date_decision` - N'existe pas
- ❌ `campaign_id` - N'existe pas

**Colonnes RÉELLES de la table `opportunities`:**
- ✅ `nom` (NOT NULL)
- ✅ `description`
- ✅ `client_id` (FK)
- ✅ `collaborateur_id` (FK) - **REQUIS mais non fourni par le script**
- ✅ `business_unit_id` (FK)
- ✅ `opportunity_type_id` (FK)
- ✅ `fiscal_year_id` (FK)
- ✅ `statut`: 'NOUVELLE', 'EN_COURS', 'GAGNEE', 'PERDUE', 'ANNULEE'
- ✅ `etape_vente`: 'PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FERMETURE'
- ✅ `type_opportunite` (varchar)
- ✅ `source` (varchar)
- ✅ `probabilite` (0-100)
- ✅ `montant_estime` (numeric)
- ✅ `devise` (default 'FCFA')
- ✅ `date_fermeture_prevue`
- ✅ `date_fermeture_reelle`
- ✅ `current_stage_id` (FK vers opportunity_stage_templates)

### 2. **Table `prospecting_campaigns` - Structure Incorrecte**

**Colonnes utilisées par le script mais qui N'EXISTENT PAS:**
- ❌ `nom` - N'existe pas (c'est `name`)
- ❌ `code` - N'existe pas
- ❌ `date_debut` - N'existe pas (c'est `scheduled_date`)
- ❌ `date_fin` - N'existe pas
- ❌ `budget` - N'existe pas
- ❌ `objectif_leads` - N'existe pas
- ❌ `objectif_conversions` - N'existe pas

**Colonnes RÉELLES de la table `prospecting_campaigns`:**
- ✅ `name` (NOT NULL)
- ✅ `channel`: 'PHYSIQUE', 'EMAIL' (NOT NULL)
- ✅ `template_id` (FK)
- ✅ `business_unit_id` (FK)
- ✅ `division_id` (FK)
- ✅ `status`: 'DRAFT', 'READY', 'SENT', 'ARCHIVED', 'PENDING_VALIDATION', 'VALIDATED', 'REJECTED'
- ✅ `scheduled_date`
- ✅ `responsible_id` (FK)
- ✅ `priority`: 'NORMAL' (default)
- ✅ `description`

### 3. **Clés Étrangères Manquantes**

- ❌ `opportunities.collaborateur_id` - **REQUIS** mais jamais fourni
- ❌ `opportunities.fiscal_year_id` - Souvent NULL
- ❌ `missions.mission_type_id` - Pas toujours fourni

### 4. **Contraintes CHECK Non Respectées**

- ❌ `opportunities.statut` utilise des valeurs invalides
- ❌ `missions.priorite` utilise 'URGENTE' au lieu de valeurs valides

## ✅ Solutions

### Solution 1: Corriger la création d'opportunités

```javascript
await pool.query(`
    INSERT INTO opportunities (
        nom, description,
        client_id, collaborateur_id, business_unit_id,
        opportunity_type_id, fiscal_year_id,
        statut, etape_vente,
        montant_estime, probabilite, devise,
        date_fermeture_prevue,
        type_opportunite, source
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'FCFA', $12, $13, 'PROSPECTION')
`, [
    `Opportunité ${oppType.name} ${i + 1}`,
    `Description de l'opportunité`,
    clientId,
    collaborateurId,  // ← OBLIGATOIRE
    businessUnitId,
    oppType.id,
    fiscalYearId,     // ← OBLIGATOIRE
    'NOUVELLE',       // ← Valeur valide
    'PROSPECTION',    // ← Valeur valide
    montantEstime,
    probabilite,
    dateFermeturePrevue,
    oppType.name
]);
```

### Solution 2: Ne PAS créer de campagnes (structure incompatible)

La table `prospecting_campaigns` a une structure très différente. Il vaut mieux **ne pas créer de campagnes** dans le script de démo, ou créer une version simplifiée.

### Solution 3: Charger les données de référence AVANT

```javascript
// Charger les données de référence existantes
const refData = await loadReferenceData(pool);

// refData contient:
// - grades (depuis la table grades)
// - postes (depuis la table postes)
// - missionTypes (depuis mission_types)
// - oppTypes (depuis opportunity_types)
// - fiscalYears (depuis fiscal_years)
// - companies (depuis companies pour créer des clients)
```

### Solution 4: Utiliser les companies existantes pour les clients

Au lieu de créer des clients fictifs, utiliser les 100 entreprises réelles déjà chargées par `3-insert-reference-data.js`.

## 📋 Plan de Correction

1. ✅ Charger toutes les données de référence au début
2. ✅ Supprimer la création de campagnes (incompatible)
3. ✅ Corriger la création d'opportunités avec toutes les FK requises
4. ✅ Utiliser les companies existantes pour créer des clients
5. ✅ Vérifier toutes les contraintes CHECK
6. ✅ Ajouter une gestion d'erreur robuste pour chaque insertion

## 🚀 Fichier Corrigé

Un nouveau fichier `5-generate-demo-data-FIXED.js` sera créé avec toutes les corrections.
