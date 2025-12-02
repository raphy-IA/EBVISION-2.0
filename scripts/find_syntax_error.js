const fs = require('fs');
const filePath = 'd:/10. Programmation/Projets/EB-Vision 2.0/public/js/time-sheet-modern.js';

try {
    const content = fs.readFileSync(filePath, 'utf16le');

    // Look for the openAddActivityModal function we modified
    const searchTerm = 'function openAddActivityModal()';
    const index = content.indexOf(searchTerm);

    if (index !== -1) {
        console.log('--- Found openAddActivityModal at position', index);
        console.log('--- Context (500 chars):');
        console.log(content.substring(index, index + 700));
    } else {
        console.log('Could not find openAddActivityModal');
    }

    // Also check for authenticatedFetch in loadMissions
    const loadMissionsIndex = content.indexOf('async function loadMissions()');
    if (loadMissionsIndex !== -1) {
        console.log('\n--- Found loadMissions at position', loadMissionsIndex);
        console.log('--- Context (500 chars):');
        console.log(content.substring(loadMissionsIndex, loadMissionsIndex + 500));
    }

} catch (e) {
    console.error('Error:', e);
}
