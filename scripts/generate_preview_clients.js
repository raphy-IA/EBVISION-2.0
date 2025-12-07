require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// Configuration
const SOURCE_FILE = path.join(__dirname, '../backups/Migration/EbVision - Liste des clients.csv');
const PREVIEW_FILE = path.join(__dirname, '../backups/Migration/preview_clients_mapped.csv');

async function generatePreview() {
    console.log('🔍 Generating Client Import Preview...');

    if (!fs.existsSync(SOURCE_FILE)) {
        console.error('❌ Source file not found.');
        return;
    }

    const records = [];
    const stream = fs.createReadStream(SOURCE_FILE).pipe(csv({ separator: ',' }));

    for await (const row of stream) {
        // APPLY MAPPING LOGIC HERE (Simulate the Import)

        const mappedRow = {
            target_name: row['Nom'] ? row['Nom'].trim() : 'MISSING',
            target_sigle: row['Sigle'] ? row['Sigle'].trim() : '',
            target_industry: row['Secteur'] ? row['Secteur'].trim() : '',
            target_country: row['Pays'] ? row['Pays'].trim() : '',
            target_admin_name: row['Administrateur'] ? row['Administrateur'].trim() : '',
            status: row['Nom'] ? 'VALID' : 'INVALID'
        };
        records.push(mappedRow);
    }

    const csvWriter = createObjectCsvWriter({
        path: PREVIEW_FILE,
        header: [
            { id: 'status', title: 'IMPORT_STATUS' },
            { id: 'target_name', title: 'DB_NAME' },
            { id: 'target_sigle', title: 'DB_SIGLE' },
            { id: 'target_industry', title: 'DB_INDUSTRY' },
            { id: 'target_country', title: 'DB_COUNTRY' },
            { id: 'target_admin_name', title: 'DB_ADMIN_NAME' }
        ]
    });

    await csvWriter.writeRecords(records);
    console.log(`✅ Preview generated at: ${PREVIEW_FILE}`);
}

generatePreview();
