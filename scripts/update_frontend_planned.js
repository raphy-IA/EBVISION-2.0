const fs = require('fs');
const filePath = 'd:/10. Programmation/Projets/EB-Vision 2.0/public/js/time-sheet-modern.js';

try {
    let content = fs.readFileSync(filePath, 'utf16le');

    // Step 1: Update loadMissions to call /api/missions/planned
    // We need to find where missions are loaded from the API

    // Search for the fetch call in loadMissions
    // Based on earlier debugging, it uses authenticatedFetch

    // Pattern 1: Try to find authenticatedFetch('/api/missions/active/
    const pattern1 = /authenticatedFetch\(['"`]\/api\/missions\/active\/\$\{.*?\}['"`]\)/g;
    if (pattern1.test(content)) {
        content = content.replace(pattern1, "authenticatedFetch('/api/missions/planned')");
        console.log('✅ Step 1: Replaced /api/missions/active/${userId} with /api/missions/planned');
    } else {
        // Pattern 2: Maybe it's just /api/missions
        const pattern2 = /authenticatedFetch\(['"`]\/api\/missions['"`]\)/;
        if (pattern2.test(content)) {
            content = content.replace(pattern2, "authenticatedFetch('/api/missions/planned')");
            console.log('✅ Step 1: Replaced /api/missions with /api/missions/planned');
        } else {
            console.log('⚠️ Step 1: Could not find missions fetch pattern to replace');
        }
    }

    // Step 2: Add loadPlannedTasks function if it doesn't exist
    if (!content.includes('function loadPlannedTasks')) {
        const loadPlannedTasksFunction = `
// Load tasks planned for a specific mission
async function loadPlannedTasks(missionId) {
    try {
        const response = await authenticatedFetch(\`/api/missions/\${missionId}/planned-tasks\`);
        if (!response.ok) throw new Error('Erreur lors du chargement des tâches');
        
        const data = await response.json();
        const taskSelect = document.getElementById('taskSelect');
        
        if (!taskSelect) return;
        
        taskSelect.innerHTML = '<option value="">Sélectionner une tâche</option>';
        
        if (data.success && data.data && data.data.length > 0) {
            data.data.forEach(task => {
                const option = document.createElement('option');
                option.value = task.id;
                option.textContent = task.code ? \`\${task.code} - \${task.nom}\` : task.nom;
                taskSelect.appendChild(option);
            });
            taskSelect.disabled = false;
        } else {
            taskSelect.disabled = true;
        }
    } catch (error) {
        console.error('Erreur chargement tâches planifiées:', error);
        showAlert('Erreur lors du chargement des tâches', 'danger');
    }
}
`;
        // Add before the last line (module.exports or similar)
        const lastLineIndex = content.lastIndexOf('\n');
        content = content.substring(0, lastLineIndex) + loadPlannedTasksFunction + content.substring(lastLineIndex);
        console.log('✅ Step 2: Added loadPlannedTasks function');
    } else {
        console.log('ℹ️ Step 2: loadPlannedTasks already exists');
    }

    // Step 3: Hook up mission select change listener
    // We need to find where missionSelect is set up and add the change listener
    // Look for document.getElementById('missionSelect') or similar

    // We'll add a setup function that can be called when the modal opens
    if (!content.includes('setupMissionTaskCascade')) {
        const setupFunction = `
// Setup mission-task cascade in the modal
function setupMissionTaskCascade() {
    const missionSelect = document.getElementById('missionSelect');
    if (missionSelect && !missionSelect.dataset.cascadeSetup) {
        missionSelect.addEventListener('change', function() {
            const taskSelect = document.getElementById('taskSelect');
            if (this.value) {
                loadPlannedTasks(this.value);
            } else {
                if (taskSelect) {
                    taskSelect.innerHTML = '<option value="">Sélectionner une tâche</option>';
                    taskSelect.disabled = true;
                }
            }
        });
        missionSelect.dataset.cascadeSetup = 'true';
    }
}
`;
        const lastLineIndex = content.lastIndexOf('\n');
        content = content.substring(0, lastLineIndex) + setupFunction + content.substring(lastLineIndex);
        console.log('✅ Step 3: Added setupMissionTaskCascade function');
    } else {
        console.log('ℹ️ Step 3: setupMissionTaskCascade already exists');
    }

    // Step 4: Call setupMissionTaskCascade in openAddActivityModal
    // Find the openAddActivityModal function and add the setup call
    const modalFunctionPattern = /function openAddActivityModal\(\) \{/;
    if (modalFunctionPattern.test(content)) {
        content = content.replace(
            modalFunctionPattern,
            `function openAddActivityModal() {
    setupMissionTaskCascade(); // Setup mission-task cascade`
        );
        console.log('✅ Step 4: Added setupMissionTaskCascade call to openAddActivityModal');
    } else {
        console.log('⚠️ Step 4: Could not find openAddActivityModal function');
    }

    // Save the file
    fs.writeFileSync(filePath, content, 'utf16le');
    console.log('\n✅ File saved successfully');

} catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
}
