const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '..', 'config', 'maintenance.json');

function enableMaintenance() {
    console.log('🔧 Activation du mode maintenance...');

    if (!fs.existsSync(configPath)) {
        console.error('❌ Fichier de configuration introuvable :', configPath);
        process.exit(1);
    }

    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);

    config.enabled = true;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    console.log('✅ Mode maintenance activé.');
    console.log('ℹ️  Vous pouvez personnaliser le message dans config/maintenance.json');
}

enableMaintenance();
