const fs = require('fs');

// Fichier 1: time-sheet-approvals.js
const filePath1 = 'd:/10. Programmation/Projets/EB-Vision 2.0/src/routes/time-sheet-approvals.js';
let content1 = fs.readFileSync(filePath1, 'utf8');

// Chercher et remplacer dans submit()
const search1 = `            `, [timeSheetId]);

// Réponse de succès`;

const replace1 = `            `, [timeSheetId]);

// Synchroniser le statut de toutes les heures associées
await client.query(\`
                UPDATE time_entries
                SET status = 'submitted'
                WHERE time_sheet_id = $1
            \`, [timeSheetId]);

            // Réponse de succès`;

if (content1.includes(search1)) {
    content1 = content1.replace(search1, replace1);
    fs.writeFileSync(filePath1, content1, 'utf8');
    console.log('✅ Fichier 1 modifié: time-sheet-approvals.js');
} else {
    console.log('⚠️ Fichier 1 déjà modifié ou motif non trouvé');
}

// Fichier 2: TimeSheetApproval.js
const filePath2 = 'd:/10. Programmation/Projets/EB-Vision 2.0/src/models/TimeSheetApproval.js';
let content2 = fs.readFileSync(filePath2, 'utf8');

// Chercher et remplacer dans create()
const search2 = `            `, [status, timeSheetId]);

// Valider la transaction`;

const replace2 = `            `, [status, timeSheetId]);

// Synchroniser le statut de toutes les heures associées
await client.query(\`
                UPDATE time_entries
                SET status = $1
                WHERE time_sheet_id = $2
            \`, [status, timeSheetId]);

            // Valider la transaction`;

if (content2.includes(search2)) {
    content2 = content2.replace(search2, replace2);
    fs.writeFileSync(filePath2, content2, 'utf8');
    console.log('✅ Fichier 2 modifié: TimeSheetApproval.js');
} else {
    console.log('⚠️ Fichier 2 déjà modifié ou motif non trouvé');
}

console.log('\n✅ Synchronisation de statuts implémentée !');
