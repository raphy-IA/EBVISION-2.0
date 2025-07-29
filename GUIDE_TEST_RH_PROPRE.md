# 🧪 Guide de Test - Gestion RH (État Propre)

## ✅ **État actuel vérifié**

- **Tous les historiques RH sont vides** (0 enregistrements)
- **Tous les collaborateurs sont réinitialisés** (aucune information actuelle)
- **Données de référence disponibles** :
  - 11 grades disponibles
  - 14 postes disponibles  
  - 16 business units disponibles
  - 17 divisions disponibles

## 🚀 **Démarrage des tests**

### **1. Démarrer le serveur**
```bash
npm start
```

### **2. Accéder à la page collaborateurs**
- Ouvrir : http://localhost:3000/collaborateurs.html
- Vérifier que la page se charge correctement

### **3. Tester le bouton "Gérer RH"**

#### **Étape 1 : Ouverture du modal**
1. Cliquer sur le bouton "Gérer RH" (icône 👔) pour un collaborateur
2. Vérifier que le modal s'ouvre sans erreur
3. Vérifier que les informations du collaborateur s'affichent
4. Vérifier que les historiques sont vides (tableaux vides)

#### **Étape 2 : Test des listes déroulantes**
1. **Grades** : Vérifier que la liste se remplit avec les 11 grades
2. **Types collaborateurs** : Vérifier que la liste se remplit
3. **Postes** : Vérifier que la liste se remplit avec les 14 postes
4. **Business units** : Vérifier que la liste se remplit avec les 16 BU
5. **Divisions** : Vérifier que la liste se remplit avec les 17 divisions

### **4. Test des évolutions RH**

#### **Test 1 : Évolution de Grade**
1. Sélectionner un grade dans la liste "Nouveau Grade"
2. Définir une date d'effet (aujourd'hui ou une date passée)
3. Ajouter un motif (optionnel)
4. Cliquer sur "Ajouter Évolution Grade"
5. **Vérifier** : L'évolution apparaît dans l'historique des grades

#### **Test 2 : Évolution de Poste**
1. Sélectionner un type de collaborateur
2. Sélectionner un poste dans la liste "Nouveau Poste"
3. Définir une date d'effet
4. Ajouter un motif (optionnel)
5. Cliquer sur "Ajouter Évolution Poste"
6. **Vérifier** : L'évolution apparaît dans l'historique des postes

#### **Test 3 : Évolution Organisationnelle**
1. Sélectionner une business unit
2. Sélectionner une division
3. Définir une date d'effet
4. Ajouter un motif (optionnel)
5. Cliquer sur "Ajouter Évolution Organisationnelle"
6. **Vérifier** : L'évolution apparaît dans l'historique organisationnel

### **5. Vérifications finales**

#### **Dans le modal RH**
- [ ] Les historiques se remplissent correctement
- [ ] Les dates s'affichent au bon format
- [ ] Les motifs s'affichent correctement
- [ ] Pas d'erreurs dans la console

#### **Sur la page principale**
- [ ] Recharger la page collaborateurs
- [ ] Vérifier que les informations actuelles se mettent à jour
- [ ] Cliquer à nouveau sur "Gérer RH"
- [ ] Vérifier que les nouvelles évolutions sont visibles

## 🔧 **Diagnostic en cas de problème**

### **Fonction de diagnostic**
Dans la console du navigateur, exécuter :
```javascript
diagnosticRH()
```

### **Vérifications manuelles**
1. **Console du navigateur** : Vérifier les erreurs JavaScript
2. **Logs du serveur** : Vérifier les erreurs côté serveur
3. **Réseau** : Vérifier les appels API dans l'onglet Network

### **Tests API directs**
- Ouvrir : http://localhost:3000/test-rh.html
- Cliquer sur "Tester toutes les APIs"
- Vérifier que toutes les APIs répondent correctement

## 📊 **Points de contrôle**

### **Avant les tests**
- [ ] Serveur démarré
- [ ] Page collaborateurs accessible
- [ ] Console du navigateur ouverte
- [ ] Aucune erreur au chargement

### **Pendant les tests**
- [ ] Modal s'ouvre correctement
- [ ] Données du collaborateur s'affichent
- [ ] Listes déroulantes se remplissent
- [ ] Ajout d'évolutions fonctionne
- [ ] Historiques se mettent à jour

### **Après les tests**
- [ ] Toutes les évolutions sont visibles
- [ ] Pas d'erreurs dans la console
- [ ] Informations actuelles mises à jour
- [ ] Fonctionnement stable

## 🎯 **Objectifs de test**

1. **Vérifier le chargement** : Modal et données
2. **Tester les évolutions** : Ajout de grades, postes, organisations
3. **Vérifier l'historique** : Affichage des évolutions
4. **Tester la persistance** : Données sauvegardées
5. **Vérifier la robustesse** : Gestion d'erreur

## 📝 **Notes importantes**

- **État initial** : Tous les historiques sont vides
- **Données de test** : Utiliser des dates passées pour les évolutions
- **Vérifications** : Toujours vérifier les historiques après ajout
- **Console** : Garder la console ouverte pour détecter les erreurs

---

**✅ L'état est maintenant parfait pour les tests !**