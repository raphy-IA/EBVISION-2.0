const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../../backups/Migration/revue_Mission.csv');

function check() {
    console.log('Checking CSV for replacement char "" ...');
    const content = fs.readFileSync(CSV_PATH, 'utf-8');

    if (content.includes('')) {
        console.log('❌ ALERT: The CSV file contains the "" character!');
        const lines = content.split('\n');
        lines.forEach((l, i) => {
            if (l.includes('')) console.log(`Line ${i + 1}: ${l}`);
        });
    } else {
        console.log('✅ CSV appears clean of "" characters.');
    }
}
check();
