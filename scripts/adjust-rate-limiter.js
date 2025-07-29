const fs = require('fs');
const path = require('path');

// Lire le fichier server.js
const serverPath = path.join(__dirname, '..', 'server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Ajuster la configuration du rate limiter pour être moins restrictive
const newRateLimitConfig = `// Rate limiting - Configuration plus permissive pour éviter les blocages
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5000, // Augmenté à 5000 requêtes par fenêtre
    message: {
        error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Ajouter des exclusions pour les routes d'authentification
    skip: (req) => {
        // Ne pas appliquer le rate limit sur les routes d'authentification
        return req.path.startsWith('/api/auth/');
    }
});`;

// Remplacer l'ancienne configuration
const oldRateLimitPattern = /\/\/ Rate limiting[\s\S]*?app\.use\('\/api\/', limiter\);/;
const newRateLimitSection = `${newRateLimitConfig}
app.use('/api/', limiter);`;

serverContent = serverContent.replace(oldRateLimitPattern, newRateLimitSection);

// Écrire le fichier modifié
fs.writeFileSync(serverPath, serverContent, 'utf8');

console.log('✅ Configuration du rate limiter ajustée :');
console.log('   - Limite augmentée à 5000 requêtes par 15 minutes');
console.log('   - Routes d\'authentification exclues du rate limiting');
console.log('   - Cela devrait éviter les blocages d\'authentification');

// Créer un fichier .env.local pour surcharger les variables d'environnement si nécessaire
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envLocalPath)) {
    const envLocalContent = `# Configuration du rate limiter
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5000

# Configuration pour le développement
NODE_ENV=development
`;
    fs.writeFileSync(envLocalPath, envLocalContent, 'utf8');
    console.log('✅ Fichier .env.local créé avec la configuration du rate limiter');
}

console.log('\n🔄 Redémarrez le serveur pour appliquer les changements :');
console.log('   node server.js'); 