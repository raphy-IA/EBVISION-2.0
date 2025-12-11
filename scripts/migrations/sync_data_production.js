/**
 * Production Data Sync Script
 * 
 * Execute this script ON THE PRODUCTION SERVER after git pull.
 * It reads the standard .env file (same as the app) and executes
 * the SQL migration files to sync data.
 * 
 * Usage: node scripts/migrations/sync_data_production.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SQL_DIR = path.resolve(__dirname, '../../exports_sql');

const SQL_FILES = [
    { file: '01_clients.sql', table: 'clients' },
    { file: '02_missions.sql', table: 'missions' },
    { file: '03_mission_tasks.sql', table: 'mission_tasks' },
    { file: '04_equipes_mission.sql', table: 'equipes_mission' },
    { file: '05_internal_activities.sql', table: 'internal_activities' },
    { file: '06_bu_internal_activities.sql', table: 'bu_internal_activities' },
    { file: '07_time_sheets.sql', table: 'time_sheets' },
    { file: '08_time_entries.sql', table: 'time_entries' }
];

async function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

async function syncData() {
    console.log('🚀 Data Sync Script\n');
    console.log('='.repeat(50));
    console.log(`📁 SQL Directory: ${SQL_DIR}`);
    console.log(`🔗 Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    console.log('='.repeat(50));

    // Check if SQL files exist
    const availableFiles = SQL_FILES.filter(f => fs.existsSync(path.join(SQL_DIR, f.file)));

    if (availableFiles.length === 0) {
        console.log('\n❌ No SQL files found in exports_sql/');
        console.log('   Make sure you pushed the exports_sql folder with git.');
        process.exit(1);
    }

    console.log(`\n📋 Found ${availableFiles.length} SQL files to execute:`);
    availableFiles.forEach(f => console.log(`   - ${f.file}`));

    // Confirmation
    const confirm = await prompt('\n⚠️  This will MODIFY THE DATABASE. Continue? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
        console.log('Aborted.');
        process.exit(0);
    }

    const client = await pool.connect();

    try {
        // Get initial counts
        console.log('\n📊 Initial table counts:');
        for (const f of availableFiles) {
            const res = await client.query(`SELECT COUNT(*) as count FROM ${f.table}`);
            console.log(`   ${f.table}: ${res.rows[0].count}`);
        }

        // Execute each file
        for (const { file, table } of availableFiles) {
            console.log(`\n${'─'.repeat(50)}`);
            console.log(`📄 Processing: ${file}`);

            const filePath = path.join(SQL_DIR, file);
            let sqlContent = fs.readFileSync(filePath, 'utf-8');

            // Special handling for time_entries
            if (file === '08_time_entries.sql') {
                const skipDelete = await prompt('   Delete existing time_entries before insert? (yes/no): ');
                if (skipDelete.toLowerCase() !== 'yes') {
                    sqlContent = sqlContent.replace(/DELETE FROM time_entries;/g, '-- SKIPPED DELETE');
                    console.log('   ℹ️  Will MERGE data (not delete existing)');
                } else {
                    console.log('   ⚠️  Will DELETE existing time_entries first');
                }
            }

            // Split into statements
            const statements = sqlContent
                .split(/;\s*\n/)
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            console.log(`   Executing ${statements.length} statements...`);

            let success = 0, errors = 0, skipped = 0;

            for (const stmt of statements) {
                try {
                    await client.query(stmt);
                    success++;
                } catch (e) {
                    if (e.message.includes('duplicate key') || e.code === '23505') {
                        skipped++; // ON CONFLICT DO NOTHING
                    } else {
                        errors++;
                        if (errors <= 3) {
                            console.log(`   ❌ ${e.message.substring(0, 80)}...`);
                        }
                    }
                }
            }

            // Verify count
            const countRes = await client.query(`SELECT COUNT(*) as count FROM ${table}`);

            console.log(`   ✅ Success: ${success}, ⏭️  Skipped: ${skipped}, ❌ Errors: ${errors}`);
            console.log(`   📊 Table ${table} now has: ${countRes.rows[0].count} rows`);
        }

        // Final summary
        console.log(`\n${'='.repeat(50)}`);
        console.log('📊 FINAL TABLE COUNTS:');
        for (const f of availableFiles) {
            const res = await client.query(`SELECT COUNT(*) as count FROM ${f.table}`);
            console.log(`   ${f.table}: ${res.rows[0].count}`);
        }
        console.log('='.repeat(50));
        console.log('✅ Data Sync Complete!');

    } catch (e) {
        console.error('\n❌ Fatal Error:', e.message);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

syncData();
