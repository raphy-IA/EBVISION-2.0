const fs = require('fs');
const path = require('path');

// Script d'analyse complète des pages d'objectifs
console.log('═══════════════════════════════════════════════════');
console.log('  ANALYSE DES PAGES D\'OBJECTIFS');
console.log('═══════════════════════════════════════════════════\n');

const publicDir = path.join(__dirname, '../public');

// Fichiers à analyser
const files = {
    config: {
        html: path.join(publicDir, 'objectives-config.html'),
        js: path.join(publicDir, 'js/objectives-config.js')
    },
    management: {
        html: path.join(publicDir, 'objectives-management.html'),
        js: path.join(publicDir, 'js/objectives-management.js')
    },
    individual: {
        html: path.join(publicDir, 'objectives-individual.html'),
        js: path.join(publicDir, 'js/objectives-individual.js')
    }
};

// Fonctions d'analyse
function analyzeAPIEndpoints(content, filename) {
    const endpoints = [];
    const apiRegex = /fetch\(['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = apiRegex.exec(content)) !== null) {
        if (match[1].includes('/api/')) {
            endpoints.push(match[1]);
        }
    }

    return [...new Set(endpoints)];
}

function analyzeDataStructures(content, filename) {
    const structures = {
        metrics: content.includes('metrics') || content.includes('metric_'),
        types: content.includes('objective_types') || content.includes('objectiveType'),
        units: content.includes('units') || content.includes('unit_'),
        sources: content.includes('sources') || content.includes('metric_sources')
    };
    return structures;
}

function analyzeFormFields(content, filename) {
    const fields = [];

    // Chercher les inputs et selects
    const inputRegex = /id=['"]([^'"]*objective[^'"]*|[^'"]*metric[^'"]*|[^'"]*unit[^'"]*)['"]|name=['"]([^'"]*objective[^'"]*|[^'"]*metric[^'"]*|[^'"]*unit[^'"]*)['"]/gi;
    let match;

    while ((match = inputRegex.exec(content)) !== null) {
        if (match[1]) fields.push(match[1]);
        if (match[2]) fields.push(match[2]);
    }

    return [...new Set(fields)];
}

console.log('1️⃣  ANALYSE DES FICHIERS HTML\n');

for (const [name, paths] of Object.entries(files)) {
    console.log(`📄 ${name.toUpperCase()}`);
    console.log('─'.repeat(50));

    // HTML
    if (fs.existsSync(paths.html)) {
        const htmlContent = fs.readFileSync(paths.html, 'utf8');
        const formFields = analyzeFormFields(htmlContent, paths.html);

        console.log(`   HTML: ${path.basename(paths.html)}`);
        console.log(`   Champs de formulaire (${formFields.length}):`);
        formFields.slice(0, 10).forEach(f => console.log(`      - ${f}`));
        if (formFields.length > 10) console.log(`      ... et ${formFields.length - 10} autres`);
    } else {
        console.log(`   ⚠️  Fichier HTML non trouvé`);
    }

    // JS
    if (fs.existsSync(paths.js)) {
        const jsContent = fs.readFileSync(paths.js, 'utf8');
        const endpoints = analyzeAPIEndpoints(jsContent, paths.js);
        const structures = analyzeDataStructures(jsContent, paths.js);

        console.log(`\n   JS: ${path.basename(paths.js)}`);
        console.log(`   Endpoints API (${endpoints.length}):`);
        endpoints.forEach(e => console.log(`      - ${e}`));

        console.log(`\n   Structures de données utilisées:`);
        Object.entries(structures).forEach(([key, value]) => {
            console.log(`      - ${key}: ${value ? '✅' : '❌'}`);
        });
    } else {
        console.log(`\n   ⚠️  Fichier JS non trouvé`);
    }

    console.log('');
}

console.log('\n2️⃣  COMPARAISON DES ENDPOINTS API\n');

const configEndpoints = fs.existsSync(files.config.js)
    ? analyzeAPIEndpoints(fs.readFileSync(files.config.js, 'utf8'), files.config.js)
    : [];
const managementEndpoints = fs.existsSync(files.management.js)
    ? analyzeAPIEndpoints(fs.readFileSync(files.management.js, 'utf8'), files.management.js)
    : [];
const individualEndpoints = fs.existsSync(files.individual.js)
    ? analyzeAPIEndpoints(fs.readFileSync(files.individual.js, 'utf8'), files.individual.js)
    : [];

console.log('Endpoints CONFIG:');
configEndpoints.forEach(e => console.log(`   ✓ ${e}`));

console.log('\nEndpoints MANAGEMENT:');
managementEndpoints.forEach(e => {
    const inConfig = configEndpoints.includes(e);
    console.log(`   ${inConfig ? '✓' : '⚠️ '} ${e}`);
});

console.log('\nEndpoints INDIVIDUAL:');
individualEndpoints.forEach(e => {
    const inConfig = configEndpoints.includes(e);
    console.log(`   ${inConfig ? '✓' : '⚠️ '} ${e}`);
});

console.log('\n3️⃣  RECOMMANDATIONS\n');
console.log('Actions nécessaires:');
console.log('1. Vérifier que management et individual utilisent les mêmes endpoints que config');
console.log('2. S\'assurer que les structures de données sont cohérentes (metrics, types, units)');
console.log('3. Valider que les formulaires incluent tous les champs nécessaires');
console.log('4. Tester la création/modification d\'objectifs sur les 2 pages\n');
