#!/usr/bin/env node

/**
 * SCRIPT 4/4 (OPTIONNEL) : GÉNÉRATION DE DONNÉES DE DÉMO
 * =======================================================
 * 
 * Ce script génère un jeu de données complet et cohérent pour démonstration.
 * 
 * ⚠️  PROTECTION DES ÉLÉMENTS STRUCTURELS:
 * - Les rôles existants ne seront JAMAIS modifiés ou supprimés
 * - Les utilisateurs existants (surtout super admin) ne seront JAMAIS modifiés
 * - Les permissions, business units, divisions existantes ne seront JAMAIS supprimées
 * 
 * Fonctionnalités :
 * - Création de business units, divisions, grades, postes
 * - Création de collaborateurs et utilisateurs de démo
 * - Création de clients et contacts
 * - Création de missions et opportunités
 * - Création de feuilles de temps
 * - Mode --clean pour nettoyer avant génération
 * 
 * Usage: node scripts/database/4-generate-demo-data.js [--clean]
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const inquirer = require('inquirer');

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║     ÉTAPE 4/4 : GÉNÉRATION DE DONNÉES DE DÉMO              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Configuration
const DEMO_PASSWORD = 'Demo@2025';
const DEMO_EMAIL_DOMAIN = '@ewm-demo.com';

// Données de référence
const BUSINESS_UNITS = [
    { nom: 'Audit & Conseil', code: 'AUDIT', description: 'Division Audit et Conseil' },
    { nom: 'Juridique & Fiscal', code: 'JURID', description: 'Division Juridique et Fiscal' },
    { nom: 'Gestion & Finance', code: 'GEST', description: 'Division Gestion et Finance' }
];

const DIVISIONS = [
    { nom: 'Audit Comptable', code: 'AUDIT-COMP', businessUnitIndex: 0 },
    { nom: 'Conseil en Management', code: 'CONSEIL', businessUnitIndex: 0 },
    { nom: 'Services Juridiques', code: 'JURID', businessUnitIndex: 1 },
    { nom: 'Fiscalité', code: 'FISCAL', businessUnitIndex: 1 },
    { nom: 'Gestion Financière', code: 'GEST-FIN', businessUnitIndex: 2 },
    { nom: 'Comptabilité', code: 'COMPTA', businessUnitIndex: 2 }
];

const TYPES_COLLABORATEURS = [
    { code: 'ADM', nom: 'Administratif', description: 'Personnel administratif et gestion' },
    { code: 'TEC', nom: 'Technique', description: 'Personnel technique (IT, maintenance, infrastructure)' },
    { code: 'CONS', nom: 'Consultant', description: 'Consultant en gestion et stratégie d\'entreprise' },
    { code: 'SUP', nom: 'Support', description: 'Personnel de support et assistance' }
];

const GRADES = [
    { nom: 'Associé', code: 'ASSOC', niveau: 6, taux_min: 130, taux_max: 180 },
    { nom: 'Manager', code: 'MGR', niveau: 5, taux_min: 100, taux_max: 130 },
    { nom: 'Senior', code: 'SEN', niveau: 4, taux_min: 75, taux_max: 100 },
    { nom: 'Assistant', code: 'ASST', niveau: 3, taux_min: 50, taux_max: 75 },
    { nom: 'Junior', code: 'JUN', niveau: 2, taux_min: 35, taux_max: 50 },
    { nom: 'Stagiaire', code: 'STAG', niveau: 1, taux_min: 25, taux_max: 35 }
];

const POSTES = [
    { nom: 'Directeur Général', code: 'DG', description: 'Direction générale de l\'entreprise' },
    { nom: 'Directeur des Opérations', code: 'DOPS', description: 'Direction des opérations' },
    { nom: 'Directeur', code: 'DIR', description: 'Directeur de département' },
    { nom: 'Responsable IT', code: 'RESPIT', description: 'Responsable informatique' },
    { nom: 'Secretaire', code: 'SEC', description: 'Secrétariat et assistance administrative' },
    { nom: 'Support IT', code: 'SUPIT', description: 'Support technique informatique' }
];

const COLLABORATEURS = [
    // Rôles utilisent les noms de la Base Pure (en anglais majuscules)
    { nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@ewm-demo.com', grade: 3, poste: 0, bu: 0, division: 0, role: 'COLLABORATEUR' },
    { nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@ewm-demo.com', grade: 4, poste: 1, bu: 0, division: 1, role: 'MANAGER' },
    { nom: 'Bernard', prenom: 'Pierre', email: 'pierre.bernard@ewm-demo.com', grade: 5, poste: 3, bu: 1, division: 3, role: 'MANAGER' },
    { nom: 'Dubois', prenom: 'Marie', email: 'marie.dubois@ewm-demo.com', grade: 2, poste: 2, bu: 1, division: 2, role: 'CONSULTANT' },
    { nom: 'Lefebvre', prenom: 'Thomas', email: 'thomas.lefebvre@ewm-demo.com', grade: 1, poste: 0, bu: 0, division: 0, role: 'COLLABORATEUR' },
    { nom: 'Moreau', prenom: 'Julie', email: 'julie.moreau@ewm-demo.com', grade: 3, poste: 4, bu: 1, division: 3, role: 'CONSULTANT' },
    { nom: 'Petit', prenom: 'Lucas', email: 'lucas.petit@ewm-demo.com', grade: 2, poste: 5, bu: 2, division: 5, role: 'COLLABORATEUR' },
    { nom: 'Robert', prenom: 'Emma', email: 'emma.robert@ewm-demo.com', grade: 0, poste: 0, bu: 0, division: 0, role: 'COLLABORATEUR' }
];

const CLIENTS = [
    { nom: 'TechCorp Solutions', sigle: 'TCS', secteur: 'Technologie', ville: 'Paris' },
    { nom: 'Industries Moderne SA', sigle: 'IMS', secteur: 'Industrie', ville: 'Lyon' },
    { nom: 'Services Financiers Pro', sigle: 'SFP', secteur: 'Finance', ville: 'Paris' },
    { nom: 'Consulting Experts', sigle: 'CE', secteur: 'Conseil', ville: 'Marseille' },
    { nom: 'Groupe Immobilier', sigle: 'GI', secteur: 'Immobilier', ville: 'Lille' },
    { nom: 'Digital Services', sigle: 'DS', secteur: 'Technologie', ville: 'Toulouse' },
    { nom: 'Manufacturing Plus', sigle: 'MP', secteur: 'Industrie', ville: 'Nantes' },
    { nom: 'Retail Corporation', sigle: 'RC', secteur: 'Distribution', ville: 'Paris' }
];

// Statistiques
let stats = {
    businessUnits: 0,
    divisions: 0,
    typesCollaborateurs: 0,
    grades: 0,
    postes: 0,
    collaborateurs: 0,
    users: 0,
    clients: 0,
    missions: 0,
    campaigns: 0,
    opportunities: 0,
    timeEntries: 0,
    invoices: 0
};

async function main() {
    let pool;
    
    try {
        // ===============================================
        // Configuration et connexion
        // ===============================================
        console.log('📋 Configuration PostgreSQL (depuis .env):\n');
        console.log(`   🏠 Hôte       : ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   🔌 Port       : ${process.env.DB_PORT || '5432'}`);
        console.log(`   👤 Utilisateur: ${process.env.DB_USER || 'Non défini'}`);
        console.log(`   🗄️  Base      : ${process.env.DB_NAME || 'Non définie'}`);
        console.log('   🔐 SSL        : ' + (process.env.NODE_ENV === 'production' ? 'Oui' : 'Non') + '\n');

        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        });

        console.log('📡 Test de connexion à la base de données...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connexion réussie!\n');

        // ===============================================
        // Vérifier les données existantes
        // ===============================================
        const existingData = await checkExistingData(pool);
        
        console.log('\n📊 Données existantes :');
        console.log('═══════════════════════');
        console.log(`   Business Units  : ${existingData.businessUnits}`);
        console.log(`   Divisions       : ${existingData.divisions}`);
        console.log(`   Collaborateurs  : ${existingData.collaborateurs}`);
        console.log(`   Clients         : ${existingData.clients}`);
        console.log(`   Missions        : ${existingData.missions}\n`);

        // ===============================================
        // Mode --clean
        // ===============================================
        const args = process.argv.slice(2);
        const shouldClean = args.includes('--clean');
        
        if (shouldClean && (existingData.collaborateurs > 0 || existingData.clients > 0)) {
            const confirmClean = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'proceed',
                    message: '⚠️  Mode --clean : Supprimer les données de démo existantes?',
                    default: false
                }
            ]);

            if (confirmClean.proceed) {
                await cleanDemoData(pool);
            } else {
                console.log('\n❌ Nettoyage annulé\n');
                await pool.end();
                return;
            }
        }

        // ===============================================
        // Confirmation de génération
        // ===============================================
        const confirmGenerate = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: 'Générer les données de démo?',
                default: true
            }
        ]);

        if (!confirmGenerate.proceed) {
            console.log('\n❌ Génération annulée\n');
            await pool.end();
            return;
        }

        console.log('\n🚀 Génération des données de démo...\n');

        // ===============================================
        // Génération des données
        // ===============================================
        
        // 1. Business Units
        console.log('📦 Création des Business Units...');
        const buIds = await createBusinessUnits(pool);
        console.log(`   ✓ ${stats.businessUnits} Business Units créées\n`);

        // 2. Divisions
        console.log('🏢 Création des Divisions...');
        const divisionIds = await createDivisions(pool, buIds);
        console.log(`   ✓ ${stats.divisions} Divisions créées\n`);

        // 3. Types de Collaborateurs
        console.log('🏷️  Création des Types de Collaborateurs...');
        const typeCollabIds = await createTypesCollaborateurs(pool);
        console.log(`   ✓ ${stats.typesCollaborateurs} Types de Collaborateurs créés\n`);

        // 4. Grades
        console.log('📊 Création des Grades...');
        await ensureGradesStructure(pool);
        const gradeIds = await createGrades(pool);
        console.log(`   ✓ ${stats.grades} Grades créés\n`);

        // 5. Postes
        console.log('💼 Création des Postes...');
        const posteIds = await createPostes(pool);
        console.log(`   ✓ ${stats.postes} Postes créés\n`);

        // 6. Collaborateurs et Utilisateurs
        console.log('👥 Création des Collaborateurs et Utilisateurs...');
        await ensureCollaborateursStructure(pool);
        await createCollaborateurs(pool, buIds, divisionIds, gradeIds, posteIds);
        console.log(`   ✓ ${stats.collaborateurs} Collaborateurs créés`);
        console.log(`   ✓ ${stats.users} Utilisateurs créés\n`);

        // 7. Clients
        console.log('🏢 Création des Clients...');
        await ensureClientsStructure(pool);
        const clientIds = await createClients(pool);
        console.log(`   ✓ ${stats.clients} Clients créés\n`);

        // 8. Missions
        console.log('📋 Création des Missions...');
        const missionIds = await createMissions(pool, clientIds, buIds, divisionIds);
        console.log(`   ✓ ${stats.missions} Missions créées\n`);

        // 9. Récupération des données de référence
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

        // ===============================================
        // Résumé final
        // ===============================================
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║         ✅ DONNÉES DE DÉMO GÉNÉRÉES AVEC SUCCÈS             ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 RÉSUMÉ :');
        console.log('═══════════');
        console.log(`   ✓ Business Units   : ${stats.businessUnits}`);
        console.log(`   ✓ Divisions        : ${stats.divisions}`);
        console.log(`   ✓ Types Collabor.  : ${stats.typesCollaborateurs}`);
        console.log(`   ✓ Grades           : ${stats.grades}`);
        console.log(`   ✓ Postes           : ${stats.postes}`);
        console.log(`   ✓ Collaborateurs   : ${stats.collaborateurs}`);
        console.log(`   ✓ Utilisateurs     : ${stats.users}`);
        console.log(`   ✓ Clients          : ${stats.clients}`);
        console.log(`   ✓ Campagnes        : ${stats.campaigns}`);
        console.log(`   ✓ Opportunités     : ${stats.opportunities}`);
        console.log(`   ✓ Missions         : ${stats.missions}`);
        console.log(`   ✓ Time Entries     : ${stats.timeEntries}`);
        console.log(`   ✓ Factures         : ${stats.invoices}`);
        
        console.log('\n🔑 COMPTES DE DÉMO :');
        console.log('════════════════════');
        console.log(`   📧 Email        : ${COLLABORATEURS[0].email}`);
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
// Fonctions utilitaires
// ===============================================

async function checkExistingData(pool) {
    const mapping = {
        business_units: 'businessUnits',
        divisions: 'divisions',
        collaborateurs: 'collaborateurs',
        clients: 'clients',
        missions: 'missions'
    };
    
    const data = {};
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
        'time_entries',
        'missions',
        'clients',
        'collaborateurs'
    ];
    
    for (const table of tables) {
        try {
            let query;
            if (table === 'collaborateurs' || table === 'users') {
                query = `DELETE FROM ${table} WHERE email LIKE '%${DEMO_EMAIL_DOMAIN}'`;
            } else if (table === 'clients') {
                query = `DELETE FROM ${table} WHERE email LIKE '%${DEMO_EMAIL_DOMAIN}' OR code_client LIKE 'DEMO-%'`;
            } else {
                query = `DELETE FROM ${table}`;
            }
            
            const result = await pool.query(query);
            console.log(`   ✓ ${table}: ${result.rowCount} ligne(s) supprimée(s)`);
        } catch (error) {
            console.log(`   ⚠ ${table}: ${error.message}`);
        }
    }
    
    console.log('\n✅ Nettoyage terminé\n');
}

// ===============================================
// Fonctions de création
// ===============================================

async function createBusinessUnits(pool) {
    const ids = [];
    
    for (const bu of BUSINESS_UNITS) {
        const result = await pool.query(`
            INSERT INTO business_units (nom, code, description)
            VALUES ($1, $2, $3)
            ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom
            RETURNING id
        `, [bu.nom, bu.code, bu.description]);
        
        ids.push(result.rows[0].id);
        stats.businessUnits++;
    }
    
    return ids;
}

async function createDivisions(pool, buIds) {
    const ids = [];
    
    for (const div of DIVISIONS) {
        const result = await pool.query(`
            INSERT INTO divisions (nom, code, business_unit_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom
            RETURNING id
        `, [div.nom, div.code, buIds[div.businessUnitIndex]]);
        
        ids.push(result.rows[0].id);
        stats.divisions++;
    }
    
    return ids;
}

async function ensureGradesStructure(pool) {
    const queries = [
        `ALTER TABLE grades ADD COLUMN IF NOT EXISTS nom VARCHAR(255);`,
        `ALTER TABLE grades ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;`,
        `ALTER TABLE grades ADD COLUMN IF NOT EXISTS niveau INTEGER;`,
        `ALTER TABLE grades ADD COLUMN IF NOT EXISTS taux_min NUMERIC;`,
        `ALTER TABLE grades ADD COLUMN IF NOT EXISTS taux_max NUMERIC;`
    ];

    for (const query of queries) {
        await pool.query(query);
    }

    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS grades_code_unique ON grades(code);`);
}

async function ensureCollaborateursStructure(pool) {
    const queries = [
        `ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS user_id UUID;`,
        `ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS initiales VARCHAR(10);`,
        `ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS business_unit_id UUID;`,
        `ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS division_id UUID;`,
        `ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS grade_id UUID;`,
        `ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS poste_id UUID;`,
        `ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'ACTIF';`,
        `ALTER TABLE collaborateurs ADD COLUMN IF NOT EXISTS date_embauche DATE;`
    ];

    for (const query of queries) {
        await pool.query(query);
    }

    await pool.query(`ALTER TABLE collaborateurs ALTER COLUMN initiales SET DEFAULT '??';`);
    await pool.query(`UPDATE collaborateurs SET initiales = COALESCE(initiales, '??');`);
}

async function ensureClientsStructure(pool) {
    const queries = [
        `ALTER TABLE clients ADD COLUMN IF NOT EXISTS nom VARCHAR(255);`,
        `ALTER TABLE clients ADD COLUMN IF NOT EXISTS raison_sociale VARCHAR(255);`,
        `ALTER TABLE clients ADD COLUMN IF NOT EXISTS sigle VARCHAR(50);`,
        `ALTER TABLE clients ADD COLUMN IF NOT EXISTS code_client VARCHAR(100);`,
        `ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);`,
        `ALTER TABLE clients ADD COLUMN IF NOT EXISTS secteur VARCHAR(255);`,
        `ALTER TABLE clients ADD COLUMN IF NOT EXISTS ville VARCHAR(255);`,
        `ALTER TABLE clients ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'ACTIF';`
    ];

    for (const query of queries) {
        await pool.query(query);
    }

    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS clients_code_client_unique ON clients(code_client);`);
    await pool.query(`UPDATE clients SET sigle = COALESCE(NULLIF(sigle, ''), 'CLT')`);
    await pool.query(`UPDATE clients SET code_client = COALESCE(code_client, 'CLIENT-' || LPAD(id::text, 4, '0')) WHERE code_client IS NULL`);
    await pool.query(`UPDATE clients SET raison_sociale = COALESCE(NULLIF(raison_sociale, ''), nom, sigle, code_client, 'Client')`);
}

async function createTypesCollaborateurs(pool) {
    const ids = [];
    
    for (const type of TYPES_COLLABORATEURS) {
        const result = await pool.query(`
            INSERT INTO types_collaborateurs (code, nom, description, statut)
            VALUES ($1, $2, $3, 'ACTIF')
            ON CONFLICT (code) DO UPDATE SET 
                nom = EXCLUDED.nom,
                description = EXCLUDED.description
            RETURNING id
        `, [type.code, type.nom, type.description]);
        
        ids.push(result.rows[0].id);
        stats.typesCollaborateurs++;
    }
    
    return ids;
}

async function createGrades(pool) {
    const ids = [];
    
    for (const grade of GRADES) {
        const result = await pool.query(`
            INSERT INTO grades (nom, code, niveau, taux_min, taux_max)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom
            RETURNING id
        `, [grade.nom, grade.code, grade.niveau, grade.taux_min, grade.taux_max]);
        
        ids.push(result.rows[0].id);
        stats.grades++;
    }
    
    return ids;
}

async function createPostes(pool) {
    const ids = [];
    
    for (const poste of POSTES) {
        const result = await pool.query(`
            INSERT INTO postes (nom, code, description)
            VALUES ($1, $2, $3)
            ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom
            RETURNING id
        `, [poste.nom, poste.code, poste.description]);
        
        ids.push(result.rows[0].id);
        stats.postes++;
    }
    
    return ids;
}

async function createCollaborateurs(pool, buIds, divisionIds, gradeIds, posteIds) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    
    // Récupérer les rôles (Base Pure utilise 'name' en anglais)
    const rolesResult = await pool.query('SELECT id, name FROM roles');
    const rolesMap = {};
    rolesResult.rows.forEach(r => {
        rolesMap[r.name] = r.id;
    });
    
    const divisionReferenceTable = await getCollaborateursDivisionReferenceTable(pool);

    for (const collab of COLLABORATEURS) {
        // Générer le login basé sur le prénom et le nom (première lettre de chaque)
        const baseLogin = (collab.prenom.substring(0, 1) + collab.nom.substring(0, 1)).toLowerCase();
        
        // Vérifier si le login existe déjà et ajouter un numéro si nécessaire
        let login = baseLogin;
        let loginExists = true;
        let counter = 1;
        
        while (loginExists) {
            const checkLoginResult = await pool.query(
                'SELECT id FROM users WHERE login = $1', 
                [login]
            );
            
            if (checkLoginResult.rows.length === 0) {
                loginExists = false;
            } else {
                login = baseLogin + counter;
                counter++;
            }
        }
        
        // Créer l'utilisateur avec le rôle par défaut COLLABORATEUR (conforme à la contrainte users_role_check)
        const userResult = await pool.query(`
            INSERT INTO users (nom, prenom, email, password_hash, login, role, statut)
            VALUES ($1, $2, $3, $4, $5, 'COLLABORATEUR', 'ACTIF')
            ON CONFLICT (email) DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                login = EXCLUDED.login
            RETURNING id
        `, [collab.nom, collab.prenom, collab.email, passwordHash, login]);
        
        const userId = userResult.rows[0].id;
        stats.users++;
        
        // Associer le rôle (fallback vers COLLABORATEUR si rôle non trouvé)
        const roleId = rolesMap[collab.role] || rolesMap['COLLABORATEUR'] || rolesMap['CONSULTANT'];
        if (roleId) {
            await pool.query(`
                INSERT INTO user_roles (user_id, role_id)
                VALUES ($1, $2)
                ON CONFLICT (user_id, role_id) DO NOTHING
            `, [userId, roleId]);
        }

        const businessUnitId = buIds[collab.bu] || buIds[0];
        const divisionId = divisionReferenceTable === 'divisions'
            ? (divisionIds[collab.division] || divisionIds[0])
            : businessUnitId;
        const gradeId = gradeIds[collab.grade] || gradeIds[0];
        const posteId = posteIds[collab.poste] || posteIds[0];
        const initiales = ((collab.prenom?.[0] || '') + (collab.nom?.[0] || '')).toUpperCase() || '??';

        // Créer le collaborateur
        await pool.query(`
            INSERT INTO collaborateurs (
                nom, prenom, email, user_id, initiales,
                business_unit_id, division_id, grade_id, poste_id,
                statut, date_embauche
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIF', CURRENT_DATE)
            ON CONFLICT (email) DO NOTHING
        `, [
            collab.nom, collab.prenom, collab.email, userId, initiales,
            businessUnitId, divisionId, gradeId, posteId
        ]);
        
        stats.collaborateurs++;
    }
}

async function getCollaborateursDivisionReferenceTable(pool) {
    try {
        const result = await pool.query(`
            SELECT confrelid::regclass::text AS table_name
            FROM pg_constraint
            WHERE conname = 'collaborateurs_division_id_fkey'
        `);
        return result.rows[0]?.table_name || 'divisions';
    } catch (error) {
        return 'divisions';
    }
}

async function createClients(pool) {
    const ids = [];
    
    for (let i = 0; i < CLIENTS.length; i++) {
        const client = CLIENTS[i];
        const result = await pool.query(`
            INSERT INTO clients (
                nom, raison_sociale, sigle, code_client, email,
                secteur, ville, statut
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIF')
            ON CONFLICT (code_client) DO UPDATE SET nom = EXCLUDED.nom, raison_sociale = EXCLUDED.raison_sociale
            RETURNING id
        `, [
            client.nom,
            client.nom,
            client.sigle,
            `DEMO-${client.sigle}`,
            `contact@${client.sigle.toLowerCase()}.com`,
            client.secteur,
            client.ville
        ]);
        
        ids.push(result.rows[0].id);
        stats.clients++;
    }
    
    return ids;
}

async function ensureMissionsStructure(pool) {
    const queries = [
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS nom VARCHAR(255);`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS code VARCHAR(100);`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS code_mission VARCHAR(100);`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS client_id UUID;`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS business_unit_id UUID;`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS division_id UUID;`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS type_mission VARCHAR(100) DEFAULT 'MISSION';`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS statut VARCHAR(50) DEFAULT 'EN_COURS';`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS date_debut DATE;`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS date_contact DATE;`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS date_proposition DATE;`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS date_decision DATE;`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS budget_jours NUMERIC;`,
        `ALTER TABLE missions ADD COLUMN IF NOT EXISTS budget_estime NUMERIC DEFAULT 0;`
    ];

    for (const query of queries) {
        await pool.query(query);
    }

    // Mettre à jour les valeurs NULL de code avec code_mission
    await pool.query(`UPDATE missions SET code = COALESCE(code, code_mission, 'MISS-' || LPAD(id::text, 4, '0')) WHERE code IS NULL`);
    
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS missions_code_unique ON missions(code);`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS missions_code_mission_unique ON missions(code_mission);`);
}

async function createMissions(pool, clientIds, buIds, divisionIds) {
    await ensureMissionsStructure(pool);
    
    // Déterminer si division_id référence divisions ou business_units
    const divisionRefTable = await getMissionsDivisionReferenceTable(pool);
    const useDivisionIds = (divisionRefTable === 'divisions');
    
    const types = ['Audit', 'Conseil', 'Expertise', 'Formation'];
    const missionIds = [];
    
    for (let i = 0; i < Math.min(clientIds.length, 10); i++) {
        const type = types[i % types.length];
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 6));
        
        const missionCode = `DEMO-MISS-${String(i + 1).padStart(3, '0')}`;
        
        // Pour satisfaire la contrainte check_workflow_dates, on utilise type_mission = 'MISSION'
        // et on fournit toutes les dates requises
        const dateContact = new Date(startDate);
        dateContact.setDate(dateContact.getDate() - 30);
        
        const dateProposition = new Date(startDate);
        dateProposition.setDate(dateProposition.getDate() - 15);
        
        const dateDecision = new Date(startDate);
        dateDecision.setDate(dateDecision.getDate() - 5);
        
        // Adapter selon la référence de division_id
        const divisionValue = useDivisionIds ? divisionIds[i % divisionIds.length] : buIds[i % buIds.length];
        
        // Priorités valides selon la contrainte check_priorite
        const priorites = ['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE'];
        const priorite = priorites[Math.floor(Math.random() * priorites.length)];
        
        await pool.query(`
            INSERT INTO missions (
                nom, code, code_mission, client_id,
                division_id,
                type_mission, statut, priorite,
                date_debut, budget_estime,
                date_contact, date_proposition, date_decision
            )
            VALUES ($1, $2, $3, $4, $5, 'MISSION', 'EN_COURS', $6, $7, $8, $9, $10, $11)
            ON CONFLICT (code) DO NOTHING
        `, [
            `${type} ${i + 1}`,
            missionCode,
            missionCode,
            clientIds[i],
            divisionValue,
            priorite,
            startDate,
            Math.floor(Math.random() * 50000) + 10000, // budget en euros
            dateContact,
            dateProposition,
            dateDecision
        ]);
        
        missionIds.push(missionCode); // Utiliser le code comme ID temporaire
        stats.missions++;
    }
    
    // Récupérer les vrais IDs des missions créées
    const missionsResult = await pool.query(`
        SELECT id FROM missions WHERE code LIKE 'DEMO-MISS-%'
    `);
    
    return missionsResult.rows.map(row => row.id);
}

async function getMissionsDivisionReferenceTable(pool) {
    try {
        const result = await pool.query(`
            SELECT confrelid::regclass::text AS table_name
            FROM pg_constraint
            WHERE conname = 'missions_division_id_fkey'
        `);
        return result.rows[0]?.table_name || 'divisions';
    } catch (error) {
        return 'divisions';
    }
}

// ===============================================
// Fonctions d'enrichissement (campagnes, opportunités, temps, factures)
// ===============================================

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
        console.log('   ⚠️ Erreur chargement types d\'opportunités:', error.message);
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
        console.log('   ⚠️ Erreur chargement années fiscales:', error.message);
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
        console.log('   ⚠️ Erreur chargement activités internes:', error.message);
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
        console.log('   ⚠️ Erreur récupération collaborateurs:', error.message);
        return [];
    }
}

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
            console.log(`   ⚠️ Erreur création campagne ${campaign.code}:`, error.message);
        }
    }
    
    return campaignIds;
}

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
            console.log(`   ⚠️ Erreur création opportunité ${i + 1}:`, error.message);
        }
    }
    
    return opportunityIds;
}

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

async function createTimeEntries(pool, missionIds, collaborateurIds, internalActivities, fiscalYears) {
    if (collaborateurIds.length === 0 || fiscalYears.length === 0) {
        console.log('   ⚠️ Données insuffisantes pour créer des time entries');
        return;
    }
    
    const fiscalYear = fiscalYears[0];
    const startDate = new Date(fiscalYear.date_debut);
    const endDate = new Date();
    
    // Créer des time entries pour chaque collaborateur
    for (const collabId of collaborateurIds) {
        let currentDate = new Date(startDate);
        
        // Générer des entrées pour les 3 derniers mois
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        currentDate = currentDate > threeMonthsAgo ? currentDate : threeMonthsAgo;
        
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
            console.log(`   ⚠️ Erreur création facture ${i + 1}:`, error.message);
        }
    }
}

main();

