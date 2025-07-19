# 🚀 Guide de déploiement TRS Dashboard sur N0C

## 📁 Fichiers inclus dans ce package

### Fichiers principaux :
- `index.html` - Page de connexion
- `dashboard.html` - Dashboard principal
- `auth.js` - Script d'authentification
- `403.html` - Page d'erreur d'accès refusé
- `.htaccess` - Configuration de sécurité Apache

### Données :
- `données_TRS.csv` - Données principales TRS
- `liste des missions.csv` - Missions
- `liste des factures.csv` - Factures
- `liste des opportunités.csv` - Opportunités
- `Taux horaire par grade.csv` - Taux horaires
- `initiales.csv` - Mapping initiales/noms
- `données_TRS_Excel.xlsx` - Version Excel des données

## 🔐 Identifiants de connexion

- **Identifiant** : `EB`
- **Mot de passe** : `EB@Partners`

## 📋 Étapes de déploiement sur N0C

### 1. **Accéder à ton panneau N0C**
- Connecte-toi à ton compte N0C
- Va dans la section "Gestion des fichiers" ou "File Manager"

### 2. **Créer un dossier pour l'application**
- Crée un nouveau dossier (ex: `trs-dashboard`)
- Ou utilise le dossier `public_html` si c'est ton domaine principal

### 3. **Uploader les fichiers**
- Upload tous les fichiers de ce package dans le dossier créé
- **Important** : Garde la structure exacte des fichiers

### 4. **Vérifier les permissions**
- Assure-toi que les fichiers ont les permissions 644
- Les dossiers doivent avoir les permissions 755

### 5. **Tester l'application**
- Accède à ton domaine : `https://ton-domaine.com/trs-dashboard/`
- Tu devrais voir la page de connexion
- Connecte-toi avec les identifiants

## 🔧 Configuration spécifique N0C

### Si tu utilises un sous-dossier :
- L'application sera accessible via : `ton-domaine.com/trs-dashboard/`
- Assure-toi que tous les chemins relatifs fonctionnent

### Si tu utilises le domaine principal :
- L'application sera accessible via : `ton-domaine.com/`
- Place les fichiers dans `public_html/`

## 🛡️ Sécurité

L'application est déjà sécurisée avec :
- Authentification obligatoire
- Protection des fichiers CSV/Excel
- Headers de sécurité HTTP
- Protection contre les injections XSS

## 🚨 Points importants

1. **Vérifie que ton hébergement supporte .htaccess**
2. **Assure-toi que les fichiers CSV sont bien uploadés**
3. **Teste la connexion avec les identifiants**
4. **Vérifie que les graphiques se chargent correctement**

## 📞 Support

Si tu rencontres des problèmes :
1. Vérifie les logs d'erreur de ton hébergement
2. Teste l'accès aux fichiers CSV directement
3. Vérifie que JavaScript est activé dans ton navigateur

## 🔄 Mise à jour

Pour mettre à jour l'application :
1. Upload les nouveaux fichiers en remplaçant les anciens
2. Vérifie que les données CSV sont à jour
3. Teste la fonctionnalité de mise à jour dans l'application 