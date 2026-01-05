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

if (!DB_NAME || !DB_NAME.toLowerCase().includes('test')) {
    console.error('⛔ SÉCURITÉ : Ce script refuse de s\'exécuter sur une base qui ne contient pas "test" dans son nom.');
    console.error(`   Base actuelle détectée : "${DB_NAME}"`);
    console.error('   Action annulée pour protéger la production.');
    process.exit(1);
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

        console.log('🧹 Nettoyage des tables de prospection et clients...');

        // Ordre important pour respecter les contraintes de clés étrangères (CASCADE aide mais on reste logique)

        // 1. Tables de liaison et validations
        console.log('   - Suppression validations et liaisons...');
        await client.query('TRUNCATE TABLE prospecting_campaign_validation_companies CASCADE');
        await client.query('TRUNCATE TABLE prospecting_campaign_validations CASCADE');
        await client.query('TRUNCATE TABLE prospecting_campaign_companies CASCADE');

        // 2. Campagnes
        console.log('   - Suppression campagnes...');
        await client.query('TRUNCATE TABLE prospecting_campaigns CASCADE');

        // 3. Entreprises (Prospects) et Sources
        // ATTENTION : Les noms réels des tables sont 'companies' et 'company_sources'
        console.log('   - Suppression prospects (companies)...');
        await client.query('TRUNCATE TABLE companies CASCADE');

        console.log('   - Suppression sources (company_sources)...');
        await client.query('TRUNCATE TABLE company_sources CASCADE');

        // 4. Templates
        console.log('   - Suppression templates...');
        await client.query('TRUNCATE TABLE prospecting_templates CASCADE');

        // 5. CLIENTS (Données sensibles accessibles aux Admin/Manager)
        // On nettoie aussi pour qu'il n'y ait PAS de vraie donnée client dans l'environnement de test
        console.log('   - Suppression clients (DATA SENSIBLE)...');
        await client.query('TRUNCATE TABLE clients CASCADE');
        // Si table contacts existe et n'est pas cascade par clients, on l'ajoute par sécurité
        // await client.query('TRUNCATE TABLE contacts CASCADE'); // (A décommenter si table contacts séparée)


        console.log('🌱 Insertion données de test (Fake Data)...');

        // Création Sources
        const sourceRes = await client.query(`
            INSERT INTO company_sources (name, description)
            VALUES 
                ('Test Source A', 'Source générée pour tests auto'),
                ('Test Source B', 'Autre source de test')
            RETURNING id
        `);
        const sourceId = sourceRes.rows[0].id;

        // Création Entreprises (Prospects)
        await client.query(`
            INSERT INTO companies (name, email, phone, website, source_id, created_at, updated_at)
            VALUES 
                ('Entreprise Test 1', 'contact@test1.com', '0102030405', 'https://test1.com', $1, NOW(), NOW()),
                ('Entreprise Test 2', 'info@test2.com', '0607080910', 'https://test2.com', $1, NOW(), NOW()),
                ('Entreprise Test 3', 'hello@test3.com', NULL, NULL, $1, NOW(), NOW())
        `, [sourceId]);

        // Création Templates
        await client.query(`
            INSERT INTO prospecting_templates (name, subject, body_template, type_courrier, channel, created_at)
            VALUES 
                ('Template Intro Test', 'Bonjour {{companyName}}', 'Voici une offre de test.', 'COURRIER', 'EMAIL', NOW()),
                ('Template Relance Test', 'Re: Bonjour', 'Avez-vous vu notre offre ?', 'COURRIER', 'EMAIL', NOW())
        `);

        // Création d'un CLIENT FACTICE pour que le tableau des clients ne soit pas vide
        await client.query(`
            INSERT INTO clients (nom, email, ville, statut, created_at, updated_at)
            VALUES 
                ('CLIENT FICTIF SARL', 'client@fictif.com', 'Paris', 'ACTIF', NOW(), NOW())
        `);

        await client.query('COMMIT');
        console.log('✅ Base de données TEST réinitialisée et sécurisée (Données réelles supprimées).');

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
