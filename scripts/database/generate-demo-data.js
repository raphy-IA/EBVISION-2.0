/**
 * Script de génération de données de démo pour EB-Vision 2.0
 * 
 * Ce script crée un jeu de données complet et cohérent pour démontrer
 * toutes les fonctionnalités de l'application en mode démo.
 * 
 * ⚠️  PROTECTION DES ÉLÉMENTS STRUCTURELS:
 * - Les rôles existants ne seront JAMAIS modifiés ou supprimés
 * - Les utilisateurs existants (surtout super admin) ne seront JAMAIS modifiés
 * - Les permissions, business units, divisions, grades, postes existants ne seront JAMAIS supprimés
 * 
 * Usage: node scripts/database/generate-demo-data.js [--clean]
 * 
 * Options:
 *   --clean : Nettoie les données de démo existantes avant de créer les nouvelles données de démo
 */

require('dotenv').config();
const { pool } = require('../../src/utils/database');
const bcrypt = require('bcryptjs');

// Configuration
const DEMO_PASSWORD = 'Demo123!';
const DEMO_PREFIX = 'demo';

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

const GRADES = [
  { nom: 'Stagiaire', code: 'STAG', niveau: 1, taux_min: 25, taux_max: 35 },
  { nom: 'Junior', code: 'JUN', niveau: 2, taux_min: 35, taux_max: 50 },
  { nom: 'Confirmé', code: 'CONF', niveau: 3, taux_min: 50, taux_max: 75 },
  { nom: 'Senior', code: 'SEN', niveau: 4, taux_min: 75, taux_max: 100 },
  { nom: 'Manager', code: 'MGR', niveau: 5, taux_min: 100, taux_max: 130 },
  { nom: 'Associé', code: 'ASSOC', niveau: 6, taux_min: 130, taux_max: 180 }
];

const POSTES = [
  { nom: 'Auditeur', code: 'AUD', description: 'Auditeur comptable et financier' },
  { nom: 'Consultant', code: 'CONS', description: 'Consultant en management' },
  { nom: 'Avocat', code: 'AVOC', description: 'Avocat en droit des affaires' },
  { nom: 'Expert-comptable', code: 'EXP-COMP', description: 'Expert-comptable' },
  { nom: 'Conseiller fiscal', code: 'CONS-FISC', description: 'Conseiller en fiscalité' },
  { nom: 'Comptable', code: 'COMP', description: 'Comptable' },
  { nom: 'Responsable RH', code: 'RH', description: 'Responsable ressources humaines' },
  { nom: 'Directeur', code: 'DIR', description: 'Directeur de division' }
];

const COLLABORATEURS = [
  { nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@ewm-demo.com', grade: 4, poste: 0, bu: 0, division: 0, roles: ['SENIOR'] },
  { nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@ewm-demo.com', grade: 5, poste: 1, bu: 0, division: 1, roles: ['MANAGER'] },
  { nom: 'Bernard', prenom: 'Pierre', email: 'pierre.bernard@ewm-demo.com', grade: 6, poste: 3, bu: 1, division: 3, roles: ['ASSOCIE'] },
  { nom: 'Dubois', prenom: 'Marie', email: 'marie.dubois@ewm-demo.com', grade: 3, poste: 2, bu: 1, division: 2, roles: ['CONSULTANT'] },
  { nom: 'Lefebvre', prenom: 'Thomas', email: 'thomas.lefebvre@ewm-demo.com', grade: 2, poste: 0, bu: 0, division: 0, roles: ['CONSULTANT'] },
  { nom: 'Moreau', prenom: 'Julie', email: 'julie.moreau@ewm-demo.com', grade: 4, poste: 4, bu: 1, division: 3, roles: ['SENIOR'] },
  { nom: 'Petit', prenom: 'Lucas', email: 'lucas.petit@ewm-demo.com', grade: 3, poste: 5, bu: 2, division: 5, roles: ['CONSULTANT'] },
  { nom: 'Robert', prenom: 'Emma', email: 'emma.robert@ewm-demo.com', grade: 1, poste: 0, bu: 0, division: 0, roles: ['CONSULTANT'] },
  { nom: 'Richard', prenom: 'Antoine', email: 'antoine.richard@ewm-demo.com', grade: 5, poste: 7, bu: 2, division: 4, roles: ['MANAGER'] },
  { nom: 'Durand', prenom: 'Camille', email: 'camille.durand@ewm-demo.com', grade: 4, poste: 1, bu: 0, division: 1, roles: ['SENIOR'] },
  { nom: 'Leroy', prenom: 'Alexandre', email: 'alexandre.leroy@ewm-demo.com', grade: 3, poste: 2, bu: 1, division: 2, roles: ['CONSULTANT'] },
  { nom: 'Simon', prenom: 'Léa', email: 'lea.simon@ewm-demo.com', grade: 2, poste: 6, bu: 2, division: 5, roles: ['CONSULTANT'] }
];

const CLIENTS = [
  { nom: 'TechCorp Solutions', sigle: 'TCS', statut: 'CLIENT', secteur: 'Technologie', taille: 'GRANDE', ville: 'Paris' },
  { nom: 'Industries Moderne SA', sigle: 'IMS', statut: 'CLIENT_FIDELE', secteur: 'Industrie', taille: 'GRANDE', ville: 'Lyon' },
  { nom: 'Services Financiers Pro', sigle: 'SFP', statut: 'CLIENT', secteur: 'Finance', taille: 'MOYENNE', ville: 'Paris' },
  { nom: 'Consulting Experts', sigle: 'CE', statut: 'PROSPECT', secteur: 'Conseil', taille: 'MOYENNE', ville: 'Marseille' },
  { nom: 'Groupe Immobilier', sigle: 'GI', statut: 'CLIENT', secteur: 'Immobilier', taille: 'GRANDE', ville: 'Lille' },
  { nom: 'Digital Services', sigle: 'DS', statut: 'PROSPECT', secteur: 'Technologie', taille: 'PETITE', ville: 'Toulouse' },
  { nom: 'Manufacturing Plus', sigle: 'MP', statut: 'CLIENT', secteur: 'Industrie', taille: 'MOYENNE', ville: 'Nantes' },
  { nom: 'Retail Corporation', sigle: 'RC', statut: 'CLIENT_FIDELE', secteur: 'Distribution', taille: 'GRANDE', ville: 'Paris' },
  { nom: 'Health Care Group', sigle: 'HCG', statut: 'CLIENT', secteur: 'Santé', taille: 'GRANDE', ville: 'Strasbourg' },
  { nom: 'Education First', sigle: 'EF', statut: 'PROSPECT', secteur: 'Éducation', taille: 'MOYENNE', ville: 'Bordeaux' },
  { nom: 'Transport Express', sigle: 'TE', statut: 'CLIENT', secteur: 'Transport', taille: 'MOYENNE', ville: 'Lyon' },
  { nom: 'Energy Solutions', sigle: 'ES', statut: 'CLIENT', secteur: 'Énergie', taille: 'GRANDE', ville: 'Paris' },
  { nom: 'Food & Beverage Co', sigle: 'FBC', statut: 'CLIENT_FIDELE', secteur: 'Agroalimentaire', taille: 'GRANDE', ville: 'Lille' },
  { nom: 'Media Group', sigle: 'MG', statut: 'PROSPECT', secteur: 'Média', taille: 'MOYENNE', ville: 'Paris' },
  { nom: 'Construction Plus', sigle: 'CP', statut: 'CLIENT', secteur: 'BTP', taille: 'MOYENNE', ville: 'Marseille' },
  { nom: 'Pharma Innovation', sigle: 'PI', statut: 'CLIENT', secteur: 'Pharmaceutique', taille: 'GRANDE', ville: 'Paris' },
  { nom: 'Telecom Services', sigle: 'TS', statut: 'PROSPECT', secteur: 'Télécommunications', taille: 'GRANDE', ville: 'Paris' },
  { nom: 'Banking Partners', sigle: 'BP', statut: 'CLIENT_FIDELE', secteur: 'Banque', taille: 'GRANDE', ville: 'Paris' }
];

const SECTEURS_ACTIVITE = [
  { nom: 'Technologie', code: 'TECH', couleur: '#3498db' },
  { nom: 'Industrie', code: 'IND', couleur: '#e74c3c' },
  { nom: 'Finance', code: 'FIN', couleur: '#2ecc71' },
  { nom: 'Conseil', code: 'CONS', couleur: '#f39c12' },
  { nom: 'Immobilier', code: 'IMMO', couleur: '#9b59b6' },
  { nom: 'Distribution', code: 'DIST', couleur: '#1abc9c' },
  { nom: 'Santé', code: 'SANTE', couleur: '#e67e22' },
  { nom: 'Éducation', code: 'EDUC', couleur: '#34495e' },
  { nom: 'Transport', code: 'TRANS', couleur: '#16a085' },
  { nom: 'Énergie', code: 'ENERG', couleur: '#d35400' },
  { nom: 'Agroalimentaire', code: 'AGRO', couleur: '#27ae60' },
  { nom: 'Média', code: 'MEDIA', couleur: '#8e44ad' },
  { nom: 'BTP', code: 'BTP', couleur: '#c0392b' },
  { nom: 'Pharmaceutique', code: 'PHARMA', couleur: '#2980b9' },
  { nom: 'Télécommunications', code: 'TELECOM', couleur: '#7f8c8d' },
  { nom: 'Banque', code: 'BANQUE', couleur: '#f1c40f' }
];

const PAYS = [
  { nom: 'France', code_pays: 'FR' },
  { nom: 'Belgique', code_pays: 'BE' },
  { nom: 'Suisse', code_pays: 'CH' },
  { nom: 'Luxembourg', code_pays: 'LU' }
];

const OPPORTUNITY_TYPES = [
  { name: 'Audit Comptable', description: 'Mission d\'audit comptable et financier', code: 'AUDIT-COMP' },
  { name: 'Conseil en Management', description: 'Mission de conseil en management', code: 'CONSEIL-MGT' },
  { name: 'Expertise Juridique', description: 'Mission d\'expertise juridique', code: 'EXP-JURID' },
  { name: 'Conseil Fiscal', description: 'Mission de conseil fiscal', code: 'CONS-FISC' },
  { name: 'Formation', description: 'Mission de formation', code: 'FORM' },
  { name: 'Accompagnement', description: 'Mission d\'accompagnement', code: 'ACCOMP' }
];

// Statistiques
let stats = {
  businessUnits: 0,
  divisions: 0,
  grades: 0,
  postes: 0,
  collaborateurs: 0,
  users: 0,
  clients: 0,
  contacts: 0,
  missions: 0,
  opportunities: 0,
  timeSheets: 0,
  timeEntries: 0
};

// Fonction utilitaire pour générer des dates
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomDateInRange(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  return new Date(d.setDate(diff));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Fonction pour vérifier les données existantes
async function checkExistingData() {
  console.log('\n🔍 Vérification des données existantes...\n');
  
  const checks = [
    { table: 'business_units', name: 'Business Units' },
    { table: 'collaborateurs', name: 'Collaborateurs' },
    { table: 'clients', name: 'Clients' },
    { table: 'missions', name: 'Missions' }
  ];
  
  const results = {};
  
  for (const check of checks) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${check.table}`);
      const count = parseInt(result.rows[0].count);
      results[check.table] = count;
      console.log(`   ${check.name}: ${count} enregistrement(s)`);
    } catch (error) {
      console.log(`   ${check.name}: Table non trouvée ou erreur`);
      results[check.table] = 0;
    }
  }
  
  const total = Object.values(results).reduce((sum, val) => sum + val, 0);
  return { results, total };
}

// Fonction pour nettoyer les données (optionnel)
async function cleanDemoData() {
  console.log('\n🧹 Nettoyage des données de démo...\n');
  console.log('⚠️  PROTECTION DES ÉLÉMENTS STRUCTURELS:');
  console.log('    - Les rôles ne seront JAMAIS supprimés');
  console.log('    - Les utilisateurs existants (surtout super admin) ne seront JAMAIS supprimés');
  console.log('    - Seules les données de démo seront supprimées\n');
  
  // Supprimer dans l'ordre inverse des dépendances
  // IMPORTANT: Ne jamais supprimer les tables structurelles (roles, users, permissions, etc.)
  const tables = [
    'time_entries',
    'time_sheets',
    'equipes_mission',
    'opportunities',
    'missions',
    'contacts',
    'clients'
  ];
  
  for (const table of tables) {
    try {
      // Protection supplémentaire: Ne supprimer que les données créées par le script de démo
      // On peut identifier les données de démo par leur email ou leur pattern
      let deleteQuery;
      if (table === 'clients') {
        // Supprimer seulement les clients de démo (identifiés par leur email ou nom contenant les noms de démo)
        const demoClientNames = CLIENTS.map(c => c.nom);
        const demoClientNamesSql = demoClientNames.map(n => `'${n.replace(/'/g, "''")}'`).join(',');
        deleteQuery = `DELETE FROM ${table} WHERE nom IN (${demoClientNamesSql}) OR email LIKE '%@ewm-demo.com' OR code_client LIKE 'DEMO-%'`;
      } else if (table === 'contacts') {
        // Supprimer seulement les contacts liés aux clients de démo
        const demoClientNames = CLIENTS.map(c => c.nom);
        const demoClientNamesSql = demoClientNames.map(n => `'${n.replace(/'/g, "''")}'`).join(',');
        deleteQuery = `DELETE FROM ${table} WHERE client_id IN (SELECT id FROM clients WHERE nom IN (${demoClientNamesSql}) OR email LIKE '%@ewm-demo.com' OR code_client LIKE 'DEMO-%')`;
      } else if (table === 'missions') {
        // Supprimer seulement les missions liées aux clients de démo
        const demoClientNames = CLIENTS.map(c => c.nom);
        const demoClientNamesSql = demoClientNames.map(n => `'${n.replace(/'/g, "''")}'`).join(',');
        deleteQuery = `DELETE FROM ${table} WHERE client_id IN (SELECT id FROM clients WHERE nom IN (${demoClientNamesSql}) OR email LIKE '%@ewm-demo.com' OR code_client LIKE 'DEMO-%')`;
      } else if (table === 'opportunities') {
        // Supprimer seulement les opportunités liées aux clients de démo
        const demoClientNames = CLIENTS.map(c => c.nom);
        const demoClientNamesSql = demoClientNames.map(n => `'${n.replace(/'/g, "''")}'`).join(',');
        deleteQuery = `DELETE FROM ${table} WHERE client_id IN (SELECT id FROM clients WHERE nom IN (${demoClientNamesSql}) OR email LIKE '%@ewm-demo.com' OR code_client LIKE 'DEMO-%')`;
      } else if (table === 'time_sheets' || table === 'time_entries') {
        // Supprimer seulement les feuilles de temps des utilisateurs de démo
        deleteQuery = `DELETE FROM ${table} WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@ewm-demo.com')`;
      } else if (table === 'equipes_mission') {
        // Supprimer seulement les équipes de missions liées aux missions de démo
        const demoClientNames = CLIENTS.map(c => c.nom);
        const demoClientNamesSql = demoClientNames.map(n => `'${n.replace(/'/g, "''")}'`).join(',');
        deleteQuery = `DELETE FROM ${table} WHERE mission_id IN (SELECT id FROM missions WHERE client_id IN (SELECT id FROM clients WHERE nom IN (${demoClientNamesSql}) OR email LIKE '%@ewm-demo.com' OR code_client LIKE 'DEMO-%'))`;
      } else {
        // Pour les autres tables, utiliser la suppression conditionnelle
        deleteQuery = `DELETE FROM ${table} WHERE 1=1`;
      }
      
      const result = await pool.query(deleteQuery);
      console.log(`   ✓ ${table}: ${result.rowCount} ligne(s) supprimée(s)`);
    } catch (error) {
      if (!error.message.includes('violates foreign key')) {
        console.log(`   ⚠ ${table}: ${error.message}`);
      }
    }
  }
  
  // Protection explicite: Ne jamais toucher aux rôles, utilisateurs existants, permissions
  console.log('\n   🔒 Éléments protégés (non supprimés):');
  console.log('      - Rôles (roles)');
  console.log('      - Utilisateurs existants (users)');
  console.log('      - Permissions (permissions)');
  console.log('      - Business Units existantes (business_units)');
  console.log('      - Divisions existantes (divisions)');
  console.log('      - Grades existants (grades)');
  console.log('      - Postes existants (postes)');
  
  console.log('\n✅ Nettoyage terminé\n');
}

// Fonction principale
async function generateDemoData() {
  console.log('\n🎯 GÉNÉRATION DE DONNÉES DE DÉMO\n');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  
  try {
    // Vérifier les données existantes
    const { results, total } = await checkExistingData();
    
    // Demander confirmation si des données existent
    const args = process.argv.slice(2);
    const shouldClean = args.includes('--clean');
    
    if (total > 0 && !shouldClean) {
      console.log('\n⚠️  Des données existent déjà dans la base de données.');
      console.log('   Utilisez --clean pour nettoyer avant de générer les données de démo.');
      console.log('   Ou continuez pour ajouter les données de démo aux données existantes.\n');
    } else if (shouldClean && total > 0) {
      await cleanDemoData();
    }
    
    // Commencer la génération
    console.log('\n🚀 Début de la génération des données de démo...\n');
    
    // 1. Créer les Business Units
    console.log('1️⃣  Création des Business Units...');
    const businessUnitIds = [];
    for (const bu of BUSINESS_UNITS) {
      // Vérifier si la BU existe déjà
      const existing = await pool.query(
        'SELECT id FROM business_units WHERE nom = $1 OR code = $2',
        [bu.nom, bu.code]
      );
      
      if (existing.rows.length > 0) {
        businessUnitIds.push(existing.rows[0].id);
        console.log(`   ℹ ${bu.nom} (${bu.code}) existe déjà`);
        continue;
      }
      
      const result = await pool.query(
        `INSERT INTO business_units (nom, code, description, statut)
         VALUES ($1, $2, $3, 'ACTIF')
         RETURNING id`,
        [bu.nom, bu.code, bu.description]
      );
      if (result.rows.length > 0) {
        businessUnitIds.push(result.rows[0].id);
        stats.businessUnits++;
        console.log(`   ✓ ${bu.nom} (${bu.code})`);
      }
    }
    
    // 2. Créer les Divisions
    console.log('\n2️⃣  Création des Divisions...');
    const divisionIds = [];
    for (const div of DIVISIONS) {
      const buId = businessUnitIds[div.businessUnitIndex];
      // Vérifier si la division existe déjà
      const existingDiv = await pool.query(
        'SELECT id FROM divisions WHERE code = $1',
        [div.code]
      );
      
      if (existingDiv.rows.length > 0) {
        divisionIds.push(existingDiv.rows[0].id);
        console.log(`   ℹ ${div.nom} (${div.code}) existe déjà`);
        continue;
      }
      
      const result = await pool.query(
        `INSERT INTO divisions (nom, code, business_unit_id, statut)
         VALUES ($1, $2, $3, 'ACTIF')
         RETURNING id`,
        [div.nom, div.code, buId]
      );
      if (result.rows.length > 0) {
        divisionIds.push(result.rows[0].id);
        stats.divisions++;
        console.log(`   ✓ ${div.nom} (${div.code})`);
      }
    }
    
    // 3. Créer les Grades
    console.log('\n3️⃣  Création des Grades...');
    const gradeIds = [];
    for (const grade of GRADES) {
      // Vérifier si le grade existe déjà
      const existingGrade = await pool.query(
        'SELECT id FROM grades WHERE code = $1',
        [grade.code]
      );
      
      if (existingGrade.rows.length > 0) {
        gradeIds.push(existingGrade.rows[0].id);
        console.log(`   ℹ ${grade.nom} (${grade.code}) existe déjà`);
        continue;
      }
      
      const result = await pool.query(
        `INSERT INTO grades (nom, code, niveau)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [grade.nom, grade.code, grade.niveau]
      );
      if (result.rows.length > 0) {
        gradeIds.push(result.rows[0].id);
        stats.grades++;
        console.log(`   ✓ ${grade.nom} (niveau ${grade.niveau})`);
      }
    }
    
    // 4. Créer les Postes
    console.log('\n4️⃣  Création des Postes...');
    const posteIds = [];
    for (const poste of POSTES) {
      // Vérifier si le poste existe déjà
      const existingPoste = await pool.query(
        'SELECT id FROM postes WHERE code = $1',
        [poste.code]
      );
      
      if (existingPoste.rows.length > 0) {
        posteIds.push(existingPoste.rows[0].id);
        console.log(`   ℹ ${poste.nom} (${poste.code}) existe déjà`);
        continue;
      }
      
      const result = await pool.query(
        `INSERT INTO postes (nom, code, description)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [poste.nom, poste.code, poste.description]
      );
      if (result.rows.length > 0) {
        posteIds.push(result.rows[0].id);
        stats.postes++;
        console.log(`   ✓ ${poste.nom} (${poste.code})`);
      }
    }
    
    // 5. Créer les Types de Collaborateurs
    console.log('\n5️⃣  Création des Types de Collaborateurs...');
    const typeCollaborateurIds = [];
    const types = [
      { nom: 'Interne', code: 'INTERNE' },
      { nom: 'Externe', code: 'EXTERNE' },
      { nom: 'Consultant', code: 'CONSULT' }
    ];
    
    // Vérifier si la table existe
    try {
      const tableCheck = await pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'types_collaborateurs')"
      );
      
      if (tableCheck.rows[0].exists) {
        for (const type of types) {
          // Vérifier si le type existe déjà
          const existingType = await pool.query(
            'SELECT id FROM types_collaborateurs WHERE code = $1',
            [type.code]
          );
          
          if (existingType.rows.length > 0) {
            typeCollaborateurIds.push(existingType.rows[0].id);
            console.log(`   ℹ ${type.nom} existe déjà`);
            continue;
          }
          
          const result = await pool.query(
            `INSERT INTO types_collaborateurs (nom, code)
             VALUES ($1, $2)
             RETURNING id`,
            [type.nom, type.code]
          );
          if (result.rows.length > 0) {
            typeCollaborateurIds.push(result.rows[0].id);
            console.log(`   ✓ ${type.nom}`);
          }
        }
      } else {
        // Si la table n'existe pas, utiliser un ID par défaut
        console.log('   ℹ Table types_collaborateurs n\'existe pas, utilisation d\'un ID par défaut');
        typeCollaborateurIds.push(null); // Utiliser null ou un ID par défaut
      }
    } catch (error) {
      console.log(`   ℹ Erreur lors de la vérification des types: ${error.message}`);
      typeCollaborateurIds.push(null);
    }
    
    // 6. Créer les Pays
    console.log('\n6️⃣  Création des Pays...');
    const paysIds = [];
    for (const pays of PAYS) {
      // Vérifier si le pays existe déjà
      const existingPays = await pool.query(
        'SELECT id FROM pays WHERE code_pays = $1',
        [pays.code_pays]
      );
      
      if (existingPays.rows.length > 0) {
        paysIds.push(existingPays.rows[0].id);
        console.log(`   ℹ ${pays.nom} existe déjà`);
        continue;
      }
      
      const result = await pool.query(
        `INSERT INTO pays (nom, code_pays, actif)
         VALUES ($1, $2, true)
         RETURNING id`,
        [pays.nom, pays.code_pays]
      );
      if (result.rows.length > 0) {
        paysIds.push(result.rows[0].id);
        console.log(`   ✓ ${pays.nom}`);
      }
    }
    
    // 7. Créer les Secteurs d'Activité
    console.log('\n7️⃣  Création des Secteurs d\'Activité...');
    const secteurIds = [];
    for (const secteur of SECTEURS_ACTIVITE) {
      const result = await pool.query(
        `INSERT INTO secteurs_activite (nom, code, couleur)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO NOTHING
         RETURNING id`,
        [secteur.nom, secteur.code, secteur.couleur]
      );
      if (result.rows.length > 0) {
        secteurIds.push(result.rows[0].id);
        console.log(`   ✓ ${secteur.nom}`);
      }
    }
    
    // 8. Créer les Types d'Opportunités
    console.log('\n8️⃣  Création des Types d\'Opportunités...');
    const opportunityTypeIds = [];
    for (const type of OPPORTUNITY_TYPES) {
      // Vérifier si le type existe déjà
      const existingType = await pool.query(
        'SELECT id FROM opportunity_types WHERE code = $1 OR name = $2',
        [type.code, type.name]
      );
      
      if (existingType.rows.length > 0) {
        opportunityTypeIds.push(existingType.rows[0].id);
        console.log(`   ℹ ${type.name} existe déjà`);
        continue;
      }
      
      const result = await pool.query(
        `INSERT INTO opportunity_types (name, description, code)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [type.name, type.description, type.code]
      );
      if (result.rows.length > 0) {
        opportunityTypeIds.push(result.rows[0].id);
        console.log(`   ✓ ${type.name}`);
      }
    }
    
    // 9. Récupérer les rôles existants (NE JAMAIS MODIFIER)
    console.log('\n9️⃣  Récupération des Rôles...');
    console.log('   ⚠️  Protection: Les rôles existants ne seront jamais modifiés');
    const rolesResult = await pool.query('SELECT id, name, is_system_role FROM roles ORDER BY name');
    const roles = {};
    const systemRoles = new Set();
    rolesResult.rows.forEach(row => {
      roles[row.name] = row.id;
      if (row.is_system_role) {
        systemRoles.add(row.name);
      }
    });
    console.log(`   ✓ ${Object.keys(roles).length} rôle(s) trouvé(s)`);
    if (systemRoles.size > 0) {
      console.log(`   🔒 ${systemRoles.size} rôle(s) système protégé(s): ${Array.from(systemRoles).join(', ')}`);
    }
    
    // 10. Créer les Collaborateurs et Utilisateurs
    console.log('\n🔟 Création des Collaborateurs et Utilisateurs...');
    console.log('   ⚠️  Protection: Les utilisateurs existants (surtout super admin) ne seront jamais modifiés');
    
    // Identifier les utilisateurs protégés (super admin, admin, etc.)
    const protectedUsersResult = await pool.query(`
      SELECT DISTINCT u.id, u.email, u.login, u.role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.role IN ('SUPER_ADMIN', 'ADMIN')
         OR r.name IN ('SUPER_ADMIN', 'ADMIN')
         OR u.email IN ('admin@system.local', 'admin@trs.com', 'admin@ewm.com')
         OR u.login = 'admin'
    `);
    const protectedUserIds = new Set(protectedUsersResult.rows.map(u => u.id));
    const protectedEmails = new Set(protectedUsersResult.rows.map(u => u.email.toLowerCase()));
    const protectedLogins = new Set(protectedUsersResult.rows.map(u => u.login?.toLowerCase()).filter(Boolean));
    
    if (protectedUserIds.size > 0) {
      console.log(`   🔒 ${protectedUserIds.size} utilisateur(s) protégé(s) identifié(s)`);
    }
    
    const collaborateurIds = [];
    const userIds = [];
    
    for (const collab of COLLABORATEURS) {
      // Protection: Ne jamais créer/modifier un utilisateur avec un email protégé
      if (protectedEmails.has(collab.email.toLowerCase())) {
        console.log(`   ⚠️  ${collab.prenom} ${collab.nom} (${collab.email}) - SKIP (utilisateur protégé)`);
        continue;
      }
      
      // Créer le collaborateur
      const initiales = `${collab.prenom[0]}${collab.nom[0]}`.toUpperCase();
      const dateEmbauche = randomDateInRange(Math.floor(Math.random() * 1000) + 365);
      
      // Vérifier si le collaborateur existe déjà
      const existingCollab = await pool.query(
        'SELECT id FROM collaborateurs WHERE email = $1',
        [collab.email]
      );
      
      let collabId;
      if (existingCollab.rows.length > 0) {
        collabId = existingCollab.rows[0].id;
        console.log(`   ℹ ${collab.prenom} ${collab.nom} existe déjà`);
      } else {
        const collabResult = await pool.query(
          `INSERT INTO collaborateurs (
            nom, prenom, initiales, email, telephone, 
            business_unit_id, division_id, grade_actuel_id, poste_actuel_id, type_collaborateur_id,
            date_embauche, statut
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIF')
          RETURNING id`,
        [
          collab.nom, collab.prenom, initiales, collab.email,
          `+33 ${Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 100000000).toString().padStart(9, '0')}`,
          businessUnitIds[collab.bu], divisionIds[collab.division],
          gradeIds[collab.grade - 1], posteIds[collab.poste],
          typeCollaborateurIds.length > 0 ? typeCollaborateurIds[0] : null, // Interne par défaut
          formatDate(dateEmbauche)
        ]
        );
        collabId = collabResult.rows[0].id;
      }
      
      if (collabId) {
        collaborateurIds.push(collabId);
        stats.collaborateurs++;
        
        // Créer l'utilisateur
        const login = `${collab.prenom.toLowerCase()}.${collab.nom.toLowerCase()}`;
        
        // Protection: Ne jamais utiliser un login protégé
        if (protectedLogins.has(login.toLowerCase())) {
          console.log(`   ⚠️  ${collab.prenom} ${collab.nom} - SKIP (login protégé: ${login})`);
          continue;
        }
        
        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
        
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await pool.query(
          'SELECT id, email, role FROM users WHERE email = $1 OR login = $2',
          [collab.email, login]
        );
        
        let userId;
        if (existingUser.rows.length > 0) {
          const existing = existingUser.rows[0];
          // Protection: Ne jamais modifier un utilisateur protégé
          if (protectedUserIds.has(existing.id)) {
            console.log(`   ⚠️  ${collab.prenom} ${collab.nom} - SKIP (utilisateur existant protégé)`);
            continue;
          }
          userId = existing.id;
          console.log(`   ℹ Utilisateur ${collab.email} existe déjà (ID: ${userId})`);
        } else {
          // Utiliser le premier rôle comme valeur legacy pour la colonne role (NOT NULL)
          // Les rôles multiples seront gérés via user_roles
          const legacyRole = collab.roles && collab.roles.length > 0 
            ? collab.roles[0] 
            : 'COLLABORATEUR';
          
          const userResult = await pool.query(
            `INSERT INTO users (nom, prenom, email, password_hash, login, collaborateur_id, statut, role)
             VALUES ($1, $2, $3, $4, $5, $6, 'ACTIF', $7)
             RETURNING id`,
          [collab.nom, collab.prenom, collab.email, passwordHash, login, collabId, legacyRole]
          );
          userId = userResult.rows[0].id;
        }
        
        if (userId) {
          // Protection: Double vérification avant d'assigner des rôles
          if (protectedUserIds.has(userId)) {
            console.log(`   ⚠️  ${collab.prenom} ${collab.nom} - SKIP (utilisateur protégé détecté)`);
            continue;
          }
          
          userIds.push(userId);
          stats.users++;
          
          // Assigner les rôles (seulement les rôles non-système)
          for (const roleName of collab.roles) {
            if (roles[roleName] && !systemRoles.has(roleName)) {
              await pool.query(
                `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
                 ON CONFLICT (user_id, role_id) DO NOTHING`,
                [userId, roles[roleName]]
              );
            } else if (systemRoles.has(roleName)) {
              console.log(`   ⚠️  Rôle système ${roleName} ignoré pour ${collab.prenom} ${collab.nom}`);
            }
          }
          
          console.log(`   ✓ ${collab.prenom} ${collab.nom} (${collab.email}) - ${collab.roles.filter(r => !systemRoles.has(r)).join(', ')}`);
        }
      }
    }
    
    // 11. Créer les Clients
    console.log('\n1️⃣1️⃣ Création des Clients...');
    const clientIds = [];
    
    for (const client of CLIENTS) {
      const secteur = SECTEURS_ACTIVITE.find(s => s.nom === client.secteur);
      const secteurId = secteur ? secteurIds[SECTEURS_ACTIVITE.indexOf(secteur)] : null;
      const paysId = paysIds[0]; // France par défaut
      const collaborateurId = collaborateurIds[Math.floor(Math.random() * collaborateurIds.length)];
      
      // Vérifier si le client existe déjà
      const existingClient = await pool.query(
        'SELECT id FROM clients WHERE nom = $1',
        [client.nom]
      );
      
      if (existingClient.rows.length > 0) {
        clientIds.push(existingClient.rows[0].id);
        console.log(`   ℹ ${client.nom} existe déjà`);
        continue;
      }
      
      const clientResult = await pool.query(
        `INSERT INTO clients (
          nom, sigle, email, telephone, adresse, ville, code_postal, pays,
          secteur_activite, taille_entreprise, statut, collaborateur_id,
          pays_id, secteur_activite_id, forme_juridique, effectif, chiffre_affaires
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id`,
        [
          client.nom, client.sigle,
          `contact@${client.nom.toLowerCase().replace(/\s/g, '')}.com`,
          `+33 ${Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 100000000).toString().padStart(9, '0')}`,
          `${Math.floor(Math.random() * 100)} Rue de la Démo`, client.ville,
          String(Math.floor(Math.random() * 100000)).padStart(5, '0'),
          'France', client.secteur, client.taille, client.statut, collaborateurId,
          paysId, secteurId, 'SARL',
          Math.floor(Math.random() * 500) + 10,
          Math.floor(Math.random() * 10000000) + 100000
        ]
      );
      
      if (clientResult.rows.length > 0) {
        clientIds.push(clientResult.rows[0].id);
        stats.clients++;
        console.log(`   ✓ ${client.nom} (${client.statut})`);
      }
    }
    
    // 12. Créer les Contacts
    console.log('\n1️⃣2️⃣ Création des Contacts...');
    const contactRoles = ['Directeur Général', 'Directeur Financier', 'Responsable Comptable', 'Responsable Juridique', 'Assistante'];
    
    for (const clientId of clientIds) {
      const numContacts = Math.floor(Math.random() * 3) + 2; // 2-4 contacts par client
      for (let i = 0; i < numContacts; i++) {
        const prenom = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Thomas', 'Emma'][Math.floor(Math.random() * 6)];
        const nom = ['Dupont', 'Martin', 'Bernard', 'Dubois', 'Lefebvre'][Math.floor(Math.random() * 5)];
        const email = `${prenom.toLowerCase()}.${nom.toLowerCase()}.${clientId.toString().substring(0, 8)}@client-demo.com`;
        
        try {
          await pool.query(
            `INSERT INTO contacts (
              client_id, prenom, nom, email, telephone, fonction
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              clientId, prenom, nom, email,
              `+33 ${Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 100000000).toString().padStart(9, '0')}`,
              contactRoles[Math.floor(Math.random() * contactRoles.length)]
            ]
          );
          stats.contacts++;
        } catch (error) {
          // Ignorer les erreurs de contraintes uniques
          if (!error.message.includes('unique') && !error.message.includes('duplicate')) {
            console.log(`   ⚠ Erreur contact pour ${prenom} ${nom}: ${error.message}`);
          }
        }
      }
    }
    console.log(`   ✓ ${stats.contacts} contact(s) créé(s)`);
    
    // 13. Créer les Années Fiscales
    console.log('\n1️⃣3️⃣ Création des Années Fiscales...');
    // Vérifier si les années fiscales existent déjà
    const existingFY2024 = await pool.query(
      'SELECT id FROM fiscal_years WHERE annee = 2024'
    );
    const existingFY2025 = await pool.query(
      'SELECT id FROM fiscal_years WHERE annee = 2025'
    );
    
    const fiscalYearIds = [];
    
    if (existingFY2024.rows.length === 0) {
      const fy2024 = await pool.query(
        `INSERT INTO fiscal_years (annee, date_debut, date_fin, statut, libelle)
         VALUES (2024, '2024-01-01', '2024-12-31', 'EN_COURS', 'Année fiscale 2024')
         RETURNING id`
      );
      fiscalYearIds.push(fy2024.rows[0].id);
    } else {
      fiscalYearIds.push(existingFY2024.rows[0].id);
    }
    
    if (existingFY2025.rows.length === 0) {
      const fy2025 = await pool.query(
        `INSERT INTO fiscal_years (annee, date_debut, date_fin, statut, libelle)
         VALUES (2025, '2025-01-01', '2025-12-31', 'OUVERTE', 'Année fiscale 2025')
         RETURNING id`
      );
      fiscalYearIds.push(fy2025.rows[0].id);
    } else {
      fiscalYearIds.push(existingFY2025.rows[0].id);
    }
    console.log(`   ✓ ${fiscalYearIds.length} année(s) fiscale(s)`);
    
    // 14. Créer les Missions
    console.log('\n1️⃣4️⃣ Création des Missions...');
    const missionIds = [];
    const missionStatuts = ['EN_COURS', 'TERMINEE', 'EN_COURS', 'SUSPENDUE', 'PLANIFIEE'];
    const missionTypes = ['AUDIT', 'CONSEIL', 'JURIDIQUE', 'FISCAL', 'COMPTABILITE'];
    const priorities = ['BASSE', 'MOYENNE', 'HAUTE', 'URGENTE'];
    
    for (let i = 0; i < 15; i++) {
      const clientId = clientIds[Math.floor(Math.random() * clientIds.length)];
      const collaborateurId = collaborateurIds[Math.floor(Math.random() * collaborateurIds.length)];
      const statut = missionStatuts[Math.floor(Math.random() * missionStatuts.length)];
      const type = missionTypes[Math.floor(Math.random() * missionTypes.length)];
      const priorite = priorities[Math.floor(Math.random() * priorities.length)];
      
      const dateDebut = randomDateInRange(120);
      const dateFin = new Date(dateDebut);
      dateFin.setDate(dateFin.getDate() + Math.floor(Math.random() * 90) + 30);
      
      const budget = Math.floor(Math.random() * 50000) + 10000;
      
      const missionResult = await pool.query(
        `INSERT INTO missions (
          nom, description, client_id, collaborateur_id, statut, type_mission,
          date_debut, date_fin, budget_estime, priorite, fiscal_year_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          `Mission ${type} - ${CLIENTS.find(c => clientIds.indexOf(clientId) !== -1)?.nom || 'Client'}`,
          `Mission de ${type.toLowerCase()} pour le client`,
          clientId, collaborateurId, statut, type,
          formatDate(dateDebut), formatDate(dateFin), budget, priorite, fiscalYearIds[0]
        ]
      );
      
      if (missionResult.rows.length > 0) {
        const missionId = missionResult.rows[0].id;
        missionIds.push(missionId);
        stats.missions++;
        
        // Ajouter une équipe de mission (2-4 collaborateurs)
        const numTeamMembers = Math.floor(Math.random() * 3) + 2;
        const teamMembers = [...collaborateurIds].sort(() => 0.5 - Math.random()).slice(0, numTeamMembers);
        
        for (const memberId of teamMembers) {
          try {
            await pool.query(
              `INSERT INTO equipes_mission (mission_id, collaborateur_id, role, taux_horaire_mission, pourcentage_charge)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                missionId, memberId, 'Membre',
                Math.floor(Math.random() * 50) + 50,
                Math.floor(Math.random() * 50) + 25
              ]
            );
          } catch (error) {
            // Ignorer les erreurs de contraintes
            if (!error.message.includes('unique') && !error.message.includes('duplicate')) {
              // Ignorer silencieusement
            }
          }
        }
        
        console.log(`   ✓ Mission ${missionIds.length} créée`);
      }
    }
    
    // 15. Créer les Opportunités
    console.log('\n1️⃣5️⃣ Création des Opportunités...');
    const opportunityStatuts = ['NOUVELLE', 'EN_COURS', 'EN_COURS', 'GAGNEE', 'PERDUE'];
    
    for (let i = 0; i < 15; i++) {
      const clientId = clientIds[Math.floor(Math.random() * clientIds.length)];
      // collaborateur_id dans opportunities référence users(id), pas collaborateurs(id)
      const randomUserIndex = Math.floor(Math.random() * userIds.length);
      const userId = userIds[randomUserIndex];
      const businessUnitId = businessUnitIds[Math.floor(Math.random() * businessUnitIds.length)];
      const opportunityTypeId = opportunityTypeIds[Math.floor(Math.random() * opportunityTypeIds.length)];
      const statut = opportunityStatuts[Math.floor(Math.random() * opportunityStatuts.length)];
      const probabilite = statut === 'GAGNEE' ? 100 : statut === 'PERDUE' ? 0 : Math.floor(Math.random() * 60) + 20;
      const montant = Math.floor(Math.random() * 200000) + 20000;
      
      const dateFermeture = randomDateInRange(60);
      
      await pool.query(
        `INSERT INTO opportunities (
          nom, description, client_id, collaborateur_id, business_unit_id,
          opportunity_type_id, statut, probabilite, montant_estime, devise,
          date_fermeture_prevue
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          `Opportunité ${OPPORTUNITY_TYPES.find(t => opportunityTypeIds.indexOf(opportunityTypeId) !== -1)?.name || 'Conseil'}`,
          `Opportunité commerciale pour ${CLIENTS.find(c => clientIds.indexOf(clientId) !== -1)?.nom || 'client'}`,
          clientId, userId, businessUnitId, opportunityTypeId,
          statut, probabilite, montant, 'EUR', formatDate(dateFermeture)
        ]
      );
      stats.opportunities++;
      console.log(`   ✓ Opportunité ${stats.opportunities} créée`);
    }
    
    // 16. Créer les Feuilles de Temps
    console.log('\n1️⃣6️⃣ Création des Feuilles de Temps...');
    // Utiliser les statuts selon la migration 001
    const timeSheetStatuses = ['sauvegardé', 'soumis', 'validé', 'rejeté'];
    
    // Créer des feuilles de temps pour les 8 dernières semaines
    for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
      const weekStart = getWeekStart(new Date(Date.now() - weekOffset * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // Créer des feuilles pour 8-10 utilisateurs aléatoires
      const selectedUsers = [...userIds].sort(() => 0.5 - Math.random()).slice(0, Math.min(8, userIds.length));
      
      for (const userId of selectedUsers) {
        const status = timeSheetStatuses[Math.floor(Math.random() * timeSheetStatuses.length)];
        
        try {
          const timeSheetResult = await pool.query(
            `INSERT INTO time_sheets (user_id, week_start, week_end, statut)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, week_start) DO UPDATE SET statut = EXCLUDED.statut
             RETURNING id`,
            [userId, formatDate(weekStart), formatDate(weekEnd), status]
          );
          
          if (timeSheetResult.rows.length > 0) {
            const timeSheetId = timeSheetResult.rows[0].id;
            stats.timeSheets++;
            
            // Créer des entrées de temps (heures chargeables uniquement pour simplifier)
            // Selon la migration 001, les time_entries nécessitent time_sheet_id, user_id, date_saisie, heures, type_heures, statut
            const numEntries = Math.floor(Math.random() * 5) + 3; // 3-7 entrées par semaine
            
            for (let j = 0; j < numEntries; j++) {
              const isChargeable = Math.random() > 0.3; // 70% chargeables
              const missionId = isChargeable && missionIds.length > 0 
                ? missionIds[Math.floor(Math.random() * missionIds.length)]
                : null;
              
              const entryDate = new Date(weekStart);
              entryDate.setDate(entryDate.getDate() + Math.floor(Math.random() * 5));
              const heures = Math.random() * 6 + 2; // 2-8 heures
              
              try {
                // Utiliser la structure de la migration 001
                await pool.query(
                  `INSERT INTO time_entries (
                    time_sheet_id, user_id, date_saisie, heures, type_heures, statut, mission_id
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [
                    timeSheetId, userId, formatDate(entryDate),
                    Math.round(heures * 10) / 10,
                    isChargeable ? 'HC' : 'HNC',
                    status === 'validé' ? 'validé' : status === 'rejeté' ? 'rejeté' : status === 'soumis' ? 'soumis' : 'saisie',
                    missionId
                  ]
                );
                stats.timeEntries++;
              } catch (error) {
                // Ignorer les erreurs de contraintes
                if (!error.message.includes('unique') && !error.message.includes('duplicate') && !error.message.includes('violates foreign key')) {
                  // Ignorer silencieusement les erreurs de contraintes
                }
              }
            }
          }
        } catch (error) {
          // Ignorer les erreurs de contraintes pour les feuilles de temps
          if (!error.message.includes('unique') && !error.message.includes('duplicate')) {
            // Ignorer silencieusement
          }
        }
      }
    }
    console.log(`   ✓ ${stats.timeSheets} feuille(s) de temps créée(s) avec ${stats.timeEntries} entrées`);
    
    // Afficher le résumé
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ GÉNÉRATION TERMINÉE AVEC SUCCÈS !\n');
    console.log('📊 RÉSUMÉ DES DONNÉES CRÉÉES:');
    console.log('='.repeat(50));
    console.log(`   Business Units: ${stats.businessUnits}`);
    console.log(`   Divisions: ${stats.divisions}`);
    console.log(`   Grades: ${stats.grades}`);
    console.log(`   Postes: ${stats.postes}`);
    console.log(`   Collaborateurs: ${stats.collaborateurs}`);
    console.log(`   Utilisateurs: ${stats.users}`);
    console.log(`   Clients: ${stats.clients}`);
    console.log(`   Contacts: ${stats.contacts}`);
    console.log(`   Missions: ${stats.missions}`);
    console.log(`   Opportunités: ${stats.opportunities}`);
    console.log(`   Feuilles de temps: ${stats.timeSheets}`);
    console.log(`   Entrées de temps: ${stats.timeEntries}`);
    console.log('\n' + '='.repeat(50));
    console.log(`⏱️  Temps d'exécution: ${duration} secondes`);
    console.log('\n🔐 CONNEXION DÉMO:');
    console.log('='.repeat(50));
    console.log('   Email: jean.dupont@ewm-demo.com');
    console.log('   Mot de passe: Demo123!');
    console.log('   (Tous les utilisateurs utilisent le même mot de passe)\n');
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la génération:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécuter le script
if (require.main === module) {
  generateDemoData()
    .then(() => {
      console.log('🎉 Génération terminée avec succès !\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erreur:', error.message);
      process.exit(1);
    });
}

module.exports = { generateDemoData };
