const { pool } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

async function runMigration029() {
    try {
        console.log('🚀 Exécution de la migration 029: Création des tables tâches');
        console.log('============================================================');

        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '../database/migrations/029_create_tasks_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📋 Contenu de la migration:');
        console.log('   - Table tasks (tâches)');
        console.log('   - Table task_mission_types (liaison tâches/types)');
        console.log('   - Table mission_tasks (tâches de mission)');
        console.log('   - Table task_assignments (assignations personnel)');
        console.log('   - Index et triggers');
        console.log('   - Données de test (10 tâches)');

        // Exécuter la migration
        console.log('\n🔄 Exécution de la migration...');
        await pool.query(migrationSQL);

        console.log('✅ Migration exécutée avec succès !');

        // Vérifier les tables créées
        console.log('\n🔍 Vérification des tables créées:');
        
        const tables = ['tasks', 'task_mission_types', 'mission_tasks', 'task_assignments'];
        for (const table of tables) {
            const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`   - ${table}: ${result.rows[0].count} enregistrements`);
        }

        // Vérifier les tâches créées
        console.log('\n📊 Tâches créées:');
        const tasksResult = await pool.query(`
            SELECT code, libelle, duree_estimee, priorite 
            FROM tasks 
            ORDER BY code
        `);
        
        tasksResult.rows.forEach(task => {
            console.log(`   - ${task.code}: ${task.libelle} (${task.duree_estimee}h, ${task.priorite})`);
        });

        // Vérifier les associations
        console.log('\n🔗 Associations tâches/types de mission:');
        const associationsResult = await pool.query(`
            SELECT 
                t.code as task_code,
                t.libelle as task_libelle,
                mt.codification as mission_type_code,
                tmt.obligatoire
            FROM task_mission_types tmt
            JOIN tasks t ON tmt.task_id = t.id
            JOIN mission_types mt ON tmt.mission_type_id = mt.id
            ORDER BY mt.codification, tmt.ordre
        `);
        
        associationsResult.rows.forEach(assoc => {
            const obligatoire = assoc.obligatoire ? '(Obligatoire)' : '(Optionnel)';
            console.log(`   - ${assoc.task_code} → ${assoc.mission_type_code} ${obligatoire}`);
        });

        console.log('\n🎉 Migration 029 terminée avec succès !');
        console.log('📋 Prochaines étapes:');
        console.log('   1. Créer le modèle Task.js');
        console.log('   2. Créer les routes API');
        console.log('   3. Créer la page task-templates.html');
        console.log('   4. Intégrer dans la création de missions');

    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Exécuter la migration
runMigration029().catch(console.error); 