const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour diagnostiquer les erreurs 400 lors de la création des historiques RH
async function debugRHEvolutionErrors() {
  console.log('🔍 Diagnostic des erreurs 400 - Historiques RH...\n');
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  };
  
  const pool = new Pool(dbConfig);
  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Connexion à la base de données réussie\n');
    
    // 1. Vérifier le collaborateur problématique
    console.log('👤 VÉRIFICATION DU COLLABORATEUR:');
    console.log('=================================');
    
    const collabQuery = `
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.business_unit_id,
        c.division_id,
        c.statut,
        c.created_at
      FROM collaborateurs c
      WHERE c.id = 'ea553ce8-63b0-4103-a616-259274946d39'
    `;
    
    const collabResult = await client.query(collabQuery);
    
    if (collabResult.rows.length === 0) {
      console.log('❌ Collaborateur non trouvé');
      return;
    }
    
    const collab = collabResult.rows[0];
    console.log(`   ID: ${collab.id}`);
    console.log(`   Nom: ${collab.prenom} ${collab.nom}`);
    console.log(`   Email: ${collab.email}`);
    console.log(`   Business Unit: ${collab.business_unit_id}`);
    console.log(`   Division: ${collab.division_id}`);
    console.log(`   Statut: ${collab.statut}`);
    console.log(`   Créé le: ${new Date(collab.created_at).toLocaleString('fr-FR')}`);
    console.log('');
    
    // 2. Vérifier la structure des tables d'historique
    console.log('📋 STRUCTURE DES TABLES D\'HISTORIQUE:');
    console.log('=======================================');
    
    const tables = ['collaborateur_grade_history', 'collaborateur_poste_history', 'collaborateur_organisation_history'];
    
    for (const tableName of tables) {
      console.log(`\n📊 Table: ${tableName}`);
      console.log('─'.repeat(50));
      
      const structureQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `;
      
      const structureResult = await client.query(structureQuery, [tableName]);
      
      if (structureResult.rows.length > 0) {
        structureResult.rows.forEach(row => {
          console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
        });
      } else {
        console.log('   ❌ Table non trouvée');
      }
    }
    console.log('');
    
    // 3. Vérifier les données existantes dans les tables d'historique
    console.log('📊 DONNÉES EXISTANTES DANS LES TABLES D\'HISTORIQUE:');
    console.log('=====================================================');
    
    for (const tableName of tables) {
      console.log(`\n📋 Table: ${tableName}`);
      console.log('─'.repeat(50));
      
      const dataQuery = `
        SELECT * FROM ${tableName} 
        WHERE collaborateur_id = $1
        ORDER BY date_debut DESC
      `;
      
      const dataResult = await client.query(dataQuery, [collab.id]);
      
      if (dataResult.rows.length > 0) {
        console.log(`   📈 ${dataResult.rows.length} enregistrement(s) trouvé(s):`);
        dataResult.rows.forEach((record, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(record, null, 2)}`);
          console.log('      ---');
        });
      } else {
        console.log('   ✅ Aucun enregistrement trouvé (normal pour un nouveau collaborateur)');
      }
    }
    console.log('');
    
    // 4. Vérifier les tables de référence
    console.log('🔍 VÉRIFICATION DES TABLES DE RÉFÉRENCE:');
    console.log('=========================================');
    
    // Vérifier les grades
    console.log('\n📊 Table: grades');
    console.log('─'.repeat(50));
    
    const gradesQuery = `
      SELECT id, nom, code, description, statut
      FROM grades
      WHERE statut = 'ACTIF'
      ORDER BY nom
    `;
    
    const gradesResult = await client.query(gradesQuery);
    
    if (gradesResult.rows.length > 0) {
      console.log(`   📈 ${gradesResult.rows.length} grade(s) actif(s):`);
      gradesResult.rows.forEach((grade, index) => {
        console.log(`   ${index + 1}. ${grade.nom} (${grade.code}) - ${grade.description || 'Pas de description'}`);
      });
    } else {
      console.log('   ❌ Aucun grade actif trouvé');
    }
    
    // Vérifier les postes
    console.log('\n📊 Table: postes');
    console.log('─'.repeat(50));
    
    const postesQuery = `
      SELECT id, nom, code, description, statut
      FROM postes
      WHERE statut = 'ACTIF'
      ORDER BY nom
    `;
    
    const postesResult = await client.query(postesQuery);
    
    if (postesResult.rows.length > 0) {
      console.log(`   📈 ${postesResult.rows.length} poste(s) actif(s):`);
      postesResult.rows.forEach((poste, index) => {
        console.log(`   ${index + 1}. ${poste.nom} (${poste.code}) - ${poste.description || 'Pas de description'}`);
      });
    } else {
      console.log('   ❌ Aucun poste actif trouvé');
    }
    
    // Vérifier les business units
    console.log('\n📊 Table: business_units');
    console.log('─'.repeat(50));
    
    const businessUnitsQuery = `
      SELECT id, nom, code, description, statut
      FROM business_units
      WHERE statut = 'ACTIF'
      ORDER BY nom
    `;
    
    const businessUnitsResult = await client.query(businessUnitsQuery);
    
    if (businessUnitsResult.rows.length > 0) {
      console.log(`   📈 ${businessUnitsResult.rows.length} business unit(s) active(s):`);
      businessUnitsResult.rows.forEach((bu, index) => {
        console.log(`   ${index + 1}. ${bu.nom} (${bu.code}) - ${bu.description || 'Pas de description'}`);
      });
    } else {
      console.log('   ❌ Aucune business unit active trouvée');
    }
    
    // Vérifier les divisions
    console.log('\n📊 Table: divisions');
    console.log('─'.repeat(50));
    
    const divisionsQuery = `
      SELECT id, nom, code, description, business_unit_id, statut
      FROM divisions
      WHERE statut = 'ACTIF'
      ORDER BY nom
    `;
    
    const divisionsResult = await client.query(divisionsQuery);
    
    if (divisionsResult.rows.length > 0) {
      console.log(`   📈 ${divisionsResult.rows.length} division(s) active(s):`);
      divisionsResult.rows.forEach((division, index) => {
        console.log(`   ${index + 1}. ${division.nom} (${division.code}) - BU: ${division.business_unit_id}`);
      });
    } else {
      console.log('   ❌ Aucune division active trouvée');
    }
    console.log('');
    
    // 5. Vérifier les contraintes de clés étrangères
    console.log('🔗 VÉRIFICATION DES CONTRAINTES DE CLÉS ÉTRANGÈRES:');
    console.log('====================================================');
    
    for (const tableName of tables) {
      console.log(`\n📋 Table: ${tableName}`);
      console.log('─'.repeat(50));
      
      const constraintsQuery = `
        SELECT 
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
      `;
      
      const constraintsResult = await client.query(constraintsQuery, [tableName]);
      
      if (constraintsResult.rows.length > 0) {
        constraintsResult.rows.forEach(constraint => {
          console.log(`   🔗 ${constraint.column_name} → ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
        });
      } else {
        console.log('   ❌ Aucune contrainte de clé étrangère trouvée');
      }
    }
    console.log('');
    
    // 6. Recommandations
    console.log('💡 RECOMMANDATIONS:');
    console.log('===================');
    
    console.log('🔧 SOLUTIONS POUR LES ERREURS 400:');
    console.log('   1. Vérifier que les IDs des grades, postes, BU et divisions existent');
    console.log('   2. Vérifier que les dates sont dans le bon format');
    console.log('   3. Vérifier que les champs obligatoires sont remplis');
    console.log('   4. Vérifier que les contraintes de clés étrangères sont respectées');
    console.log('   5. Ajouter des validations côté frontend et backend');
    console.log('');
    
    console.log('🔧 VÉRIFICATIONS À FAIRE:');
    console.log('   1. Vérifier le code JavaScript qui envoie les données');
    console.log('   2. Vérifier les routes backend qui reçoivent les données');
    console.log('   3. Vérifier que les données sont correctement formatées');
    console.log('   4. Vérifier que les IDs existent dans les tables de référence');
    console.log('   5. Vérifier que les dates sont valides');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Diagnostic terminé !');
  }
}

// Exécuter le script
if (require.main === module) {
  debugRHEvolutionErrors();
}

module.exports = { debugRHEvolutionErrors };


