# Guide : Création Manuelle d'Entreprise

## 📋 Objectif

Permettre la création manuelle d'entreprises directement dans une source de prospection via l'interface utilisateur de la page `prospecting-sources.html`.

## 🔧 Modifications Apportées

### Frontend (prospecting-sources.html)

**Fichier modifié :** `public/prospecting-sources.html`

#### 1. Bouton de création
**Ajouté dans la section des entreprises :**
```html
<button class="btn btn-sm btn-success me-2" onclick="showCreateCompanyModal()">
    <i class="fas fa-plus me-1"></i>Créer une entreprise
</button>
```

#### 2. Modal de création
**Modal complet avec formulaire structuré :**
- **Informations principales** : Nom, Sigle, Secteur, Taille
- **Contact** : Email, Téléphone, Site web, SIRET
- **Localisation** : Pays, Ville, Adresse

#### 3. Fonctions JavaScript
**Nouvelles fonctions ajoutées :**
- `showCreateCompanyModal()` : Affiche le modal de création
- `createCompany()` : Crée l'entreprise via l'API

### Backend (prospecting.js)

**Fichier modifié :** `src/routes/prospecting.js`

#### Route API ajoutée
```javascript
router.post('/companies', authenticateToken, async (req, res) => {
    // Validation des champs obligatoires
    // Vérification de l'existence de la source
    // Vérification de l'unicité du nom dans la source
    // Création de l'entreprise
});
```

## 🎯 Fonctionnalités Disponibles

### Formulaire de Création

#### Champs Obligatoires
- **Nom de l'entreprise** : Nom complet de l'entreprise (obligatoire)

#### Champs Optionnels
- **Sigle** : Acronyme ou sigle de l'entreprise
- **Secteur d'activité** : Domaine d'activité
- **Taille** : TPE, PME, GE, ETI
- **Email** : Adresse email de contact
- **Téléphone** : Numéro de téléphone
- **Site web** : URL du site internet
- **SIRET/NIU** : Numéro d'identification
- **Pays** : Pays de l'entreprise (pré-rempli "Cameroun")
- **Ville** : Ville de localisation
- **Adresse** : Adresse complète

### Validations

#### Frontend
- Nom obligatoire
- Format email valide
- Format URL valide pour le site web
- Réinitialisation automatique du formulaire

#### Backend
- Validation des champs obligatoires
- Vérification de l'existence de la source
- Contrainte d'unicité : nom unique par source
- Nettoyage des données (trim, valeurs null)

## 🧪 Tests de Validation

### Tests Effectués

1. **Création d'entreprise complète** : Tous les champs renseignés
2. **Création d'entreprise minimale** : Seulement le nom obligatoire
3. **Test de contrainte d'unicité** : Même nom dans la même source
4. **Création avec sigle** : Entreprise avec sigle et informations de base

### Résultats

✅ **Tous les tests réussis**
- Création d'entreprises complètes et minimales
- Respect de la contrainte d'unicité
- Gestion des champs optionnels
- Validation des données

## 📱 Utilisation

### Étapes de Création

1. **Accéder à la page** : Aller sur `/prospecting-sources.html`
2. **Sélectionner une source** : Cliquer sur "Voir" pour une source existante
3. **Ouvrir le modal** : Cliquer sur "Créer une entreprise"
4. **Remplir le formulaire** :
   - Nom de l'entreprise (obligatoire)
   - Autres informations selon les besoins
5. **Créer l'entreprise** : Cliquer sur "Créer l'entreprise"

### Interface Utilisateur

#### Modal de Création
- **Design moderne** : Interface Bootstrap responsive
- **Sections organisées** : Informations principales, Contact, Localisation
- **Validation en temps réel** : Feedback utilisateur
- **Indicateur de chargement** : Spinner pendant la création

#### Messages de Feedback
- **Succès** : "Entreprise 'Nom' créée avec succès !"
- **Erreur de validation** : Messages spécifiques par champ
- **Erreur d'unicité** : "Une entreprise avec ce nom existe déjà dans cette source"

## 🔍 Exemples d'Utilisation

### Entreprise Complète
```
Nom: BANQUE ATLANTIQUE CAMEROUN
Sigle: BAC
Secteur: Banque
Taille: GE
Email: contact@banqueatlantique.cm
Téléphone: +237 233 42 10 66
Site web: https://www.banqueatlantique.cm
SIRET: M060800025028W
Pays: Cameroun
Ville: Douala
Adresse: Boulevard de la Liberté, Akwa
```

### Entreprise Minimale
```
Nom: NOUVELLE ENTREPRISE SARL
Sigle: (vide)
Secteur: (vide)
Taille: (vide)
Email: (vide)
Téléphone: (vide)
Site web: (vide)
SIRET: (vide)
Pays: Cameroun
Ville: (vide)
Adresse: (vide)
```

## 🚀 Avantages

1. **Flexibilité** : Création d'entreprises sans fichier CSV
2. **Rapidité** : Interface intuitive et rapide
3. **Complétude** : Tous les champs disponibles
4. **Validation** : Contrôles de qualité des données
5. **Intégration** : Entreprises immédiatement disponibles pour les campagnes

## 🔮 Évolutions Futures

1. **Modification d'entreprise** : Modal d'édition des entreprises existantes
2. **Import/Export** : Export des entreprises créées manuellement
3. **Templates** : Modèles prédéfinis par secteur
4. **Validation avancée** : Vérification de l'existence d'entreprises similaires
5. **Historique** : Suivi des entreprises créées manuellement

## 📝 Notes Techniques

### API Endpoint
- **URL** : `POST /api/prospecting/companies`
- **Authentification** : Token JWT requis
- **Content-Type** : `application/json`
- **Réponse** : 201 Created avec données de l'entreprise

### Base de Données
- **Table** : `companies`
- **Contrainte unique** : `(source_id, name)`
- **Timestamps** : `created_at`, `updated_at` automatiques
- **Relations** : `source_id` → `company_sources.id`

### Sécurité
- **Validation des données** : Nettoyage et validation côté serveur
- **Authentification** : Vérification du token utilisateur
- **Autorisation** : Accès aux sources selon les permissions

## ✅ Validation

- [x] Interface utilisateur fonctionnelle
- [x] API backend opérationnelle
- [x] Tests de validation réussis
- [x] Gestion des erreurs complète
- [x] Documentation complète
- [x] Intégration avec le système existant
