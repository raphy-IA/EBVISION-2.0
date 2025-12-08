const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const FILES = {
    DB: path.join(__dirname, '../backups/Migration/db_collaborateurs_export.csv'),
    TS: path.join(__dirname, '../backups/Migration/ebvision_times_entries.csv')
};

async function debug() {
    console.log("--- DEBUGGING CSV PARSING ---");

    // 1. Check DB Export
    console.log(`\nreading DB: ${FILES.DB}`);
    await new Promise(resolve => {
        fs.createReadStream(FILES.DB)
            .pipe(csv()) // Auto-detect separator? Default is comma. Export used csv-writer (comma).
            .on('headers', (headers) => console.log('DB Headers:', headers))
            .on('data', (row) => {
                const email = row['Email'];
                // Check if row contains Robert or Gregoire
                if (JSON.stringify(row).includes('Robert') || JSON.stringify(row).includes('Gregoire') || JSON.stringify(row).includes('Grégoire')) {
                    console.log(`DB Row Found: [${email}]`);
                    console.log('   Full:', JSON.stringify(row));
                }
            })
            .on('end', resolve);
    });

    // 2. Check Timesheets
    console.log(`\nreading TS: ${FILES.TS}`);
    await new Promise(resolve => {
        fs.createReadStream(FILES.TS, { encoding: 'utf8' })
            .pipe(csv({ separator: ';', skipLines: 1 }))
            .on('headers', (headers) => console.log('TS Headers:', headers))
            .on('data', (row) => {
                // Try different cases just in case
                const email = row['email'] || row['Email'] || row['EMAIL'];
                const name = row['Nom'];

                if ((name && (name.includes('Robert') || name.includes('Gregoire') || name.includes('Grégoire'))) ||
                    (email && email.includes('rsongo'))) {
                    console.log(`TS Row Found: Name=[${name}], Email=[${email}]`);
                    console.log('   Full:', JSON.stringify(row));
                }
            })
            .on('end', resolve);
    });
}

debug();
