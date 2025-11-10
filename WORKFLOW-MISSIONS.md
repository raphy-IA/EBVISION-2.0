# 📋 Workflow des Missions

## 🎯 Vue d'Ensemble

Une **mission** est un projet de service créé à partir d'une **opportunité gagnée**. Elle implique un client, une équipe de collaborateurs, et un ensemble d'activités à réaliser.

## 🔗 Relation Opportunité → Mission

### Prérequis : Opportunité GAGNÉE

```
Opportunité (NOUVELLE)
    ↓ Qualification
Opportunité (EN_COURS)
    ↓ Négociation
Opportunité (GAGNEE) ✅
    ↓ Conversion
Mission (PLANIFIEE)
```

**Règle importante** : Une mission ne peut être créée que depuis une opportunité avec le statut **"GAGNEE"**.

### Héritage des Informations

Lors de la création de la mission, les informations suivantes sont héritées de l'opportunité :

| Champ | Source | Destination |
|-------|--------|-------------|
| Client | `opportunity.client_id` | `mission.client_id` |
| Business Unit | `opportunity.business_unit_id` | `mission.business_unit_id` |
| Montant estimé | `opportunity.montant_estime` | `mission.budget_estime` |
| Description | `opportunity.description` | `mission.description` |
| Collaborateur responsable | `opportunity.collaborateur_id` | `mission.collaborateur_id` |

## 🏗️ Structure d'une Mission

### Composants Principaux

```
Mission
├── 📄 Informations Générales
│   ├── Nom
│   ├── Code mission
│   ├── Description
│   ├── Type de mission
│   └── Statut
├── 👥 Parties Prenantes
│   ├── Client (obligatoire)
│   ├── Business Unit (obligatoire)
│   ├── Division (optionnel)
│   ├── Collaborateur responsable
│   └── Associé responsable
├── 💰 Aspects Financiers
│   ├── Budget estimé
│   ├── Budget réel
│   ├── Montant honoraires
│   ├── Montant débours
│   └── Conditions de paiement
├── 📅 Planification
│   ├── Date début prévue
│   ├── Date fin prévue
│   ├── Date début réelle
│   └── Date fin réelle
├── 📋 Activités (Tasks)
│   ├── Activité 1
│   ├── Activité 2
│   └── Activité N
└── 👤 Collaborateurs Affectés
    ├── Collaborateur 1 → Activités [1, 2]
    ├── Collaborateur 2 → Activités [2, 3]
    └── Collaborateur N → Activités [...]
```

## 📋 Activités de la Mission

### Qu'est-ce qu'une Activité ?

Une **activité** (task) est une tâche spécifique à réaliser dans le cadre de la mission.

**Exemples d'activités** :
- Audit : Planification, Collecte de documents, Analyse, Rapport
- Conseil : Diagnostic, Recommandations, Mise en œuvre, Suivi
- Expertise : Étude préliminaire, Expertise terrain, Rapport d'expertise

### Table `tasks`

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    description TEXT,
    duree_estimee INTEGER, -- En heures
    priorite VARCHAR(20), -- BASSE, MOYENNE, HAUTE, CRITIQUE
    obligatoire BOOLEAN DEFAULT FALSE,
    actif BOOLEAN DEFAULT TRUE
);
```

### Table `mission_tasks` (Liaison)

```sql
CREATE TABLE mission_tasks (
    id UUID PRIMARY KEY,
    mission_id UUID REFERENCES missions(id),
    task_id UUID REFERENCES tasks(id),
    statut VARCHAR(20), -- PLANIFIEE, EN_COURS, TERMINEE, ANNULEE
    date_debut DATE,
    date_fin DATE,
    duree_planifiee INTEGER, -- Heures prévues
    duree_reelle INTEGER, -- Heures réalisées
    notes TEXT
);
```

## 👥 Affectation des Collaborateurs

### Principe

Chaque collaborateur est **affecté à la mission** et **planifié sur une ou plusieurs activités**.

### Table `mission_collaborateurs`

```sql
CREATE TABLE mission_collaborateurs (
    id UUID PRIMARY KEY,
    mission_id UUID REFERENCES missions(id),
    collaborateur_id UUID REFERENCES collaborateurs(id),
    role VARCHAR(100), -- Chef de mission, Auditeur senior, Consultant, etc.
    taux_horaire NUMERIC(12,2), -- Taux applicable pour cette mission
    date_debut DATE,
    date_fin DATE,
    heures_planifiees INTEGER,
    heures_realisees INTEGER,
    statut VARCHAR(20) -- PLANIFIE, ACTIF, TERMINE
);
```

### Affectation aux Activités

Un collaborateur peut être affecté à plusieurs activités de la mission :

```
Mission "Audit Financier ABC"
├── Activité 1: Planification
│   └── Jean Dupont (Chef de mission) - 10h
├── Activité 2: Collecte documents
│   ├── Jean Dupont (Chef de mission) - 5h
│   └── Sophie Martin (Auditeur senior) - 20h
├── Activité 3: Analyse
│   ├── Sophie Martin (Auditeur senior) - 30h
│   └── Pierre Bernard (Auditeur) - 40h
└── Activité 4: Rapport
    ├── Jean Dupont (Chef de mission) - 15h
    └── Sophie Martin (Auditeur senior) - 10h
```

## 🔄 Cycle de Vie d'une Mission

### 1. 📝 PLANIFIEE

**Description** : Mission créée depuis une opportunité gagnée

**Actions** :
- ✅ Définir les activités
- ✅ Affecter les collaborateurs
- ✅ Planifier les dates
- ✅ Estimer les budgets

**Qui peut agir** : Responsable de mission, Manager BU

### 2. 🚀 EN_COURS

**Description** : Mission lancée, travaux en cours

**Actions** :
- ✅ Saisir les temps (time entries)
- ✅ Suivre l'avancement
- ✅ Ajuster la planification
- ✅ Gérer les débours

**Qui peut agir** : Collaborateurs affectés, Responsable

### 3. ✅ TERMINEE

**Description** : Mission achevée

**Actions** :
- ✅ Clôturer les activités
- ✅ Valider les temps
- ✅ Générer les factures
- ✅ Archiver les documents

**Qui peut agir** : Responsable, Manager BU

### 4. 🔄 SUSPENDUE

**Description** : Mission mise en pause temporairement

**Actions** :
- ✅ Consulter l'historique
- ✅ Reprendre la mission

### 5. ❌ ANNULEE

**Description** : Mission annulée

**Actions** :
- 👁️ Consultation uniquement

## 📊 Exemple Complet

### Étape 1 : Opportunité Gagnée

```javascript
// Opportunité "Audit Financier - Banque ABC"
{
    id: "opp-123",
    nom: "Audit Financier - Banque ABC",
    client_id: "client-banque-abc",
    business_unit_id: "bu-audit-conseil",
    collaborateur_id: "jean-dupont",
    statut: "GAGNEE", // ✅ Prérequis
    montant_estime: 15000000, // 15M FCFA
    date_fermeture_reelle: "2025-01-15"
}
```

### Étape 2 : Création de la Mission

```javascript
// Mission créée depuis l'opportunité
{
    id: "mission-456",
    nom: "Audit Financier - Banque ABC",
    code: "AUD-2025-001",
    client_id: "client-banque-abc", // ← Hérité
    business_unit_id: "bu-audit-conseil", // ← Hérité
    collaborateur_id: "jean-dupont", // ← Hérité
    opportunity_id: "opp-123", // ← Lien vers l'opportunité
    statut: "PLANIFIEE",
    budget_estime: 15000000, // ← Hérité
    date_debut: "2025-02-01",
    date_fin: "2025-03-31"
}
```

### Étape 3 : Définition des Activités

```javascript
// Activités de la mission
mission_tasks.insert([
    {
        mission_id: "mission-456",
        task_id: "task-planification",
        statut: "PLANIFIEE",
        duree_planifiee: 30, // 30 heures
        date_debut: "2025-02-01",
        date_fin: "2025-02-07"
    },
    {
        mission_id: "mission-456",
        task_id: "task-collecte",
        statut: "PLANIFIEE",
        duree_planifiee: 80,
        date_debut: "2025-02-08",
        date_fin: "2025-02-28"
    },
    {
        mission_id: "mission-456",
        task_id: "task-analyse",
        statut: "PLANIFIEE",
        duree_planifiee: 120,
        date_debut: "2025-03-01",
        date_fin: "2025-03-21"
    },
    {
        mission_id: "mission-456",
        task_id: "task-rapport",
        statut: "PLANIFIEE",
        duree_planifiee: 50,
        date_debut: "2025-03-22",
        date_fin: "2025-03-31"
    }
]);
```

### Étape 4 : Affectation des Collaborateurs

```javascript
// Équipe de la mission
mission_collaborateurs.insert([
    {
        mission_id: "mission-456",
        collaborateur_id: "jean-dupont",
        role: "Chef de mission",
        taux_horaire: 85000, // Taux Manager
        heures_planifiees: 60,
        statut: "PLANIFIE"
    },
    {
        mission_id: "mission-456",
        collaborateur_id: "sophie-martin",
        role: "Auditeur Senior",
        taux_horaire: 65000, // Taux Senior
        heures_planifiees: 120,
        statut: "PLANIFIE"
    },
    {
        mission_id: "mission-456",
        collaborateur_id: "pierre-bernard",
        role: "Auditeur",
        taux_horaire: 50000, // Taux Confirmé
        heures_planifiees: 100,
        statut: "PLANIFIE"
    }
]);
```

### Étape 5 : Exécution (Time Entries)

```javascript
// Les collaborateurs saisissent leurs temps
time_entries.insert({
    user_id: "sophie-martin-user",
    mission_id: "mission-456",
    task_id: "task-collecte",
    date_saisie: "2025-02-10",
    heures: 8,
    type_heures: "HC", // Heures chargeables (facturables)
    description: "Collecte des états financiers"
});
```

### Étape 6 : Facturation

```javascript
// Calcul automatique basé sur les temps
SELECT 
    c.nom, c.prenom,
    mc.taux_horaire,
    SUM(te.heures) as heures_realisees,
    SUM(te.heures * mc.taux_horaire) as montant_facturable
FROM time_entries te
JOIN mission_collaborateurs mc ON te.mission_id = mc.mission_id 
    AND te.user_id = (SELECT user_id FROM collaborateurs WHERE id = mc.collaborateur_id)
WHERE te.mission_id = 'mission-456'
AND te.type_heures = 'HC'
GROUP BY c.id, mc.taux_horaire;

// Résultat :
// Jean Dupont    | 85000 | 55h  | 4,675,000 FCFA
// Sophie Martin  | 65000 | 115h | 7,475,000 FCFA
// Pierre Bernard | 50000 | 95h  | 4,750,000 FCFA
// TOTAL                          | 16,900,000 FCFA
```

## 🔐 Règles de Gestion

### Création de Mission

- ✅ L'opportunité doit avoir le statut "GAGNEE"
- ✅ Le client doit être actif
- ✅ La Business Unit doit être active
- ✅ Un code mission unique doit être généré
- ✅ Au moins un collaborateur responsable doit être défini

### Affectation de Collaborateurs

- ✅ Le collaborateur doit appartenir à la BU de la mission
- ✅ Le taux horaire est récupéré depuis `taux_horaires` selon le grade
- ✅ Les dates d'affectation doivent être dans la période de la mission
- ✅ Un collaborateur ne peut pas être affecté 2 fois à la même mission

### Saisie des Temps

- ✅ Le collaborateur doit être affecté à la mission
- ✅ La date de saisie doit être dans la période de la mission
- ✅ Les heures doivent être positives
- ✅ Type HC (facturable) uniquement pour les missions client
- ✅ Type HNC (non facturable) pour les activités internes

### Facturation

- ✅ Basée uniquement sur les temps validés
- ✅ Utilise le taux horaire défini dans `mission_collaborateurs`
- ✅ Peut inclure des débours (frais)
- ✅ TVA applicable selon les règles fiscales

## 📈 Métriques et KPIs

### Par Mission

- 📊 Heures planifiées vs réalisées
- 💰 Budget estimé vs coût réel
- 📈 Taux de rentabilité
- ⏱️ Respect des délais
- 👥 Taux d'occupation des collaborateurs

### Par Business Unit

- 📊 Nombre de missions actives
- 💰 Chiffre d'affaires généré
- 📈 Taux de conversion opportunités → missions
- ⏱️ Délai moyen de réalisation
- 👥 Charge de travail par collaborateur

## 🛠️ Tables de la Base de Données

### missions

```sql
- id (UUID)
- nom (VARCHAR)
- code (VARCHAR) -- Code unique
- description (TEXT)
- client_id (UUID) -- ← Depuis opportunité
- business_unit_id (UUID) -- ← Depuis opportunité
- division_id (UUID)
- collaborateur_id (UUID) -- Responsable
- opportunity_id (UUID) -- ← Lien vers opportunité source
- mission_type_id (UUID)
- statut (VARCHAR) -- PLANIFIEE, EN_COURS, TERMINEE, SUSPENDUE, ANNULEE
- date_debut (DATE)
- date_fin (DATE)
- budget_estime (NUMERIC)
- budget_reel (NUMERIC)
- montant_honoraires (NUMERIC)
- montant_debours (NUMERIC)
```

### mission_tasks

```sql
- id (UUID)
- mission_id (UUID)
- task_id (UUID)
- statut (VARCHAR)
- date_debut (DATE)
- date_fin (DATE)
- duree_planifiee (INTEGER)
- duree_reelle (INTEGER)
- notes (TEXT)
```

### mission_collaborateurs

```sql
- id (UUID)
- mission_id (UUID)
- collaborateur_id (UUID)
- role (VARCHAR)
- taux_horaire (NUMERIC)
- date_debut (DATE)
- date_fin (DATE)
- heures_planifiees (INTEGER)
- heures_realisees (INTEGER)
- statut (VARCHAR)
```

---

**Document créé le** : 10 novembre 2025  
**Dernière mise à jour** : 10 novembre 2025  
**Version** : 1.0
