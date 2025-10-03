#!/bin/bash

# Script de redémarrage du serveur EBVision
# Ce script ne se modifie jamais pour éviter les conflits Git

# Configuration
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/server.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Créer le dossier logs s'il n'existe pas
mkdir -p "$LOG_DIR"

# Fonction de logging
log_message() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

log_message "🔄 Redémarrage du serveur EBVision..."

# 1. Tuer TOUS les processus Node.js (plusieurs tentatives)
log_message "🛑 Arrêt de tous les processus Node.js..."
killall -9 node 2>/dev/null
sleep 1
pkill -9 node 2>/dev/null
sleep 1

# 2. Vérifier et tuer spécifiquement les processus sur le port 3000
log_message "🔍 Vérification du port 3000..."
PORT_PID=$(lsof -ti :3000 2>/dev/null || ss -tulpn | grep :3000 | grep -oP 'pid=\K[0-9]+')
if [ ! -z "$PORT_PID" ]; then
    log_message "⚠️ Processus trouvé sur le port 3000 (PID: $PORT_PID), nettoyage..."
    kill -9 $PORT_PID 2>/dev/null
    sleep 2
fi

# 3. Vérification finale
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 || ss -tulpn | grep :3000 >/dev/null 2>&1 ; then
    log_message "❌ ERREUR: Le port 3000 est toujours occupé !"
    log_message "📋 Processus sur le port 3000:"
    lsof -i :3000 2>/dev/null || ss -tulpn | grep :3000
    exit 1
fi

log_message "✅ Port 3000 libéré"

# 4. Démarrer le serveur
log_message "🚀 Démarrage du serveur..."
nohup node server.js > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
log_message "📝 Nouveau PID du serveur: $SERVER_PID"

# 5. Attendre le démarrage
sleep 5

# 6. Vérifier le démarrage
if pgrep -f "node server.js" > /dev/null ; then
    log_message "✅ Serveur démarré avec succès!"
    echo ""
    echo "📊 Statut du serveur:"
    ps aux | grep "node server.js" | grep -v grep
    echo ""
    echo "📋 Derniers logs:"
    tail -30 "$LOG_FILE"
    echo ""
    echo "🌐 Le serveur devrait être accessible sur https://ebvision.bosssystemsai.com/"
else
    log_message "❌ Erreur lors du démarrage du serveur"
    echo ""
    echo "📋 Logs d'erreur:"
    tail -50 "$LOG_FILE"
    exit 1
fi
