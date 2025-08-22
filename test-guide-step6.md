# 🎯 Guide de Test - Étape 6 : Conversion en Opportunités

## 📋 Objectif
Tester la fonctionnalité de conversion d'entreprises exécutées en opportunités commerciales.

## 🧪 Tests à Effectuer

### **Test 1 : Vérification de l'Interface**
1. **Accéder à la page d'exécution :**
   ```
   http://localhost:3000/campaign-execution.html?id=3e16634e-e449-4df9-a65d-b4ac00cf8588
   ```

2. **Vérifier l'affichage :**
   - ✅ Page se charge correctement
   - ✅ En-tête de campagne affiché
   - ✅ Statistiques d'exécution visibles
   - ✅ Liste des entreprises avec statuts
   - ✅ Boutons d'action (Déposé, Envoyé, Échec)
   - ✅ Boutons "Convertir" pour entreprises exécutées

### **Test 2 : Exécution d'une Campagne**
1. **Marquer une entreprise comme "Déposée" :**
   - Cliquer sur le bouton "Déposé" pour une entreprise
   - Vérifier que le statut change
   - Vérifier que la date d'exécution s'affiche
   - Vérifier que les statistiques se mettent à jour

2. **Marquer une entreprise comme "Envoyée" :**
   - Cliquer sur le bouton "Envoyé" pour une autre entreprise
   - Vérifier que le statut change
   - Vérifier que les statistiques se mettent à jour

### **Test 3 : Conversion en Opportunité**
1. **Ouvrir le modal de conversion :**
   - Cliquer sur "Convertir" pour une entreprise exécutée
   - Vérifier que le modal s'ouvre
   - Vérifier que les champs sont pré-remplis

2. **Remplir le formulaire :**
   - Nom de l'opportunité : "Opportunité - [Nom Entreprise]"
   - Valeur estimée : 5000000 (5 millions FCFA)
   - Description : "Opportunité créée à partir de la campagne..."
   - Probabilité : 75%
   - Date de fermeture : 3 mois à partir d'aujourd'hui

3. **Confirmer la conversion :**
   - Cliquer sur "Convertir en Opportunité"
   - Vérifier que le modal se ferme
   - Vérifier que le bouton devient "Convertie" et se désactive
   - Vérifier que les statistiques se mettent à jour

### **Test 4 : Vérification des Contraintes**
1. **Tenter de convertir une entreprise non exécutée :**
   - Vérifier que le bouton "Convertir" est désactivé
   - Vérifier le message d'erreur si cliqué

2. **Tenter de convertir une entreprise déjà convertie :**
   - Vérifier que le bouton affiche "Convertie"
   - Vérifier que le bouton est désactivé

## 🔧 Tests Backend

### **Test 1 : API d'Exécution**
```bash
# Mettre à jour le statut d'exécution
curl -X PUT http://localhost:3000/api/prospecting/campaigns/[campaignId]/companies/[companyId]/execution \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "executionStatus": "deposed",
    "notes": "Courrier déposé manuellement"
  }'
```

### **Test 2 : API de Conversion**
```bash
# Convertir en opportunité
curl -X POST http://localhost:3000/api/prospecting/campaigns/[campaignId]/companies/[companyId]/convert \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Opportunité - Test",
    "value": 5000000,
    "description": "Test de conversion",
    "probability": 75,
    "closeDate": "2024-11-22"
  }'
```

## 📊 Vérifications Base de Données

### **Requêtes de Vérification**
```sql
-- Vérifier les entreprises converties
SELECT 
    c.name,
    pcc.execution_status,
    pcc.converted_to_opportunity,
    pcc.opportunity_id,
    pcc.execution_date
FROM prospecting_campaign_companies pcc
JOIN companies c ON pcc.company_id = c.id
WHERE pcc.converted_to_opportunity = TRUE;

-- Vérifier les statistiques d'exécution
SELECT 
    COUNT(*) as total_companies,
    COUNT(CASE WHEN execution_status = 'pending_execution' THEN 1 END) as pending_execution,
    COUNT(CASE WHEN execution_status = 'deposed' THEN 1 END) as deposed_count,
    COUNT(CASE WHEN execution_status = 'sent' THEN 1 END) as sent_count,
    COUNT(CASE WHEN converted_to_opportunity = TRUE THEN 1 END) as converted_count
FROM prospecting_campaign_companies pcc
WHERE pcc.campaign_id = '[campaignId]' 
AND pcc.validation_status = 'APPROVED';
```

## 🎯 Critères de Succès

### **Interface Utilisateur :**
- ✅ Modal de conversion s'ouvre correctement
- ✅ Formulaire pré-rempli avec les bonnes valeurs
- ✅ Validation des champs obligatoires
- ✅ Messages de succès/erreur appropriés
- ✅ Mise à jour en temps réel des statistiques
- ✅ Boutons correctement activés/désactivés

### **Fonctionnalité :**
- ✅ Conversion réussie en base de données
- ✅ Mise à jour du statut `converted_to_opportunity`
- ✅ Génération d'un `opportunity_id`
- ✅ Contraintes respectées (exécution requise)
- ✅ Pas de conversion multiple possible

### **Performance :**
- ✅ Réponse rapide des API (< 2 secondes)
- ✅ Interface réactive
- ✅ Pas d'erreurs JavaScript dans la console

## 🐛 Problèmes Potentiels

### **Problèmes Identifiés :**
1. **Bouton "Convertir" non activé :** Vérifier que l'entreprise est bien exécutée
2. **Modal ne s'ouvre pas :** Vérifier les erreurs JavaScript
3. **Conversion échoue :** Vérifier les logs du serveur
4. **Statistiques non mises à jour :** Vérifier le rechargement des données

### **Solutions :**
1. **Recharger la page** si l'interface semble bloquée
2. **Vérifier la console** pour les erreurs JavaScript
3. **Vérifier les logs du serveur** pour les erreurs backend
4. **Utiliser les outils de développement** pour déboguer les requêtes API

## 🎉 Validation de l'Étape 6

L'étape 6 est considérée comme **réussie** si :
- ✅ Toutes les fonctionnalités de conversion fonctionnent
- ✅ L'interface utilisateur est intuitive et réactive
- ✅ Les données sont correctement sauvegardées
- ✅ Les contraintes métier sont respectées
- ✅ Les statistiques se mettent à jour en temps réel

---

**🔗 URL de Test :** `http://localhost:3000/campaign-execution.html?id=3e16634e-e449-4df9-a65d-b4ac00cf8588`

**📋 Prochaine Étape :** Étape 7 - Intégration avec le système d'opportunités existant
