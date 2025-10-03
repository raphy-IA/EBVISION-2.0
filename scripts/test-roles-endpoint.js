const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour tester l'endpoint des rôles
async function testRolesEndpoint() {
  console.log('🔍 Test de l\'endpoint des rôles...\n');
  
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
    
    // 1. Vérifier si la table roles existe
    console.log('🔍 VÉRIFICATION DE LA TABLE ROLES:');
    console.log('==================================');
    
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'roles'
      );
    `;
    
    const tableExistsResult = await client.query(tableExistsQuery);
    const tableExists = tableExistsResult.rows[0].exists;
    
    console.log(`   Table roles existe: ${tableExists ? 'OUI' : 'NON'}`);
    console.log('');
    
    if (tableExists) {
      // 2. Récupérer les rôles depuis la table roles
      console.log('📋 RÔLES DANS LA TABLE ROLES:');
      console.log('==============================');
      
      const rolesQuery = `
        SELECT id, name, description
        FROM roles
        ORDER BY name
      `;
      
      const rolesResult = await client.query(rolesQuery);
      
      if (rolesResult.rows.length === 0) {
        console.log('❌ Aucun rôle trouvé dans la table roles');
      } else {
        console.log(`✅ ${rolesResult.rows.length} rôle(s) trouvé(s):`);
        rolesResult.rows.forEach((role, index) => {
          console.log(`   ${index + 1}. ${role.name} (ID: ${role.id})`);
          if (role.description) {
            console.log(`      Description: ${role.description}`);
          }
        });
      }
      console.log('');
      
      // 3. Vérifier les permissions associées aux rôles
      console.log('🔑 PERMISSIONS ASSOCIÉES AUX RÔLES:');
      console.log('===================================');
      
      const rolePermissionsQuery = `
        SELECT 
          r.name as role_name,
          p.code as permission_code,
          p.name as permission_name
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        ORDER BY r.name, p.code
      `;
      
      const rolePermissionsResult = await client.query(rolePermissionsQuery);
      
      if (rolePermissionsResult.rows.length === 0) {
        console.log('❌ Aucune permission associée aux rôles');
      } else {
        console.log(`✅ ${rolePermissionsResult.rows.length} association(s) rôle-permission trouvée(s):`);
        let currentRole = null;
        rolePermissionsResult.rows.forEach((row, index) => {
          if (row.role_name !== currentRole) {
            currentRole = row.role_name;
            console.log(`\n   📋 Rôle: ${row.role_name}`);
          }
          if (row.permission_code) {
            console.log(`      - ${row.permission_code}: ${row.permission_name}`);
          }
        });
      }
      console.log('');
      
    } else {
      console.log('❌ La table roles n\'existe pas - utilisation du système de rôles par défaut');
      console.log('');
      
      // 4. Vérifier les rôles par défaut (ancien système)
      console.log('📋 RÔLES PAR DÉFAUT (ANCIEN SYSTÈME):');
      console.log('=====================================');
      
      const defaultRoles = ['ADMIN', 'MANAGER', 'USER', 'ADMIN_IT'];
      console.log('✅ Rôles par défaut disponibles:');
      defaultRoles.forEach((role, index) => {
        console.log(`   ${index + 1}. ${role}`);
      });
    }
    
    // 5. Test de l'endpoint API
    console.log('🌐 TEST DE L\'ENDPOINT API:');
    console.log('===========================');
    console.log('   URL: GET /api/users/roles');
    console.log('   Méthode: GET');
    console.log('   Authentification: Bearer Token requis');
    console.log('');
    
    console.log('📊 RÉSUMÉ:');
    console.log('==========');
    if (tableExists) {
      console.log('✅ Table roles existe et contient des données');
      console.log('✅ L\'endpoint devrait retourner les rôles de la table');
    } else {
      console.log('⚠️  Table roles n\'existe pas');
      console.log('⚠️  L\'endpoint devrait retourner les rôles par défaut');
    }
    console.log('🔍 Vérifiez les logs du serveur pour voir l\'exécution de l\'endpoint');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Test terminé !');
  }
}

// Exécuter le script
if (require.main === module) {
  testRolesEndpoint();
}

module.exports = { testRolesEndpoint };




