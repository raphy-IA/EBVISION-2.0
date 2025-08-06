# Guide de Test Manuel - Persistance des Données

## Problème Signalé
L'utilisateur rapporte que "ma sauvegarde ne rends pas les données persistantes ou alors ne recharge pas les données existanes".

## Étapes de Test Manuel

### 1. Connexion et Accès
1. Ouvrir le navigateur et aller sur `http://localhost:3000`
2. Se connecter avec :
   - Email: `cdjiki@eb-partnersgroup.cm`
   - Mot de passe: `password123`
3. Aller sur la page des feuilles de temps : `http://localhost:3000/time-sheet-modern.html`

### 2. Test de Saisie et Sauvegarde
1. **Ajouter une nouvelle ligne chargeable** :
   - Cliquer sur "Ajouter une activité chargeable"
   - Sélectionner une mission
   - Sélectionner une tâche
   - Cliquer sur "Ajouter"

2. **Saisir des heures** :
   - Dans la nouvelle ligne, saisir des heures (ex: 8) dans la colonne Lundi
   - Observer si la valeur reste après quelques secondes

3. **Vérifier la console** :
   - Ouvrir les outils de développement (F12)
   - Aller dans l'onglet Console
   - Vérifier s'il y a des erreurs ou des messages de sauvegarde

### 3. Test de Navigation
1. **Naviguer vers la semaine suivante** :
   - Cliquer sur le bouton "Semaine suivante"
   - Observer si la page se recharge
   - Vérifier s'il y a des erreurs dans la console

2. **Naviguer vers la semaine précédente** :
   - Cliquer sur le bouton "Semaine précédente"
   - Observer si la page se recharge
   - Vérifier s'il y a des erreurs dans la console

### 4. Test de Persistance
1. **Recharger la page** :
   - Appuyer sur F5 pour recharger la page
   - Vérifier si les données saisies sont toujours présentes

2. **Naviguer et revenir** :
   - Aller vers la semaine suivante
   - Revenir à la semaine précédente
   - Vérifier si les données sont toujours présentes

### 5. Vérification des API
1. **Tester l'API de création** :
   - Dans la console, exécuter :
   ```javascript
   fetch('/api/time-entries', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
           user_id: '8eb54916-a0b3-4f9e-acd1-75830271feab',
           date_saisie: '2024-01-15',
           heures: 8,
           mission_id: 1,
           task_id: 1
       })
   }).then(r => r.json()).then(console.log)
   ```

2. **Tester l'API de récupération** :
   - Dans la console, exécuter :
   ```javascript
   fetch('/api/time-entries?user_id=8eb54916-a0b3-4f9e-acd1-75830271feab&week_start=2024-01-15&week_end=2024-01-21')
   .then(r => r.json()).then(console.log)
   ```

## Points à Vérifier

### Dans le Code JavaScript
1. **Fonction `updateEntryHours`** :
   - Vérifier qu'elle appelle bien `saveTimeEntry`
   - Vérifier qu'elle ne génère pas d'erreurs

2. **Fonction `saveTimeEntry`** :
   - Vérifier qu'elle détermine correctement s'il faut créer ou mettre à jour
   - Vérifier qu'elle appelle les bonnes API

3. **Fonction `loadExistingData`** :
   - Vérifier qu'elle est appelée lors du chargement de la page
   - Vérifier qu'elle est appelée lors de la navigation entre semaines

### Dans les API
1. **POST /api/time-entries** :
   - Vérifier qu'elle accepte les bonnes données
   - Vérifier qu'elle retourne une réponse valide

2. **GET /api/time-entries** :
   - Vérifier qu'elle accepte les paramètres `week_start` et `week_end`
   - Vérifier qu'elle retourne les bonnes données

3. **PUT /api/time-entries/:id** :
   - Vérifier qu'elle fonctionne correctement
   - Vérifier qu'elle retourne une réponse valide

## Résultats Attendus
- Les données saisies doivent être automatiquement sauvegardées
- Les données doivent être rechargées lors de la navigation entre semaines
- Les données doivent persister après rechargement de la page
- Aucune erreur ne doit apparaître dans la console

## En Cas de Problème
1. Noter les erreurs exactes dans la console
2. Vérifier les réponses des API dans l'onglet Network
3. Vérifier que l'utilisateur est bien connecté
4. Vérifier que les données sont bien présentes en base de données 