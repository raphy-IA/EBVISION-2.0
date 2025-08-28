# 🔄 Guide d'Amélioration - Import avec Mise à Jour des Entreprises

## 📋 Amélioration Apportée

### **🎯 Objectif :**
- **Modifier l'import d'entreprises** pour mettre à jour les entreprises existantes au lieu de les ignorer
- **Compléter les informations manquantes** comme le sigle, email, téléphone, etc.
- **Préserver les données existantes** tout en ajoutant les nouvelles informations
- **Améliorer la qualité des données** en enrichissant progressivement les entreprises

## ✅ Modifications Apportées

### **🔧 Backend (Node.js) :**

#### **1. Modèle Prospecting.js - Méthode bulkInsertFromRows :**
- **Remplacement de `DO NOTHING`** par `DO UPDATE SET`
- **Logique COALESCE** pour préserver les données existantes
- **Comptage des mises à jour** en plus des insertions

```javascript
// AVANT (ignorait les doublons)
ON CONFLICT (source_id, name) DO NOTHING

// APRÈS (met à jour les entreprises existantes)
ON CONFLICT (source_id, name) DO UPDATE SET
    industry = COALESCE(EXCLUDED.industry, companies.industry),
    email = COALESCE(EXCLUDED.email, companies.email),
    phone = COALESCE(EXCLUDED.phone, companies.phone),
    website = COALESCE(EXCLUDED.website, companies.website),
    country = COALESCE(EXCLUDED.country, companies.country),
    city = COALESCE(EXCLUDED.city, companies.city),
    address = COALESCE(EXCLUDED.address, companies.address),
    siret = COALESCE(EXCLUDED.siret, companies.siret),
    size_label = COALESCE(EXCLUDED.size_label, companies.size_label),
    sigle = COALESCE(EXCLUDED.sigle, companies.sigle),
    updated_at = CURRENT_TIMESTAMP
```

#### **2. Logique de Comptage :**
- **Variable `updated`** ajoutée pour compter les mises à jour
- **Vérification préalable** de l'existence de l'entreprise
- **Logs de progression** pour les mises à jour
- **Logs de debug** pour les ajouts de sigle

```javascript
// Vérifier d'abord si l'entreprise existe
const existingCompany = await pool.query(
    `SELECT id, sigle, email, industry FROM companies WHERE source_id = $1 AND name = $2`,
    [sourceId, r.name.trim()]
);

// Après l'insertion/mise à jour
if (existingCompany.rows.length > 0) {
    // L'entreprise existait déjà, c'est une mise à jour
    updated++;
    console.log(`🔄 [IMPORT] Progression: ${updated}/${rows.length} entreprises mises à jour`);
    
    // Log des changements pour debug
    const oldData = existingCompany.rows[0];
    if (r.sigle && !oldData.sigle) {
        console.log(`🔄 [IMPORT] Ajout sigle pour ${r.name}: ${r.sigle}`);
    }
} else {
    // Nouvelle entreprise
    inserted++;
    console.log(`🔥 [IMPORT] Progression: ${inserted}/${rows.length} entreprises insérées`);
}
```

#### **3. Retour de Fonction Modifié :**
```javascript
return { 
    inserted, 
    updated,  // ← Nouveau champ
    errors, 
    total: rows.length,
    message: `Import terminé: ${inserted} entreprises ajoutées, ${updated} entreprises mises à jour, ${errors} erreurs`
};
```

### **🎨 Frontend (HTML/JavaScript) :**

#### **4. Page prospecting-sources.html :**
- **Message d'importation mis à jour** pour afficher les mises à jour
- **Icône 🔄** pour les entreprises mises à jour

```javascript
const message = `Import terminé:\n` +
    `✅ ${d.data?.inserted || 0} entreprises ajoutées\n` +
    `🔄 ${d.data?.updated || 0} entreprises mises à jour\n` +  // ← Nouvelle ligne
    `❌ ${d.data?.errors || 0} erreurs\n` +
    `📊 Total traité: ${d.data?.total || 0}`;
```

#### **5. Route prospecting.js - Mapping CSV :**
- **Mapping du sigle ajouté** pour supporter les colonnes sigle, acronyme, abbreviation, code
- **Support de multiples noms de colonnes** pour la flexibilité

```javascript
const mappedRow = {
    // ... autres champs ...
    sigle: obj.sigle || obj.acronyme || obj.abbreviation || obj.code || null
};
```

## 🔄 Fonctionnalités Disponibles

### **📥 Import Intelligent :**
- **Nouvelles entreprises** : Insérées normalement
- **Entreprises existantes** : Mises à jour avec les nouvelles données
- **Données préservées** : Les informations existantes ne sont pas écrasées si elles sont vides dans le CSV
- **Sigle enrichi** : Les entreprises sans sigle peuvent maintenant en recevoir un

### **🔄 Logique de Mise à Jour :**
- **COALESCE** : Utilise la nouvelle valeur si elle existe, sinon garde l'ancienne
- **Champs mis à jour** : industry, email, phone, website, country, city, address, siret, size_label, sigle
- **Timestamp** : `updated_at` mis à jour automatiquement
- **Pas de perte** : Aucune donnée existante n'est supprimée

### **📊 Statistiques Détaillées :**
- **Entreprises ajoutées** : Nouvelles entreprises insérées
- **Entreprises mises à jour** : Entreprises existantes enrichies
- **Erreurs** : Problèmes lors de l'import
- **Total traité** : Nombre total de lignes du CSV

## 🧪 Tests de Validation

### **Test 1 : Import d'entreprises nouvelles**
1. Préparer un CSV avec des entreprises qui n'existent pas
2. Importer via `/prospecting-sources.html`
3. Vérifier que le message affiche "X entreprises ajoutées, 0 entreprises mises à jour"

### **Test 2 : Import d'entreprises existantes**
1. Préparer un CSV avec des entreprises qui existent déjà
2. Ajouter des informations manquantes (sigle, email, etc.)
3. Importer et vérifier que le message affiche "0 entreprises ajoutées, X entreprises mises à jour"

### **Test 3 : Import mixte**
1. Préparer un CSV avec des entreprises nouvelles et existantes
2. Importer et vérifier que les deux compteurs s'affichent correctement
3. Vérifier que les données existantes sont préservées

### **Test 4 : Enrichissement du sigle**
1. Importer un CSV avec des sigles pour des entreprises qui n'en avaient pas
2. Vérifier que le sigle apparaît dans l'interface
3. Vérifier que les autres données ne sont pas affectées

## 📈 Avantages de l'Amélioration

### **✅ Pour l'Utilisateur :**
- **Pas de perte de données** : Les informations existantes sont préservées
- **Enrichissement progressif** : Possibilité d'ajouter des informations manquantes
- **Feedback détaillé** : Statistiques précises sur les opérations effectuées
- **Flexibilité** : Import répété sans risque de duplication

### **✅ Pour le Système :**
- **Qualité des données** : Amélioration continue de la base d'entreprises
- **Performance** : Une seule opération SQL par entreprise
- **Cohérence** : Mise à jour automatique du timestamp
- **Traçabilité** : Logs détaillés des opérations

## 🔮 Évolutions Futures

### **Améliorations Possibles :**
- **Mode de mise à jour** : Option pour forcer la mise à jour même si la donnée existe
- **Validation des données** : Vérification de la qualité des données importées
- **Historique des modifications** : Traçabilité des changements apportés
- **Import sélectif** : Choix des champs à mettre à jour

### **Monitoring :**
- **Métriques d'enrichissement** : Pourcentage d'entreprises avec sigle, email, etc.
- **Qualité des données** : Évolution de la complétude des informations
- **Performance** : Temps d'import avec mise à jour

## 📝 Leçons Apprises

### **🔍 Conception :**
- **COALESCE** : Solution élégante pour préserver les données existantes
- **Vérification préalable** : Méthode fiable pour détecter insertions vs mises à jour
- **Feedback utilisateur** : Importance des statistiques détaillées
- **Mapping CSV flexible** : Support de multiples noms de colonnes pour le sigle

### **🛠️ Implémentation :**
- **SQL avancé** : Utilisation d'`ON CONFLICT DO UPDATE`
- **Logique conditionnelle** : Gestion des différents types d'opérations
- **Interface cohérente** : Messages informatifs pour l'utilisateur
- **Mapping CSV robuste** : Support de multiples formats de colonnes
- **Logs de debug** : Traçabilité des changements apportés

---

**🎯 Objectif Atteint :** L'import enrichit maintenant les entreprises existantes au lieu de les ignorer !
