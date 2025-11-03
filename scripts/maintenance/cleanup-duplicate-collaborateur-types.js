const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Script pour nettoyer les doublons dans la table types_collaborateurs
async function cleanupDuplicateCollaborateurTypes() {
  console.log('🧹 Nettoyage des doublons dans types_collaborateurs...\n');
  
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
    
    // 1. Identifier les doublons
    console.log('🔍 IDENTIFICATION DES DOUBLONS:');
    console.log('===============================');
    
    const duplicatesQuery = `
      SELECT nom, COUNT(*) as count, 
             array_agg(id ORDER BY created_at ASC) as ids,
             array_agg(code ORDER BY created_at ASC) as codes,
             array_agg(created_at ORDER BY created_at ASC) as dates
      FROM types_collaborateurs
      GROUP BY nom
      HAVING COUNT(*) > 1
      ORDER BY count DESC, nom ASC
    `;
    
    const duplicatesResult = await client.query(duplicatesQuery);
    
    if (duplicatesResult.rows.length === 0) {
      console.log('✅ Aucun doublon trouvé');
      await client.query('COMMIT');
      return;
    }
    
    console.log(`📊 ${duplicatesResult.rows.length} groupe(s) de doublons trouvé(s):\n`);
    
    let totalDeleted = 0;
    
    for (const duplicate of duplicatesResult.rows) {
      console.log(`🏷️  Groupe: "${duplicate.nom}" (${duplicate.count} occurrences)`);
      
      const ids = duplicate.ids;
      const codes = duplicate.codes;
      const dates = duplicate.dates;
      
      // Garder le premier (le plus ancien) et supprimer les autres
      const keepId = ids[0];
      const deleteIds = ids.slice(1);
      
      console.log(`   ✅ À conserver: ID ${keepId} (${codes[0]}) - ${new Date(dates[0]).toLocaleString('fr-FR')}`);
      
      for (let i = 1; i < ids.length; i++) {
        console.log(`   ❌ À supprimer: ID ${ids[i]} (${codes[i]}) - ${new Date(dates[i]).toLocaleString('fr-FR')}`);
      }
      
      // Vérifier si des collaborateurs utilisent ces types
      for (const deleteId of deleteIds) {
        const usageQuery = `
          SELECT COUNT(*) as count
          FROM collaborateurs
          WHERE type_collaborateur_id = $1
        `;
        const usageResult = await client.query(usageQuery, [deleteId]);
        const usageCount = parseInt(usageResult.rows[0].count);
        
        if (usageCount > 0) {
          console.log(`   ⚠️  Le type ID ${deleteId} est utilisé par ${usageCount} collaborateur(s)`);
          console.log(`   🔄 Migration des collaborateurs vers le type principal...`);
          
          // Migrer les collaborateurs vers le type principal
          const migrateQuery = `
            UPDATE collaborateurs
            SET type_collaborateur_id = $1, updated_at = NOW()
            WHERE type_collaborateur_id = $2
          `;
          await client.query(migrateQuery, [keepId, deleteId]);
          console.log(`   ✅ ${usageCount} collaborateur(s) migré(s) vers le type principal`);
        }
        
        // Supprimer le type en doublon
        const deleteQuery = `
          DELETE FROM types_collaborateurs
          WHERE id = $1
        `;
        await client.query(deleteQuery, [deleteId]);
        console.log(`   🗑️  Type ID ${deleteId} supprimé`);
        totalDeleted++;
      }
      
      console.log('');
    }
    
    // 2. Vérifier les contraintes
    console.log('🔍 VÉRIFICATION DES CONTRAINTES:');
    console.log('=================================');
    
    // Vérifier s'il existe une contrainte UNIQUE sur nom
    const constraintQuery = `
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'types_collaborateurs'
      AND constraint_type = 'UNIQUE'
    `;
    
    const constraintResult = await client.query(constraintQuery);
    
    if (constraintResult.rows.length === 0) {
      console.log('⚠️  Aucune contrainte UNIQUE trouvée sur la table');
      console.log('💡 Recommandation: Ajouter une contrainte UNIQUE sur le nom');
    } else {
      console.log('✅ Contraintes UNIQUE trouvées:');
      constraintResult.rows.forEach(constraint => {
        console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_type}`);
      });
    }
    console.log('');
    
    // 3. Vérification finale
    console.log('🔍 VÉRIFICATION FINALE:');
    console.log('========================');
    
    const finalCheckQuery = `
      SELECT nom, COUNT(*) as count
      FROM types_collaborateurs
      GROUP BY nom
      HAVING COUNT(*) > 1
      ORDER BY count DESC, nom ASC
    `;
    
    const finalCheckResult = await client.query(finalCheckQuery);
    
    if (finalCheckResult.rows.length === 0) {
      console.log('✅ Aucun doublon restant');
    } else {
      console.log('❌ Des doublons persistent:');
      finalCheckResult.rows.forEach(duplicate => {
        console.log(`   - "${duplicate.nom}": ${duplicate.count} occurrence(s)`);
      });
    }
    
    // 4. Afficher les types finaux
    console.log('\n📊 TYPES FINAUX:');
    console.log('=================');
    
    const finalTypesQuery = `
      SELECT id, nom, code, description, statut
      FROM types_collaborateurs
      ORDER BY nom ASC
    `;
    
    const finalTypesResult = await client.query(finalTypesQuery);
    
    console.log(`📈 Total des types: ${finalTypesResult.rows.length}`);
    finalTypesResult.rows.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type.nom} (${type.code}) - ${type.statut}`);
    });
    
    await client.query('COMMIT'); // Fin de la transaction
    
    console.log('\n📊 RÉSUMÉ DU NETTOYAGE:');
    console.log('========================');
    console.log(`   🗑️  Types supprimés: ${totalDeleted}`);
    console.log(`   📈 Types restants: ${finalTypesResult.rows.length}`);
    console.log('   ✅ Nettoyage terminé avec succès');
    
  } catch (error) {
    await client.query('ROLLBACK'); // Annuler la transaction en cas d'erreur
    console.error('❌ Erreur lors du nettoyage:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('\n✅ Nettoyage terminé !');
  }
}

// Exécuter le script
if (require.main === module) {
  cleanupDuplicateCollaborateurTypes();
}

module.exports = { cleanupDuplicateCollaborateurTypes };














