# Guide de Test - Processus Complet de Prospection

## 🎯 Objectif
Vérifier que le processus complet de prospection fonctionne correctement depuis la création jusqu'aux rapports.

## 📋 Étapes de Test

### 1. **Création d'une Campagne** 
**URL:** `http://localhost:3000/prospecting-campaigns.html`

**Actions à tester:**
- [ ] Cliquer sur "Créer campagne"
- [ ] Remplir le formulaire :
  - Nom de la campagne : "Test Campagne Prospection"
  - Responsable : Sélectionner un collaborateur
  - Modèle : Sélectionner un template (obligatoire)
- [ ] Vérifier que la configuration automatique s'affiche (canal, BU, division)
- [ ] Cliquer sur "Créer la campagne"
- [ ] Vérifier que la campagne apparaît dans la liste avec le statut "BROUILLON"

### 2. **Affectation d'Entreprises**
**Actions à tester:**
- [ ] Cliquer sur "Affecter" pour la campagne créée
- [ ] Vérifier que le modal s'ouvre avec 3 sections :
  - Source d'entreprises (gauche)
  - Entreprises sélectionnées (centre)
  - Entreprises affectées (droite)
- [ ] Sélectionner une source d'entreprises
- [ ] Vérifier que les entreprises s'affichent avec leurs détails
- [ ] Sélectionner quelques entreprises et les ajouter
- [ ] Cliquer sur "Sauvegarder les affectations"
- [ ] Vérifier que les entreprises sont bien affectées

### 3. **Soumission pour Validation**
**Actions à tester:**
- [ ] Cliquer sur "Soumettre" pour la campagne
- [ ] Vérifier que le statut passe à "EN_VALIDATION"
- [ ] Vérifier qu'un message de confirmation s'affiche

### 4. **Validation de la Campagne**
**URL:** `http://localhost:3000/prospecting-validations.html`

**Actions à tester:**
- [ ] Se connecter avec un compte manager/validateur
- [ ] Vérifier que la campagne apparaît dans la liste des validations
- [ ] Cliquer sur "Traiter la validation"
- [ ] Vérifier que le modal s'ouvre avec :
  - Détails de la campagne
  - Liste des entreprises avec cases OK/NON OK
  - Champ pour notes par entreprise
  - Champ pour commentaire général
- [ ] Cocher OK pour certaines entreprises, NON OK pour d'autres
- [ ] Ajouter des notes explicatives
- [ ] Cliquer sur "Valider" ou "Rejeter"
- [ ] Vérifier que le statut de la campagne change

### 5. **Exécution de la Campagne** (si validée)
**Actions à tester:**
- [ ] Retourner sur `prospecting-campaigns.html`
- [ ] Vérifier que le bouton "Affecter" est maintenant "Exécuter"
- [ ] Cliquer sur "Exécuter"
- [ ] Vérifier que seules les entreprises approuvées sont visibles
- [ ] Marquer certaines entreprises comme "Déposé" ou "Envoyé"
- [ ] Ajouter des notes d'exécution
- [ ] Sauvegarder les statuts d'exécution

### 6. **Conversion en Opportunités**
**Actions à tester:**
- [ ] Pour une entreprise exécutée, vérifier qu'un bouton "Convertir en opportunité" apparaît
- [ ] Cliquer sur ce bouton
- [ ] Vérifier qu'un modal s'ouvre pour créer l'opportunité
- [ ] Remplir les informations de l'opportunité
- [ ] Confirmer la conversion
- [ ] Vérifier que l'entreprise est marquée comme convertie

### 7. **Rapports de Prospection**
**URL:** `http://localhost:3000/prospecting-reports.html`

**Actions à tester:**
- [ ] Vérifier que la page se charge correctement
- [ ] Vérifier que les métriques s'affichent :
  - Courriers déposés
  - Emails envoyés
  - En attente d'exécution
  - Converties en opportunités
  - Taux d'exécution
  - Taux de conversion
- [ ] Tester les filtres :
  - Business Unit
  - Division
  - Statut de campagne
  - Période
- [ ] Vérifier que le tableau des campagnes affiche :
  - Nom de la campagne
  - Statut
  - BU/Division
  - Type de dépôt
  - Total entreprises
  - Métriques d'exécution
  - Responsable
  - Date création

## 🔍 Points de Vérification

### Base de Données
- [ ] Vérifier que `validation_status` est mis à jour lors de la validation
- [ ] Vérifier que `execution_status` est mis à jour lors de l'exécution
- [ ] Vérifier que `converted_to_opportunity` est mis à jour lors de la conversion
- [ ] Vérifier que la vue `prospecting_campaign_summary` retourne des données correctes

### API
- [ ] Tester `POST /api/prospecting/campaigns` (création)
- [ ] Tester `POST /api/prospecting/campaigns/:id/submit` (soumission)
- [ ] Tester `POST /api/prospecting/campaigns/:id/validate` (validation)
- [ ] Tester `PUT /api/prospecting/campaigns/:id/companies/:companyId/execution` (exécution)
- [ ] Tester `POST /api/prospecting/campaigns/:id/companies/:companyId/convert` (conversion)
- [ ] Tester `GET /api/prospecting/reports` (rapports)

## 🚨 Problèmes Potentiels à Identifier

1. **Validation par entreprise** : Les statuts individuels ne sont pas sauvegardés
2. **Exécution** : Impossible de marquer les courriers comme déposés/envoyés
3. **Conversion** : Le bouton de conversion n'apparaît pas
4. **Rapports** : Les métriques sont à zéro ou incorrectes
5. **Permissions** : Accès refusé pour certaines actions

## 📝 Notes de Test

**Date du test:** _______________
**Testeur:** _______________
**Résultat global:** □ Réussi □ Échec □ Partiel

**Problèmes identifiés:**
1. _________________________________
2. _________________________________
3. _________________________________

**Actions correctives nécessaires:**
1. _________________________________
2. _________________________________
3. _________________________________

