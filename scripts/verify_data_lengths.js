const fs = require('fs');
const path = require('path');

const FILES = {
    CLIENTS: path.join(__dirname, 'migration_data', '01_clients.json'),
    TIMESHEETS: path.join(__dirname, 'migration_data', '06_timesheets.json'),
    TASKS: path.join(__dirname, 'migration_data', '05_tasks.json'),
    MISSIONS: path.join(__dirname, 'migration_data', '04_missions.json'),
};

function check(file, field) {
    if (!fs.existsSync(file)) return;
    const data = JSON.parse(fs.readFileSync(file));
    let maxLen = 0;
    let maxVal = '';
    data.forEach(item => {
        const val = item[field];
        if (val && typeof val === 'string') {
            if (val.length > maxLen) {
                maxLen = val.length;
                maxVal = val;
            }
        }
    });
    console.log(`File: ${path.basename(file)} | Field: ${field} | Max: ${maxLen}`);
}

check(FILES.CLIENTS, 'sigle');
check(FILES.CLIENTS, 'nom');
check(FILES.MISSIONS, 'statut');
check(FILES.MISSIONS, 'code');
check(FILES.TASKS, 'statut');
check(FILES.TIMESHEETS, 'statut');
