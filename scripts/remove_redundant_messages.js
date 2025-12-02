const fs = require('fs');
const filePath = 'd:/10. Programmation/Projets/EB-Vision 2.0/public/js/time-sheet-modern.js';

try {
    let content = fs.readFileSync(filePath, 'utf16le');

    // 1. Fix "0 entrée(s) sauvegardée(s)"
    // Original: showAlert(`${savedCount} entrée(s) sauvegardée(s) avec succès`, 'success');
    // Target: if (savedCount > 0) showAlert(`${savedCount} entrée(s) sauvegardée(s) avec succès`, 'success');

    const saveMsgSearch = "showAlert(`${savedCount} entrée(s) sauvegardée(s) avec succès`, 'success');";
    const saveMsgReplace = "if (savedCount > 0) showAlert(`${savedCount} entrée(s) sauvegardée(s) avec succès`, 'success');";

    if (content.includes(saveMsgSearch)) {
        content = content.replace(saveMsgSearch, saveMsgReplace);
        console.log('✅ Fixed "0 entries saved" message');
    } else {
        console.log('⚠️ "0 entries saved" message not found or already fixed');
    }

    // 2. Remove "Cette feuille de temps ne peut plus être modifiée"
    // We'll comment them out

    const warningMsgSearch1 = "showAlert('Cette feuille de temps ne peut plus être modifiée (statut: ' + currentTimeSheet.status + ')', 'warning');";
    const warningMsgReplace1 = "// showAlert('Cette feuille de temps ne peut plus être modifiée (statut: ' + currentTimeSheet.status + ')', 'warning');";

    if (content.includes(warningMsgSearch1)) {
        content = content.replace(warningMsgSearch1, warningMsgReplace1);
        console.log('✅ Removed warning message 1');
    }

    const warningMsgSearch2 = "showAlert('Cette feuille de temps ne peut plus être modifiée (statut: ' + getStatusText(currentTimeSheet.status) + ')', 'warning');";
    const warningMsgReplace2 = "// showAlert('Cette feuille de temps ne peut plus être modifiée (statut: ' + getStatusText(currentTimeSheet.status) + ')', 'warning');";

    if (content.includes(warningMsgSearch2)) {
        content = content.replace(warningMsgSearch2, warningMsgReplace2);
        console.log('✅ Removed warning message 2');
    }

    fs.writeFileSync(filePath, content, 'utf16le');
    console.log('✅ File updated successfully');

} catch (e) {
    console.error('Error modifying file:', e);
}
