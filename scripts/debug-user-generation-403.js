const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour diagnostiquer l'erreur 403 lors de la génération de compte utilisateur
async function debugUserGeneration403() {
  console.log('🔍 Diagnostic de l\'erreur 403 - Génération de compte utilisateur...\n');
  
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
    
    // 1. Vérifier le collaborateur
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
        c.created_at,
        u.id as user_id,
        u.login as user_login
      FROM collaborateurs c
      LEFT JOIN users u ON c.id = u.collaborateur_id
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
    console.log(`   Utilisateur associé: ${collab.user_id ? `${collab.user_login} (${collab.user_id})` : 'AUCUN'}`);
    console.log('');
    
    // 2. Vérifier les permissions de l'utilisateur actuel
    console.log('🔐 VÉRIFICATION DES PERMISSIONS:');
    console.log('=================================');
    
    // Simuler l'utilisateur actuel (Ngos Raphaël - ADMIN_IT)
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
    console.log(`   Utilisateur actuel: ${currentUser.prenom} ${currentUser.nom} (${currentUser.login})`);
    console.log(`   Rôle: ${currentUser.role}`);
    console.log(`   Collaborateur ID: ${currentUser.collaborateur_id || 'NULL'}`);
    console.log('');
    
    // 3. Vérifier les permissions pour la génération de compte utilisateur
    console.log('🔍 VÉRIFICATION DES PERMISSIONS SPÉCIFIQUES:');
    console.log('=============================================');
    
    const permissionsQuery = `
      SELECT 
        p.permission_name,
        p.description
      FROM permissions p
      WHERE p.permission_name LIKE '%user%' 
         OR p.permission_name LIKE '%collaborateur%'
         OR p.permission_name LIKE '%generate%'
         OR p.permission_name LIKE '%account%'
      ORDER BY p.permission_name
    `;
    
    const permissionsResult = await client.query(permissionsQuery);
    
    console.log(`📋 Permissions liées aux utilisateurs et collaborateurs:`);
    permissionsResult.rows.forEach((perm, index) => {
      console.log(`   ${index + 1}. ${perm.permission_name}: ${perm.description || 'Pas de description'}`);
    });
    console.log('');
    
    // 4. Vérifier les permissions de l'utilisateur actuel
    console.log('👤 PERMISSIONS DE L\'UTILISATEUR ACTUEL:');
    console.log('=========================================');
    
    const userPermissionsQuery = `
      SELECT 
        p.permission_name,
        p.description
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1
      AND (p.permission_name LIKE '%user%' 
           OR p.permission_name LIKE '%collaborateur%'
           OR p.permission_name LIKE '%generate%'
           OR p.permission_name LIKE '%account%')
      ORDER BY p.permission_name
    `;
    
    const userPermissionsResult = await client.query(userPermissionsQuery, [currentUser.id]);
    
    if (userPermissionsResult.rows.length > 0) {
      console.log(`✅ ${userPermissionsResult.rows.length} permission(s) trouvée(s):`);
      userPermissionsResult.rows.forEach((perm, index) => {
        console.log(`   ${index + 1}. ${perm.permission_name}: ${perm.description || 'Pas de description'}`);
      });
    } else {
      console.log('❌ Aucune permission spécifique trouvée');
    }
    console.log('');
    
    // 5. Vérifier le code backend pour la génération de compte
    console.log('🔍 VÉRIFICATION DU CODE BACKEND:');
    console.log('=================================');
    
    // Chercher la route dans le code
    const fs = require('fs');
    const path = require('path');
    
    try {
      const routesPath = path.join(__dirname, '../src/routes');
      const files = fs.readdirSync(routesPath);
      
      console.log('📁 Fichiers de routes disponibles:');
      files.forEach(file => {
        if (file.endsWith('.js')) {
          console.log(`   - ${file}`);
        }
      });
      console.log('');
      
      // Chercher dans le fichier collaborateurs.js
      const collaborateursRoutePath = path.join(routesPath, 'collaborateurs.js');
      if (fs.existsSync(collaborateursRoutePath)) {
        const content = fs.readFileSync(collaborateursRoutePath, 'utf8');
        
        if (content.includes('generate-user-account')) {
          console.log('✅ Route generate-user-account trouvée dans collaborateurs.js');
          
          // Extraire la section pertinente
          const lines = content.split('\n');
          let inRoute = false;
          let routeLines = [];
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('generate-user-account')) {
              inRoute = true;
              routeLines.push(`   ${i + 1}: ${line.trim()}`);
            } else if (inRoute && line.trim().startsWith('router.')) {
              break;
            } else if (inRoute) {
              routeLines.push(`   ${i + 1}: ${line.trim()}`);
            }
          }
          
          if (routeLines.length > 0) {
            console.log('📋 Code de la route:');
            routeLines.forEach(line => console.log(line));
          }
        } else {
          console.log('❌ Route generate-user-account non trouvée dans collaborateurs.js');
        }
      } else {
        console.log('❌ Fichier collaborateurs.js non trouvé');
      }
    } catch (error) {
      console.log('❌ Erreur lors de la lecture des fichiers:', error.message);
    }
    console.log('');
    
    // 6. Recommandations
    console.log('💡 RECOMMANDATIONS:');
    console.log('===================');
    
    console.log('❌ PROBLÈME IDENTIFIÉ:');
    console.log('   Erreur 403 lors de la génération de compte utilisateur');
    console.log('');
    console.log('🔧 SOLUTIONS POSSIBLES:');
    console.log('   1. Vérifier que l\'utilisateur a les permissions nécessaires');
    console.log('   2. Vérifier que la route backend est correctement configurée');
    console.log('   3. Vérifier que l\'authentification fonctionne correctement');
    console.log('   4. Vérifier que le collaborateur n\'a pas déjà un utilisateur associé');
    console.log('');
    
    if (collab.user_id) {
      console.log('⚠️  ATTENTION:');
      console.log('   Le collaborateur a déjà un utilisateur associé');
      console.log('   Cela peut causer l\'erreur 403');
    } else {
      console.log('✅ Le collaborateur n\'a pas d\'utilisateur associé');
      console.log('   La génération devrait être possible');
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
  debugUserGeneration403();
}

module.exports = { debugUserGeneration403 };














