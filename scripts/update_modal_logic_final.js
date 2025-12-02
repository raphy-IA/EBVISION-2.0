const fs = require('fs');
const filePath = 'd:/10. Programmation/Projets/EB-Vision 2.0/public/js/time-sheet-modern.js';

try {
    let content = fs.readFileSync(filePath, 'utf16le');

    // 1. Replace loadMissions function entirely
    // We'll search for the function start and try to find the end or just replace the body if we can match enough context.

    // The debug output showed:
    // async function loadMissions() {
    //    try {
    //        const response = await authenticatedFetch(

    // We will replace this block with our new implementation.
    // We'll use a regex that captures from function start until the closing brace of the try block or similar.
    // But regex for full function replacement is hard.

    // Alternative: We know it calls `authenticatedFetch`.
    // Let's replace `const response = await authenticatedFetch( ... );` with our specific call.
    // But we don't know the arguments exactly.

    // Let's try to find `async function loadMissions() {` and replace the whole function if possible.
    // Since we saw the content, we can try to match the start.

    const oldFunctionStart = "async function loadMissions() {";
    const newFunctionBody = `async function loadMissions() {
    try {
        const response = await authenticatedFetch('/api/missions/planned');
        if (response.ok) {
            const data = await response.json();
            missions = data.data || data;
            populateMissionSelect();
        }
    } catch (error) {
        console.error('Erreur chargement missions:', error);
        showAlert('Erreur lors du chargement des missions', 'danger');
    }
}`;

    // We need to be careful about where the old function ends.
    // Instead of replacing the whole function, let's just replace the fetch line inside it.
    // We saw `const response = await authenticatedFetch(`

    // We'll search for `async function loadMissions() {` and then the first `authenticatedFetch` after it.

    const loadMissionsIndex = content.indexOf(oldFunctionStart);
    if (loadMissionsIndex !== -1) {
        // Find the fetch call after this index
        const fetchIndex = content.indexOf('authenticatedFetch', loadMissionsIndex);
        if (fetchIndex !== -1) {
            // Find the closing parenthesis of the fetch call
            const openParen = content.indexOf('(', fetchIndex);
            const closeParen = content.indexOf(')', openParen);

            // Replace the arguments inside authenticatedFetch(...)
            // We want to replace whatever is inside ( ... ) with '/api/missions/planned'

            const beforeArgs = content.substring(0, openParen + 1);
            const afterArgs = content.substring(closeParen);

            // Wait, this replaces ALL content before/after? No.
            // We want to construct new content.

            const part1 = content.substring(0, openParen + 1);
            const part2 = "'/api/missions/planned'";
            const part3 = content.substring(closeParen);

            // But wait, `authenticatedFetch` might have more args or be multi-line?
            // The debug output showed `authenticatedFetch(` then newline?
            // "const response = await authenticatedFetch(\r\n"

            // Let's be safer. We'll replace the whole line containing `authenticatedFetch` inside `loadMissions`.
            // Actually, replacing the whole function body is cleaner if we can match the closing brace.

            // Let's try to just replace the string "active/" with "planned" if it exists?
            // Or just append the new function at the end and rename the old one? No, existing calls use `loadMissions`.

            // Let's use the regex replacement for the specific fetch call again, but more robustly.
            // We want to replace `authenticatedFetch( ... )` inside `loadMissions`.

            // We'll use a regex that matches `async function loadMissions` ... `authenticatedFetch(` ... `)`

            // But since I can't see the exact args, I'll assume it's a single string arg or template literal.

            // Let's try to replace `authenticatedFetch(`/api/missions/active/${currentUser.id}`)` or similar.
            // I'll try to find `authenticatedFetch` and replace its argument.

            // Let's just overwrite the file with a version where we inject the new function at the end
            // and overwrite the old one by redefining it? No, JS doesn't allow re-declaring `async function`.
            // But we can assign `window.loadMissions = ...` if it was global?

            // Best bet: Replace the `authenticatedFetch` call inside `loadMissions`.
            // I'll search for the `authenticatedFetch` that follows `loadMissions`.

            const substring = content.substring(loadMissionsIndex, loadMissionsIndex + 300);
            const fetchMatch = substring.match(/authenticatedFetch\((.*?)\)/s); // s flag for dot matches newline

            if (fetchMatch) {
                const fullMatch = fetchMatch[0]; // authenticatedFetch(...)
                content = content.replace(fullMatch, "authenticatedFetch('/api/missions/planned')");
                console.log('✅ Replaced authenticatedFetch call in loadMissions');
            } else {
                console.log('⚠️ Could not match authenticatedFetch in loadMissions context');
            }
        }
    }

    // 2. Add loadPlannedTasks if not exists (from previous step, might be there)
    if (!content.includes('async function loadPlannedTasks')) {
        const newFunction = `
async function loadPlannedTasks(missionId) {
    try {
        const response = await authenticatedFetch(\`/api/missions/\${missionId}/planned-tasks\`);
        
        if (!response.ok) throw new Error('Erreur chargement tâches');
        
        const data = await response.json();
        const taskSelect = document.getElementById('taskSelect');
        taskSelect.innerHTML = '<option value="">Sélectionner une tâche</option>';
        
        if (data.success && data.data) {
            data.data.forEach(task => {
                const option = document.createElement('option');
                option.value = task.id;
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
        content += newFunction;
        console.log('✅ Added loadPlannedTasks function');
    }

    // 3. Hook up listener (from previous step)
    // We'll check if we need to add it.
    if (!content.includes('data-listener-attached')) {
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
            console.log('✅ Hooked up mission change listener');
        }
    }

    fs.writeFileSync(filePath, content, 'utf16le');
    console.log('✅ File updated successfully');

} catch (e) {
    console.error('Error modifying file:', e);
}
