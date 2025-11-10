# 🔧 Correction de la Génération des Collaborateurs

## 🐛 Problèmes Identifiés

Le script `7-generate-complete-demo.js` créait des collaborateurs **incomplets** :

1. ❌ **Grade** : Colonne vide (affichait `-`)
2. ❌ **Type de Collaborateur** : Colonne vide (affichait `-`)
3. ❌ **Poste** : Colonne vide (affichait `-`)
4. ❌ **Responsables de BU** : Non assignés

### Cause Racine

Le script utilisait les **mauvais noms de colonnes** :

```sql
-- ❌ AVANT (INCORRECT)
INSERT INTO collaborateurs (
    ...,
    grade_id,        -- ❌ Cette colonne n'existe pas !
    poste_id,        -- ❌ Cette colonne n'existe pas !
    -- type_collaborateur_id manquant !
    ...
)
```

Les vraies colonnes dans la table `collaborateurs` sont :
- ✅ `grade_actuel_id` (pas `grade_id`)
- ✅ `poste_actuel_id` (pas `poste_id`)
- ✅ `type_collaborateur_id` (était complètement manquant)

## ✅ Solutions Appliquées

### 1. Correction des Noms de Colonnes

```sql
-- ✅ APRÈS (CORRECT)
INSERT INTO collaborateurs (
    nom, prenom, email, user_id, initiales,
    business_unit_id, division_id, 
    grade_actuel_id,           -- ✅ Correct !
    poste_actuel_id,           -- ✅ Correct !
    type_collaborateur_id,     -- ✅ Ajouté !
    statut, date_embauche
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIF', CURRENT_DATE)
```

### 2. Ajout du Type de Collaborateur

**Chargement des données de référence** :

```javascript
const typesCollabResult = await pool.query(
    'SELECT id, nom, code FROM types_collaborateurs WHERE statut = \'ACTIF\' LIMIT 5'
);
data.typesCollaborateurs = typesCollabResult.rows;
```

**Attribution aux collaborateurs** :

```javascript
const collaborateurs = [
    { 
        nom: 'Dupont', prenom: 'Jean', 
        gradeIdx: 2,           // Grade: Senior
        posteIdx: 0,           // Poste: Auditeur
        typeCollabIdx: 0,      // ✅ Type: Permanent
        ...
    },
    { 
        nom: 'Martin', prenom: 'Sophie', 
        gradeIdx: 1,           // Grade: Manager
        posteIdx: 1,           // Poste: Manager
        typeCollabIdx: 1,      // ✅ Type: Manager
        ...
    },
    ...
];
```

### 3. Types de Collaborateurs Utilisés

| Index | Type | Description |
|-------|------|-------------|
| 0 | **Permanent** | Collaborateur permanent |
| 1 | **Manager** | Manager / Chef d'équipe |
| 2 | **Consultant** | Consultant externe |

### 4. Grades Utilisés

| Index | Grade | Niveau |
|-------|-------|--------|
| 0 | Junior | 1 |
| 1 | Manager | 5 |
| 2 | Senior | 3 |
| 3 | Confirmé | 2 |
| 4 | Stagiaire | 0 |

### 5. Postes Utilisés

| Index | Poste |
|-------|-------|
| 0 | Auditeur |
| 1 | Manager |
| 2 | Consultant |
| 4 | Fiscaliste |
| 5 | Comptable |

### 6. Gestion du Conflit (ON CONFLICT)

```sql
ON CONFLICT (email) DO UPDATE SET 
    user_id = EXCLUDED.user_id,
    grade_actuel_id = EXCLUDED.grade_actuel_id,      -- ✅ Mise à jour
    poste_actuel_id = EXCLUDED.poste_actuel_id,      -- ✅ Mise à jour
    type_collaborateur_id = EXCLUDED.type_collaborateur_id  -- ✅ Mise à jour
```

Cela permet de **mettre à jour** les collaborateurs existants si le script est relancé.

## 📊 Résultat

Après cette correction, les collaborateurs sont créés avec **toutes** les informations :

| Nom | Prénom | Grade | Type | Poste | Business Unit | Division |
|-----|--------|-------|------|-------|---------------|----------|
| Dupont | Jean | **Senior** | **Permanent** | **Auditeur** | Audit & Conseil | Audit Comptable |
| Martin | Sophie | **Manager** | **Manager** | **Manager** | Audit & Conseil | Conseil en Management |
| Bernard | Pierre | **Manager** | **Manager** | **Consultant** | Juridique & Fiscal | Fiscalité |
| Dubois | Marie | **Confirmé** | **Consultant** | **Consultant** | Juridique & Fiscal | Services Juridiques |
| Lefebvre | Thomas | **Stagiaire** | **Permanent** | **Auditeur** | Audit & Conseil | Audit Comptable |
| Moreau | Julie | **Senior** | **Consultant** | **Fiscaliste** | Juridique & Fiscal | Fiscalité |
| Petit | Lucas | **Confirmé** | **Permanent** | **Comptable** | Gestion & Finance | Comptabilité |
| Robert | Emma | **Junior** | **Permanent** | **Auditeur** | Audit & Conseil | Audit Comptable |

## 🎯 Taux Horaires

Avec les grades correctement assignés, le système peut maintenant :

1. **Calculer automatiquement** le taux horaire de chaque collaborateur
2. **Facturer correctement** les missions selon le grade
3. **Générer des rapports** de coûts précis

### Exemple de Taux Horaires par Grade

```sql
SELECT 
    g.nom as grade,
    th.taux_standard,
    th.taux_majore,
    d.nom as division
FROM taux_horaires th
JOIN grades g ON th.grade_id = g.id
JOIN divisions d ON th.division_id = d.id
WHERE th.statut = 'ACTIF'
ORDER BY g.niveau DESC;
```

## 🔍 Vérification

Pour vérifier que les collaborateurs sont correctement créés :

```sql
SELECT 
    c.nom,
    c.prenom,
    g.nom as grade,
    tc.nom as type_collaborateur,
    p.nom as poste,
    bu.nom as business_unit,
    d.nom as division
FROM collaborateurs c
LEFT JOIN grades g ON c.grade_actuel_id = g.id
LEFT JOIN types_collaborateurs tc ON c.type_collaborateur_id = tc.id
LEFT JOIN postes p ON c.poste_actuel_id = p.id
LEFT JOIN business_units bu ON c.business_unit_id = bu.id
LEFT JOIN divisions d ON c.division_id = d.id
WHERE c.email LIKE '%@ewm-demo.com'
ORDER BY c.nom;
```

## 📝 Fichiers Modifiés

- ✅ `scripts/database/7-generate-complete-demo.js`
  - Correction des noms de colonnes
  - Ajout du chargement des types de collaborateurs
  - Ajout de l'attribution des types aux collaborateurs
  - Mise à jour du ON CONFLICT

## 🚀 Prochaines Étapes

### 1. Ajouter les Responsables de Business Units

Pour implémenter complètement la gestion des responsables :

```sql
-- Ajouter la colonne responsable_id dans business_units
ALTER TABLE business_units 
ADD COLUMN responsable_id UUID REFERENCES collaborateurs(id),
ADD COLUMN responsable_adjoint_id UUID REFERENCES collaborateurs(id);
```

Puis dans le script :

```javascript
// Assigner les responsables
if (collab.isResponsableBU) {
    await pool.query(`
        UPDATE business_units 
        SET responsable_id = $1 
        WHERE id = $2 AND responsable_id IS NULL
    `, [collaborateurId, businessUnitId]);
}
```

### 2. Créer les Taux Horaires

```javascript
// Créer les taux horaires pour chaque grade/division
for (const collab of collaborateurs) {
    await pool.query(`
        INSERT INTO taux_horaires (
            grade_id, division_id, 
            taux_standard, taux_majore,
            statut, date_debut_effet
        )
        VALUES ($1, $2, $3, $4, 'ACTIF', CURRENT_DATE)
        ON CONFLICT (grade_id, division_id) DO NOTHING
    `, [gradeId, divisionId, tauxStandard, tauxMajore]);
}
```

### 3. Affectation aux Missions

Les collaborateurs peuvent maintenant être correctement affectés aux missions avec leur taux horaire :

```javascript
// Affecter un collaborateur à une mission
await pool.query(`
    INSERT INTO mission_collaborateurs (
        mission_id, collaborateur_id, 
        role, taux_horaire
    )
    SELECT $1, $2, $3, th.taux_standard
    FROM taux_horaires th
    WHERE th.grade_id = (
        SELECT grade_actuel_id FROM collaborateurs WHERE id = $2
    )
    AND th.statut = 'ACTIF'
`, [missionId, collaborateurId, role]);
```

## 📊 Impact sur les Rapports

Avec ces corrections, les rapports affichent maintenant :

1. ✅ **Rapport des Temps** : Grade, Type et Poste visibles
2. ✅ **Rapport RH** : Statistiques par grade et type
3. ✅ **Facturation** : Calcul correct basé sur le grade
4. ✅ **Dashboard** : Répartition par grade et type

---

**Date de correction** : 10 novembre 2025  
**Fichier corrigé** : `scripts/database/7-generate-complete-demo.js`  
**Statut** : ✅ **Corrigé et testé**  
**Résultat** : 8 collaborateurs créés avec Grade, Type et Poste ✅
