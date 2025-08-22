require('dotenv').config();
const { Pool } = require('pg');

// Utiliser la même configuration que l'application
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function checkTables() {
    try {
        console.log('🔍 Vérification des tables nécessaires pour les rapports de prospection...\n');

        // Vérifier la table prospecting_campaigns
        const campaignsResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'prospecting_campaigns'
            );
        `);
        console.log('✅ Table prospecting_campaigns:', campaignsResult.rows[0].exists ? 'EXISTE' : 'MANQUANTE');

        // Vérifier la table prospecting_templates
        const templatesResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'prospecting_templates'
            );
        `);
        console.log('✅ Table prospecting_templates:', templatesResult.rows[0].exists ? 'EXISTE' : 'MANQUANTE');

        // Vérifier la table business_units
        const buResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'business_units'
            );
        `);
        console.log('✅ Table business_units:', buResult.rows[0].exists ? 'EXISTE' : 'MANQUANTE');

        // Vérifier la table divisions
        const divisionsResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'divisions'
            );
        `);
        console.log('✅ Table divisions:', divisionsResult.rows[0].exists ? 'EXISTE' : 'MANQUANTE');

        // Vérifier la table collaborateurs
        const collabResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'collaborateurs'
            );
        `);
        console.log('✅ Table collaborateurs:', collabResult.rows[0].exists ? 'EXISTE' : 'MANQUANTE');

        // Vérifier la table prospecting_campaign_companies
        const companiesResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'prospecting_campaign_companies'
            );
        `);
        console.log('✅ Table prospecting_campaign_companies:', companiesResult.rows[0].exists ? 'EXISTE' : 'MANQUANTE');

        // Tester une requête simple
        console.log('\n🔍 Test de requête simple...');
        try {
            const testResult = await pool.query('SELECT COUNT(*) FROM prospecting_campaigns');
            console.log('✅ Requête test réussie:', testResult.rows[0].count, 'campagnes trouvées');
        } catch (error) {
            console.log('❌ Erreur lors du test de requête:', error.message);
        }

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkTables();
