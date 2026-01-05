#!/bin/bash
# Script de déploiement d'un environnement de test EB-Vision 2.0 pour l'IA
# Usage: ./deploy_test_env.sh

PROD_DIR="/home/raphyai82/apps/ebvision"
TEST_DIR="/home/raphyai82/apps/ebvision-test"
PROD_DB="ebvision_2_0"
TEST_DB="ebvision_test"
TEST_PORT="3001"

echo "🚀 Début du déploiement de l'environnement de TEST..."

# 1. Copier le code
echo "📂 Copie des fichiers..."
if [ -d "$TEST_DIR" ]; then
    echo "   Le dossier existe déjà. Mise à jour..."
    cp -r $PROD_DIR/* $TEST_DIR/
else
    echo "   Création du dossier..."
    cp -r $PROD_DIR $TEST_DIR
fi

# 2. Configurer l'environnement
echo "⚙️ Configuration. env..."
cd $TEST_DIR
# Copier .env et modifier le PORT et la DB
sed -e "s/PORT=.*/PORT=$TEST_PORT/" \
    -e "s/DB_NAME=.*/DB_NAME=$TEST_DB/" \
    $PROD_DIR/.env > .env

# 3. Base de données
echo "🗄️ Duplication de la base de données..."
# Vérifier si la base de test existe
if psql -lqt | cut -d \| -f 1 | grep -qw $TEST_DB; then
    echo "   La base $TEST_DB existe déjà. Reconstruction..."
    dropdb $TEST_DB
fi
createdb $TEST_DB
# Dump et Restore (structure + data)
pg_dump $PROD_DB | psql $TEST_DB

echo "✅ Base de données dupliquée."

# 4. Installation & Lancement
echo "📦 Installation et Redémarrage..."
npm install
pm2 stop "ebvision-test" 2>/dev/null || true
pm2 delete "ebvision-test" 2>/dev/null || true
pm2 start server.js --name "ebvision-test"

echo "✅ Environnement de test déployé sur le port $TEST_PORT"
echo "📚 Swagger accessible sur: http://votre-ip:$TEST_PORT/api-docs"
