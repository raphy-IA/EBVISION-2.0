require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import des routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const businessUnitsRoutes = require('./src/routes/business-units');
const divisionRoutes = require('./src/routes/divisions');
const clientRoutes = require('./src/routes/clients');
const contactRoutes = require('./src/routes/contacts');
const fiscalYearRoutes = require('./src/routes/fiscal-years');
const missionRoutes = require('./src/routes/missions');
const gradeRoutes = require('./src/routes/grades');
const collaborateurRoutes = require('./src/routes/collaborateurs');
const healthRoutes = require('./src/routes/health');
const feuillesTempsRoutes = require('./src/routes/feuilles-temps');
const timeEntriesRoutes = require('./src/routes/time-entries');
const reportsRoutes = require('./src/routes/reports');
const typesCollaborateursRoutes = require('./src/routes/types-collaborateurs');
const postesRoutes = require('./src/routes/postes');
const tauxHorairesRoutes = require('./src/routes/taux-horaires');
const opportunityRoutes = require('./src/routes/opportunities');
const opportunityStageRoutes = require('./src/routes/opportunity-stages');
const paysRoutes = require('./src/routes/pays');
const secteursActiviteRoutes = require('./src/routes/secteurs-activite');
const evolutionGradesRoutes = require('./src/routes/evolution-grades');
const evolutionPostesRoutes = require('./src/routes/evolution-postes');
const evolutionOrganisationsRoutes = require('./src/routes/evolution-organisations');

// Import des middlewares
const errorHandler = require('./src/middleware/errorHandler');
const { connectDatabase } = require('./src/utils/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de sécurité
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // limite chaque IP à 1000 requêtes par fenêtre
    message: {
        error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Middlewares
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Enregistrement des routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/business-units', businessUnitsRoutes);
app.use('/api/divisions', divisionRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/fiscal-years', fiscalYearRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/collaborateurs', collaborateurRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/feuilles-temps', feuillesTempsRoutes);
app.use('/api/time-entries', timeEntriesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/types-collaborateurs', typesCollaborateursRoutes);
app.use('/api/postes', postesRoutes);
app.use('/api/taux-horaires', tauxHorairesRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/opportunity-stages', opportunityStageRoutes);
app.use('/api/pays', paysRoutes);
app.use('/api/secteurs-activite', secteursActiviteRoutes);
app.use('/api/evolution-grades', evolutionGradesRoutes);
app.use('/api/evolution-postes', evolutionPostesRoutes);
app.use('/api/evolution-organisations', evolutionOrganisationsRoutes);

// Route racine
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        path: req.originalUrl
    });
});

// Middleware de gestion d'erreurs
app.use(errorHandler);

// Démarrage du serveur
async function startServer() {
    try {
        // Connexion à la base de données
        await connectDatabase();
        console.log('✅ Connexion à la base de données établie');

        // Démarrage du serveur
        app.listen(PORT, () => {
            console.log(`🚀 Serveur démarré sur le port ${PORT}`);
            console.log(`📊 Environnement: ${process.env.NODE_ENV}`);
            console.log(`🔗 URL: http://localhost:${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
}

// Gestion des signaux d'arrêt
process.on('SIGTERM', () => {
    console.log('🛑 Signal SIGTERM reçu, arrêt gracieux du serveur');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Signal SIGINT reçu, arrêt gracieux du serveur');
    process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non capturée:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesse rejetée non gérée:', reason);
    process.exit(1);
});

startServer(); 