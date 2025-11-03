# 🚀 Guide d'Initialisation - Super Admin

## 📋 Contexte

Vous avez hébergé une nouvelle instance de l'application avec un nouveau branding et une base de données vide. Ce guide vous permet de créer un compte super administrateur avec toutes les permissions nécessaires.

---

## ✅ Prérequis

1. **Base de données PostgreSQL créée et vide**
2. **Fichier `.env` configuré** avec les bonnes informations :
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=votre_base_de_donnees
   DB_USER=votre_utilisateur
   DB_PASSWORD=votre_mot_de_passe
   
   JWT_SECRET=votre_secret_jwt
   JWT_EXPIRES_IN=24h
   PORT=3000
   NODE_ENV=production
   
   BRAND_CONFIG=votre-branding
   ```

3. **Dépendances Node.js installées** :
   ```bash
   npm install
   ```

---

## 🎯 Méthode Rapide - Script Complet (RECOMMANDÉ)

### Un seul script Node.js fait tout :

```bash
node scripts/init-super-admin-complete.js
```

> ✅ Cette commande fonctionne partout : Windows, Linux, Mac, et directement dans le terminal de votre serveur

### Ce script va automatiquement :
1. ✅ Créer toutes les tables nécessaires (users, roles, permissions, user_roles, role_permissions)
2. ✅ Créer 7 rôles de base (SUPER_ADMIN, ADMIN, DIRECTEUR, MANAGER, etc.)
3. ✅ Créer ~60 permissions (menu + API)
4. ✅ Créer l'utilisateur super admin
5. ✅ Associer toutes les permissions au rôle SUPER_ADMIN
6. ✅ Associer le rôle SUPER_ADMIN à l'utilisateur

### Informations de connexion par défaut :
- **Email** : `admin@system.local`
- **Login** : `admin`
- **Mot de passe** : `Admin@2025!`

> ⚠️ **IMPORTANT** : Changez le mot de passe après la première connexion !

---

## 🔧 Méthode Alternative - Scripts Séparés

Si vous préférez contrôler chaque étape :

### 1. Créer le système de rôles
```bash
node scripts/setup-roles-system.js
```

### 2. Créer l'utilisateur admin
```bash
node scripts/create-admin-user.js
```

### 3. Créer les permissions de menu
```bash
node scripts/create-menu-permissions.js
```

### 4. Créer les permissions API
```bash
node scripts/create-api-permissions.js
```

### 5. Vérifier que tout est OK
```bash
node scripts/verify-super-admin-production.js
```

---

## 🧪 Test de Connexion

### 1. Démarrer l'application :
```bash
npm start
```

### 2. Se connecter :
- Ouvrez votre navigateur à `http://localhost:3000` (ou votre domaine)
- Utilisez les identifiants par défaut

### 3. Vérifier les permissions :
- Vous devriez voir **TOUS** les menus
- Vous devriez pouvoir accéder à **TOUTES** les pages

---

## 🔍 Dépannage

### Erreur de connexion à la base de données
```bash
# Vérifier les variables d'environnement
node scripts/check-env-loading.js

# Tester la connexion à la BD
node scripts/test-database.js
```

### Récupérer les credentials du super admin
```bash
node scripts/get-super-admin-credentials.js
```

### Vérifier les permissions
```bash
node scripts/check-admin-permissions.js
```

### Erreur "Table already exists"
C'est normal si vous réexécutez le script. Il crée les tables seulement si elles n'existent pas (CREATE TABLE IF NOT EXISTS).

### L'utilisateur existe déjà
Le script détecte automatiquement si un utilisateur admin existe et le réutilise au lieu d'en créer un nouveau.

---

## 📝 Personnalisation

### Modifier les informations de l'admin

Éditez le fichier `scripts/init-super-admin-complete.js` ligne 219 :

```javascript
const adminUser = {
    nom: 'Administrateur',      // ← Changez ici
    prenom: 'Système',          // ← Changez ici
    login: 'admin',             // ← Changez ici
    email: 'admin@system.local',// ← Changez ici
    password: 'Admin@2025!',    // ← Changez ici
    role: 'SUPER_ADMIN'
};
```

Puis réexécutez le script.

---

## 🔒 Sécurité

### Après la première connexion :

1. **Changez immédiatement le mot de passe** :
   - Allez dans votre profil
   - Cliquez sur "Changer le mot de passe"
   - Utilisez un mot de passe fort

2. **Créez d'autres utilisateurs** avec des rôles appropriés

3. **Ne partagez jamais** le compte SUPER_ADMIN

4. **Activez la 2FA** si disponible dans l'application

---

## 📚 Rôles Créés

| Rôle | Description | Permissions |
|------|-------------|-------------|
| **SUPER_ADMIN** | Administrateur système | ✅ TOUTES |
| **ADMIN** | Administrateur général | 🔧 À configurer |
| **DIRECTEUR** | Directeur - Accès stratégique | 🔧 À configurer |
| **MANAGER** | Manager - Gestion d'équipe | 🔧 À configurer |
| **CONSULTANT** | Consultant | 🔧 À configurer |
| **COLLABORATEUR** | Collaborateur standard | 🔧 À configurer |
| **ASSOCIE** | Associé | 🔧 À configurer |

> **Note** : Seul le rôle SUPER_ADMIN a automatiquement toutes les permissions. Les autres rôles doivent être configurés via l'interface de gestion des permissions.

---

## ✅ Checklist de Vérification

Après l'exécution du script, vérifiez :

- [ ] Le script s'est exécuté sans erreur
- [ ] Vous pouvez vous connecter avec les credentials fournis
- [ ] Vous voyez tous les menus dans la sidebar
- [ ] Vous pouvez accéder à la page "Gestion des permissions"
- [ ] Vous pouvez créer d'autres utilisateurs
- [ ] Le branding est correctement appliqué

---

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs du script
2. Consultez les scripts de diagnostic dans `scripts/`
3. Vérifiez que toutes les dépendances sont installées
4. Assurez-vous que PostgreSQL est bien démarré

---

## 📌 Fichiers Importants

- `scripts/init-super-admin-complete.js` - Script d'initialisation complet ⭐
- `scripts/create-admin-user.js` - Créer uniquement l'utilisateur
- `scripts/setup-roles-system.js` - Configurer uniquement les rôles
- `scripts/create-menu-permissions.js` - Créer uniquement les permissions de menu
- `scripts/create-api-permissions.js` - Créer uniquement les permissions API
- `scripts/verify-super-admin-production.js` - Vérifier la configuration

---

**🎉 Bonne utilisation de votre application !**

