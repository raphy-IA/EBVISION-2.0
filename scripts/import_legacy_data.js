require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

// Configuration
const CSV_FILE_PATH = path.join(__dirname, '../backups/Migration/EbVision - Liste des clients.csv');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function importClients() {
    console.log('🚀 Starting Clients Import...');
    console.log(`📂 Reading from: ${CSV_FILE_PATH}`);

    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error(`❌ Error: File not found at ${CSV_FILE_PATH}`);
        process.exit(1);
    }

    const client = await pool.connect();
    let rowsProcessed = 0;
    let rowsImported = 0;
    let rowsSkipped = 0;
    let errors = 0;

    try {
        await client.query('BEGIN');

        const stream = fs.createReadStream(CSV_FILE_PATH).pipe(csv({ separator: ',' }));

        for await (const row of stream) {
            rowsProcessed++;

            // Map fields (CSV columns: #, Nom, Sigle, Secteur, Pays, Administrateur)
            // Note: csv-parser keys depend on header. We'll sanitize keys.
            // "Nom" -> name
            // "Sigle" -> sigle
            // "Secteur" -> industry
            // "Pays" -> country

            const name = row['Nom'] ? row['Nom'].trim() : null;
            const sigle = row['Sigle'] ? row['Sigle'].trim() : null;
            const industry = row['Secteur'] ? row['Secteur'].trim() : null;
            const country = row['Pays'] ? row['Pays'].trim() : null;

            const adminName = row['Administrateur'] ? row['Administrateur'].trim() : null;

            if (!name) {
                console.warn(`⚠️  Row ${rowsProcessed}: Missing Name, skipping.`);
                errors++;
                continue;
            }

            try {
                // Check if exists
                // We assume source_id is not available in this CSV, so we deduplicate by name or sigle
                let existingRes;
                if (sigle) {
                    existingRes = await client.query(
                        'SELECT id FROM companies WHERE sigle = $1 OR name = $2',
                        [sigle, name]
                    );
                } else {
                    existingRes = await client.query(
                        'SELECT id FROM companies WHERE name = $1',
                        [name]
                    );
                }

                if (existingRes.rows.length > 0) {
                    process.stdout.write('S'); // Skipped indicator
                    rowsSkipped++;
                    continue;
                }

                // Insert
                await client.query(
                    `INSERT INTO companies (id, name, sigle, industry, country, admin_name, created_at, updated_at)
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())`,
                    [name, sigle, industry, country, adminName]
                );

                process.stdout.write('.'); // Success indicator
                rowsImported++;

            } catch (err) {
                console.error(`\n❌ Error importing row ${rowsProcessed} (${name}): ${err.message}`);
                errors++;
            }
        }

        await client.query('COMMIT');
        console.log('\n\n✅ Import Completed Successfully!');
        console.log(`📊 Summary:`);
        console.log(`   - Processed: ${rowsProcessed}`);
        console.log(`   - Imported:  ${rowsImported}`);
        console.log(`   - Skipped:   ${rowsSkipped}`);
        console.log(`   - Errors:    ${errors}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Fatal Error during import:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run
importClients();
