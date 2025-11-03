const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour vérifier la structure de la table des rôles
async function checkRolesStructure() {
  console.log('🔍 Vérification de la structure de la table des rôles...\n');
  
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
    
    // 1. Vérifier la structure de la table roles
    console.log('📋 STRUCTURE DE LA TABLE ROLES:');
    console.log('================================');
    
    const rolesStructureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'roles'
      ORDER BY ordinal_position
    `;
    
    const rolesStructureResult = await client.query(rolesStructureQuery);
    
    if (rolesStructureResult.rows.length > 0) {
      rolesStructureResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
      });
    } else {
      console.log('❌ Table roles non trouvée');
    }
    console.log('');
    
    // 2. Vérifier les données dans la table roles
    console.log('📊 DONNÉES DANS LA TABLE ROLES:');
    console.log('================================');
    
    const rolesDataQuery = `
      SELECT * FROM roles ORDER BY name
    `;
    
    const rolesDataResult = await client.query(rolesDataQuery);
    
    if (rolesDataResult.rows.length > 0) {
      console.log(`📈 ${rolesDataResult.rows.length} rôle(s) trouvé(s):`);
      rolesDataResult.rows.forEach((role, index) => {
        console.log(`   ${index + 1}. ${JSON.stringify(role, null, 2)}`);
        console.log('      ---');
      });
    } else {
      console.log('❌ Aucun rôle trouvé');
    }
    console.log('');
    
    // 3. Vérifier la structure de la table user_roles
    console.log('📋 STRUCTURE DE LA TABLE USER_ROLES:');
    console.log('=====================================');
    
    const userRolesStructureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_roles'
      ORDER BY ordinal_position
    `;
    
    const userRolesStructureResult = await client.query(userRolesStructureQuery);
    
    if (userRolesStructureResult.rows.length > 0) {
      userRolesStructureResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
      });
    } else {
      console.log('❌ Table user_roles non trouvée');
    }
    console.log('');
    
    // 4. Vérifier les rôles de l'utilisateur actuel
    console.log('👤 RÔLES DE L\'UTILISATEUR ACTUEL:');
    console.log('====================================');
    
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
      console.log(`   Rôle dans users.role: ${currentUser.role}`);
      console.log(`   ID: ${currentUser.id}`);
      console.log('');
      
      // Vérifier les rôles dans user_roles
      const userRolesQuery = `
        SELECT 
          r.*
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
      `;
      
      const userRolesResult = await client.query(userRolesQuery, [currentUser.id]);
      
      if (userRolesResult.rows.length > 0) {
        console.log(`📋 ${userRolesResult.rows.length} rôle(s) trouvé(s) dans user_roles:`);
        userRolesResult.rows.forEach((role, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(role, null, 2)}`);
          console.log('      ---');
        });
      } else {
        console.log('❌ Aucun rôle trouvé dans user_roles pour cet utilisateur');
      }
    } else {
      console.log('❌ Utilisateur actuel non trouvé');
    }
    console.log('');
    
    // 5. Vérifier la structure de la table role_permissions
    console.log('📋 STRUCTURE DE LA TABLE ROLE_PERMISSIONS:');
    console.log('===========================================');
    
    const rolePermissionsStructureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'role_permissions'
      ORDER BY ordinal_position
    `;
    
    const rolePermissionsStructureResult = await client.query(rolePermissionsStructureQuery);
    
    if (rolePermissionsStructureResult.rows.length > 0) {
      rolePermissionsStructureResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
      });
    } else {
      console.log('❌ Table role_permissions non trouvée');
    }
    console.log('');
    
    // 6. Vérifier les permissions d'un rôle (exemple: ADMIN_IT)
    console.log('🔐 PERMISSIONS DU RÔLE ADMIN_IT:');
    console.log('==================================');
    
    const adminRoleQuery = `
      SELECT 
        r.id,
        r.name,
        r.description
      FROM roles r
      WHERE r.name = 'ADMIN_IT'
    `;
    
    const adminRoleResult = await client.query(adminRoleQuery);
    
    if (adminRoleResult.rows.length > 0) {
      const adminRole = adminRoleResult.rows[0];
      console.log(`   Rôle: ${adminRole.name}`);
      console.log(`   Description: ${adminRole.description || 'Pas de description'}`);
      console.log(`   ID: ${adminRole.id}`);
      console.log('');
      
      // Vérifier les permissions de ce rôle
      const rolePermissionsQuery = `
        SELECT 
          p.id,
          p.code,
          p.name,
          p.description,
          p.category
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1
        ORDER BY p.category, p.code
      `;
      
      const rolePermissionsResult = await client.query(rolePermissionsQuery, [adminRole.id]);
      
      if (rolePermissionsResult.rows.length > 0) {
        console.log(`📋 ${rolePermissionsResult.rows.length} permission(s) trouvée(s):`);
        
        // Grouper par catégorie
        const permissionsByCategory = {};
        rolePermissionsResult.rows.forEach(perm => {
          if (!permissionsByCategory[perm.category]) {
            permissionsByCategory[perm.category] = [];
          }
          permissionsByCategory[perm.category].push(perm);
        });
        
        Object.keys(permissionsByCategory).forEach(category => {
          console.log(`\n   📁 ${category.toUpperCase()}:`);
          permissionsByCategory[category].forEach((perm, index) => {
            console.log(`      ${index + 1}. ${perm.name} (${perm.code})`);
            console.log(`         Description: ${perm.description || 'Pas de description'}`);
          });
        });
      } else {
        console.log('❌ Aucune permission trouvée pour ce rôle');
      }
    } else {
      console.log('❌ Rôle ADMIN_IT non trouvé');
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
  checkRolesStructure();
}

module.exports = { checkRolesStructure };














