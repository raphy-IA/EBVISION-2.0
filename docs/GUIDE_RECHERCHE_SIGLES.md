# Guide : Recherche sur les Sigles d'Entreprises

## 📋 Objectif

Permettre la recherche d'entreprises non seulement par nom, mais aussi par leur sigle dans le modal "Affecter des entreprises à la campagne" de la page `prospecting-campaigns.html`.

## 🔧 Modifications Apportées

### Frontend (prospecting-campaigns.html)

**Fichier modifié :** `public/prospecting-campaigns.html`

**Fonction modifiée :** `applyFilters()` (ligne ~1370)

**Modification :**
```javascript
// AVANT
const matchesSearch = !searchTerm || 
    company.name.toLowerCase().includes(searchTerm) ||
    (company.industry && company.industry.toLowerCase().includes(searchTerm)) ||
    (company.city && company.city.toLowerCase().includes(searchTerm));

// APRÈS
const matchesSearch = !searchTerm || 
    company.name.toLowerCase().includes(searchTerm) ||
    (company.sigle && company.sigle.toLowerCase().includes(searchTerm)) ||
    (company.industry && company.industry.toLowerCase().includes(searchTerm)) ||
    (company.city && company.city.toLowerCase().includes(searchTerm));
```

### Backend (déjà fonctionnel)

**Fichier :** `src/models/Prospecting.js`

**Méthode :** `Company.search()` (ligne ~147)

**Fonctionnalité existante :**
```javascript
conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR website ILIKE $${idx} OR sigle ILIKE $${idx})`);
```

La recherche backend inclut déjà les sigles dans la recherche.

## 🎯 Fonctionnalités Disponibles

### Recherche Frontend (Modal "Affecter des entreprises à la campagne")

- **Recherche par nom d'entreprise** : Recherche dans le nom complet de l'entreprise
- **Recherche par sigle** : Recherche dans le sigle/acronyme de l'entreprise
- **Recherche par secteur** : Recherche dans le secteur d'activité
- **Recherche par ville** : Recherche dans la ville de l'entreprise
- **Recherche insensible à la casse** : Les recherches sont converties en minuscules
- **Recherche partielle** : Correspondance sur une partie du texte

### Recherche Backend (Page "Sources d'entreprises")

- **API endpoint** : `GET /api/prospecting/companies/search`
- **Paramètres de recherche** : `q` (recherche générale)
- **Champs recherchés** : nom, sigle, email, site web
- **Recherche insensible à la casse** : Utilisation de `ILIKE` en SQL

## 🧪 Tests de Validation

### Tests Effectués

1. **Sigle exact** : "CAMACO" → Trouve "CAMEROON MARKETING COMMODITIES"
2. **Sigle avec espaces** : "MOVIS CAMEROUN" → Trouve "MOVIS CAMEROUN"
3. **Sigle avec caractères spéciaux** : "B.E.A.C" → Trouve "BANQUE DES ETATS DE L' AFRIQUE CENTRALE"
4. **Recherche partielle** : "CAM" → Trouve plusieurs entreprises
5. **Recherche par nom** : "CAMEROON" → Trouve entreprises avec sigles

### Résultats

✅ **Tous les tests réussis**
- Recherche frontend fonctionnelle
- Recherche backend fonctionnelle
- Gestion des espaces et caractères spéciaux
- Recherche insensible à la casse

## 📱 Utilisation

### Dans le Modal "Affecter des entreprises à la campagne"

1. Ouvrir une campagne de prospection
2. Cliquer sur "Affecter des entreprises"
3. Sélectionner une source d'entreprises
4. Utiliser le champ de recherche pour taper :
   - Un nom d'entreprise (ex: "CAMEROON")
   - Un sigle (ex: "CAMACO", "UBA", "B.E.A.C")
   - Une partie de sigle (ex: "CAM")
5. Les résultats s'affichent en temps réel

### Dans la Page "Sources d'entreprises"

1. Aller sur `/prospecting-sources.html`
2. Sélectionner une source
3. Utiliser le champ de recherche pour taper :
   - Un nom d'entreprise
   - Un sigle
   - Une partie de texte
4. Les résultats s'affichent avec pagination

## 🔍 Exemples de Recherche

### Sigles Courts
- `UBA` → United Bank for Africa
- `CDC` → Cameroon Development Corporation
- `SNI` → Société Nationale d'Investissement

### Sigles avec Espaces
- `MOVIS CAMEROUN` → MOVIS CAMEROUN
- `ARMADA SARL` → ARMURERIE ADAMOU SARL
- `TOTAL MBOUDA II` → BALEBA MBENOUN JUSTIN

### Sigles avec Caractères Spéciaux
- `B.E.A.C` → Banque des États de l'Afrique Centrale
- `C.A.T` → Compagnie Africaine des Tabacs
- `S.A.R.L` → Diverses entreprises

## 🚀 Avantages

1. **Recherche plus efficace** : Possibilité de trouver rapidement une entreprise par son sigle
2. **Expérience utilisateur améliorée** : Recherche intuitive et rapide
3. **Cohérence** : Même logique de recherche frontend et backend
4. **Flexibilité** : Recherche partielle et insensible à la casse

## 🔮 Évolutions Futures

1. **Recherche avancée** : Filtres combinés (sigle + secteur + ville)
2. **Autocomplétion** : Suggestions de sigles lors de la saisie
3. **Historique de recherche** : Sauvegarde des recherches fréquentes
4. **Recherche globale** : Recherche dans toutes les sources simultanément

## 📝 Notes Techniques

- **Performance** : La recherche frontend est instantanée (filtrage local)
- **Performance backend** : Utilisation d'index SQL pour optimiser les recherches
- **Compatibilité** : Fonctionne avec tous les navigateurs modernes
- **Accessibilité** : Respect des standards d'accessibilité web

## ✅ Validation

- [x] Recherche frontend fonctionnelle
- [x] Recherche backend fonctionnelle
- [x] Tests de validation réussis
- [x] Documentation complète
- [x] Gestion des cas particuliers (espaces, caractères spéciaux)
