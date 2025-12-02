const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const routesDir = 'd:/10. Programmation/Projets/EB-Vision 2.0/src/routes';
const files = fs.readdirSync(routesDir);

console.log('Checking all route files for syntax ...\n');

let foundError = false;

for (const file of files) {
    if (file.endsWith('.js')) {
        const filePath = path.join(routesDir, file);
        try {
            execSync(`node -c "${filePath}"`, { encoding: 'utf8' });
            console.log(`✅ ${file}`);
        } catch (e) {
            console.log(`❌ ${file}`);
            console.error(e.stdout || e.stderr || e.message);
            foundError = true;
        }
    }
}

if (!foundError) {
    console.log('\n✅ All route files have valid syntax');
}
