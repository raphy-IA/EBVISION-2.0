#!/bin/bash

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
