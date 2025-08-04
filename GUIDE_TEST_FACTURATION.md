# 🧪 Guide de Test - Module Facturation

## 📋 Fonctionnalités Implémentées à Tester

### ✅ **Structure de Base de Données**
- Table `invoices` avec toutes les colonnes nécessaires
- Gestion des montants (HT, TVA, TTC, montant payé, montant restant)
- Génération automatique des numéros de facture
- Calculs automatiques des montants

### ✅ **API Backend**
- Routes CRUD complètes pour les factures
- Intégration avec les missions et clients
- Gestion des lignes de facture et paiements

### ✅ **Interface Utilisateur**
- Page de détails de facture (`/invoice-details.html`)
- Intégration dans la page des détails de mission
- Bouton de création de facture depuis une mission

---

## 🚀 Comment Tester

### **Étape 1 : Démarrer le Serveur**
```bash
node server.js
```
Le serveur démarre sur `http://localhost:3000`

### **Étape 2 : Accéder aux Pages de Test**

#### **A. Page des Détails de Mission**
1. Ouvrez votre navigateur
2. Allez sur : `http://localhost:3000/mission-details.html?id=MISSION_ID`
3. Remplacez `MISSION_ID` par l'ID d'une mission existante

#### **B. Page des Détails de Facture**
1. Allez sur : `http://localhost:3000/invoice-details.html?id=INVOICE_ID`
2. Remplacez `INVOICE_ID` par l'ID d'une facture existante

#### **C. Liste des Factures**
1. Allez sur : `http://localhost:3000/invoices.html`

---

## 🎯 Tests à Effectuer

### **Test 1 : Création de Facture depuis une Mission**
1. Ouvrez la page des détails de mission
2. Cliquez sur l'onglet **"Facturation"**
3. Cliquez sur le bouton **"Créer une facture"**
4. Vérifiez que :
   - La facture est créée avec succès
   - Le numéro de facture est généré automatiquement
   - Les informations de la mission sont reprises

### **Test 2 : Affichage des Détails de Facture**
1. Cliquez sur l'icône **œil** à côté d'une facture
2. Vérifiez que :
   - Les informations de la facture s'affichent correctement
   - Les montants sont calculés (HT, TVA, TTC)
   - Les onglets "Lignes de facture" et "Paiements" sont présents

### **Test 3 : Statistiques de Facturation**
1. Dans l'onglet "Facturation" d'une mission
2. Vérifiez que :
   - Le total facturé s'affiche
   - Le total payé s'affiche
   - Le montant en attente s'affiche

### **Test 4 : Navigation entre les Pages**
1. Testez la navigation entre :
   - Page des détails de mission
   - Page des détails de facture
   - Retour à la page précédente

---

## 🔍 Points à Vérifier

### **Interface Utilisateur**
- ✅ Les pages se chargent sans erreur
- ✅ Les données s'affichent correctement
- ✅ Les boutons fonctionnent
- ✅ La navigation est fluide

### **Fonctionnalités**
- ✅ Création de facture depuis une mission
- ✅ Affichage des détails de facture
- ✅ Calculs automatiques des montants
- ✅ Génération automatique des numéros

### **Données**
- ✅ Les factures sont liées aux bonnes missions
- ✅ Les clients sont correctement affichés
- ✅ Les montants sont calculés correctement
- ✅ Les dates sont formatées correctement

---

## 🐛 Problèmes Courants

### **Si la page ne se charge pas :**
1. Vérifiez que le serveur est démarré
2. Vérifiez l'URL dans le navigateur
3. Vérifiez la console du navigateur pour les erreurs

### **Si les données ne s'affichent pas :**
1. Vérifiez que l'ID de mission/facture est correct
2. Vérifiez que les données existent en base
3. Vérifiez les logs du serveur

### **Si les calculs sont incorrects :**
1. Vérifiez les données en base
2. Vérifiez les formules de calcul
3. Vérifiez les taux de TVA

---

## 📊 Résultats Attendus

### **Page Détails de Mission**
- Onglet "Facturation" visible
- Liste des factures affichée
- Bouton "Créer une facture" fonctionnel
- Statistiques de facturation affichées

### **Page Détails de Facture**
- Informations de la facture complètes
- Montants calculés correctement
- Onglets "Lignes" et "Paiements" présents
- Bouton "Imprimer" fonctionnel

### **Création de Facture**
- Facture créée avec succès
- Numéro généré automatiquement
- Redirection vers les détails
- Message de confirmation

---

## 🎉 Validation Réussie

Si tous les tests passent, cela signifie que :
- ✅ La structure de base de données est correcte
- ✅ L'API backend fonctionne
- ✅ L'interface utilisateur est opérationnelle
- ✅ Les calculs sont corrects
- ✅ La navigation fonctionne

**Le module de facturation est prêt pour la prochaine étape !**

---

*Guide créé le : 2025-08-04*
*Version : 1.0* 