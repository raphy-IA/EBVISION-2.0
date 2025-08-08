# Guide - Page de Profil Moderne

## 🎯 **Nouvelle page de profil avec design amélioré**

Une nouvelle page de profil moderne a été créée (`public/profile.html`) qui affiche toutes les informations utiles récupérées via le SessionManager, y compris les nouvelles informations de division.

## 🎨 **Caractéristiques du design**

### **Design Moderne**
- **Interface responsive** : S'adapte à tous les écrans (desktop, tablette, mobile)
- **Design gradient** : Arrière-plan avec dégradé moderne
- **Cartes avec ombres** : Interface en cartes avec effets d'ombre
- **Badges colorés** : Rôles affichés avec des badges colorés selon le type
- **Animations** : Effets de survol et transitions fluides

### **Sections d'information**

#### **1. En-tête du profil**
- **Avatar** : Icône utilisateur stylisée
- **Nom complet** : Affichage du nom et prénom
- **Rôle** : Rôle de l'utilisateur avec badge coloré
- **Statut** : Statut actif/inactif avec indicateur visuel

#### **2. Informations personnelles**
- **Nom** : Nom de famille
- **Prénom** : Prénom de l'utilisateur
- **Email** : Adresse email de contact
- **Login** : Identifiant de connexion

#### **3. Informations du compte**
- **Rôle** : Niveau d'accès avec badge coloré
- **Statut** : État du compte (ACTIF/INACTIF)
- **ID Utilisateur** : Identifiant unique du compte
- **Dernière connexion** : Date de la dernière activité

#### **4. Informations collaborateur** (si applicable)
- **ID Collaborateur** : Identifiant du profil collaborateur
- **Nom Collaborateur** : Nom complet du collaborateur

#### **5. Business Unit** (si applicable)
- **Nom de la BU** : Nom de l'unité d'affaires
- **ID de la BU** : Identifiant de la business unit
- **Design spécial** : Carte avec dégradé bleu/violet

#### **6. Division** (si applicable)
- **Nom de la division** : Nom de la division
- **ID de la division** : Identifiant de la division
- **Design spécial** : Carte avec dégradé rose/rouge

## 🔧 **Fonctionnalités techniques**

### **Intégration SessionManager**
```javascript
// Initialisation automatique du SessionManager
await window.sessionManager.initialize();

// Récupération des données
const user = window.sessionManager.getUser();
const collaborateur = window.sessionManager.getCollaborateur();
const businessUnit = window.sessionManager.getBusinessUnit();
const division = window.sessionManager.getDivision();
```

### **Gestion des états**
- **État de chargement** : Spinner pendant le chargement
- **État d'erreur** : Message d'erreur en cas de problème
- **États conditionnels** : Affichage conditionnel selon les données disponibles

### **Badges de rôles**
```javascript
const roleMap = {
    'ADMIN': 'badge-admin',      // Rouge
    'MANAGER': 'badge-manager',  // Orange
    'USER': 'badge-user',        // Bleu
    'ASSISTANT': 'badge-assistant', // Violet
    'SENIOR': 'badge-senior',    // Vert
    'DIRECTOR': 'badge-director', // Gris foncé
    'PARTNER': 'badge-partner'   // Orange foncé
};
```

## 📱 **Responsive Design**

### **Desktop (>1200px)**
- **Layout** : 3 colonnes pour les informations
- **Avatar** : 120px de diamètre
- **Espacement** : Padding de 2rem

### **Tablette (768px - 1200px)**
- **Layout** : 2 colonnes pour les informations
- **Avatar** : 100px de diamètre
- **Espacement** : Padding de 1.5rem

### **Mobile (<768px)**
- **Layout** : 1 colonne pour les informations
- **Avatar** : 80px de diamètre
- **Espacement** : Padding de 1rem
- **Boutons** : Disposition verticale

## 🎯 **Cas d'usage**

### **1. Utilisateur administrateur**
```javascript
// Affichage
- Nom complet : "Système Administrateur"
- Rôle : Badge rouge "ADMIN"
- Statut : "ACTIF" (vert)
- Sections affichées : Informations personnelles, Compte
- Sections masquées : Collaborateur, BU, Division
```

### **2. Collaborateur avec BU et Division**
```javascript
// Affichage
- Nom complet : "Jean Dupont"
- Rôle : Badge bleu "USER"
- Statut : "ACTIF" (vert)
- Sections affichées : Toutes les sections
- Business Unit : "Direction Générale" (carte bleue)
- Division : "Comptabilité" (carte rose)
```

### **3. Collaborateur sans Division**
```javascript
// Affichage
- Nom complet : "Pierre Martin"
- Rôle : Badge bleu "USER"
- Statut : "ACTIF" (vert)
- Sections affichées : Informations personnelles, Compte, Collaborateur, BU
- Sections masquées : Division
- Business Unit : "Direction Générale" (carte bleue)
```

## 🔗 **Intégration avec les modales existantes**

### **Boutons d'action**
- **Modifier le profil** : Ouvre la modale d'édition existante
- **Changer le mot de passe** : Ouvre la modale de changement de mot de passe
- **Retour au tableau de bord** : Navigation vers dashboard.html

### **Réutilisation du code**
```javascript
// Réutilisation des modales existantes
function openEditModal() {
    if (!window.userModalsManager) {
        window.userModalsManager = new UserModalsManager();
    }
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    modal.show();
}
```

## 🚀 **Avantages**

### **Pour l'utilisateur**
- **Interface moderne** : Design attrayant et professionnel
- **Informations complètes** : Toutes les données importantes affichées
- **Navigation intuitive** : Boutons d'action clairs
- **Responsive** : Fonctionne sur tous les appareils

### **Pour les développeurs**
- **Code modulaire** : Classe ProfileManager réutilisable
- **Intégration SessionManager** : Utilise le système centralisé
- **Gestion d'erreurs** : États de chargement et d'erreur
- **Maintenabilité** : Code propre et bien structuré

## 📊 **Données affichées**

### **Informations utilisateur**
- ✅ Nom et prénom
- ✅ Email et login
- ✅ Rôle avec badge coloré
- ✅ Statut du compte
- ✅ ID utilisateur
- ✅ Dernière connexion

### **Informations collaborateur** (si applicable)
- ✅ ID collaborateur
- ✅ Nom complet du collaborateur

### **Informations Business Unit** (si applicable)
- ✅ Nom de la BU
- ✅ ID de la BU
- ✅ Design spécial avec dégradé

### **Informations Division** (si applicable)
- ✅ Nom de la division
- ✅ ID de la division
- ✅ Design spécial avec dégradé

## 🎨 **Palette de couleurs**

```css
:root {
    --primary-color: #2c3e50;      // Bleu foncé
    --secondary-color: #3498db;     // Bleu
    --success-color: #27ae60;       // Vert
    --warning-color: #f39c12;       // Orange
    --danger-color: #e74c3c;        // Rouge
    --light-bg: #f8f9fa;           // Gris clair
}
```

## 🔧 **Installation et utilisation**

### **1. Accès à la page**
```
URL : http://localhost:3000/profile.html
```

### **2. Prérequis**
- SessionManager initialisé
- Utilisateur connecté
- Modales utilisateur disponibles

### **3. Navigation**
- Depuis le dashboard : Lien "Mon Profil"
- URL directe : `/profile.html`
- Bouton retour : Retour au tableau de bord

## ✅ **Validation**

La page de profil moderne a été testée et validée sur :
- ✅ **Desktop** : Affichage optimal sur grands écrans
- ✅ **Tablette** : Adaptation responsive
- ✅ **Mobile** : Interface mobile-friendly
- ✅ **SessionManager** : Intégration complète
- ✅ **Modales** : Réutilisation des modales existantes
- ✅ **Gestion d'erreurs** : États d'erreur et de chargement
- ✅ **Données complètes** : Affichage de toutes les informations

## 🎉 **Conclusion**

La nouvelle page de profil moderne offre :
- **Une interface utilisateur exceptionnelle** avec design moderne
- **Une expérience utilisateur optimale** avec navigation intuitive
- **Une intégration parfaite** avec le SessionManager
- **Une réutilisation efficace** du code existant
- **Une base solide** pour les évolutions futures

La page est **prête à l'emploi** et améliore significativement l'expérience utilisateur ! 🎯
