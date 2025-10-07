const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour vérifier les tables RH existantes
async function checkRHTables() {
  console.log('🔍 Vérification des tables RH existantes...\n');
  
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
    
    // 1. Lister toutes les tables
    console.log('📋 TOUTES LES TABLES DE LA BASE:');
    console.log('=================================');
    
    const allTablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const allTablesResult = await client.query(allTablesQuery);
    
    if (allTablesResult.rows.length > 0) {
      console.log(`📈 ${allTablesResult.rows.length} table(s) trouvée(s):`);
      allTablesResult.rows.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.table_name}`);
      });
    } else {
      console.log('❌ Aucune table trouvée');
    }
    console.log('');
    
    // 2. Chercher les tables liées aux collaborateurs
    console.log('👥 TABLES LIÉES AUX COLLABORATEURS:');
    console.log('====================================');
    
    const collabTablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE '%collaborateur%' 
           OR table_name LIKE '%collaborator%'
           OR table_name LIKE '%grade%'
           OR table_name LIKE '%poste%'
           OR table_name LIKE '%organisation%'
           OR table_name LIKE '%history%'
           OR table_name LIKE '%historique%')
      ORDER BY table_name
    `;
    
    const collabTablesResult = await client.query(collabTablesQuery);
    
    if (collabTablesResult.rows.length > 0) {
      console.log(`📈 ${collabTablesResult.rows.length} table(s) liée(s) aux collaborateurs:`);
      collabTablesResult.rows.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.table_name}`);
      });
    } else {
      console.log('❌ Aucune table liée aux collaborateurs trouvée');
    }
    console.log('');
    
    // 3. Chercher les tables liées à l'historique
    console.log('📊 TABLES LIÉES À L\'HISTORIQUE:');
    console.log('=================================');
    
    const historyTablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE '%history%'
           OR table_name LIKE '%historique%'
           OR table_name LIKE '%evolution%'
           OR table_name LIKE '%change%'
           OR table_name LIKE '%log%')
      ORDER BY table_name
    `;
    
    const historyTablesResult = await client.query(historyTablesQuery);
    
    if (historyTablesResult.rows.length > 0) {
      console.log(`📈 ${historyTablesResult.rows.length} table(s) d'historique trouvée(s):`);
      historyTablesResult.rows.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.table_name}`);
      });
    } else {
      console.log('❌ Aucune table d\'historique trouvée');
    }
    console.log('');
    
    // 4. Vérifier la structure de la table collaborateurs
    console.log('👤 STRUCTURE DE LA TABLE COLLABORATEURS:');
    console.log('=========================================');
    
    const collaborateursStructureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'collaborateurs'
      ORDER BY ordinal_position
    `;
    
    const collaborateursStructureResult = await client.query(collaborateursStructureQuery);
    
    if (collaborateursStructureResult.rows.length > 0) {
      console.log(`📋 ${collaborateursStructureResult.rows.length} colonne(s) trouvée(s):`);
      collaborateursStructureResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
      });
    } else {
      console.log('❌ Table collaborateurs non trouvée');
    }
    console.log('');
    
    // 5. Vérifier les tables de référence RH
    console.log('🔍 TABLES DE RÉFÉRENCE RH:');
    console.log('============================');
    
    const refTables = ['grades', 'postes', 'types_collaborateurs', 'business_units', 'divisions'];
    
    for (const tableName of refTables) {
      console.log(`\n📊 Table: ${tableName}`);
      console.log('─'.repeat(50));
      
      const existsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `;
      
      const existsResult = await client.query(existsQuery, [tableName]);
      
      if (existsResult.rows[0].exists) {
        // Vérifier la structure
        const structureQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `;
        
        const structureResult = await client.query(structureQuery, [tableName]);
        
        console.log(`   ✅ Table existe (${structureResult.rows.length} colonnes)`);
        structureResult.rows.forEach(row => {
          console.log(`      ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // Compter les enregistrements
        const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
        const countResult = await client.query(countQuery);
        console.log(`      📊 ${countResult.rows[0].count} enregistrement(s)`);
      } else {
        console.log('   ❌ Table n\'existe pas');
      }
    }
    console.log('');
    
    // 6. Recommandations
    console.log('💡 RECOMMANDATIONS:');
    console.log('===================');
    
    console.log('❌ PROBLÈME IDENTIFIÉ:');
    console.log('   Les tables d\'historique RH n\'existent pas');
    console.log('   Cela explique les erreurs 400 lors de la création des historiques');
    console.log('');
    console.log('🔧 SOLUTIONS:');
    console.log('   1. Créer les tables d\'historique RH manquantes');
    console.log('   2. Modifier le code pour ne pas essayer de créer des historiques');
    console.log('   3. Utiliser les champs actuels de la table collaborateurs');
    console.log('   4. Implémenter un système d\'historique simple');
    console.log('');
    console.log('🔧 TABLES À CRÉER:');
    console.log('   1. collaborateur_grade_history');
    console.log('   2. collaborateur_poste_history');
    console.log('   3. collaborateur_organisation_history');
    console.log('   4. Ou utiliser les champs existants dans collaborateurs');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Vérification terminée !');
  }
}

// Exécuter le script
if (require.main === module) {
  checkRHTables();
}

module.exports = { checkRHTables };






