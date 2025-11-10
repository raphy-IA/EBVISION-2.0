#!/usr/bin/env node

/**
 * SCRIPT 7 : GÉNÉRATION COMPLÈTE DE DONNÉES DE DÉMO
 * ==================================================
 * 
 * Version améliorée qui génère TOUTES les données nécessaires :
 * - Business Units et Divisions
 * - Collaborateurs et Utilisateurs
 * - Clients
 * - Campagnes de prospection
 * - Missions (avec codes corrects et liens BU/Division)
 * - Opportunités
 * - Time Sheets et Time Entries
 * - Factures (liées aux missions)
 * 
 * Usage: node scripts/database/7-generate-complete-demo.js [--clean]
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const inquirer = require('inquirer');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║       GÉNÉRATION COMPLÈTE DE DONNÉES DE DÉMO                ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Configuration
const DEMO_PASSWORD = 'Demo@2025';
const DEMO_EMAIL_DOMAIN = '@ewm-demo.com';

// Statistiques
const stats = {
    businessUnits: 0,
    divisions: 0,
    collaborateurs: 0,
    users: 0,
    tauxHoraires: 0,
    clients: 0,
    campaigns: 0,
    missions: 0,
    opportunities: 0,
    timeSheets: 0,
    timeEntries: 0,
    invoices: 0
};

// ===============================================
// FONCTION PRINCIPALE
// ===============================================

async function main() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('📡 Test de connexion à la base de données...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie!\n');

        // Vérifier les données existantes
        const existingData = await checkExistingData(pool);
        console.log('📊 Données existantes :');
        console.log('═══════════════════════');
        Object.entries(existingData).forEach(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1').trim();
            console.log(`   ${label.padEnd(20)}: ${value}`);
        });
        console.log('');

        // Mode --clean
        const args = process.argv.slice(2);
        if (args.includes('--clean')) {
            const confirm = await inquirer.prompt([{
                type: 'confirm',
                name: 'proceed',
                message: '⚠️  Supprimer les données de démo existantes?',
                default: false
            }]);

            if (confirm.proceed) {
                await cleanDemoData(pool);
            } else {
                console.log('\n❌ Nettoyage annulé\n');
                await pool.end();
                return;
            }
        }

        // Confirmation
        const confirm = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: 'Générer les données de démo complètes?',
            default: true
        }]);

        if (!confirm.proceed) {
            console.log('\n❌ Génération annulée\n');
            await pool.end();
            return;
        }

        console.log('\n🚀 Génération des données...\n');

        // Charger les données de référence
        console.log('📋 Chargement des données de référence...');
        const refData = await loadReferenceData(pool);
        console.log(`   ✓ ${refData.grades.length} Grades`);
        console.log(`   ✓ ${refData.postes.length} Postes`);
        console.log(`   ✓ ${refData.typesCollaborateurs.length} Types de collaborateurs`);
        console.log(`   ✓ ${refData.missionTypes.length} Types de mission`);
        console.log(`   ✓ ${refData.tasks.length} Tâches disponibles`);
        console.log(`   ✓ ${refData.oppTypes.length} Types d'opportunités`);
        console.log(`   ✓ ${refData.fiscalYears.length} Années fiscales`);
        console.log(`   ✓ ${refData.companies.length} Entreprises disponibles`);
        console.log(`   ✓ ${refData.internalActivities.length} Activités internes\n`);

        // Vérifications
        if (refData.grades.length === 0 || refData.postes.length === 0) {
            throw new Error('Données de référence manquantes. Exécutez d\'abord 3-insert-reference-data.js');
        }

        // 1. Business Units
        console.log('📦 Création des Business Units...');
        const buIds = await createBusinessUnits(pool);
        console.log(`   ✓ ${stats.businessUnits} créées\n`);

        // 2. Divisions
        console.log('🏢 Création des Divisions...');
        const divisionIds = await createDivisions(pool, buIds);
        console.log(`   ✓ ${stats.divisions} créées\n`);

        // 3. Collaborateurs
        console.log('👥 Création des Collaborateurs...');
        const { collaborateurIds, userIds } = await createCollaborateurs(pool, buIds, divisionIds, refData);
        console.log(`   ✓ ${stats.collaborateurs} collaborateurs`);
        console.log(`   ✓ ${stats.users} utilisateurs\n`);

        // 3b. Taux horaires
        console.log('💰 Création des Taux Horaires...');
        await createTauxHoraires(pool, refData.grades, divisionIds);
        console.log(`   ✓ ${stats.tauxHoraires} taux horaires créés\n`);

        // 4. Clients
        console.log('🏢 Création des Clients...');
        const clientIds = await createClients(pool, refData.companies);
        console.log(`   ✓ ${stats.clients} clients\n`);

        // 5. Campagnes de prospection
        console.log('📢 Création des Campagnes de prospection...');
        const campaignIds = await createProspectingCampaigns(pool, buIds, divisionIds, collaborateurIds);
        console.log(`   ✓ ${stats.campaigns} campagnes\n`);

        // 6. Missions
        console.log('📋 Création des Missions...');
        const missionIds = await createMissions(pool, clientIds, buIds, divisionIds, collaborateurIds, refData);
        console.log(`   ✓ ${stats.missions} missions\n`);

        // 7. Opportunités
        console.log('💡 Création des Opportunités...');
        await createOpportunities(pool, clientIds, buIds, collaborateurIds, refData, campaignIds);
        console.log(`   ✓ ${stats.opportunities} opportunités\n`);

        // 8. Time Sheets et Time Entries
        console.log('⏱️  Création des Time Sheets et Time Entries...');
        await createTimeData(pool, userIds, missionIds, refData);
        console.log(`   ✓ ${stats.timeSheets} time sheets`);
        console.log(`   ✓ ${stats.timeEntries} time entries\n`);

        // 9. Factures
        console.log('💰 Création des Factures...');
        await createInvoices(pool, missionIds, clientIds, refData);
        console.log(`   ✓ ${stats.invoices} factures\n`);

        // Résumé
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║         ✅ DONNÉES DE DÉMO GÉNÉRÉES AVEC SUCCÈS             ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   ✓ Business Units       : ${stats.businessUnits}`);
        console.log(`   ✓ Divisions            : ${stats.divisions}`);
        console.log(`   ✓ Collaborateurs       : ${stats.collaborateurs}`);
        console.log(`   ✓ Utilisateurs         : ${stats.users}`);
        console.log(`   ✓ Taux Horaires        : ${stats.tauxHoraires}`);
        console.log(`   ✓ Clients              : ${stats.clients}`);
        console.log(`   ✓ Campagnes            : ${stats.campaigns}`);
        console.log(`   ✓ Missions             : ${stats.missions}`);
        console.log(`   ✓ Opportunités         : ${stats.opportunities}`);
        console.log(`   ✓ Time Sheets          : ${stats.timeSheets}`);
        console.log(`   ✓ Time Entries         : ${stats.timeEntries}`);
        console.log(`   ✓ Factures             : ${stats.invoices}`);
        
        console.log('\n🔑 COMPTES DE DÉMO :');
        console.log('════════════════════');
        console.log(`   📧 Email        : jean.dupont${DEMO_EMAIL_DOMAIN}`);
        console.log(`   🔐 Mot de passe : ${DEMO_PASSWORD}`);
        console.log(`   ℹ️  Tous les utilisateurs de démo utilisent le même mot de passe\n`);

        await pool.end();

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        if (pool) await pool.end();
        process.exit(1);
    }
}

// ===============================================
// FONCTIONS UTILITAIRES
// ===============================================

async function checkExistingData(pool) {
    const data = {};
    const mapping = {
        business_units: 'businessUnits',
        divisions: 'divisions',
        collaborateurs: 'collaborateurs',
        clients: 'clients',
        prospecting_campaigns: 'campaigns',
        missions: 'missions',
        opportunities: 'opportunities',
        time_sheets: 'timeSheets',
        time_entries: 'timeEntries',
        invoices: 'invoices'
    };
    
    for (const [table, key] of Object.entries(mapping)) {
        try {
            const result = await pool.query(`SELECT COUNT(*) AS count FROM ${table}`);
            data[key] = parseInt(result.rows[0].count, 10);
        } catch (error) {
            data[key] = 0;
        }
    }
    return data;
}

async function cleanDemoData(pool) {
    console.log('\n🧹 Nettoyage des données de démo...\n');
    
    const tables = [
        { name: 'invoices', condition: `numero_facture LIKE 'FACT-DEMO-%'` },
        { name: 'time_entries', condition: `user_id IN (SELECT id FROM users WHERE email LIKE '%${DEMO_EMAIL_DOMAIN}')` },
        { name: 'time_sheets', condition: `user_id IN (SELECT id FROM users WHERE email LIKE '%${DEMO_EMAIL_DOMAIN}')` },
        { name: 'opportunities', condition: `collaborateur_id IN (SELECT id FROM collaborateurs WHERE email LIKE '%${DEMO_EMAIL_DOMAIN}')` },
        { name: 'missions', condition: `code LIKE 'MISS-DEMO-%'` },
        { name: 'prospecting_campaigns', condition: `name LIKE '%DEMO%'` },
        { name: 'clients', condition: `code_client LIKE 'CLT-DEMO-%'` },
        { name: 'collaborateurs', condition: `email LIKE '%${DEMO_EMAIL_DOMAIN}'` },
        { name: 'users', condition: `email LIKE '%${DEMO_EMAIL_DOMAIN}'` }
    ];
    
    for (const table of tables) {
        try {
            const result = await pool.query(`DELETE FROM ${table.name} WHERE ${table.condition}`);
            console.log(`   ✓ ${table.name}: ${result.rowCount} ligne(s) supprimée(s)`);
        } catch (error) {
            console.log(`   ⚠ ${table.name}: ${error.message}`);
        }
    }
    
    console.log('\n✅ Nettoyage terminé\n');
}

async function loadReferenceData(pool) {
    const data = {
        grades: [],
        postes: [],
        typesCollaborateurs: [],
        missionTypes: [],
        tasks: [],
        oppTypes: [],
        fiscalYears: [],
        companies: [],
        internalActivities: []
    };
    
    try {
        const gradesResult = await pool.query('SELECT id, nom, code FROM grades ORDER BY niveau DESC LIMIT 6');
        data.grades = gradesResult.rows;
        
        const postesResult = await pool.query('SELECT id, nom, code FROM postes WHERE statut = \'ACTIF\' LIMIT 6');
        data.postes = postesResult.rows;
        
        const typesCollabResult = await pool.query('SELECT id, nom, code FROM types_collaborateurs WHERE statut = \'ACTIF\' LIMIT 5');
        data.typesCollaborateurs = typesCollabResult.rows;
        
        const missionTypesResult = await pool.query('SELECT id, codification, libelle FROM mission_types WHERE actif = true');
        data.missionTypes = missionTypesResult.rows;
        
        const tasksResult = await pool.query('SELECT id, code, libelle FROM tasks WHERE actif = true LIMIT 20');
        data.tasks = tasksResult.rows;
        
        const oppTypesResult = await pool.query('SELECT id, name, code FROM opportunity_types WHERE is_active = true');
        data.oppTypes = oppTypesResult.rows;
        
        const fiscalYearsResult = await pool.query(`
            SELECT id, annee, date_debut, date_fin 
            FROM fiscal_years 
            WHERE statut IN ('EN_COURS', 'OUVERTE')
            ORDER BY annee DESC LIMIT 1
        `);
        data.fiscalYears = fiscalYearsResult.rows;
        
        const companiesResult = await pool.query('SELECT id, name, sigle, industry, country, city FROM companies LIMIT 20');
        data.companies = companiesResult.rows;
        
        const activitiesResult = await pool.query('SELECT id, name FROM internal_activities WHERE is_active = true LIMIT 10');
        data.internalActivities = activitiesResult.rows;
        
    } catch (error) {
        console.log('   ⚠️ Erreur chargement données de référence:', error.message);
    }
    
    return data;
}

// ===============================================
// FONCTIONS DE CRÉATION
// ===============================================

async function createBusinessUnits(pool) {
    const businessUnits = [
        { nom: 'Audit & Conseil', code: 'AUDIT-DEMO', description: 'Division Audit et Conseil' },
        { nom: 'Juridique & Fiscal', code: 'JURID-DEMO', description: 'Division Juridique et Fiscal' },
        { nom: 'Gestion & Finance', code: 'GEST-DEMO', description: 'Division Gestion et Finance' }
    ];
    
    const ids = [];
    
    for (const bu of businessUnits) {
        try {
            const result = await pool.query(`
                INSERT INTO business_units (nom, code, description)
                VALUES ($1, $2, $3)
                ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom
                RETURNING id
            `, [bu.nom, bu.code, bu.description]);
            
            ids.push(result.rows[0].id);
            stats.businessUnits++;
        } catch (error) {
            console.log(`   ⚠️ ${bu.code}: ${error.message}`);
        }
    }
    
    return ids;
}

async function createDivisions(pool, buIds) {
    const divisions = [
        { nom: 'Audit Comptable', code: 'AUD-DEMO', buIndex: 0 },
        { nom: 'Conseil en Management', code: 'CONS-DEMO', buIndex: 0 },
        { nom: 'Services Juridiques', code: 'JUR-DEMO', buIndex: 1 },
        { nom: 'Fiscalité', code: 'FISC-DEMO', buIndex: 1 },
        { nom: 'Gestion Financière', code: 'GEST-DEMO', buIndex: 2 },
        { nom: 'Comptabilité', code: 'COMP-DEMO', buIndex: 2 }
    ];
    
    const ids = [];
    
    for (const div of divisions) {
        try {
            const result = await pool.query(`
                INSERT INTO divisions (nom, code, business_unit_id)
                VALUES ($1, $2, $3)
                ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom
                RETURNING id
            `, [div.nom, div.code, buIds[div.buIndex]]);
            
            ids.push(result.rows[0].id);
            stats.divisions++;
        } catch (error) {
            console.log(`   ⚠️ ${div.code}: ${error.message}`);
        }
    }
    
    return ids;
}

async function createCollaborateurs(pool, buIds, divisionIds, refData) {
    const collaborateurs = [
        { nom: 'Dupont', prenom: 'Jean', gradeIdx: 2, posteIdx: 0, typeCollabIdx: 0, buIdx: 0, divIdx: 0, role: 'COLLABORATEUR', isResponsableBU: false },
        { nom: 'Martin', prenom: 'Sophie', gradeIdx: 1, posteIdx: 1, typeCollabIdx: 1, buIdx: 0, divIdx: 1, role: 'MANAGER', isResponsableBU: true },
        { nom: 'Bernard', prenom: 'Pierre', gradeIdx: 1, posteIdx: 2, typeCollabIdx: 1, buIdx: 1, divIdx: 3, role: 'MANAGER', isResponsableBU: true },
        { nom: 'Dubois', prenom: 'Marie', gradeIdx: 3, posteIdx: 2, typeCollabIdx: 2, buIdx: 1, divIdx: 2, role: 'CONSULTANT', isResponsableBU: false },
        { nom: 'Lefebvre', prenom: 'Thomas', gradeIdx: 4, posteIdx: 0, typeCollabIdx: 0, buIdx: 0, divIdx: 0, role: 'COLLABORATEUR', isResponsableBU: false },
        { nom: 'Moreau', prenom: 'Julie', gradeIdx: 2, posteIdx: 4, typeCollabIdx: 2, buIdx: 1, divIdx: 3, role: 'CONSULTANT', isResponsableBU: false },
        { nom: 'Petit', prenom: 'Lucas', gradeIdx: 3, posteIdx: 5, typeCollabIdx: 0, buIdx: 2, divIdx: 5, role: 'COLLABORATEUR', isResponsableBU: true },
        { nom: 'Robert', prenom: 'Emma', gradeIdx: 0, posteIdx: 0, typeCollabIdx: 0, buIdx: 0, divIdx: 0, role: 'COLLABORATEUR', isResponsableBU: false }
    ];
    
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const collabIds = [];
    const userIdsList = [];
    
    // Récupérer les rôles
    const rolesResult = await pool.query('SELECT id, name FROM roles');
    const rolesMap = {};
    rolesResult.rows.forEach(r => rolesMap[r.name] = r.id);
    
    for (const collab of collaborateurs) {
        try {
            const email = `${collab.prenom.toLowerCase()}.${collab.nom.toLowerCase()}${DEMO_EMAIL_DOMAIN}`;
            const login = `${collab.prenom.substring(0, 1)}${collab.nom}`.toLowerCase();
            
            // Créer l'utilisateur
            const userResult = await pool.query(`
                INSERT INTO users (nom, prenom, email, password_hash, login, role, statut)
                VALUES ($1, $2, $3, $4, $5, 'COLLABORATEUR', 'ACTIF')
                ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
                RETURNING id
            `, [collab.nom, collab.prenom, email, passwordHash, login]);
            
            const userId = userResult.rows[0].id;
            userIdsList.push(userId);
            stats.users++;
            
            // Associer le rôle
            const roleId = rolesMap[collab.role] || rolesMap['COLLABORATEUR'];
            if (roleId) {
                await pool.query(`
                    INSERT INTO user_roles (user_id, role_id)
                    VALUES ($1, $2)
                    ON CONFLICT (user_id, role_id) DO NOTHING
                `, [userId, roleId]);
            }
            
            // Créer le collaborateur
            const gradeId = refData.grades[collab.gradeIdx]?.id || refData.grades[0]?.id;
            const posteId = refData.postes[collab.posteIdx]?.id || refData.postes[0]?.id;
            const typeCollabId = refData.typesCollaborateurs[collab.typeCollabIdx]?.id || refData.typesCollaborateurs[0]?.id;
            const businessUnitId = buIds[collab.buIdx] || buIds[0];
            const divisionId = divisionIds[collab.divIdx] || divisionIds[0];
            const initiales = `${collab.prenom[0]}${collab.nom[0]}`.toUpperCase();
            
            const collabResult = await pool.query(`
                INSERT INTO collaborateurs (
                    nom, prenom, email, user_id, initiales,
                    business_unit_id, division_id, 
                    grade_actuel_id, poste_actuel_id, type_collaborateur_id,
                    statut, date_embauche
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIF', CURRENT_DATE)
                ON CONFLICT (email) DO UPDATE SET 
                    user_id = EXCLUDED.user_id,
                    grade_actuel_id = EXCLUDED.grade_actuel_id,
                    poste_actuel_id = EXCLUDED.poste_actuel_id,
                    type_collaborateur_id = EXCLUDED.type_collaborateur_id
                RETURNING id
            `, [
                collab.nom, collab.prenom, email, userId, initiales,
                businessUnitId, divisionId, gradeId, posteId, typeCollabId
            ]);
            
            const collaborateurId = collabResult.rows[0].id;
            collabIds.push(collaborateurId);
            stats.collaborateurs++;
            
            // TODO: Ajouter la colonne responsable_id dans business_units si nécessaire
            // Pour l'instant, les responsables sont identifiés par leur rôle MANAGER
        } catch (error) {
            console.log(`   ⚠️ ${collab.prenom} ${collab.nom}: ${error.message}`);
        }
    }
    
    return { collaborateurIds: collabIds, userIds: userIdsList };
}

async function createTauxHoraires(pool, grades, divisionIds) {
    // Définir des taux horaires réalistes par grade (en FCFA)
    const tauxParGrade = {
        'Associé': { taux: 150000, salaire: 8000000 },
        'Manager': { taux: 85000, salaire: 4500000 },
        'Senior': { taux: 65000, salaire: 3500000 },
        'Assistant': { taux: 50000, salaire: 2500000 },
        'Junior': { taux: 35000, salaire: 1800000 },
        'Stagiaire': { taux: 20000, salaire: 800000 }
    };
    
    for (const grade of grades) {
        const taux = tauxParGrade[grade.nom] || { taux: 50000, salaire: 2500000 };
        
        for (const divisionId of divisionIds) {
            try {
                await pool.query(`
                    INSERT INTO taux_horaires (
                        grade_id, division_id,
                        taux_horaire, salaire_base,
                        statut, date_effet,
                        created_at, updated_at
                    )
                    VALUES ($1, $2, $3, $4, 'ACTIF', CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (grade_id, division_id, date_effet) 
                    DO UPDATE SET
                        taux_horaire = EXCLUDED.taux_horaire,
                        salaire_base = EXCLUDED.salaire_base,
                        statut = EXCLUDED.statut
                `, [grade.id, divisionId, taux.taux, taux.salaire]);
                
                stats.tauxHoraires++;
            } catch (error) {
                // Ignorer les erreurs de doublon
                if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
                    console.log(`   ⚠️ Taux ${grade.nom}: ${error.message}`);
                }
            }
        }
    }
}

async function createClients(pool, companies) {
    const clientIds = [];
    const selectedCompanies = companies.slice(0, 8);
    
    for (let i = 0; i < selectedCompanies.length; i++) {
        const company = selectedCompanies[i];
        
        try {
            const sigle = company.sigle || company.name.substring(0, 3).toUpperCase();
            const result = await pool.query(`
                INSERT INTO clients (
                    nom, raison_sociale, sigle, code_client,
                    email, secteur, ville, pays, statut
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIF')
                ON CONFLICT (code_client) DO UPDATE SET nom = EXCLUDED.nom
                RETURNING id
            `, [
                company.name,
                company.name,
                sigle,
                `CLT-DEMO-${String(i + 1).padStart(3, '0')}`,
                `contact@${sigle.toLowerCase()}.com`,
                company.industry || 'Non spécifié',
                company.city || 'Yaoundé',
                company.country || 'Cameroun'
            ]);
            
            clientIds.push(result.rows[0].id);
            stats.clients++;
        } catch (error) {
            console.log(`   ⚠️ Client ${i + 1}: ${error.message}`);
        }
    }
    
    return clientIds;
}

async function createProspectingCampaigns(pool, buIds, divisionIds, collaborateurIds) {
    if (collaborateurIds.length === 0) {
        console.log('   ⚠️ Aucun collaborateur disponible pour les campagnes');
        return [];
    }
    
    console.log(`   📊 Création avec ${collaborateurIds.length} collaborateurs disponibles`);
    
    const campaigns = [
        { name: 'Campagne Audit Q1 2025', channel: 'EMAIL', buIdx: 0, divIdx: 0, status: 'DRAFT', priority: 'NORMAL' },
        { name: 'Campagne Conseil Management', channel: 'PHYSIQUE', buIdx: 0, divIdx: 1, status: 'PENDING_VALIDATION', priority: 'HIGH' },
        { name: 'Campagne Juridique Entreprises', channel: 'EMAIL', buIdx: 1, divIdx: 2, status: 'VALIDATED', priority: 'NORMAL' },
        { name: 'Campagne Fiscal Q4 2024', channel: 'PHYSIQUE', buIdx: 1, divIdx: 3, status: 'SENT', priority: 'NORMAL' },
        { name: 'Campagne Audit Financier', channel: 'EMAIL', buIdx: 0, divIdx: 0, status: 'DRAFT', priority: 'LOW' },
        { name: 'Campagne Gestion Finance', channel: 'PHYSIQUE', buIdx: 2, divIdx: 5, status: 'VALIDATED', priority: 'HIGH' }
    ];
    
    const campaignIds = [];
    
    for (let i = 0; i < campaigns.length; i++) {
        const campaign = campaigns[i];
        try {
            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 30));
            
            // Utiliser un collaborateur valide de façon cyclique
            const responsibleCollabId = collaborateurIds[i % collaborateurIds.length];
            const validateurCollabId = collaborateurIds[(i + 1) % collaborateurIds.length];
            
            console.log(`   📝 Campagne ${i + 1}: ${campaign.name} (${campaign.status})`);
            
            // Définir validation_statut selon le status
            let validationStatut = 'BROUILLON';
            let dateSoumission = null;
            let dateValidation = null;
            
            if (campaign.status === 'PENDING_VALIDATION') {
                validationStatut = 'EN_VALIDATION';
                dateSoumission = new Date();
            } else if (campaign.status === 'VALIDATED' || campaign.status === 'SENT') {
                validationStatut = 'VALIDE';
                dateSoumission = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // Il y a 2 jours
                dateValidation = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // Il y a 1 jour
            }
            
            const result = await pool.query(`
                INSERT INTO prospecting_campaigns (
                    name, channel, business_unit_id, division_id,
                    responsible_id, status, priority, scheduled_date,
                    description, validation_statut, date_soumission, date_validation
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
            `, [
                campaign.name,
                campaign.channel,
                buIds[campaign.buIdx],
                divisionIds[campaign.divIdx],
                responsibleCollabId,
                campaign.status,
                campaign.priority,
                scheduledDate,
                `Campagne de prospection pour démonstration - ${campaign.channel}`,
                validationStatut,
                dateSoumission,
                dateValidation
            ]);
            
            campaignIds.push(result.rows[0].id);
            stats.campaigns++;
        } catch (error) {
            console.log(`   ⚠️ ${campaign.name}: ${error.message}`);
        }
    }
    
    return campaignIds;
}

async function createMissions(pool, clientIds, buIds, divisionIds, collaborateurIds, refData) {
    const missionIds = [];
    const types = ['Audit', 'Conseil', 'Expertise', 'Formation', 'Comptabilité'];
    const statuts = ['PLANIFIEE', 'EN_COURS', 'EN_COURS', 'TERMINEE'];
    
    for (let i = 0; i < Math.min(clientIds.length + 2, 10); i++) {
        const type = types[i % types.length];
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 6));
        
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 2 + Math.floor(Math.random() * 4));
        
        const missionCode = `MISS-DEMO-${String(i + 1).padStart(3, '0')}`;
        const missionType = refData.missionTypes.find(mt => mt.libelle && mt.libelle.includes(type)) || refData.missionTypes[0];
        const statut = statuts[i % statuts.length];
        
        try {
            const result = await pool.query(`
                INSERT INTO missions (
                    nom, code, client_id, 
                    business_unit_id, division_id, collaborateur_id,
                    mission_type_id, statut, priorite,
                    date_debut, date_fin, budget_estime,
                    fiscal_year_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'MOYENNE', $9, $10, $11, $12)
                ON CONFLICT (code) DO NOTHING
                RETURNING id
            `, [
                `Mission ${type} ${i + 1}`,
                missionCode,
                clientIds[i % clientIds.length],
                buIds[Math.floor(i / 2) % buIds.length],
                divisionIds[i % divisionIds.length],
                collaborateurIds[i % collaborateurIds.length],
                missionType?.id,
                statut,
                startDate,
                endDate,
                Math.floor(Math.random() * 50000) + 10000,
                refData.fiscalYears[0]?.id
            ]);
            
            if (result.rows.length > 0) {
                missionIds.push(result.rows[0].id);
                stats.missions++;
            }
        } catch (error) {
            console.log(`   ⚠️ Mission ${i + 1}: ${error.message}`);
        }
    }
    
    return missionIds;
}

async function createOpportunities(pool, clientIds, buIds, collaborateurIds, refData, campaignIds) {
    const statuts = ['NOUVELLE', 'EN_COURS', 'EN_COURS', 'GAGNEE', 'PERDUE'];
    const etapesVente = ['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FERMETURE'];
    
    const fiscalYear = refData.fiscalYears[0];
    if (!fiscalYear) {
        console.log('   ⚠️ Aucune année fiscale disponible');
        return;
    }
    
    for (let i = 0; i < Math.min(clientIds.length * 2, 15); i++) {
        const oppType = refData.oppTypes[i % refData.oppTypes.length];
        const client = clientIds[i % clientIds.length];
        const collaborateur = collaborateurIds[i % collaborateurIds.length];
        const statut = statuts[i % statuts.length];
        const etapeVente = etapesVente[Math.floor(i / 3) % etapesVente.length];
        
        const montantEstime = Math.floor(Math.random() * 100000) + 20000;
        const probabilite = Math.floor(Math.random() * 60) + 20;
        
        const dateFermeturePrevue = new Date();
        dateFermeturePrevue.setDate(dateFermeturePrevue.getDate() + 30 + Math.floor(Math.random() * 60));
        
        try {
            await pool.query(`
                INSERT INTO opportunities (
                    nom, description,
                    client_id, collaborateur_id, business_unit_id,
                    opportunity_type_id, fiscal_year_id,
                    statut, etape_vente,
                    montant_estime, probabilite, devise,
                    date_fermeture_prevue,
                    type_opportunite, source
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'XAF', $12, $13, 'PROSPECTION')
            `, [
                `Opportunité ${oppType.name} ${i + 1}`,
                `Opportunité de type ${oppType.name} pour démonstration`,
                client,
                collaborateur,
                buIds[i % buIds.length],
                oppType.id,
                fiscalYear.id,
                statut,
                etapeVente,
                montantEstime,
                probabilite,
                dateFermeturePrevue,
                oppType.name
            ]);
            
            stats.opportunities++;
        } catch (error) {
            console.log(`   ⚠️ Opportunité ${i + 1}: ${error.message}`);
        }
    }
}

async function createTimeData(pool, userIds, missionIds, refData) {
    if (userIds.length === 0 || missionIds.length === 0 || refData.fiscalYears.length === 0) {
        console.log('   ⚠️ Données insuffisantes');
        return;
    }
    
    const fiscalYear = refData.fiscalYears[0];
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    // Créer des time sheets par semaine pour chaque utilisateur
    for (const userId of userIds) {
        let currentDate = new Date(threeMonthsAgo);
        const endDate = new Date();
        
        while (currentDate < endDate && stats.timeSheets < 50) {
            // Début de semaine (lundi)
            const weekStart = new Date(currentDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
            
            // Fin de semaine (vendredi)
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 4);
            
            try {
                // Créer le time sheet
                const tsResult = await pool.query(`
                    INSERT INTO time_sheets (
                        user_id, week_start, week_end, statut, status
                    )
                    VALUES ($1, $2, $3, 'validé', 'approved')
                    RETURNING id
                `, [userId, weekStart, weekEnd]);
                
                const timeSheetId = tsResult.rows[0].id;
                stats.timeSheets++;
                
                // Créer des time entries pour cette semaine (HC = heures chargeables)
                for (let day = 0; day < 5; day++) {
                    const entryDate = new Date(weekStart);
                    entryDate.setDate(entryDate.getDate() + day);
                    
                    if (Math.random() > 0.2) { // 80% de chance d'avoir des heures
                        const missionId = missionIds[Math.floor(Math.random() * missionIds.length)];
                        const taskId = refData.tasks[Math.floor(Math.random() * refData.tasks.length)]?.id;
                        const heures = 4 + Math.floor(Math.random() * 5);
                        
                        await pool.query(`
                            INSERT INTO time_entries (
                                time_sheet_id, user_id, date_saisie,
                                heures, type_heures, status,
                                mission_id, task_id
                            )
                            VALUES ($1, $2, $3, $4, 'HC', 'approved', $5, $6)
                        `, [timeSheetId, userId, entryDate, heures, missionId, taskId]);
                        
                        stats.timeEntries++;
                    } else if (refData.internalActivities.length > 0) {
                        // HNC = heures non chargeables (activités internes)
                        const activity = refData.internalActivities[Math.floor(Math.random() * refData.internalActivities.length)];
                        const heures = 2 + Math.floor(Math.random() * 4);
                        
                        await pool.query(`
                            INSERT INTO time_entries (
                                time_sheet_id, user_id, date_saisie,
                                heures, type_heures, status,
                                internal_activity_id
                            )
                            VALUES ($1, $2, $3, $4, 'HNC', 'approved', $5)
                        `, [timeSheetId, userId, entryDate, heures, activity.id]);
                        
                        stats.timeEntries++;
                    }
                }
            } catch (error) {
                // Ignorer les doublons
            }
            
            // Passer à la semaine suivante
            currentDate.setDate(currentDate.getDate() + 7);
        }
    }
}

async function createInvoices(pool, missionIds, clientIds, refData) {
    if (missionIds.length === 0 || refData.fiscalYears.length === 0) {
        console.log('   ⚠️ Données insuffisantes');
        return;
    }
    
    const fiscalYear = refData.fiscalYears[0];
    const statuts = ['EMISE', 'ENVOYEE', 'PAYEE', 'EN_RETARD'];
    
    // Créer des factures pour 60% des missions
    const numInvoices = Math.floor(missionIds.length * 0.6);
    
    for (let i = 0; i < numInvoices; i++) {
        const missionId = missionIds[i];
        
        try {
            // Récupérer les infos de la mission
            const missionResult = await pool.query(`
                SELECT client_id, budget_estime FROM missions WHERE id = $1
            `, [missionId]);
            
            if (missionResult.rows.length === 0) continue;
            
            const mission = missionResult.rows[0];
            const montantHT = parseFloat(mission.budget_estime) || (30000 + Math.floor(Math.random() * 70000));
            const tauxTVA = 19.25;
            const montantTVA = montantHT * (tauxTVA / 100);
            const montantTTC = montantHT + montantTVA;
            
            const dateEmission = new Date();
            dateEmission.setDate(dateEmission.getDate() - Math.floor(Math.random() * 60));
            
            const dateEcheance = new Date(dateEmission);
            dateEcheance.setDate(dateEcheance.getDate() + 30);
            
            const statut = statuts[i % statuts.length];
            const montantPaye = statut === 'PAYEE' ? montantTTC : (statut === 'EN_RETARD' ? montantTTC * 0.3 : 0);
            
            await pool.query(`
                INSERT INTO invoices (
                    numero_facture, client_id, mission_id,
                    date_emission, date_echeance,
                    montant_ht, montant_tva, montant_ttc,
                    taux_tva, statut, montant_paye,
                    fiscal_year_id, notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (numero_facture) DO NOTHING
            `, [
                `FACT-DEMO-${String(i + 1).padStart(4, '0')}`,
                mission.client_id,
                missionId,
                dateEmission,
                dateEcheance,
                montantHT,
                montantTVA,
                montantTTC,
                tauxTVA,
                statut,
                montantPaye,
                fiscalYear.id,
                `Facture de démonstration pour mission ${i + 1}`
            ]);
            
            stats.invoices++;
        } catch (error) {
            console.log(`   ⚠️ Facture ${i + 1}: ${error.message}`);
        }
    }
}

main();
