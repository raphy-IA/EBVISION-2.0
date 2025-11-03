# 🔍 Scripts de Comparaison et Correction des Bases de Données

Ces scripts permettent de comparer les structures de base de données entre l'environnement local et la production, et de corriger automatiquement les différences.

## 📋 Scripts Disponibles

### 1. `export-database-structure.js`
**Exporte la structure complète d'une base de données vers un fichier JSON.**

```bash
# Exporter les deux structures (local + production)
node scripts/export-database-structure.js

# Exporter seulement la structure locale
node scripts/export-database-structure.js --local

# Exporter seulement la structure de production
node scripts/export-database-structure.js --production
```

**Fichiers générés :**
- `database-structure-local.json`
- `database-structure-production.json`

### 2. `compare-database-structure.js`
**Compare les structures de base de données et génère un rapport détaillé.**

```bash
node scripts/compare-database-structure.js
```

**Fichier généré :**
- `database-comparison-report.md`

**Le rapport identifie :**
- 🚨 Tables manquantes en production
- ⚠️ Tables supplémentaires en production
- 🔍 Différences de colonnes
- 🔒 Différences de contraintes
- 📊 Différences d'index

### 3. `fix-database-differences.js`
**Applique automatiquement les corrections connues et génère un script SQL pour les autres.**

```bash
node scripts/fix-database-differences.js
```

**Corrections automatiques :**
- ✅ Ajout de la clé primaire composite `prospecting_campaign_companies_pkey`
- ✅ Ajout de la valeur par défaut `'PENDING'` pour la colonne `status`

**Fichier généré :**
- `database-fix-script.sql` (script SQL pour les corrections manuelles)

## 🚀 Workflow Recommandé

### 1. Export des structures
```bash
node scripts/export-database-structure.js
```

### 2. Comparaison
```bash
node scripts/compare-database-structure.js
```

### 3. Correction automatique
```bash
node scripts/fix-database-differences.js
```

### 4. Vérification
Consultez le fichier `database-comparison-report.md` pour voir les différences restantes.

### 5. Corrections manuelles
Exécutez le script SQL généré dans `database-fix-script.sql` après vérification.

## ⚙️ Configuration

### Variables d'environnement
Les scripts utilisent les configurations définies dans les fichiers :

**Local :**
```javascript
const LOCAL_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'ebpadfbq_eb_vision_2_0',
    user: 'ebpadfbq_eb_admin20',
    password: '87ifet-Z)&'
};
```

**Production :**
```javascript
const PRODUCTION_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'ebpadfbq_eb_vision_2_0',
    user: 'ebpadfbq_eb_admin20',
    password: '87ifet-Z)&'
};
```

### Modification de la configuration
Pour utiliser des configurations différentes, modifiez les variables dans chaque script.

## 📊 Types de Différences Détectées

### Tables
- **Manquantes** : Tables présentes en local mais absentes en production
- **Supplémentaires** : Tables présentes en production mais absentes en local

### Colonnes
- **Manquantes** : Colonnes présentes en local mais absentes en production
- **Supplémentaires** : Colonnes présentes en production mais absentes en local
- **Différences** : Colonnes avec des types, contraintes ou valeurs par défaut différents

### Contraintes
- **Manquantes** : Contraintes présentes en local mais absentes en production
- **Supplémentaires** : Contraintes présentes en production mais absentes en local

### Index
- **Manquants** : Index présents en local mais absents en production
- **Supplémentaires** : Index présents en production mais absents en local

## 🔧 Corrections Automatiques

### Clé Primaire Composite
```sql
ALTER TABLE prospecting_campaign_companies 
ADD CONSTRAINT prospecting_campaign_companies_pkey 
PRIMARY KEY (campaign_id, company_id);
```

### Valeur par Défaut
```sql
ALTER TABLE prospecting_campaign_companies 
ALTER COLUMN status SET DEFAULT 'PENDING';
```

## ⚠️ Précautions

1. **Sauvegarde** : Toujours faire une sauvegarde avant d'appliquer des corrections
2. **Vérification** : Vérifier chaque commande SQL avant de l'exécuter
3. **Test** : Tester les corrections sur un environnement de test d'abord
4. **Permissions** : S'assurer d'avoir les permissions nécessaires sur la base de données

## 🐛 Dépannage

### Erreur de connexion
- Vérifier les paramètres de connexion
- S'assurer que la base de données est accessible
- Vérifier les permissions utilisateur

### Erreur de permissions
- Utiliser un utilisateur avec les permissions `ALTER TABLE`
- Ou utiliser l'utilisateur propriétaire de la base de données

### Erreur de contrainte
- Vérifier que les données existantes respectent les nouvelles contraintes
- Nettoyer les données si nécessaire avant d'ajouter les contraintes

## 📝 Exemple de Rapport

```markdown
# RAPPORT DE COMPARAISON DES BASES DE DONNÉES

## 🚨 TABLES MANQUANTES EN PRODUCTION
- **new_table**

## 🔍 DIFFÉRENCES DE COLONNES
### Table: prospecting_campaign_companies
- **Colonne manquante**: `new_column`
  - Type: character varying
  - Nullable: YES
  - Default: NULL

## 🔒 DIFFÉRENCES DE CONTRAINTES
### Table: prospecting_campaign_companies
- **Contrainte manquante**: `prospecting_campaign_companies_pkey`
  - Type: PRIMARY KEY
  - Définition: PRIMARY KEY (campaign_id, company_id)
```

## 🎯 Objectif

Ces scripts permettent de :
- ✅ Détecter automatiquement les incohérences entre les environnements
- ✅ Corriger automatiquement les problèmes connus
- ✅ Générer des scripts de correction pour les problèmes complexes
- ✅ Maintenir la cohérence entre les bases de données
- ✅ Éviter les erreurs de production dues aux différences de structure

















