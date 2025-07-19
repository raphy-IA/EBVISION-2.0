# US-REN-001 : Calcul automatique de la rentabilité de chaque mission

## Description
En tant que responsable, je veux calculer automatiquement la rentabilité de chaque mission (coûts, marges, ROI) afin de piloter la performance.

## Critères d'acceptation
- [ ] Calcul des coûts directs (salaire, charges, structure, variables)
- [ ] Calcul des revenus et marges (CA, marge brute, marge nette, ROI)
- [ ] Prise en compte des allocations indirectes et amortissements
- [ ] Visualisation des résultats par mission

## Définition of Done
- [ ] Code implémenté et revu
- [ ] Tests unitaires (>85% coverage)
- [ ] Tests d'intégration validés
- [ ] Validation conformité CDC (section 7.1)
- [ ] Documentation mise à jour
- [ ] Démonstration fonctionnelle

## Références CDC
- Section : 7.1
- Exigences : REQ-REN-001
- KPI associés : Performance, Finance

## Mapping exigences
- requirements.json : rentabilite > requirements > REQ-REN-001

## Tests de validation
```javascript
// describe('US-REN-001: Calcul rentabilité mission', () => {
//   it('should calculate mission profitability', () => {
//     // ...
//   });
// });
``` 