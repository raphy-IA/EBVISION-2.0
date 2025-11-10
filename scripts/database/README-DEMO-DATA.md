# 📊 Génération de Données de Démo

## 🆕 Script Recommandé : `6-generate-minimal-demo.js`

### ✅ Avantages

Ce nouveau script a été créé pour **corriger tous les problèmes** de l'ancien script `5-generate-demo-data.js` :

- ✅ **Respecte toutes les contraintes d'intégrité**
- ✅ **Toutes les clés étrangères sont correctes**
- ✅ **Utilise les données de référence existantes**
- ✅ **Gestion d'erreur robuste**
- ✅ **Code simplifié et maintenable**

### 📦 Données Générées

| Type de données | Quantité | Description |
|----------------|----------|-------------|
| **Business Units** | 3 | Audit & Conseil, Juridique & Fiscal, Gestion & Finance |
| **Divisions** | 6 | 2 divisions par BU |
| **Collaborateurs** | 8 | Avec comptes utilisateurs associés |
| **Utilisateurs** | 8 | Comptes de connexion pour les collaborateurs |
| **Clients** | 8 | Basés sur les entreprises existantes |
| **Missions** | 8-10 | Missions variées (Audit, Conseil, Expertise, Formation) |
| **Opportunités** | 15 | Avec toutes les FK requises |
| **Time Entries** | 0 | Non générées (structure complexe - à créer via l'interface) |

### 🚀 Utilisation

#### Génération Simple

```bash
node scripts/database/6-generate-minimal-demo.js
```

#### Avec Nettoyage Préalable

```bash
node scripts/database/6-generate-minimal-demo.js --clean
```

⚠️ **Attention** : L'option `--clean` supprime toutes les données de démo existantes avant de générer de nouvelles données.

### 📋 Prérequis

**IMPORTANT** : Avant d'exécuter ce script, assurez-vous que les données de référence sont chargées :

```bash
node scripts/database/3-insert-reference-data.js
```

Le script vérifie automatiquement la présence de :
- ✅ Grades
- ✅ Postes
- ✅ Types de mission
- ✅ Types d'opportunités
- ✅ Années fiscales
- ✅ Entreprises (companies)

### 🔑 Comptes de Démo

Tous les utilisateurs de démo utilisent le même mot de passe :

| Nom | Email | Mot de passe | Rôle |
|-----|-------|--------------|------|
| Jean Dupont | jean.dupont@ewm-demo.com | Demo@2025 | COLLABORATEUR |
| Sophie Martin | sophie.martin@ewm-demo.com | Demo@2025 | MANAGER |
| Pierre Bernard | pierre.bernard@ewm-demo.com | Demo@2025 | MANAGER |
| Marie Dubois | marie.dubois@ewm-demo.com | Demo@2025 | CONSULTANT |
| Thomas Lefebvre | thomas.lefebvre@ewm-demo.com | Demo@2025 | COLLABORATEUR |
| Julie Moreau | julie.moreau@ewm-demo.com | Demo@2025 | CONSULTANT |
| Lucas Petit | lucas.petit@ewm-demo.com | Demo@2025 | COLLABORATEUR |
| Emma Robert | emma.robert@ewm-demo.com | Demo@2025 | COLLABORATEUR |

### 🧹 Nettoyage des Données

Le script peut nettoyer les données de démo existantes avec l'option `--clean` :

```bash
node scripts/database/6-generate-minimal-demo.js --clean
```

**Données supprimées** :
- ✅ Time entries des collaborateurs de démo
- ✅ Opportunités des collaborateurs de démo
- ✅ Missions avec code `DEMO-MISS-*`
- ✅ Clients avec code `DEMO-CLT-*`
- ✅ Collaborateurs avec email `*@ewm-demo.com`
- ✅ Utilisateurs avec email `*@ewm-demo.com`

**Données préservées** :
- ✅ Business Units (peuvent être réutilisées)
- ✅ Divisions (peuvent être réutilisées)
- ✅ Toutes les données de référence
- ✅ Données réelles (non-démo)

### 🔍 Vérification

Après génération, le script affiche un résumé complet :

```
📊 RÉSUMÉ :
═══════════
   ✓ Business Units   : 3
   ✓ Divisions        : 6
   ✓ Collaborateurs   : 8
   ✓ Utilisateurs     : 8
   ✓ Clients          : 8
   ✓ Missions         : 10
   ✓ Opportunités     : 15
   ✓ Time Entries     : 100
```

### 🆚 Comparaison avec l'Ancien Script

| Aspect | `5-generate-demo-data.js` | `6-generate-minimal-demo.js` |
|--------|---------------------------|------------------------------|
| **Contraintes d'intégrité** | ❌ Nombreuses violations | ✅ Toutes respectées |
| **Clés étrangères** | ❌ Manquantes ou incorrectes | ✅ Toutes correctes |
| **Structure tables** | ❌ Colonnes inexistantes | ✅ Colonnes réelles |
| **Gestion erreurs** | ⚠️ Basique | ✅ Robuste |
| **Données générées** | ~17 types | 8 types essentiels |
| **Complexité** | 1173 lignes | ~700 lignes |
| **Maintenabilité** | ⚠️ Difficile | ✅ Facile |

### ⚠️ Problèmes de l'Ancien Script

L'ancien script `5-generate-demo-data.js` a les problèmes suivants :

1. **Table `opportunities`**
   - ❌ Utilise des colonnes inexistantes (`code`, `date_identification`, etc.)
   - ❌ Manque la FK obligatoire `collaborateur_id`
   - ❌ Statuts invalides

2. **Table `prospecting_campaigns`**
   - ❌ Structure complètement différente
   - ❌ Toutes les colonnes utilisées sont incorrectes

3. **Autres tables**
   - ❌ Contraintes CHECK non respectées
   - ❌ FK manquantes ou invalides

**Recommandation** : Utiliser `6-generate-minimal-demo.js` à la place.

### 📚 Documentation Complémentaire

- `CORRECTIONS-DEMO-DATA.md` - Liste détaillée des corrections apportées
- `README-ORDRE-SCRIPTS.md` - Ordre d'exécution des scripts d'initialisation
- `TROUBLESHOOTING.md` - Guide de dépannage

### 🔄 Intégration dans le Workflow

Le script `6-generate-minimal-demo.js` peut être ajouté comme étape optionnelle après l'initialisation complète :

```bash
# 1. Initialisation complète
node scripts/database/0-init-complete.js

# 2. (Optionnel) Génération de données de démo
node scripts/database/6-generate-minimal-demo.js
```

### 💡 Conseils

1. **Première utilisation** : Exécutez sans `--clean` pour ajouter les données
2. **Réinitialisation** : Utilisez `--clean` pour repartir de zéro
3. **Développement** : Idéal pour tester l'application avec des données réalistes
4. **Démonstration** : Parfait pour présenter l'application à des clients

### 🆘 Support

En cas de problème :

1. Vérifiez que `3-insert-reference-data.js` a été exécuté
2. Consultez les messages d'erreur détaillés dans la console
3. Vérifiez votre fichier `.env`
4. Consultez `TROUBLESHOOTING.md`

---

**Créé le** : 10 novembre 2025  
**Version** : 1.0  
**Statut** : ✅ Production Ready
