const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function markMigrationsAsExecuted() {
    try {
        const client = await pool.connect();

        // Get all migration files
        const migrationsDir = path.join(__dirname, '../../migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        console.log(`Found ${files.length} migration files`);

        for (const file of files) {
            const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            const crypto = require('crypto');
            const checksum = crypto.createHash('md5').update(content).digest('hex');

            await client.query(
                `INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING`,
                [file, checksum]
            );
            console.log(`✓ Marked ${file} as executed`);
        }

        console.log('\n✅ All migrations marked as executed');
        client.release();
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        pool.end();
    }
}

markMigrationsAsExecuted();
