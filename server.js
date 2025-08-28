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
const opportunityTypesRoutes = require('./src/routes/opportunity-types');
const opportunityStageRoutes = require('./src/routes/opportunity-stages');
const workflowRoutes = require('./src/routes/workflow');
const missionTypesRoutes = require('./src/routes/mission-types');
const tasksRoutes = require('./src/routes/tasks');
const paysRoutes = require('./src/routes/pays');
const secteursActiviteRoutes = require('./src/routes/secteurs-activite');
const evolutionGradesRoutes = require('./src/routes/evolution-grades');
const evolutionPostesRoutes = require('./src/routes/evolution-postes');
const evolutionOrganisationsRoutes = require('./src/routes/evolution-organisations');
const notificationRoutes = require('./src/routes/notifications');
const invoiceRoutes = require('./src/routes/invoices');
const activityRoutes = require('./src/routes/activities');
const timeSheetsRoutes = require('./src/routes/time-sheets');
const internalActivitiesRoutes = require('./src/routes/internalActivities');
const timeSheetSupervisorsRoutes = require('./src/routes/time-sheet-supervisors');
const supervisorsRoutes = require('./src/routes/supervisors');
const timeSheetApprovalsRoutes = require('./src/routes/time-sheet-approvals');
const dashboardAnalyticsRoutes = require('./src/routes/dashboard-analytics');
const analyticsRoutes = require('./src/routes/analytics');
const notificationSettingsRoutes = require('./src/routes/notification-settings');
const prospectingRoutes = require('./src/routes/prospecting');

// Import des middlewares
const errorHandler = require('./src/middleware/errorHandler');
const { connectDatabase } = require('./src/utils/database');

// Import des services
const CronService = require('./src/services/cronService');

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
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "data:"],
        },
    },
}));

// Rate limiting - Configuration plus permissive pour le développement
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000, // Augmenté à 10000 requêtes par fenêtre
    message: {
        error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter spécifique pour l'authentification (plus permissif)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 tentatives de login par 15 minutes
    message: {
        error: 'Trop de tentatives de connexion, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Appliquer le rate limiter général sur toutes les routes API sauf l'authentification
// TEMPORAIREMENT DÉSACTIVÉ POUR LE DÉVELOPPEMENT
/*
app.use('/api/', (req, res, next) => {
    if (req.path.startsWith('/auth')) {
        return next(); // Skip rate limiting for auth routes
    }
    return limiter(req, res, next);
});
*/

// Appliquer le rate limiter spécifique pour l'authentification
// En développement: désactivé totalement pour éviter blocages
if ((process.env.NODE_ENV || 'development') === 'development' || process.env.RATE_LIMIT_BYPASS === 'true') {
    app.use('/api/auth', (req, res, next) => next());
} else {
    app.use('/api/auth', authLimiter);
}

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

// Servir les fichiers uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/time-sheets', timeSheetsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/types-collaborateurs', typesCollaborateursRoutes);
app.use('/api/postes', postesRoutes);
app.use('/api/taux-horaires', tauxHorairesRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/opportunity-types', opportunityTypesRoutes);
app.use('/api/opportunity-stages', opportunityStageRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/mission-types', missionTypesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/pays', paysRoutes);
app.use('/api/secteurs-activite', secteursActiviteRoutes);
app.use('/api/evolution-grades', evolutionGradesRoutes);
app.use('/api/evolution-postes', evolutionPostesRoutes);
app.use('/api/evolution-organisations', evolutionOrganisationsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-settings', notificationSettingsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/internal-activities', internalActivitiesRoutes);
app.use('/api/time-sheet-supervisors', timeSheetSupervisorsRoutes);
app.use('/api/supervisors', supervisorsRoutes);
app.use('/api/time-sheet-approvals', timeSheetApprovalsRoutes);
app.use('/api/analytics', dashboardAnalyticsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/prospecting', prospectingRoutes);

// Import et utilisation des routes managers
const managersRoutes = require('./src/routes/managers');
app.use('/api/managers', managersRoutes);

// Route par défaut
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Middleware de gestion d'erreurs
app.use(errorHandler);

// Fonction de démarrage du serveur
async function startServer() {
    try {
        // Connexion à la base de données
        await connectDatabase();
        console.log('✅ Connexion à PostgreSQL réussie');
        
        // Initialiser les tâches cron
        CronService.initCronJobs();
        
        // Démarrage du serveur
        app.listen(PORT, () => {
            console.log('🚀 Serveur démarré sur le port', PORT);
            console.log('📊 Environnement:', process.env.NODE_ENV || 'development');
            console.log('🔗 URL: http://localhost:' + PORT);
            console.log('📚 API Documentation: http://localhost:' + PORT + '/api/health');
        });
    } catch (error) {
        console.error('❌ Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Démarrage du serveur
startServer(); 