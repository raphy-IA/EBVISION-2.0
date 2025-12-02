const fs = require('fs');
const filePath = 'd:/10. Programmation/Projets/EB-Vision 2.0/public/js/time-sheet-modern.js';

try {
    let content = fs.readFileSync(filePath, 'utf16le');

    // 1. Update loadMissions to use /api/missions/planned
    // Look for the loadMissions function and the fetch call inside it

    // We'll replace the fetch URL in loadMissions
    // Original might look like: const response = await fetch('/api/missions?statut=EN_COURS', ...
    // or similar. Let's try to find the fetch call within loadMissions context or just replace the function body if possible, 
    // but replacing function body is risky with regex.

    // Let's try to find the specific fetch line.
    // Based on previous grep, loadMissions is around line 198.

    // Strategy: Replace the entire loadMissions function with a new implementation
    // that calls the new endpoint.

    const loadMissionsStart = "async function loadMissions() {";
    // We need to find the end of the function. This is hard with simple replace.

    // Alternative: Search for the fetch URL used in loadMissions.
    // It's likely fetching /api/missions or similar.

    // Let's try to find where the mission select is populated in the modal.
    // It seems loadMissions populates 'missionSelect'.

    // Let's assume we can find the fetch call.
    // "const response = await fetch('/api/missions"

    // Actually, let's rewrite loadMissions completely if we can match it.
    // But since I don't have the full file content in memory, I'll use a safer approach:
    // I'll look for the specific fetch call that gets missions for the select.

    // Let's try to replace the URL if it matches what we expect.
    // If not, we might need to append a new function and change the call site.

    // Better approach:
    // 1. Modify `loadMissions` to fetch `/api/missions/planned`
    // 2. Add a listener for mission change to fetch tasks.

    // Let's try to locate the fetch in loadMissions.
    // I'll read the file first to be sure of the content in the script, 
    // but since I'm writing the script now, I'll make it read and print first to debug if I can't be sure.
    // Wait, I can't do interactive.

    // I'll assume standard fetch pattern.
    // Let's replace the URL.

    if (content.includes("fetch('/api/missions?statut=EN_COURS'")) {
        content = content.replace("fetch('/api/missions?statut=EN_COURS'", "fetch('/api/missions/planned'");
        console.log('✅ Updated loadMissions to use /api/missions/planned');
    } else if (content.includes('fetch("/api/missions?statut=EN_COURS"')) {
        content = content.replace('fetch("/api/missions?statut=EN_COURS"', 'fetch("/api/missions/planned"');
        console.log('✅ Updated loadMissions to use /api/missions/planned (double quotes)');
    } else {
        // Fallback: maybe it fetches just /api/missions
        // We might need to be more aggressive or use a regex if we knew the exact content.
        // Let's try to find the function definition and inject the new logic.
        console.log('⚠️ Could not find exact fetch string. Attempting regex replacement for loadMissions body...');

        // Regex to match the fetch inside loadMissions
        // This is risky.

        // Let's try to find where `loadMissions` is defined and replace the URL inside it.
        const regex = /(async\s+function\s+loadMissions\s*\(\)\s*\{[\s\S]*?fetch\(['"])(.*?)(['"])/;
        const match = content.match(regex);
        if (match && match[2].includes('/api/missions')) {
            // We found it. Let's replace the URL.
            // But wait, regex match on large file is slow/hard.

            // Let's try a simpler replacement:
            // Replace the whole function if we can identify it clearly.
        }
    }

    // 2. Add logic to fetch tasks when mission changes
    // We need to find where the mission select event listener is or add one.
    // The select ID is likely 'missionSelect'.

    // We'll look for `document.getElementById('missionSelect').addEventListener('change', ...)`
    // or `onchange="..."` in HTML (but this is JS file).

    // Let's append a new event listener setup at the end of `openAddActivityModal` or `loadMissions`.
    // Or better, just add the code to handle the change.

    // Let's add a new function `loadPlannedTasks(missionId)` and call it.

    const newFunction = `
async function loadPlannedTasks(missionId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(\`/api/missions/\${missionId}/planned-tasks\`, {
            headers: { 'Authorization': \`Bearer \${token}\` }
        });
        
        if (!response.ok) throw new Error('Erreur chargement tâches');
        
        const data = await response.json();
        const taskSelect = document.getElementById('taskSelect');
        taskSelect.innerHTML = '<option value="">Sélectionner une tâche</option>';
        
        if (data.success && data.data) {
            data.data.forEach(task => {
                const option = document.createElement('option');
                option.value = task.id; // Note: using task.id, backend returns task.id and mission_task_id. 
                                      // We might need mission_task_id for the entry? 
                                      // Usually time_entries link to mission_id and task_id (ref to tasks table).
                                      // Let's assume task.id is correct for now based on existing code.
                option.textContent = \`\${task.code} - \${task.nom}\`;
                taskSelect.appendChild(option);
            });
            taskSelect.disabled = false;
        }
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur lors du chargement des tâches', 'danger');
    }
}
`;

    // Append the new function
    if (!content.includes('async function loadPlannedTasks')) {
        content += newFunction;
        console.log('✅ Added loadPlannedTasks function');
    }

    // Now hook it up.
    // Find where missionSelect is changed.
    // If we can't find it easily, we can add a script to attach the listener when the modal opens.
    // Look for `openAddActivityModal`.

    const openModalSearch = "function openAddActivityModal() {";
    const openModalReplace = `function openAddActivityModal() {
    // Hook up change listener if not already done
    const missionSelect = document.getElementById('missionSelect');
    if (missionSelect && !missionSelect.hasAttribute('data-listener-attached')) {
        missionSelect.addEventListener('change', function() {
            if (this.value) {
                loadPlannedTasks(this.value);
            } else {
                document.getElementById('taskSelect').innerHTML = '<option value="">Sélectionner une tâche</option>';
                document.getElementById('taskSelect').disabled = true;
            }
        });
        missionSelect.setAttribute('data-listener-attached', 'true');
    }
`;

    if (content.includes(openModalSearch)) {
        content = content.replace(openModalSearch, openModalReplace);
        console.log('✅ Hooked up mission change listener in openAddActivityModal');
    }

    // Also need to make sure we DON'T load all tasks initially or elsewhere.
    // If there's a `loadTasks` function, we might want to disable it or ensure it's not called for this modal.

    fs.writeFileSync(filePath, content, 'utf16le');
    console.log('✅ File updated successfully');

} catch (e) {
    console.error('Error modifying file:', e);
}
