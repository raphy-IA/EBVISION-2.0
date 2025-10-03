# 🔄 REDÉMARRAGE DU SERVEUR - INSTRUCTIONS

**Date:** Octobre 2025  
**Raison:** Appliquer les modifications de `src/utils/validators.js` (ajout du champ `roles`)

---

## 🎯 **POURQUOI REDÉMARRER ?**

Les modifications apportées au fichier `src/utils/validators.js` ne seront prises en compte **que si le serveur est redémarré**.

**Modification apportée :**
```javascript
roles: Joi.array().items(Joi.string().uuid()).min(1)
```

---

## 📋 **MÉTHODE 1 : REDÉMARRAGE MANUEL (RECOMMANDÉ)**

### **Étape 1 : Arrêter le serveur**

Si le serveur tourne dans un terminal :
1. Aller dans le terminal où le serveur est en cours d'exécution
2. Appuyer sur `Ctrl + C` pour arrêter le serveur
3. Attendre le message de confirmation

**OU** depuis PowerShell :
```powershell
# Trouver le processus Node.js
Get-Process -Name node

# Arrêter le processus (remplacer XXXX par l'ID du processus)
Stop-Process -Id XXXX -Force
```

### **Étape 2 : Redémarrer le serveur**

**Ouvrir un nouveau terminal PowerShell et exécuter :**

```powershell
# Se placer dans le répertoire du projet
cd "D:\10. Programmation\Projets\EB-Vision 2.0"

# Démarrer le serveur
node server.js
```

**Ou avec npm :**
```powershell
cd "D:\10. Programmation\Projets\EB-Vision 2.0"
npm start
```

### **Étape 3 : Vérifier que le serveur est démarré**

Vous devriez voir des messages comme :
```
✅ Serveur démarré sur le port 3000
✅ Base de données connectée
```

---

## 📋 **MÉTHODE 2 : REDÉMARRAGE AVEC PM2 (SI INSTALLÉ)**

Si vous utilisez PM2 :

```bash
# Redémarrer l'application
pm2 restart server

# Ou avec le nom de l'application
pm2 restart EB-Vision
```

---

## 🧪 **VÉRIFICATION**

### **1. Vérifier que le serveur écoute sur le port 3000 :**

**PowerShell :**
```powershell
netstat -ano | Select-String ":3000"
```

**Résultat attendu :**
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       XXXX
```

### **2. Tester l'API dans le navigateur :**

Ouvrir : `http://localhost:3000/api/health` (ou une route de test)

### **3. Tester la modification des rôles :**

1. Aller sur `http://localhost:3000/users.html`
2. Cliquer sur "Gérer le compte" d'un utilisateur
3. Sélectionner 2 rôles ou plus
4. Cliquer sur "Mettre à jour"
5. **Résultat attendu :** ✅ Succès (pas d'erreur 400)

---

## ❌ **PROBLÈMES COURANTS**

### **Problème 1 : Port 3000 déjà utilisé**

**Erreur :**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution :**
```powershell
# Trouver quel processus utilise le port 3000
netstat -ano | Select-String ":3000"

# Arrêter le processus (remplacer XXXX par le PID)
Stop-Process -Id XXXX -Force

# Redémarrer le serveur
cd "D:\10. Programmation\Projets\EB-Vision 2.0"
node server.js
```

### **Problème 2 : Variables d'environnement manquantes**

**Erreur :**
```
Error: DB_HOST is not defined
```

**Solution :**
Vérifier que le fichier `.env` existe et contient toutes les variables :
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ebvision
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
JWT_SECRET=votre_secret
```

### **Problème 3 : Modules Node.js manquants**

**Erreur :**
```
Error: Cannot find module 'xxx'
```

**Solution :**
```powershell
cd "D:\10. Programmation\Projets\EB-Vision 2.0"
npm install
node server.js
```

---

## 🚀 **APRÈS LE REDÉMARRAGE**

Une fois le serveur redémarré, **rafraîchir la page** dans le navigateur :
- Appuyer sur `F5` ou `Ctrl + R`
- Ou vider le cache : `Ctrl + Shift + R`

Puis **retester la modification des rôles**.

---

## 📝 **LOGS À SURVEILLER**

Après le redémarrage, surveiller les logs du serveur pour :
- ✅ Connexion à la base de données réussie
- ✅ Routes chargées
- ✅ Aucune erreur au démarrage

**Logs importants :**
```
✅ Serveur démarré sur le port 3000
✅ Connexion à la base de données réussie
✅ Routes chargées
```

---

## 🎯 **TEST FINAL**

**Commande curl pour tester l'API :**
```powershell
# Test de mise à jour avec rôles multiples
$headers = @{
    "Authorization" = "Bearer VOTRE_TOKEN"
    "Content-Type" = "application/json"
}

$body = @{
    login = "testuser"
    roles = @("role-uuid-1", "role-uuid-2")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users/USER_ID" `
    -Method PUT `
    -Headers $headers `
    -Body $body
```

**Résultat attendu :**
```json
{
    "success": true,
    "message": "Utilisateur mis à jour avec succès",
    "data": { ... }
}
```

---

**✅ Une fois le serveur redémarré, l'erreur 400 devrait disparaître !**


