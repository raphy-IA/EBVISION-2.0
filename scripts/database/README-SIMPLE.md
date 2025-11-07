# Initialisation Simple de la Base de Données

## 🎯 Objectif

Créer et initialiser une nouvelle base de données pour un nouveau client en **2 étapes simples**.

## 📋 Prérequis

- PostgreSQL installé
- Node.js installé
- Une base de développement fonctionnelle

## 🚀 Utilisation

### Étape 1 : Exporter le schéma de votre base de développement

**Sur votre machine de développement** (une seule fois) :

```bash
# Windows (PowerShell)
.\scripts\database\export-schema.ps1

# Linux/Mac
./scripts/database/export-schema.sh
```

Cela crée le fichier `scripts/database/schema-complete.sql` qui contient toute la structure de votre base.

### Étape 2 : Initialiser une nouvelle base

**Sur n'importe quel serveur** :

1. Configurer le `.env` :
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
DB_NAME=nom_base_client
DB_SSL=false
```

2. Exécuter l'initialisation :
```bash
node scripts/database/init-from-schema.js
```

Le script vous proposera :
- **🆕 Créer une nouvelle base** : Entrez le nom, elle sera créée automatiquement
- **📂 Réinitialiser une base existante** : Choisissez dans la liste, elle sera DROP puis recréée

**Mode automatique (pour scripts CI/CD) :**
```bash
node scripts/database/init-from-schema.js --yes
```
Utilise la base définie dans `.env` sans confirmation.

**C'est tout !** ✅

## 📦 Ce qui est créé automatiquement

- ✅ Toutes les tables avec leur structure exacte
- ✅ Tous les index
- ✅ Toutes les contraintes
- ✅ Tous les triggers
- ✅ Les rôles de base (avec couleurs)
- ✅ Un super administrateur (admin@ebvision.com / Admin@2025)

## 🔄 Mise à jour du schéma

Si vous modifiez la structure de votre base de développement :

1. Réexportez le schéma (Étape 1)
2. Committez le nouveau `schema-complete.sql`
3. Les prochaines initialisations utiliseront la nouvelle structure

## 🆘 Dépannage

**Erreur "Fichier schema-complete.sql introuvable"**
→ Exécutez d'abord l'Étape 1 (export du schéma)

**Erreur de connexion**
→ Vérifiez votre fichier `.env`

**Tables déjà existantes**
→ Utilisez l'option "Réinitialiser une base existante" du script, il s'occupe du DROP/CREATE automatiquement

