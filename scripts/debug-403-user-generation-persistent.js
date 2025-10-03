const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour diagnostiquer l'erreur 403 persistante
async function debug403UserGenerationPersistent() {
  console.log('🔍 Diagnostic de l\'erreur 403 persistante pour la génération de compte utilisateur...\n');
  
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
    
    // 1. Vérifier l'utilisateur actuel (celui qui fait la requête)
    console.log('👤 VÉRIFICATION DE L\'UTILISATEUR ACTUEL:');
    console.log('=========================================');
    
    const currentUserQuery = `
      SELECT 
        u.id,
        u.login,
        u.nom,
        u.prenom,
        u.role,
        u.collaborateur_id,
        c.nom as collab_nom,
        c.prenom as collab_prenom
      FROM users u
      LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
      WHERE u.login = 'rngos1'
    `;
    
    const currentUserResult = await client.query(currentUserQuery);
    
    if (currentUserResult.rows.length === 0) {
      console.log('❌ Utilisateur rngos1 non trouvé');
      return;
    }
    
    const currentUser = currentUserResult.rows[0];
    console.log(`   ID: ${currentUser.id}`);
    console.log(`   Login: ${currentUser.login}`);
    console.log(`   Nom: ${currentUser.nom}`);
    console.log(`   Prénom: ${currentUser.prenom}`);
    console.log(`   Rôle: ${currentUser.role}`);
    console.log(`   Collaborateur ID: ${currentUser.collaborateur_id}`);
    console.log(`   Collaborateur: ${currentUser.collab_prenom} ${currentUser.collab_nom}`);
    console.log('');
    
    // 2. Vérifier les rôles de l'utilisateur
    console.log('🔐 VÉRIFICATION DES RÔLES UTILISATEUR:');
    console.log('=====================================');
    
    const userRolesQuery = `
      SELECT 
        ur.id,
        ur.user_id,
        ur.role_id,
        r.name as role_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
    `;
    
    const userRolesResult = await client.query(userRolesQuery, [currentUser.id]);
    
    if (userRolesResult.rows.length === 0) {
      console.log('❌ Aucun rôle assigné à l\'utilisateur');
    } else {
      console.log(`✅ ${userRolesResult.rows.length} rôle(s) trouvé(s):`);
      userRolesResult.rows.forEach((role, index) => {
        console.log(`   ${index + 1}. ${role.role_name} (ID: ${role.role_id})`);
      });
    }
    console.log('');
    
    // 3. Vérifier les permissions de l'utilisateur
    console.log('🔑 VÉRIFICATION DES PERMISSIONS UTILISATEUR:');
    console.log('===========================================');
    
    const userPermissionsQuery = `
      SELECT 
        p.code,
        p.name
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1
      ORDER BY p.code
    `;
    
    const userPermissionsResult = await client.query(userPermissionsQuery, [currentUser.id]);
    
    if (userPermissionsResult.rows.length === 0) {
      console.log('❌ Aucune permission directe trouvée');
    } else {
      console.log(`✅ ${userPermissionsResult.rows.length} permission(s) directe(s) trouvée(s):`);
      userPermissionsResult.rows.forEach((perm, index) => {
        console.log(`   ${index + 1}. ${perm.code} - ${perm.name}`);
      });
    }
    console.log('');
    
    // 4. Vérifier les permissions via les rôles
    console.log('🔗 VÉRIFICATION DES PERMISSIONS VIA RÔLES:');
    console.log('=========================================');
    
    const rolePermissionsQuery = `
      SELECT DISTINCT
        p.code,
        p.name,
        r.name as role_name
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN roles r ON rp.role_id = r.id
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = $1
      ORDER BY p.code
    `;
    
    const rolePermissionsResult = await client.query(rolePermissionsQuery, [currentUser.id]);
    
    if (rolePermissionsResult.rows.length === 0) {
      console.log('❌ Aucune permission via rôles trouvée');
    } else {
      console.log(`✅ ${rolePermissionsResult.rows.length} permission(s) via rôles trouvée(s):`);
      rolePermissionsResult.rows.forEach((perm, index) => {
        console.log(`   ${index + 1}. ${perm.code} - ${perm.name} (via ${perm.role_name})`);
      });
    }
    console.log('');
    
    // 5. Vérifier spécifiquement la permission pour générer des comptes
    console.log('🎯 VÉRIFICATION PERMISSION GÉNÉRATION COMPTE:');
    console.log('=============================================');
    
    const generateAccountPermissionQuery = `
      SELECT 
        p.code,
        p.name,
        'direct' as source
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1 AND p.code LIKE '%user%' OR p.code LIKE '%account%' OR p.code LIKE '%generate%'
      
      UNION
      
      SELECT 
        p.code,
        p.name,
        'role' as source
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = $1 AND (p.code LIKE '%user%' OR p.code LIKE '%account%' OR p.code LIKE '%generate%')
    `;
    
    const generateAccountResult = await client.query(generateAccountPermissionQuery, [currentUser.id]);
    
    if (generateAccountResult.rows.length === 0) {
      console.log('❌ Aucune permission liée à la génération de comptes trouvée');
    } else {
      console.log(`✅ Permission(s) liée(s) à la génération de comptes:`);
      generateAccountResult.rows.forEach((perm, index) => {
        console.log(`   ${index + 1}. ${perm.code} - ${perm.name} (${perm.source})`);
      });
    }
    console.log('');
    
    // 6. Vérifier le collaborateur cible
    console.log('🎯 VÉRIFICATION DU COLLABORATEUR CIBLE:');
    console.log('======================================');
    
    const targetCollabQuery = `
      SELECT 
        c.id,
        c.nom,
        c.prenom,
        c.email,
        c.actif,
        u.id as user_id,
        u.login as user_login
      FROM collaborateurs c
      LEFT JOIN users u ON u.collaborateur_id = c.id
      WHERE c.id = 'ea553ce8-63b0-4103-a616-259274946d39'
    `;
    
    const targetCollabResult = await client.query(targetCollabQuery);
    
    if (targetCollabResult.rows.length === 0) {
      console.log('❌ Collaborateur cible non trouvé');
    } else {
      const targetCollab = targetCollabResult.rows[0];
      console.log(`   ID: ${targetCollab.id}`);
      console.log(`   Nom: ${targetCollab.nom}`);
      console.log(`   Prénom: ${targetCollab.prenom}`);
      console.log(`   Email: ${targetCollab.email}`);
      console.log(`   Actif: ${targetCollab.actif}`);
      console.log(`   Utilisateur existant: ${targetCollab.user_id ? 'OUI' : 'NON'}`);
      if (targetCollab.user_id) {
        console.log(`   Login utilisateur: ${targetCollab.user_login}`);
      }
    }
    console.log('');
    
    // 7. Vérifier la route API backend
    console.log('🔍 VÉRIFICATION DE LA ROUTE API BACKEND:');
    console.log('========================================');
    console.log('   Route: POST /api/collaborateurs/:id/generate-user-account');
    console.log('   Collaborateur ID: ea553ce8-63b0-4103-a616-259274946d39');
    console.log('   Utilisateur demandeur: rngos1');
    console.log('');
    
    console.log('📊 RÉSUMÉ DU DIAGNOSTIC:');
    console.log('========================');
    console.log('✅ Utilisateur actuel identifié et vérifié');
    console.log('✅ Rôles et permissions vérifiés');
    console.log('✅ Collaborateur cible identifié');
    console.log('🔍 Vérifiez les logs du serveur backend pour plus de détails');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Diagnostic terminé !');
  }
}

// Exécuter le script
if (require.main === module) {
  debug403UserGenerationPersistent();
}

module.exports = { debug403UserGenerationPersistent };




