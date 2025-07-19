# US-CRM-002 : Segmentation automatique des clients

## Description
En tant que commercial, je veux segmenter automatiquement les clients selon leur potentiel, secteur et cycle de vie afin d'optimiser les actions marketing et commerciales.

## Critères d'acceptation
- [ ] Segmentation automatique par CA, secteur, potentiel, maturité
- [ ] Scoring prédictif du potentiel client
- [ ] Classification par service (audit, compta, finance, juridique, tax, gouvernance)
- [ ] Visualisation du cycle de vie client (prospect, client, fidèle, dormant)

## Définition of Done
- [x] Code implémenté et revu
- [x] Tests unitaires (>85% coverage)
- [x] Tests d'intégration validés
- [x] Validation conformité CDC (section 3.1.2)
- [ ] Documentation mise à jour
- [ ] Démonstration fonctionnelle

**Statut actuel :** Le backend pour la segmentation client est implémenté et testé unitairement et en intégration. La conformité CDC a été vérifiée pour cette partie. Les aspects de scoring prédictif et de visualisation nécessitent un développement ultérieur.

## Références CDC
- Section : 3.1.2
- Exigences : REQ-CRM-002
- KPI associés : Performance, UX

## Mapping exigences
- requirements.json : crm > requirements > REQ-CRM-002

## Tests de validation
```javascript
// describe('US-CRM-002: Segmentation client', () => {
//   it('should segment clients by potential and sector', () => {
//     // ...
//   });
// });
``` 