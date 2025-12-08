require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

const INTERNAL_PREVIEW = path.join(__dirname, '../backups/Migration/preview_internal_v7.csv');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrateInternal() {
    console.log('🚀 Starting Internal Activities Migration (Target: internal_activities)...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const rows = [];
        if (fs.existsSync(INTERNAL_PREVIEW)) {
            await new Promise((resolve) => {
                fs.createReadStream(INTERNAL_PREVIEW)
                    .pipe(csv())
                    .on('data', r => rows.push(r))
                    .on('end', resolve);
            });
        }

        console.log(`   Processing ${rows.length} activities...`);
        let created = 0;
        let skipped = 0;

        for (const row of rows) {
            const name = row.ACTIVITY_NAME;
            if (!name) continue;

            const check = await client.query('SELECT id FROM internal_activities WHERE name = $1', [name]);
            if (check.rows.length === 0) {
                // description is nullable? Model InternalActivity suggests just name, description
                await client.query(
                    'INSERT INTO internal_activities (name, description, is_active, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
                    [name, 'Migrated Activity', true]
                );
                created++;
            } else {
                skipped++;
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Internal Activities Migration Complete: ${created} Created, ${skipped} Skipped.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Internal Migration Failed:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateInternal();
