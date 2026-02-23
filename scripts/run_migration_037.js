/**
 * Script d'exécution de la migration 037 : Templates d'objectifs
 * Usage: node scripts/run_migration_037.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'eb_vision',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function run() {
    const client = await pool.connect();
    try {
        const sqlFile = path.join(__dirname, '..', 'migrations', '037_objective_templates.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('🚀 Exécution de la migration 037_objective_templates.sql...');
        await client.query(sql);
        console.log('✅ Migration 037 exécutée avec succès !');

        // Vérification rapide
        const templates = await client.query('SELECT code, label, category FROM objective_templates ORDER BY sort_order');
        console.log(`\n📋 ${templates.rows.length} templates créés :`);
        templates.rows.forEach(t => {
            console.log(`   [${t.category}] ${t.label} (${t.code})`);
        });

        const metrics = await client.query('SELECT code, label FROM objective_metrics ORDER BY label');
        console.log(`\n📊 ${metrics.rows.length} métriques disponibles :`);
        metrics.rows.forEach(m => {
            console.log(`   - ${m.label} (${m.code})`);
        });

    } catch (err) {
        console.error('❌ Erreur lors de la migration :', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
