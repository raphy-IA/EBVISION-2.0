#!/usr/bin/env node

/**
 * Script de test simple pour vérifier les permissions de pages
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function checkPagePermissions() {
    try {
        // Récupérer les permissions de pages
        const result = await pool.query(`
            SELECT code, name 
            FROM permissions 
            WHERE code LIKE 'page.%' 
            ORDER BY code 
            LIMIT 20
        `);

        console.log('\n=== PERMISSIONS DE PAGES (20 premières) ===\n');
        result.rows.forEach(p => {
            console.log(`${p.code} - ${p.name}`);
        });

        console.log(`\nTotal: ${result.rowCount} permissions affichées`);

        // Compter le total
        const countResult = await pool.query(`
            SELECT COUNT(*) as total 
            FROM permissions 
            WHERE code LIKE 'page.%'
        `);

        console.log(`Total permissions de pages en base: ${countResult.rows[0].total}\n`);

    } catch (error) {
        console.error('Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkPagePermissions();
