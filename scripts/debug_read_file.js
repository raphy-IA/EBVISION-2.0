const fs = require('fs');
const filePath = 'd:/10. Programmation/Projets/EB-Vision 2.0/public/js/time-sheet-modern.js';

try {
    const content = fs.readFileSync(filePath, 'utf16le');

    // Find where loadMissions is
    const loadMissionsIndex = content.indexOf('async function loadMissions()');
    if (loadMissionsIndex !== -1) {
        console.log('--- loadMissions context ---');
        // Print 500 chars after function start
        console.log(content.substring(loadMissionsIndex, loadMissionsIndex + 500));
    } else {
        console.log('Could not find loadMissions function definition');
    }

} catch (e) {
    console.error('Error reading file:', e);
}
