#!/usr/bin/env node

/**
 * SCRIPT UTILITAIRE : NETTOYAGE DES DONNÉES TEMPORELLES
 * ====================================================
 * 
 * Ce script supprime TOUTES les données liées aux temps :
 * - Feuilles de temps (time_sheets)
 * - Saisies de temps (time_entries)
 * - Approbations (time_sheet_approvals)
 * 
 * Usage: node scripts/utils/clear-time-data.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const readline = require('readline');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function clearTimeData() {
    let client;
    try {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║   NETTOYAGE COMPLET DES DONNÉES DE TEMPS   ║');
        console.log('╚════════════════════════════════════════════╝\n');

        console.log('⚠️  ATTENTION : Cette action est IRRÉVERSIBLE !');
        console.log('   Toutes les feuilles de temps et saisies seront supprimées.\n');

        const answer = await new Promise(resolve => {
            rl.question('Êtes-vous sûr de vouloir continuer ? (oui/non) : ', resolve);
        });

        if (answer.toLowerCase() !== 'oui') {
            console.log('❌ Opération annulée.');
            process.exit(0);
        }

        console.log('\n🔄 Connexion à la base de données...');
        client = await pool.connect();

        console.log('🧹 Suppression des données...');

        // On utilise TRUNCATE ... CASCADE pour nettoyer proprement et rapidement
        // On liste les tables potentielles
        const tables = [
            'time_entries',
            'time_sheet_approvals',
            'time_sheets'
        ];

        // Vérifier quelles tables existent réellement avant de tenter le truncate
        const existingTables = [];
        for (const table of tables) {
            const res = await client.query(
                `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )`,
                [table]
            );
            if (res.rows[0].exists) {
                existingTables.push(table);
            }
        }

        if (existingTables.length === 0) {
            console.log('⚠️  Aucune table de temps trouvée.');
        } else {
            const query = `TRUNCATE TABLE ${existingTables.join(', ')} CASCADE`;
            console.log(`   Exécution : ${query}`);
            await client.query(query);
            console.log(`✅ Tables vidées : ${existingTables.join(', ')}`);
        }

        // Réinitialiser les séquences si nécessaire (optionnel, mais propre)
        // Pour les tables avec ID SERIAL, c'est mieux de reset à 1
        console.log('🔄 Réinitialisation des séquences...');
        for (const table of existingTables) {
            try {
                // Essayer de reset la séquence par défaut (tablename_id_seq)
                await client.query(`ALTER SEQUENCE IF EXISTS ${table}_id_seq RESTART WITH 1`);
            } catch (err) {
                // Ignore errors if sequence doesn't follow standard naming
                // console.log(`   Note: Pas de séquence standard pour ${table}`);
            }
        }

        console.log('\n✨ Nettoyage terminé avec succès !\n');

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
    } finally {
        if (client) client.release();
        await pool.end();
        rl.close();
    }
}

// Exécuter
clearTimeData();
