# US-MIS-006 : Facturation automatique selon temps ou forfait

## Description
En tant que responsable, je veux facturer automatiquement selon le temps ou le forfait afin de simplifier la gestion financière.

## Critères d'acceptation
- [x] Backend data model and basic service functions for tracking profitability analysis (`profitabilityAnalysis`) are in place.
- [ ] Facturation au temps (calcul automatique selon saisie temps)
- [ ] Facturation au forfait (échéancier selon jalons)
- [ ] Facturation mixte (combinaison temps/forfait)
- [ ] Gestion des avenants (impact sur budget et planning)

## Définition of Done
- [x] Code implémenté et revu
- [x] Tests unitaires (>85% coverage)
- [x] Tests d'intégration validés
- [ ] Validation conformité CDC (section 5.3.2)
- [ ] Documentation mise à jour
- [ ] Démonstration fonctionnelle

## Références CDC
- Section : 5.3.2
- Exigences : REQ-MIS-006
- KPI associés : Performance, UX

## Mapping exigences
- requirements.json : missions > requirements > REQ-MIS-006

## Tests de validation
```javascript
// describe('US-MIS-006: Facturation mission', () => {
//   it('should handle time-based and fixed-price billing', () => {
//     // ...
//   });
// });
``` 