require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

const CLIENTS_PREVIEW = path.join(__dirname, '../backups/Migration/preview_clients_filtered_v2.csv');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrateClients() {
    console.log('🚀 Starting Client Migration...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const rows = [];
        if (!fs.existsSync(CLIENTS_PREVIEW)) {
            throw new Error(`Preview file not found: ${CLIENTS_PREVIEW}`);
        }

        await new Promise((resolve, reject) => {
            fs.createReadStream(CLIENTS_PREVIEW)
                .pipe(csv())
                .on('data', (row) => rows.push(row))
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`   Processing ${rows.length} clients...`);
        let created = 0;
        let skipped = 0;

        for (const row of rows) {
            // Row keys: ACTION, CLIENT_NAME, IN_DB?, ADMIN, SECTOR, COUNTRY
            if (row.ACTION === 'CREATE') {
                const name = row.CLIENT_NAME;
                if (!name) continue;

                // Double check existence (idempotency)
                const check = await client.query('SELECT id FROM companies WHERE name = $1', [name]);
                if (check.rows.length === 0) {
                    await client.query(
                        'INSERT INTO companies (name, created_at, updated_at) VALUES ($1, NOW(), NOW())',
                        [name]
                    );
                    created++;
                } else {
                    skipped++;
                }
            } else {
                skipped++;
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Client Migration Complete: ${created} Created, ${skipped} Skipped.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration Failed:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateClients();
