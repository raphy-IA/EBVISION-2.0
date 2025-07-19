# 🚀 Guide d'Utilisation Rapide - TRS Dashboard

## 📋 Démarrage Rapide

### 1. Démarrer l'Application
```bash
# Option 1: Démarrage simple
npm run dev

# Option 2: Démarrage avec ouverture automatique du navigateur
npm run launch
```

### 2. Accéder à l'Application
- **URL principale** : http://localhost:3000
- **Dashboard** : http://localhost:3000/dashboard.html
- **API Health** : http://localhost:3000/api/health

## 🎯 Fonctionnalités Disponibles

### 📊 Dashboard Principal
- **Statistiques en temps réel**
- **Graphiques interactifs**
- **Tableau de bord complet**

### 🧭 Navigation
- **Menu latéral** : Accès aux différentes sections
- **Navigation responsive** : Adapté mobile/desktop
- **Breadcrumbs** : Indication de la position

### 📈 Graphiques et Statistiques
- **Graphiques Chart.js** : Visualisations interactives
- **Cartes de statistiques** : Données clés
- **Mise à jour automatique** : Données en temps réel

### 🔧 Modales et Interactions
- **Nouvelle saisie** : Formulaire d'ajout
- **Modification** : Édition des données
- **Suppression** : Gestion des entrées

## 🔌 API Endpoints Disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/health` | GET | État du serveur |
| `/api/time-entries` | GET | Saisies de temps |
| `/api/grades` | GET | Grades et tarifs |
| `/api/collaborateurs` | GET | Liste des collaborateurs |
| `/api/missions` | GET | Missions disponibles |
| `/api/clients` | GET | Clients |
| `/api/divisions` | GET | Divisions |

## 🎮 Opérations Disponibles

### 1. Consultation des Données
- ✅ **Visualiser les statistiques**
- ✅ **Consulter les graphiques**
- ✅ **Parcourir les tableaux**
- ✅ **Filtrer les données**

### 2. Gestion des Saisies
- ✅ **Ajouter une nouvelle saisie**
- ✅ **Modifier une saisie existante**
- ✅ **Supprimer une saisie**
- ✅ **Valider les saisies**

### 3. Administration
- ✅ **Gérer les collaborateurs**
- ✅ **Gérer les missions**
- ✅ **Gérer les clients**
- ✅ **Gérer les divisions**

## 📱 Responsivité

### 🖥️ Desktop (1920x1080)
- Sidebar visible
- Layout complet
- Toutes les fonctionnalités

### 📱 Tablet (768x1024)
- Navigation adaptée
- Contenu optimisé
- Interactions tactiles

### 📱 Mobile (375x667)
- Menu hamburger
- Contenu adapté
- Navigation simplifiée

## ⚡ Raccourcis Utiles

| Raccourci | Action |
|-----------|--------|
| `F5` | Recharger la page |
| `F12` | Outils de développement |
| `Ctrl+F` | Recherche |
| `Ctrl+R` | Recharger |
| `Ctrl+Shift+R` | Recharger sans cache |

## 🔧 Dépannage

### Problème : Port 3000 occupé
```bash
# Vérifier les processus
netstat -ano | findstr :3000

# Tuer le processus
taskkill /PID <PID> /F
```

### Problème : Serveur ne démarre pas
```bash
# Vérifier les dépendances
npm install

# Redémarrer
npm run dev
```

### Problème : Base de données
```bash
# Vérifier PostgreSQL
# Vérifier les variables d'environnement
# Vérifier la connexion
```

## 📊 Tests Disponibles

### Tests Rapides
```bash
# Test simple
npm run test:ui:simple

# Test manuel (navigateur visible)
npm run test:ui:manual
```

### Tests Complets
```bash
# Tests automatisés
npm run test:ui:auto

# Tests visuels
npm run test:ui:visual
```

## 🎯 Prochaines Étapes

1. **Explorer le dashboard**
2. **Tester les graphiques**
3. **Ajouter des données**
4. **Valider les fonctionnalités**
5. **Personnaliser l'interface**

## 📞 Support

En cas de problème :
1. Vérifier les logs du serveur
2. Consulter la documentation API
3. Lancer les tests de diagnostic
4. Vérifier la base de données

---

**🎯 Objectif :** Utiliser efficacement l'application TRS pour la gestion des temps de travail. 