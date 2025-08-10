# Système de Notifications TRS - Scripts de Test et Correction

Ce dossier contient les scripts pour tester et corriger le système de notifications et alertes de l'application TRS.

## 📋 Scripts Disponibles

### 1. Test du Système de Notifications
**Fichier:** `test-notification-system.js`  
**Commande:** `npm run test:notifications`

Teste toutes les fonctionnalités du système de notifications :
- ✅ Connexion à la base de données
- ✅ Service email (SMTP)
- ✅ Tables requises
- ✅ Création de notifications
- ✅ Paramètres de notifications
- ✅ Envoi d'emails
- ✅ Tâches cron
- ✅ Récupération de notifications

### 2. Correction des Anomalies
**Fichier:** `fix-notification-anomalies.js`  
**Commande:** `npm run fix:notifications`

Corrige automatiquement les problèmes détectés :
- 🔧 Tables manquantes
- 🔧 Colonnes manquantes
- 🔧 Index manquants
- 🔧 Incohérences de données
- 🔧 Paramètres par défaut
- 🔧 Configuration email
- 🔧 Triggers automatiques

### 3. Vérification Complète
**Fichier:** `complete-notification-system-check.js`  
**Commande:** `npm run notifications:full-check`

Exécute une vérification complète en 6 étapes :
1. **Tests initiaux** - Identification des problèmes
2. **Analyse** - Évaluation des erreurs et avertissements
3. **Corrections** - Application des corrections automatiques
4. **Tests post-correction** - Validation des corrections
5. **Comparaison** - Analyse des améliorations
6. **Rapport final** - Résumé complet

### 4. Script de Lancement Simple
**Fichier:** `run-notification-check.js`  
**Commande:** `npm run check:notifications`

Script simplifié pour lancer la vérification complète avec gestion d'erreurs.

## 🚀 Utilisation

### Vérification Rapide
```bash
# Test simple du système
npm run test:notifications
```

### Correction des Problèmes
```bash
# Corriger les anomalies détectées
npm run fix:notifications
```

### Vérification Complète (Recommandé)
```bash
# Vérification complète avec tests avant/après
npm run check:notifications
```

### Vérification Complète (Avancée)
```bash
# Vérification complète avec plus de détails
npm run notifications:full-check
```

## 📊 Configuration de la Base de Données

Les scripts utilisent les paramètres suivants (configurés dans chaque script) :
- **Host:** localhost
- **Port:** 5432
- **Database:** eb_vision_2_0
- **User:** postgres
- **Password:** Canaan@2020

## 📧 Configuration Email

Pour tester l'envoi d'emails, configurez les paramètres SMTP :
- **Serveur:** smtp.gmail.com
- **Port:** 587
- **Utilisateur:** trs.notifications@gmail.com
- **Mot de passe:** [Mot de passe d'application Gmail]

## 🔍 Tests Effectués

### Tests de Base
- ✅ Connexion à PostgreSQL
- ✅ Vérification des tables requises
- ✅ Service email SMTP
- ✅ Création de notifications de test
- ✅ Paramètres de notifications

### Tests Fonctionnels
- ✅ Création de différents types de notifications
- ✅ Configuration des paramètres utilisateur
- ✅ Envoi d'emails de test
- ✅ Vérification des tâches cron
- ✅ Récupération et statistiques des notifications

### Tests de Performance
- ✅ Index de base de données
- ✅ Requêtes optimisées
- ✅ Triggers automatiques
- ✅ Nettoyage des données de test

## 🔧 Corrections Automatiques

### Tables et Structure
- Création des tables manquantes (`notifications`, `notification_settings`, `time_sheet_notifications`)
- Ajout des colonnes manquantes (`priority`, `data`, `last_activity_at`, `due_date`)
- Création des index pour optimiser les performances
- Ajout des contraintes et validations

### Données
- Nettoyage des notifications orphelines
- Mise à jour des dates d'activité des opportunités
- Correction des statuts d'étapes invalides
- Création des paramètres par défaut pour tous les utilisateurs

### Configuration
- Configuration email par défaut
- Paramètres de notifications optimaux
- Triggers pour mise à jour automatique
- Index pour les requêtes fréquentes

## 📋 Rapports Générés

### Rapport de Test
- Résumé des tests (réussis/échoués/avertissements)
- Détails de chaque test
- Recommandations d'amélioration

### Rapport de Correction
- Liste des corrections appliquées
- Nombre de lignes affectées
- Validation des corrections

### Rapport Final
- Comparaison avant/après
- Améliorations apportées
- État final du système
- Prochaines étapes recommandées

## ⚠️ Notes Importantes

1. **Sauvegarde:** Les scripts modifient la base de données. Faites une sauvegarde avant utilisation.
2. **Email:** Configurez le mot de passe email pour les tests complets.
3. **Permissions:** Assurez-vous d'avoir les droits d'écriture sur la base de données.
4. **Dépendances:** Les scripts nécessitent `pg`, `nodemailer`, et `node-cron`.

## 🆘 Dépannage

### Erreur de Connexion à la Base de Données
```bash
# Vérifiez que PostgreSQL est démarré
# Vérifiez les paramètres de connexion dans les scripts
```

### Erreur de Service Email
```bash
# Configurez le mot de passe d'application Gmail
# Vérifiez les paramètres SMTP
```

### Erreur de Permissions
```bash
# Vérifiez les droits d'utilisateur PostgreSQL
# Assurez-vous d'avoir les droits CREATE, INSERT, UPDATE, DELETE
```

## 📞 Support

En cas de problème :
1. Vérifiez les logs d'erreur
2. Consultez la documentation PostgreSQL
3. Vérifiez la configuration email
4. Contactez l'équipe de développement TRS
