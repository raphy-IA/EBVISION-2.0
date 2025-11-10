#!/usr/bin/env node

/**
 * Script pour appliquer automatiquement l'enrichissement au fichier 5-generate-demo-data.js
 */

const fs = require('fs');
const path = require('path');

const originalFile = path.join(__dirname, '5-generate-demo-data.js');
const backupFile = path.join(__dirname, '5-generate-demo-data.js.backup');
const guideFile = path.join(__dirname, 'ENRICHMENT-GUIDE-DEMO-DATA.md');

console.log('\n🚀 Application de l\'enrichissement au script de données de démo...\n');

// 1. Vérifier que le fichier original existe
if (!fs.existsSync(originalFile)) {
    console.error('❌ Fichier original introuvable:', originalFile);
    process.exit(1);
}

// 2. Créer une sauvegarde
console.log('📦 Création d\'une sauvegarde...');
fs.copyFileSync(originalFile, backupFile);
console.log(`   ✓ Sauvegarde créée: ${path.basename(backupFile)}\n`);

// 3. Lire le contenu original
let content = fs.readFileSync(originalFile, 'utf8');

// 4. Modifications
console.log('✏️  Application des modifications...\n');

// 4.1. Mise à jour des statistiques
console.log('   1/7 Mise à jour des statistiques...');
content = content.replace(
    /let stats = \{[\s\S]*?\};/,
    `let stats = {
    businessUnits: 0,
    divisions: 0,
    grades: 0,
    postes: 0,
    collaborateurs: 0,
    users: 0,
    clients: 0,
    missions: 0,
    campaigns: 0,           // NOUVEAU
    opportunities: 0,        // NOUVEAU
    timeEntries: 0,          // NOUVEAU
    invoices: 0              // NOUVEAU
};`
);

// 4.2. Ajouter taux horaire aux collaborateurs
console.log('   2/7 Ajout taux horaires aux collaborateurs...');
content = content.replace(
    /{ nom: 'Dupont', prenom: 'Jean', email: 'jean\.dupont@ewm-demo\.com'/,
    `{ nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@ewm-demo.com', taux: 65`
);

// 4.3. Ajouter nouvelles étapes de génération (avant le résumé)
console.log('   3/7 Ajout des nouvelles étapes de génération...');
const newSteps = `
        // 8. Récupération des données de référence
        console.log('📋 Chargement des données de référence...');
        const oppTypes = await loadOpportunityTypes(pool);
        const fiscalYears = await loadFiscalYears(pool);
        const internalActivities = await loadInternalActivities(pool);
        console.log(\`   ✓ \${oppTypes.length} Types d'opportunités\`);
        console.log(\`   ✓ \${fiscalYears.length} Années fiscales\`);
        console.log(\`   ✓ \${internalActivities.length} Activités internes\\n\`);

        // 9. Campagnes de prospection
        console.log('📣 Création des Campagnes de Prospection...');
        const campaignIds = await createProspectingCampaigns(pool, buIds);
        console.log(\`   ✓ \${stats.campaigns} Campagnes\\n\`);

        // 10. Opportunités
        console.log('💡 Création des Opportunités...');
        const opportunityIds = await createOpportunities(pool, clientIds, buIds, oppTypes, campaignIds);
        console.log(\`   ✓ \${stats.opportunities} Opportunités\\n\`);

        // 11. Récupération des collaborateurs
        const collaborateurIds = await getCollaborateurIds(pool);

        // 12. Time Entries
        console.log('⏱️  Création des Time Entries...');
        await createTimeEntries(pool, missionIds, collaborateurIds, internalActivities, fiscalYears);
        console.log(\`   ✓ \${stats.timeEntries} Time Entries\\n\`);

        // 13. Factures
        console.log('💰 Création des Factures...');
        await createInvoices(pool, missionIds, clientIds);
        console.log(\`   ✓ \${stats.invoices} Factures\\n\`);
`;

content = content.replace(
    /(console\.log\(`   ✓ \$\{stats\.missions\} Missions créées\\n`\);)/,
    `$1${newSteps}`
);

// 4.4. Mise à jour du résumé
console.log('   4/7 Mise à jour du résumé final...');
content = content.replace(
    /(console\.log\(`   ✓ Missions            : \$\{stats\.missions\}`\);)/,
    `$1
        console.log(\`   ✓ Campagnes            : \${stats.campaigns}\`);
        console.log(\`   ✓ Opportunités         : \${stats.opportunities}\`);
        console.log(\`   ✓ Time Entries         : \${stats.timeEntries}\`);
        console.log(\`   ✓ Factures             : \${stats.invoices}\`);`
);

// 4.5. Lire les nouvelles fonctions depuis le guide
console.log('   5/7 Extraction des fonctions depuis le guide...');
if (fs.existsSync(guideFile)) {
    const guideContent = fs.readFileSync(guideFile, 'utf8');
    
    // Extraire toutes les fonctions entre ```javascript et ```
    const functionMatches = guideContent.match(/```javascript\n(async function [\s\S]*?)```/g);
    
    if (functionMatches && functionMatches.length > 0) {
        let newFunctions = '\n// ===============================================\n';
        newFunctions += '// FONCTIONS ENRICHIES (AUTO-GÉNÉRÉES)\n';
        newFunctions += '// ===============================================\n\n';
        
        functionMatches.forEach(match => {
            const func = match.replace(/```javascript\n/, '').replace(/```$/, '');
            newFunctions += func + '\n\n';
        });
        
        // Ajouter avant main()
        content = content.replace(
            /main\(\);/,
            `${newFunctions}\nmain();`
        );
    }
}

// 4.6. Mise à jour de checkExistingData
console.log('   6/7 Mise à jour de checkExistingData...');
content = content.replace(
    /const mapping = \{[\s\S]*?business_units:[\s\S]*?missions: 'missions'[\s\S]*?\};/,
    `const mapping = {
        business_units: 'businessUnits',
        divisions: 'divisions',
        collaborateurs: 'collaborateurs',
        clients: 'clients',
        prospecting_campaigns: 'campaigns',
        opportunities: 'opportunities',
        missions: 'missions',
        time_entries: 'timeEntries',
        invoices: 'invoices'
    };`
);

// 4.7. Mise à jour de l'affichage des données existantes
console.log('   7/7 Mise à jour de l\'affichage des données existantes...');
content = content.replace(
    /(console\.log\(`   Missions        : \$\{existingData\.missions\}`\);)/,
    `$1
        console.log(\`   Campagnes       : \${existingData.campaigns || 0}\`);
        console.log(\`   Opportunités    : \${existingData.opportunities || 0}\`);
        console.log(\`   Time Entries    : \${existingData.timeEntries || 0}\`);
        console.log(\`   Factures        : \${existingData.invoices || 0}\`);`
);

// 5. Sauvegarder le fichier modifié
console.log('\n💾 Sauvegarde du fichier enrichi...');
fs.writeFileSync(originalFile, content, 'utf8');
console.log(`   ✓ Fichier sauvegardé: ${path.basename(originalFile)}\n`);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║    ✅ ENRICHISSEMENT APPLIQUÉ AVEC SUCCÈS !                 ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('📋 PROCHAINES ÉTAPES :');
console.log('═══════════════════════');
console.log('   1. Vérifiez le fichier: 5-generate-demo-data.js');
console.log('   2. Testez le script:    node scripts/database/5-generate-demo-data.js');
console.log('   3. En cas de problème:  Restaurez depuis 5-generate-demo-data.js.backup\n');

console.log('📚 DOCUMENTATION :');
console.log('══════════════════');
console.log('   Guide complet: ENRICHMENT-GUIDE-DEMO-DATA.md\n');




