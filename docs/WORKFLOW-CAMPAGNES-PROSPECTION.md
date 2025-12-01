# 📋 Workflow des Campagnes de Prospection

## 🎯 Vue d'Ensemble

Une **campagne de prospection** est un processus structuré permettant de contacter des entreprises cibles dans le cadre du développement commercial.

## 🏗️ Structure d'une Campagne

### Composants Principaux

```
Campagne de Prospection
├── 📄 Modèle de Prospection (Template)
│   └── Définit la structure et le contenu
├── 🏢 Entreprises Ciblées (1 ou plusieurs)
│   └── Issues d'une source d'entreprises
├── 🏛️ Business Unit Responsable
│   └── BU qui pilote la campagne
├── 👤 Responsable
│   └── Collaborateur en charge de la campagne
└── ✅ Validateur
    └── Collaborateur qui valide la campagne
```

## 🔄 Cycle de Vie (Statuts)

### 1. 📝 BROUILLON (DRAFT)

**Description** : Campagne en cours de création

**Actions possibles** :
- ✏️ Modifier les informations
- ➕ Ajouter/retirer des entreprises
- 🗑️ Supprimer la campagne
- 📤 Soumettre pour validation

**Qui peut agir** : Créateur de la campagne, Responsable

### 2. ⏳ EN_VALIDATION (PENDING_VALIDATION)

**Description** : Campagne soumise au validateur de la BU

**Actions possibles** :
- ✅ Valider la campagne
- ❌ Rejeter la campagne (retour en BROUILLON)
- 💬 Ajouter des commentaires

**Qui peut agir** : Validateur de la Business Unit

### 3. ✅ VALIDÉE (VALIDATED)

**Description** : Campagne approuvée par le validateur

**Actions possibles** :
- 🚀 Passer au statut SOUMISE
- 📊 Consulter les détails
- 🔙 Annuler (retour en BROUILLON si nécessaire)

**Qui peut agir** : Responsable, Validateur

### 4. 🚀 SOUMISE (SENT/READY)

**Description** : Campagne validée et prête à être exécutée

**Actions possibles** :
- 📧 Envoyer les emails (si canal EMAIL)
- 📞 Lancer les actions terrain (si canal PHYSIQUE)
- 📈 Suivre les résultats
- 📊 Générer des rapports

**Qui peut agir** : Responsable, Équipe commerciale

### 5. 📊 EN_COURS (ACTIVE)

**Description** : Campagne en cours d'exécution

**Actions possibles** :
- 📝 Enregistrer les contacts
- ✅ Marquer les entreprises comme contactées
- 💼 Créer des opportunités
- 📈 Suivre l'avancement

### 6. ✔️ TERMINÉE (COMPLETED)

**Description** : Campagne terminée

**Actions possibles** :
- 📊 Consulter les statistiques finales
- 📄 Générer le rapport final
- 📁 Archiver

### 7. 📁 ARCHIVÉE (ARCHIVED)

**Description** : Campagne archivée pour historique

**Actions possibles** :
- 👁️ Consultation uniquement

## 🔀 Diagramme de Flux

```
┌─────────────┐
│  BROUILLON  │
└──────┬──────┘
       │ Soumettre
       ↓
┌─────────────────┐
│  EN_VALIDATION  │
└────┬────────┬───┘
     │        │
Valider    Rejeter
     │        │
     ↓        ↓
┌──────────┐  └──→ BROUILLON
│  VALIDÉE │
└────┬─────┘
     │ Lancer
     ↓
┌──────────┐
│  SOUMISE │
└────┬─────┘
     │ Exécuter
     ↓
┌──────────┐
│ EN_COURS │
└────┬─────┘
     │ Terminer
     ↓
┌──────────┐
│ TERMINÉE │
└────┬─────┘
     │ Archiver
     ↓
┌──────────┐
│ ARCHIVÉE │
└──────────┘
```

## 🏢 Entreprises Ciblées

### Source des Entreprises

Les entreprises proviennent de la table **`companies`** qui contient :
- Nom de l'entreprise
- Secteur d'activité
- Pays/Ville
- Informations de contact
- Source d'acquisition

### Liaison Campagne-Entreprises

Table : **`prospecting_campaign_companies`**

```sql
CREATE TABLE prospecting_campaign_companies (
    id UUID PRIMARY KEY,
    campaign_id UUID REFERENCES prospecting_campaigns(id),
    company_id UUID REFERENCES companies(id),
    execution_status VARCHAR(20), -- NOT_CONTACTED, CONTACTED, CONVERTED, etc.
    contact_date TIMESTAMP,
    notes TEXT,
    converted_to_opportunity BOOLEAN DEFAULT FALSE
);
```

## 📄 Modèles de Prospection

### Structure d'un Modèle

Table : **`prospecting_templates`**

Un modèle définit :
- 📝 **Nom** du modèle
- 📧 **Canal** (EMAIL ou PHYSIQUE)
- 🏛️ **Business Unit** par défaut
- 📋 **Contenu** du message (pour EMAIL)
- 📊 **Critères** de ciblage
- ⚙️ **Paramètres** spécifiques

### Utilisation

1. Sélectionner un modèle existant
2. Le modèle pré-remplit les informations de la campagne
3. Personnaliser si nécessaire
4. Ajouter les entreprises cibles

## 👥 Rôles et Permissions

### Créateur de Campagne

**Permissions** :
- ✅ Créer une campagne
- ✅ Modifier une campagne en BROUILLON
- ✅ Soumettre pour validation
- ✅ Consulter ses campagnes

### Responsable de Campagne

**Permissions** :
- ✅ Toutes les permissions du créateur
- ✅ Lancer la campagne (statut SOUMISE)
- ✅ Suivre l'exécution
- ✅ Créer des opportunités depuis la campagne

### Validateur de Business Unit

**Permissions** :
- ✅ Consulter les campagnes de sa BU
- ✅ Valider/Rejeter les campagnes
- ✅ Ajouter des commentaires de validation

### Manager de Business Unit

**Permissions** :
- ✅ Toutes les permissions du validateur
- ✅ Consulter toutes les campagnes de la BU
- ✅ Générer des rapports

## 📊 Exemple de Workflow Complet

### Étape 1 : Création

```javascript
// Jean (Responsable Commercial) crée une campagne
{
    name: "Campagne Audit Q1 2025",
    channel: "EMAIL",
    template_id: "template-audit-financier",
    business_unit_id: "bu-audit-conseil",
    responsible_id: "jean-dupont-id",
    status: "DRAFT"
}
```

### Étape 2 : Ajout d'Entreprises

```javascript
// Jean ajoute 20 entreprises du secteur bancaire
prospecting_campaign_companies.insert([
    { campaign_id: "...", company_id: "banque-1" },
    { campaign_id: "...", company_id: "banque-2" },
    // ... 18 autres
]);
```

### Étape 3 : Soumission

```javascript
// Jean soumet la campagne pour validation
campaign.status = "PENDING_VALIDATION";
campaign.date_soumission = NOW();
```

### Étape 4 : Validation

```javascript
// Sophie (Manager de la BU) valide
campaign.status = "VALIDATED";
campaign.date_validation = NOW();
campaign.validateur_id = "sophie-martin-id";
```

### Étape 5 : Lancement

```javascript
// Jean lance la campagne
campaign.status = "SENT";
campaign.scheduled_date = "2025-01-15";
```

### Étape 6 : Exécution

```javascript
// Les emails sont envoyés
// Les contacts sont enregistrés
prospecting_campaign_companies.update({
    execution_status: "CONTACTED",
    contact_date: NOW()
});
```

### Étape 7 : Conversion

```javascript
// 3 entreprises deviennent des opportunités
opportunities.insert({
    nom: "Audit Financier - Banque ABC",
    client_id: "banque-1",
    campaign_id: "campagne-audit-q1",
    statut: "NOUVELLE"
});
```

## 🔐 Sécurité et Contrôles

### Validations

- ✅ Une campagne doit avoir au moins 1 entreprise
- ✅ Le responsable doit appartenir à la BU
- ✅ Le validateur doit avoir les droits sur la BU
- ✅ Les transitions de statut doivent respecter le workflow
- ✅ Une campagne VALIDÉE ne peut plus être modifiée

### Notifications

- 📧 Email au validateur lors de la soumission
- 📧 Email au responsable après validation/rejet
- 📧 Rappels si validation en attente > 48h

## 📈 Métriques et KPIs

### Par Campagne

- 📊 Nombre d'entreprises ciblées
- 📞 Nombre d'entreprises contactées
- 💼 Nombre d'opportunités créées
- 💰 Montant total des opportunités
- 📈 Taux de conversion (%)

### Par Business Unit

- 📊 Nombre de campagnes actives
- 📈 Taux de validation moyen
- ⏱️ Délai moyen de validation
- 💼 Opportunités générées par campagne
- 💰 ROI des campagnes

## 🛠️ Tables de la Base de Données

### prospecting_campaigns

```sql
- id (UUID)
- name (VARCHAR)
- channel (VARCHAR) -- EMAIL, PHYSIQUE
- template_id (UUID)
- business_unit_id (UUID)
- division_id (UUID)
- responsible_id (UUID) -- Collaborateur responsable
- status (VARCHAR) -- DRAFT, PENDING_VALIDATION, VALIDATED, SENT, etc.
- scheduled_date (DATE)
- validation_statut (VARCHAR)
- date_soumission (TIMESTAMP)
- date_validation (TIMESTAMP)
- validateur_id (UUID)
- priority (VARCHAR)
- description (TEXT)
```

### prospecting_campaign_companies

```sql
- id (UUID)
- campaign_id (UUID)
- company_id (UUID)
- execution_status (VARCHAR)
- contact_date (TIMESTAMP)
- notes (TEXT)
- converted_to_opportunity (BOOLEAN)
```

### prospecting_templates

```sql
- id (UUID)
- name (VARCHAR)
- channel (VARCHAR)
- business_unit_id (UUID)
- division_id (UUID)
- content (TEXT)
- is_active (BOOLEAN)
```

---

**Document créé le** : 10 novembre 2025  
**Dernière mise à jour** : 10 novembre 2025  
**Version** : 1.0
