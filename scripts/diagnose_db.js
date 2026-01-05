const { Pool } = require('pg');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME;

console.log('🔍 DIAGNOSTIC BASE DE DONNÉES');
console.log('Target DB:', DB_NAME);

if (!DB_NAME) {
    console.error('❌ DB_NAME manquant dans .env');
    process.exit(1);
}

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function diagnose() {
    const client = await pool.connect();
    try {
        console.log('--- RECHERCHE DE LA CONTRAINTE ---');
        const res = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conname = 'prospecting_templates_type_courrier_check'
        `);

        if (res.rows.length === 0) {
            console.log('❌ Contrainte non trouvée (bizarre car l\'erreur la mentionne).');
            // Listons toutes les contraintes de la table
            const allConstraints = await client.query(`
                SELECT conname, pg_get_constraintdef(oid) as definition
                FROM pg_constraint
                WHERE conrelid = 'prospecting_templates'::regclass
            `);
            console.log('📋 Autres contraintes sur la table prospecting_templates :');
            console.table(allConstraints.rows);
        } else {
            console.log('✅ DÉFINITION TROUVÉE :');
            console.log(res.rows[0].definition);
        }

    } catch (e) {
        console.error('❌ Erreur:', e);
    } finally {
        client.release();
        pool.end();
    }
}

diagnose();
