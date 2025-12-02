const fs = require('fs');
const filePath = 'd:/10. Programmation/Projets/EB-Vision 2.0/src/routes/time-sheet-approvals.js';
let content = fs.readFileSync(filePath, 'utf8');

const search = `            if (!submittableStatuses.includes(timeSheet.status)) {
                return res.status(400).json({
                    error: 'Cette feuille de temps a déjà été soumise'
                });
            }`;

const replace = `            if (!submittableStatuses.includes(timeSheet.status)) {
                return res.status(400).json({
                    error: 'Cette feuille de temps a déjà été soumise'
                });
            }

            // Vérifier si c'est la semaine actuelle et si on est avant vendredi
            const weekStart = new Date(timeSheet.week_start);
            const today = new Date();
            
            // Calculer le lundi de la semaine actuelle
            const mondayThisWeek = new Date(today);
            mondayThisWeek.setDate(today.getDate() - today.getDay() + 1);
            mondayThisWeek.setHours(0,0,0,0);
            
            // Normaliser weekStart pour comparaison
            const weekStartNormalized = new Date(weekStart);
            weekStartNormalized.setHours(0,0,0,0);
            
            // Si c'est la semaine actuelle (ou future)
            if (weekStartNormalized.getTime() >= mondayThisWeek.getTime()) {
                const currentDay = today.getDay();
                // Si on est avant vendredi (Lundi=1, Mardi=2, Mercredi=3, Jeudi=4)
                if (currentDay >= 1 && currentDay < 5) {
                    return res.status(400).json({
                        error: 'Les feuilles de temps de la semaine en cours ne peuvent être soumises qu\\'à partir du vendredi'
                    });
                }
            }`;

if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Backend restriction applied successfully');
} else {
    console.log('⚠️ Target content not found for backend restriction');
}
