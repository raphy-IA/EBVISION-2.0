# 🎯 GUIDE COMPLET POUR DÉBUTANTS - EB-Vision 2.0

## 📋 **ÉTAPE 1 : VÉRIFIER VOS OUTILS**

### **1.1 Vérifier Node.js**
Ouvrez votre **Terminal** (ou **Invite de commandes** sur Windows) et tapez :

```bash
node --version
```

**Résultat attendu :** `v16.x.x` ou `v18.x.x` ou `v20.x.x`

**Si vous obtenez une erreur :**
- Allez sur https://nodejs.org/
- Téléchargez la version "LTS" (Long Term Support)
- Installez-la en suivant les instructions

### **1.2 Vérifier npm**
Dans le même terminal, tapez :

```bash
npm --version
```

**Résultat attendu :** `9.x.x` ou `10.x.x`

### **1.3 Vérifier Git**
```bash
git --version
```

**Résultat attendu :** `git version 2.x.x`

**Si vous obtenez une erreur :**
- Allez sur https://git-scm.com/
- Téléchargez et installez Git

---

## 🗄️ **ÉTAPE 2 : INSTALLER POSTGRESQL**

### **2.1 Télécharger PostgreSQL**
- Allez sur https://www.postgresql.org/download/
- Cliquez sur "Download the installer"
- Choisissez votre système d'exploitation (Windows/Mac/Linux)

### **2.2 Installer PostgreSQL**
**Sur Windows :**
1. Double-cliquez sur le fichier téléchargé
2. Cliquez "Next" à chaque étape
3. **IMPORTANT** : Notez le mot de passe que vous définissez pour l'utilisateur "postgres"
4. Laissez le port par défaut (5432)
5. Terminez l'installation

**Sur Mac :**
1. Double-cliquez sur le fichier .dmg
2. Suivez les instructions d'installation

### **2.3 Vérifier l'installation**
Ouvrez un nouveau terminal et tapez :

```bash
psql --version
```

**Résultat attendu :** `psql (PostgreSQL) 14.x` ou version similaire

---

## 📁 **ÉTAPE 3 : PRÉPARER LE PROJET**

### **3.1 Ouvrir le dossier du projet**
Dans votre terminal, naviguez vers le dossier du projet :

```bash
# Si vous êtes dans le dossier TRS-Affichage
cd TRS-Affichage

# Vérifier que vous êtes au bon endroit
ls
# Vous devriez voir : package.json, server.js, etc.
```

### **3.2 Installer les dépendances**
```bash
npm install
```

**Résultat attendu :**
- Beaucoup de texte qui défile
- À la fin : "added X packages" et "audited X packages"

**Si vous obtenez une erreur :**
- Vérifiez que vous êtes dans le bon dossier
- Vérifiez votre connexion internet
- Essayez : `npm cache clean --force` puis `npm install`

---

## ⚙️ **ÉTAPE 4 : CONFIGURER LA BASE DE DONNÉES**

### **4.1 Créer la base de données**
Ouvrez **pgAdmin** (installé avec PostgreSQL) ou utilisez le terminal :

**Avec pgAdmin :**
1. Ouvrez pgAdmin
2. Connectez-vous avec le mot de passe défini lors de l'installation
3. Clic droit sur "Databases"
4. "Create" > "Database"
5. Nom : `eb_vision_2_0`
6. Cliquez "Save"

**Avec le terminal :**
```bash
# Se connecter à PostgreSQL
psql -U postgres

# Dans psql, tapez :
CREATE DATABASE eb_vision_2_0;
\q
```

### **4.2 Configurer le fichier .env**
```bash
# Copier le fichier d'exemple
cp env.example .env
```

**Ouvrez le fichier .env** avec un éditeur de texte (Notepad, VS Code, etc.) et modifiez :

```ini
# Configuration de la base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eb_vision_2_0
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe_postgres
JWT_SECRET=mon_secret_tres_securise_123456789
```

**Remplacez `votre_mot_de_passe_postgres`** par le mot de passe que vous avez défini lors de l'installation de PostgreSQL.

---

## 🚀 **ÉTAPE 5 : CRÉER LES TABLES**

### **5.1 Exécuter les migrations**
```bash
npm run migrate
```

**Résultat attendu :**
```
🚀 Démarrage des migrations...
✅ Connexion à PostgreSQL réussie
📅 Heure du serveur: 2024-01-XX XX:XX:XX
⏭️  Migration 001_create_tables.sql déjà exécutée, ignorée
🎉 Toutes les migrations ont été exécutées avec succès!
```

**Si vous obtenez une erreur :**
- Vérifiez que PostgreSQL est démarré
- Vérifiez les paramètres dans .env
- Vérifiez que la base de données existe

### **5.2 Peupler les données initiales**
```bash
npm run seed
```

**Résultat attendu :**
```
🌱 Démarrage des seeds...
✅ Connexion à PostgreSQL réussie
📅 Heure du serveur: 2024-01-XX XX:XX:XX
🎉 Tous les seeds ont été exécutés avec succès!

📋 Informations de connexion:
👤 Email: admin@eb-vision.com
🔑 Mot de passe: Admin123!
⚠️  IMPORTANT: Changez ce mot de passe en production!
```

---

## 🧪 **ÉTAPE 6 : TESTER L'INSTALLATION**

### **6.1 Test rapide**
```bash
npm run test:quick
```

**Résultat attendu :**
```
🧪 DÉMARRAGE DES TESTS RAPIDES - EB-Vision 2.0

1️⃣ Test de connexion à la base de données...
   ✅ Connexion réussie

2️⃣ Vérification des tables...
   ✅ Toutes les tables sont présentes (11 tables)

3️⃣ Vérification des données initiales...
   📊 Rôles: 5
   📊 Permissions: 50
   📊 Divisions: 5
   📊 Utilisateur admin: Présent
   ✅ Données initiales vérifiées

4️⃣ Test des modèles...
   👥 Modèle User: 1 utilisateur(s) récupéré(s)
   🏢 Modèle Division: 5 division(s) active(s)
   🏢 Modèle Client: 0 client(s) total
   ✅ Modèles fonctionnels

5️⃣ Test de l'authentification...
   🔐 Mot de passe admin: Valide
   ✅ Authentification testée

6️⃣ Test des relations...
   🔗 Relation User-Division: Administrateur Système → Support
   ✅ Relations fonctionnelles

🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !

📋 RÉSUMÉ:
   • Base de données: ✅ Connectée
   • Tables: ✅ 11/11 créées
   • Données: ✅ Initialisées
   • Modèles: ✅ Fonctionnels
   • Authentification: ✅ Opérationnelle
   • Relations: ✅ Fonctionnelles

🚀 Vous pouvez maintenant démarrer le serveur avec: npm run dev
🔗 URL d'accès: http://localhost:3000
👤 Connexion admin: admin@eb-vision.com / Admin123!
```

---

## 🌐 **ÉTAPE 7 : DÉMARRER LE SERVEUR**

### **7.1 Lancer l'application**
```bash
npm run dev
```

**Résultat attendu :**
```
🚀 Serveur démarré sur le port 3000
📊 Environnement: development
🔗 URL: http://localhost:3000
📚 API Documentation: http://localhost:3000/api/health
```

### **7.2 Tester dans le navigateur**
1. Ouvrez votre navigateur (Chrome, Firefox, etc.)
2. Allez à l'adresse : `http://localhost:3000`
3. Vous devriez voir une page d'accueil

### **7.3 Tester l'API**
Dans votre navigateur, allez à :
`http://localhost:3000/api/health`

Vous devriez voir un message JSON comme :
```json
{
  "status": "OK",
  "timestamp": "2024-01-XX...",
  "version": "2.0.0",
  "environment": "development"
}
```

---

## 🔧 **RÉSOLUTION DES PROBLÈMES COURANTS**

### **Problème : "PostgreSQL n'est pas reconnu"**
**Solution :**
- Redémarrez votre terminal
- Vérifiez que PostgreSQL est installé
- Sur Windows : vérifiez dans "Services" que PostgreSQL est démarré

### **Problème : "Port 3000 déjà utilisé"**
**Solution :**
- Modifiez le fichier .env
- Changez `PORT=3000` en `PORT=3001`
- Redémarrez le serveur

### **Problème : "Erreur de connexion à la base de données"**
**Solution :**
- Vérifiez que PostgreSQL est démarré
- Vérifiez les paramètres dans .env
- Vérifiez que la base de données existe

### **Problème : "Module non trouvé"**
**Solution :**
- Exécutez `npm install` à nouveau
- Vérifiez que vous êtes dans le bon dossier

---

## 📞 **BESOIN D'AIDE ?**

Si vous rencontrez des problèmes :

1. **Copiez le message d'erreur exact**
2. **Notez à quelle étape vous êtes**
3. **Décrivez ce que vous avez fait**

Je pourrai alors vous aider plus précisément !

---

## 🎉 **FÉLICITATIONS !**

Si vous arrivez jusqu'ici, vous avez :
- ✅ Installé Node.js et PostgreSQL
- ✅ Configuré la base de données
- ✅ Créé toutes les tables
- ✅ Peuplé les données initiales
- ✅ Testé que tout fonctionne
- ✅ Démarré le serveur

**Vous êtes prêt pour la suite !** 🚀 