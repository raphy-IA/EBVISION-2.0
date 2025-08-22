# 🎯 Guide de Test - Génération Automatique des Noms de Modèles

## 📋 Objectif
Tester la fonctionnalité de génération automatique des noms de modèles de prospection selon le format : `BU-TypeCanal-TypeContenu-NumeroOrdre`

## 🧪 Tests à Effectuer

### **Test 1 : Vérification de l'Interface**
1. **Accéder à la page des modèles :**
   ```
   http://localhost:3000/prospecting-templates.html
   ```

2. **Vérifier l'affichage :**
   - ✅ Page se charge correctement
   - ✅ Bouton "Nouveau modèle" visible
   - ✅ Liste des modèles existants affichée

### **Test 2 : Création d'un Nouveau Modèle**
1. **Ouvrir le formulaire :**
   - Cliquer sur "Nouveau modèle"
   - Vérifier que le formulaire s'affiche

2. **Vérifier le champ nom :**
   - ✅ Le champ "Nom du modèle" est en lecture seule
   - ✅ Le placeholder indique "Généré automatiquement"
   - ✅ Le texte d'aide explique le format

### **Test 3 : Sélection du Canal**
1. **Sélectionner Email :**
   - Cliquer sur l'option "Email"
   - Vérifier que l'indicateur s'affiche
   - Vérifier que la configuration Email apparaît

2. **Sélectionner Courrier physique :**
   - Cliquer sur l'option "Courrier physique"
   - Vérifier que l'indicateur change
   - Vérifier que la configuration Courrier apparaît

### **Test 4 : Sélection de la Business Unit**
1. **Choisir une BU :**
   - Sélectionner "Finance" dans la liste
   - Vérifier que le nom se génère automatiquement
   - Vérifier le format : `Finance-[TypeCanal]-[TypeContenu]-01`

### **Test 5 : Types de Contenu**

#### **5.1 Présentation Générale**
- Sélectionner "Présentation générale"
- Vérifier que le nom contient "GeneralServices"
- Exemple attendu : `Finance-Email-GeneralServices-01`

#### **5.2 Suivi Client**
- Sélectionner "Suivi client"
- Vérifier que le nom contient "Suivi"
- Exemple attendu : `Finance-Email-Suivi-01`

#### **5.3 Relance**
- Sélectionner "Relance"
- Vérifier que le nom contient "Relance"
- Exemple attendu : `Finance-Email-Relance-01`

#### **5.4 Service Spécifique**
- Sélectionner "Service spécifique"
- Vérifier que le champ "Nom du service" apparaît
- Saisir "AuditFinancier"
- Vérifier que le nom contient "AuditFinancier"
- Exemple attendu : `Finance-Email-AuditFinancier-01`

### **Test 6 : Incrémentation des Numéros**
1. **Créer un premier modèle :**
   - Remplir le formulaire et sauvegarder
   - Vérifier que le nom se termine par "-01"

2. **Créer un second modèle similaire :**
   - Utiliser les mêmes paramètres (BU, canal, type)
   - Vérifier que le nom se termine par "-02"

3. **Créer un modèle différent :**
   - Changer le type de contenu
   - Vérifier que le nom recommence à "-01"

### **Test 7 : Validation des Contraintes**
1. **Tenter de créer sans BU :**
   - Ne pas sélectionner de Business Unit
   - Vérifier que le nom reste vide

2. **Tenter de créer sans canal :**
   - Ne pas sélectionner de canal
   - Vérifier que le nom reste vide

3. **Service spécifique sans nom :**
   - Sélectionner "Service spécifique"
   - Ne pas saisir de nom de service
   - Vérifier que le nom reste vide

## 🔧 Tests Backend

### **Test 1 : API de Récupération des Modèles**
```bash
curl -X GET http://localhost:3000/api/prospecting/templates \
  -H "Authorization: Bearer [token]"
```

### **Test 2 : API de Création de Modèle**
```bash
curl -X POST http://localhost:3000/api/prospecting/templates \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Finance-Email-GeneralServices-01",
    "channel": "EMAIL",
    "type_courrier": "PRESENTATION_GENERALE",
    "subject": "Test automatique",
    "body_template": "Contenu de test",
    "business_unit_id": "600d8028-5594-47cf-8c2c-aa9c03da095d"
  }'
```

## 📊 Vérifications Base de Données

### **Requêtes de Vérification**
```sql
-- Vérifier les modèles créés
SELECT name, channel, type_courrier, business_unit_id 
FROM prospecting_templates 
ORDER BY name;

-- Vérifier les Business Units
SELECT id, nom FROM business_units;

-- Compter les modèles par BU
SELECT 
    bu.nom as business_unit,
    COUNT(pt.id) as model_count
FROM business_units bu
LEFT JOIN prospecting_templates pt ON bu.id = pt.business_unit_id
GROUP BY bu.id, bu.nom
ORDER BY bu.nom;
```

## 🎯 Critères de Succès

### **Interface Utilisateur :**
- ✅ Champ nom en lecture seule
- ✅ Génération automatique en temps réel
- ✅ Affichage conditionnel du champ service
- ✅ Format de nom correct
- ✅ Incrémentation automatique des numéros

### **Fonctionnalité :**
- ✅ Génération selon les règles définies
- ✅ Gestion des types de contenu
- ✅ Gestion des canaux
- ✅ Nettoyage des noms de service
- ✅ Recherche du prochain numéro disponible

### **Performance :**
- ✅ Réponse rapide de l'interface
- ✅ Pas d'erreurs JavaScript
- ✅ Requêtes API optimisées

## 🐛 Problèmes Potentiels

### **Problèmes Identifiés :**
1. **Nom non généré :** Vérifier la sélection de BU et canal
2. **Numéro d'ordre incorrect :** Vérifier la logique de recherche
3. **Champ service non visible :** Vérifier le type de contenu
4. **Erreurs API :** Vérifier les logs du serveur

### **Solutions :**
1. **Recharger la page** si l'interface semble bloquée
2. **Vérifier la console** pour les erreurs JavaScript
3. **Vérifier les logs du serveur** pour les erreurs backend
4. **Utiliser les outils de développement** pour déboguer

## 🎉 Validation de la Fonctionnalité

La génération automatique est considérée comme **réussie** si :
- ✅ Tous les types de contenu génèrent le bon format
- ✅ L'incrémentation des numéros fonctionne
- ✅ L'interface est intuitive et réactive
- ✅ Les contraintes sont respectées
- ✅ Les données sont correctement sauvegardées

---

**🔗 URL de Test :** `http://localhost:3000/prospecting-templates.html`

**📋 Prochaine Étape :** Test complet du processus de création de modèles
