const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../../backups/Migration/revue_Mission.csv');

function check() {
    console.log('--- UTF-8 ---');
    const contentUtf8 = fs.readFileSync(CSV_PATH, 'utf-8');
    const linesUtf8 = contentUtf8.split(/\r?\n/).slice(0, 10);
    linesUtf8.forEach(l => {
        if (l.match(/[éèàùêâôîïüç]/) || l.includes('')) console.log(l);
    });

    console.log('\n--- LATIN1 (binary string) ---');
    const contentLatin1 = fs.readFileSync(CSV_PATH, 'latin1');
    const linesLatin1 = contentLatin1.split(/\r?\n/).slice(0, 10);
    linesLatin1.forEach(l => {
        // Log lines that might have accents
        console.log(l);
    });
}
check();
