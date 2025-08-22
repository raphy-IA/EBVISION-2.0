# 🎯 Guide de Test - Création de Campagnes de Prospection

## ✅ Fonctionnalités Implémentées

### **Génération Automatique des Noms :**
- ✅ **Format :** `NomModèle-YY-MM-QNumeroSemaine-NumeroOrdre`
- ✅ **YY :** Année (2 chiffres)
- ✅ **MM :** Mois (2 chiffres)
- ✅ **QNumeroSemaine :** Numéro de semaine dans le mois
- ✅ **NumeroOrdre :** Numéro séquentiel (01, 02, 03...)

### **Filtrage des Responsables :**
- ✅ **Par Business Unit :** Seuls les collaborateurs de la BU du modèle sont affichés
- ✅ **Mise à jour automatique :** La liste se met à jour quand on change de modèle
- ✅ **Validation :** Responsable obligatoire

### **Enregistrement Automatique :**
- ✅ **Créateur :** Utilisateur connecté (automatique)
- ✅ **Date de création :** Date/heure actuelle (automatique)

## 🧪 Tests à Effectuer

### **Test 1 : Création d'une Campagne Email**
1. Aller sur : `http://localhost:3000/prospecting-campaigns.html`
2. Cliquer sur "Nouvelle campagne"
3. ✅ Vérifier que le champ "Nom de la campagne" est en lecture seule
4. ✅ Vérifier le texte d'aide : "Le nom est généré automatiquement selon le format : NomModèle-YY-MM-QNumeroSemaine-NumeroOrdre"
5. Sélectionner un modèle Email
6. ✅ Vérifier que le nom se génère automatiquement
7. ✅ Vérifier que seuls les responsables de la BU du modèle sont affichés
8. Sélectionner un responsable
9. Choisir une date de lancement
10. ✅ Vérifier que le nom se met à jour avec la nouvelle date
11. Remplir la description (optionnel)
12. Cliquer sur "Créer la campagne"
13. ✅ Vérifier que la campagne est créée avec succès

### **Test 2 : Création d'une Campagne Courrier**
1. Créer une nouvelle campagne
2. Sélectionner un modèle Courrier physique
3. ✅ Vérifier que le nom se génère automatiquement
4. ✅ Vérifier que seuls les responsables de la BU du modèle sont affichés
5. ✅ Vérifier que la configuration automatique affiche "Courrier physique"
6. Compléter et sauvegarder
7. ✅ Vérifier que la campagne est créée

### **Test 3 : Test de Numérotation**
1. Créer une première campagne avec un modèle et une date
2. Noter le nom généré (ex: `Modèle-25-08-Q4-01`)
3. Créer une deuxième campagne avec le même modèle et la même date
4. ✅ Vérifier que le nom se termine par `-02`
5. Créer une troisième campagne
6. ✅ Vérifier que le nom se termine par `-03`

### **Test 4 : Test de Changement de Date**
1. Créer une campagne
2. Sélectionner un modèle
3. Noter le nom généré
4. Changer la date de lancement
5. ✅ Vérifier que le nom se met à jour avec la nouvelle date
6. ✅ Vérifier que YY et MM changent selon la date
7. ✅ Vérifier que le numéro de semaine change selon la date

### **Test 5 : Test de Filtrage des Responsables**
1. Créer une campagne
2. Sélectionner un modèle d'une BU spécifique
3. ✅ Vérifier que seuls les collaborateurs de cette BU sont affichés
4. Changer de modèle (BU différente)
5. ✅ Vérifier que la liste des responsables se met à jour
6. ✅ Vérifier que seuls les collaborateurs de la nouvelle BU sont affichés

### **Test 6 : Test de Validation**
1. Créer une campagne
2. Sélectionner un modèle
3. Ne pas sélectionner de responsable
4. Tenter de sauvegarder
5. ✅ Vérifier que l'erreur "Veuillez sélectionner un responsable de la campagne" apparaît
6. Sélectionner un responsable
7. ✅ Vérifier que la sauvegarde fonctionne

## 🔧 Vérifications Techniques

### **Console (F12)**
- ✅ Pas d'erreur lors de la génération du nom
- ✅ Pas d'erreur lors du filtrage des responsables
- ✅ Pas d'erreur lors de la création de la campagne
- ✅ Messages de debug pour le filtrage des responsables

### **Requêtes API**
```bash
# Créer une campagne (exemple)
curl -X POST http://localhost:3000/api/prospecting/campaigns \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EB-AUDIT-Email-GeneralServices-01-25-08-Q4-01",
    "template_id": "template_id",
    "responsible_id": "responsible_id",
    "scheduled_date": "2025-08-22",
    "priority": "NORMAL",
    "description": "Description de test",
    "channel": "EMAIL",
    "business_unit_id": "bu_id",
    "division_id": "division_id",
    "created_by": "user_id",
    "created_at": "2025-08-22T18:30:00.000Z"
  }'
```

### **Réponses Attendues :**
```json
// Succès
{
  "success": true,
  "data": {
    "id": "campaign_id",
    "name": "EB-AUDIT-Email-GeneralServices-01-25-08-Q4-01",
    "created_by": "user_id",
    "created_at": "2025-08-22T18:30:00.000Z"
  }
}

// Échec - Validation
{
  "success": false,
  "error": "Veuillez sélectionner un responsable de la campagne"
}
```

## 📊 Vérifications Base de Données

### **Requêtes de Vérification**
```sql
-- Vérifier les campagnes créées récemment
SELECT pc.id, pc.name, pc.template_id, pc.responsible_id, pc.created_by, pc.created_at,
       pt.name as template_name, c.nom as responsible_name, u.nom as creator_name
FROM prospecting_campaigns pc
LEFT JOIN prospecting_templates pt ON pc.template_id = pt.id
LEFT JOIN collaborateurs c ON pc.responsible_id = c.id
LEFT JOIN users u ON pc.created_by = u.id
WHERE pc.created_at > NOW() - INTERVAL '1 hour'
ORDER BY pc.created_at DESC;

-- Vérifier les collaborateurs par BU
SELECT c.id, c.nom, c.prenom, c.business_unit_id, bu.nom as bu_name
FROM collaborateurs c
LEFT JOIN business_units bu ON c.business_unit_id = bu.id
ORDER BY bu.nom, c.nom;

-- Compter les campagnes par créateur
SELECT u.nom as creator_name, COUNT(pc.id) as campaign_count
FROM prospecting_campaigns pc
LEFT JOIN users u ON pc.created_by = u.id
GROUP BY u.id, u.nom
ORDER BY campaign_count DESC;
```

## 🎯 Critères de Succès

La création de campagnes fonctionne correctement si :
- ✅ Génération automatique des noms selon le format spécifié
- ✅ Numérotation automatique (01, 02, 03...)
- ✅ Filtrage des responsables par Business Unit
- ✅ Mise à jour du nom lors du changement de date
- ✅ Enregistrement automatique du créateur
- ✅ Enregistrement automatique de la date de création
- ✅ Validation des champs obligatoires
- ✅ Interface utilisateur réactive et intuitive
- ✅ Pas d'erreurs JavaScript dans la console

## 🐛 Problèmes Potentiels

### **Si la génération du nom ne fonctionne pas :**
1. **Vérifier la console** pour les erreurs JavaScript
2. **Vérifier que le modèle est sélectionné** avant la génération
3. **Vérifier la date** sélectionnée
4. **Recharger la page** et réessayer

### **Si le filtrage des responsables ne fonctionne pas :**
1. **Vérifier que le modèle a une BU** assignée
2. **Vérifier qu'il y a des collaborateurs** dans cette BU
3. **Vérifier la console** pour les erreurs de requête API
4. **Vérifier les logs du serveur** pour les erreurs backend

### **Si la création échoue :**
1. **Vérifier que tous les champs obligatoires** sont remplis
2. **Vérifier les logs du serveur** pour les erreurs backend
3. **Vérifier la console** pour les erreurs JavaScript
4. **Vérifier que l'utilisateur est connecté** et a les permissions

## 🎉 Validation de la Fonctionnalité

La fonctionnalité est **réussie** si :
- ✅ Génération automatique des noms fonctionnelle
- ✅ Filtrage des responsables par BU opérationnel
- ✅ Enregistrement automatique du créateur et de la date
- ✅ Numérotation automatique correcte
- ✅ Interface utilisateur cohérente et intuitive
- ✅ Validation des données appropriée
- ✅ Gestion d'erreurs robuste

---

**🔗 URL de Test :** `http://localhost:3000/prospecting-campaigns.html`

**📋 Prochaine Étape :** Test complet du cycle de vie des campagnes (création, modification, affectation d'entreprises, validation, exécution)
