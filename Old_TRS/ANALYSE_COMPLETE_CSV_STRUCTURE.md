# ANALYSE COMPLÈTE DES FICHIERS CSV - STRUCTURE ET DONNÉES

## 📊 **RÉSUMÉ EXÉCUTIF**

Après analyse approfondie de tous les fichiers CSV, voici la structure complète et les données disponibles pour chaque fichier :

---

## 📁 **1. DONNÉES_TRS.CSV** - Données de temps de travail

### **Structure :**
- **Lignes :** 2,620
- **Colonnes :** 14
- **Séparateur :** `;`

### **Colonnes principales :**
- `Nom` : Nom complet de l'employé
- `Initiales` : Initiales de l'employé
- `BU` : Business Unit (Finances, Law, Douane, RH, Audit, Support)
- `Grade` : Niveau hiérarchique (ASSISTANT, SUPERVISOR, SENIOR, MANAGER, DIRECTOR, PARTNER, etc.)
- `Code Mission` : Code de la mission
- `Missions` : Description de la mission
- `Heures` : Nombre d'heures travaillées
- `Type Heure` : Type d'heure (HC = Heures Client, HNC = Heures Non Client)
- `Mois` : **Date au format DD/MM/YYYY** (ex: 01/01/2025, 01/02/2025)
- `Statut` : Statut de validation (En Attente Validation, APPROUVE, En cours d'édition)

### **Périodes couvertes :**
- **Années :** 2025 (principalement)
- **Mois :** Janvier à Mai 2025
- **Format dates :** ✅ **CORRIGÉ** - DD/MM/YYYY

---

## 📁 **2. LISTE DES FACTURES.CSV** - Données de facturation

### **Structure :**
- **Lignes :** 761
- **Colonnes :** 12
- **Séparateur :** `;`

### **Colonnes principales :**
- `Client` : Nom du client
- `Mission` : Description de la mission
- `Division` : Division (Tax, Legal Services, Audit, Assurance, Douane, Finances, RH)
- `Invoice N°` : Numéro de facture
- `Date` : **Date au format DD/MM/YYYY** (ex: 07/06/2021, 08/06/2021)
- `Manager` : Manager responsable
- `Partner` : Partner associé
- `Etat` : État de la facture (En attente, Payé)
- `Montant facturé` : Montant facturé
- `Montant payé` : Montant payé
- `Solde à payer` : Solde restant

### **Périodes couvertes :**
- **Années :** 2021, 2022, 2023, 2024, 2025
- **Format dates :** ✅ **CORRECT** - DD/MM/YYYY

---

## 📁 **3. LISTE DES OPPORTUNITÉS.CSV** - Pipeline commercial

### **Structure :**
- **Lignes :** 761
- **Colonnes :** 22
- **Séparateur :** `;`

### **Colonnes principales :**
- `Division` : Division (Tax, Audit, Legal Services, Finances, RH, Douane)
- `Date Insertion` : **Date au format DD/MM/YYYY** (ex: 10/06/2022)
- `Client` : Nom du client
- `Opportunite` : Description de l'opportunité
- `Type` : Type d'opportunité
- `Initiative` : Source de l'initiative
- `cout` : Coût estimé
- `% probabilité Succès` : Probabilité de succès
- `Date Dernière action` : Date de la dernière action
- `Date prochaine action` : Date de la prochaine action
- `Statut` : Statut de l'opportunité (1-Identified, 2-Contacted, 3-Proposed, 4-Win, 5-Loss, 7-Shortlisted)
- `Source` : Source de l'opportunité
- `Pays` : Pays (principalement Cameroun)
- `Secteur` : Secteur d'activité
- `Responsable` : Responsable de l'opportunité
- `Associe` : Associé responsable
- `Date Limite Soumission` : Date limite de soumission
- `Date Reception AO` : Date de réception de l'appel d'offres
- `Confidentiel` : Si confidentiel (Oui/Non)
- `Nouveau Client` : Si nouveau client (Oui/Non)
- `Contact du Client` : Contact du client
- `Net fees prob.` : Honoraires probables

### **Périodes couvertes :**
- **Années :** 2022, 2023, 2024, 2025
- **Format dates :** ✅ **CORRECT** - DD/MM/YYYY

---

## 📁 **4. LISTE DES MISSIONS.CSV** - Gestion des missions

### **Structure :**
- **Lignes :** 356
- **Colonnes :** 15
- **Séparateur :** `;`

### **Colonnes principales :**
- `Client` : Nom du client
- `Mission` : Description de la mission
- `Code Job` : Code de la mission
- `Division` : Division (Tax, Legal Services, Audit, Douane, Finances, RH, EB Service)
- `Manager` : Manager responsable
- `Montant Contrat` : Montant du contrat
- `Montant Débours` : Montant des débours
- `Honoraire` : Honoraires
- `% Avancement` : Pourcentage d'avancement
- `Montant Réalisé` : Montant réalisé
- `Facturation` : Montant facturé
- `%facturation` : Pourcentage de facturation
- `Encaissement` : Montant encaissé
- `%encaissement` : Pourcentage d'encaissement
- `Travail en cours` : Travail en cours

### **Périodes couvertes :**
- **Dates :** ⚠️ **AUCUNE COLONNE DATE** - Pas de dates explicites
- **Données :** Missions en cours avec montants et pourcentages

---

## 📁 **5. FICHIERS SUPPLÉMENTAIRES**

### **initiales.csv**
- **Contenu :** Mapping des initiales vers noms complets
- **Usage :** Jointure avec données_TRS.csv

### **Taux horaire par grade.csv**
- **Contenu :** Taux horaires par grade
- **Usage :** Calculs de rentabilité

---

## 🔍 **ANALYSE DES PROBLÈMES IDENTIFIÉS**

### **1. Problème des filtres d'années :**
- **Cause :** Le code ne lit que les dates de `données_TRS.csv` (2025)
- **Solution :** Inclure les dates de tous les fichiers dans les filtres

### **2. Jointures possibles :**
- `données_TRS.csv` ↔ `liste des factures.csv` : Par Client/Mission
- `données_TRS.csv` ↔ `liste des opportunités.csv` : Par Client/Division
- `données_TRS.csv` ↔ `liste des missions.csv` : Par Client/Mission
- `données_TRS.csv` ↔ `initiales.csv` : Par Initiales

### **3. Données manquantes :**
- `liste des missions.csv` : Pas de dates explicites
- Certains clients n'apparaissent que dans certains fichiers

---

## 🎯 **RECOMMANDATIONS POUR LES FILTRES**

### **Filtres par onglet :**

#### **Onglet "Vue d'ensemble" :**
- **Années :** 2021-2025 (tous les fichiers)
- **Mois :** Tous les mois disponibles
- **Divisions :** Tax, Legal Services, Audit, Douane, Finances, RH, Support
- **Grades :** Tous les grades
- **Clients :** Tous les clients

#### **Onglet "Rentabilité" :**
- **Années :** 2021-2025 (factures + TRS)
- **Divisions :** Toutes
- **Clients :** Tous
- **Missions :** Toutes

#### **Onglet "Performance" :**
- **Années :** 2021-2025 (TRS + opportunités)
- **Divisions :** Toutes
- **Grades :** Tous
- **Statuts :** Tous

#### **Onglet "Pipeline" :**
- **Années :** 2022-2025 (opportunités)
- **Divisions :** Toutes
- **Statuts :** 1-Identified, 2-Contacted, 3-Proposed, 4-Win, 5-Loss, 7-Shortlisted
- **Sources :** Toutes

---

## 🔧 **CORRECTIONS NÉCESSAIRES**

### **1. Mise à jour des filtres :**
- Inclure toutes les années disponibles (2021-2025)
- Lire les dates de tous les fichiers CSV
- Créer des filtres spécifiques par onglet

### **2. Amélioration des jointures :**
- Implémenter des jointures intelligentes entre fichiers
- Gérer les cas où les données ne correspondent pas exactement

### **3. Gestion des données manquantes :**
- Traiter les cas où les dates sont manquantes
- Normaliser les formats de données

---

## 📈 **MÉTRIQUES DISPONIBLES**

### **Par fichier :**
- **TRS :** Heures travaillées, rentabilité par personne/division
- **Factures :** Chiffre d'affaires, encaissements, solde à payer
- **Opportunités :** Pipeline commercial, probabilité de succès
- **Missions :** Avancement des projets, facturation vs réalisation

### **Croisées :**
- Rentabilité par client/division
- Performance par grade/personne
- Pipeline vs réalisation
- Facturation vs heures travaillées 