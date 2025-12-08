const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Load environment variables manually
const envPath = path.join(__dirname, '..', '.env');
let envVars = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}

const DB_USER = envVars.DB_USER || 'postgres';
const DB_PASS = envVars.DB_PASSWORD || '';
const DB_NAME = envVars.DB_NAME || 'EB-Vision 2.0';
const DB_HOST = envVars.DB_HOST || 'localhost';
const DB_PORT = envVars.DB_PORT || '5432';

const OUTPUT_FILE = 'ebvision_migration_final.sql';

console.log(`🚀 Dumping database ${DB_NAME} to ${OUTPUT_FILE} (Plain SQL format for compatibility)...`);

// Construct command - Plain Text format (-F p) with --no-owner --no-acl to avoid permission errors on prod
const cmd = `pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d "${DB_NAME}" -F p --clean --if-exists --no-owner --no-acl -f "${OUTPUT_FILE}"`;

const child = exec(cmd, {
    env: { ...process.env, PGPASSWORD: DB_PASS },
    cwd: path.join(__dirname, '..')
}, (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ Dump failed: ${error.message}`);
        return;
    }
    if (stderr) console.error(`⚠️ Postgres stderr: ${stderr}`);
    console.log(`✅ Dump created successfully: ${path.resolve(__dirname, '..', OUTPUT_FILE)}`);
});
