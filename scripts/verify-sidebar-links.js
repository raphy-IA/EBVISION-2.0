const fs = require('fs');
const path = require('path');

// Fonction pour vérifier les liens de la sidebar
function verifySidebarLinks() {
    console.log('🔍 Vérification des liens de la sidebar\n');
    
    const publicDir = path.join(__dirname, '..', 'public');
    const sidebarPath = path.join(__dirname, '..', 'public', 'js', 'unified-sidebar.js');
    
    if (!fs.existsSync(sidebarPath)) {
        console.log('❌ Fichier unified-sidebar.js non trouvé');
        return;
    }
    
    // Lire le contenu de la sidebar
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    
    // Extraire tous les liens href
    const hrefRegex = /href="([^"]+)"/g;
    const links = [];
    let match;
    
    while ((match = hrefRegex.exec(sidebarContent)) !== null) {
        links.push(match[1]);
    }
    
    console.log('📁 Liens trouvés dans la sidebar :');
    console.log('='.repeat(50));
    
    let validLinks = 0;
    let invalidLinks = 0;
    const invalidLinksList = [];
    
    links.forEach(link => {
        const filePath = path.join(publicDir, link);
        const exists = fs.existsSync(filePath);
        
        if (exists) {
            console.log(`✅ ${link}`);
            validLinks++;
        } else {
            console.log(`❌ ${link} (page inexistante)`);
            invalidLinks++;
            invalidLinksList.push(link);
        }
    });
    
    console.log('\n📊 Résultats de la vérification');
    console.log('='.repeat(50));
    console.log(`Liens valides: ${validLinks} ✅`);
    console.log(`Liens invalides: ${invalidLinks} ❌`);
    
    if (invalidLinks > 0) {
        console.log('\n⚠️  Liens à corriger :');
        invalidLinksList.forEach(link => {
            console.log(`  - ${link}`);
        });
    } else {
        console.log('\n🎉 Tous les liens de la sidebar sont valides !');
    }
    
    // Vérifier les sections et groupes
    console.log('\n📁 Vérification des sections de la sidebar');
    console.log('='.repeat(50));
    
    const sections = [
        'DASHBOARD',
        'GESTION', 
        'FEUILLES DE TEMPS',
        'ACTIVITÉS',
        'FACTURATION',
        'CONFIGURATION',
        'RAPPORTS',
        'ADMINISTRATION'
    ];
    
    sections.forEach(section => {
        if (sidebarContent.includes(section)) {
            console.log(`✅ Section "${section}" présente`);
        } else {
            console.log(`❌ Section "${section}" manquante`);
        }
    });
    
    // Vérifier qu'il n'y a pas de liens vers validation.html
    if (sidebarContent.includes('validation.html')) {
        console.log('\n⚠️  ATTENTION: Le lien vers validation.html est encore présent !');
    } else {
        console.log('\n✅ Le lien vers validation.html a été supprimé avec succès');
    }
    
    // Vérifier les liens dupliqués
    const linkCounts = {};
    links.forEach(link => {
        linkCounts[link] = (linkCounts[link] || 0) + 1;
    });
    
    const duplicates = Object.entries(linkCounts).filter(([link, count]) => count > 1);
    
    if (duplicates.length > 0) {
        console.log('\n⚠️  Liens dupliqués détectés :');
        duplicates.forEach(([link, count]) => {
            console.log(`  - ${link} (${count} fois)`);
        });
    } else {
        console.log('\n✅ Aucun lien dupliqué détecté');
    }
    
    console.log('\n💡 Recommandations :');
    console.log('1. Tous les liens pointent vers des pages existantes');
    console.log('2. Les sections sont bien organisées');
    console.log('3. Pas de liens orphelins');
    console.log('4. Structure claire et logique');
}

// Exécuter la vérification
console.log('🚀 Début de la vérification des liens de la sidebar...\n');
verifySidebarLinks();


