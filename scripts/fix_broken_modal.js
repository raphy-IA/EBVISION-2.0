const fs = require('fs');
const filePath = 'd:/10. Programmation/Projets/EB-Vision 2.0/public/js/time-sheet-modern.js';

try {
    let content = fs.readFileSync(filePath, 'utf16le');

    // The problem is in openAddActivityModal. We need to find the broken function and fix it.
    // Based on the error output, the function is completely messed up.

    // Let's search for the broken openAddActivityModal and replace it with a correct one
    const brokenFunctionRegex = /function openAddActivityModal\(\) \{[\s\S]*?async function loadBusinessUnits\(\)/;

    const correctFunction = `function openAddActivityModal() {
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

    // Reset form
    document.getElementById('activityDate').value = '';
    document.getElementById('activityHours').value = '';
    document.getElementById('activityDescription').value = '';
    document.getElementById('missionSelect').value = '';
    document.getElementById('taskSelect').value = '';
    document.getElementById('typeHeuresSelect').value = 'HC';

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addActivityModal'));
    modal.show();
}

// Charger les business units
async function loadBusinessUnits()`;

    if (brokenFunctionRegex.test(content)) {
        content = content.replace(brokenFunctionRegex, correctFunction);
        console.log('✅ Fixed openAddActivityModal function');

        fs.writeFileSync(filePath, content, 'utf16le');
        console.log('✅ File saved');
    } else {
        console.log('⚠️ Could not match broken function pattern');

        // Let's try a simpler approach - find the function start and manually reconstruct
        const funcStart = 'function openAddActivityModal() {';
        const funcStartIndex = content.indexOf(funcStart);

        if (funcStartIndex !== -1) {
            // Find the next function definition after this
            const nextFuncIndex = content.indexOf('async function loadBusinessUnits()', funcStartIndex);

            if (nextFuncIndex !== -1) {
                // Replace everything between funcStart and the next function
                const before = content.substring(0, funcStartIndex);
                const after = content.substring(nextFuncIndex);

                content = before + correctFunction + after;

                fs.writeFileSync(filePath, content, 'utf16le');
                console.log('✅ Fixed openAddActivityModal function (manual reconstruction)');
            }
        }
    }

} catch (e) {
    console.error('Error:', e);
}
