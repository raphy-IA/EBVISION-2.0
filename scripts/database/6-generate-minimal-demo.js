#!/usr/bin/env node

/**
 * SCRIPT 6 : GÉNÉRATION MINIMALE DE DONNÉES DE DÉMO
 * ==================================================
 * 
 * Ce script génère un jeu minimal de données cohérentes pour démonstration.
 * Toutes les contraintes d'intégrité et clés étrangères sont respectées.
 * 
 * Données générées :
 * - 3 Business Units
 * - 6 Divisions
 * - 8 Collaborateurs avec comptes utilisateurs
 * - 8 Clients (basés sur les entreprises existantes)
 * - 10 Missions
 * - 15 Opportunités
 * - 100 Time Entries
 * 
 * Usage: node scripts/database/6-generate-minimal-demo.js [--clean]
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const inquirer = require('inquirer');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║       GÉNÉRATION MINIMALE DE DONNÉES DE DÉMO                ║');
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
    clients: 0,
    missions: 0,
    opportunities: 0,
    timeEntries: 0
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
        console.log(`   Business Units  : ${existingData.businessUnits}`);
        console.log(`   Divisions       : ${existingData.divisions}`);
        console.log(`   Collaborateurs  : ${existingData.collaborateurs}`);
        console.log(`   Clients         : ${existingData.clients}`);
        console.log(`   Missions        : ${existingData.missions}`);
        console.log(`   Opportunités    : ${existingData.opportunities}\n`);

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
            message: 'Générer les données de démo minimales?',
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
        console.log(`   ✓ ${refData.missionTypes.length} Types de mission`);
        console.log(`   ✓ ${refData.oppTypes.length} Types d'opportunités`);
        console.log(`   ✓ ${refData.fiscalYears.length} Années fiscales`);
        console.log(`   ✓ ${refData.companies.length} Entreprises disponibles\n`);

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
        const collaborateurIds = await createCollaborateurs(pool, buIds, divisionIds, refData);
        console.log(`   ✓ ${stats.collaborateurs} collaborateurs`);
        console.log(`   ✓ ${stats.users} utilisateurs\n`);

        // 4. Clients
        console.log('🏢 Création des Clients...');
        const clientIds = await createClients(pool, refData.companies);
        console.log(`   ✓ ${stats.clients} clients\n`);

        // 5. Missions
        console.log('📋 Création des Missions...');
        const missionIds = await createMissions(pool, clientIds, divisionIds, refData.missionTypes);
        console.log(`   ✓ ${stats.missions} missions\n`);

        // 6. Opportunités
        console.log('💡 Création des Opportunités...');
        await createOpportunities(pool, clientIds, buIds, collaborateurIds, refData);
        console.log(`   ✓ ${stats.opportunities} opportunités\n`);

        // 7. Time Entries
        console.log('⏱️  Création des Time Entries...');
        await createTimeEntries(pool, missionIds, collaborateurIds, refData.fiscalYears);
        console.log(`   ✓ ${stats.timeEntries} time entries\n`);

        // Résumé
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║         ✅ DONNÉES DE DÉMO GÉNÉRÉES AVEC SUCCÈS             ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   ✓ Business Units   : ${stats.businessUnits}`);
        console.log(`   ✓ Divisions        : ${stats.divisions}`);
        console.log(`   ✓ Collaborateurs   : ${stats.collaborateurs}`);
        console.log(`   ✓ Utilisateurs     : ${stats.users}`);
        console.log(`   ✓ Clients          : ${stats.clients}`);
        console.log(`   ✓ Missions         : ${stats.missions}`);
        console.log(`   ✓ Opportunités     : ${stats.opportunities}`);
        console.log(`   ✓ Time Entries     : ${stats.timeEntries}`);
        
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
        missions: 'missions',
        opportunities: 'opportunities'
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
        { name: 'time_entries', condition: `user_id IN (SELECT id FROM users WHERE email LIKE '%${DEMO_EMAIL_DOMAIN}')` },
        { name: 'opportunities', condition: `collaborateur_id IN (SELECT id FROM collaborateurs WHERE email LIKE '%${DEMO_EMAIL_DOMAIN}')` },
        { name: 'missions', condition: `code_mission LIKE 'DEMO-MISS-%'` },
        { name: 'clients', condition: `code_client LIKE 'DEMO-CLT-%'` },
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
        missionTypes: [],
        oppTypes: [],
        fiscalYears: [],
        companies: []
    };
    
    try {
        const gradesResult = await pool.query('SELECT id, nom, code FROM grades ORDER BY niveau DESC LIMIT 6');
        data.grades = gradesResult.rows;
        
        const postesResult = await pool.query('SELECT id, nom, code FROM postes WHERE statut = \'ACTIF\' LIMIT 6');
        data.postes = postesResult.rows;
        
        const missionTypesResult = await pool.query('SELECT id, codification, libelle FROM mission_types WHERE actif = true');
        data.missionTypes = missionTypesResult.rows;
        
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
        { nom: 'Dupont', prenom: 'Jean', gradeIdx: 2, posteIdx: 0, buIdx: 0, divIdx: 0, role: 'COLLABORATEUR' },
        { nom: 'Martin', prenom: 'Sophie', gradeIdx: 1, posteIdx: 1, buIdx: 0, divIdx: 1, role: 'MANAGER' },
        { nom: 'Bernard', prenom: 'Pierre', gradeIdx: 1, posteIdx: 2, buIdx: 1, divIdx: 3, role: 'MANAGER' },
        { nom: 'Dubois', prenom: 'Marie', gradeIdx: 3, posteIdx: 2, buIdx: 1, divIdx: 2, role: 'CONSULTANT' },
        { nom: 'Lefebvre', prenom: 'Thomas', gradeIdx: 4, posteIdx: 0, buIdx: 0, divIdx: 0, role: 'COLLABORATEUR' },
        { nom: 'Moreau', prenom: 'Julie', gradeIdx: 2, posteIdx: 4, buIdx: 1, divIdx: 3, role: 'CONSULTANT' },
        { nom: 'Petit', prenom: 'Lucas', gradeIdx: 3, posteIdx: 5, buIdx: 2, divIdx: 5, role: 'COLLABORATEUR' },
        { nom: 'Robert', prenom: 'Emma', gradeIdx: 0, posteIdx: 0, buIdx: 0, divIdx: 0, role: 'COLLABORATEUR' }
    ];
    
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const collabIds = [];
    
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
            const businessUnitId = buIds[collab.buIdx] || buIds[0];
            const divisionId = divisionIds[collab.divIdx] || divisionIds[0];
            const initiales = `${collab.prenom[0]}${collab.nom[0]}`.toUpperCase();
            
            const collabResult = await pool.query(`
                INSERT INTO collaborateurs (
                    nom, prenom, email, user_id, initiales,
                    business_unit_id, division_id, grade_id, poste_id,
                    statut, date_embauche
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIF', CURRENT_DATE)
                ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id
                RETURNING id
            `, [
                collab.nom, collab.prenom, email, userId, initiales,
                businessUnitId, divisionId, gradeId, posteId
            ]);
            
            collabIds.push(collabResult.rows[0].id);
            stats.collaborateurs++;
        } catch (error) {
            console.log(`   ⚠️ ${collab.prenom} ${collab.nom}: ${error.message}`);
        }
    }
    
    return collabIds;
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
                `DEMO-CLT-${String(i + 1).padStart(3, '0')}`,
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

async function createMissions(pool, clientIds, divisionIds, missionTypes) {
    const missionIds = [];
    const types = ['Audit', 'Conseil', 'Expertise', 'Formation'];
    
    for (let i = 0; i < Math.min(clientIds.length, 10); i++) {
        const type = types[i % types.length];
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 6));
        
        const missionCode = `DEMO-MISS-${String(i + 1).padStart(3, '0')}`;
        const missionType = missionTypes.find(mt => mt.libelle && mt.libelle.includes(type)) || missionTypes[0];
        
        try {
            const result = await pool.query(`
                INSERT INTO missions (
                    nom, code_mission, client_id, division_id,
                    mission_type_id, statut, priorite,
                    date_debut, budget_estime
                )
                VALUES ($1, $2, $3, $4, $5, 'EN_COURS', 'MOYENNE', $6, $7)
                ON CONFLICT (code_mission) DO NOTHING
                RETURNING id
            `, [
                `${type} ${i + 1}`,
                missionCode,
                clientIds[i],
                divisionIds[i % divisionIds.length],
                missionType?.id,
                startDate,
                Math.floor(Math.random() * 50000) + 10000
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

async function createOpportunities(pool, clientIds, buIds, collaborateurIds, refData) {
    const statuts = ['NOUVELLE', 'EN_COURS', 'GAGNEE', 'PERDUE'];
    const etapesVente = ['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'FERMETURE'];
    
    const fiscalYear = refData.fiscalYears[0];
    if (!fiscalYear) {
        console.log('   ⚠️ Aucune année fiscale disponible, opportunités ignorées');
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
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'FCFA', $12, $13, 'PROSPECTION')
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

async function createTimeEntries(pool, missionIds, collaborateurIds, fiscalYears) {
    // Note: La table time_entries a une structure complexe avec time_sheet_id, type_heures, etc.
    // Pour une version minimale, nous ne créons pas de time entries pour éviter les complications
    // Vous pouvez les créer manuellement via l'interface une fois connecté
    console.log('   ℹ️  Time entries non générées (structure complexe - à créer via l\'interface)');
    return;
}

main();
