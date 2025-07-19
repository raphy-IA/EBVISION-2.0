# US-MIS-003 : Suivi avancement, budget et qualité des missions

## Description
En tant que collaborateur, je veux suivre l'avancement, le budget et la qualité des missions en temps réel afin de garantir la réussite des projets.

## Critères d'acceptation
- [x] Backend data model and basic service functions for tracking mission progress (`progressPercentage`), budget (`actualHonoraire`, `actualDebours` vs `budgetHonoraire`, `budgetDebours`), and quality (`qualityIndicators`) are in place.
- [ ] Tableau de bord mission avec avancement temps réel par phase
- [ ] Suivi consommation budget (réel vs prévisionnel)
- [ ] Indicateurs qualité (respect méthodologie, revues, validations)
- [ ] Alertes proactives (dépassement budget, retard, risque qualité)

## Définition of Done
- [x] Code implémenté et revu
- [ ] Tests unitaires (>85% coverage)
- [x] Tests d'intégration validés
- [ ] Validation conformité CDC (section 5.2.1)
- [ ] Documentation mise à jour
- [ ] Démonstration fonctionnelle

## Références CDC
- Section : 5.2.1
- Exigences : REQ-MIS-003
- KPI associés : Performance, UX

## Mapping exigences
- requirements.json : missions > requirements > REQ-MIS-003

## Tests de validation
```javascript
// describe('US-MIS-003: Suivi mission', () => {
//   it('should track mission progress and budget', () => {
//     // ...
//   });
// });
``` 