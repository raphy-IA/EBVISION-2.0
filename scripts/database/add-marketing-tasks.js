#!/usr/bin/env node
/**
 * Script pour ajouter des tâches au type de mission Marketing
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ewm_db'
});

// Tâches pour une mission de Marketing
const marketingTasks = [
    {
        code: 'AUDIT_MARCHE',
        libelle: 'Audit et analyse de marché',
        description: 'Étude approfondie du marché cible, analyse de la concurrence et identification des opportunités',
        duree_estimee: 15,
        priorite: 'HAUTE',
        obligatoire: true,
        ordre: 1
    },
    {
        code: 'STRATEGIE_MARKETING',
        libelle: 'Élaboration de la stratégie marketing',
        description: 'Définition du positionnement, des objectifs marketing et du plan d\'action stratégique',
        duree_estimee: 20,
        priorite: 'CRITIQUE',
        obligatoire: true,
        ordre: 2
    },
    {
        code: 'PLAN_COMMUNICATION',
        libelle: 'Conception du plan de communication',
        description: 'Création des messages clés, choix des canaux de communication et planification des campagnes',
        duree_estimee: 18,
        priorite: 'HAUTE',
        obligatoire: true,
        ordre: 3
    },
    {
        code: 'CREATION_CONTENU',
        libelle: 'Production de contenu marketing',
        description: 'Création des supports marketing (visuels, textes, vidéos) et validation avec le client',
        duree_estimee: 25,
        priorite: 'HAUTE',
        obligatoire: true,
        ordre: 4
    },
    {
        code: 'SUIVI_PERFORMANCE',
        libelle: 'Suivi et analyse des performances',
        description: 'Mise en place des KPIs, monitoring des campagnes et reporting des résultats',
        duree_estimee: 12,
        priorite: 'MOYENNE',
        obligatoire: false,
        ordre: 5
    }
];

async function addMarketingTasks() {
    const client = await pool.connect();
    
    try {
        console.log('\n╔═══════════════════════════════════════════════════════════════╗');
        console.log('║      AJOUT DES TÂCHES POUR LE TYPE MARKETING                 ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');
        
        await client.query('BEGIN');
        
        // Récupérer l'ID du type de mission Marketing
        const missionTypeResult = await client.query(`
            SELECT id, codification, libelle 
            FROM mission_types 
            WHERE codification = 'MARKETING'
        `);
        
        if (missionTypeResult.rows.length === 0) {
            throw new Error('Type de mission MARKETING non trouvé');
        }
        
        const marketingType = missionTypeResult.rows[0];
        console.log(`🎯 Type de mission trouvé: ${marketingType.codification} - ${marketingType.libelle}`);
        console.log(`   ID: ${marketingType.id}\n`);
        
        let tasksCreated = 0;
        let tasksLinked = 0;
        
        for (const task of marketingTasks) {
            // Vérifier si la tâche existe déjà
            const existingTask = await client.query(`
                SELECT id FROM tasks WHERE code = $1
            `, [task.code]);
            
            let taskId;
            
            if (existingTask.rows.length > 0) {
                taskId = existingTask.rows[0].id;
                console.log(`   ℹ️  Tâche "${task.libelle}" existe déjà`);
            } else {
                // Créer la tâche
                const taskResult = await client.query(`
                    INSERT INTO tasks (code, libelle, description, duree_estimee, priorite, actif, obligatoire)
                    VALUES ($1, $2, $3, $4, $5, true, $6)
                    RETURNING id
                `, [task.code, task.libelle, task.description, task.duree_estimee, task.priorite, task.obligatoire]);
                
                taskId = taskResult.rows[0].id;
                tasksCreated++;
                console.log(`   ✅ Tâche créée: ${task.libelle}`);
            }
            
            // Vérifier si le lien existe déjà
            const existingLink = await client.query(`
                SELECT id FROM task_mission_types 
                WHERE task_id = $1 AND mission_type_id = $2
            `, [taskId, marketingType.id]);
            
            if (existingLink.rows.length === 0) {
                // Créer le lien entre la tâche et le type de mission
                await client.query(`
                    INSERT INTO task_mission_types (task_id, mission_type_id, ordre, obligatoire)
                    VALUES ($1, $2, $3, $4)
                `, [taskId, marketingType.id, task.ordre, task.obligatoire]);
                
                tasksLinked++;
                console.log(`      ↳ Liée au type MARKETING (ordre: ${task.ordre}, ${task.obligatoire ? 'obligatoire' : 'optionnel'})`);
            } else {
                console.log(`      ↳ Déjà liée au type MARKETING`);
            }
        }
        
        await client.query('COMMIT');
        
        console.log('\n╔═══════════════════════════════════════════════════════════════╗');
        console.log('║                        RÉSUMÉ                                 ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log(`   📊 Tâches créées: ${tasksCreated}`);
        console.log(`   🔗 Liens créés: ${tasksLinked}`);
        console.log(`   ✅ Total de tâches pour MARKETING: ${marketingTasks.length}\n`);
        
        // Afficher les tâches configurées
        const finalTasks = await client.query(`
            SELECT t.code, t.libelle, t.duree_estimee, tmt.ordre, tmt.obligatoire
            FROM task_mission_types tmt
            JOIN tasks t ON tmt.task_id = t.id
            WHERE tmt.mission_type_id = $1
            ORDER BY tmt.ordre
        `, [marketingType.id]);
        
        console.log('📋 Tâches configurées pour le type MARKETING:');
        finalTasks.rows.forEach(t => {
            const obligatoire = t.obligatoire ? '⚠️ Obligatoire' : '📌 Optionnel';
            console.log(`   ${t.ordre}. ${t.libelle} (${t.duree_estimee} jours) - ${obligatoire}`);
        });
        
        console.log('\n✅ Configuration terminée avec succès!\n');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

addMarketingTasks();
