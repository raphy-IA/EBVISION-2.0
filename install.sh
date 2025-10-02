#!/bin/bash
echo "🔧 Installation des dépendances..."
npm install --omit=dev

echo "📦 Installation de PM2..."
npm install -g pm2

echo "🗄️ Création des dossiers nécessaires..."
mkdir -p logs
mkdir -p uploads

echo "🔐 Configuration des permissions..."
chmod 755 public/
chmod 644 .htaccess

echo "🔍 Test de connexion à la base de données..."
node scripts/test-database.js

echo "🗄️ Migration de la base de données..."
node scripts/migrate-production.js

echo "🚀 Démarrage de l'application..."
pm2 start ecosystem.config.js --env production

echo "🔍 Vérification du déploiement..."
node scripts/verify-deployment.js

echo "✅ Installation terminée !"
echo "📊 Pour surveiller l'application: pm2 monit"
echo "📝 Pour voir les logs: pm2 logs eb-vision-2.0"
echo "🌐 Votre application est accessible sur votre domaine"
