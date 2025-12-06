/**
 * SCRIPT DE CORRECTION BASE DE DONNÉES PRODUCTION
 * Correction des statuts de feuilles de temps
 * Date: 2025-12-06
 * 
 * UTILISATION:
 * node scripts/database/fix-timesheet-statut-production.js
 */

const { Pool } = require('pg');
require('dotenv').config();

// Configuration de connexion compatible avec DATABASE_URL ou variables individuelles
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

async function fixTimesheetStatutProduction() {
    const client = await pool.connect();

    try {
        console.log('🚀 Début de la correction des statuts de feuilles de temps...\n');

        await client.query('BEGIN');

        // =====================================================
        // 1. VÉRIFICATION DU SCHÉMA time_sheets
        // =====================================================
        console.log('📊 1. Vérification du schéma time_sheets');

        // Vérifier si colonne statut existe
        const statutCheck = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'time_sheets' AND column_name = 'statut'
        `);

        if (statutCheck.rows.length === 0) {
            await client.query(`ALTER TABLE time_sheets ADD COLUMN statut VARCHAR(50) DEFAULT 'brouillon'`);
            console.log('   ✅ Colonne statut ajoutée à time_sheets');
        } else {
            console.log('   ✅ Colonne statut existe déjà');
        }

        // Vérifier et supprimer colonne status si elle existe
        const statusCheck = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'time_sheets' AND column_name = 'status'
        `);

        if (statusCheck.rows.length > 0) {
            await client.query(`ALTER TABLE time_sheets DROP COLUMN status`);
            console.log('   ⚠️  Colonne erronée status supprimée de time_sheets');
        } else {
            console.log('   ✅ Aucune colonne status erronée trouvée');
        }

        // =====================================================
        // 2. MIGRATION DES VALEURS ANGLAISES → FRANÇAISES
        // =====================================================
        console.log('\n📝 2. Migration des valeurs anglaises → françaises');

        const migrations = [
            { from: 'draft', to: 'brouillon' },
            { from: 'saved', to: 'sauvegardé' },
            { from: 'submitted', to: 'soumis' },
            { from: 'approved', to: 'validé' },
            { from: 'rejected', to: 'rejeté' }
        ];

        for (const { from, to } of migrations) {
            const result = await client.query(
                `UPDATE time_sheets SET statut = $1 WHERE statut = $2`,
                [to, from]
            );
            if (result.rowCount > 0) {
                console.log(`   ✅ ${result.rowCount} feuilles: '${from}' → '${to}'`);
            }
        }

        // Mettre les NULL à 'brouillon'
        const nullFix = await client.query(
            `UPDATE time_sheets SET statut = 'brouillon' WHERE statut IS NULL`
        );
        if (nullFix.rowCount > 0) {
            console.log(`   ✅ ${nullFix.rowCount} feuilles: NULL → 'brouillon'`);
        }

        // =====================================================
        // 3. RÉSUMÉ DES STATUTS
        // =====================================================
        console.log('\n📊 3. Résumé des statuts');

        const summary = await client.query(`
            SELECT statut, COUNT(*) as count 
            FROM time_sheets 
            GROUP BY statut 
            ORDER BY statut
        `);

        summary.rows.forEach(row => {
            console.log(`   ${row.statut.padEnd(15)}: ${row.count} feuille(s)`);
        });

        // =====================================================
        // 4. VÉRIFICATION time_entries
        // =====================================================
        console.log('\n🔍 4. Vérification time_entries');

        const entryStatusCheck = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'time_entries' AND column_name = 'status'
        `);

        if (entryStatusCheck.rows.length > 0) {
            await client.query(`ALTER TABLE time_entries DROP COLUMN status`);
            console.log('   ⚠️  Colonne status supprimée de time_entries');
        } else {
            console.log('   ✅ Table time_entries correcte (pas de colonne status)');
        }

        // =====================================================
        // 5. CONTRAINTES ET INDEX
        // =====================================================
        console.log('\n🔒 5. Contraintes et index');

        // Supprimer contrainte si existe
        await client.query(`
            ALTER TABLE time_sheets 
            DROP CONSTRAINT IF EXISTS check_time_sheets_statut_values
        `);

        // Ajouter contrainte
        await client.query(`
            ALTER TABLE time_sheets 
            ADD CONSTRAINT check_time_sheets_statut_values 
            CHECK (statut IN ('brouillon', 'sauvegardé', 'soumis', 'validé', 'rejeté'))
        `);
        console.log('   ✅ Contrainte check_time_sheets_statut_values ajoutée');

        // Créer index
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_time_sheets_statut 
            ON time_sheets(statut)
        `);
        console.log('   ✅ Index idx_time_sheets_statut créé');

        // =====================================================
        // 6. VÉRIFICATIONS FINALES
        // =====================================================
        console.log('\n✅ 6. Vérifications finales');

        const invalidCheck = await client.query(`
            SELECT COUNT(*) as count FROM time_sheets 
            WHERE statut NOT IN ('brouillon', 'sauvegardé', 'soumis', 'validé', 'rejeté')
        `);

        if (parseInt(invalidCheck.rows[0].count) > 0) {
            console.log(`   ⚠️  ATTENTION: ${invalidCheck.rows[0].count} feuilles avec statuts invalides!`);
            throw new Error('Statuts invalides détectés - annulation');
        } else {
            console.log('   ✅ Tous les statuts sont valides');
        }

        await client.query('COMMIT');

        console.log('\n✅ ========================================');
        console.log('✅ CORRECTION TERMINÉE AVEC SUCCÈS!');
        console.log('✅ ========================================\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ ========================================');
        console.error('❌ ERREUR LORS DE LA CORRECTION');
        console.error('❌ ========================================');
        console.error(error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécution
if (require.main === module) {
    fixTimesheetStatutProduction()
        .then(() => {
            console.log('✅ Script terminé');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script échoué:', error.message);
            process.exit(1);
        });
}

module.exports = { fixTimesheetStatutProduction };
