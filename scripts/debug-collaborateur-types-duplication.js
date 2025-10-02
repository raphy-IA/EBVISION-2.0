const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour diagnostiquer la duplication des types de collaborateurs
async function debugCollaborateurTypesDuplication() {
  console.log('🔍 Diagnostic de la duplication des types de collaborateurs...\n');
  
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
    
    // 1. Vérifier la structure de la table types_collaborateurs
    console.log('📋 STRUCTURE DE LA TABLE TYPES_COLLABORATEURS:');
    console.log('===============================================');
    
    const structureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'types_collaborateurs'
      ORDER BY ordinal_position
    `;
    
    const structureResult = await client.query(structureQuery);
    
    if (structureResult.rows.length > 0) {
      structureResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
      });
    } else {
      console.log('   ❌ Table types_collaborateurs non trouvée');
      return;
    }
    console.log('');
    
    // 2. Vérifier les données dans la table
    console.log('📊 DONNÉES DANS LA TABLE TYPES_COLLABORATEURS:');
    console.log('===============================================');
    
    const dataQuery = `
      SELECT id, nom, code, description, statut, created_at, updated_at
      FROM types_collaborateurs
      ORDER BY nom ASC
    `;
    
    const dataResult = await client.query(dataQuery);
    
    if (dataResult.rows.length > 0) {
      console.log(`   📈 Total des types: ${dataResult.rows.length}`);
      console.log('');
      
      dataResult.rows.forEach((type, index) => {
        console.log(`   ${index + 1}. ID: ${type.id}`);
        console.log(`      Nom: ${type.nom}`);
        console.log(`      Code: ${type.code || 'NULL'}`);
        console.log(`      Description: ${type.description || 'NULL'}`);
        console.log(`      Statut: ${type.statut || 'NULL'}`);
        console.log(`      Créé le: ${type.created_at ? new Date(type.created_at).toLocaleString('fr-FR') : 'NULL'}`);
        console.log('      ---');
      });
    } else {
      console.log('   ❌ Aucun type de collaborateur trouvé');
    }
    console.log('');
    
    // 3. Vérifier les doublons par nom
    console.log('🔍 VÉRIFICATION DES DOUBLONS PAR NOM:');
    console.log('=====================================');
    
    const duplicatesQuery = `
      SELECT nom, COUNT(*) as count
      FROM types_collaborateurs
      GROUP BY nom
      HAVING COUNT(*) > 1
      ORDER BY count DESC, nom ASC
    `;
    
    const duplicatesResult = await client.query(duplicatesQuery);
    
    if (duplicatesResult.rows.length > 0) {
      console.log(`   ⚠️ ${duplicatesResult.rows.length} nom(s) en doublon trouvé(s):`);
      duplicatesResult.rows.forEach(duplicate => {
        console.log(`      - "${duplicate.nom}": ${duplicate.count} occurrence(s)`);
      });
    } else {
      console.log('   ✅ Aucun doublon par nom trouvé');
    }
    console.log('');
    
    // 4. Vérifier les doublons par code
    console.log('🔍 VÉRIFICATION DES DOUBLONS PAR CODE:');
    console.log('======================================');
    
    const codeDuplicatesQuery = `
      SELECT code, COUNT(*) as count
      FROM types_collaborateurs
      WHERE code IS NOT NULL
      GROUP BY code
      HAVING COUNT(*) > 1
      ORDER BY count DESC, code ASC
    `;
    
    const codeDuplicatesResult = await client.query(codeDuplicatesQuery);
    
    if (codeDuplicatesResult.rows.length > 0) {
      console.log(`   ⚠️ ${codeDuplicatesResult.rows.length} code(s) en doublon trouvé(s):`);
      codeDuplicatesResult.rows.forEach(duplicate => {
        console.log(`      - "${duplicate.code}": ${duplicate.count} occurrence(s)`);
      });
    } else {
      console.log('   ✅ Aucun doublon par code trouvé');
    }
    console.log('');
    
    // 5. Vérifier les types avec des codes NULL
    console.log('🔍 VÉRIFICATION DES TYPES SANS CODE:');
    console.log('=====================================');
    
    const nullCodeQuery = `
      SELECT id, nom, code
      FROM types_collaborateurs
      WHERE code IS NULL
      ORDER BY nom ASC
    `;
    
    const nullCodeResult = await client.query(nullCodeQuery);
    
    if (nullCodeResult.rows.length > 0) {
      console.log(`   ⚠️ ${nullCodeResult.rows.length} type(s) sans code:`);
      nullCodeResult.rows.forEach(type => {
        console.log(`      - "${type.nom}" (ID: ${type.id})`);
      });
    } else {
      console.log('   ✅ Tous les types ont un code');
    }
    console.log('');
    
    // 6. Vérifier l'API backend
    console.log('🔍 VÉRIFICATION DE L\'API BACKEND:');
    console.log('===================================');
    
    // Simuler l'appel API que fait le frontend
    const apiQuery = `
      SELECT id, nom, code, description, statut
      FROM types_collaborateurs
      WHERE statut = 'ACTIF' OR statut IS NULL
      ORDER BY nom ASC
    `;
    
    const apiResult = await client.query(apiQuery);
    
    console.log(`   📡 Résultat de l'API simulée: ${apiResult.rows.length} types`);
    apiResult.rows.forEach((type, index) => {
      console.log(`      ${index + 1}. ${type.nom} (${type.code || 'SANS_CODE'})`);
    });
    console.log('');
    
    // 7. Recommandations
    console.log('💡 RECOMMANDATIONS:');
    console.log('===================');
    
    if (duplicatesResult.rows.length > 0 || codeDuplicatesResult.rows.length > 0) {
      console.log('❌ Problèmes détectés:');
      console.log('   1. Des doublons existent dans la table types_collaborateurs');
      console.log('   2. Cela peut causer des duplications dans l\'interface');
      console.log('');
      console.log('🔧 Solutions:');
      console.log('   1. Nettoyer les doublons dans la base de données');
      console.log('   2. Ajouter des contraintes UNIQUE sur nom et code');
      console.log('   3. Vérifier le code JavaScript pour éviter les ajouts multiples');
    } else if (nullCodeResult.rows.length > 0) {
      console.log('⚠️ Types sans code détectés:');
      console.log('   1. Certains types n\'ont pas de code');
      console.log('   2. Cela peut causer des problèmes d\'affichage');
      console.log('');
      console.log('🔧 Solutions:');
      console.log('   1. Ajouter des codes pour tous les types');
      console.log('   2. Modifier l\'API pour gérer les codes NULL');
    } else {
      console.log('✅ Aucun problème majeur détecté dans la base de données');
      console.log('   Le problème de duplication pourrait venir du code JavaScript');
      console.log('');
      console.log('🔧 Vérifications à faire:');
      console.log('   1. Vérifier que loadTypesCollaborateurs() n\'est pas appelée plusieurs fois');
      console.log('   2. Vérifier que les options ne sont pas ajoutées plusieurs fois');
      console.log('   3. Vérifier que les selects sont bien vidés avant d\'être remplis');
    }
    
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
  debugCollaborateurTypesDuplication();
}

module.exports = { debugCollaborateurTypesDuplication };



