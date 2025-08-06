# Guide de Test Final - Feuilles de Temps

## 🎯 Objectif
Vérifier que les corrections apportées aux feuilles de temps fonctionnent correctement et que les boutons "Semaine précédente" et "Semaine suivante" ne génèrent plus d'erreurs 500.

## 🔧 Corrections Appliquées

### 1. Correction de la Route API (`src/routes/time-sheets.js`)
- ✅ Ajout de la récupération du `collaborateur_id` lié à l'utilisateur
- ✅ Utilisation du bon `collaborateur_id` au lieu de `userId`

### 2. Correction du Modèle TimeSheet (`src/models/TimeSheet.js`)
- ✅ Ajout de la méthode `getCollaborateurId(userId)`
- ✅ Modification de toutes les méthodes pour utiliser le bon `collaborateur_id`

### 3. Correction des Contraintes de Base de Données
- ✅ Contrainte `time_sheets_statut_check` corrigée
- ✅ Contrainte `time_sheets_semaine_check` vérifiée (1-53)

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

5. **Ouvrir les outils de développement**
   - Appuyer sur F12
   - Aller dans l'onglet "Console"
   - Aller dans l'onglet "Network"

6. **Tester les boutons de navigation**
   - Cliquer sur "Semaine précédente" (bouton avec flèche gauche)
   - Vérifier dans la console qu'il n'y a pas d'erreur 500
   - Vérifier dans l'onglet Network que l'appel à `/api/time-sheets/current` retourne 200
   - Cliquer sur "Semaine suivante" (bouton avec flèche droite)
   - Vérifier dans la console qu'il n'y a pas d'erreur 500
   - Vérifier dans l'onglet Network que l'appel à `/api/time-sheets/current` retourne 200

7. **Vérifier l'affichage**
   - L'affichage de la semaine devrait changer
   - Les données de la feuille de temps devraient se charger

## ✅ Critères de Succès

### Avant les Corrections
- ❌ Erreurs 500 lors des appels à `/api/time-sheets/current`
- ❌ Violation de contrainte `time_sheets_collaborateur_id_fkey`
- ❌ Violation de contrainte `time_sheets_statut_check`
- ❌ Boutons de navigation non fonctionnels
- ❌ Console remplie d'erreurs

### Après les Corrections
- ✅ Aucune erreur 500
- ✅ Respect des contraintes de clé étrangère
- ✅ Respect des contraintes de vérification
- ✅ Boutons de navigation fonctionnels
- ✅ Console propre
- ✅ Navigation fluide entre les semaines

## 🔍 Diagnostic en Cas de Problème

### Si les erreurs 500 persistent
1. Vérifier les logs du serveur dans le terminal
2. Chercher les erreurs liées à `time_sheets`
3. Exécuter le script de diagnostic:
   ```bash
   node scripts/diagnose-time-sheets-foreign-key.js
   ```

### Si les boutons ne fonctionnent pas
1. Vérifier que les fonctions JavaScript sont bien globales
2. Vérifier que les boutons ont les bons `onclick`
3. Vérifier la console pour les erreurs JavaScript

### Si l'authentification échoue
1. Vérifier que l'utilisateur `test@trs.com` existe
2. Vérifier que le mot de passe est correct
3. Vérifier que le serveur fonctionne sur le port 3000

## 📝 Notes Techniques

### Structure de la Base de Données
- Table `users`: contient les utilisateurs avec un `collaborateur_id`
- Table `collaborateurs`: contient les collaborateurs
- Table `time_sheets`: utilise `collaborateur_id` (référence vers `collaborateurs.id`)

### Contraintes Vérifiées
- `time_sheets_collaborateur_id_fkey`: FOREIGN KEY (collaborateur_id) REFERENCES collaborateurs(id)
- `time_sheets_statut_check`: CHECK (statut IN ('draft', 'submitted', 'approved', 'rejected'))
- `time_sheets_semaine_check`: CHECK (semaine >= 1 AND semaine <= 53)

### Flux de Données Corrigé
1. **Utilisateur se connecte** → `req.user.id` (ID utilisateur)
2. **API récupère le collaborateur** → `SELECT collaborateur_id FROM users WHERE id = ?`
3. **API utilise le bon ID** → `collaborateur_id` pour les opérations `time_sheets`

## 🎉 Résultat Attendu

Après avoir suivi ce guide de test, les boutons "Semaine précédente" et "Semaine suivante" devraient fonctionner correctement sans générer d'erreurs 500. L'utilisateur devrait pouvoir naviguer librement entre les semaines dans ses feuilles de temps. 