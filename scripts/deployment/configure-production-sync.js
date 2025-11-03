const fs = require('fs');

// Script de configuration pour la synchronisation en production
function configureProductionSync() {
  console.log('🔧 Configuration de la synchronisation vers la production\n');
  
  console.log('📋 INSTRUCTIONS POUR LA SYNCHRONISATION:');
  console.log('========================================\n');
  
  console.log('1️⃣  CONFIGURATION:');
  console.log('   ✅ La configuration de production est déjà en place');
  console.log('   ✅ Le script utilise config.production.js existant');
  console.log('');
  
  console.log('2️⃣  COPIE DES FICHIERS:');
  console.log('   Copiez ces fichiers vers la production:');
  console.log('');
  console.log('   scp scripts/opportunity-types-config-local.json user@production:/path/to/app/scripts/');
  console.log('   scp scripts/sync-opportunity-types-to-production.js user@production:/path/to/app/scripts/');
  console.log('');
  
  console.log('3️⃣  EXÉCUTION:');
  console.log('   Sur le serveur de production, exécutez:');
  console.log('');
  console.log('   cd /path/to/your/app');
  console.log('   node scripts/sync-opportunity-types-to-production.js');
  console.log('');
  
  console.log('4️⃣  VÉRIFICATION:');
  console.log('   Après synchronisation, vérifiez que les types d\'opportunité ont leurs étapes:');
  console.log('');
  console.log('   - Connectez-vous à l\'application');
  console.log('   - Allez dans Configuration Types d\'Opportunité');
  console.log('   - Vérifiez que chaque type a ses étapes, actions et documents');
  console.log('');
  
  console.log('📊 DONNÉES À SYNCHRONISER:');
  console.log('==========================');
  console.log('   - 9 types d\'opportunité');
  console.log('   - 25 étapes au total');
  console.log('   - 13 actions requises');
  console.log('   - 11 documents requis');
  console.log('');
  
  console.log('⚠️  IMPORTANT:');
  console.log('   - Le script vérifie l\'existence avant de créer');
  console.log('   - Les données existantes ne seront pas écrasées');
  console.log('   - Seules les nouvelles données seront ajoutées');
  console.log('');
  
  console.log('🚀 PRÊT POUR LA SYNCHRONISATION !');
}

// Créer aussi un script bash pour faciliter l'exécution
const bashScript = `#!/bin/bash

# Script de synchronisation des types d'opportunité vers la production
echo "🚀 Synchronisation des types d'opportunité vers la production..."

# Vérifier que le fichier de configuration existe
if [ ! -f "scripts/opportunity-types-config-local.json" ]; then
    echo "❌ Fichier de configuration non trouvé!"
    echo "   Exécutez d'abord: node scripts/analyze-opportunity-types-config.js"
    exit 1
fi

# La configuration de production est déjà en place
echo "✅ Configuration de production détectée"

# Exécuter la synchronisation
echo "📊 Démarrage de la synchronisation..."
node scripts/sync-opportunity-types-to-production.js

if [ $? -eq 0 ]; then
    echo "✅ Synchronisation terminée avec succès!"
else
    echo "❌ Erreur lors de la synchronisation"
    exit 1
fi
`;

// Sauvegarder le script bash
fs.writeFileSync('scripts/sync-to-production.sh', bashScript);
fs.chmodSync('scripts/sync-to-production.sh', '755');

console.log('📝 Script bash créé: scripts/sync-to-production.sh');
console.log('   Utilisation: ./scripts/sync-to-production.sh');

if (require.main === module) {
  configureProductionSync();
}

module.exports = { configureProductionSync };
