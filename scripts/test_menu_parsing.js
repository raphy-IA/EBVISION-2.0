const fs = require('fs');
const path = require('path');

async function extractMenuStructure(sidebarPath) {
    const content = fs.readFileSync(sidebarPath, 'utf-8');
    const menuStructure = [];

    // Regex from sync-permissions.js
    const sectionRegex = /<div class="sidebar-section">\s*<div class="sidebar-section-title">\s*<i[^>]*><\/i>\s*([^<]+)<\/div>([\s\S]*?)(?=<div class="sidebar-section">|<\/nav>|$)/g;

    let match;
    while ((match = sectionRegex.exec(content)) !== null) {
        const sectionName = match[1].trim();
        const sectionContent = match[2];

        console.log(`Found section: "${sectionName}"`);

        // Extraire les liens avec data-permission
        const linkRegex = /<a\s+href="([^"]+)"[^>]*data-permission="([^"]+)"[^>]*>\s*<i[^>]*><\/i>\s*([^<]+)/g;
        const links = [];

        let linkMatch;
        while ((linkMatch = linkRegex.exec(sectionContent)) !== null) {
            links.push({
                url: linkMatch[1].trim(),
                permission: linkMatch[2].trim(),
                label: linkMatch[3].trim()
            });
        }

        console.log(`  - Found ${links.length} links`);
        links.forEach(l => console.log(`    - ${l.label} (${l.permission})`));

        if (links.length > 0) {
            menuStructure.push({
                section: sectionName,
                code: sectionName.toUpperCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
                items: links
            });
        }
    }

    console.log(`\nTotal sections detected: ${menuStructure.length}`);
    menuStructure.forEach(s => console.log(`- ${s.section} (${s.items.length} items)`));
    return menuStructure;
}

const sidebarPath = path.join(__dirname, '../public/template-modern-sidebar.html');
console.log(`Testing parsing on: ${sidebarPath}`);
extractMenuStructure(sidebarPath);
