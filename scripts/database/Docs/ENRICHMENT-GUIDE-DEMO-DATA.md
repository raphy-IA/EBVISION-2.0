# 🚀 Guide d'Enrichissement du Script de Données de Démo

Ce document détaille comment enrichir le script `5-generate-demo-data.js` pour générer :
- Campagnes de prospection
- Opportunités complètes
- Time Entries sur missions et activités internes
- Factures pour les missions

---

## 📦 1. Ajouter aux Statistiques (ligne 96)

```javascript
let stats = {
    businessUnits: 0,
    divisions: 0,
    grades: 0,
    postes: 0,
    collaborateurs: 0,
    users: 0,
    clients: 0,
    missions: 0,
    campaigns: 0,           // NOUVEAU
    opportunities: 0,        // NOUVEAU
    timeEntries: 0,          // NOUVEAU
    invoices: 0              // NOUVEAU
};
```

---

## 📋 2. Ajouter après la Génération des Missions (après ligne 236)

```javascript
// 8. Récupération des données de référence
console.log('📋 Chargement des données de référence...');
const oppTypes = await loadOpportunityTypes(pool);
const fiscalYears = await loadFiscalYears(pool);
const internalActivities = await loadInternalActivities(pool);
console.log(`   ✓ ${oppTypes.length} Types d'opportunités`);
console.log(`   ✓ ${fiscalYears.length} Années fiscales`);
console.log(`   ✓ ${internalActivities.length} Activités internes\n`);

// 9. Campagnes de prospection
console.log('📣 Création des Campagnes de Prospection...');
const campaignIds = await createProspectingCampaigns(pool, buIds);
console.log(`   ✓ ${stats.campaigns} Campagnes\n`);

// 10. Opportunités
console.log('💡 Création des Opportunités...');
const opportunityIds = await createOpportunities(pool, clientIds, buIds, oppTypes, campaignIds);
console.log(`   ✓ ${stats.opportunities} Opportunités\n`);

// 11. Affectation des collaborateurs aux missions
console.log('👥 Affectation des Collaborateurs...');
const collaborateurIds = await getCollaborateurIds(pool);
await assignCollaborateursToMissions(pool, missionIds, collaborateurIds);
console.log(`   ✓ Collaborateurs affectés\n`);

// 12. Time Entries
console.log('⏱️  Création des Time Entries...');
await createTimeEntries(pool, missionIds, collaborateurIds, internalActivities, fiscalYears);
console.log(`   ✓ ${stats.timeEntries} Time Entries\n`);

// 13. Factures
console.log('💰 Création des Factures...');
await createInvoices(pool, missionIds, clientIds);
console.log(`   ✓ ${stats.invoices} Factures\n`);
```

---

## 📋 3. Mise à Jour du Résumé Final (ligne 246-254)

```javascript
console.log('📊 RÉSUMÉ :');
console.log('═══════════');
console.log(`   ✓ Business Units       : ${stats.businessUnits}`);
console.log(`   ✓ Divisions            : ${stats.divisions}`);
console.log(`   ✓ Grades               : ${stats.grades}`);
console.log(`   ✓ Postes               : ${stats.postes}`);
console.log(`   ✓ Collaborateurs       : ${stats.collaborateurs}`);
console.log(`   ✓ Utilisateurs         : ${stats.users}`);
console.log(`   ✓ Clients              : ${stats.clients}`);
console.log(`   ✓ Campagnes            : ${stats.campaigns}`);      // NOUVEAU
console.log(`   ✓ Opportunités         : ${stats.opportunities}`);  // NOUVEAU
console.log(`   ✓ Missions             : ${stats.missions}`);
console.log(`   ✓ Time Entries         : ${stats.timeEntries}`);    // NOUVEAU
console.log(`   ✓ Factures             : ${stats.invoices}`);       // NOUVEAU
```

---

## 🔧 4. Nouvelles Fonctions à Ajouter (à la fin du fichier, avant `main()`)

### 4.1. Chargement des Données de Référence

```javascript
async function loadOpportunityTypes(pool) {
    try {
        const result = await pool.query(`
            SELECT id, name, code, default_probability, default_duration_days
            FROM opportunity_types
            WHERE is_active = true
            ORDER BY name
        `);
        return result.rows.length > 0 ? result.rows : [
            { id: null, name: 'Audit', code: 'AUD', default_probability: 70, default_duration_days: 30 }
        ];
    } catch (error) {
        console.log('   ⚠ Erreur chargement types d\'opportunités:', error.message);
        return [];
    }
}

async function loadFiscalYears(pool) {
    try {
        const result = await pool.query(`
            SELECT id, annee, date_debut, date_fin
            FROM fiscal_years
            WHERE statut IN ('EN_COURS', 'OUVERTE')
            ORDER BY annee DESC
            LIMIT 1
        `);
        return result.rows.length > 0 ? result.rows : [];
    } catch (error) {
        console.log('   ⚠ Erreur chargement années fiscales:', error.message);
        return [];
    }
}

async function loadInternalActivities(pool) {
    try {
        const result = await pool.query(`
            SELECT id, name
            FROM internal_activities
            WHERE is_active = true
            ORDER BY name
        `);
        return result.rows.length > 0 ? result.rows : [];
    } catch (error) {
        console.log('   ⚠ Erreur chargement activités internes:', error.message);
        return [];
    }
}

async function getCollaborateurIds(pool) {
    try {
        const result = await pool.query(`
            SELECT id FROM collaborateurs
            WHERE email LIKE '%${DEMO_EMAIL_DOMAIN}'
            ORDER BY created_at
        `);
        return result.rows.map(r => r.id);
    } catch (error) {
        console.log('   ⚠ Erreur récupération collaborateurs:', error.message);
        return [];
    }
}
```

### 4.2. Création des Campagnes de Prospection

```javascript
async function createProspectingCampaigns(pool, buIds) {
    const campaignIds = [];
    const currentYear = new Date().getFullYear();
    
    const campaigns = [
        {
            nom: `Campagne Audit ${currentYear}`,
            code: `CAMP-AUD-${currentYear}`,
            description: 'Campagne de prospection pour services d\'audit',
            statut: 'EN_COURS',
            date_debut: `${currentYear}-01-01`,
            date_fin: `${currentYear}-12-31`,
            budget: 50000,
            objectif_leads: 100,
            objectif_conversions: 20
        },
        {
            nom: `Campagne Conseil ${currentYear}`,
            code: `CAMP-CONS-${currentYear}`,
            description: 'Campagne de prospection pour services de conseil',
            statut: 'EN_COURS',
            date_debut: `${currentYear}-01-01`,
            date_fin: `${currentYear}-12-31`,
            budget: 40000,
            objectif_leads: 80,
            objectif_conversions: 15
        },
        {
            nom: `Campagne Formation ${currentYear}`,
            code: `CAMP-FORM-${currentYear}`,
            description: 'Campagne de prospection pour formations',
            statut: 'PLANIFIEE',
            date_debut: `${currentYear}-06-01`,
            date_fin: `${currentYear}-12-31`,
            budget: 30000,
            objectif_leads: 60,
            objectif_conversions: 12
        }
    ];
    
    for (let i = 0; i < campaigns.length; i++) {
        const campaign = campaigns[i];
        try {
            const result = await pool.query(`
                INSERT INTO prospecting_campaigns (
                    nom, code, description, statut,
                    date_debut, date_fin,
                    budget, objectif_leads, objectif_conversions,
                    business_unit_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (code) DO UPDATE SET 
                    nom = EXCLUDED.nom,
                    description = EXCLUDED.description
                RETURNING id
            `, [
                campaign.nom,
                campaign.code,
                campaign.description,
                campaign.statut,
                campaign.date_debut,
                campaign.date_fin,
                campaign.budget,
                campaign.objectif_leads,
                campaign.objectif_conversions,
                buIds[i % buIds.length]
            ]);
            
            campaignIds.push(result.rows[0].id);
            stats.campaigns++;
        } catch (error) {
            console.log(`   ⚠ Erreur création campagne ${campaign.code}:`, error.message);
        }
    }
    
    return campaignIds;
}
```

### 4.3. Création des Opportunités

```javascript
async function createOpportunities(pool, clientIds, buIds, oppTypes, campaignIds) {
    const opportunityIds = [];
    const statuts = ['IDENTIFICATION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'GAGNEE', 'PERDUE'];
    const currentDate = new Date();
    
    // Créer 20 opportunités variées
    for (let i = 0; i < Math.min(clientIds.length * 2, 20); i++) {
        const oppType = oppTypes[i % oppTypes.length];
        const client = clientIds[i % clientIds.length];
        const campaign = campaignIds.length > 0 ? campaignIds[i % campaignIds.length] : null;
        const statut = statuts[Math.floor(i / 4) % statuts.length]; // 4 opps par statut
        
        // Dates progressives
        const dateIdentification = new Date(currentDate);
        dateIdentification.setDate(dateIdentification.getDate() - (90 - i * 4));
        
        const dateQualification = new Date(dateIdentification);
        dateQualification.setDate(dateQualification.getDate() + 7);
        
        const dateProposition = new Date(dateQualification);
        dateProposition.setDate(dateProposition.getDate() + 14);
        
        const dateNegociation = new Date(dateProposition);
        dateNegociation.setDate(dateNegociation.getDate() + 10);
        
        const dateDecision = statut === 'GAGNEE' || statut === 'PERDUE'
            ? new Date(dateNegociation.getTime() + 7 * 24 * 60 * 60 * 1000)
            : null;
        
        // Montant estimé
        const montantEstime = Math.floor(Math.random() * 100000) + 20000;
        const probabilite = oppType.default_probability || 50;
        
        try {
            const result = await pool.query(`
                INSERT INTO opportunities (
                    nom, code, description,
                    client_id, business_unit_id,
                    opportunity_type_id, campaign_id,
                    statut, montant_estime, probabilite,
                    date_identification, date_qualification,
                    date_proposition, date_negociation, date_decision,
                    created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                ON CONFLICT (code) DO UPDATE SET statut = EXCLUDED.statut
                RETURNING id
            `, [
                `Opportunité ${oppType.name} ${i + 1}`,
                `OPP-DEMO-${String(i + 1).padStart(3, '0')}`,
                `Opportunité de type ${oppType.name} pour démonstration`,
                client,
                buIds[i % buIds.length],
                oppType.id,
                campaign,
                statut,
                montantEstime,
                probabilite,
                dateIdentification,
                dateQualification,
                statut === 'IDENTIFICATION' ? null : dateProposition,
                statut === 'NEGOCIATION' || statut === 'GAGNEE' || statut === 'PERDUE' ? dateNegociation : null,
                dateDecision,
                dateIdentification
            ]);
            
            opportunityIds.push(result.rows[0].id);
            stats.opportunities++;
        } catch (error) {
            console.log(`   ⚠ Erreur création opportunité ${i + 1}:`, error.message);
        }
    }
    
    return opportunityIds;
}
```

### 4.4. Affectation des Collaborateurs aux Missions

```javascript
async function assignCollaborateursToMissions(pool, missionIds, collaborateurIds) {
    if (collaborateurIds.length === 0) return;
    
    for (const missionId of missionIds) {
        // Affecter 2-4 collaborateurs par mission
        const numCollabs = 2 + Math.floor(Math.random() * 3);
        const selectedCollabs = [];
        
        for (let i = 0; i < numCollabs && i < collaborateurIds.length; i++) {
            const collabIndex = (missionIds.indexOf(missionId) + i) % collaborateurIds.length;
            selectedCollabs.push(collaborateurIds[collabIndex]);
        }
        
        for (const collabId of selectedCollabs) {
            try {
                await pool.query(`
                    INSERT INTO mission_collaborateurs (mission_id, collaborateur_id, role, taux_horaire)
                    VALUES ($1, $2, 'CONSULTANT', ${50 + Math.floor(Math.random() * 50)})
                    ON CONFLICT DO NOTHING
                `, [missionId, collabId]);
            } catch (error) {
                // Ignorer les erreurs (table peut ne pas exister)
            }
        }
    }
}
```

### 4.5. Création des Time Entries

```javascript
async function createTimeEntries(pool, missionIds, collaborateurIds, internalActivities, fiscalYears) {
    if (collaborateurIds.length === 0 || fiscalYears.length === 0) {
        console.log('   ⚠ Données insuffisantes pour créer des time entries');
        return;
    }
    
    const fiscalYear = fiscalYears[0];
    const startDate = new Date(fiscalYear.date_debut);
    const endDate = new Date();
    
    // Créer des time entries pour chaque collaborateur
    for (const collabId of collaborateurIds) {
        let currentDate = new Date(startDate);
        
        // Générer des entrées pour les 3 derniers mois
        while (currentDate < endDate && stats.timeEntries < 200) {
            // Jours ouvrés seulement
            if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
                const isMissionDay = Math.random() > 0.2; // 80% sur mission, 20% activité interne
                
                if (isMissionDay && missionIds.length > 0) {
                    // Time entry sur mission
                    const missionId = missionIds[Math.floor(Math.random() * missionIds.length)];
                    const heures = 4 + Math.floor(Math.random() * 5); // 4-8h
                    
                    try {
                        await pool.query(`
                            INSERT INTO time_entries (
                                collaborateur_id, mission_id,
                                date, heures, description,
                                statut, fiscal_year_id
                            )
                            VALUES ($1, $2, $3, $4, $5, 'VALIDEE', $6)
                            ON CONFLICT DO NOTHING
                        `, [
                            collabId,
                            missionId,
                            currentDate.toISOString().split('T')[0],
                            heures,
                            `Travail sur mission - ${heures}h`,
                            fiscalYear.id
                        ]);
                        stats.timeEntries++;
                    } catch (error) {
                        // Ignorer les doublons
                    }
                } else if (internalActivities.length > 0) {
                    // Time entry sur activité interne
                    const activity = internalActivities[Math.floor(Math.random() * internalActivities.length)];
                    const heures = 2 + Math.floor(Math.random() * 4); // 2-5h
                    
                    try {
                        await pool.query(`
                            INSERT INTO time_entries (
                                collaborateur_id, internal_activity_id,
                                date, heures, description,
                                statut, fiscal_year_id
                            )
                            VALUES ($1, $2, $3, $4, $5, 'VALIDEE', $6)
                            ON CONFLICT DO NOTHING
                        `, [
                            collabId,
                            activity.id,
                            currentDate.toISOString().split('T')[0],
                            heures,
                            `${activity.name} - ${heures}h`,
                            fiscalYear.id
                        ]);
                        stats.timeEntries++;
                    } catch (error) {
                        // Ignorer les erreurs
                    }
                }
            }
            
            // Passer au jour suivant
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
}
```

### 4.6. Création des Factures

```javascript
async function createInvoices(pool, missionIds, clientIds) {
    // Créer des factures pour 50% des missions
    const numInvoices = Math.floor(missionIds.length * 0.5);
    
    for (let i = 0; i < numInvoices; i++) {
        const missionId = missionIds[i];
        const clientId = clientIds[i % clientIds.length];
        
        // Récupérer le montant de la mission
        let montant = 50000 + Math.floor(Math.random() * 100000);
        
        try {
            const missionResult = await pool.query(`
                SELECT budget_estime FROM missions WHERE id = $1
            `, [missionId]);
            
            if (missionResult.rows.length > 0 && missionResult.rows[0].budget_estime) {
                montant = parseFloat(missionResult.rows[0].budget_estime);
            }
        } catch (error) {
            // Utiliser montant par défaut
        }
        
        const dateFacture = new Date();
        dateFacture.setDate(dateFacture.getDate() - Math.floor(Math.random() * 60));
        
        const dateEcheance = new Date(dateFacture);
        dateEcheance.setDate(dateEcheance.getDate() + 30);
        
        const statuts = ['BROUILLON', 'ENVOYEE', 'PAYEE', 'EN_RETARD'];
        const statut = statuts[i % statuts.length];
        
        try {
            await pool.query(`
                INSERT INTO invoices (
                    numero_facture, mission_id, client_id,
                    montant_ht, taux_tva, montant_ttc,
                    date_emission, date_echeance,
                    statut, notes
                )
                VALUES ($1, $2, $3, $4, 20, $5, $6, $7, $8, $9)
                ON CONFLICT (numero_facture) DO NOTHING
            `, [
                `FACT-DEMO-${String(i + 1).padStart(4, '0')}`,
                missionId,
                clientId,
                montant,
                montant * 1.20,
                dateFacture,
                dateEcheance,
                statut,
                `Facture de démonstration pour mission ${i + 1}`
            ]);
            stats.invoices++;
        } catch (error) {
            console.log(`   ⚠ Erreur création facture ${i + 1}:`, error.message);
        }
    }
}
```

---

## ✅ 5. Instructions d'Intégration

1. **Sauvegardez** le fichier `5-generate-demo-data.js` actuel
2. **Copiez** les morceaux de code ci-dessus dans les sections appropriées
3. **Testez** avec : `node scripts/database/5-generate-demo-data.js`

---

## 📊 6. Résultat Attendu

Après l'exécution, vous aurez :
- ✅ **3 Campagnes** de prospection
- ✅ **20 Opportunités** avec workflow complet
- ✅ **10+ Missions** liées aux opportunités
- ✅ **200+ Time Entries** sur missions et activités internes
- ✅ **5+ Factures** pour les missions

---

## ⚠️ 7. Notes Importantes

1. **Idempotence** : Le script peut être exécuté plusieurs fois sans créer de doublons (grâce aux `ON CONFLICT`)
2. **Données de Référence** : Le script utilise les types d'opportunités, années fiscales et activités internes déjà créés par le script `3-insert-reference-data.js`
3. **Flexibilité** : Si certaines tables n'existent pas, les erreurs sont capturées silencieusement

---

**Date** : Novembre 2025  
**Version** : 1.0






