# 📚 Guide Complet des Scripts de Génération de Données de Démo

## 🎯 Vue d'Ensemble

Ce document récapitule tous les scripts disponibles pour générer des données de démonstration dans l'application EB-Vision 2.0.

## 📋 Scripts Disponibles

### 1. **Script 6 : Génération Minimale** ❌ OBSOLÈTE
**Fichier** : `6-generate-minimal-demo.js`

**Statut** : ⚠️ **Ne plus utiliser** - Remplacé par le script 7

**Problèmes** :
- ❌ Pas de campagnes de prospection
- ❌ Codes mission incorrects (affichent "NA")
- ❌ Time entries non générées
- ❌ Factures non liées aux missions

---

### 2. **Script 7 : Génération Complète** ✅ RECOMMANDÉ
**Fichier** : `7-generate-complete-demo.js`

**Statut** : ✅ **Production Ready** - Utiliser ce script

#### Données Générées

| Type de données | Quantité | Description |
|----------------|----------|-------------|
| **Business Units** | 3 | Audit & Conseil, Juridique & Fiscal, Gestion & Finance |
| **Divisions** | 6 | 2 divisions par BU |
| **Collaborateurs** | 8 | Avec comptes utilisateurs associés |
| **Utilisateurs** | 8 | Comptes de connexion actifs |
| **Clients** | 8 | Basés sur les entreprises existantes |
| **Campagnes** | 4 | Campagnes de prospection EMAIL et PHYSIQUE |
| **Missions** | 10 | Avec codes corrects (MISS-DEMO-001, etc.) |
| **Opportunités** | 15 | Avec toutes les FK requises |
| **Time Sheets** | 50 | Feuilles de temps hebdomadaires |
| **Time Entries** | 250 | Heures chargeables (HC) et non chargeables (HNC) |
| **Factures** | 6 | Liées aux missions avec montants réalistes |

#### Utilisation

```bash
# Génération complète
node scripts/database/7-generate-complete-demo.js

# Avec nettoyage préalable des données de démo
node scripts/database/7-generate-complete-demo.js --clean
```

#### Comptes de Démo

**Mot de passe unique** : `Demo@2025`

| Nom | Email | Rôle |
|-----|-------|------|
| Jean Dupont | jean.dupont@ewm-demo.com | COLLABORATEUR |
| Sophie Martin | sophie.martin@ewm-demo.com | MANAGER |
| Pierre Bernard | pierre.bernard@ewm-demo.com | MANAGER |
| Marie Dubois | marie.dubois@ewm-demo.com | CONSULTANT |
| Thomas Lefebvre | thomas.lefebvre@ewm-demo.com | COLLABORATEUR |
| Julie Moreau | julie.moreau@ewm-demo.com | CONSULTANT |
| Lucas Petit | lucas.petit@ewm-demo.com | COLLABORATEUR |
| Emma Robert | emma.robert@ewm-demo.com | COLLABORATEUR |

## ✅ Corrections Apportées (Script 7 vs Script 6)

### 1. Campagnes de Prospection
**Avant (Script 6)** : ❌ Non créées
**Après (Script 7)** : ✅ 4 campagnes créées
- Liées aux Business Units et Divisions
- Avec responsables (utilisateurs)
- Statuts et dates planifiées

### 2. Codes Mission
**Avant (Script 6)** : ❌ Affichent "NA" ou codes incorrects
**Après (Script 7)** : ✅ Codes corrects
- Format : `MISS-DEMO-001`, `MISS-DEMO-002`, etc.
- Codes uniques et séquentiels

### 3. Liens BU/Division pour Missions
**Avant (Script 6)** : ❌ Liens manquants ou non visibles
**Après (Script 7)** : ✅ Tous les liens présents
- `business_unit_id` ✅
- `division_id` ✅
- `collaborateur_id` ✅
- `mission_type_id` ✅
- `fiscal_year_id` ✅

### 4. Factures
**Avant (Script 6)** : ❌ Pas de référence aux missions
**Après (Script 7)** : ✅ Factures liées aux missions
- Chaque facture a un `mission_id`
- Montants basés sur le budget de la mission
- Statuts variés (EMISE, ENVOYEE, PAYEE, EN_RETARD)

### 5. Time Entries
**Avant (Script 6)** : ❌ Non générées (0 entrées)
**Après (Script 7)** : ✅ 250 entrées créées
- 50 time sheets (feuilles hebdomadaires)
- 250 time entries sur 3 mois
- Types HC (Heures Chargeables) sur missions
- Types HNC (Heures Non Chargeables) sur activités internes
- **Visibles dans les dashboards et rapports** ✅

## 📊 Visibilité dans l'Application

### Dashboard Missions
- ✅ 10 missions avec codes corrects
- ✅ Business Units et Divisions affichées
- ✅ Collaborateurs assignés
- ✅ Statuts variés (PLANIFIEE, EN_COURS, TERMINEE)

### Dashboard Temps
- ✅ 250 entrées de temps
- ✅ Réparties sur missions et activités internes
- ✅ Graphiques de temps chargeable vs non chargeable
- ✅ Feuilles de temps hebdomadaires

### Dashboard Facturation
- ✅ 6 factures
- ✅ Liées aux missions
- ✅ Montants et statuts variés
- ✅ Calculs TVA corrects

### Dashboard Prospection
- ✅ 4 campagnes actives
- ✅ Avec responsables et dates
- ✅ Canaux EMAIL et PHYSIQUE

## 🔧 Prérequis

Avant d'exécuter le script 7, assurez-vous que :

1. ✅ La base de données est initialisée
2. ✅ Les données de référence sont chargées (script 3)
3. ✅ Les permissions sont synchronisées

**Commande complète d'initialisation** :
```bash
node scripts/database/0-init-complete.js
```

## 🧹 Nettoyage des Données

Le script 7 avec l'option `--clean` supprime uniquement les données de démo :

**Données supprimées** :
- ✅ Factures (FACT-DEMO-*)
- ✅ Time entries des utilisateurs de démo
- ✅ Time sheets des utilisateurs de démo
- ✅ Opportunités des collaborateurs de démo
- ✅ Missions (MISS-DEMO-*)
- ✅ Campagnes (nom contient "DEMO")
- ✅ Clients (CLT-DEMO-*)
- ✅ Collaborateurs (@ewm-demo.com)
- ✅ Utilisateurs (@ewm-demo.com)

**Données préservées** :
- ✅ Business Units (peuvent être réutilisées)
- ✅ Divisions (peuvent être réutilisées)
- ✅ Toutes les données de référence
- ✅ Données réelles (non-démo)

## 📝 Ordre d'Exécution Recommandé

```bash
# 1. Initialisation complète (si première fois)
node scripts/database/0-init-complete.js

# 2. Génération des données de démo
node scripts/database/7-generate-complete-demo.js

# 3. (Optionnel) Régénération avec nettoyage
node scripts/database/7-generate-complete-demo.js --clean
```

## 🆘 Dépannage

### Erreur : "Données de référence manquantes"
**Solution** : Exécutez d'abord `3-insert-reference-data.js`

### Erreur : "Aucune année fiscale disponible"
**Solution** : Vérifiez que les années fiscales sont créées dans les données de référence

### Erreur : FK violation sur responsible_id (campagnes)
**Solution** : Le script 7 corrige automatiquement ce problème en vérifiant les userIds

### Les time entries ne s'affichent pas
**Solution** : Vérifiez que :
- Les time_sheets ont bien été créés
- Les time_entries ont un `time_sheet_id` valide
- Le statut est 'approved' ou 'validé'

## 📚 Documentation Complémentaire

- `CORRECTIONS-DEMO-DATA.md` - Liste détaillée des corrections
- `README-ORDRE-SCRIPTS.md` - Ordre d'exécution des scripts d'initialisation
- `TROUBLESHOOTING.md` - Guide de dépannage
- `README-DEMO-DATA.md` - Documentation du script 6 (obsolète)

## 🎯 Recommandation Finale

**Utilisez toujours le script 7** (`7-generate-complete-demo.js`) pour générer des données de démo complètes et cohérentes. Le script 6 est obsolète et ne doit plus être utilisé.

---

**Dernière mise à jour** : 10 novembre 2025  
**Version** : 2.0  
**Statut** : ✅ Production Ready
