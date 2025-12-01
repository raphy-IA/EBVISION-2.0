# 🔧 CORRECTION : Gestion des Logins Utilisateurs

## 📋 Problème Identifié

Les utilisateurs créés par le script de démonstration `5-generate-demo-data.js` n'avaient pas de login, ce qui causait l'affichage de "🔗 Lié à collaborateur" à la place du login dans la page `users.html`.

### Causes Racines

1. **Script de génération incomplète** : Le script `5-generate-demo-data.js` ne créait pas le champ `login` lors de l'insertion des utilisateurs
2. **Champ optionnel en base** : Le champ `login` n'avait pas de contrainte `NOT NULL` en base de données
3. **Requête SQL incomplète** : La méthode `User.findById()` ne sélectionnait pas le champ `login`
4. **Pas de gestion d'unicité** : Le modèle `User.create()` ne vérifiait pas l'unicité du login généré

## ✅ Corrections Appliquées

### 1. Script de Génération de Données (`5-generate-demo-data.js`)

**Modification** : Ajout de la génération automatique du login basé sur les initiales (première lettre du prénom + première lettre du nom) avec vérification d'unicité.

```javascript
// Générer le login basé sur le prénom et le nom (première lettre de chaque)
const baseLogin = (collab.prenom.substring(0, 1) + collab.nom.substring(0, 1)).toLowerCase();

// Vérifier si le login existe déjà et ajouter un numéro si nécessaire
let login = baseLogin;
let loginExists = true;
let counter = 1;

while (loginExists) {
    const checkLoginResult = await pool.query(
        'SELECT id FROM users WHERE login = $1', 
        [login]
    );
    
    if (checkLoginResult.rows.length === 0) {
        loginExists = false;
    } else {
        login = baseLogin + counter;
        counter++;
    }
}
```

### 2. Modèle User (`src/models/User.js`)

**Modifications** :

#### a. Ajout du champ `login` dans `findById()`
```sql
SELECT u.id, u.nom, u.prenom, u.email, u.login, u.role, ...
```

#### b. Gestion de l'unicité dans `create()`
Le modèle vérifie maintenant automatiquement l'unicité du login généré et ajoute un numéro incrémental si nécessaire.

### 3. Schémas de Base de Données

**Modification** : Ajout de la contrainte `NOT NULL` sur le champ `login`

Fichiers modifiés :
- `scripts/database/schema-complete.sql`
- `scripts/database/schema-structure-only.sql`

```sql
login character varying(50) NOT NULL,
```

### 4. Scripts de Correction

#### a. Script de correction des logins manquants (`fix-missing-logins.js`)

Script utilitaire pour corriger les utilisateurs existants qui n'ont pas de login.

**Usage** :
```bash
node scripts/database/fix-missing-logins.js
```

**Fonctionnalités** :
- Identifie tous les utilisateurs sans login
- Génère un login basé sur les initiales
- Vérifie l'unicité et ajoute un numéro si nécessaire
- Met à jour les utilisateurs en base de données

#### b. Script de migration SQL (`migration-add-login-not-null.sql`)

Migration SQL pour ajouter la contrainte `NOT NULL` sur le champ `login`.

**Usage** :
```bash
psql -d ebvision2 -f scripts/database/migration-add-login-not-null.sql
```

**Prérequis** : Tous les utilisateurs doivent avoir un login avant d'exécuter cette migration.

## 📝 Procédure d'Application

### Pour une Base de Données Existante

1. **Étape 1** : Corriger les logins manquants
   ```bash
   node scripts/database/fix-missing-logins.js
   ```

2. **Étape 2** : Appliquer la migration SQL
   ```bash
   psql -d ebvision2 -f scripts/database/migration-add-login-not-null.sql
   ```

3. **Étape 3** : Vérifier que tous les utilisateurs ont un login
   ```sql
   SELECT id, nom, prenom, email, login 
   FROM users 
   WHERE login IS NULL OR login = '';
   ```
   → Cette requête ne doit retourner aucun résultat

### Pour une Nouvelle Installation

1. **Étape 1** : Utiliser le schéma corrigé
   ```bash
   psql -d ebvision2 -f scripts/database/schema-complete.sql
   ```

2. **Étape 2** : Générer les données de démo (optionnel)
   ```bash
   node scripts/database/5-generate-demo-data.js
   ```

## 🔍 Vérifications

### 1. Vérifier que le champ login est obligatoire

```sql
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'login';
```

Résultat attendu : `is_nullable = 'NO'`

### 2. Vérifier que tous les utilisateurs ont un login

```sql
SELECT COUNT(*) as users_sans_login
FROM users 
WHERE login IS NULL OR login = '';
```

Résultat attendu : `0`

### 3. Vérifier l'unicité des logins

```sql
SELECT login, COUNT(*) as nombre
FROM users 
GROUP BY login 
HAVING COUNT(*) > 1;
```

Résultat attendu : Aucun résultat (pas de doublons)

## 📊 Impact sur l'Application

### Interface Utilisateur (`users.html`)

Le login s'affiche maintenant correctement dans :
- La colonne "Login" du tableau des utilisateurs
- Le modal "Modifier Utilisateur (Libre)"
- Le modal "Gérer le Compte Utilisateur (Lié à Collaborateur)"

### API

Les endpoints suivants retournent maintenant le champ `login` :
- `GET /api/users` - Liste des utilisateurs
- `GET /api/users/:id` - Détails d'un utilisateur
- `POST /api/users` - Création d'un utilisateur
- `PUT /api/users/:id` - Modification d'un utilisateur

## 🎯 Règles de Génération du Login

### Génération Automatique

Si aucun login n'est fourni lors de la création d'un utilisateur :

1. **Base** : Première lettre du prénom + Première lettre du nom (en minuscules)
   - Exemple : Jean Dupont → `jd`

2. **Unicité** : Si le login existe déjà, ajouter un numéro incrémental
   - Exemple : `jd`, `jd1`, `jd2`, etc.

### Validation

- **Longueur** : Maximum 50 caractères
- **Unicité** : Contrainte `UNIQUE` en base de données
- **Obligatoire** : Contrainte `NOT NULL` en base de données
- **Format** : Minuscules recommandées (mais pas obligatoire)

## 📌 Notes Importantes

1. **Comptes liés à des collaborateurs** : Même les utilisateurs liés à des collaborateurs doivent avoir un login obligatoire
2. **Connexion** : La connexion peut se faire via l'email OU le login
3. **Modification** : Le login peut être modifié après la création (via l'interface ou l'API)
4. **Historique** : Les anciens utilisateurs sans login doivent être corrigés avant d'appliquer la contrainte NOT NULL

## 🔗 Fichiers Modifiés

- `scripts/database/5-generate-demo-data.js` - Génération des logins
- `src/models/User.js` - Ajout du login dans findById() et gestion d'unicité dans create()
- `scripts/database/schema-complete.sql` - Contrainte NOT NULL
- `scripts/database/schema-structure-only.sql` - Contrainte NOT NULL
- `scripts/database/fix-missing-logins.js` - Script de correction (nouveau)
- `scripts/database/migration-add-login-not-null.sql` - Migration SQL (nouveau)

## ✨ Résultat Final

Après application de ces corrections :
- ✅ Tous les utilisateurs ont un login unique
- ✅ Le login est obligatoire en base de données
- ✅ Le login s'affiche correctement dans l'interface
- ✅ Les nouveaux utilisateurs auront automatiquement un login généré
- ✅ Les comptes liés à des collaborateurs affichent leur login





