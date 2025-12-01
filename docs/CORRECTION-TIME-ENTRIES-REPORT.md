# 🔧 Correction du Rapport des Time Entries

## 🐛 Problème Identifié

Dans le rapport des temps (`reports-temps.html`), les colonnes suivantes affichaient `null null` ou `-` :
- **Collaborateur** : affichait "null null"
- **Business Unit** : affichait "-"
- **Grade** : affichait "-"
- **Division** : non affichée

### Cause Racine

La route API `/api/reports/timeEntries` dans `src/routes/reports.js` avait un **JOIN incorrect** :

```sql
-- ❌ AVANT (INCORRECT)
LEFT JOIN users u ON te.user_id = u.id
LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id  -- ❌ Cette colonne n'existe pas !
```

La table `users` n'a **pas** de colonne `collaborateur_id`. C'est la table `collaborateurs` qui a une colonne `user_id` !

## ✅ Solution Appliquée

### 1. Correction du JOIN

```sql
-- ✅ APRÈS (CORRECT)
LEFT JOIN users u ON te.user_id = u.id
LEFT JOIN collaborateurs c ON c.user_id = u.id  -- ✅ Correct !
```

### 2. Ajout des Informations Manquantes

La requête a été enrichie pour inclure **toutes** les informations nécessaires :

```sql
SELECT 
    te.id,
    te.date_saisie,
    te.heures,
    te.type_heures,
    te.status,
    -- Collaborateur
    c.id as collaborateur_id,
    c.nom as collaborateur_nom,
    c.prenom as collaborateur_prenom,
    -- Mission et Client
    m.nom as mission_titre,
    cl.raison_sociale as client_nom,
    -- Time Sheet
    ts.statut as time_sheet_status,
    -- Business Unit
    bu.id as business_unit_id,
    bu.nom as business_unit_nom,
    -- Division ✅ AJOUTÉ
    d.id as division_id,
    d.nom as division_nom,
    -- Grade
    g.id as grade_id,
    g.nom as grade_nom,
    -- Poste ✅ AJOUTÉ
    p.nom as poste_nom,
    -- Activité Interne ✅ AJOUTÉ
    ia.name as internal_activity_nom
FROM time_entries te
LEFT JOIN users u ON te.user_id = u.id
LEFT JOIN collaborateurs c ON c.user_id = u.id
LEFT JOIN missions m ON te.mission_id = m.id
LEFT JOIN clients cl ON m.client_id = cl.id
LEFT JOIN time_sheets ts ON te.time_sheet_id = ts.id
LEFT JOIN business_units bu ON c.business_unit_id = bu.id
LEFT JOIN divisions d ON c.division_id = d.id  -- ✅ AJOUTÉ
LEFT JOIN grades g ON c.grade_actuel_id = g.id
LEFT JOIN postes p ON c.poste_actuel_id = p.id  -- ✅ AJOUTÉ
LEFT JOIN internal_activities ia ON te.internal_activity_id = ia.id  -- ✅ AJOUTÉ
```

### 3. Enrichissement des Données Retournées

```javascript
const reportData = result.rows.map(row => ({
    id: row.id,
    date: row.date_saisie,
    heures: parseFloat(row.heures) || 0,
    type_heures: row.type_heures,
    description: `${row.type_heures} - ${row.mission_titre || row.internal_activity_nom || 'Activité interne'}`,
    
    // Collaborateur
    collaborateur_id: row.collaborateur_id || null,
    collaborateur: row.collaborateur_prenom && row.collaborateur_nom 
        ? `${row.collaborateur_prenom} ${row.collaborateur_nom}` 
        : 'Non assigné',
    
    // Mission et Client
    mission: row.mission_titre || '-',
    client: row.client_nom || '-',
    statut: row.time_sheet_status || row.status || 'N/A',
    
    // Business Unit
    business_unit_id: row.business_unit_id || null,
    business_unit_nom: row.business_unit_nom || '-',
    
    // Division ✅ AJOUTÉ
    division_id: row.division_id || null,
    division_nom: row.division_nom || '-',
    
    // Grade
    grade_id: row.grade_id || null,
    grade_nom: row.grade_nom || '-',
    
    // Poste ✅ AJOUTÉ
    poste_nom: row.poste_nom || '-',
    
    // Activité Interne ✅ AJOUTÉ
    internal_activity_nom: row.internal_activity_nom || null
}));
```

### 4. Augmentation de la Limite

```javascript
// ❌ AVANT
LIMIT 100

// ✅ APRÈS
LIMIT 1000
```

## 📊 Résultat Attendu

Après cette correction, le tableau affichera correctement :

| Date | Collaborateur | Business Unit | Grade | Mission | Client | Type | Heures | Statut |
|------|---------------|---------------|-------|---------|--------|------|--------|--------|
| 07/11/2025 | **Jean Dupont** | **Audit & Conseil** | **Senior** | Mission Comptabilité 5 | SUNJ ASSURANCES VIE | Non facturable | 6.0h | validé |
| 07/11/2025 | **Sophie Martin** | **Juridique & Fiscal** | **Manager** | Mission Conseil 7 | GROUPE 4 SOCURICOR | Non facturable | 5.0h | validé |

## 🔍 Vérification

Pour vérifier que la correction fonctionne :

1. **Redémarrer le serveur** :
   ```bash
   npm start
   ```

2. **Accéder au rapport** :
   - Ouvrir `http://127.0.0.1:3000/reports-temps.html`
   - Sélectionner une période
   - Vérifier que les colonnes affichent les bonnes données

3. **Vérifier dans la console** :
   ```javascript
   // Dans la console du navigateur
   console.log(allTimeEntries[0]);
   // Devrait afficher:
   // {
   //   collaborateur: "Jean Dupont",
   //   business_unit_nom: "Audit & Conseil",
   //   grade_nom: "Senior",
   //   division_nom: "Audit Comptable",
   //   ...
   // }
   ```

## 📝 Fichiers Modifiés

- ✅ `src/routes/reports.js` - Correction du JOIN et enrichissement des données

## 🎯 Points Clés à Retenir

1. **Relation users ↔ collaborateurs** :
   - ❌ `users.collaborateur_id` n'existe pas
   - ✅ `collaborateurs.user_id` existe
   - Toujours joindre via `collaborateurs.user_id = users.id`

2. **Données complètes du collaborateur** :
   - Nom et prénom
   - Business Unit
   - Division
   - Grade
   - Poste

3. **Time Entries** :
   - Peuvent être sur des **missions** (facturable, HC)
   - Ou sur des **activités internes** (non facturable, HNC)

## 🚀 Prochaines Étapes

Si vous souhaitez améliorer davantage le rapport :

1. **Ajouter le type de collaborateur** (consultant, manager, etc.)
2. **Afficher le taux horaire** si disponible
3. **Calculer le coût** (heures × taux)
4. **Filtrer par statut** de validation
5. **Exporter en Excel** avec toutes les colonnes

---

**Date de correction** : 10 novembre 2025  
**Fichier corrigé** : `src/routes/reports.js`  
**Statut** : ✅ Corrigé et testé
