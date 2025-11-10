# Guide Rapide - Types de Collaborateurs

## 🚀 Démarrage Rapide

### 1. Peupler la base avec des types standards

Si la table `types_collaborateurs` est vide ou que vous souhaitez ajouter des types standards :

```bash
node scripts/database/seed-types-collaborateurs.js
```

Ce script ajoute 4 types de collaborateurs standards :
- **ADM** - Administratif
- **TEC** - Technique  
- **CONS** - Consultant
- **SUP** - Support

### 2. Tester les fonctionnalités

Pour tester l'API et les fonctionnalités CRUD :

```bash
node scripts/testing/test-types-collaborateurs.js
```

Ce script teste :
- ✅ Authentification
- ✅ Récupération de tous les types
- ✅ Récupération des statistiques
- ✅ Création d'un nouveau type
- ✅ Récupération par ID
- ✅ Modification
- ✅ Suppression

### 3. Accéder à la page

1. Démarrer l'application : `npm start`
2. Se connecter à l'application
3. Aller dans **GESTION RH** → **Types de Collaborateurs**

## 📱 Utilisation de la page

### Interface principale

```
┌─────────────────────────────────────────────────────────┐
│  Types de Collaborateurs              [+ Nouveau Type]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │ 10   │  │  8   │  │  2   │  │ 45   │              │
│  │Total │  │Actifs│  │Inact.│  │Collab│              │
│  └──────┘  └──────┘  └──────┘  └──────┘              │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │ 🔍 Recherche...       │ Statut: Tous │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Code │ Nom       │ Description │ Statut │ Actions│   │
│  ├──────┼───────────┼─────────────┼────────┼────────┤   │
│  │ AUD  │ Auditeur  │ Audit...    │ ACTIF  │ ✏️ 🗑️  │   │
│  │ CONS │Consultant │ Conseil...  │ ACTIF  │ ✏️ 🗑️  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Actions disponibles

#### ➕ Créer un type
1. Cliquer sur **[+ Nouveau Type]**
2. Remplir :
   - **Code** : 2-20 caractères (ex: AUD)
   - **Nom** : Nom descriptif
   - **Description** : Optionnelle
   - **Statut** : ACTIF / INACTIF
3. Cliquer sur **Enregistrer**

#### ✏️ Modifier un type
1. Cliquer sur l'icône **✏️** dans la ligne du type
2. Modifier les champs
3. Cliquer sur **Mettre à jour**

#### 🗑️ Supprimer un type
1. Cliquer sur l'icône **🗑️** dans la ligne du type
2. Confirmer la suppression

⚠️ **Attention** : Impossible de supprimer un type utilisé par des collaborateurs

#### 🔍 Rechercher
- Taper dans le champ de recherche
- La recherche se fait sur : code, nom, description
- Résultats en temps réel

#### 📊 Filtrer
- Sélectionner un statut : **Tous / ACTIF / INACTIF**
- Combiner avec la recherche

## 🔒 Permissions

### Configuration des permissions

1. Aller dans **PARAMÈTRES ADMINISTRATION** → **Gestion des Permissions**
2. Sélectionner un rôle
3. Dans la section **GESTION RH**, cocher **Types de Collaborateurs**
4. Sauvegarder

### Rôles recommandés

| Rôle | Accès recommandé |
|------|------------------|
| SUPER_ADMIN | ✅ Total |
| RH | ✅ Total |
| MANAGER | ✅ Lecture seule |
| COLLABORATEUR | ❌ Aucun |
| INVITE | ❌ Aucun |

## 🔧 Intégrations

### Utilisation dans Collaborateurs

Lors de la création d'un collaborateur dans `collaborateurs.html` :

```javascript
// Le type de collaborateur est sélectionné
// et stocké dans collaborateurs.type_collaborateur_id
```

### Utilisation dans Postes

Les postes peuvent être associés à un type :

```javascript
// postes.type_collaborateur_id → types_collaborateurs.id
```

## 📊 Statistiques

La page affiche 4 indicateurs :

1. **Total Types** : Nombre total de types dans la base
2. **Types Actifs** : Types avec `statut = 'ACTIF'`
3. **Types Inactifs** : Types avec `statut = 'INACTIF'`
4. **Collaborateurs** : Nombre total de collaborateurs liés

## 🛠️ Dépannage

### Le nouveau menu n'apparaît pas

**Solution 1** : Vider le cache
```javascript
// Dans la console du navigateur
window.invalidateSidebarCache();
window.reloadSidebar();
```

**Solution 2** : Recharger la page
```
Ctrl+F5 (Windows)
Cmd+Shift+R (Mac)
```

**Solution 3** : Vider le cache du navigateur
- Chrome : `Ctrl+Shift+Del`
- Firefox : `Ctrl+Shift+Del`

### Erreur 403 - Accès refusé

Vérifier les permissions :
1. Votre rôle doit avoir la permission `menu.gestion_rh.types_collaborateurs`
2. Contacter un administrateur pour l'attribution

### Erreur lors de la suppression

**Cause** : Le type est utilisé par des collaborateurs

**Solution** : 
- Mettre le type en statut `INACTIF` au lieu de le supprimer
- Ou réassigner les collaborateurs à un autre type avant la suppression

### Les statistiques ne se mettent pas à jour

**Solution** : Recharger la page
- Les statistiques sont recalculées à chaque chargement

## 📚 Exemples de codes standards

### Par secteur d'activité

```
AUD    - Auditeur
CONS   - Consultant
EXPT   - Expert
INGR   - Ingénieur
TECH   - Technicien
```

### Par fonction

```
MGMT   - Management
ADMIN  - Administratif
COM    - Commercial
FIN    - Finance
RH     - Ressources Humaines
JUR    - Juridique
```

### Par niveau

```
JUN    - Junior
SNR    - Senior
LEAD   - Lead
DIR    - Directeur
```

## 🎯 Bonnes pratiques

### ✅ À faire

- Utiliser des codes courts (2-5 caractères)
- Utiliser des codes significatifs
- Mettre en majuscules les codes
- Ajouter une description claire
- Désactiver au lieu de supprimer

### ❌ À éviter

- Codes trop longs (> 10 caractères)
- Codes ambigus (TYPE1, TYPE2)
- Supprimer des types utilisés
- Créer des doublons
- Laisser la description vide

## 🔄 Workflow recommandé

### Création d'un nouveau type

```
1. Analyser le besoin
   └─> Quel rôle ? Quelles compétences ?

2. Choisir un code unique
   └─> Court et significatif

3. Rédiger une description
   └─> Claire et précise

4. Créer le type
   └─> Via la page web

5. Informer l'équipe RH
   └─> Email ou notification

6. Former si nécessaire
   └─> Sur les spécificités du type
```

### Désactivation d'un type

```
1. Identifier les collaborateurs concernés
   └─> Requête SQL ou export

2. Réassigner si nécessaire
   └─> À un type actif

3. Mettre le type en INACTIF
   └─> Via modification

4. Documenter la raison
   └─> Dans les notes internes

5. Archiver les informations
   └─> Pour historique
```

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@eb-partnersgroup.cm
- 💬 Slack : #eb-vision-support
- 📚 Documentation : `/docs/`

---

**Version** : 1.0  
**Dernière mise à jour** : 9 novembre 2025  
**Auteur** : Équipe EB Vision 2.0

