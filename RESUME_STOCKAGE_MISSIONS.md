# 📋 Résumé du Stockage des Données de Mission

## 💰 1. CONDITIONS DE PAIEMENT

### **Stockage :**
- **Table :** `missions`
- **Champ :** `conditions_paiement` (TEXT)
- **Format :** JSON stringifié

### **Structure JSON :**
```json
[
  {
    "pourcentage_honoraires": 30,
    "montant_honoraires": 18000,
    "pourcentage_debours": 50,
    "montant_debours": 7500,
    "date": "2025-08-20",
    "details": "Acompte initial"
  },
  {
    "pourcentage_honoraires": 70,
    "montant_honoraires": 42000,
    "pourcentage_debours": 50,
    "montant_debours": 7500,
    "date": "2025-09-10",
    "details": "Solde final"
  }
]
```

### **Champs associés :**
- `pourcentage_avance` (NUMERIC) : Pourcentage d'avance global
- `montant_honoraires` (NUMERIC) : Montant total des honoraires
- `montant_debours` (NUMERIC) : Montant total des débours
- `description_honoraires` (TEXT) : Description des honoraires
- `description_debours` (TEXT) : Description des débours

---

## 👥 2. PLANIFICATION DES COLLABORATEURS SUR LES TÂCHES

### **Structure en 3 tables :**

#### **A. Table `missions`**
```sql
- id (UUID)
- nom (VARCHAR)
- description (TEXT)
- client_id (UUID)
- collaborateur_id (UUID) -- Responsable de la mission
- associe_id (UUID) -- Associé de la mission
```

#### **B. Table `mission_tasks`**
```sql
- id (UUID)
- mission_id (UUID) -- Référence vers missions
- task_id (UUID) -- Référence vers tasks
- statut (VARCHAR) -- PLANIFIEE, EN_COURS, TERMINEE
- date_debut (DATE)
- date_fin (DATE)
- duree_planifiee (INTEGER) -- Heures planifiées
- duree_reelle (INTEGER) -- Heures effectuées
- notes (TEXT)
```

#### **C. Table `task_assignments`**
```sql
- id (UUID)
- mission_task_id (UUID) -- Référence vers mission_tasks
- collaborateur_id (UUID) -- Référence vers collaborateurs
- heures_planifiees (INTEGER)
- heures_effectuees (INTEGER)
- taux_horaire (NUMERIC)
- statut (VARCHAR) -- PLANIFIE, EN_COURS, TERMINE
```

### **Relations :**
```
missions (1) -----> (N) mission_tasks (1) -----> (N) task_assignments
```

---

## 📝 3. PROCESSUS D'ENREGISTREMENT

### **Étape A : Création de la mission**
```sql
INSERT INTO missions (
    code, nom, description, client_id, collaborateur_id, statut,
    montant_honoraires, description_honoraires,
    montant_debours, description_debours,
    conditions_paiement, pourcentage_avance,
    business_unit_id, division_id, associe_id
) VALUES (...)
```

### **Étape B : Création des tâches**
```sql
INSERT INTO mission_tasks (
    mission_id, task_id, statut, date_debut, date_fin, duree_planifiee
) VALUES (...)
```

### **Étape C : Affectation des collaborateurs**
```sql
INSERT INTO task_assignments (
    mission_task_id, collaborateur_id, heures_planifiees, taux_horaire, statut
) VALUES (...)
```

---

## 🔍 4. EXEMPLES RÉELS

### **Conditions de paiement :**
- **Format :** JSON stringifié dans le champ TEXT
- **Exemple :** `[{"pourcentage_honoraires": 30, "montant_honoraires": 18000, ...}]`

### **Affectations de collaborateurs :**
- **Collaborateur :** Raphaël Ngos
- **Mission :** MIS-20250802-054
- **Tâche :** Conseil en stratégie
- **Heures planifiées :** 20
- **Taux horaire :** 50.00
- **Statut :** PLANIFIE

---

## 🎯 5. AVANTAGES DE CETTE STRUCTURE

### **Conditions de paiement :**
✅ **Flexibilité :** JSON permet des structures complexes
✅ **Historique :** Toutes les échéances dans un seul champ
✅ **Calculs :** Facilite les calculs de montants

### **Planification des collaborateurs :**
✅ **Granularité :** Affectation précise par tâche
✅ **Suivi :** Heures planifiées vs effectuées
✅ **Flexibilité :** Plusieurs collaborateurs par tâche
✅ **Tarification :** Taux horaire personnalisé par collaborateur

---

## 📊 6. REQUÊTES UTILES

### **Récupérer une mission avec ses tâches et affectations :**
```sql
SELECT 
    m.*,
    mt.id as task_id,
    mt.statut as task_statut,
    mt.duree_planifiee,
    t.libelle as task_libelle,
    ta.heures_planifiees,
    ta.taux_horaire,
    c.nom as collaborateur_nom
FROM missions m
LEFT JOIN mission_tasks mt ON m.id = mt.mission_id
LEFT JOIN tasks t ON mt.task_id = t.id
LEFT JOIN task_assignments ta ON mt.id = ta.mission_task_id
LEFT JOIN collaborateurs c ON ta.collaborateur_id = c.id
WHERE m.id = $1
```

### **Calculer le total des heures planifiées :**
```sql
SELECT 
    m.nom as mission_nom,
    SUM(ta.heures_planifiees) as total_heures_planifiees,
    SUM(ta.heures_effectuees) as total_heures_effectuees
FROM missions m
LEFT JOIN mission_tasks mt ON m.id = mt.mission_id
LEFT JOIN task_assignments ta ON mt.id = ta.mission_task_id
GROUP BY m.id, m.nom
``` 