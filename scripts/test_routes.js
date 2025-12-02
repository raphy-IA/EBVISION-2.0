const fs = require('fs');
const path = require('path');

const routesDir = './src/routes';
const files = fs.readdirSync(routesDir);

console.log('Checking all route files for syntax errors...\n');

let foundError = false;

for (const file of files) {
    if (file.endsWith('.js')) {
        const filePath = path.join(routesDir, file);
        try {
            require(filePath);
            console.log(`✅ ${file}: OK`);
        } catch (e) {
            console.log(`❌ ${file}: ERROR`);
            console.error(e.message);
            console.error(e.stack);
            foundError = true;
            break;
        }
    }
}

if (!foundError) {
    console.log('\n✅ All route files loaded successfully');
}
