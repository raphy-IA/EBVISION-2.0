#!/usr/bin/env node
/**
 * Script de vérification des données de référence
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true'
});

async function main() {
    let client;
    
    try {
        client = await pool.connect();
        
        console.log('\n📊 Vérification des données de référence...\n');

        const result = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM secteurs_activite) as secteurs_count,
                (SELECT COUNT(*) FROM pays) as pays_count,
                (SELECT COUNT(*) FROM fiscal_years) as fiscal_years_count,
                (SELECT COUNT(*) FROM opportunity_types) as opportunity_types_count,
                (SELECT COUNT(*) FROM internal_activities) as internal_activities_count,
                (SELECT COUNT(*) FROM tasks) as tasks_count,
                (SELECT COUNT(*) FROM mission_types) as mission_types_count
        `);

        const counts = result.rows[0];
        
        console.log('═══════════════════════════════════════════════');
        console.log(`✓ Secteurs d'activité     : ${counts.secteurs_count}`);
        console.log(`✓ Pays                    : ${counts.pays_count}`);
        console.log(`✓ Années fiscales         : ${counts.fiscal_years_count}`);
        console.log(`✓ Types d'opportunités    : ${counts.opportunity_types_count}`);
        console.log(`✓ Activités internes      : ${counts.internal_activities_count}`);
        console.log(`✓ Tâches                  : ${counts.tasks_count}`);
        console.log(`✓ Types de missions       : ${counts.mission_types_count}`);
        console.log('═══════════════════════════════════════════════\n');

        // Afficher quelques exemples
        const secteurs = await client.query('SELECT nom, code FROM secteurs_activite LIMIT 5');
        if (secteurs.rows.length > 0) {
            console.log('📋 Exemples de secteurs d\'activité :');
            secteurs.rows.forEach(s => console.log(`   - ${s.nom} (${s.code})`));
            console.log();
        }

        const oppTypes = await client.query('SELECT name, code FROM opportunity_types LIMIT 5');
        if (oppTypes.rows.length > 0) {
            console.log('💼 Exemples de types d\'opportunités :');
            oppTypes.rows.forEach(o => console.log(`   - ${o.name} (${o.code})`));
            console.log();
        }

        const intActivities = await client.query('SELECT name FROM internal_activities LIMIT 5');
        if (intActivities.rows.length > 0) {
            console.log('🏢 Activités internes :');
            intActivities.rows.forEach(a => console.log(`   - ${a.name}`));
            console.log();
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

main();




