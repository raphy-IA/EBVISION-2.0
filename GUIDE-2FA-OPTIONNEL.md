# 🔐 Guide 2FA Optionnel - EB-Vision 2.0

## 📋 Vue d'ensemble

L'authentification à deux facteurs (2FA) est **disponible mais non obligatoire** dans EB-Vision 2.0. Chaque utilisateur peut choisir d'activer ou non cette fonctionnalité de sécurité.

---

## 🎯 **Politique 2FA Actuelle**

### ✅ **Configuration par Défaut**
- **2FA** : Disponible mais **optionnel**
- **Connexion** : Fonctionne normalement sans 2FA
- **Sécurité** : Niveau élevé même sans 2FA (politique de mots de passe forte)
- **Flexibilité** : Chaque utilisateur décide individuellement

### 🔧 **Comment ça Fonctionne**

1. **Connexion normale** : Les utilisateurs se connectent avec email/mot de passe
2. **2FA disponible** : Option dans les paramètres de sécurité
3. **Activation volontaire** : L'utilisateur configure son 2FA s'il le souhaite
4. **Connexion avec 2FA** : Si activé, code 2FA requis à chaque connexion

---

## 👥 **Pour les Utilisateurs**

### **Activation du 2FA (Optionnel)**

1. **Se connecter** à l'application
2. **Aller dans** "Paramètres" → "Sécurité"
3. **Cliquer sur** "Activer l'authentification à deux facteurs"
4. **Scanner le QR code** avec Google Authenticator ou une app similaire
5. **Entrer le code** de vérification
6. **Sauvegarder** les codes de récupération

### **Utilisation du 2FA**

- **Connexion normale** : Email + mot de passe
- **Si 2FA activé** : Email + mot de passe + code 2FA
- **Codes de récupération** : Utilisables si l'app 2FA est perdue

### **Désactivation du 2FA**

1. **Aller dans** "Paramètres" → "Sécurité"
2. **Cliquer sur** "Désactiver l'authentification à deux facteurs"
3. **Entrer le code 2FA** pour confirmer
4. **Confirmer** la désactivation

---

## 🔧 **Pour les Administrateurs**

### **Vérifier le Statut 2FA**

```bash
# Voir qui utilise le 2FA
node scripts/configure-2fa-policy.js status
```

### **Encourager l'Adoption (Optionnel)**

```bash
# Rendre le 2FA plus visible (ne force pas l'activation)
node scripts/configure-2fa-policy.js enable
```

### **Désactiver pour Tous (Urgence)**

```bash
# Désactiver le 2FA pour tous les utilisateurs
node scripts/configure-2fa-policy.js disable
```

---

## 📊 **Statistiques et Monitoring**

### **Tableau de Bord 2FA**

Le système enregistre automatiquement :
- Qui a activé le 2FA
- Quand le 2FA a été activé/désactivé
- Tentatives de connexion avec/sans 2FA
- Utilisation des codes de récupération

### **Rapports Disponibles**

```sql
-- Utilisateurs avec 2FA activé
SELECT nom, prenom, email, two_factor_enabled 
FROM users 
WHERE active = true 
ORDER BY two_factor_enabled DESC;

-- Statistiques d'utilisation 2FA
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN two_factor_enabled = true THEN 1 END) as users_with_2fa,
    ROUND(COUNT(CASE WHEN two_factor_enabled = true THEN 1 END) * 100.0 / COUNT(*), 2) as percentage_2fa
FROM users 
WHERE active = true;
```

---

## 🛡️ **Sécurité Sans 2FA**

Même sans 2FA, l'application reste très sécurisée grâce à :

### **Politique de Mots de Passe Forte**
- Minimum 12 caractères
- Majuscules, minuscules, chiffres, caractères spéciaux
- Interdiction des mots courants
- Vérification contre les mots de passe compromis

### **Rate Limiting**
- Limitation des tentatives de connexion
- Blocage automatique des IPs suspectes
- Détection des attaques par force brute

### **Monitoring de Sécurité**
- Logs de toutes les tentatives de connexion
- Alertes en cas d'activité suspecte
- Audit des actions sensibles

### **Cookies Sécurisés**
- HttpOnly pour éviter les attaques XSS
- Secure en production (HTTPS)
- Expiration automatique

---

## 📈 **Évolution Future**

### **Phase 1 (Actuelle)**
- ✅ 2FA optionnel
- ✅ Politique de mots de passe forte
- ✅ Monitoring de sécurité

### **Phase 2 (Optionnelle)**
- 🔄 2FA obligatoire pour les administrateurs
- 🔄 2FA obligatoire pour les utilisateurs avec accès sensible
- 🔄 Notifications d'expiration de mots de passe

### **Phase 3 (Optionnelle)**
- 🔄 2FA obligatoire pour tous
- 🔄 Intégration SSO
- 🔄 Certificats de sécurité

---

## 🎯 **Recommandations**

### **Pour les Utilisateurs**
1. **Activer le 2FA** si vous gérez des données sensibles
2. **Utiliser un gestionnaire de mots de passe** pour des mots de passe forts
3. **Sauvegarder les codes de récupération** en lieu sûr
4. **Changer régulièrement** votre mot de passe

### **Pour les Administrateurs**
1. **Surveiller l'adoption** du 2FA
2. **Former les utilisateurs** à l'utilisation du 2FA
3. **Considérer l'obligation** pour les rôles sensibles
4. **Maintenir les politiques** de sécurité

---

## 🔍 **Dépannage**

### **Problème : 2FA ne s'active pas**
```bash
# Vérifier la configuration
node scripts/configure-2fa-policy.js status

# Vérifier les dépendances
npm list speakeasy qrcode
```

### **Problème : Codes 2FA invalides**
- Vérifier que l'heure du serveur est correcte
- Vérifier que l'app d'authentification est synchronisée
- Utiliser les codes de récupération si nécessaire

### **Problème : Utilisateur bloqué**
```bash
# Désactiver le 2FA pour un utilisateur spécifique
psql -d eb_vision -c "UPDATE users SET two_factor_enabled = false WHERE email = 'user@example.com';"
```

---

## ✅ **Checklist de Configuration**

### **Installation**
- [ ] Dépendances installées (speakeasy, qrcode)
- [ ] Migrations appliquées
- [ ] Tables 2FA créées

### **Configuration**
- [ ] 2FA disponible dans l'interface
- [ ] Codes de récupération fonctionnels
- [ ] Monitoring activé

### **Tests**
- [ ] Activation 2FA fonctionne
- [ ] Connexion avec 2FA fonctionne
- [ ] Désactivation 2FA fonctionne
- [ ] Codes de récupération fonctionnent

---

*Guide créé pour la configuration 2FA optionnelle - Version 1.0*
