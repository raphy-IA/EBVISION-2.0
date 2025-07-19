# Documentation TRS-Affichage

## Objectif général
Créer un dashboard web pour analyser la répartition du temps, la rentabilité et la performance des équipes d’une société de conseil, à partir de plusieurs fichiers CSV :
- Temps passés (TRS)
- Missions
- Factures/Recouvrements
- Taux horaires par grade
- Mapping initiales ↔ noms
- Opportunités

L’application permet :
- De croiser et synthétiser toutes ces données
- De calculer des KPIs financiers et RH (CA, coût chargé, rentabilité, taux de facturation, taux d’encaissement…)
- D’offrir des filtres dynamiques (mission, client, division/pôle, manager, période, rentabilité…)
- D’afficher des tableaux, graphiques, et vues détaillées par mission, collaborateur, pôle, etc.

---

## Fichiers et données utilisés

### 1. TRS (Temps passés)
- Données : Nom, Initiales, Mission, Pôle/Division, Grade, Heures, Date, etc.
- Sert à calculer le temps passé par collaborateur, mission, pôle, etc.

### 2. Missions
- Données : Mission, Client, Division/Pôle, Manager, Budget, % Avancement, etc.
- Sert de référentiel pour lier les temps, les factures, et calculer la rentabilité.

### 3. Factures/Recouvrements
- Données : Mission, Montant facturé, Montant encaissé, Statut, Date, etc.
- Sert à calculer le CA, le taux de facturation, le taux d’encaissement, le suivi des paiements.

### 4. Taux horaires
- Données : Grade, Taux horaire
- Sert à calculer le coût chargé (heures réalisées × taux horaire du grade).

### 5. Mapping initiales ↔ noms
- Sert à uniformiser les noms/collaborateurs entre les fichiers.

### 6. Opportunités
- Données : Client, Mission, Statut, Probabilité, Responsable, etc.
- Sert à suivre le pipe commercial.

---

## Logique et calculs métiers

### 1. Uniformisation des données
- Utilisation du mapping initiales ↔ noms pour harmoniser les collaborateurs.
- Division et Pôle sont considérés comme synonymes.

### 2. Calcul du coût chargé
- Pour chaque mission :  
  `Coût chargé = Somme (heures réalisées × taux horaire du grade)`

### 3. Calcul de la rentabilité
- `Rentabilité = Budget - Coût chargé`
- `Taux de facturation = Montant facturé / Coût chargé`
- `Taux d’encaissement = Montant encaissé / Montant facturé`

### 4. Jointures
- Les missions sont liées aux factures par le champ Mission.
- Les temps sont liés aux missions par le champ Mission.
- Les taux horaires sont liés aux temps par le champ Grade.

### 5. Filtres dynamiques
- Mission, Client, Division/Pôle, Manager, Période, Rentabilité, Facturation, etc.
- Filtres spécifiques par onglet (ex : Recouvrement, Opportunités…).

### 6. Tableaux et graphiques
- Tableaux de synthèse par mission, collaborateur, pôle, etc.
- Graphiques : répartition des coûts, CA, évolution, top clients, etc.
- Vues détaillées accessibles par clic sur une ligne.

### 7. Export
- Export CSV des tableaux filtrés.

---

## Structure technique (HTML/JS)

- `dashboard.html` : Fichier principal, contient le HTML, le CSS, et tout le JS (chargement, parsing, calculs, rendu, gestion des onglets et filtres).
- Chargement asynchrone de tous les CSV.
- Parsing CSV générique, gestion des séparateurs, gestion des entêtes.
- Gestion des onglets (Dashboard, Missions, Recouvrement, Opportunités, Pôle, Collaborateur, Statut…).
- Barres de filtres dynamiques par onglet.
- Rendu dynamique des tableaux et graphiques (Chart.js ou équivalent).
- Gestion des erreurs (fichiers manquants, données incohérentes…).

---

## Problèmes rencontrés récemment

- Corruption du JS suite à des suppressions automatiques :  
  - Fragments HTML dans le JS
  - Parenthèses/accolades isolées
  - Fonctions incomplètes ou dupliquées
  - Tableaux et filtres non affichés
  - Erreurs de syntaxe bloquantes
- Besoin d’un nettoyage manuel du fichier pour restaurer la structure des fonctions.

---

## À faire pour repartir sur une base saine

- Nettoyer le JS pour chaque fonction (une seule accolade fermante, pas de HTML dans le JS).
- Recréer les fonctions critiques (chargement, parsing, calculs, rendu, filtres).
- S’assurer que chaque vue/onglet a sa propre logique de filtrage et de rendu.
- Tester chaque onglet indépendamment.

---

## Squelettes de fonctions propres (JS)

```js
// Chargement et parsing CSV générique
function loadCSV(file, callback) {
    fetch(file)
        .then(resp => resp.text())
        .then(csvText => callback(parseCSV(csvText)));
}

function parseCSV(csvText) {
    let data = [];
    let lines = csvText.split('\n');
    if (lines.length < 2) return data;
    let headers = lines[0].split(/,(?=(?:[^"]*\"[^"]*\")*[^"]*$)/);
    for (let i = 1; i < lines.length; i++) {
        let row = lines[i].split(/,(?=(?:[^"]*\"[^"]*\")*[^"]*$)/);
        if (row.length === headers.length) {
            let dataRow = {};
            for (let j = 0; j < headers.length; j++) {
                dataRow[headers[j].replace(/\"/g, '').trim()] = row[j] ? row[j].replace(/\"/g, '').trim() : '';
            }
            data.push(dataRow);
        }
    }
    return data;
}

// Exemple de squelette pour une vue (ex: Missions)
function renderMissionsView(data) {
    // 1. Appliquer les filtres
    // 2. Calculer les KPIs
    // 3. Générer le tableau
    // 4. Générer les graphiques
}

// Squelette pour le calcul du coût chargé
function calculCoutChargeMission(mission, trsData, tauxHoraires) {
    // Parcourir trsData, filtrer sur la mission, sommer (heures × taux)
    return 0;
}

// Squelette pour la rentabilité
function calculRentabilite(mission, coutCharge, montantFacture) {
    // rentabilité = montantFacture - coutCharge
    return 0;
}

// Squelette pour la gestion des filtres dynamiques
function setupFilters(data, filterContainerId) {
    // Générer les selects/options dynamiquement
}

// Squelette pour l’export CSV
function exportTableToCSV(tableId, filename) {
    // Générer un CSV à partir du tableau HTML
}
```

---

**N’hésite pas à transmettre ce fichier à toute personne qui t’aidera à corriger ou refondre le code.** 