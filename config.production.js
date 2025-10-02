module.exports = {
  // Configuration de production pour PlanetHoster N0C
  NODE_ENV: 'production',
  PORT: process.env.PORT || 3000,
  
  // Base de données PostgreSQL
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'eb_admin20',
    password: process.env.DB_PASSWORD || '87ifet-Z)&',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'eb_vision_2_0_super_secret_key_2024_production',
  
  // Email (optionnel)
  email: {
    host: process.env.EMAIL_HOST || 'smtp.planethoster.com',
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER || 'your_email@yourdomain.com',
    password: process.env.EMAIL_PASSWORD || 'your_email_password',
    secure: false
  },
  
  // URL de l'application
  APP_URL: process.env.APP_URL || 'https://yourdomain.com'
};
