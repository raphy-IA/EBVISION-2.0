#!/bin/bash

echo "🔄 Redémarrage du serveur EBVision..."

# 1. Tuer TOUS les processus Node.js (plusieurs tentatives)
echo "🛑 Arrêt de tous les processus Node.js..."
killall -9 node 2>/dev/null
sleep 1
pkill -9 node 2>/dev/null
sleep 1

# 2. Vérifier et tuer spécifiquement les processus sur le port 3000
echo "🔍 Vérification du port 3000..."
PORT_PID=$(lsof -ti :3000 2>/dev/null || ss -tulpn | grep :3000 | grep -oP 'pid=\K[0-9]+')
if [ ! -z "$PORT_PID" ]; then
    echo "⚠️ Processus trouvé sur le port 3000 (PID: $PORT_PID), nettoyage..."
    kill -9 $PORT_PID 2>/dev/null
    sleep 2
fi

# 3. Vérification finale
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 || ss -tulpn | grep :3000 >/dev/null 2>&1 ; then
    echo "❌ ERREUR: Le port 3000 est toujours occupé !"
    echo "📋 Processus sur le port 3000:"
    lsof -i :3000 2>/dev/null || ss -tulpn | grep :3000
    exit 1
fi

echo "✅ Port 3000 libéré"

# 4. Démarrer le serveur
echo "🚀 Démarrage du serveur..."
nohup node server.js > logs/server.log 2>&1 &
SERVER_PID=$!
echo "📝 Nouveau PID du serveur: $SERVER_PID"

# 5. Attendre le démarrage
sleep 5

# 6. Vérifier le démarrage
if pgrep -f "node server.js" > /dev/null ; then
    echo "✅ Serveur démarré avec succès!"
    echo ""
    echo "📊 Statut du serveur:"
    ps aux | grep "node server.js" | grep -v grep
    echo ""
    echo "📋 Derniers logs:"
    tail -30 logs/server.log
    echo ""
    echo "🌐 Le serveur devrait être accessible sur https://ebvision.bosssystemsai.com/"
else
    echo "❌ Erreur lors du démarrage du serveur"
    echo ""
    echo "📋 Logs d'erreur:"
    tail -50 logs/server.log
    exit 1
fi


