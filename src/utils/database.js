require('dotenv').config();
const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 50, // Augmenté de 20 à 50 pour mieux supporter la charge en production
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Augmenté à 5s pour éviter les timeouts sous forte charge
});

// Test de connexion
async function connectDatabase() {
    try {
        const client = await pool.connect();
        console.log('✅ Connexion à PostgreSQL réussie');

        // Test de requête simple
        const result = await client.query('SELECT NOW()');
        console.log('📅 Heure du serveur:', result.rows[0].now);

        client.release();
        return true;
    } catch (error) {
        console.error('❌ Erreur de connexion à la base de données:', error.message);
        throw error;
    }
}

// Fonction utilitaire pour exécuter des requêtes
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('📊 Requête exécutée:', { text, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la requête:', error);
        throw error;
    }
}

// Fonction pour obtenir un client du pool
async function getClient() {
    return await pool.connect();
}

// Fonction pour fermer le pool
async function closePool() {
    await pool.end();
    console.log('🔒 Pool de connexions fermé');
}

// Gestion des événements du pool
pool.on('connect', (client) => {
    console.log('🔗 Nouvelle connexion établie');
});

pool.on('error', (err, client) => {
    console.error('❌ Erreur inattendue du pool:', err);
});

pool.on('remove', (client) => {
    console.log('🔌 Connexion retirée du pool');
});

module.exports = {
    connectDatabase,
    query,
    getClient,
    closePool,
    pool
}; 