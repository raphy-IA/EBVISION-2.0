# 🔧 Mise à Jour du Script - Missions depuis Opportunités

## 🎯 Objectif

Modifier le script `7-generate-complete-demo.js` pour que les missions soient créées **depuis des opportunités GAGNÉES**, avec affectation de collaborateurs et d'activités.

## 📋 Modifications Nécessaires

### 1. Inverser l'Ordre de Création

**Actuellement** :
```
1. Clients
2. Campagnes
3. Missions ❌ (créées en premier)
4. Opportunités
```

**Nouveau** :
```
1. Clients
2. Campagnes
3. Opportunités
4. Missions ✅ (créées depuis opportunités GAGNÉES)
```

### 2. Créer des Opportunités avec Statut GAGNEE

Certaines opportunités doivent avoir le statut "GAGNEE" pour pouvoir créer des missions.

**Proposition** :
- 15 opportunités au total
- 5 avec statut "GAGNEE" → génèrent des missions
- 5 avec statut "EN_COURS"
- 3 avec statut "NOUVELLE"
- 2 avec statut "PERDUE"

### 3. Lier les Missions aux Opportunités

Chaque mission doit avoir :
```javascript
{
    opportunity_id: "uuid-opportunite-gagnee",
    client_id: opportunity.client_id, // Hérité
    business_unit_id: opportunity.business_unit_id, // Hérité
    collaborateur_id: opportunity.collaborateur_id, // Hérité
    budget_estime: opportunity.montant_estime // Hérité
}
```

### 4. Ajouter des Activités aux Missions

Pour chaque mission, créer 3-5 activités dans `mission_tasks` :

```javascript
const activitesParType = {
    'Audit': ['Planification', 'Collecte documents', 'Analyse', 'Rapport'],
    'Conseil': ['Diagnostic', 'Recommandations', 'Mise en œuvre', 'Suivi'],
    'Expertise': ['Étude préliminaire', 'Expertise terrain', 'Rapport'],
    'Formation': ['Préparation', 'Animation', 'Évaluation'],
    'Comptabilité': ['Saisie', 'Révision', 'Clôture', 'Déclarations']
};
```

### 5. Affecter des Collaborateurs aux Missions

Pour chaque mission, affecter 2-4 collaborateurs dans `mission_collaborateurs` :

```javascript
{
    mission_id: "uuid-mission",
    collaborateur_id: "uuid-collaborateur",
    role: "Chef de mission" | "Consultant senior" | "Consultant" | "Assistant",
    taux_horaire: // Depuis taux_horaires selon le grade
    heures_planifiees: 40-200,
    statut: "PLANIFIE" | "ACTIF"
}
```

## 🔄 Nouveau Workflow

### Étape 1 : Créer les Opportunités

```javascript
async function createOpportunities(pool, clientIds, buIds, collaborateurIds, refData, campaignIds) {
    const opportunities = [
        // 5 opportunités GAGNÉES (généreront des missions)
        { nom: 'Audit Financier - Banque ABC', statut: 'GAGNEE', montant: 15000000 },
        { nom: 'Conseil Management - Assurance XYZ', statut: 'GAGNEE', montant: 12000000 },
        { nom: 'Expertise Comptable - Industrie DEF', statut: 'GAGNEE', montant: 8000000 },
        { nom: 'Formation Fiscale - Commerce GHI', statut: 'GAGNEE', montant: 5000000 },
        { nom: 'Audit Interne - Services JKL', statut: 'GAGNEE', montant: 10000000 },
        
        // 5 opportunités EN_COURS
        { nom: 'Conseil Stratégique - Tech MNO', statut: 'EN_COURS', montant: 20000000 },
        // ... etc
        
        // 3 opportunités NOUVELLES
        // 2 opportunités PERDUES
    ];
    
    const opportunityIds = [];
    const wonOpportunityIds = []; // ✅ Garder les IDs des opportunités gagnées
    
    for (const opp of opportunities) {
        const result = await pool.query(`INSERT INTO opportunities ...`);
        opportunityIds.push(result.rows[0].id);
        
        if (opp.statut === 'GAGNEE') {
            wonOpportunityIds.push({
                id: result.rows[0].id,
                ...opp
            });
        }
    }
    
    return { opportunityIds, wonOpportunityIds };
}
```

### Étape 2 : Créer les Missions depuis les Opportunités Gagnées

```javascript
async function createMissions(pool, wonOpportunities, refData) {
    const missionIds = [];
    
    for (const opp of wonOpportunities) {
        // Créer la mission depuis l'opportunité
        const missionResult = await pool.query(`
            INSERT INTO missions (
                nom, code, 
                client_id, business_unit_id, division_id, collaborateur_id,
                opportunity_id, -- ✅ Lien vers l'opportunité
                mission_type_id, statut, priorite,
                date_debut, date_fin, budget_estime,
                fiscal_year_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
        `, [
            opp.nom, // Même nom que l'opportunité
            generateMissionCode(), // Code unique
            opp.client_id, // ← Hérité
            opp.business_unit_id, // ← Hérité
            opp.division_id,
            opp.collaborateur_id, // ← Hérité
            opp.id, // ← Lien vers opportunité
            opp.mission_type_id,
            'PLANIFIEE', // Statut initial
            'MOYENNE',
            new Date(), // Date début
            addMonths(new Date(), 3), // Date fin (+3 mois)
            opp.montant_estime, // ← Hérité
            opp.fiscal_year_id
        ]);
        
        const missionId = missionResult.rows[0].id;
        missionIds.push(missionId);
        
        // Créer les activités de la mission
        await createMissionTasks(pool, missionId, opp.type);
        
        // Affecter les collaborateurs
        await assignCollaboratorsToMission(pool, missionId, opp);
    }
    
    return missionIds;
}
```

### Étape 3 : Créer les Activités de la Mission

```javascript
async function createMissionTasks(pool, missionId, missionType) {
    const activitesParType = {
        'Audit': [
            { code: 'PLAN', libelle: 'Planification', duree: 30 },
            { code: 'COLLECT', libelle: 'Collecte documents', duree: 80 },
            { code: 'ANALYSE', libelle: 'Analyse', duree: 120 },
            { code: 'RAPPORT', libelle: 'Rapport', duree: 50 }
        ],
        'Conseil': [
            { code: 'DIAG', libelle: 'Diagnostic', duree: 60 },
            { code: 'RECO', libelle: 'Recommandations', duree: 80 },
            { code: 'MEO', libelle: 'Mise en œuvre', duree: 100 },
            { code: 'SUIVI', libelle: 'Suivi', duree: 40 }
        ],
        // ... autres types
    };
    
    const activites = activitesParType[missionType] || activitesParType['Audit'];
    
    for (const activite of activites) {
        // Trouver la task correspondante dans la table tasks
        const taskResult = await pool.query(`
            SELECT id FROM tasks 
            WHERE code = $1 OR libelle ILIKE $2
            LIMIT 1
        `, [activite.code, `%${activite.libelle}%`]);
        
        if (taskResult.rows.length > 0) {
            await pool.query(`
                INSERT INTO mission_tasks (
                    mission_id, task_id, 
                    statut, duree_planifiee,
                    date_debut, date_fin
                )
                VALUES ($1, $2, 'PLANIFIEE', $3, $4, $5)
            `, [
                missionId,
                taskResult.rows[0].id,
                activite.duree,
                new Date(),
                addDays(new Date(), activite.duree / 8) // Durée en jours
            ]);
        }
    }
}
```

### Étape 4 : Affecter les Collaborateurs

```javascript
async function assignCollaboratorsToMission(pool, missionId, opportunity) {
    // Récupérer des collaborateurs de la même BU
    const collabsResult = await pool.query(`
        SELECT c.id, c.grade_actuel_id, g.nom as grade_nom
        FROM collaborateurs c
        JOIN grades g ON c.grade_actuel_id = g.id
        WHERE c.business_unit_id = $1
        AND c.statut = 'ACTIF'
        LIMIT 4
    `, [opportunity.business_unit_id]);
    
    const roles = ['Chef de mission', 'Consultant senior', 'Consultant', 'Assistant'];
    
    for (let i = 0; i < collabsResult.rows.length; i++) {
        const collab = collabsResult.rows[i];
        
        // Récupérer le taux horaire
        const tauxResult = await pool.query(`
            SELECT taux_horaire 
            FROM taux_horaires
            WHERE grade_id = $1 
            AND statut = 'ACTIF'
            LIMIT 1
        `, [collab.grade_actuel_id]);
        
        const tauxHoraire = tauxResult.rows[0]?.taux_horaire || 50000;
        const heuresPlanifiees = 40 + Math.floor(Math.random() * 160); // 40-200h
        
        await pool.query(`
            INSERT INTO mission_collaborateurs (
                mission_id, collaborateur_id,
                role, taux_horaire,
                heures_planifiees, statut
            )
            VALUES ($1, $2, $3, $4, $5, 'PLANIFIE')
        `, [
            missionId,
            collab.id,
            roles[i],
            tauxHoraire,
            heuresPlanifiees
        ]);
    }
}
```

## 📊 Résultat Attendu

### Opportunités

```
✓ 15 opportunités créées
  - 5 GAGNÉES → génèrent des missions
  - 5 EN_COURS
  - 3 NOUVELLES
  - 2 PERDUES
```

### Missions

```
✓ 5 missions créées (depuis opportunités gagnées)
  - Chaque mission liée à son opportunité source
  - Budget hérité de l'opportunité
  - Client et BU hérités
```

### Activités

```
✓ 15-25 activités créées (3-5 par mission)
  - Planifiées avec durées estimées
  - Dates de début/fin définies
```

### Affectations

```
✓ 10-20 affectations créées (2-4 par mission)
  - Collaborateurs de la même BU
  - Taux horaires selon le grade
  - Rôles définis (Chef, Senior, Consultant, Assistant)
```

## 🔄 Ordre d'Exécution dans le Script

```javascript
async function main() {
    // ... Business Units, Divisions, Collaborateurs, Taux Horaires, Clients
    
    // 1. Campagnes
    const campaignIds = await createProspectingCampaigns(...);
    
    // 2. Opportunités (avec certaines GAGNÉES)
    const { opportunityIds, wonOpportunityIds } = await createOpportunities(...);
    
    // 3. Missions (depuis opportunités gagnées)
    const missionIds = await createMissions(pool, wonOpportunityIds, refData);
    
    // 4. Time Sheets et Time Entries
    await createTimeData(pool, userIds, missionIds, refData);
    
    // 5. Factures
    await createInvoices(pool, missionIds, clientIds, refData);
}
```

## 📝 Tables à Vérifier

### Vérifier que mission_collaborateurs existe

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'mission_collaborateurs';
```

Si elle n'existe pas, il faudra la créer.

### Vérifier que mission_tasks existe

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'mission_tasks';
```

## 🎯 Avantages

1. ✅ **Cohérence** : Les missions proviennent d'opportunités gagnées
2. ✅ **Traçabilité** : Lien clair opportunité → mission
3. ✅ **Réalisme** : Workflow commercial complet
4. ✅ **Affectations** : Collaborateurs planifiés sur les missions
5. ✅ **Activités** : Décomposition en tâches
6. ✅ **Facturation** : Basée sur les taux horaires réels

---

**Document créé le** : 10 novembre 2025  
**Prochaine étape** : Implémenter ces modifications dans le script
