const fs = require('fs');
const path = 'd:/10. Programmation/Projets/EB-Vision 2.0/public/js/time-sheet-modern.js';

try {
    const content = fs.readFileSync(path, 'utf8'); // Try utf8 first
    console.log('Read as UTF8 successfully');
    console.log(content.substring(0, 200));
} catch (e) {
    console.log('Error reading as UTF8:', e.message);
    try {
        const content = fs.readFileSync(path, 'utf16le');
        console.log('Read as UTF16LE successfully');
        console.log(content.substring(0, 200));
    } catch (e2) {
        console.log('Error reading as UTF16LE:', e2.message);
    }
}
