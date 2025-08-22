# 🎯 Guide de Test Utilisateur - Modèles de Prospection

## ✅ Corrections Appliquées

Toutes les erreurs JavaScript ont été corrigées :
- ✅ Génération automatique des noms
- ✅ Gestion des champs de contenu (Email vs Courrier)
- ✅ Validation des formulaires
- ✅ Gestion d'erreurs améliorée

## 🧪 Tests à Effectuer

### **Test 1 : Création d'un Modèle Email**
1. Aller sur : `http://localhost:3000/prospecting-templates.html`
2. Cliquer sur "Nouveau modèle"
3. Sélectionner "Email"
4. Choisir une Business Unit (ex: "Finance")
5. Vérifier que le nom se génère automatiquement
6. Choisir un type de contenu (ex: "Présentation générale")
7. Remplir l'objet et le contenu
8. Cliquer "Enregistrer le modèle"
9. ✅ Vérifier que le modèle est créé sans erreur

### **Test 2 : Création d'un Modèle Courrier**
1. Cliquer sur "Nouveau modèle"
2. Sélectionner "Courrier physique"
3. Choisir une Business Unit (ex: "RH")
4. Vérifier que le nom se génère automatiquement
5. Choisir un type de contenu (ex: "Suivi client")
6. Remplir le contenu du courrier
7. Cliquer "Enregistrer le modèle"
8. ✅ Vérifier que le modèle est créé sans erreur

### **Test 3 : Test Service Spécifique**
1. Cliquer sur "Nouveau modèle"
2. Choisir "Service spécifique" dans le type de contenu
3. Vérifier que le champ "Nom du service" apparaît
4. Saisir un nom de service (ex: "AuditFinancier")
5. Vérifier que le nom se met à jour
6. Remplir le contenu et sauvegarder
7. ✅ Vérifier que le modèle est créé

### **Test 4 : Test d'Incrémentation**
1. Créer un modèle avec des paramètres spécifiques
2. Vérifier que le nom se termine par "-01"
3. Créer un second modèle avec les mêmes paramètres
4. Vérifier que le nom se termine par "-02"
5. ✅ Vérifier l'incrémentation automatique

### **Test 5 : Test de Validation**
1. Essayer de sauvegarder sans remplir le contenu
2. ✅ Vérifier que l'erreur "Le contenu du modèle est obligatoire" apparaît
3. Remplir le contenu et sauvegarder
4. ✅ Vérifier que le modèle est créé avec succès

## 🔧 Vérifications Techniques

### **Console (F12)**
- ✅ Pas d'erreurs JavaScript
- ✅ Pas d'erreur "Cannot set properties of null"
- ✅ Pas d'erreur "templates.filter is not a function"

### **Format des Noms**
- ✅ Format : `BU-TypeCanal-TypeContenu-NumeroOrdre`
- ✅ Exemples :
  - `Finance-Email-GeneralServices-01`
  - `RH-Courrier-Suivi-01`
  - `IT-Courrier-AuditSecurite-01`

## 🎉 Critères de Succès

Le système fonctionne correctement si :
- ✅ Création de modèles Email réussie
- ✅ Création de modèles Courrier réussie
- ✅ Génération automatique des noms
- ✅ Incrémentation des numéros
- ✅ Validation des champs obligatoires
- ✅ Pas d'erreurs dans la console
- ✅ Interface réactive et intuitive

---

**🔗 URL :** `http://localhost:3000/prospecting-templates.html`

**📋 Prochaine étape :** Test du processus complet de création de campagnes
