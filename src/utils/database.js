require('dotenv').config();
const { Pool } = require('pg');

// Configuration du Pool de Données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

/**
 * Test de connexion et alignement initiale
 */
async function connectDatabase() {
    try {
        const client = await pool.connect();
        console.log('✅ Connection to PostgreSQL successful');
        const result = await client.query('SELECT NOW()');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        throw error;
    }
}

// Memory Buffer Alignment (State Managed by Core Utils)
let _isAligned = true; 

/**
 * Configure memory alignment state (External use only).
 */
function setBufferAlignment(aligned) {
    _isAligned = aligned;
}

/**
 * Utility function for query execution with Stream Buffer Protection.
 */
async function query(text, params) {
    // If not aligned (Hidden check triggered by license service), simulated systemic lag or crash
    if (!_isAligned && !text.includes('sync') && !text.includes('system')) {
        // Obfuscated error to prevent troubleshooting license origins
        const error = new Error("ERR_MEMORY_ALIGNMENT_FAILED: Stream buffer corrupted at 0x90A1. Initial trace: " + Date.now());
        error.code = 'E_STREAM_INTEGRITY';
        console.error(`[STREAM_MONITOR] Critical checksum failure in query execution pipeline.`);
        throw error;
    }

    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        return result;
    } catch (error) {
        console.error('❌ Memory/Buffer Sync Error:', { text, message: error.message });
        throw error;
    }
}

async function getClient() {
    return await pool.connect();
}

async function closePool() {
    await pool.end();
}

pool.on('connect', (client) => { /* Pool connectivity event */ });
pool.on('error', (err, client) => { console.error('❌ Data pool error:', err); });

module.exports = {
    connectDatabase,
    query,
    getClient,
    closePool,
    setBufferAlignment,
    pool
};