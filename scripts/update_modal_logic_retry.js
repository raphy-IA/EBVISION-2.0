const fs = require('fs');
const filePath = 'd:/10. Programmation/Projets/EB-Vision 2.0/public/js/time-sheet-modern.js';

try {
    let content = fs.readFileSync(filePath, 'utf16le');

    // 1. Update loadMissions to use /api/missions/planned
    // Since exact match failed, we'll try to replace the function body or use regex.

    // Let's try to find the fetch call with regex and replace it.
    // It likely looks like: fetch('/api/missions'...) or fetch("/api/missions"...)

    // Regex to match fetch('/api/missions... or fetch("/api/missions...
    // We want to replace it with fetch('/api/missions/planned', ...

    // Note: We need to be careful not to replace other fetch calls to /api/missions if they exist (e.g. for admin).
    // But in time-sheet-modern.js, it's likely for the user.

    let updated = false;

    // Try to replace the specific fetch in loadMissions
    // We'll search for the function start, then the fetch inside it.

    const loadMissionsRegex = /(async\s+function\s+loadMissions\s*\(\)\s*\{[\s\S]*?)(fetch\(['"]\/api\/missions)(.*?)(['"])/;

    if (loadMissionsRegex.test(content)) {
        content = content.replace(loadMissionsRegex, (match, p1, p2, p3, p4) => {
            console.log('✅ Found loadMissions fetch. Replacing URL...');
            return `${p1}fetch('/api/missions/planned'${p4}`; // We ignore p3 (query params) and p2 (original start)
        });
        updated = true;
    } else {
        console.log('⚠️ Still could not find loadMissions fetch with regex.');
        // Let's try a broader search for any fetch to /api/missions in the file, 
        // assuming this file is only for the timesheet UI.

        const broadRegex = /fetch\(['"]\/api\/missions(\?.*?)?['"]/;
        if (broadRegex.test(content)) {
            content = content.replace(broadRegex, "fetch('/api/missions/planned'");
            console.log('✅ Replaced a fetch to /api/missions (broad match)');
            updated = true;
        }
    }

    // 2. We already added loadPlannedTasks and the listener in the previous run.
    // But let's verify if we need to re-add them if the previous run failed partially?
    // The previous output said "✅ Added loadPlannedTasks function" and "✅ Hooked up mission change listener".
    // So we just need to fix the loadMissions part.

    if (updated) {
        fs.writeFileSync(filePath, content, 'utf16le');
        console.log('✅ File updated successfully');
    } else {
        console.log('❌ Failed to update loadMissions.');
    }

} catch (e) {
    console.error('Error modifying file:', e);
}
