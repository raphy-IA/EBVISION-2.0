# Scripts de Test et Configuration - TRS Affichage

Ce répertoire contient tous les scripts de test et de configuration pour le système TRS Affichage.

## 📋 Table des Matières

1. [Système de Notifications](#système-de-notifications)
2. [Configuration des Types d'Opportunités](#configuration-des-types-dopportunités)
3. [Scripts de Base de Données](#scripts-de-base-de-données)
4. [Scripts de Migration](#scripts-de-migration)

---

## 🔔 Système de Notifications

### Scripts Disponibles

#### `test-notification-system.js`
Test complet du système de notifications et d'alertes.

**Fonctionnalités testées :**
- Connexion à la base de données
- Existence des tables requises
- Création de notifications
- Récupération des notifications
- Paramètres de notification
- Service email
- Tâches cron
- Nettoyage des données de test

**Utilisation :**
```bash
npm run test:notifications
```

#### `fix-notification-anomalies.js`
Corrige automatiquement les anomalies courantes du système de notifications.

**Corrections appliquées :**
- Ajout de colonnes manquantes dans les tables
- Configuration du service email
- Création d'index manquants
- Validation des contraintes
- Nettoyage des données corrompues

**Utilisation :**
```bash
npm run fix:notifications
```

#### `complete-notification-system-check.js`
Orchestre un cycle complet de test-correction-test.

**Étapes :**
1. Test initial du système
2. Application des corrections automatiques
3. Test final de validation
4. Génération d'un rapport détaillé

**Utilisation :**
```bash
npm run notifications:full-check
```

#### `run-notification-check.js`
Script wrapper simple pour exécuter le cycle complet.

**Utilisation :**
```bash
npm run check:notifications
```

---

## ⚙️ Configuration des Types d'Opportunités

### Scripts Disponibles

#### `test-opportunity-type-configuration.js`
Test complet du système de configuration des types d'opportunités.

**Fonctionnalités testées :**
- Connexion à la base de données
- Existence des tables de configuration
- Création d'un type d'opportunité de test
- Création d'étapes par défaut
- Test des routes workflow
- Configuration des étapes
- Gestion des actions et documents requis
- Nettoyage des données de test

**Utilisation :**
```bash
npm run test:opportunity-config
```

### Interface de Configuration

#### Page Web : `opportunity-type-configuration.html`
Interface utilisateur complète pour configurer les types d'opportunités.

**Fonctionnalités :**
- Liste des types d'opportunités existants
- Création de nouveaux types
- Configuration des étapes par type
- Gestion des actions requises par étape
- Gestion des documents requis par étape
- Réorganisation des étapes par glisser-déposer
- Validation des configurations

#### API Routes : `src/routes/workflow.js`
Endpoints pour la gestion des configurations.

**Routes disponibles :**
- `GET /api/workflow/stages?typeId=X` - Récupérer les étapes d'un type
- `GET /api/workflow/requirements?typeId=X` - Récupérer les exigences
- `POST /api/workflow/stages` - Créer une nouvelle étape
- `PUT /api/workflow/stages/:id` - Modifier une étape
- `DELETE /api/workflow/stages/:id` - Supprimer une étape
- `PUT /api/workflow/stages/reorder` - Réorganiser les étapes
- `POST /api/workflow/stages/:id/actions` - Ajouter une action requise
- `DELETE /api/workflow/stages/actions/:id` - Supprimer une action requise
- `POST /api/workflow/stages/:id/documents` - Ajouter un document requis
- `DELETE /api/workflow/stages/documents/:id` - Supprimer un document requis

---

## 🗄️ Scripts de Base de Données

### Scripts de Migration

#### `clean-and-migrate.js`
Nettoie et applique toutes les migrations de base de données.

**Fonctionnalités :**
- Suppression des tables existantes
- Création des nouvelles tables
- Insertion des données par défaut
- Validation de l'intégrité

**Utilisation :**
```bash
node scripts/clean-and-migrate.js
```

#### `create-opportunity-stages-tables.js`
Crée les tables pour la gestion des étapes d'opportunités.

**Tables créées :**
- `opportunity_types`
- `opportunity_stage_templates`
- `opportunity_stages`
- `stage_actions`
- `stage_documents`
- `risk_parameters`

**Utilisation :**
```bash
node scripts/create-opportunity-stages-tables.js
```

### Scripts de Données

#### `seed-standard-workflow-requirements.js`
Insère les exigences standard pour les workflows d'opportunités.

**Données insérées :**
- Étapes standard (Prospection, Qualification, Proposition, Négociation, Décision)
- Actions requises par étape
- Documents requis par étape
- Paramètres de risque

**Utilisation :**
```bash
node scripts/seed-standard-workflow-requirements.js
```

#### `add-standard-sales-pipeline.js`
Ajoute le pipeline de vente standard.

**Fonctionnalités :**
- Création du type "Vente standard"
- Ajout des 6 étapes par défaut
- Configuration des actions et documents requis

**Utilisation :**
```bash
node scripts/add-standard-sales-pipeline.js
```

#### `fix-duplicate-opportunity-stages.js`
Nettoie les étapes d'opportunités dupliquées.

**Fonctionnalités :**
- Identification des doublons
- Suppression des étapes en double
- Réorganisation des ordres
- Validation de l'intégrité

**Utilisation :**
```bash
node scripts/fix-duplicate-opportunity-stages.js
```

---

## 🚀 Utilisation Rapide

### Test Complet du Système
```bash
# Test des notifications
npm run notifications:full-check

# Test de la configuration des opportunités
npm run test:opportunity-config

# Test complet de tous les systèmes
npm run test:notifications && npm run test:opportunity-config
```

### Correction des Anomalies
```bash
# Correction automatique des notifications
npm run fix:notifications

# Nettoyage des étapes dupliquées
node scripts/fix-duplicate-opportunity-stages.js
```

### Configuration Initiale
```bash
# Migration complète
node scripts/clean-and-migrate.js

# Ajout du pipeline standard
node scripts/add-standard-sales-pipeline.js

# Insertion des exigences
node scripts/seed-standard-workflow-requirements.js
```

---

## 📊 Structure des Données

### Tables Principales

#### `opportunity_types`
Types d'opportunités disponibles dans le système.

**Colonnes :**
- `id` - Identifiant unique
- `name` - Nom du type
- `nom` - Nom en français
- `description` - Description détaillée
- `default_probability` - Probabilité par défaut (%)
- `default_duration_days` - Durée par défaut (jours)

#### `opportunity_stage_templates`
Modèles d'étapes pour chaque type d'opportunité.

**Colonnes :**
- `id` - Identifiant unique
- `opportunity_type_id` - Référence au type
- `stage_name` - Nom de l'étape
- `stage_order` - Ordre dans le workflow
- `description` - Description de l'étape
- `min_duration_days` - Durée minimale
- `max_duration_days` - Durée maximale
- `is_mandatory` - Étape obligatoire
- `validation_required` - Validation requise

#### `stage_required_actions`
Actions requises pour chaque étape.

**Colonnes :**
- `id` - Identifiant unique
- `stage_template_id` - Référence à l'étape
- `action_type` - Type d'action
- `is_mandatory` - Action obligatoire
- `validation_order` - Ordre de validation

#### `stage_required_documents`
Documents requis pour chaque étape.

**Colonnes :**
- `id` - Identifiant unique
- `stage_template_id` - Référence à l'étape
- `document_type` - Type de document
- `is_mandatory` - Document obligatoire

---

## 🔧 Configuration

### Variables d'Environnement

**Base de Données :**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eb_vision_2_0
DB_USER=postgres
DB_PASSWORD=Canaan@2020
```

**Email (pour les notifications) :**
```bash
EMAIL_USER=votre_email@gmail.com
EMAIL_PASSWORD=votre_mot_de_passe_app
```

### Dépendances

**NPM :**
```json
{
  "multer": "^1.4.5-lts.1",
  "node-cron": "^3.0.2",
  "nodemailer": "^6.9.7"
}
```

---

## 📝 Notes Importantes

### Sécurité
- Les mots de passe d'email doivent être des "mots de passe d'application" pour Gmail
- Les scripts de test créent des données temporaires qui sont automatiquement nettoyées
- Les migrations peuvent supprimer des données existantes

### Performance
- Les tests complets peuvent prendre plusieurs minutes
- Les scripts de correction sont optimisés pour traiter de gros volumes de données
- Les index sont créés automatiquement pour optimiser les requêtes

### Maintenance
- Exécuter les tests régulièrement pour détecter les anomalies
- Sauvegarder la base de données avant les migrations importantes
- Vérifier les logs pour identifier les problèmes potentiels

---

## 🆘 Dépannage

### Problèmes Courants

#### Erreur de Connexion à la Base de Données
```bash
# Vérifier les variables d'environnement
echo $DB_HOST $DB_PORT $DB_NAME $DB_USER

# Tester la connexion
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
```

#### Erreur Email
```bash
# Vérifier la configuration email
echo $EMAIL_USER $EMAIL_PASSWORD

# Tester l'envoi d'email
node scripts/test-notification-system.js
```

#### Étapes Dupliquées
```bash
# Nettoyer les doublons
node scripts/fix-duplicate-opportunity-stages.js
```

### Logs et Debugging

**Activer les logs détaillés :**
```bash
DEBUG=* npm start
```

**Vérifier les erreurs de base de données :**
```bash
tail -f logs/database.log
```

---

## 📞 Support

Pour toute question ou problème :
1. Consulter les logs d'erreur
2. Exécuter les scripts de test appropriés
3. Vérifier la configuration des variables d'environnement
4. Consulter la documentation des API

---

*Dernière mise à jour : $(date)*
