# ⚡ Démarrage Rapide - Initialisation Base de Données

## 🚀 Méthode Recommandée : Script Automatique (1 commande)

```bash
node scripts/database/0-init-complete.js
```

**✅ Ce script fait TOUT automatiquement :**
- Structure + Rôles + Super Admin
- 321 Permissions
- Assignation au SUPER_ADMIN

**⏱️ Durée : ~20-30 secondes**

---

## 📋 Méthode Manuelle : 3 Commandes

Si vous préférez le contrôle manuel :

```bash
# 1️⃣ Structure + Rôles + Super Admin
node "scripts/database/0- init-from-schema.js"

# 2️⃣ Créer les permissions
node "scripts/database/sync-all-permissions-complete.js"

# 3️⃣ Assigner au SUPER_ADMIN
node "scripts/database/3-assign-all-permissions.js"
```

---

## 🔑 Identifiants

```
Email       : admin@ebvision.com
Mot de passe: Admin@2025
```

---

## 🎯 Résultat Final

✅ 81 tables  
✅ 11 rôles  
✅ 321 permissions  
✅ 1 super admin avec accès complet

---

## 📚 Documentation Complète

Pour plus de détails, consultez : `README-INITIALISATION-COMPLETE.md`

