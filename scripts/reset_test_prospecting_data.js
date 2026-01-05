const { Pool } = require('pg');
require('dotenv').config();

// Configuration spécifique pour se connecter à la DB de TEST si lancée localement, 
// ou utilise les variables d'env si lancé sur le serveur.
// ATTENTION: Par défaut, ce script doit être exécuté dans l'environnement de TEST.

const DB_NAME = process.env.DB_NAME;

console.log('⚠️  ATTENTION : CE SCRIPT VA EFFACER LES DONNÉES DE PROSPECTION DE LA BASE :', DB_NAME);
console.log('-------------------------------------------------------------------');
console.log('S\'assurer que vous êtes bien sur l\'environnement de TEST !');
console.log('-------------------------------------------------------------------');

if (!DB_NAME || !DB_NAME.includes('test') && process.env.NODE_ENV !== 'test') {
    // Sécurité basique : on essaye d'éviter de lancer ça sur la prod "ebvision"
    console.warn('⚠️  Nom de base de données suspect ou NODE_ENV non défini à test.');
    console.warn('    DB_NAME:', DB_NAME);
    console.warn('    NODE_ENV:', process.env.NODE_ENV);
    console.warn('    Pour forcer, modifiez le script ou assurez-vous des variables.');
    // On continue mais avec prudence, l'utilisateur du script doit savoir ce qu'il fait
}

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function resetProspectingData() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🧹 Nettoyage des tables de prospection...');

        // 1. Supprimer les campagnes (dépendances potentielles)
        // Vérifier si la table existe d'abord
        console.log('   - Suppression campagnes...');
        await client.query('TRUNCATE TABLE prospecting_campaigns CASCADE');

        // 2. Supprimer les entreprises
        console.log('   - Suppression entreprises...');
        await client.query('TRUNCATE TABLE prospecting_companies CASCADE');

        // 3. Supprimer les sources
        console.log('   - Suppression sources...');
        await client.query('TRUNCATE TABLE prospecting_sources CASCADE');

        // 4. Supprimer les templates
        console.log('   - Suppression templates...');
        await client.query('TRUNCATE TABLE prospecting_templates CASCADE');

        console.log('🌱 Insertion données de test (Fake Data)...');

        // Création Sources
        const sourceRes = await client.query(`
            INSERT INTO prospecting_sources (name, description, created_at)
            VALUES 
                ('Test Source A', 'Source générée pour tests', NOW()),
                ('Test Source B', 'Autre source de test', NOW())
            RETURNING id
        `);
        const sourceId = sourceRes.rows[0].id;

        // Création Entreprises
        await client.query(`
            INSERT INTO prospecting_companies (name, email, phone, website, status, source_id, created_at)
            VALUES 
                ('Entreprise Test 1', 'contact@test1.com', '0102030405', 'https://test1.com', 'NEW', $1, NOW()),
                ('Entreprise Test 2', 'info@test2.com', '0607080910', 'https://test2.com', 'CONTACTED', $1, NOW()),
                ('Entreprise Test 3', 'hello@test3.com', NULL, NULL, 'NEW', $1, NOW())
        `, [sourceId]);

        // Création Templates
        await client.query(`
            INSERT INTO prospecting_templates (name, subject, content, type, created_at)
            VALUES 
                ('Template Intro Test', 'Bonjour {{companyName}}', 'Voici une offre de test.', 'EMAIL', NOW()),
                ('Template Relance Test', 'Re: Bonjour', 'Avez-vous vu notre offre ?', 'EMAIL', NOW())
        `);

        await client.query('COMMIT');
        console.log('✅ Base de données de prospection réinitialisée avec succès !');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur lors de la réinitialisation :', e);
    } finally {
        client.release();
        pool.end();
    }
}

// Check args to confirm
if (process.argv.includes('--force')) {
    resetProspectingData();
} else {
    console.log('❌ Pour exécuter, ajoutez l\'argument --force :');
    console.log('   node scripts/reset_test_prospecting_data.js --force');
}
