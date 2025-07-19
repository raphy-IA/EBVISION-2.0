# 🧪 GUIDE DE TEST - EB-Vision 2.0

## 📋 **PRÉREQUIS**

### 1. **Installation de PostgreSQL**
- Télécharger et installer PostgreSQL depuis : https://www.postgresql.org/download/
- Créer une base de données : `eb_vision_2_0`
- Noter les identifiants de connexion

### 2. **Configuration de l'environnement**
```bash
# Copier le fichier d'exemple
cp env.example .env

# Éditer .env avec vos paramètres PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eb_vision_2_0
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe
JWT_SECRET=votre_secret_jwt_super_securise
```

## 🚀 **TESTS À EFFECTUER**

### **Test 1 : Installation des dépendances**
```bash
npm install
```

### **Test 2 : Migration de la base de données**
```bash
npm run migrate
```
**Résultat attendu :** 
- ✅ Tables créées avec succès
- ✅ Index et contraintes appliqués

### **Test 3 : Peuplement des données initiales**
```bash
npm run seed
```
**Résultat attendu :**
- ✅ Rôles et permissions créés
- ✅ Divisions créées
- ✅ Utilisateur admin créé
- ✅ Informations de connexion affichées

### **Test 4 : Démarrage du serveur**
```bash
npm run dev
```
**Résultat attendu :**
- ✅ Serveur démarré sur le port 3000
- ✅ Connexion à la base de données établie
- ✅ URL d'accès affichée

### **Test 5 : Test de l'API**
```bash
# Test de santé de l'API
curl http://localhost:3000/api/health

# Test d'authentification
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@eb-vision.com",
    "password": "Admin123!"
  }'
```

## 🔍 **TESTS DES MODÈLES**

### **Test 6 : Test des modèles via Node.js REPL**
```bash
# Ouvrir Node.js en mode interactif
node

# Dans le REPL :
require('dotenv').config();
const User = require('./src/models/User');
const Division = require('./src/models/Division');
const Client = require('./src/models/Client');

// Test de récupération des utilisateurs
User.findAll().then(console.log);

// Test de récupération des divisions
Division.findActive().then(console.log);

// Test de récupération des clients
Client.getGlobalStats().then(console.log);
```

## 📊 **DONNÉES DE TEST DISPONIBLES**

Après le seeding, vous aurez :

### **Utilisateur Admin :**
- Email : `admin@eb-vision.com`
- Mot de passe : `Admin123!`
- Rôle : ADMIN avec toutes les permissions

### **Divisions créées :**
- Tax
- Legal  
- Audit
- Advisory
- Support

### **Rôles et permissions :**
- 5 rôles (ADMIN, PARTNER, MANAGER, SENIOR, ASSISTANT)
- 50+ permissions réparties par module

## 🛠️ **OUTILS DE TEST RECOMMANDÉS**

### **1. Postman ou Insomnia**
- Pour tester les endpoints API
- Importez cette collection de test

### **2. pgAdmin ou DBeaver**
- Pour visualiser la base de données
- Vérifier les tables et données

### **3. VS Code avec extensions :**
- REST Client
- PostgreSQL
- Thunder Client

## ⚠️ **PROBLÈMES COURANTS**

### **Erreur de connexion PostgreSQL :**
```bash
# Vérifier que PostgreSQL est démarré
# Windows : Services > PostgreSQL
# Linux/Mac : sudo systemctl start postgresql
```

### **Erreur de permissions :**
```bash
# Vérifier les droits de l'utilisateur PostgreSQL
# Créer l'utilisateur si nécessaire
```

### **Port déjà utilisé :**
```bash
# Changer le port dans .env
PORT=3001
```

## 📈 **MÉTRIQUES À VÉRIFIER**

### **Performance :**
- Temps de démarrage du serveur < 5 secondes
- Temps de réponse API < 500ms
- Connexion base de données < 1 seconde

### **Sécurité :**
- JWT généré correctement
- Mots de passe hashés
- Headers de sécurité présents

### **Fonctionnalités :**
- Toutes les tables créées
- Relations entre tables fonctionnelles
- Contraintes d'intégrité respectées 