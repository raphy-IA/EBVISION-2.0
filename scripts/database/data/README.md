# Fichiers de Données de Référence

Ce dossier contient les fichiers JSON qui définissent les données de référence chargées par le script `3-insert-reference-data.js`.

**⚠️ IMPORTANT:** Ces fichiers sont générés automatiquement depuis le backup SQL original (`backup_BD_reference.sql`) via le script `extract-backup-data.js`. Ne les modifiez pas manuellement sans raison valable.

## 📁 Structure des Fichiers

### `companies-and-sources.json`
Contient les sources d'entreprises et la liste des entreprises à charger dans la base de données.

**Structure:**
```json
{
  "sources": [
    {
      "name": "Nom de la source",
      "description": "Description de la source"
    }
  ],
  "companies": [
    {
      "nom": "Nom de l'entreprise",
      "sigle": "SIGLE",
      "source": "Nom de la source (doit correspondre à une source définie)",
      "secteur_activite": "Nom du secteur",
      "pays": "Nom du pays",
      "ville": "Ville",
      "adresse": "Adresse complète",
      "telephone": "Numéro de téléphone",
      "email": "email@entreprise.com",
      "site_web": "https://www.entreprise.com",
      "statut": "ACTIF"
    }
  ]
}
```

**Notes:**
- Les sources doivent être définies avant les entreprises
- Le champ `source` dans une entreprise doit correspondre exactement au `name` d'une source
- Les champs `secteur_activite` et `pays` sont stockés comme texte (pas de FK)

### `opportunity-types-config.json`
Contient les types d'opportunités avec leurs étapes, documents requis et actions requises.

**Structure:**
```json
{
  "opportunityTypes": [
    {
      "type": {
        "name": "Nom du type",
        "code": "CODE",
        "description": "Description du type",
        "default_probability": 70,
        "default_duration_days": 30,
        "couleur": "#3498db"
      },
      "stages": [
        {
          "stage_name": "Nom de l'étape",
          "stage_order": 1,
          "description": "Description de l'étape",
          "required_documents": ["Document 1", "Document 2"],
          "required_actions": ["Action 1", "Action 2"],
          "max_duration_days": 10,
          "min_duration_days": 5,
          "is_mandatory": true,
          "validation_required": true
        }
      ]
    }
  ]
}
```

**Notes:**
- `stage_order` doit être séquentiel (1, 2, 3, ...)
- `required_documents` et `required_actions` sont des tableaux de chaînes
- Ces tableaux sont stockés en JSON dans la base de données
- `couleur` peut être `null` ou une couleur hexadécimale

## 🔄 Utilisation

### Charger les données dans la base

Les fichiers sont automatiquement chargés par le script `3-insert-reference-data.js`:

```bash
node scripts/database/3-insert-reference-data.js
```

### Régénérer les fichiers JSON depuis le backup

Si vous avez modifié le backup SQL original et souhaitez régénérer les fichiers JSON:

```bash
node scripts/database/extract-backup-data.js
```

Ce script va:
- Lire `backups/Backup Pure/backup_BD_reference.sql`
- Extraire les données des tables `company_sources`, `companies`, `opportunity_types`, `opportunity_stage_templates`
- Générer les fichiers JSON dans ce dossier
- **100 premières entreprises** sont extraites (sur 8000+)

## ✏️ Modification des Données

Pour ajouter ou modifier des données:

1. **Éditer le fichier JSON approprié**
   - Respecter la structure définie ci-dessus
   - Valider que le JSON est bien formé

2. **Relancer le script d'insertion**
   ```bash
   node scripts/database/3-insert-reference-data.js
   ```

3. **Vérifier les données chargées** (optionnel)
   ```bash
   node scripts/database/verify-opportunity-data.js
   ```

## 📝 Bonnes Pratiques

- **Toujours valider le JSON** avant de committer
- **Tester localement** avant de déployer en production
- **Documenter les changements** dans les commits
- **Maintenir la cohérence** des noms entre les fichiers (sources, secteurs, pays)
- **Éviter les doublons** en vérifiant les données existantes

## 🔍 Vérification

Le script `verify-opportunity-data.js` permet de vérifier que:
- Les types d'opportunités sont bien chargés
- Les étapes sont correctement associées
- Les `required_documents` et `required_actions` sont présents
- Les données JSON sont correctement parsées

## 🚀 Évolution Future

Pour ajouter de nouveaux types de données de référence:

1. Créer un nouveau fichier JSON dans ce dossier
2. Ajouter une fonction d'insertion dans `3-insert-reference-data.js`
3. Appeler cette fonction dans la séquence `main()`
4. Documenter la structure dans ce README
