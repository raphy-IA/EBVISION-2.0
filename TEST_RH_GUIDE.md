
# 🧪 Guide de Test - Gestion RH

## Tests à effectuer

### 1. Test des APIs
- Ouvrir: http://localhost:3000/test-rh.html
- Cliquer sur "Tester toutes les APIs"
- Vérifier que toutes les APIs répondent correctement

### 2. Test du Modal RH
- Ouvrir: http://localhost:3000/collaborateurs.html
- Ouvrir la console du navigateur (F12)
- Cliquer sur "Gérer RH" pour un collaborateur
- Vérifier que le modal s'ouvre correctement
- Exécuter `diagnosticRH()` dans la console

### 3. Test des fonctionnalités RH
- Ajouter une évolution de grade
- Ajouter une évolution de poste  
- Ajouter une évolution organisationnelle
- Vérifier que l'historique se met à jour

### 4. Points de contrôle
- [ ] Modal s'ouvre sans erreur
- [ ] Données du collaborateur s'affichent
- [ ] Listes déroulantes se remplissent
- [ ] Historique se charge
- [ ] Ajout d'évolutions fonctionne
- [ ] Pas d'erreurs dans la console

## En cas de problème

1. Vérifier que le serveur est démarré
2. Vérifier les logs du serveur
3. Vérifier la console du navigateur
4. Exécuter `diagnosticRH()` pour diagnostiquer
