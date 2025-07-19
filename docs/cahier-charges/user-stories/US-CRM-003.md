# US-CRM-003 : Visualisation de l'organigramme des groupes et filiales

## Description
En tant qu'utilisateur, je veux visualiser l'organigramme des groupes et filiales afin de comprendre la structure des clients complexes.

## Critères d'acceptation
- [x] Affichage d'un organigramme interactif des structures (backend data model ready)
- [x] Drill-down par entité (groupe, filiale) (backend data model ready)
- [x] Gestion des mandats multiples par entité (backend data model ready)

## Définition of Done
- [x] Code implémenté et revu
- [x] Tests unitaires (>85% coverage)
- [ ] Tests d'intégration validés
- [ ] Validation conformité CDC (section 3.1.3)
- [ ] Documentation mise à jour
- [ ] Démonstration fonctionnelle

**Statut actuel :** Le backend est prêt pour la gestion des entités complexes (groupes et filiales) avec les champs `groupeId` et `mandats` dans le modèle `Client`. La visualisation de l'organigramme et le drill-down sont des fonctionnalités frontend à développer.

## Références CDC
- Section : 3.1.3
- Exigences : REQ-CRM-003
- KPI associés : UX

## Mapping exigences
- requirements.json : crm > requirements > REQ-CRM-003

## Tests de validation
```javascript
// describe('US-CRM-003: Visualisation organigramme', () => {
//   it('should display group and subsidiary structure', () => {
//     // ...
//   });
// });
``` 