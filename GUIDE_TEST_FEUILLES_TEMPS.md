# Guide de Test - Corrections des Feuilles de Temps

## 🔧 Corrections Apportées

### Problème Identifié
- Les boutons "Semaine précédente" et "Semaine suivante" ne fonctionnaient pas
- Erreurs 500 dans la console lors des appels à `/api/time-sheets/current`
- Violation de contrainte de clé étrangère `time_sheets_collaborateur_id_fkey`

### Corrections Effectuées

1. **Correction de la route `/api/time-sheets/current`** (`src/routes/time-sheets.js`)
   - Ajout de la récupération du `collaborateur_id` lié à l'utilisateur
   - Utilisation du bon `collaborateur_id` au lieu de `userId`

2. **Correction du modèle TimeSheet** (`src/models/TimeSheet.js`)
   - Ajout de la méthode `getCollaborateurId(userId)`
   - Modification de toutes les méthodes pour utiliser le bon `collaborateur_id`:
     - `findByUser()`
     - `findByWeekStart()`
     - `getCurrentTimeSheet()`
     - `existsForWeek()`
     - `getStatistics()`

3. **Correction des fonctions JavaScript** (`public/js/time-sheet-modern.js`)
   - Rendre les fonctions `loadPreviousWeek()` et `loadNextWeek()` globales
   - Ajout de logs de débogage

## 🧪 Test Manuel

### Étapes de Test

1. **Démarrer le serveur**
   ```bash
   npm start
   ```

2. **Ouvrir le navigateur**
   - Aller sur `http://localhost:3000`
   - Vérifier la redirection vers `/login.html`

3. **Se connecter**
   - Email: `test@trs.com`
   - Mot de passe: `password123`
   - Vérifier la redirection vers le dashboard

4. **Aller à la page des feuilles de temps**
   - Naviguer vers `http://localhost:3000/time-sheet-modern.html`
   - Vérifier que la page se charge sans erreur

5. **Tester les boutons de navigation**
   - Cliquer sur "Semaine précédente" (bouton avec flèche gauche)
   - Vérifier qu'il n'y a pas d'erreur 500 dans la console
   - Cliquer sur "Semaine suivante" (bouton avec flèche droite)
   - Vérifier qu'il n'y a pas d'erreur 500 dans la console

6. **Vérifier l'affichage**
   - L'affichage de la semaine devrait changer
   - Les données de la feuille de temps devraient se charger

### Vérifications à Faire

#### ✅ Critères de Succès
- [ ] La page se charge sans erreur console
- [ ] Les boutons "Semaine précédente" et "Semaine suivante" sont cliquables
- [ ] Aucune erreur 500 lors des clics sur les boutons
- [ ] L'affichage de la semaine change après les clics
- [ ] Les données de la feuille de temps se chargent correctement

#### ❌ Signes de Problème
- Erreurs 500 dans la console du navigateur
- Messages d'erreur "time_sheets_collaborateur_id_fkey"
- Boutons non cliquables ou sans effet
- Page qui ne se charge pas

### Debugging

#### Vérifier les Logs du Serveur
```bash
# Dans le terminal où le serveur tourne
# Chercher les erreurs liées à time_sheets
```

#### Vérifier la Console du Navigateur
1. Ouvrir les outils de développement (F12)
2. Aller dans l'onglet "Console"
3. Chercher les erreurs en rouge

#### Vérifier les Appels API
1. Ouvrir les outils de développement (F12)
2. Aller dans l'onglet "Network"
3. Cliquer sur les boutons de navigation
4. Vérifier les appels à `/api/time-sheets/current`

## 🔍 Diagnostic en Cas de Problème

### Si les erreurs 500 persistent
1. Vérifier que l'utilisateur `test@trs.com` a un `collaborateur_id` valide
2. Vérifier que ce `collaborateur_id` existe dans la table `collaborateurs`
3. Exécuter le script de diagnostic:
   ```bash
   node scripts/diagnose-time-sheets-foreign-key.js
   ```

### Si les boutons ne fonctionnent pas
1. Vérifier que les fonctions JavaScript sont bien globales
2. Vérifier que les boutons ont les bons `onclick`
3. Vérifier la console pour les erreurs JavaScript

## 📝 Notes Techniques

### Structure de la Base de Données
- Table `users`: contient les utilisateurs avec un `collaborateur_id`
- Table `collaborateurs`: contient les collaborateurs
- Table `time_sheets`: utilise `collaborateur_id` (référence vers `collaborateurs.id`)

### Flux de Données
1. Utilisateur se connecte → `req.user.id` (ID utilisateur)
2. API récupère le `collaborateur_id` lié à cet utilisateur
3. API utilise ce `collaborateur_id` pour les opérations sur `time_sheets`

### Corrections Clés
- **Avant**: `collaborateur_id: userId` (ID utilisateur)
- **Après**: `collaborateur_id: collaborateurId` (ID collaborateur récupéré depuis `users.collaborateur_id`) 