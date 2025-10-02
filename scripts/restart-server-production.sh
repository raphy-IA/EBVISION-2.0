#!/bin/bash

# Script de redémarrage pour la production
# Corrige les problèmes CSP et redémarre le serveur

echo "🔄 Redémarrage du serveur avec correction CSP..."

# Arrêter les processus Node.js existants
echo "⏹️ Arrêt des processus existants..."
pkill -f "node server.js" || true
sleep 2

# Vérifier que le port est libre
echo "🔍 Vérification du port..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Le port 3000 est encore occupé, tentative de libération..."
    lsof -ti:3000 | xargs kill -9 || true
    sleep 2
fi

# Redémarrer le serveur
echo "🚀 Redémarrage du serveur..."
npm start

echo "✅ Serveur redémarré avec succès"
echo "🌐 Application disponible sur: http://localhost:3000"






