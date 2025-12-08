const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const FILE = path.join(__dirname, '../backups/Migration/EbVision - Liste des clients.csv');

fs.createReadStream(FILE)
    .pipe(csv())
    .on('data', (row) => {
        console.log('Keys:', Object.keys(row));
        console.log('Row:', row);
        process.exit(0); // Just 1 row
    });
