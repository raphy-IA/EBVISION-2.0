const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'migration_data', '06_timesheets.json');
const data = JSON.parse(fs.readFileSync(file));

function isValidDate(dateString) {
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regEx)) return false;  // Invalid format
    const d = new Date(dateString);
    const dNum = d.getTime();
    if (!dNum && dNum !== 0) return false; // NaN value, Invalid date
    return d.toISOString().slice(0, 10) === dateString;
}

console.log("Checking dates...");
let badDates = 0;
data.forEach(sheet => {
    if (!isValidDate(sheet.date_debut)) console.log("BAD START:", sheet.date_debut);
    if (!isValidDate(sheet.date_fin)) console.log("BAD END:", sheet.date_fin);

    sheet.entries.forEach(e => {
        if (!isValidDate(e.date)) {
            console.log("BAD ENTRY DATE:", e.date);
            badDates++;
        }
    });
});
console.log("Finished. Bad dates found:", badDates);
