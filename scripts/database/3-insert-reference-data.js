#!/usr/bin/env node
/**
 * ÉTAPE 3/X : INSERTION DES DONNÉES DE RÉFÉRENCE
 * 
 * Ce script insère TOUTES les données de référence nécessaires :
 * - Types de collaborateurs
 * - Grades
 * - Postes
 * - Types de missions
 * - Sources d'entreprise
 * - Secteurs d'activité
 * - Pays
 * - Années fiscales
 * - Types d'opportunités (avec leurs étapes configurées)
 * - Activités internes
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

// Configuration de la base de données identique aux autres scripts
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║   ÉTAPE 3 : INSERTION DES DONNÉES DE RÉFÉRENCE             ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('📋 Configuration PostgreSQL (depuis .env):');
console.log(`   🏠 Hôte       : ${process.env.DB_HOST || 'localhost'}`);
console.log(`   🔌 Port       : ${process.env.DB_PORT || '5432'}`);
console.log(`   👤 Utilisateur: ${process.env.DB_USER || 'Non défini'}`);
console.log(`   🗄️  Base      : ${process.env.DB_NAME || 'Non définie'}`);
console.log(`   🔐 SSL        : ${process.env.NODE_ENV === 'production' ? 'Oui' : 'Non'}\n`);

async function main() {
    let client;

    try {
        console.log('📡 Test de connexion à la base de données...');
        client = await pool.connect();
        console.log('✅ Connexion réussie!\n');

        // Vérifier si les données existent déjà
        console.log('📊 Vérification des données existantes...\n');

        // 🏷️ PARTIE 1 : Données RH
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║                    📋 DONNÉES RH                            ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await insertTypesCollaborateurs(client);
        await insertGrades(client);
        await insertPostes(client);

        // 💼 PARTIE 2 : Données Métier
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║                  💼 DONNÉES MÉTIER                          ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await insertMissionTypes(client);

        // 🌍 PARTIE 3 : Données Géographiques
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║              🌍 DONNÉES GÉOGRAPHIQUES                       ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await insertPays(client);

        // 📊 PARTIE 4 : Secteurs d'Activité
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║            📊 SECTEURS D\'ACTIVITÉ                           ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await insertSecteursActivite(client);

        // 🏢 PARTIE 4B : Sources et Entreprises
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║         🏢 SOURCES & ENTREPRISES                            ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await insertCompanySourcesAndCompanies(client);

        // 📅 PARTIE 5 : Données Temporelles
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║              📅 ANNÉES FISCALES                             ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await insertFiscalYears(client);

        // 🎯 PARTIE 6 : Types d'Opportunités (avec étapes)
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║         🎯 TYPES D\'OPPORTUNITÉS & ÉTAPES                    ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await insertOpportunityTypesWithStages(client);

        // 🏢 PARTIE 7 : Activités Internes
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║              🏢 ACTIVITÉS INTERNES                          ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await insertInternalActivities(client);

        // 📋 PARTIE 8 : Tâches pour les Types de Mission
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║         📋 TÂCHES DES TYPES DE MISSION                      ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await insertMissionTasks(client);

        // 🎯 PARTIE 9 : Types d'Objectifs (Nouveau)
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║         🎯 TYPES D\'OBJECTIFS & MÉTRIQUES                    ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await insertObjectiveUnits(client);
        await insertObjectiveTypes(client);
        await setupMetricsSources(client);

        // 🏦 PARTIE 10 : Établissements Financiers
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║         🏦 ÉTABLISSEMENTS FINANCIERS                         ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await insertFinancialInstitutions(client);

        // 📊 PARTIE 11 : Taxes
        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║         📊 TAXES USUELLES                                   ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

        await insertTaxes(client);

        console.log('\n╔══════════════════════════════════════════════════════════════╗');
        console.log('║   ✅ TOUTES LES DONNÉES DE RÉFÉRENCE SONT INSÉRÉES !       ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

// ===============================================
// 🏷️ TYPES DE COLLABORATEURS
// ===============================================
async function insertTypesCollaborateurs(client) {
    console.log('🏷️  Insertion des Types de Collaborateurs...');

    const types = [
        { code: 'ADM', nom: 'Administratif', description: 'Personnel administratif et gestion', statut: 'ACTIF' },
        { code: 'TEC', nom: 'Technique', description: 'Personnel technique (IT, maintenance, infrastructure)', statut: 'ACTIF' },
        { code: 'CONS', nom: 'Consultant', description: 'Consultant en gestion et stratégie d\'entreprise', statut: 'ACTIF' },
        { code: 'SUP', nom: 'Support', description: 'Personnel de support et assistance', statut: 'ACTIF' }
    ];

    let created = 0, updated = 0;

    for (const type of types) {
        const result = await client.query(`
            INSERT INTO types_collaborateurs (code, nom, description, statut)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (code) DO UPDATE SET 
                nom = EXCLUDED.nom,
                description = EXCLUDED.description,
                statut = EXCLUDED.statut,
                updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
        `, [type.code, type.nom, type.description, type.statut]);

        if (result.rows[0].inserted) {
            created++;
        } else {
            updated++;
        }
    }

    console.log(`   ✓ ${created} créés, ${updated} mis à jour (Total: ${types.length})\n`);
}

// ===============================================
// 📊 GRADES
// ===============================================
async function insertGrades(client) {
    console.log('📊 Insertion des Grades...');

    const grades = [
        { nom: 'Associé', code: 'ASSOC', niveau: 6 },
        { nom: 'Manager', code: 'MGR', niveau: 5 },
        { nom: 'Senior', code: 'SEN', niveau: 4 },
        { nom: 'Assistant', code: 'ASST', niveau: 3 },
        { nom: 'Junior', code: 'JUN', niveau: 2 },
        { nom: 'Stagiaire', code: 'STAG', niveau: 1 }
    ];

    let created = 0, updated = 0;

    for (const grade of grades) {
        const result = await client.query(`
            INSERT INTO grades (nom, code, niveau, statut)
            VALUES ($1, $2, $3, 'ACTIF')
            ON CONFLICT (code) DO UPDATE SET 
                nom = EXCLUDED.nom,
                niveau = EXCLUDED.niveau,
                statut = 'ACTIF',
                updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
        `, [grade.nom, grade.code, grade.niveau]);

        if (result.rows[0].inserted) {
            created++;
        } else {
            updated++;
        }
    }

    console.log(`   ✓ ${created} créés, ${updated} mis à jour (Total: ${grades.length})\n`);
}

// ===============================================
// 💼 POSTES
// ===============================================
async function insertPostes(client) {
    console.log('💼 Insertion des Postes...');

    const postes = [
        { nom: 'Directeur Général', code: 'DG', description: 'Direction générale de l\'entreprise' },
        { nom: 'Directeur des Opérations', code: 'DOPS', description: 'Direction des opérations' },
        { nom: 'Directeur', code: 'DIR', description: 'Directeur de département' },
        { nom: 'Responsable IT', code: 'RESPIT', description: 'Responsable informatique' },
        { nom: 'Secrétaire', code: 'SEC', description: 'Secrétariat et assistance administrative' },
        { nom: 'Support IT', code: 'SUPIT', description: 'Support technique informatique' }
    ];

    let created = 0, updated = 0;

    for (const poste of postes) {
        const result = await client.query(`
            INSERT INTO postes (nom, code, description, statut)
            VALUES ($1, $2, $3, 'ACTIF')
            ON CONFLICT (code) DO UPDATE SET 
                nom = EXCLUDED.nom,
                description = EXCLUDED.description,
                updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
        `, [poste.nom, poste.code, poste.description]);

        if (result.rows[0].inserted) {
            created++;
        } else {
            updated++;
        }
    }

    console.log(`   ✓ ${created} créés, ${updated} mis à jour (Total: ${postes.length})\n`);
}

// ===============================================
// 📋 TYPES DE MISSIONS
// ===============================================
async function insertMissionTypes(client) {
    console.log('📋 Insertion des Types de Missions...');

    const missionTypes = [
        { codification: 'AUDIT_CAC', libelle: 'Audit & Commissariat aux Comptes (CAC)', description: 'Audit légal et commissariat aux comptes' },
        { codification: 'EXP_REC', libelle: 'Expertise Comptable & Financière - Mission Récurrente', description: 'Tenue et révision comptable récurrente' },
        { codification: 'EXP_PREV_BP', libelle: 'Exp Compt & FI - Missions Exceptionnelles - Prévisionnel / Business Plan', description: 'Prévisionnels et business plans' },
        { codification: 'EXP_EVAL_ENTR', libelle: 'Exp Compt & FI - Missions Exceptionnelles - Évaluation d\'Entreprise (Cession / Acquisition)', description: 'Évaluations d\'entreprise pour cession ou acquisition' },
        { codification: 'EXP_OUTILS_GEST', libelle: 'Exp Compt & FI - Missions Exceptionnelles - Mise en place d\'outils de gestion (TB/Compta Anal.)', description: 'Mise en place de tableaux de bord et comptabilité analytique' },
        { codification: 'CONSEIL_JUR_FISC', libelle: 'Conseil Juridique & Fiscal (Avocats / Fiscalistes)', description: 'Conseil et contentieux juridique et fiscal' },
        { codification: 'CONS_MGT', libelle: 'Consulting & Conseil en Management', description: 'Missions de conseil en management et organisation' },
        { codification: 'DOUANE_COMINT', libelle: 'Douane & Commerce International', description: 'Missions liées aux formalités douanières et commerce international' },
        { codification: 'FORMATION', libelle: 'Formation', description: 'Missions de formation professionnelle' }
    ];

    let created = 0, updated = 0;

    for (const type of missionTypes) {
        // Tenter une mise à jour par codification; si aucune ligne affectée, insérer
        const updateRes = await client.query(`
            UPDATE mission_types 
            SET libelle = $1,
                description = $2,
                actif = true,
                updated_at = CURRENT_TIMESTAMP
            WHERE codification = $3
        `, [type.libelle, type.description, type.codification]);

        if (updateRes.rowCount && updateRes.rowCount > 0) {
            updated++;
        } else {
            await client.query(`
                INSERT INTO mission_types (codification, libelle, description, actif)
                VALUES ($1, $2, $3, true)
            `, [type.codification, type.libelle, type.description]);
            created++;
        }
    }

    console.log(`   ✓ ${created} créés, ${updated} mis à jour (Total: ${missionTypes.length})\n`);
}

// ===============================================
// 🏢 SOURCES D'ENTREPRISE ET ENTREPRISES
// ===============================================
async function insertCompanySourcesAndCompanies(client) {
    console.log('🏢 Insertion des Sources d\'Entreprise et Entreprises...');

    // Charger les données depuis le fichier JSON
    const dataPath = path.resolve(__dirname, 'data/companies-and-sources.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    let sourcesCreated = 0, sourcesUpdated = 0;
    const sourceIdMap = {};

    // Insérer les sources
    for (const source of data.sources) {
        const result = await client.query(`
            INSERT INTO company_sources (name, description)
            VALUES ($1, $2)
            ON CONFLICT (name) DO UPDATE SET 
                description = EXCLUDED.description,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, (xmax = 0) AS inserted
        `, [source.name, source.description]);

        sourceIdMap[source.name] = result.rows[0].id;

        if (result.rows[0].inserted) {
            sourcesCreated++;
        } else {
            sourcesUpdated++;
        }
    }

    console.log(`   ✓ Sources: ${sourcesCreated} créées, ${sourcesUpdated} mises à jour (Total: ${data.sources.length})`);

    // Insérer les entreprises
    let companiesCreated = 0, companiesUpdated = 0;

    for (const company of data.companies) {
        // Récupérer l'ID de la source
        const sourceId = sourceIdMap[company.source];

        // Tenter une mise à jour par name; si aucune ligne affectée, insérer
        const updateRes = await client.query(`
            UPDATE companies 
            SET sigle = $1,
                source_id = $2,
                industry = $3,
                country = $4,
                city = $5,
                address = $6,
                phone = $7,
                email = $8,
                website = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE name = $10
        `, [
            company.sigle,
            sourceId,
            company.secteur_activite,
            company.pays,
            company.ville,
            company.adresse,
            company.telephone,
            company.email,
            company.site_web,
            company.nom
        ]);

        if (updateRes.rowCount && updateRes.rowCount > 0) {
            companiesUpdated++;
        } else {
            await client.query(`
                INSERT INTO companies (
                    name, sigle, source_id, industry, country,
                    city, address, phone, email, website
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                company.nom,
                company.sigle,
                sourceId,
                company.secteur_activite,
                company.pays,
                company.ville,
                company.adresse,
                company.telephone,
                company.email,
                company.site_web
            ]);
            companiesCreated++;
        }
    }

    console.log(`   ✓ Entreprises: ${companiesCreated} créées, ${companiesUpdated} mises à jour (Total: ${data.companies.length})\n`);
}

// ===============================================
// 🌍 PAYS
// ===============================================
async function insertPays(client) {
    console.log('🌍 Insertion des Pays...');

    const pays = [
        ['France', 'FRA', '+33', 'EUR', 'Français', 'Europe/Paris', 'Paris'],
        ['Sénégal', 'SEN', '+221', 'XOF', 'Français', 'Africa/Dakar', 'Dakar'],
        ['Cameroun', 'CMR', '+237', 'XAF', 'Français', 'Africa/Douala', 'Yaoundé'],
        ['Côte d\'Ivoire', 'CIV', '+225', 'XOF', 'Français', 'Africa/Abidjan', 'Yamoussoukro'],
        ['Mali', 'MLI', '+223', 'XOF', 'Français', 'Africa/Bamako', 'Bamako'],
        ['Burkina Faso', 'BFA', '+226', 'XOF', 'Français', 'Africa/Ouagadougou', 'Ouagadougou'],
        ['Niger', 'NER', '+227', 'XOF', 'Français', 'Africa/Niamey', 'Niamey'],
        ['Tchad', 'TCD', '+235', 'XAF', 'Français', 'Africa/Ndjamena', 'N\'Djamena'],
        ['Guinée', 'GIN', '+224', 'GNF', 'Français', 'Africa/Conakry', 'Conakry'],
        ['Bénin', 'BEN', '+229', 'XOF', 'Français', 'Africa/Porto-Novo', 'Porto-Novo'],
        ['Togo', 'TGO', '+228', 'XOF', 'Français', 'Africa/Lome', 'Lomé'],
        ['Gabon', 'GAB', '+241', 'XAF', 'Français', 'Africa/Libreville', 'Libreville'],
        ['Congo', 'COG', '+242', 'XAF', 'Français', 'Africa/Brazzaville', 'Brazzaville'],
        ['République Centrafricaine', 'CAF', '+236', 'XAF', 'Français', 'Africa/Bangui', 'Bangui'],
        ['Comores', 'COM', '+269', 'KMF', 'Français', 'Indian/Comoro', 'Moroni'],
        ['Madagascar', 'MDG', '+261', 'MGA', 'Français', 'Indian/Antananarivo', 'Antananarivo'],
        ['Maurice', 'MUS', '+230', 'MUR', 'Français', 'Indian/Mauritius', 'Port Louis'],
        ['Seychelles', 'SYC', '+248', 'SCR', 'Français', 'Indian/Mahe', 'Victoria'],
        ['Djibouti', 'DJI', '+253', 'DJF', 'Français', 'Africa/Djibouti', 'Djibouti'],
        ['Allemagne', 'DEU', '+49', 'EUR', 'Allemand', 'Europe/Berlin', 'Berlin'],
        ['Belgique', 'BEL', '+32', 'EUR', 'Français', 'Europe/Brussels', 'Bruxelles'],
        ['Suisse', 'CHE', '+41', 'CHF', 'Français', 'Europe/Zurich', 'Berne'],
        ['Luxembourg', 'LUX', '+352', 'EUR', 'Français', 'Europe/Luxembourg', 'Luxembourg'],
        ['Canada', 'CAN', '+1', 'CAD', 'Français', 'America/Toronto', 'Ottawa'],
        ['États-Unis', 'USA', '+1', 'USD', 'Anglais', 'America/New_York', 'Washington'],
        ['Royaume-Uni', 'GBR', '+44', 'GBP', 'Anglais', 'Europe/London', 'Londres'],
        ['Espagne', 'ESP', '+34', 'EUR', 'Espagnol', 'Europe/Madrid', 'Madrid'],
        ['Italie', 'ITA', '+39', 'EUR', 'Italien', 'Europe/Rome', 'Rome'],
        ['Pays-Bas', 'NLD', '+31', 'EUR', 'Néerlandais', 'Europe/Amsterdam', 'Amsterdam']
    ];

    let created = 0, updated = 0;

    for (const [nom, code_pays, code_appel, devise, langue_principale, fuseau_horaire, capitale] of pays) {
        const result = await client.query(`
            INSERT INTO pays (nom, code_pays, code_appel, devise, langue_principale, fuseau_horaire, capitale, actif)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true)
            ON CONFLICT (code_pays) DO UPDATE SET 
                nom = EXCLUDED.nom,
                code_appel = EXCLUDED.code_appel,
                devise = EXCLUDED.devise,
                langue_principale = EXCLUDED.langue_principale,
                fuseau_horaire = EXCLUDED.fuseau_horaire,
                capitale = EXCLUDED.capitale,
                updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
        `, [nom, code_pays, code_appel, devise, langue_principale, fuseau_horaire, capitale]);

        if (result.rows[0].inserted) {
            created++;
        } else {
            updated++;
        }
    }

    console.log(`   ✓ ${created} créés, ${updated} mis à jour (Total: ${pays.length})\n`);
}

// ===============================================
// 📊 SECTEURS D'ACTIVITÉ
// ===============================================
async function insertSecteursActivite(client) {
    console.log('📊 Insertion des Secteurs d\'activité...');

    const secteurs = [
        ['Audit & Conseil', 'AUDIT', 'Services d\'audit et de conseil', '#e74c3c', 'fas fa-search', 1],
        ['Comptabilité', 'COMPTA', 'Services comptables et fiscaux', '#3498db', 'fas fa-calculator', 2],
        ['Finance', 'FINANCE', 'Services financiers et bancaires', '#2ecc71', 'fas fa-chart-line', 3],
        ['Juridique', 'JURIDIQUE', 'Services juridiques et légaux', '#9b59b6', 'fas fa-balance-scale', 4],
        ['Fiscalité', 'FISCALITE', 'Services fiscaux et douaniers', '#f39c12', 'fas fa-file-invoice-dollar', 5],
        ['Gouvernance', 'GOUVERNANCE', 'Gouvernance d\'entreprise', '#34495e', 'fas fa-building', 6],
        ['Technologie', 'TECH', 'Technologies et informatique', '#1abc9c', 'fas fa-laptop-code', 7],
        ['Industrie', 'INDUSTRIE', 'Industries manufacturières', '#95a5a6', 'fas fa-industry', 8],
        ['Services', 'SERVICES', 'Services aux entreprises', '#e67e22', 'fas fa-briefcase', 9],
        ['Logistique', 'LOGISTIQUE', 'Transport et logistique', '#16a085', 'fas fa-truck', 10],
        ['Agriculture', 'AGRICULTURE', 'Agriculture et agroalimentaire', '#27ae60', 'fas fa-seedling', 11],
        ['Santé', 'SANTE', 'Santé et médecine', '#e91e63', 'fas fa-heartbeat', 12],
        ['Éducation', 'EDUCATION', 'Éducation et formation', '#3f51b5', 'fas fa-graduation-cap', 13],
        ['Transport', 'TRANSPORT', 'Transport et mobilité', '#ff9800', 'fas fa-plane', 14],
        ['Énergie', 'ENERGIE', 'Énergie et utilities', '#ff5722', 'fas fa-bolt', 15],
        ['Télécommunications', 'TELECOM', 'Télécommunications', '#2196f3', 'fas fa-phone', 16],
        ['Banque', 'BANQUE', 'Services bancaires', '#4caf50', 'fas fa-university', 17],
        ['Assurance', 'ASSURANCE', 'Services d\'assurance', '#8bc34a', 'fas fa-shield-alt', 18],
        ['Immobilier', 'IMMOBILIER', 'Immobilier et construction', '#795548', 'fas fa-home', 19],
        ['Commerce', 'COMMERCE', 'Commerce et distribution', '#607d8b', 'fas fa-shopping-cart', 20],
        ['Restauration', 'RESTAURATION', 'Restauration et hôtellerie', '#ff7043', 'fas fa-utensils', 21],
        ['Culture', 'CULTURE', 'Culture et médias', '#ab47bc', 'fas fa-theater-masks', 22],
        ['Sport', 'SPORT', 'Sport et loisirs', '#26a69a', 'fas fa-futbol', 23],
        ['Association', 'ASSOCIATION', 'Associations et ONG', '#42a5f5', 'fas fa-hands-helping', 24],
        ['Administration', 'ADMIN', 'Administration publique', '#78909c', 'fas fa-landmark', 25]
    ];

    let created = 0, updated = 0;

    for (const [nom, code, description, couleur, icone, ordre] of secteurs) {
        const result = await client.query(`
            INSERT INTO secteurs_activite (nom, code, description, couleur, icone, ordre, actif)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            ON CONFLICT (code) DO UPDATE SET 
                nom = EXCLUDED.nom,
                description = EXCLUDED.description,
                couleur = EXCLUDED.couleur,
                icone = EXCLUDED.icone,
                ordre = EXCLUDED.ordre,
                updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
        `, [nom, code, description, couleur, icone, ordre]);

        if (result.rows[0].inserted) {
            created++;
        } else {
            updated++;
        }
    }

    console.log(`   ✓ ${created} créés, ${updated} mis à jour (Total: ${secteurs.length})\n`);
}

// ===============================================
// 📅 ANNÉES FISCALES
// ===============================================
async function insertFiscalYears(client) {
    console.log('📅 Insertion des Années Fiscales (N-1 et N)...');

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear];
    const statusByYear = {
        [currentYear - 1]: 'FERMEE',
        [currentYear]: 'EN_COURS'
    };

    let created = 0, updated = 0;

    for (const year of years) {
        const res = await client.query(`
            INSERT INTO fiscal_years (annee, date_debut, date_fin, budget_global, statut, libelle)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (annee) DO UPDATE SET 
                date_debut = EXCLUDED.date_debut,
                date_fin = EXCLUDED.date_fin,
                budget_global = EXCLUDED.budget_global,
                statut = EXCLUDED.statut,
                libelle = EXCLUDED.libelle,
                updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
        `, [year, `${year}-01-01`, `${year}-12-31`, 6000000.00, statusByYear[year], `FY${String(year).slice(2)}`]);

        if (res.rows[0].inserted) {
            console.log(`   ✓ Année fiscale ${year} créée`);
            created++;
        } else {
            console.log(`   ✓ Année fiscale ${year} mise à jour`);
            updated++;
        }
    }

    console.log(`\n   📊 Résumé: ${created} créées, ${updated} mises à jour\n`);
}

// ===============================================
// 🎯 TYPES D'OPPORTUNITÉS AVEC ÉTAPES
// ===============================================
async function insertOpportunityTypesWithStages(client) {
    console.log('🎯 Insertion des Types d\'Opportunités avec leurs étapes...\n');

    // Charger les données depuis le fichier JSON
    const dataPath = path.resolve(__dirname, 'data/opportunity-types-config.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const opportunityTypesWithStages = data.opportunityTypes;

    /* Ancienne définition inline supprimée - maintenant dans opportunity-types-config.json
    const opportunityTypesWithStages = [
        {
            type: { name: 'Conseil', code: 'CONSEIL', description: 'Mission de conseil en gestion', default_probability: 70, default_duration_days: 30, couleur: '#3498db' },
            stages: [
                { stage_name: 'Diagnostic initial', stage_order: 1, description: 'Analyse de la situation actuelle et identification des besoins', required_documents: ['Rapport de test'], required_actions: ['Présentation de la solution', 'Analyse des besoins client'], max_duration_days: 10, min_duration_days: 5, is_mandatory: true, validation_required: true },
                { stage_name: 'Élaboration des recommandations', stage_order: 2, description: 'Développement des solutions et plan d\'action', required_documents: ['Proposition commerciale'], required_actions: ['Analyse des besoins client', 'Documentation technique'], max_duration_days: 15, min_duration_days: 7, is_mandatory: true, validation_required: true },
                { stage_name: 'Accompagnement à la mise en œuvre', stage_order: 3, description: 'Suivi de l\'implémentation et formation des équipes', required_documents: ['Rapport de test'], required_actions: ['Support post-déploiement', 'Validation technique'], max_duration_days: 20, min_duration_days: 10, is_mandatory: true, validation_required: false }
            ]
        },
        {
            type: { name: 'Audit', code: 'AUD', description: 'Mission d\'audit comptable et financier', default_probability: 80, default_duration_days: 45, couleur: '#3498db' },
            stages: [
                { stage_name: 'Préparation et planification', stage_order: 1, description: 'Définition du périmètre, constitution de l\'équipe, élaboration du planning', required_documents: ['Lettre de mission', 'Planning détaillé', 'Composition équipe'], required_actions: ['Réunion de lancement', 'Analyse des risques', 'Préparation des outils'], max_duration_days: 7, min_duration_days: 3, is_mandatory: true, validation_required: true },
                { stage_name: 'Exécution des travaux', stage_order: 2, description: 'Réalisation des tests de conformité et des contrôles', required_documents: ['Fiches de travail', 'Échantillons testés', 'Correspondances'], required_actions: ['Tests de conformité', 'Contrôles sur place', 'Entretiens'], max_duration_days: 25, min_duration_days: 10, is_mandatory: true, validation_required: false },
                { stage_name: 'Finalisation et rapport', stage_order: 3, description: 'Rédaction du rapport, validation finale, présentation', required_documents: ['Rapport d\'audit', 'Lettre de recommandations', 'Présentation client'], required_actions: ['Rédaction rapport', 'Validation hiérarchique', 'Présentation résultats'], max_duration_days: 10, min_duration_days: 5, is_mandatory: true, validation_required: true }
            ]
        },
        {
            type: { name: 'Expertise', code: 'EXPERTISE', description: 'Expertise comptable et fiscale', default_probability: 75, default_duration_days: 25, couleur: '#9b59b6' },
            stages: [
                { stage_name: 'Analyse de la demande', stage_order: 1, description: 'Compréhension du besoin et évaluation de la complexité', required_documents: ['Demande client', 'Analyse préliminaire', 'Estimation complexité'], required_actions: ['Entretien client', 'Analyse documentaire', 'Évaluation risques'], max_duration_days: 5, min_duration_days: 2, is_mandatory: true, validation_required: true },
                { stage_name: 'Recherche et analyse', stage_order: 2, description: 'Investigation approfondie et analyse technique', required_documents: ['Rapport d\'analyse', 'Études comparatives', 'Expertises techniques'], required_actions: ['Recherche documentaire', 'Consultations experts', 'Analyses techniques'], max_duration_days: 15, min_duration_days: 7, is_mandatory: true, validation_required: false },
                { stage_name: 'Rédaction de l\'expertise', stage_order: 3, description: 'Rédaction du rapport d\'expertise et recommandations', required_documents: ['Rapport d\'expertise', 'Annexes techniques', 'Recommandations'], required_actions: ['Rédaction rapport', 'Validation technique', 'Relecture'], max_duration_days: 10, min_duration_days: 5, is_mandatory: true, validation_required: true }
            ]
        },
        {
            type: { name: 'Consulting', code: 'CONSULTING', description: 'Consulting en organisation', default_probability: 65, default_duration_days: 40, couleur: '#2ecc71' },
            stages: [
                { stage_name: 'Phase de découverte', stage_order: 1, description: 'Exploration approfondie de l\'organisation et des enjeux', required_documents: ['Certificat de conformité'], required_actions: ['Analyse des besoins client', 'Support post-déploiement', 'Présentation de la solution'], max_duration_days: 12, min_duration_days: 5, is_mandatory: true, validation_required: true },
                { stage_name: 'Stratégie et planification', stage_order: 2, description: 'Définition de la stratégie et plan de transformation', required_documents: ['Rapport d\'analyse'], required_actions: ['Étude de faisabilité'], max_duration_days: 15, min_duration_days: 7, is_mandatory: true, validation_required: true },
                { stage_name: 'Accompagnement au changement', stage_order: 3, description: 'Mise en œuvre et accompagnement des équipes', required_documents: ['Plan de projet'], required_actions: ['Analyse des besoins client'], max_duration_days: 25, min_duration_days: 15, is_mandatory: true, validation_required: false },
                { stage_name: 'Évaluation et pérennisation', stage_order: 4, description: 'Mesure des résultats et transfert de compétences', required_documents: ['Rapport de test'], required_actions: ['Support post-déploiement'], max_duration_days: 8, min_duration_days: 3, is_mandatory: true, validation_required: true }
            ]
        },
        {
            type: { name: 'Formation', code: 'FOM01', description: 'Formation professionnelle', default_probability: 90, default_duration_days: 15, couleur: '#f39c12' },
            stages: [
                { stage_name: 'Analyse des besoins', stage_order: 1, description: 'Évaluation des compétences actuelles et définition des objectifs', required_documents: ['Audit des compétences', 'Objectifs de formation', 'Profil des participants'], required_actions: ['Entretiens RH', 'Tests de niveau', 'Analyse des postes'], max_duration_days: 5, min_duration_days: 2, is_mandatory: true, validation_required: true },
                { stage_name: 'Conception du programme', stage_order: 2, description: 'Élaboration du contenu et des supports de formation', required_documents: ['Programme détaillé', 'Supports pédagogiques', 'Exercices pratiques'], required_actions: ['Conception pédagogique', 'Création supports', 'Tests pilotes'], max_duration_days: 7, min_duration_days: 3, is_mandatory: true, validation_required: true },
                { stage_name: 'Animation de la formation', stage_order: 3, description: 'Délivrance de la formation et suivi des participants', required_documents: ['Feuilles de présence', 'Évaluations', 'Retours participants'], required_actions: ['Animation sessions', 'Suivi apprentissage', 'Ajustements contenu'], max_duration_days: 10, min_duration_days: 5, is_mandatory: true, validation_required: false },
                { stage_name: 'Évaluation et suivi', stage_order: 4, description: 'Mesure de l\'efficacité et suivi post-formation', required_documents: ['Rapport d\'évaluation', 'Plan de suivi', 'Recommandations'], required_actions: ['Tests de validation', 'Entretiens post-formation', 'Analyse ROI'], max_duration_days: 5, min_duration_days: 2, is_mandatory: true, validation_required: true }
            ]
        },
        {
            type: { name: 'Vente standard', code: 'VENTE_STD', description: 'Pipeline commercial standard (identification → décision)', default_probability: 10, default_duration_days: 30, couleur: null },
            stages: [
                { stage_name: 'Identification', stage_order: 1, description: 'Opportunité détectée; enregistrement et qualification rapide', required_documents: ['Lead/Contact initial', 'Notes de détection'], required_actions: ['Créer la fiche opportunité', 'Qualifier rapidement l\'intérêt'], max_duration_days: 7, min_duration_days: 1, is_mandatory: true, validation_required: true },
                { stage_name: 'Qualification', stage_order: 2, description: 'Valider besoin, budget, décideurs, timing (ex. BANT)', required_documents: ['Grille BANT', 'Liste des décideurs'], required_actions: ['Valider BANT', 'Identifier décideurs', 'Estimer budget'], max_duration_days: 10, min_duration_days: 3, is_mandatory: true, validation_required: true },
                { stage_name: 'Proposition', stage_order: 3, description: 'Production et envoi de l\'offre (technique + financière)', required_documents: ['Proposition', 'Chiffrage', 'Conditions'], required_actions: ['Rédaction offre', 'Validation interne', 'Envoi au client'], max_duration_days: 10, min_duration_days: 3, is_mandatory: true, validation_required: true },
                { stage_name: 'Négociation', stage_order: 4, description: 'Convergence sur prix, périmètre, délais et conditions', required_documents: ['Versions d\'offre', 'Table des concessions'], required_actions: ['Négociation', 'Alignement interne', 'Validation client'], max_duration_days: 15, min_duration_days: 5, is_mandatory: true, validation_required: false },
                { stage_name: 'Décision', stage_order: 5, description: 'Issue finale (gagnée/perdue); si gagnée, préparer onboarding', required_documents: ['Bon pour accord/Contrat', 'Compte-rendu de décision'], required_actions: ['Clôturer opportunité', 'Préparer onboarding si gagnée'], max_duration_days: 5, min_duration_days: 1, is_mandatory: true, validation_required: true }
            ]
        }
    */
    // Fin de l'ancienne définition inline

    let typesCreated = 0, typesUpdated = 0, stagesCreated = 0, stagesUpdated = 0;

    for (const { type, stages } of opportunityTypesWithStages) {
        // Insérer le type d'opportunité
        const typeResult = await client.query(`
            INSERT INTO opportunity_types (name, code, description, default_probability, default_duration_days, couleur, is_active, nom)
            VALUES ($1, $2, $3, $4, $5, $6, true, $1)
            ON CONFLICT (name) DO UPDATE SET 
                code = EXCLUDED.code,
                nom = EXCLUDED.nom,
                description = EXCLUDED.description,
                default_probability = EXCLUDED.default_probability,
                default_duration_days = EXCLUDED.default_duration_days,
                couleur = EXCLUDED.couleur,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, (xmax = 0) AS inserted
        `, [type.name, type.code, type.description, type.default_probability, type.default_duration_days, type.couleur]);

        const opportunityTypeId = typeResult.rows[0].id;
        if (typeResult.rows[0].inserted) {
            typesCreated++;
        } else {
            typesUpdated++;
        }

        // Insérer les étapes pour ce type
        for (const stage of stages) {
            // Tenter une mise à jour par (opportunity_type_id, stage_order); si aucune ligne affectée, insérer
            const updateRes = await client.query(`
                UPDATE opportunity_stage_templates
                SET stage_name = $1,
                    description = $2,
                    required_documents = $3,
                    required_actions = $4,
                    max_duration_days = $5,
                    min_duration_days = $6,
                    is_mandatory = $7,
                    validation_required = $8,
                    updated_at = CURRENT_TIMESTAMP
                WHERE opportunity_type_id = $9 AND stage_order = $10
            `, [
                stage.stage_name,
                stage.description,
                JSON.stringify(stage.required_documents),
                JSON.stringify(stage.required_actions),
                stage.max_duration_days,
                stage.min_duration_days,
                stage.is_mandatory,
                stage.validation_required,
                opportunityTypeId,
                stage.stage_order
            ]);

            if (updateRes.rowCount && updateRes.rowCount > 0) {
                stagesUpdated++;
            } else {
                await client.query(`
                    INSERT INTO opportunity_stage_templates (
                        opportunity_type_id, stage_name, stage_order, description,
                        required_documents, required_actions, max_duration_days, min_duration_days,
                        is_mandatory, validation_required
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    opportunityTypeId,
                    stage.stage_name,
                    stage.stage_order,
                    stage.description,
                    JSON.stringify(stage.required_documents),
                    JSON.stringify(stage.required_actions),
                    stage.max_duration_days,
                    stage.min_duration_days,
                    stage.is_mandatory,
                    stage.validation_required
                ]);
                stagesCreated++;
            }
        }

        console.log(`   ✓ ${type.name} (${type.code}) : ${stages.length} étapes configurées`);
    }

    console.log(`\n   📊 Résumé:`);
    console.log(`      • Types: ${typesCreated} créés, ${typesUpdated} mis à jour`);
    console.log(`      • Étapes: ${stagesCreated} créées, ${stagesUpdated} mises à jour\n`);
}

// ===============================================
// 🏢 ACTIVITÉS INTERNES
// ===============================================
async function insertInternalActivities(client) {
    console.log('🏢 Insertion des Activités Internes...');

    const activities = [
        ['Congés annuel', 'Congés annuels'],
        ['Congés Maladie', 'Congés Maladie'],
        ['Recherches', 'Recherches diverses'],
        ['Sollicitation Inter BU', 'Sollicitation Inter BU']
    ];

    let created = 0, updated = 0;

    for (const [name, description] of activities) {
        // Tenter une mise à jour par name; si aucune ligne affectée, insérer
        const updateRes = await client.query(`
            UPDATE internal_activities 
            SET description = $1,
                is_active = true,
                updated_at = CURRENT_TIMESTAMP
            WHERE name = $2
        `, [description, name]);

        if (updateRes.rowCount && updateRes.rowCount > 0) {
            updated++;
        } else {
            await client.query(`
                INSERT INTO internal_activities (name, description, is_active)
                VALUES ($1, $2, true)
            `, [name, description]);
            created++;
        }
    }

    console.log(`   ✓ ${created} créées, ${updated} mises à jour (Total: ${activities.length})\n`);
}

// ===============================================
// 📋 TÂCHES POUR LES TYPES DE MISSION
// ===============================================
async function insertMissionTasks(client) {
    console.log('📋 Insertion des Tâches pour les Types de Mission...\n');
    const missionTypesWithTasks = [
        {
            codification: 'AUDIT_CAC',
            tasks: [
                {
                    code: 'AUDIT_CAC_ACCEPTATION',
                    libelle: 'Acceptation et Maintien de la mission',
                    description: 'Vérification de l\'indépendance et absence de conflits d\'intérêts. Lutte anti-blanchiment (KYC - Know Your Customer). Signature de la Lettre de mission.',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 1
                },
                {
                    code: 'AUDIT_CAC_PRISE_CONNAISSANCE',
                    libelle: 'Prise de connaissance et Orientation',
                    description: 'Analyse de l\'environnement et des risques. Note d\'orientation générale (Stratégie d\'audit).',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 2
                },
                {
                    code: 'AUDIT_CAC_CONTROLE_INTERNE',
                    libelle: 'Appréciation du Contrôle Interne',
                    description: 'Revue des processus (Achats, Ventes, Trésorerie, RH...). Tests de procédures.',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 3
                },
                {
                    code: 'AUDIT_CAC_CONTROLE_COMPTES',
                    libelle: 'Contrôle des comptes (Substantif)',
                    description: 'Circularisation (demande de confirmation aux tiers). Audit analytique et tests de détails. Inventaire physique (optionnel selon l\'activité).',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 4
                },
                {
                    code: 'AUDIT_CAC_VERIFICATIONS_SPECIFIQUES',
                    libelle: 'Vérifications Spécifiques CAC',
                    description: 'Conventions réglementées, égalité entre actionnaires, documents juridiques.',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 5
                },
                {
                    code: 'AUDIT_CAC_TRAVAUX_FIN_MISSION',
                    libelle: 'Travaux de fin de mission et Rapports',
                    description: 'Synthèse des travaux. Émission des rapports (Général et Spécial). Présentation aux instances dirigeantes.',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 6
                }
            ]
        },
        {
            codification: 'EXP_REC',
            tasks: [
                {
                    code: 'EXP_REC_COLLECTE_TRAITEMENT',
                    libelle: 'Collecte et Traitement',
                    description: 'Récupération des pièces (automatique ou manuelle). Saisie comptable ou imputation.',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 1
                },
                {
                    code: 'EXP_REC_REVISION_COMPTES',
                    libelle: 'Révision des comptes',
                    description: 'Justification des comptes de bilan. Contrôle de cohérence (TVA, Charges sociales).',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 2
                },
                {
                    code: 'EXP_REC_SITUATIONS_INTERMEDIAIRES',
                    libelle: 'Situations intermédiaires',
                    description: 'Reporting mensuel ou trimestriel.',
                    duree_estimee: 4,
                    priorite: 'MOYENNE',
                    obligatoire: false,
                    ordre: 3
                },
                {
                    code: 'EXP_REC_CLOTURE_ANNUELLE',
                    libelle: 'Clôture Annuelle',
                    description: 'Écritures d\'inventaire (Amortissements, Stocks, Provisions). Calcul de l\'impôt (IS).',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 4
                },
                {
                    code: 'EXP_REC_ETATS_FINANCIERS',
                    libelle: 'Établissement des États Financiers',
                    description: 'Bilan, Compte de résultat, Annexe. Liasse fiscale.',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 5
                },
                {
                    code: 'EXP_REC_ENTRETIEN_BILAN',
                    libelle: 'Entretien de bilan / Restitution',
                    description: 'Présentation pédagogique des comptes au client.',
                    duree_estimee: 4,
                    priorite: 'MOYENNE',
                    obligatoire: false,
                    ordre: 6
                }
            ]
        },
        {
            codification: 'EXP_PREV_BP',
            tasks: [
                {
                    code: 'EXP_PREV_CADRAGE',
                    libelle: 'Entretien de cadrage et collecte des hypothèses',
                    description: 'Définition du projet, CA estimé, besoins RH, investissements.',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 1
                },
                {
                    code: 'EXP_PREV_MODELISATION',
                    libelle: 'Construction chiffrée (Modélisation)',
                    description: 'Calcul des charges, SIG (Soldes Intermédiaires de Gestion), Trésorerie.',
                    duree_estimee: 10,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 2
                },
                {
                    code: 'EXP_PREV_CHOIX_STATUT',
                    libelle: 'Choix du statut Juridique, Fiscal et Social',
                    description: 'Comparaison (ex: SAS vs SARL, IS vs IR) et optimisation de la rémunération du dirigeant.',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 3
                },
                {
                    code: 'EXP_PREV_DOSSIER_PRESENTATION',
                    libelle: 'Rédaction du dossier de présentation',
                    description: 'Mise en forme pour les banquiers/investisseurs.',
                    duree_estimee: 8,
                    priorite: 'MOYENNE',
                    obligatoire: true,
                    ordre: 4
                },
                {
                    code: 'EXP_PREV_ACCOMPAGNEMENT_BANCAIRE',
                    libelle: 'Accompagnement bancaire',
                    description: 'Présence de l\'expert lors des rendez-vous bancaires.',
                    duree_estimee: 4,
                    priorite: 'MOYENNE',
                    obligatoire: false,
                    ordre: 5
                }
            ]
        },
        {
            codification: 'EXP_EVAL_ENTR',
            tasks: [
                {
                    code: 'EXP_EVAL_DIAGNOSTIC',
                    libelle: 'Prise de connaissance et Diagnostic',
                    description: 'Analyse SWOT, positionnement marché, analyse des derniers bilans.',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 1
                },
                {
                    code: 'EXP_EVAL_RETRAITEMENTS',
                    libelle: 'Retraitement des comptes',
                    description: 'Neutralisation des éléments exceptionnels, recalcul de la rentabilité normative (EBITDA normatif).',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 2
                },
                {
                    code: 'EXP_EVAL_METHODES',
                    libelle: 'Mise en œuvre des méthodes d\'évaluation',
                    description: 'Approche patrimoniale, rentabilité, comparables, DCF (Discounted Cash Flow).',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 3
                },
                {
                    code: 'EXP_EVAL_RAPPORT',
                    libelle: 'Rapport de valorisation',
                    description: 'Fourchette de valeur et justifications.',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 4
                },
                {
                    code: 'EXP_EVAL_ASSISTANCE_NEGOCIATION',
                    libelle: 'Assistance à la négociation',
                    description: 'Assistance à la négociation (Letter of Intent / Gap de garantie).',
                    duree_estimee: 4,
                    priorite: 'MOYENNE',
                    obligatoire: false,
                    ordre: 5
                }
            ]
        },
        {
            codification: 'EXP_OUTILS_GEST',
            tasks: [
                {
                    code: 'OUTILS_GEST_AUDIT_SI',
                    libelle: 'Audit des systèmes d\'information',
                    description: 'Analyse des logiciels actuels et des flux de données.',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 1
                },
                {
                    code: 'OUTILS_GEST_KPI',
                    libelle: 'Définition des indicateurs clés (KPIs)',
                    description: 'Choix des indicateurs pertinents pour le client.',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 2
                },
                {
                    code: 'OUTILS_GEST_PARAMETRAGE',
                    libelle: 'Paramétrage et Interfaçage',
                    description: 'Configuration technique des outils.',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 3
                },
                {
                    code: 'OUTILS_GEST_FORMATION',
                    libelle: 'Formation des équipes client',
                    description: 'Formation des équipes client sur les nouveaux outils.',
                    duree_estimee: 4,
                    priorite: 'MOYENNE',
                    obligatoire: false,
                    ordre: 4
                }
            ]
        },
        {
            codification: 'CONSEIL_JUR_FISC',
            tasks: [
                {
                    code: 'JUR_FISC_ANALYSE_PRELIMINAIRE',
                    libelle: 'Prise de contact et Analyse préliminaire',
                    description: 'Qualification des faits. Détection des conflits d\'intérêts.',
                    duree_estimee: 4,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 1
                },
                {
                    code: 'JUR_FISC_CONVENTION_HONORAIRES',
                    libelle: 'Convention d\'honoraires',
                    description: 'Définition du périmètre et du mode de facturation.',
                    duree_estimee: 4,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 2
                },
                {
                    code: 'JUR_FISC_RECHERCHES',
                    libelle: 'Recherches et Analyse juridique',
                    description: 'Veille jurisprudentielle. Analyse des textes applicables.',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 3
                },
                {
                    code: 'JUR_FISC_REDACTION_ACTES',
                    libelle: 'Rédaction d\'actes ou de consultations',
                    description: 'Rédaction (Statuts, Contrats, Mémos). Relecture / Revue contradictoire (interne).',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 4
                },
                {
                    code: 'JUR_FISC_FORMALITES',
                    libelle: 'Formalités et Dépôts',
                    description: 'Greffe, Enregistrement fiscal, INPI...',
                    duree_estimee: 4,
                    priorite: 'MOYENNE',
                    obligatoire: false,
                    ordre: 5
                },
                {
                    code: 'JUR_FISC_SUIVI_CONTENTIEUX',
                    libelle: 'Suivi / Contentieux',
                    description: 'Audiences, Plaidoiries (si phase contentieuse).',
                    duree_estimee: 6,
                    priorite: 'MOYENNE',
                    obligatoire: false,
                    ordre: 6
                }
            ]
        },
        {
            codification: 'CONS_MGT',
            tasks: [
                {
                    code: 'CONS_MGT_CADRAGE',
                    libelle: 'Cadrage et Lancement (Kick-off)',
                    description: 'Définition des objectifs SMART. Constitution de l\'équipe projet.',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 1
                },
                {
                    code: 'CONS_MGT_DIAGNOSTIC',
                    libelle: 'Diagnostic (As-Is)',
                    description: 'Interviews / Ateliers. Analyse de données. Identification des "Pain points".',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 2
                },
                {
                    code: 'CONS_MGT_CONCEPTION_CIBLE',
                    libelle: 'Conception de la cible (To-Be)',
                    description: 'Scénarios et recommandations. Business Case / ROI.',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 3
                },
                {
                    code: 'CONS_MGT_PLANIFICATION',
                    libelle: 'Planification de la mise en œuvre',
                    description: 'Roadmap (Feuille de route).',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 4
                },
                {
                    code: 'CONS_MGT_PILOTAGE',
                    libelle: 'Pilotage du déploiement / Accompagnement',
                    description: 'PMO (Project Management Office). Conduite du changement (Communication, Formation).',
                    duree_estimee: 8,
                    priorite: 'MOYENNE',
                    obligatoire: false,
                    ordre: 5
                },
                {
                    code: 'CONS_MGT_BILAN',
                    libelle: 'Bilan de fin de mission',
                    description: 'Retour d\'expérience (REX).',
                    duree_estimee: 4,
                    priorite: 'MOYENNE',
                    obligatoire: false,
                    ordre: 6
                }
            ]
        },
        {
            codification: 'DOUANE_COMINT',
            tasks: [
                {
                    code: 'DOUANE_AUDIT_FLUX',
                    libelle: 'Audit des flux existants',
                    description: 'Analyse des nomenclatures douanières utilisées (HS Code). Analyse de l\'origine des produits.',
                    duree_estimee: 6,
                    priorite: 'MOYENNE',
                    obligatoire: false,
                    ordre: 1
                },
                {
                    code: 'DOUANE_CLASSEMENT_SECURISATION',
                    libelle: 'Classement et Sécurisation',
                    description: 'Détermination de la valeur en douane. Demande de RTC (Renseignement Tarifaire Contraignant).',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 2
                },
                {
                    code: 'DOUANE_FORMALITES',
                    libelle: 'Gestion des formalités déclaratives',
                    description: 'Établissement des déclarations d\'import/export.',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 3
                },
                {
                    code: 'DOUANE_CONTENTIEUX',
                    libelle: 'Gestion des contentieux ou contrôles',
                    description: 'Réponse à l\'administration des douanes.',
                    duree_estimee: 6,
                    priorite: 'MOYENNE',
                    obligatoire: false,
                    ordre: 4
                }
            ]
        },
        {
            codification: 'FORMATION',
            tasks: [
                {
                    code: 'FORM_INGENIERIE',
                    libelle: 'Ingénierie de formation (Cadrage)',
                    description: 'Analyse des besoins. Définition des objectifs pédagogiques.',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 1
                },
                {
                    code: 'FORM_ADMIN',
                    libelle: 'Administratif & Convention',
                    description: 'Envoi des convocations. Signature convention de formation.',
                    duree_estimee: 4,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 2
                },
                {
                    code: 'FORM_CONCEPTION',
                    libelle: 'Conception pédagogique',
                    description: 'Création des supports.',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 3
                },
                {
                    code: 'FORM_ANIMATION',
                    libelle: 'Animation / Dispense',
                    description: 'Présentiel ou E-learning. Émargements (Preuve de présence).',
                    duree_estimee: 8,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 4
                },
                {
                    code: 'FORM_EVALUATION',
                    libelle: 'Évaluation',
                    description: 'Évaluation à chaud (satisfaction). Évaluation à froid (acquis). Remise des certificats/attestations.',
                    duree_estimee: 6,
                    priorite: 'HAUTE',
                    obligatoire: true,
                    ordre: 5
                }
            ]
        }
    ];

    let tasksCreated = 0;
    let tasksUpdated = 0;
    let linksCreated = 0;

    for (const mt of missionTypesWithTasks) {
        const missionTypeResult = await client.query(`
            SELECT id, codification, libelle
            FROM mission_types
            WHERE codification = $1
        `, [mt.codification]);

        if (missionTypeResult.rows.length === 0) {
            console.log(`   ⚠️  Type de mission ${mt.codification} non trouvé, tâches ignorées`);
            continue;
        }

        const missionType = missionTypeResult.rows[0];
        console.log(`   🎯 Configuration des tâches pour: ${missionType.codification} - ${missionType.libelle}`);

        for (const task of mt.tasks) {
            const existingTask = await client.query(`
                SELECT id FROM tasks WHERE code = $1
            `, [task.code]);

            let taskId;

            if (existingTask.rows.length > 0) {
                await client.query(`
                    UPDATE tasks
                    SET libelle = $1,
                        description = $2,
                        duree_estimee = $3,
                        priorite = $4,
                        obligatoire = $5,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE code = $6
                `, [task.libelle, task.description, task.duree_estimee, task.priorite, task.obligatoire, task.code]);

                taskId = existingTask.rows[0].id;
                tasksUpdated++;
            } else {
                const taskResult = await client.query(`
                    INSERT INTO tasks (code, libelle, description, duree_estimee, priorite, actif, obligatoire)
                    VALUES ($1, $2, $3, $4, $5, true, $6)
                    RETURNING id
                `, [task.code, task.libelle, task.description, task.duree_estimee, task.priorite, task.obligatoire]);

                taskId = taskResult.rows[0].id;
                tasksCreated++;
            }

            const existingLink = await client.query(`
                SELECT id FROM task_mission_types
                WHERE task_id = $1 AND mission_type_id = $2
            `, [taskId, missionType.id]);

            if (existingLink.rows.length === 0) {
                await client.query(`
                    INSERT INTO task_mission_types (task_id, mission_type_id, ordre, obligatoire)
                    VALUES ($1, $2, $3, $4)
                `, [taskId, missionType.id, task.ordre, task.obligatoire]);

                linksCreated++;
            }
        }
    }

    console.log(`   ✓ Tâches: ${tasksCreated} créées, ${tasksUpdated} mises à jour`);
    console.log(`   ✓ Liens: ${linksCreated} créés`);
    console.log(`   ✓ Total: configuration des tâches terminée pour les types de mission\n`);
}

main().catch(console.error);


// ===============================================
// 📏 UNITÉS D'OBJECTIFS
// ===============================================
async function insertObjectiveUnits(client) {
    console.log('📏 Insertion des Unités d\'objectifs...');

    const units = [
        { code: 'COUNT', label: 'Nombre', type: 'NUMBER', symbol: '' },
        { code: 'EUR', label: 'Euro', type: 'CURRENCY', symbol: '€' },
        { code: 'PERCENT', label: 'Pourcentage', type: 'PERCENT', symbol: '%' },
        { code: 'XOF', label: 'Franc CFA', type: 'CURRENCY', symbol: 'FCFA' }
    ];

    let created = 0, updated = 0;

    for (const unit of units) {
        const result = await client.query(`
            INSERT INTO objective_units (code, label, type, symbol)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (code) DO UPDATE SET
                label = EXCLUDED.label,
                type = EXCLUDED.type,
                symbol = EXCLUDED.symbol,
                updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
        `, [unit.code, unit.label, unit.type, unit.symbol]);

        if (result.rows[0].inserted) created++;
        else updated++;
    }
    console.log(`   ✓ ${created} créées, ${updated} mises à jour (Total: ${units.length})\n`);
}

// ===============================================
// 🎯 TYPES D'OBJECTIFS (STRATÉGIQUE, OPÉRATIONNEL...)
// ===============================================
async function insertObjectiveTypes(client) {
    console.log('🎯 Insertion des Types d\'Objectifs...');

    // 1. Récupérer les Unités existantes
    const unitsResult = await client.query('SELECT id, code, type, symbol FROM objective_units');
    const units = {}; // Map code -> unit object
    unitsResult.rows.forEach(u => units[u.code] = u);

    // Fonction helper pour trouver une unité
    const getUnit = (code) => {
        if (units[code]) return units[code];
        if (code === 'COUNT' && units['NUMBER']) return units['NUMBER'];
        if (code === 'CURRENCY' && units['EUR']) return units['EUR'];
        if (code === 'CURRENCY' && units['FCFA']) return units['FCFA'];
        return null; // Fallback
    };

    const typesToInsert = [
        // --- OPPORTUNITÉS ---
        {
            code: 'OPP_WON_COUNT', label: 'Opportunités Gagnées (Nombre)', category: 'commercial',
            unit_code: 'COUNT', is_financial: false, entity_type: 'OPPORTUNITY', operation: 'WON',
            value_field: 'id', description: 'Nombre d\'opportunités passées au statut "Gagnée"'
        },
        {
            code: 'OPP_WON_AMOUNT', label: 'CA Signé (Montant)', category: 'commercial',
            unit_code: 'CURRENCY', is_financial: true, entity_type: 'OPPORTUNITY', operation: 'WON',
            value_field: 'montant_estime', description: 'Somme des montants des opportunités gagnées'
        },
        {
            code: 'OPP_NEW_COUNT', label: 'Nouvelles Opportunités', category: 'commercial',
            unit_code: 'COUNT', is_financial: false, entity_type: 'OPPORTUNITY', operation: 'CREATED',
            value_field: 'id', description: 'Nombre d\'opportunités créées'
        },
        {
            code: 'OPP_LOST_COUNT', label: 'Opportunités Perdues', category: 'commercial',
            unit_code: 'COUNT', is_financial: false, entity_type: 'OPPORTUNITY', operation: 'LOST',
            value_field: 'id', description: 'Nombre d\'opportunités perdues'
        },
        // --- MISSIONS ---
        {
            code: 'MISS_START_COUNT', label: 'Missions Démarrées', category: 'operations',
            unit_code: 'COUNT', is_financial: false, entity_type: 'MISSION', operation: 'STARTED',
            value_field: 'id', description: 'Nombre de missions dont la date de début est atteinte'
        },
        {
            code: 'MISS_DONE_COUNT', label: 'Missions Terminées', category: 'operations',
            unit_code: 'COUNT', is_financial: false, entity_type: 'MISSION', operation: 'COMPLETED',
            value_field: 'id', description: 'Nombre de missions terminées'
        },
        {
            code: 'MISS_REVENUE', label: 'Revenu Missions', category: 'financial',
            unit_code: 'CURRENCY', is_financial: true, entity_type: 'MISSION', operation: 'COMPLETED',
            value_field: 'montant_total', description: 'Revenu total généré par les missions terminées'
        },
        // --- CLIENTS & FACTURES ---
        {
            code: 'CLIENT_NEW', label: 'Nouveaux Clients', category: 'commercial',
            unit_code: 'COUNT', is_financial: false, entity_type: 'CLIENT', operation: 'CREATED',
            value_field: 'id', description: 'Nombre de nouveaux clients créés'
        },
        {
            code: 'INV_SENT_COUNT', label: 'Factures Envoyées', category: 'financial',
            unit_code: 'COUNT', is_financial: false, entity_type: 'INVOICE', operation: 'SENT',
            value_field: 'id', description: 'Nombre de factures envoyées'
        },
        {
            code: 'INV_PAID_AMT', label: 'Encaissements (TTC)', category: 'financial',
            unit_code: 'CURRENCY', is_financial: true, entity_type: 'INVOICE', operation: 'PAID',
            value_field: 'montant_total', description: 'Montant total des factures payées'
        }
    ];

    let created = 0, updated = 0;

    for (const type of typesToInsert) {
        let unitObj = getUnit(type.unit_code);

        // Fallback intelligent si unité pas trouvée par code exact
        if (!unitObj) {
            if (type.unit_code === 'COUNT') unitObj = Object.values(units).find(u => u.type === 'NUMBER' || u.code === 'NB');
            else if (type.unit_code === 'CURRENCY') unitObj = Object.values(units).find(u => u.type === 'CURRENCY');
        }

        if (!unitObj) {
            console.warn(`   ⚠️ Unité introuvable pour ${type.code} (${type.unit_code}), ignoré.`);
            continue;
        }

        const result = await client.query(`
            INSERT INTO objective_types (
                code, label, category, unit, default_unit_id, is_financial, 
                entity_type, operation, value_field, description,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            ON CONFLICT (code) DO UPDATE SET
                label = EXCLUDED.label,
                category = EXCLUDED.category,
                unit = EXCLUDED.unit,
                default_unit_id = EXCLUDED.default_unit_id,
                is_financial = EXCLUDED.is_financial,
                entity_type = EXCLUDED.entity_type,
                operation = EXCLUDED.operation,
                value_field = EXCLUDED.value_field,
                description = EXCLUDED.description,
                updated_at = NOW()
            RETURNING (xmax = 0) AS inserted
        `, [
            type.code, type.label, type.category,
            unitObj.symbol || unitObj.code, unitObj.id,
            type.is_financial, type.entity_type, type.operation,
            type.value_field, type.description
        ]);

        if (result.rows[0].inserted) created++;
        else updated++;
    }

    console.log(`   ✓ ${created} créés, ${updated} mis à jour (Total: ${typesToInsert.length})\n`);
}

// ===============================================
// 🔗 SOURCES DE MÉTRIQUES
// ===============================================
async function setupMetricsSources(client) {
    console.log('🔗 Configuration des Sources de Métriques...');

    // Mapping Métrique -> Sources
    // Note: Utilise les codes (CA_TOTAL) et (CA_OPP) définis précédemment
    const configurations = [
        {
            metric: 'CA_TOTAL',
            sources: ['OPP_WON_AMOUNT', 'MISS_REVENUE'] // Codes objective_types
        },
        {
            metric: 'CLIENTS_COUNT',
            sources: ['CLIENT_NEW']
        },
        {
            metric: 'INVOICES_PAID',
            sources: ['INV_PAID_AMT'] // Code type peut différer selon seed, vérifier mapping
        },
        {
            metric: 'CASH_COLLECTED', // Si la métrique existe
            sources: ['INV_PAID_AMT']
        }
    ];

    // Pour simplifier ici, on mappe les codes utilisés dans setup_metrics_sources.js 
    // vers ceux insérés par insertObjectiveTypes ci-dessus si différents.
    // Mapping: { 'TYPE_DANS_CONFIG': 'CODE_REEL_DB' }
    const typeMapping = {
        'CA_OPP': 'OPP_WON_AMOUNT',
        'CA_MISSION': 'MISS_REVENUE',
        'NOUVEAUX_CLIENTS': 'CLIENT_NEW',
        'FACTURES_PAYEES': 'INV_PAID_AMT', // À adapter si besoin
        'CA_ENCAISSE': 'INV_PAID_AMT'
    };

    let configured = 0;

    // Récupérer tous les types d'objectifs pour avoir leurs IDs
    const typesRes = await client.query('SELECT id, code FROM objective_types');
    const typeMap = {};
    typesRes.rows.forEach(t => typeMap[t.code] = t.id);

    // Récupérer toutes les métriques
    const metricsRes = await client.query('SELECT id, code FROM objective_metrics WHERE is_active = TRUE');
    const metricMap = {}; // code -> id
    metricsRes.rows.forEach(m => metricMap[m.code] = m.id);

    // Nettoyer sources existantes ? (Optionnel, ici on fait du ON CONFLICT ou insert simple)
    // Pour être propre on truncate avant de réinsérer comme dans le script original
    await client.query('TRUNCATE TABLE objective_metric_sources CASCADE');

    for (const config of configurations) {
        const metricId = metricMap[config.metric];
        if (!metricId) continue;

        for (const sourceType of config.sources) {
            // Check mapping ou direct
            const realCode = typeMapping[sourceType] || sourceType;
            const typeId = typeMap[realCode];

            if (!typeId) {
                // console.warn(`      ⚠️ Type obj introuvable: ${sourceType} -> ${realCode}`);
                continue;
            }

            await client.query(`
                INSERT INTO objective_metric_sources (
                    metric_id, objective_type_id, weight
                ) VALUES ($1, $2, 1.0)
            `, [metricId, typeId]);

            configured++;
        }
    }

    console.log(`   ✓ ${configured} sources configurées.\n`);
}
// ===============================================
// 🏦 ÉTABLISSEMENTS FINANCIERS
// ===============================================
async function insertFinancialInstitutions(client) {
    console.log('🏦 Insertion des Établissements Financiers...');

    const banks = [
        { code: 'AFB', name: 'Afriland First Bank', type: 'BANK', country: 'CMR', swift_code: 'AFRICMCA' },
        { code: 'SGC', name: 'Société Générale Cameroun', type: 'BANK', country: 'CMR', swift_code: 'SOGECMCA' },
        { code: 'BICEC', name: 'Banque Internationale du Cameroun pour l\'Epargne et le Crédit', type: 'BANK', country: 'CMR', swift_code: 'BICECCMA' },
        { code: 'UBA', name: 'United Bank for Africa', type: 'BANK', country: 'CMR', swift_code: 'UBACCMXXX' },
        { code: 'ECO', name: 'Ecobank Cameroun', type: 'BANK', country: 'CMR', swift_code: 'ECOBCMCA' },
        { code: 'BGFI', name: 'BGFI Bank', type: 'BANK', country: 'CMR', swift_code: 'BGFICMCA' },
        { code: 'SCB', name: 'SCB Cameroun', type: 'BANK', country: 'CMR', swift_code: 'SCBCMCA' }
    ];

    let created = 0, updated = 0;

    for (const bank of banks) {
        // Tenter une mise à jour par code; si aucune ligne affectée, insérer
        const updateRes = await client.query(`
            UPDATE financial_institutions 
            SET name = $1,
                type = $2,
                country = $3,
                swift_code = $4,
                is_active = true,
                updated_at = CURRENT_TIMESTAMP
            WHERE code = $5
        `, [bank.name, bank.type, bank.country, bank.swift_code, bank.code]);

        if (updateRes.rowCount && updateRes.rowCount > 0) {
            updated++;
        } else {
            await client.query(`
                INSERT INTO financial_institutions (code, name, type, country, swift_code, is_active)
                VALUES ($1, $2, $3, $4, $5, true)
            `, [bank.code, bank.name, bank.type, bank.country, bank.swift_code]);
            created++;
        }
    }

    console.log(`   ✓ ${created} créés, ${updated} mis à jour (Total: ${banks.length})\n`);
}
