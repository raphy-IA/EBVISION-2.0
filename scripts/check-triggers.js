require('dotenv').config();
const { pool } = require('../src/utils/database');

async function checkTriggers() {
    try {
        console.log('🔍 Vérification des triggers sur la table clients...\n');
        
        // Vérifier les triggers existants
        const triggersQuery = `
            SELECT 
                trigger_name,
                event_manipulation,
                action_statement,
                action_timing
            FROM information_schema.triggers 
            WHERE event_object_table = 'clients'
            ORDER BY trigger_name;
        `;
        
        const triggersResult = await pool.query(triggersQuery);
        
        console.log('📋 Triggers actifs sur la table clients:');
        console.log('=' .repeat(80));
        
        if (triggersResult.rows.length === 0) {
            console.log('Aucun trigger trouvé sur la table clients.');
        } else {
            triggersResult.rows.forEach((trigger, index) => {
                console.log(`${(index + 1).toString().padStart(2, '0')}. ${trigger.trigger_name.padEnd(30)} | ${trigger.action_timing.padEnd(10)} | ${trigger.event_manipulation.padEnd(10)}`);
                console.log(`    Action: ${trigger.action_statement}`);
                console.log('');
            });
        }
        
        // Vérifier les fonctions
        console.log('📋 Fonctions liées aux triggers:');
        console.log('=' .repeat(80));
        
        const functionsQuery = `
            SELECT 
                routine_name,
                routine_definition
            FROM information_schema.routines 
            WHERE routine_name LIKE '%modified%' OR routine_name LIKE '%updated%'
            ORDER BY routine_name;
        `;
        
        const functionsResult = await pool.query(functionsQuery);
        
        if (functionsResult.rows.length === 0) {
            console.log('Aucune fonction de trigger trouvée.');
        } else {
            functionsResult.rows.forEach((func, index) => {
                console.log(`${(index + 1).toString().padStart(2, '0')}. ${func.routine_name}`);
                console.log(`    Définition: ${func.routine_definition.substring(0, 100)}...`);
                console.log('');
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification des triggers:', error);
    } finally {
        await pool.end();
    }
}

checkTriggers(); 