const fs = require('fs');
const filePath = 'd:/10. Programmation/Projets/EB-Vision 2.0/public/js/time-sheet-modern.js';

try {
    let content = fs.readFileSync(filePath, 'utf16le');

    // Find loadMissions start
    const loadMissionsIndex = content.indexOf('async function loadMissions()');

    if (loadMissionsIndex !== -1) {
        // Find the authenticatedFetch call after loadMissions start
        // We look for "authenticatedFetch"
        const fetchIndex = content.indexOf('authenticatedFetch', loadMissionsIndex);

        if (fetchIndex !== -1) {
            // Check if it's reasonably close (e.g. within 200 chars) to ensure it's the one inside the function
            if (fetchIndex - loadMissionsIndex < 500) {
                // Find the opening and closing parentheses
                const openParenIndex = content.indexOf('(', fetchIndex);
                const closeParenIndex = content.indexOf(')', openParenIndex);

                if (openParenIndex !== -1 && closeParenIndex !== -1) {
                    // Extract the current call
                    const currentCall = content.substring(fetchIndex, closeParenIndex + 1);
                    console.log('Found current fetch call:', currentCall);

                    // Replace it
                    const newCall = "authenticatedFetch('/api/missions/planned')";

                    // We need to be careful not to replace multiple occurrences if we use replace() string
                    // So we'll splice the string

                    const before = content.substring(0, fetchIndex);
                    const after = content.substring(closeParenIndex + 1);

                    content = before + newCall + after;

                    fs.writeFileSync(filePath, content, 'utf16le');
                    console.log('✅ Successfully updated loadMissions to use /api/missions/planned');
                } else {
                    console.log('❌ Could not find parentheses for authenticatedFetch');
                }
            } else {
                console.log('❌ authenticatedFetch found too far from loadMissions start');
            }
        } else {
            console.log('❌ Could not find authenticatedFetch in loadMissions');
        }
    } else {
        console.log('❌ Could not find loadMissions function');
    }

} catch (e) {
    console.error('Error:', e);
}
