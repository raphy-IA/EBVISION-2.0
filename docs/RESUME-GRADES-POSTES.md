# 📋 Résumé - Configuration des Grades et Postes

## ✅ Modifications Effectuées

### 1. Grades par Défaut

Les **6 grades** suivants sont créés automatiquement lors de l'initialisation :

| Niveau | Code | Nom | Taux Min | Taux Max | Description |
|--------|------|-----|----------|----------|-------------|
| 6 | ASSOC | Associé | 130 XAF | 180 XAF | Niveau le plus élevé |
| 5 | MGR | Manager | 100 XAF | 130 XAF | Management d'équipe |
| 4 | SEN | Senior | 75 XAF | 100 XAF | Expert confirmé |
| 3 | ASST | Assistant | 50 XAF | 75 XAF | Collaborateur intermédiaire |
| 2 | JUN | Junior | 35 XAF | 50 XAF | Débutant avec expérience |
| 1 | STAG | Stagiaire | 25 XAF | 35 XAF | Stagiaire/Apprenti |

### 2. Postes par Défaut

Les **6 postes** suivants sont créés automatiquement lors de l'initialisation :

| Code | Nom | Description |
|------|-----|-------------|
| DG | Directeur Général | Direction générale de l'entreprise |
| DOPS | Directeur des Opérations | Direction des opérations |
| DIR | Directeur | Directeur de département |
| RESPIT | Responsable IT | Responsable informatique |
| SEC | Secretaire | Secrétariat et assistance administrative |
| SUPIT | Support IT | Support technique informatique |

## 🔧 Fichiers Modifiés

### **scripts/database/5-generate-demo-data.js**
✅ Mis à jour avec les nouveaux grades et postes

### **scripts/database/seed-grades.js** (NOUVEAU)
✅ Script dédié pour créer/mettre à jour uniquement les grades

### **scripts/database/seed-postes.js** (NOUVEAU)
✅ Script dédié pour créer/mettre à jour uniquement les postes

## 🚀 Comment Utiliser

### Option 1 : Initialisation Complète (Recommandé)
```bash
node scripts/database/5-generate-demo-data.js
```
✅ Crée automatiquement tous les éléments :
- Business Units
- Divisions
- **Types de Collaborateurs (4)**
- **Grades (6)**
- **Postes (6)**
- Collaborateurs et Utilisateurs
- Clients
- Missions
- Campagnes, Opportunités, etc.

### Option 2 : Grades Uniquement
```bash
node scripts/database/seed-grades.js
```
✅ Crée ou met à jour uniquement les 6 grades

### Option 3 : Postes Uniquement
```bash
node scripts/database/seed-postes.js
```
✅ Crée ou met à jour uniquement les 6 postes

### Option 4 : Tous les Scripts Séparément
```bash
# Types de collaborateurs
node scripts/database/seed-types-collaborateurs.js

# Grades
node scripts/database/seed-grades.js

# Postes
node scripts/database/seed-postes.js
```

## 📊 Vérification en Base de Données

### Vérifier les Grades
```sql
SELECT niveau, code, nom, taux_min, taux_max 
FROM grades 
ORDER BY niveau DESC;
```

**Résultat attendu :**
```
 niveau │ code  │    nom     │ taux_min │ taux_max
────────┼───────┼────────────┼──────────┼──────────
      6 │ ASSOC │ Associé    │      130 │      180
      5 │ MGR   │ Manager    │      100 │      130
      4 │ SEN   │ Senior     │       75 │      100
      3 │ ASST  │ Assistant  │       50 │       75
      2 │ JUN   │ Junior     │       35 │       50
      1 │ STAG  │ Stagiaire  │       25 │       35
```

### Vérifier les Postes
```sql
SELECT code, nom, description 
FROM postes 
ORDER BY code;
```

**Résultat attendu :**
```
 code   │          nom              │               description
────────┼───────────────────────────┼──────────────────────────────────────
 DG     │ Directeur Général         │ Direction générale de l'entreprise
 DIR    │ Directeur                 │ Directeur de département
 DOPS   │ Directeur des Opérations  │ Direction des opérations
 RESPIT │ Responsable IT            │ Responsable informatique
 SEC    │ Secretaire                │ Secrétariat et assistance administrative
 SUPIT  │ Support IT                │ Support technique informatique
```

## 🎯 Structure Complète de l'Initialisation

Lors de l'exécution de `5-generate-demo-data.js`, voici l'ordre complet :

```
1. Business Units (3)
   └─ AUDIT, JURID, GEST

2. Divisions (6)
   └─ AUDIT-COMP, CONSEIL, JURID, FISCAL, GEST-FIN, COMPTA

3. Types de Collaborateurs (4)
   └─ ADM, TEC, CONS, SUP

4. Grades (6)
   └─ ASSOC, MGR, SEN, ASST, JUN, STAG

5. Postes (6)
   └─ DG, DOPS, DIR, RESPIT, SEC, SUPIT

6. Collaborateurs et Utilisateurs (8)
   └─ Avec leurs comptes utilisateurs associés

7. Clients (8)
   └─ Entreprises de démo

8. Missions (8)
   └─ Projets en cours

9. Campagnes, Opportunités, Time Entries, Factures
   └─ Données opérationnelles
```

## 💡 Caractéristiques Techniques

### Grades
- **Niveaux** : De 1 (Stagiaire) à 6 (Associé)
- **Taux horaires** : Définis en XAF (Francs CFA)
- **Usage** : Définir la séniorité et le tarif d'un collaborateur
- **Contrainte** : Code unique

### Postes
- **Hiérarchie** : DG → DOPS → DIR → RESPIT/SEC/SUPIT
- **Usage** : Définir le rôle fonctionnel d'un collaborateur
- **Contrainte** : Code unique
- **Statut** : Par défaut ACTIF

## 🔄 Gestion des Conflits

Les scripts utilisent `ON CONFLICT (code) DO UPDATE` :
- ✅ **Idempotent** : Peut être exécuté plusieurs fois sans erreur
- ✅ **Mise à jour** : Si un code existe, les données sont mises à jour
- ✅ **Création** : Si un code n'existe pas, il est créé

## 📚 Exemples d'Utilisation

### Associer un Grade à un Collaborateur
```sql
-- Assigner le grade "Senior" à un collaborateur
UPDATE collaborateurs 
SET grade_actuel_id = (SELECT id FROM grades WHERE code = 'SEN')
WHERE email = 'jean.dupont@example.com';
```

### Associer un Poste à un Collaborateur
```sql
-- Assigner le poste "Directeur" à un collaborateur
UPDATE collaborateurs 
SET poste_actuel_id = (SELECT id FROM postes WHERE code = 'DIR')
WHERE email = 'marie.martin@example.com';
```

### Créer un Nouveau Collaborateur avec Grade et Poste
```sql
INSERT INTO collaborateurs (
    nom, prenom, email, 
    grade_actuel_id, 
    poste_actuel_id,
    statut
)
VALUES (
    'Dupuis', 'Pierre', 'pierre.dupuis@example.com',
    (SELECT id FROM grades WHERE code = 'MGR'),
    (SELECT id FROM postes WHERE code = 'RESPIT'),
    'ACTIF'
);
```

## 🔍 Interface Web

Les grades et postes peuvent être gérés via l'interface web :

### Grades
- **Page** : `grades.html`
- **Menu** : GESTION RH → Grades
- **Fonctionnalités** : CRUD complet

### Postes
- **Page** : `postes.html`
- **Menu** : GESTION RH → Postes
- **Fonctionnalités** : CRUD complet

## ⚠️ Points Importants

1. **Ordre d'exécution** : Les grades et postes doivent être créés **avant** les collaborateurs
2. **Références** : Les collaborateurs référencent les grades et postes via des clés étrangères
3. **Modification** : Modifier un code peut nécessiter de mettre à jour les collaborateurs associés
4. **Suppression** : Impossible de supprimer un grade/poste utilisé par des collaborateurs (contrainte FK)

## 🎯 Résumé

✅ **6 Grades** créés automatiquement (ASSOC, MGR, SEN, ASST, JUN, STAG)  
✅ **6 Postes** créés automatiquement (DG, DOPS, DIR, RESPIT, SEC, SUPIT)  
✅ **Scripts dédiés** disponibles pour chaque type de données  
✅ **Idempotence** garantie (réexécution sans problème)  
✅ **Interface web** disponible pour la gestion

---

**Date** : 9 novembre 2025  
**Statut** : ✅ Terminé et testé  
**Version** : 1.0




