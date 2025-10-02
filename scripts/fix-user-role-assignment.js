const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour corriger l'assignation des rôles utilisateur
async function fixUserRoleAssignment() {
  console.log('🔧 Correction de l\'assignation des rôles utilisateur...\n');
  
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
    
    await client.query('BEGIN'); // Début de la transaction
    
    // 1. Identifier l'utilisateur actuel
    console.log('👤 IDENTIFICATION DE L\'UTILISATEUR ACTUEL:');
    console.log('============================================');
    
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
    
    if (currentUserResult.rows.length === 0) {
      console.log('❌ Utilisateur actuel non trouvé');
      return;
    }
    
    const currentUser = currentUserResult.rows[0];
    console.log(`   Utilisateur: ${currentUser.prenom} ${currentUser.nom} (${currentUser.login})`);
    console.log(`   Rôle dans users.role: ${currentUser.role}`);
    console.log(`   ID: ${currentUser.id}`);
    console.log('');
    
    // 2. Vérifier les rôles actuels dans user_roles
    console.log('🎭 RÔLES ACTUELS DANS USER_ROLES:');
    console.log('===================================');
    
    const currentRolesQuery = `
      SELECT 
        r.id,
        r.name,
        r.description
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
    `;
    
    const currentRolesResult = await client.query(currentRolesQuery, [currentUser.id]);
    
    if (currentRolesResult.rows.length > 0) {
      console.log(`📋 ${currentRolesResult.rows.length} rôle(s) trouvé(s):`);
      currentRolesResult.rows.forEach((role, index) => {
        console.log(`   ${index + 1}. ${role.name} - ${role.description || 'Pas de description'}`);
      });
    } else {
      console.log('❌ Aucun rôle trouvé dans user_roles');
    }
    console.log('');
    
    // 3. Trouver le rôle ADMIN_IT
    console.log('🔍 RECHERCHE DU RÔLE ADMIN_IT:');
    console.log('===============================');
    
    const adminRoleQuery = `
      SELECT 
        r.id,
        r.name,
        r.description
      FROM roles r
      WHERE r.name = 'ADMIN_IT'
    `;
    
    const adminRoleResult = await client.query(adminRoleQuery);
    
    if (adminRoleResult.rows.length === 0) {
      console.log('❌ Rôle ADMIN_IT non trouvé');
      return;
    }
    
    const adminRole = adminRoleResult.rows[0];
    console.log(`   Rôle trouvé: ${adminRole.name}`);
    console.log(`   Description: ${adminRole.description}`);
    console.log(`   ID: ${adminRole.id}`);
    console.log('');
    
    // 4. Assigner le rôle ADMIN_IT à l'utilisateur
    console.log('🔗 ASSIGNATION DU RÔLE ADMIN_IT:');
    console.log('==================================');
    
    // Vérifier si l'assignation existe déjà
    const existingAssignmentQuery = `
      SELECT id FROM user_roles 
      WHERE user_id = $1 AND role_id = $2
    `;
    
    const existingAssignmentResult = await client.query(existingAssignmentQuery, [currentUser.id, adminRole.id]);
    
    if (existingAssignmentResult.rows.length > 0) {
      console.log('✅ Le rôle ADMIN_IT est déjà assigné à cet utilisateur');
    } else {
      // Assigner le rôle
      const assignRoleQuery = `
        INSERT INTO user_roles (user_id, role_id, created_at)
        VALUES ($1, $2, NOW())
      `;
      
      await client.query(assignRoleQuery, [currentUser.id, adminRole.id]);
      console.log(`✅ Rôle ADMIN_IT assigné à l'utilisateur ${currentUser.login}`);
    }
    console.log('');
    
    // 5. Vérifier l'assignation
    console.log('🔍 VÉRIFICATION DE L\'ASSIGNATION:');
    console.log('===================================');
    
    const verifyAssignmentQuery = `
      SELECT 
        ur.id,
        ur.user_id,
        ur.role_id,
        ur.created_at,
        r.name as role_name,
        r.description as role_description
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND ur.role_id = $2
    `;
    
    const verifyAssignmentResult = await client.query(verifyAssignmentQuery, [currentUser.id, adminRole.id]);
    
    if (verifyAssignmentResult.rows.length > 0) {
      const assignment = verifyAssignmentResult.rows[0];
      console.log('✅ Assignation vérifiée:');
      console.log(`   Utilisateur ID: ${assignment.user_id}`);
      console.log(`   Rôle: ${assignment.role_name} (${assignment.role_id})`);
      console.log(`   Description: ${assignment.role_description}`);
      console.log(`   Assigné le: ${new Date(assignment.created_at).toLocaleString('fr-FR')}`);
    } else {
      console.log('❌ Erreur lors de la vérification de l\'assignation');
    }
    console.log('');
    
    // 6. Vérifier les permissions de l'utilisateur
    console.log('🔐 VÉRIFICATION DES PERMISSIONS:');
    console.log('=================================');
    
    const userPermissionsQuery = `
      SELECT 
        p.id,
        p.code,
        p.name,
        p.description,
        p.category
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1
      ORDER BY p.category, p.code
    `;
    
    const userPermissionsResult = await client.query(userPermissionsQuery, [currentUser.id]);
    
    if (userPermissionsResult.rows.length > 0) {
      console.log(`✅ ${userPermissionsResult.rows.length} permission(s) trouvée(s):`);
      
      // Compter par catégorie
      const permissionsByCategory = {};
      userPermissionsResult.rows.forEach(perm => {
        if (!permissionsByCategory[perm.category]) {
          permissionsByCategory[perm.category] = 0;
        }
        permissionsByCategory[perm.category]++;
      });
      
      Object.keys(permissionsByCategory).forEach(category => {
        console.log(`   📁 ${category}: ${permissionsByCategory[category]} permission(s)`);
      });
      
      // Vérifier les permissions spécifiques pour la génération de compte utilisateur
      const userGenerationPermissions = userPermissionsResult.rows.filter(perm => 
        perm.code.includes('user') || 
        perm.code.includes('collaborateur') || 
        perm.code.includes('generate') || 
        perm.code.includes('account') ||
        perm.code.includes('create')
      );
      
      if (userGenerationPermissions.length > 0) {
        console.log('\n✅ Permissions pour la génération de compte utilisateur:');
        userGenerationPermissions.forEach(perm => {
          console.log(`   - ${perm.name} (${perm.code})`);
        });
      } else {
        console.log('\n❌ Aucune permission spécifique pour la génération de compte utilisateur');
      }
    } else {
      console.log('❌ Aucune permission trouvée');
    }
    
    await client.query('COMMIT'); // Fin de la transaction
    
    console.log('\n📊 RÉSUMÉ DE LA CORRECTION:');
    console.log('=============================');
    console.log('✅ Rôle ADMIN_IT assigné à l\'utilisateur');
    console.log('✅ Permissions activées via le système de rôles');
    console.log('✅ L\'erreur 403 devrait être résolue');
    console.log('✅ La génération de compte utilisateur devrait maintenant fonctionner');
    
  } catch (error) {
    await client.query('ROLLBACK'); // Annuler la transaction en cas d'erreur
    console.error('❌ Erreur lors de la correction:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Correction terminée !');
  }
}

// Exécuter le script
if (require.main === module) {
  fixUserRoleAssignment();
}

module.exports = { fixUserRoleAssignment };



