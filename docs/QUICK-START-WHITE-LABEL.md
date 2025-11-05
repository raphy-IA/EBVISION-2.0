# ⚡ Quick Start - White-Label Setup

## 🎯 Déployer en 5 minutes

### Étape 1 : Clone et Installation

```bash
git clone [repo-url] ewm-platform
cd ewm-platform
npm install
```

### Étape 2 : Configuration Base de Données

```bash
# Créer la base de données PostgreSQL
createdb ewm_demo

# Copier et éditer .env
cp env.example .env

# Éditer .env
nano .env
```

### Étape 3 : Choisir le Branding

Dans `.env`, sélectionnez votre configuration :

```bash
# Pour la version DEMO publique
BRAND_CONFIG=demo

# Pour un client spécifique
BRAND_CONFIG=client-example-a
```

### Étape 4 : Démarrer l'Application

```bash
# Mode développement
npm run dev

# Ou mode production
npm start
```

### Étape 5 : Accéder à l'Application

Ouvrez votre navigateur : `http://localhost:3000`

✅ **C'est tout !** L'application est personnalisée selon votre configuration.

---

## 🎨 Personnaliser pour un Nouveau Client

### Option A : Rapide (CLI)

```bash
# Copier le template
cp config/branding/client-template.json config/branding/mon-client.json

# Éditer les valeurs
nano config/branding/mon-client.json

# Créer le dossier assets
mkdir public/assets/brands/mon-client

# Activer
echo "BRAND_CONFIG=mon-client" >> .env

# Redémarrer
npm restart
```

### Option B : Via l'API (Recommandé)

```bash
# Se connecter en tant que SUPER_ADMIN
TOKEN="votre_token_ici"

# Créer la configuration client
curl -X POST http://localhost:3000/api/branding/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "mon-client",
    "config": {
      "app": {
        "name": "MON CLIENT PLATFORM",
        "shortName": "MCP"
      },
      "branding": {
        "colors": {
          "primary": "#1a4d7c",
          "secondary": "#2980b9"
        }
      }
    }
  }'

# Activer le nouveau branding
curl -X POST http://localhost:3000/api/branding/set/mon-client \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📋 Checklist de Configuration Client

- [ ] Créer le fichier JSON dans `config/branding/[client-id].json`
- [ ] Définir le nom et le sigle de l'application
- [ ] Choisir les couleurs (primary, secondary, accent)
- [ ] Créer le dossier `public/assets/brands/[client-id]/`
- [ ] Ajouter les logos (logo.svg, icon.svg, favicon.ico)
- [ ] Configurer les informations de contact
- [ ] Tester en local avec `BRAND_CONFIG=[client-id]`
- [ ] Valider tous les écrans
- [ ] Déployer en production

---

## 🎯 Configurations Prêtes à l'Emploi

### 1. Version DEMO Publique

```bash
BRAND_CONFIG=demo
```
- Nom : **ENTERPRISE WORKFLOW MANAGEMENT**
- Mode : Démo avec bannière
- Couleurs : Neutres et professionnelles

### 2. Version Par Défaut

```bash
BRAND_CONFIG=default
```
- Nom : **ENTERPRISE WORKFLOW MANAGEMENT**
- Mode : Production standard
- Couleurs : Bleu marine classique

### 3. Exemple ACME Corporation

```bash
BRAND_CONFIG=client-example-a
```
- Nom : **ACME BUSINESS SUITE**
- Couleurs : Bleu foncé professionnel

### 4. Exemple TechVision

```bash
BRAND_CONFIG=client-example-b
```
- Nom : **TECHVISION WORKSPACE**
- Couleurs : Violet moderne et innovant

---

## 🚨 Résolution Rapide des Problèmes

### Le branding ne se charge pas ?

```javascript
// Dans la console du navigateur
localStorage.removeItem('brandingConfig');
location.reload();
```

### Les couleurs ne changent pas ?

```bash
# Vider le cache du serveur
curl -X DELETE http://localhost:3000/api/branding/cache \
  -H "Authorization: Bearer $TOKEN"
```

### Erreur de configuration ?

```bash
# Tester la configuration
node -e "console.log(require('./config/branding/[client-id].json'))"
```

---

## 📞 Besoin d'Aide ?

Consultez la [documentation complète](./WHITE-LABEL-GUIDE.md)

---

**Happy Branding! 🎨**



