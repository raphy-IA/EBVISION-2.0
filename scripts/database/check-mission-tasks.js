#!/usr/bin/env node
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

async function checkMissionTasks() {
    try {
        console.log('\n╔═══════════════════════════════════════════════════════════════╗');
        console.log('║          VÉRIFICATION DES TYPES DE MISSION ET TÂCHES         ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');
        
        // Récupérer tous les types de mission
        const missions = await pool.query(`
            SELECT id, codification, libelle, description 
            FROM mission_types 
            ORDER BY codification
        `);
        
        console.log(`📋 ${missions.rows.length} types de mission trouvés:\n`);
        
        for (const mission of missions.rows) {
            console.log(`🎯 ${mission.codification} - ${mission.libelle}`);
            if (mission.description) {
                console.log(`   Description: ${mission.description}`);
            }
            
            // Vérifier s'il y a des tâches pour ce type via la table de liaison
            const tasks = await pool.query(`
                SELECT t.id, t.code, t.libelle, t.description, 
                       tmt.ordre, t.duree_estimee, tmt.obligatoire
                FROM task_mission_types tmt
                JOIN tasks t ON tmt.task_id = t.id
                WHERE tmt.mission_type_id = $1 
                ORDER BY tmt.ordre
            `, [mission.id]);
            
            if (tasks.rows.length > 0) {
                console.log(`   ✅ ${tasks.rows.length} tâches configurées:`);
                tasks.rows.forEach(t => {
                    const obligatoire = t.obligatoire ? '⚠️ Obligatoire' : 'Optionnel';
                    console.log(`      ${t.ordre}. ${t.libelle} (${t.duree_estimee || 0} jours) - ${obligatoire}`);
                    if (t.description && t.description !== 'Test') {
                        console.log(`         ${t.description}`);
                    }
                });
            } else {
                console.log(`   ⚠️  Aucune tâche configurée`);
            }
            console.log('');
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error(error);
        process.exit(1);
    }
}

checkMissionTasks();
