/**
 * SCRIPT DE NETTOYAGE COMPLET DES FEUILLES DE TEMPS
 * ⚠️  ATTENTION: Ce script supprime TOUTES les feuilles de temps et entrées
 * 
 * UTILISATION:
 * node scripts/database/clean-all-timesheets.js
 * 
 * Le script demandera une confirmation avant de procéder
 */

const { Pool } = require('pg');
const readline = require('readline');
require('dotenv').config();

// Configuration de connexion
const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'ebvision',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        }
);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askConfirmation(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'yes');
        });
    });
}

async function cleanAllTimesheets() {
    const client = await pool.connect();

    try {
        console.log('\n🗑️  NETTOYAGE COMPLET DES FEUILLES DE TEMPS');
        console.log('═══════════════════════════════════════════\n');

        // Compter avant suppression
        const countsResult = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM time_sheets) as time_sheets_count,
                (SELECT COUNT(*) FROM time_entries) as time_entries_count,
                (SELECT COUNT(*) FROM time_sheet_approvals) as approvals_count
        `);

        const counts = countsResult.rows[0];

        console.log('📊 État actuel de la base de données:');
        console.log(`   - Feuilles de temps    : ${counts.time_sheets_count}`);
        console.log(`   - Entrées de temps     : ${counts.time_entries_count}`);
        console.log(`   - Approbations         : ${counts.approvals_count}`);
        console.log('');

        if (parseInt(counts.time_sheets_count) === 0) {
            console.log('✅ Aucune feuille de temps à supprimer.');
            return;
        }

        // Demander confirmation
        console.log('⚠️  ATTENTION: Cette opération est IRRÉVERSIBLE!');
        console.log('⚠️  Toutes les données suivantes seront DÉFINITIVEMENT supprimées:');
        console.log(`   - ${counts.time_entries_count} entrées de temps`);
        console.log(`   - ${counts.time_sheets_count} feuilles de temps`);
        console.log(`   - ${counts.approvals_count} approbations`);
        console.log('');

        const confirmed = await askConfirmation('Êtes-vous sûr de vouloir continuer? (oui/non): ');

        if (!confirmed) {
            console.log('\n❌ Opération annulée par l\'utilisateur.');
            return;
        }

        // Double confirmation pour la sécurité
        const doubleConfirmed = await askConfirmation('⚠️  DERNIÈRE CONFIRMATION - Tapez "oui" pour confirmer: ');

        if (!doubleConfirmed) {
            console.log('\n❌ Opération annulée par l\'utilisateur.');
            return;
        }

        console.log('\n🗑️  Suppression en cours...\n');

        await client.query('BEGIN');

        // 1. Supprimer les approbations
        console.log('📝 1. Suppression des approbations...');
        const approvalsDeleted = await client.query('DELETE FROM time_sheet_approvals');
        console.log(`   ✅ ${approvalsDeleted.rowCount} approbation(s) supprimée(s)`);

        // 2. Supprimer les entrées de temps
        console.log('\n📝 2. Suppression des entrées de temps...');
        const entriesDeleted = await client.query('DELETE FROM time_entries');
        console.log(`   ✅ ${entriesDeleted.rowCount} entrée(s) supprimée(s)`);

        // 3. Supprimer les feuilles de temps
        console.log('\n📝 3. Suppression des feuilles de temps...');
        const sheetsDeleted = await client.query('DELETE FROM time_sheets');
        console.log(`   ✅ ${sheetsDeleted.rowCount} feuille(s) supprimée(s)`);

        // 4. Reset des séquences (optionnel)
        console.log('\n📝 4. Réinitialisation des séquences (si applicable)...');
        // Note: Les IDs sont des UUIDs, pas de séquences à reset
        console.log('   ℹ️  Pas de séquences à réinitialiser (UUIDs utilisés)');

        await client.query('COMMIT');

        console.log('\n✅ ========================================');
        console.log('✅ NETTOYAGE TERMINÉ AVEC SUCCÈS!');
        console.log('✅ ========================================');
        console.log('\n📊 Résumé:');
        console.log(`   - ${approvalsDeleted.rowCount} approbations supprimées`);
        console.log(`   - ${entriesDeleted.rowCount} entrées de temps supprimées`);
        console.log(`   - ${sheetsDeleted.rowCount} feuilles de temps supprimées`);
        console.log('\n✅ La base de données est maintenant propre!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ ========================================');
        console.error('❌ ERREUR LORS DU NETTOYAGE');
        console.error('❌ ========================================');
        console.error(error);
        throw error;
    } finally {
        client.release();
        rl.close();
        await pool.end();
    }
}

// Exécution
if (require.main === module) {
    cleanAllTimesheets()
        .then(() => {
            console.log('✅ Script terminé');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script échoué:', error.message);
            process.exit(1);
        });
}

module.exports = { cleanAllTimesheets };
