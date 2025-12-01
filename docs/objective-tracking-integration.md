# Guide d'Intégration du Tracking Automatique

## Vue d'ensemble

Le service `ObjectiveEventTracker` permet de mettre à jour automatiquement les objectifs lorsque des événements métier se produisent (création d'opportunité, conversion, etc.).

## Architecture

```
Événement Métier (ex: Opportunité créée)
    ↓
Model Hook (ex: Opportunity.create)
    ↓
ObjectiveEventTracker.trackEvent()
    ↓
Mise à jour automatique des objectifs concernés
```

## Intégration dans les Modèles

### Exemple 1: Modèle Opportunity

```javascript
const ObjectiveEventTracker = require('../services/ObjectiveEventTracker');

class Opportunity {
    // Exemple de méthode create avec tracking
    static async create(data, createdBy) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // 1. Créer l'opportunité
            const sql = `
                INSERT INTO opportunities (...)
                VALUES (...)
                RETURNING *
            `;
            const result = await client.query(sql, [...]);
            const opportunity = result.rows[0];
            
            // 2. Déclencher le tracking automatique
            try {
                await ObjectiveEventTracker.trackEvent(
                    'OPPORTUNITY',           // Type d'entité
                    'CREATED',               // Opération
                    opportunity,             // Données de l'entité
                    data.fiscal_year_id      // Exercice fiscal
                );
            } catch (trackError) {
                console.error('Tracking error (non-blocking):', trackError);
                // Ne pas bloquer la création si le tracking échoue
            }
            
            await client.query('COMMIT');
            return opportunity;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    // Exemple de méthode updateStatus avec tracking
    static async updateStatus(opportunityId, newStatus, userId) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // 1. Récupérer l'opportunité actuelle
            const getOppSql = 'SELECT * FROM opportunities WHERE id = $1';
            const oppResult = await client.query(getOppSql, [opportunityId]);
            const opportunity = oppResult.rows[0];
            
            // 2. Mettre à jour le statut
            const updateSql = `
                UPDATE opportunities 
                SET status = $1, 
                    won_at = CASE WHEN $1 = 'WON' THEN CURRENT_TIMESTAMP ELSE won_at END,
                    lost_at = CASE WHEN $1 = 'LOST' THEN CURRENT_TIMESTAMP ELSE lost_at END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;
            const result = await client.query(updateSql, [newStatus, opportunityId]);
            const updatedOpp = result.rows[0];
            
            // 3. Déclencher le tracking si statut WON ou LOST
            if (newStatus === 'WON') {
                try {
                    await ObjectiveEventTracker.trackEvent(
                        'OPPORTUNITY',
                        'WON',
                        updatedOpp,
                        updatedOpp.fiscal_year_id
                    );
                } catch (trackError) {
                    console.error('Tracking error:', trackError);
                }
            } else if (newStatus === 'LOST') {
                try {
                    await ObjectiveEventTracker.trackEvent(
                        'OPPORTUNITY',
                        'LOST',
                        updatedOpp,
                        updatedOpp.fiscal_year_id
                    );
                } catch (trackError) {
                    console.error('Tracking error:', trackError);
                }
            }
            
            await client.query('COMMIT');
            return updatedOpp;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
```

### Exemple 2: Modèle Campaign

```javascript
const ObjectiveEventTracker = require('../services/ObjectiveEventTracker');

class Campaign {
    static async launch(campaignId, launchedBy) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Mettre à jour la campagne
            const sql = `
                UPDATE campaigns 
                SET status = 'LAUNCHED', 
                    launched_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;
            const result = await client.query(sql, [campaignId]);
            const campaign = result.rows[0];
            
            // Tracking automatique
            try {
                await ObjectiveEventTracker.trackEvent(
                    'CAMPAIGN',
                    'LAUNCHED',
                    campaign,
                    campaign.fiscal_year_id
                );
            } catch (trackError) {
                console.error('Tracking error:', trackError);
            }
            
            await client.query('COMMIT');
            return campaign;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
```

## Points d'Intégration Recommandés

### Opportunités
- `create()` → CREATED
- `updateStatus()` → WON, LOST, CONVERTED
- `update()` → UPDATED
- `delete()` → DELETED

### Campagnes
- `create()` → CREATED
- `launch()` → LAUNCHED
- `complete()` → COMPLETED
- `update()` → UPDATED
- `delete()` → DELETED

### Clients
- `create()` → CREATED
- `convertToCustomer()` → CONVERTED
- `update()` → UPDATED
- `delete()` → DELETED

### Missions
- `create()` → CREATED
- `start()` → STARTED
- `complete()` → COMPLETED
- `update()` → UPDATED
- `delete()` → DELETED

### Factures
- `create()` → CREATED
- `send()` → SENT
- `markAsPaid()` → PAID
- `update()` → UPDATED
- `delete()` → DELETED

### Collaborateurs
- `create()` → CREATED
- `hire()` → HIRED
- `terminate()` → TERMINATED
- `update()` → UPDATED
- `delete()` → DELETED

## Gestion des Erreurs

**Important**: Le tracking d'objectifs ne doit **jamais bloquer** les opérations métier principales.

```javascript
try {
    await ObjectiveEventTracker.trackEvent(...);
} catch (trackError) {
    console.error('Objective tracking failed (non-blocking):', trackError);
    // L'opération métier continue normalement
}
```

## Exercice Fiscal

Pour que le tracking fonctionne, chaque entité doit avoir une référence à un exercice fiscal :

```javascript
// Option 1: Champ fiscal_year_id dans l'entité
opportunity.fiscal_year_id

// Option 2: Récupérer depuis la date
const fiscalYear = await FiscalYear.getActiveForDate(opportunity.created_at);
await ObjectiveEventTracker.trackEvent(
    'OPPORTUNITY',
    'CREATED',
    opportunity,
    fiscalYear.id
);
```

## Champs de Contexte Requis

Chaque entité **doit** avoir les champs suivants pour le tracking:

- `created_by` - ID du créateur
- `assigned_to` / `account_manager_id` / `manager_id` - ID du responsable
- `business_unit_id` - ID de la BU
- `division_id` - ID de la division

Ces champs permettent d'identifier les objectifs concernés (individuels, division, BU, globaux).

## Test du Tracking

```javascript
// Test manuel dans le code
const result = await ObjectiveEventTracker.trackEvent(
    'OPPORTUNITY',
    'CREATED',
    {
        id: 'test-opp-123',
        amount: 50000,
        created_by: 'user-1',
        assigned_to: 'user-2',
        business_unit_id: 'bu-1',
        division_id: 'div-1'
    },
    'fiscal-year-2025'
);

console.log(`Tracking result:`, result);
// { updated: 4, skipped: 0, objectiveTypes: 2 }
```

## Logs

Le tracker produit des logs détaillés:

```
📊 Tracking event: OPPORTUNITY - CREATED
Found 2 objective type(s) to update
  ✓ Updated GLOBAL objective abc-123: 150000/500000
  ✓ Updated BUSINESS_UNIT objective def-456: 50000/200000
  ✓ Updated DIVISION objective ghi-789: 50000/100000
  ✓ Updated INDIVIDUAL objective jkl-012: 50000/75000
✅ Tracking complete: 4 updated, 0 skipped
```

## Prochaines Étapes

1. Ajouter `fiscal_year_id` aux tables qui ne l'ont pas encore
2. S'assurer que toutes les entités ont les champs de contexte requis
3. Intégrer les hooks dans les modèles existants
4. Tester avec des données réelles
5. Monitorer les performances du tracking
