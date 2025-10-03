const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour vérifier la structure de la table des permissions
async function checkPermissionsStructure() {
  console.log('🔍 Vérification de la structure de la table des permissions...\n');
  
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
    
    // 1. Vérifier la structure de la table permissions
    console.log('📋 STRUCTURE DE LA TABLE PERMISSIONS:');
    console.log('=====================================');
    
    const permissionsStructureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'permissions'
      ORDER BY ordinal_position
    `;
    
    const permissionsStructureResult = await client.query(permissionsStructureQuery);
    
    if (permissionsStructureResult.rows.length > 0) {
      permissionsStructureResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
      });
    } else {
      console.log('❌ Table permissions non trouvée');
    }
    console.log('');
    
    // 2. Vérifier la structure de la table user_permissions
    console.log('📋 STRUCTURE DE LA TABLE USER_PERMISSIONS:');
    console.log('===========================================');
    
    const userPermissionsStructureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_permissions'
      ORDER BY ordinal_position
    `;
    
    const userPermissionsStructureResult = await client.query(userPermissionsStructureQuery);
    
    if (userPermissionsStructureResult.rows.length > 0) {
      userPermissionsStructureResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
      });
    } else {
      console.log('❌ Table user_permissions non trouvée');
    }
    console.log('');
    
    // 3. Vérifier les données dans la table permissions
    console.log('📊 DONNÉES DANS LA TABLE PERMISSIONS:');
    console.log('=====================================');
    
    const permissionsDataQuery = `
      SELECT * FROM permissions LIMIT 10
    `;
    
    const permissionsDataResult = await client.query(permissionsDataQuery);
    
    if (permissionsDataResult.rows.length > 0) {
      console.log(`📈 ${permissionsDataResult.rows.length} permission(s) trouvée(s):`);
      permissionsDataResult.rows.forEach((perm, index) => {
        console.log(`   ${index + 1}. ${JSON.stringify(perm, null, 2)}`);
        console.log('      ---');
      });
    } else {
      console.log('❌ Aucune permission trouvée');
    }
    console.log('');
    
    // 4. Vérifier les permissions de l'utilisateur actuel
    console.log('👤 PERMISSIONS DE L\'UTILISATEUR ACTUEL:');
    console.log('=========================================');
    
    const currentUserQuery = `
      SELECT 
        u.id,
        u.login,
        u.prenom,
        u.nom,
        u.role
      FROM users u
      WHERE u.login = 'rngos1'
    `;
    
    const currentUserResult = await client.query(currentUserQuery);
    
    if (currentUserResult.rows.length > 0) {
      const currentUser = currentUserResult.rows[0];
      console.log(`   Utilisateur: ${currentUser.prenom} ${currentUser.nom} (${currentUser.login})`);
      console.log(`   Rôle: ${currentUser.role}`);
      console.log(`   ID: ${currentUser.id}`);
      console.log('');
      
      // Vérifier les permissions de cet utilisateur
      const userPermissionsQuery = `
        SELECT 
          p.*
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = $1
        LIMIT 10
      `;
      
      const userPermissionsResult = await client.query(userPermissionsQuery, [currentUser.id]);
      
      if (userPermissionsResult.rows.length > 0) {
        console.log(`📋 ${userPermissionsResult.rows.length} permission(s) trouvée(s):`);
        userPermissionsResult.rows.forEach((perm, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(perm, null, 2)}`);
          console.log('      ---');
        });
      } else {
        console.log('❌ Aucune permission trouvée pour cet utilisateur');
      }
    } else {
      console.log('❌ Utilisateur actuel non trouvé');
    }
    console.log('');
    
    // 5. Vérifier les tables liées aux permissions
    console.log('📋 TABLES LIÉES AUX PERMISSIONS:');
    console.log('=================================');
    
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE '%permission%' 
           OR table_name LIKE '%role%'
           OR table_name LIKE '%user%')
      ORDER BY table_name
    `;
    
    const tablesResult = await client.query(tablesQuery);
    
    if (tablesResult.rows.length > 0) {
      console.log('📁 Tables trouvées:');
      tablesResult.rows.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.table_name}`);
      });
    } else {
      console.log('❌ Aucune table liée aux permissions trouvée');
    }
    
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
  checkPermissionsStructure();
}

module.exports = { checkPermissionsStructure };




