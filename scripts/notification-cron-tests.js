// Script de tests d'intégration pour les crons de notifications (campagnes & missions)
// ATTENTION : ce script insère des données de test dans la base. À utiliser sur un environnement de dev/test.

const path = require('path');

// Charger la configuration standard de l'app (DB, etc.)
// Le pool PostgreSQL se base déjà sur configuration.env via utils/database
const { pool } = require('../src/utils/database');
const CronService = require('../src/services/cronService');
const OpportunityWorkflowService = require('../src/services/opportunityWorkflowService');
const NotificationService = require('../src/services/notificationService');
const { ProspectingCampaign } = require('../src/models/Prospecting');

async function withClient(fn) {
    const client = await pool.connect();
    try {
        return await fn(client);
    } finally {
        client.release();
    }
}

async function pickBusinessUnit(client) {
    const res = await client.query('SELECT id, nom FROM business_units ORDER BY created_at NULLS LAST, nom LIMIT 1');
    if (res.rows.length === 0) {
        console.log('❌ Aucune Business Unit trouvée');
        return null;
    }
    return res.rows[0];
}

async function pickCollaborateurWithUserInBU(client, businessUnitId) {
    const res = await client.query(`
        SELECT c.id AS collaborateur_id, c.nom, c.prenom, u.id AS user_id
        FROM collaborateurs c
        JOIN users u ON u.collaborateur_id = c.id
        WHERE c.business_unit_id = $1
          AND u.statut = 'ACTIF'
        ORDER BY c.nom, c.prenom
        LIMIT 1
    `, [businessUnitId]);
    if (res.rows.length === 0) {
        console.log('❌ Aucun collaborateur avec compte utilisateur actif trouvé dans la BU');
        return null;
    }
    return res.rows[0];
}

async function pickCompany(client) {
    const res = await client.query('SELECT id, name FROM companies ORDER BY created_at NULLS LAST, name LIMIT 1');
    if (res.rows.length === 0) {
        console.log('❌ Aucune entreprise trouvée');
        return null;
    }
    return res.rows[0];
}

async function pickTaskTemplate(client) {
    const res = await client.query('SELECT id, libelle FROM tasks WHERE actif = TRUE ORDER BY created_at NULLS LAST, libelle LIMIT 1');
    if (res.rows.length === 0) {
        console.log('❌ Aucune tâche (tasks) active trouvée');
        return null;
    }
    return res.rows[0];
}

async function resetTestNotifications(client) {
    console.log('🧹 Nettoyage des anciennes notifications de test (types spécifiques)...');
    const res = await client.query(`
        DELETE FROM notifications
        WHERE type IN (
            'CAMPAIGN_COMPANY_FOLLOWUP',
            'CAMPAIGN_COMPANY_FOLLOWUP_MGMT',
            'STAGE_OVERDUE',
            'OPPORTUNITY_INACTIVE',
            'MISSION_TASK_END_APPROACHING',
            'MISSION_TASK_END_APPROACHING_MGMT',
            'MISSION_TASK_OVERDUE_NOT_CLOSED',
            'MISSION_TASK_OVERDUE_NOT_CLOSED_MGMT',
            'MISSION_FEE_BILLING_OVERDUE',
            'MISSION_FEE_BILLING_OVERDUE_MGMT',
            'MISSION_EXPENSE_BILLING_OVERDUE',
            'MISSION_EXPENSE_BILLING_OVERDUE_MGMT'
        )
    `);
    console.log(`🧹 ${res.rowCount} notification(s) de test supprimée(s)`);
}

async function createCampaignFollowupScenario(client, bu, collab, company) {
    console.log('🧪 Création du scénario: campagne de relance entreprise...');

    // Campagne de test via le modèle officiel (schema-safe)
    const campaign = await ProspectingCampaign.create({
        name: 'Campagne Test Relance CRON',
        channel: 'EMAIL',
        business_unit_id: bu.id,
        status: 'VALIDATED',
        scheduled_date: new Date(Date.now() - 8 * 24 * 3600 * 1000),
        created_by: null,
        responsible_id: collab.collaborateur_id
    });

    // Lien avec l'entreprise, pas de conversion ni d'abandon
    // execution_status doit respecter le check constraint: pending_execution | deposed | sent | failed
    await client.query(`
        INSERT INTO prospecting_campaign_companies (
            campaign_id, company_id, execution_status, converted_to_opportunity,
            opportunity_id, execution_date, sent_at
        ) VALUES ($1, $2, 'sent', FALSE, NULL, NULL, CURRENT_DATE - INTERVAL '8 days')
    `, [campaign.id, company.id]);

    console.log('✅ Scénario campagne créé:', {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        company_id: company.id,
        company_name: company.name
    });

    return { campaign };
}

async function createMissionTaskEndApproachingScenario(client, bu, collab, taskTemplate) {
    console.log('🧪 Création du scénario: tâche de mission proche de la date de fin...');

    const missionRes = await client.query(`
        INSERT INTO missions (
            nom, business_unit_id, collaborateur_id, statut,
            date_debut, date_fin
        ) VALUES (
            $1, $2, $3, 'PLANIFIEE', CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days'
        ) RETURNING id, nom
    `, [
        'Mission Test Échéance CRON',
        bu.id,
        collab.collaborateur_id
    ]);

    const mission = missionRes.rows[0];

    const mtRes = await client.query(`
        INSERT INTO mission_tasks (
            mission_id, task_id, statut, date_debut, date_fin,
            duree_planifiee, created_at, updated_at
        ) VALUES (
            $1, $2, 'PLANIFIEE', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days',
            8, NOW(), NOW()
        ) RETURNING id
    `, [mission.id, taskTemplate.id]);

    const missionTaskId = mtRes.rows[0].id;

    await client.query(`
        INSERT INTO task_assignments (
            mission_task_id, collaborateur_id, heures_planifiees,
            heures_effectuees, taux_horaire, statut, created_at, updated_at
        ) VALUES (
            $1, $2, 8, 0, 100, 'PLANIFIE', NOW(), NOW()
        )
    `, [missionTaskId, collab.collaborateur_id]);

    console.log('✅ Scénario mission (échéance approchant) créé:', {
        mission_id: mission.id,
        mission_nom: mission.nom,
        mission_task_id: missionTaskId,
        task_libelle: taskTemplate.libelle
    });

    return { mission, missionTaskId };
}

// Créer une opportunité de test EN_COURS pour le collaborateur / BU fournis
async function createTestOpportunity(client, bu, collab) {
    console.log('🧪 Création du scénario: opportunité de test...');

    const oppRes = await client.query(`
        INSERT INTO opportunities (
            nom, statut, business_unit_id, collaborateur_id, etape_vente, created_by, last_activity_at
        ) VALUES (
            $1, 'EN_COURS', $2, $3, 'PROSPECTION', NULL, CURRENT_DATE - INTERVAL '10 days'
        )
        RETURNING id, nom, collaborateur_id, last_activity_at
    `, [
        'Opportunité Test CRON',
        bu.id,
        collab.collaborateur_id
    ]);

    const opportunity = oppRes.rows[0];

    console.log('✅ Opportunité de test créée:', {
        opportunity_id: opportunity.id,
        opportunity_nom: opportunity.nom,
        collaborateur_id: opportunity.collaborateur_id
    });

    return opportunity;
}

// Forcer une étape en retard sur une opportunité existante
async function ensureOverdueStageForOpportunity(client, opportunity) {
    console.log('🧪 Préparation du scénario: étape d\'opportunité en retard...');

    // Chercher une étape existante pour cette opportunité
    let stageRes = await client.query(`
        SELECT id
        FROM opportunity_stages
        WHERE opportunity_id = $1
        ORDER BY stage_order ASC
        LIMIT 1
    `, [opportunity.id]);

    // Si aucune étape n'existe (trigger non exécuté ou modèle manquant), en créer une basique
    if (stageRes.rows.length === 0) {
        console.log('⚠️ Aucune étape trouvée pour cette opportunité, création d\'une étape de test...');

        // Prendre un template d'étape existant (le premier trouvé)
        let tplRes = await client.query(`
            SELECT id, stage_name, stage_order
            FROM opportunity_stage_templates
            ORDER BY stage_order ASC
            LIMIT 1
        `);

        // S'il n'y a aucun template, créer un type d'opportunité et un template de test
        if (tplRes.rows.length === 0) {
            console.log('⚠️ Aucun template d\'étape trouvé, création d\'un type et d\'un template de test...');

            const typeRes = await client.query(`
                INSERT INTO opportunity_types (name, nom, code, description, is_active)
                VALUES ($1, $2, $3, $4, true)
                ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
            `, [
                'TEST_CRON_TYPE',
                'Type Test CRON',
                'TEST_CRON',
                'Type d\'opportunité de test pour les crons'
            ]);

            const oppTypeId = typeRes.rows[0].id;

            const tplInsertRes = await client.query(`
                INSERT INTO opportunity_stage_templates (
                    opportunity_type_id, stage_name, stage_order,
                    description, required_documents, required_actions,
                    max_duration_days, min_duration_days, is_mandatory,
                    can_skip, validation_required
                ) VALUES (
                    $1, $2, 1,
                    $3, '[]'::jsonb, '[]'::jsonb,
                    10, 1, true,
                    false, false
                )
                RETURNING id, stage_name, stage_order
            `, [
                oppTypeId,
                'Étape Test CRON',
                'Étape de test pour les crons de notifications'
            ]);

            tplRes = tplInsertRes;
        }

        const tpl = tplRes.rows[0];

        const insRes = await client.query(`
            INSERT INTO opportunity_stages (
                opportunity_id, stage_template_id, stage_name, stage_order,
                status, due_date
            ) VALUES (
                $1, $2, $3, $4,
                'IN_PROGRESS', CURRENT_DATE - INTERVAL '3 days'
            )
            RETURNING id
        `, [
            opportunity.id,
            tpl.id,
            tpl.stage_name || 'Étape Test',
            tpl.stage_order || 1
        ]);

        stageRes = { rows: insRes.rows };
    }

    const stageId = stageRes.rows[0].id;

    await client.query(`
        UPDATE opportunity_stages
        SET status = 'IN_PROGRESS',
            due_date = CURRENT_DATE - INTERVAL '2 days'
        WHERE id = $1
    `, [stageId]);

    console.log('✅ Étape marquée comme en retard pour l\'opportunité:', {
        opportunity_id: opportunity.id,
        opportunity_nom: opportunity.nom,
        stage_id: stageId
    });

    return { stageId };
}

// Forcer une opportunité inactive (dernière activité ancienne)
async function ensureInactiveOpportunity(client, opportunity) {
    console.log('🧪 Préparation du scénario: opportunité inactive...');

    await client.query(`
        UPDATE opportunities
        SET last_activity_at = CURRENT_DATE - INTERVAL '15 days'
        WHERE id = $1
    `, [opportunity.id]);

    console.log('✅ Opportunité marquée comme inactive (last_activity_at -15 jours):', {
        opportunity_id: opportunity.id,
        opportunity_nom: opportunity.nom
    });
}

// Mission avec honoraires / débours en retard de facturation
async function createMissionBillingOverdueScenario(client, bu, collab) {
    console.log('🧪 Création du scénario: missions avec facturation honoraires / débours en retard...');

    // Mission pour honoraires en retard (montant_honoraires > facturé)
    const missionFeeRes = await client.query(`
        INSERT INTO missions (
            nom, business_unit_id, collaborateur_id, statut,
            date_debut, date_fin, montant_honoraires, montant_debours
        ) VALUES (
            $1, $2, $3, 'TERMINEE', CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE - INTERVAL '30 days',
            1000000, 0
        ) RETURNING id, nom
    `, [
        'Mission Test Facturation Honoraires CRON',
        bu.id,
        collab.collaborateur_id
    ]);

    const missionFee = missionFeeRes.rows[0];

    // Mission pour débours en retard (montant_debours > 0, aucune facture)
    const missionExpRes = await client.query(`
        INSERT INTO missions (
            nom, business_unit_id, collaborateur_id, statut,
            date_debut, date_fin, montant_honoraires, montant_debours
        ) VALUES (
            $1, $2, $3, 'TERMINEE', CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE - INTERVAL '30 days',
            0, 500000
        ) RETURNING id, nom
    `, [
        'Mission Test Facturation Débours CRON',
        bu.id,
        collab.collaborateur_id
    ]);

    const missionExp = missionExpRes.rows[0];

    console.log('✅ Scénarios missions facturation créés:', {
        mission_fee_id: missionFee.id,
        mission_fee_nom: missionFee.nom,
        mission_expense_id: missionExp.id,
        mission_expense_nom: missionExp.nom
    });

    return { missionFee, missionExp };
}

async function createMissionTaskOverdueScenario(client, bu, collab, taskTemplate) {
    console.log('🧪 Création du scénario: tâche de mission en retard non clôturée...');

    const missionRes = await client.query(`
        INSERT INTO missions (
            nom, business_unit_id, collaborateur_id, statut,
            date_debut, date_fin
        ) VALUES (
            $1, $2, $3, 'EN_COURS', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '5 days'
        ) RETURNING id, nom
    `, [
        'Mission Test Retard CRON',
        bu.id,
        collab.collaborateur_id
    ]);

    const mission = missionRes.rows[0];

    const mtRes = await client.query(`
        INSERT INTO mission_tasks (
            mission_id, task_id, statut, date_debut, date_fin,
            duree_planifiee, created_at, updated_at
        ) VALUES (
            $1, $2, 'EN_COURS', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '7 days',
            12, NOW(), NOW()
        ) RETURNING id
    `, [mission.id, taskTemplate.id]);

    const missionTaskId = mtRes.rows[0].id;

    await client.query(`
        INSERT INTO task_assignments (
            mission_task_id, collaborateur_id, heures_planifiees,
            heures_effectuees, taux_horaire, statut, created_at, updated_at
        ) VALUES (
            $1, $2, 12, 6, 100, 'PLANIFIE', NOW(), NOW()
        )
    `, [missionTaskId, collab.collaborateur_id]);

    console.log('✅ Scénario mission (retard non clôturé) créé:', {
        mission_id: mission.id,
        mission_nom: mission.nom,
        mission_task_id: missionTaskId,
        task_libelle: taskTemplate.libelle
    });

    return { mission, missionTaskId };
}

async function fetchNotificationsSummary(client) {
    const res = await client.query(`
        SELECT type, COUNT(*) as count
        FROM notifications
        WHERE type IN (
            'CAMPAIGN_COMPANY_FOLLOWUP',
            'CAMPAIGN_COMPANY_FOLLOWUP_MGMT',
            'STAGE_OVERDUE',
            'OPPORTUNITY_INACTIVE',
            'MISSION_TASK_END_APPROACHING',
            'MISSION_TASK_END_APPROACHING_MGMT',
            'MISSION_TASK_OVERDUE_NOT_CLOSED',
            'MISSION_TASK_OVERDUE_NOT_CLOSED_MGMT',
            'MISSION_FEE_BILLING_OVERDUE',
            'MISSION_FEE_BILLING_OVERDUE_MGMT',
            'MISSION_EXPENSE_BILLING_OVERDUE',
            'MISSION_EXPENSE_BILLING_OVERDUE_MGMT'
        )
        GROUP BY type
        ORDER BY type
    `);

    console.log('📊 Récapitulatif des notifications créées:');
    if (res.rows.length === 0) {
        console.log('   (aucune notification de ces types)');
    } else {
        for (const row of res.rows) {
            console.log(`   - ${row.type}: ${row.count}`);
        }
    }
}

async function runTests() {
    console.log('🚀 Lancement des tests de crons de notifications...');

    await withClient(async (client) => {
        await resetTestNotifications(client);

        const bu = await pickBusinessUnit(client);
        if (!bu) return;

        const collab = await pickCollaborateurWithUserInBU(client, bu.id);
        if (!collab) return;

        const company = await pickCompany(client);
        if (!company) return;

        const taskTemplate = await pickTaskTemplate(client);
        if (!taskTemplate) return;

        console.log('🔧 Contexte de test:', {
            business_unit_id: bu.id,
            business_unit_nom: bu.nom,
            collaborateur_id: collab.collaborateur_id,
            collaborateur_nom: `${collab.nom} ${collab.prenom}`,
            company_id: company.id,
            company_name: company.name,
            task_id: taskTemplate.id,
            task_libelle: taskTemplate.libelle
        });

        // Créer les scénarios (campagne + missions)
        await createCampaignFollowupScenario(client, bu, collab, company);
        await createMissionTaskEndApproachingScenario(client, bu, collab, taskTemplate);
        await createMissionTaskOverdueScenario(client, bu, collab, taskTemplate);

        // Créer et préparer une opportunité de test (étape en retard + opportunité inactive)
        const opportunity = await createTestOpportunity(client, bu, collab);
        await ensureOverdueStageForOpportunity(client, opportunity);
        await ensureInactiveOpportunity(client, opportunity);

        // Créer les missions de test pour la facturation en retard (honoraires / débours)
        await createMissionBillingOverdueScenario(client, bu, collab);
    });

    // Exécuter les vérifications des crons
    console.log('\n⏱️ Exécution CronService.checkCampaignCompanyFollowups()');
    await CronService.checkCampaignCompanyFollowups();

    console.log('\n⏱️ Exécution CronService.checkMissionTaskEndApproaching()');
    await CronService.checkMissionTaskEndApproaching();

    console.log('\n⏱️ Exécution CronService.checkMissionTaskOverdueNotClosed()');
    await CronService.checkMissionTaskOverdueNotClosed();

    console.log('\n⏱️ Exécution CronService.checkMissionFeeBillingOverdue()');
    await CronService.checkMissionFeeBillingOverdue();

    console.log('\n⏱️ Exécution CronService.checkMissionExpenseBillingOverdue()');
    await CronService.checkMissionExpenseBillingOverdue();

    // Exécuter les vérifications liées aux opportunités
    console.log('\n⏱️ Exécution OpportunityWorkflowService.checkOverdueStages() + notifications STAGE_OVERDUE');
    const overdueStages = await OpportunityWorkflowService.checkOverdueStages();
    if (overdueStages.length === 0) {
        console.log('✅ Aucune étape en retard détectée pour le scénario de test');
    } else {
        for (const stage of overdueStages) {
            await NotificationService.sendOverdueNotification(stage.id, stage.opportunity_id);
        }
    }

    console.log('\n⏱️ Vérification des opportunités inactives (OPPORTUNITY_INACTIVE)');
    // Rejouer la requête de CronService.scheduleInactiveOpportunitiesCheck pour les besoins du test
    const inactiveRes = await pool.query(`
        SELECT 
            o.id,
            o.nom,
            o.collaborateur_id,
            u.nom as collaborateur_nom,
            u.email as collaborateur_email,
            o.last_activity_at,
            EXTRACT(DAY FROM CURRENT_TIMESTAMP - o.last_activity_at) as jours_inactif
        FROM opportunities o
        LEFT JOIN users u ON o.collaborateur_id = u.id
        WHERE o.statut = 'EN_COURS'
          AND o.last_activity_at < CURRENT_DATE - INTERVAL '7 days'
          AND o.last_activity_at > CURRENT_DATE - INTERVAL '30 days'
    `);

    for (const opp of inactiveRes.rows) {
        await CronService.createInactiveOpportunityNotification(opp);
    }

    // Afficher un récapitulatif des notifications créées
    await withClient(fetchNotificationsSummary);

    console.log('\n✅ Tests terminés');
}

runTests()
    .catch((err) => {
        console.error('❌ Erreur lors de l\'exécution des tests de crons:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await pool.end();
        } catch (e) {
            // ignore
        }
    });
