#!/usr/bin/env node
/**
 * Script de vérification des données d'opportunités
 * Vérifie que les required_documents et required_actions sont bien chargés
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verify() {
    const client = await pool.connect();
    
    try {
        console.log('\n🔍 Vérification des données d\'opportunités...\n');
        
        // Vérifier les types d'opportunités
        const typesResult = await client.query(`
            SELECT id, name, code, description 
            FROM opportunity_types 
            ORDER BY name
        `);
        
        console.log(`📋 Types d'opportunités trouvés: ${typesResult.rows.length}\n`);
        
        for (const type of typesResult.rows) {
            console.log(`\n🎯 ${type.name} (${type.code})`);
            console.log(`   Description: ${type.description}`);
            
            // Récupérer les étapes pour ce type
            const stagesResult = await client.query(`
                SELECT stage_name, stage_order, description, 
                       required_documents, required_actions,
                       max_duration_days, min_duration_days,
                       is_mandatory, validation_required
                FROM opportunity_stage_templates
                WHERE opportunity_type_id = $1
                ORDER BY stage_order
            `, [type.id]);
            
            console.log(`   Étapes: ${stagesResult.rows.length}`);
            
            for (const stage of stagesResult.rows) {
                console.log(`\n   ${stage.stage_order}. ${stage.stage_name}`);
                console.log(`      Description: ${stage.description}`);
                console.log(`      Durée: ${stage.min_duration_days}-${stage.max_duration_days} jours`);
                console.log(`      Obligatoire: ${stage.is_mandatory ? 'Oui' : 'Non'}`);
                console.log(`      Validation requise: ${stage.validation_required ? 'Oui' : 'Non'}`);
                
                // Vérifier required_documents
                if (stage.required_documents) {
                    const docs = typeof stage.required_documents === 'string' 
                        ? JSON.parse(stage.required_documents) 
                        : stage.required_documents;
                    console.log(`      📄 Documents requis (${docs.length}): ${docs.join(', ')}`);
                } else {
                    console.log(`      ⚠️  Aucun document requis`);
                }
                
                // Vérifier required_actions
                if (stage.required_actions) {
                    const actions = typeof stage.required_actions === 'string' 
                        ? JSON.parse(stage.required_actions) 
                        : stage.required_actions;
                    console.log(`      ✅ Actions requises (${actions.length}): ${actions.join(', ')}`);
                } else {
                    console.log(`      ⚠️  Aucune action requise`);
                }
            }
        }
        
        console.log('\n\n✅ Vérification terminée!\n');
        
    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

verify();
