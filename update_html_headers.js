
const fs = require('fs');
const path = 'public/objectives-config.html';
let content = fs.readFileSync(path, 'utf8');

// Metrics Table Header
content = content.replace(
    '<th>Description</th>\\s*<th>Sources</th>',
    '<th>Description</th>\\s*<th>Sources</th>\\s*<th>Statut</th>'
);

// Types Table Header
content = content.replace(
    '<th>Catégorie</th>\\s*<th>Configuration</th>',
    '<th>Catégorie</th>\\s*<th>Configuration</th>\\s*<th>Statut</th>'
);

// Units Table Header
content = content.replace(
    '<th>Symbole</th>\\s*<th>Type</th>',
    '<th>Symbole</th>\\s*<th>Type</th>\\s*<th>Statut</th>'
);

// Wait, the above regex might be too fragile if the whitespace is different.
// Let's use simpler exact matches from viewing the file previously.

content = fs.readFileSync(path, 'utf8');

content = content.replace('<th>Sources</th>', '<th>Sources</th>\\n                                                        <th>Statut</th>');
content = content.replace('<th>Configuration</th>', '<th>Configuration</th>\\n                                                        <th>Statut</th>');
content = content.replace('<th>Type</th>', '<th>Type</th>\\n                                                        <th>Statut</th>');

fs.writeFileSync(path, content);
console.log('HTML headers updated');
