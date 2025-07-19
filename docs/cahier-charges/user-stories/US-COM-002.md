# US-COM-002 : Pipeline d'opportunités visuel (Kanban)

## Description
En tant que commercial, je veux gérer un pipeline d'opportunités visuel (Kanban) afin de suivre l'avancement des ventes.

## Critères d'acceptation
- [ ] Affichage d'un pipeline Kanban avec étapes personnalisables
- [ ] Calcul automatique de la probabilité de closing
- [ ] Suivi du montant prévisionnel par service
- [ ] Alertes sur échéances critiques

## Définition of Done
- [x] Code implémenté et revu
- [x] Tests unitaires (>85% coverage)
- [x] Tests d'intégration validés
- [x] Validation conformité CDC (section 4.1.2)
- [x] Documentation mise à jour
- [ ] Démonstration fonctionnelle

**Statut actuel :** Le backend pour la gestion des opportunités est implémenté et testé unitairement et en intégration. La conformité CDC a été vérifiée pour cette partie. La documentation a été mise à jour. La visualisation Kanban, le calcul automatique de la probabilité de closing, le suivi du montant prévisionnel et les alertes sur échéances critiques nécessitent un développement ultérieur.

## Références CDC
- Section : 4.1.2
- Exigences : REQ-COM-002
- KPI associés : Performance, UX

## Mapping exigences
- requirements.json : commercial > requirements > REQ-COM-002

## Tests de validation
```javascript
// describe('US-COM-002: Pipeline Kanban', () => {
//   it('should display and update sales pipeline', () => {
//     // ...
//   });
// });
``` 