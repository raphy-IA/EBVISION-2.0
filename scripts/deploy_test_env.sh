#!/bin/bash
# Script de déploiement d'un environnement de test EB-Vision 2.0 pour l'IA
# Usage: ./deploy_test_env.sh

PROD_DIR="/home/raphyai82/apps/ebvision"
TEST_DIR="/home/raphyai82/apps/ebvision-test"
PROD_DB="ebvision_2_0"
TEST_DB="ebvision_test"
TEST_PORT="3005"

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
# Copier .env de prod
cp $PROD_DIR/.env .env

# Forcer le PORT et la DB (Supprimer les lignes existantes puis ajouter les bonnes)
# On utilise un fichier temporaire car sed -i peut varier selon les versions
grep -v "^PORT=" .env > .env.tmp && mv .env.tmp .env
grep -v "^DB_NAME=" .env > .env.tmp && mv .env.tmp .env

echo "PORT=$TEST_PORT" >> .env
echo "DB_NAME=$TEST_DB" >> .env

# 3. Base de données
echo "🗄️ Duplication de la base de données..."
cd $PROD_DIR
# Extraire les infos de BDD du .env
DB_USER=$(grep DB_USER .env | cut -d '=' -f2)
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2)
DB_HOST=$(grep DB_HOST .env | cut -d '=' -f2)

export PGPASSWORD=$DB_PASS

# Vérifier si la base de test existe
if psql -h $DB_HOST -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $TEST_DB; then
    echo "   La base $TEST_DB existe déjà. Reconstruction..."
    dropdb -h $DB_HOST -U $DB_USER $TEST_DB
fi
createdb -h $DB_HOST -U $DB_USER $TEST_DB
# Dump et Restore (structure + data)
pg_dump -h $DB_HOST -U $DB_USER $PROD_DB | psql -h $DB_HOST -U $DB_USER $TEST_DB

echo "✅ Base de données dupliquée."

# 4. Installation & Lancement
echo "📦 Installation et Redémarrage..."
cd $TEST_DIR
npm install
pm2 stop "ebvision-test" 2>/dev/null || true
pm2 delete "ebvision-test" 2>/dev/null || true
pm2 start server.js --name "ebvision-test"

echo "✅ Environnement de test déployé sur le port $TEST_PORT"
echo "📚 Swagger accessible sur: http://votre-ip:$TEST_PORT/api-docs"
