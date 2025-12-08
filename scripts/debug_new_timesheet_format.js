const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const FILE = path.join(__dirname, '../backups/Migration/ebvision_times_entries.csv');

async function analyze() {
    console.log("Analyzing", FILE);
    const results = [];
    fs.createReadStream(FILE)
        .pipe(csv({ separator: ';' })) // Looks like semicolon based on grep
        .on('data', (data) => {
            if (results.length < 3) results.push(data);
        })
        .on('end', () => {
            console.log("Headers:", Object.keys(results[0]));
            console.log("Sample Rows:", results);
        });
}

analyze();
