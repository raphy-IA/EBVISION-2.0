# Backup du Schéma - 07/12/2025 16:04:45

## Contexte
Ce backup a été créé avant la mise à jour des fichiers de schéma pour inclure toutes les migrations récentes.

## Problème identifié
Les fichiers schema-structure-only.sql et schema-export.json étaient obsolètes et ne contenaient pas :
- Table: prospecting_campaign_validation_companies
- Table: payments
- Table: payment_allocations  
- Colonne: missions.manager_id
- Et potentiellement d'autres éléments des migrations 017-024

## Base de données de référence
- Nom: EB-PostProd2
- Date d'initialisation: 07/12/2025
- Migrations appliquées: 34 (toutes)

## Fichiers sauvegardés
- schema-export.json: Export JSON de la structure (105 tables)
- schema-structure-only.sql: Schéma SQL structure seule (ancien)
- 0-init-complete.js: Script d'initialisation complète
- 1-export-schema-local.js: Script d'export de schéma local
- 3-insert-reference-data.js: Script d'insertion données de référence
- migrate.js: Script de migrations

## Prochaines étapes
1. Générer un nouveau schema-structure-only.sql depuis EB-PostProd2
2. Générer un nouveau schema-export.json depuis EB-PostProd2
3. Modifier 0-init-complete.js pour marquer automatiquement les migrations comme exécutées

## Restauration
Pour restaurer ces fichiers, copier les fichiers de ce dossier vers leurs emplacements d'origine.
