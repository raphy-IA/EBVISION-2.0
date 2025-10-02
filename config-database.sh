#!/bin/bash

echo "🗄️ Configuration de la base de données PostgreSQL..."
echo ""

# Vérifier si config.production.js existe
if [ ! -f "config.production.js" ]; then
    echo "❌ config.production.js non trouvé"
    exit 1
fi

echo "📋 Informations nécessaires pour configurer la base de données :"
echo ""
echo "Vous devez fournir les informations suivantes depuis votre panneau PlanetHoster :"
echo ""

# Demander les informations de base de données
read -p "Host PostgreSQL (ex: localhost ou votre_host): " DB_HOST
read -p "Port PostgreSQL (ex: 5432): " DB_PORT
read -p "Nom de la base de données: " DB_NAME
read -p "Utilisateur PostgreSQL: " DB_USER
read -p "Mot de passe PostgreSQL: " DB_PASSWORD
read -p "URL de votre domaine (ex: https://votre-domaine.com): " APP_URL

echo ""
echo "🔧 Configuration de config.production.js..."

# Créer une sauvegarde
cp config.production.js config.production.js.backup

# Mettre à jour la configuration
cat > config.production.js << EOF
module.exports = {
  // Configuration de production pour PlanetHoster N0C
  NODE_ENV: 'production',
  PORT: process.env.PORT || 3000,
  
  // Base de données PostgreSQL
  database: {
    host: process.env.DB_HOST || '$DB_HOST',
    port: process.env.DB_PORT || $DB_PORT,
    database: process.env.DB_NAME || '$DB_NAME',
    user: process.env.DB_USER || '$DB_USER',
    password: process.env.DB_PASSWORD || '$DB_PASSWORD',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'eb_vision_2_0_super_secret_key_2024_production_$(date +%s)',
  
  // Email (optionnel)
  email: {
    host: process.env.EMAIL_HOST || 'smtp.planethoster.com',
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER || 'your_email@yourdomain.com',
    password: process.env.EMAIL_PASSWORD || 'your_email_password',
    secure: false
  },
  
  // URL de l'application
  APP_URL: process.env.APP_URL || '$APP_URL'
};
EOF

echo "✅ Configuration mise à jour !"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Vérifiez que votre base de données PostgreSQL est créée sur PlanetHoster"
echo "   2. Testez la connexion : node -e \"require('./src/utils/database')\""
echo "   3. Lancez la migration : node scripts/migrate-production.js"
echo "   4. Redémarrez l'application : pm2 restart eb-vision-2.0"
echo ""
echo "🔍 Pour vérifier les logs : pm2 logs eb-vision-2.0"










