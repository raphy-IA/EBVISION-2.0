const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour vérifier les permissions de l'utilisateur via les rôles
async function checkUserRolePermissions() {
  console.log('🔍 Vérification des permissions de l\'utilisateur via les rôles...\n');
  
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
    
    // 1. Vérifier l'utilisateur actuel
    console.log('👤 VÉRIFICATION DE L\'UTILISATEUR ACTUEL:');
    console.log('==========================================');
    
    const currentUserQuery = `
      SELECT 
        u.id,
        u.login,
        u.prenom,
        u.nom,
        u.role,
        u.collaborateur_id
      FROM users u
      WHERE u.login = 'rngos1'
    `;
    
    const currentUserResult = await client.query(currentUserQuery);
    
    if (currentUserResult.rows.length === 0) {
      console.log('❌ Utilisateur actuel non trouvé');
      return;
    }
    
    const currentUser = currentUserResult.rows[0];
    console.log(`   Utilisateur: ${currentUser.prenom} ${currentUser.nom} (${currentUser.login})`);
    console.log(`   Rôle: ${currentUser.role}`);
    console.log(`   ID: ${currentUser.id}`);
    console.log(`   Collaborateur ID: ${currentUser.collaborateur_id || 'NULL'}`);
    console.log('');
    
    // 2. Vérifier les rôles de l'utilisateur
    console.log('🎭 RÔLES DE L\'UTILISATEUR:');
    console.log('============================');
    
    const userRolesQuery = `
      SELECT 
        r.id,
        r.name,
        r.code,
        r.description
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
    `;
    
    const userRolesResult = await client.query(userRolesQuery, [currentUser.id]);
    
    if (userRolesResult.rows.length > 0) {
      console.log(`📋 ${userRolesResult.rows.length} rôle(s) trouvé(s):`);
      userRolesResult.rows.forEach((role, index) => {
        console.log(`   ${index + 1}. ${role.name} (${role.code})`);
        console.log(`      Description: ${role.description || 'Pas de description'}`);
        console.log(`      ID: ${role.id}`);
        console.log('      ---');
      });
    } else {
      console.log('❌ Aucun rôle trouvé pour cet utilisateur');
    }
    console.log('');
    
    // 3. Vérifier les permissions via les rôles
    console.log('🔐 PERMISSIONS VIA LES RÔLES:');
    console.log('===============================');
    
    const rolePermissionsQuery = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.description,
        p.category,
        r.name as role_name,
        r.code as role_code
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1
      ORDER BY p.category, p.code
    `;
    
    const rolePermissionsResult = await client.query(rolePermissionsQuery, [currentUser.id]);
    
    if (rolePermissionsResult.rows.length > 0) {
      console.log(`📋 ${rolePermissionsResult.rows.length} permission(s) trouvée(s) via les rôles:`);
      
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
          console.log(`         Rôle: ${perm.role_name} (${perm.role_code})`);
          console.log(`         Description: ${perm.description || 'Pas de description'}`);
        });
      });
    } else {
      console.log('❌ Aucune permission trouvée via les rôles');
    }
    console.log('');
    
    // 4. Vérifier les permissions spécifiques pour la génération de compte utilisateur
    console.log('🔍 PERMISSIONS POUR LA GÉNÉRATION DE COMPTE UTILISATEUR:');
    console.log('=========================================================');
    
    const userGenerationPermissionsQuery = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.description,
        p.category,
        r.name as role_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1
      AND (p.code LIKE '%user%' 
           OR p.code LIKE '%collaborateur%'
           OR p.code LIKE '%generate%'
           OR p.code LIKE '%account%'
           OR p.code LIKE '%create%'
           OR p.name LIKE '%utilisateur%'
           OR p.name LIKE '%collaborateur%')
      ORDER BY p.code
    `;
    
    const userGenerationPermissionsResult = await client.query(userGenerationPermissionsQuery, [currentUser.id]);
    
    if (userGenerationPermissionsResult.rows.length > 0) {
      console.log(`✅ ${userGenerationPermissionsResult.rows.length} permission(s) trouvée(s) pour la génération de compte:`);
      userGenerationPermissionsResult.rows.forEach((perm, index) => {
        console.log(`   ${index + 1}. ${perm.name} (${perm.code})`);
        console.log(`      Rôle: ${perm.role_name}`);
        console.log(`      Description: ${perm.description || 'Pas de description'}`);
        console.log('      ---');
      });
    } else {
      console.log('❌ Aucune permission spécifique trouvée pour la génération de compte utilisateur');
    }
    console.log('');
    
    // 5. Vérifier toutes les permissions disponibles pour la génération de compte
    console.log('🔍 TOUTES LES PERMISSIONS DISPONIBLES POUR LA GÉNÉRATION:');
    console.log('==========================================================');
    
    const allUserPermissionsQuery = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.description,
        p.category
      FROM permissions p
      WHERE p.code LIKE '%user%' 
         OR p.code LIKE '%collaborateur%'
         OR p.code LIKE '%generate%'
         OR p.code LIKE '%account%'
         OR p.code LIKE '%create%'
         OR p.name LIKE '%utilisateur%'
         OR p.name LIKE '%collaborateur%'
      ORDER BY p.category, p.code
    `;
    
    const allUserPermissionsResult = await client.query(allUserPermissionsQuery);
    
    if (allUserPermissionsResult.rows.length > 0) {
      console.log(`📋 ${allUserPermissionsResult.rows.length} permission(s) disponible(s):`);
      allUserPermissionsResult.rows.forEach((perm, index) => {
        console.log(`   ${index + 1}. ${perm.name} (${perm.code})`);
        console.log(`      Catégorie: ${perm.category}`);
        console.log(`      Description: ${perm.description || 'Pas de description'}`);
        console.log('      ---');
      });
    } else {
      console.log('❌ Aucune permission disponible pour la génération de compte utilisateur');
    }
    console.log('');
    
    // 6. Recommandations
    console.log('💡 RECOMMANDATIONS:');
    console.log('===================');
    
    if (rolePermissionsResult.rows.length === 0) {
      console.log('❌ PROBLÈME IDENTIFIÉ:');
      console.log('   L\'utilisateur n\'a aucun rôle assigné');
      console.log('   Cela explique l\'erreur 403');
      console.log('');
      console.log('🔧 SOLUTIONS:');
      console.log('   1. Assigner un rôle à l\'utilisateur');
      console.log('   2. Vérifier que le rôle a les permissions nécessaires');
      console.log('   3. Ou ajouter directement les permissions à l\'utilisateur');
    } else if (userGenerationPermissionsResult.rows.length === 0) {
      console.log('❌ PROBLÈME IDENTIFIÉ:');
      console.log('   L\'utilisateur a des rôles mais pas les permissions pour générer des comptes');
      console.log('');
      console.log('🔧 SOLUTIONS:');
      console.log('   1. Ajouter les permissions nécessaires au rôle');
      console.log('   2. Ou créer un nouveau rôle avec ces permissions');
      console.log('   3. Ou ajouter directement les permissions à l\'utilisateur');
    } else {
      console.log('✅ L\'utilisateur a les permissions nécessaires');
      console.log('   Le problème 403 pourrait venir d\'ailleurs');
      console.log('');
      console.log('🔧 VÉRIFICATIONS À FAIRE:');
      console.log('   1. Vérifier le code backend de la route');
      console.log('   2. Vérifier que l\'authentification fonctionne');
      console.log('   3. Vérifier que le collaborateur n\'a pas déjà un utilisateur');
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
  checkUserRolePermissions();
}

module.exports = { checkUserRolePermissions };





