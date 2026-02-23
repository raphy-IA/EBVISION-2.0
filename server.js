require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./src/config/swagger');

// Import des routes
const authRoutes = require('./src/routes/auth');
const twoFactorAuthRoutes = require('./src/routes/two-factor-auth');
const userRoutes = require('./src/routes/users');
const businessUnitsRoutes = require('./src/routes/business-units');
const divisionRoutes = require('./src/routes/divisions');
const clientRoutes = require('./src/routes/clients');
const contactRoutes = require('./src/routes/contacts');
const fiscalYearRoutes = require('./src/routes/fiscal-years');
const objectivesRoutes = require('./src/routes/objectives');
const evaluationsRoutes = require('./src/routes/evaluations');
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
const teamAnalyticsRoutes = require('./src/routes/team-analytics');
const notificationSettingsRoutes = require('./src/routes/notification-settings');
const financialSettingsRoutes = require('./src/routes/financial-settings');
const prospectingRoutes = require('./src/routes/prospecting');
const pagePermissionsRoutes = require('./src/routes/page-permissions');
const permissionsRoutes = require('./src/routes/permissions');
const brandingRoutes = require('./src/routes/branding');
const billingRoutes = require('./src/routes/billing');
const invoiceWorkflowRoutes = require('./src/routes/invoice-workflow');
const financialInstitutionsRoutes = require('./src/routes/financial-institutions');
const bankAccountsRoutes = require('./src/routes/bank-accounts');
const paymentsRoutes = require('./src/routes/payments');
const documentsRoutes = require('./src/routes/documents');
const missionDocumentsRoutes = require('./src/routes/mission-documents');
const { authenticateToken } = require('./src/middleware/auth');

// Import des middlewares
const errorHandler = require('./src/middleware/errorHandler');
const { connectDatabase } = require('./src/utils/database');

// Import des services
const CronService = require('./src/services/cronService');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration du proxy (nécessaire pour nginx/reverse proxy)
app.set('trust proxy', 1);

// Configuration de sécurité
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "data:"],
            connectSrc: ["'self'", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "https:"],
        },
    },
}));

// Rate limiting - Configuration sécurisée
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // 1000 requêtes par fenêtre (raisonnable)
    message: {
        error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Indiquer à express-rate-limit que l'app est derrière un proxy (nginx)
    // Silencer validation trust proxy dans v7+
    validate: { trustProxy: false },
});

// Rate limiter spécifique pour l'authentification (protection contre force brute)
// ATTENTION: on ne doit pas appliquer ce rate limiter aux routes comme /api/auth/verify
// car le front appelle périodiquement /verify pour vérifier le token. Si cette route
// est limitée, elle renverra des 429 qui provoqueront la déconnexion des utilisateurs.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 20, // 20 tentatives de login par 15 minutes
    message: {
        error: 'Trop de tentatives de connexion, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Indiquer à express-rate-limit que l'app est derrière un proxy (nginx)
    // Silencer validation trust proxy dans v7+
    validate: { trustProxy: false },
    // Note: onLimitReached deprecated dans express-rate-limit v7
});

// Appliquer le rate limiter général sur toutes les routes API sauf l'authentification
// SÉCURITÉ: Actif avec des limites adaptées au développement
app.use('/api/', (req, res, next) => {
    if (req.path.startsWith('/auth')) {
        return next(); // Skip rate limiting for auth routes (géré séparément)
    }
    return limiter(req, res, next);
});

// Appliquer le rate limiter spécifique pour l'authentification
// SÉCURITÉ: Toujours actif, même en production, mais UNIQUEMENT sur /api/auth/login
// pour éviter de limiter /api/auth/verify (appel périodique côté front).
if (process.env.RATE_LIMIT_BYPASS === 'true' || process.env.NODE_ENV === 'development') {
    console.log('⚠️  ATTENTION: Rate limiting désactivé pour le développement');
} else {
    // Ne limiter que les tentatives de connexion
    app.post('/api/auth/login', authLimiter, (req, res, next) => next());
    console.log('✅ Rate limiting activé pour les tentatives de connexion (/api/auth/login)');
}

// Middlewares
app.use(compression());
app.use(morgan('combined'));
app.use(cookieParser()); // Support des cookies

// Configuration CORS dynamique via .env
const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
const allowedOrigins = [
    ...envOrigins.map(o => o.trim().replace(/\/$/, '')),
    'https://ebvision.bosssystemsai.com',
    'https://www.ebvision.bosssystemsai.com',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000'
];

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const normalizedOrigin = origin ? origin.replace(/\/$/, '') : null;

    if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
        cors({
            origin: normalizedOrigin || true,
            credentials: true
        })(req, res, next);
    } else {
        console.warn(`🔒 Accès CORS refusé pour l'origine: ${origin}`);
        res.status(403).json({
            success: false,
            message: 'Accès refusé : origine non autorisée'
        });
    }
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de mode maintenance
const maintenanceConfigPath = path.join(__dirname, 'config', 'maintenance.json');

app.use((req, res, next) => {
    try {
        if (!fs.existsSync(maintenanceConfigPath)) {
            return next();
        }

        const raw = fs.readFileSync(maintenanceConfigPath, 'utf8');
        const config = JSON.parse(raw);

        if (!config.enabled) {
            return next();
        }

        // Toujours laisser passer la route de santé
        if (req.path.startsWith('/api/health')) {
            return next();
        }

        // Pour les routes API, renvoyer une erreur 503 JSON
        if (req.path.startsWith('/api')) {
            return res.status(503).json({
                error: 'Service en maintenance',
                message: config.message || 'L\'application est actuellement en maintenance.',
            });
        }

        // Laisser passer la page de maintenance et sa configuration
        if (req.path === '/maintenance.html' || req.path.startsWith('/config/maintenance')) {
            return next();
        }

        // Rediriger tout le reste vers la page de maintenance
        return res.redirect('/maintenance.html');
    } catch (e) {
        // En cas de problème de lecture JSON, ne pas bloquer l'application
        return next();
    }
});

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Servir FontAwesome depuis node_modules (évite la dépendance au CDN)
app.use('/vendor/fontawesome', express.static(path.join(__dirname, 'node_modules/@fortawesome/fontawesome-free')));

// Servir les fichiers de configuration (CSS, thèmes)
app.use('/config', express.static(path.join(__dirname, 'config')));

// Servir les fichiers uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Enregistrement des routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/2fa', twoFactorAuthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/business-units', businessUnitsRoutes);
app.use('/api/divisions', divisionRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/fiscal-years', fiscalYearRoutes);
app.use('/api/objectives', objectivesRoutes);
app.use('/api/evaluations', evaluationsRoutes);
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
app.use('/api/documents', documentsRoutes);
app.use('/api/mission-documents', missionDocumentsRoutes);
app.use('/api/notification-settings', notificationSettingsRoutes);
app.use('/api/financial-settings', financialSettingsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/internal-activities', internalActivitiesRoutes);
app.use('/api/time-sheet-supervisors', timeSheetSupervisorsRoutes);
app.use('/api/supervisors', supervisorsRoutes);
app.use('/api/time-sheet-approvals', timeSheetApprovalsRoutes);
app.use('/api/analytics', dashboardAnalyticsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics/team', teamAnalyticsRoutes);
app.use('/api/prospecting', prospectingRoutes);
app.use('/api/permissions', authenticateToken, permissionsRoutes);
app.use('/api/page-permissions', pagePermissionsRoutes); // Changed from /api/auth to avoid conflict
app.use('/api/branding', brandingRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/invoices', invoiceWorkflowRoutes); // Workflow routes (mounted after main invoices routes)
app.use('/api/financial-institutions', financialInstitutionsRoutes);
app.use('/api/bank-accounts', bankAccountsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/documents', documentsRoutes);

// Route de synchronisation des permissions et menus
// Route de synchronisation des permissions et menus
// const syncPermissionsRoutes = require('./src/routes/sync-permissions');
// app.use(syncPermissionsRoutes);

// Import et utilisation des routes managers
const managersRoutes = require('./src/routes/managers');
app.use('/api/managers', managersRoutes);

// Route de base de l'API (pour éviter le Cannot GET /api)
app.get('/api', (req, res) => {
    res.json({
        message: 'Bienvenue sur l\'API EB-Vision 2.0',
        documentation: '/api-docs',
        status: 'online'
    });
});

// Route par défaut à la racine
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

        // Exécuter les migrations automatiquement
        console.log('🔄 Vérification des migrations...');
        const migrateModule = require('./scripts/migrate');
        if (migrateModule && migrateModule.runMigrations) {
            await migrateModule.runMigrations(false);
        } else {
            console.log('⚠️ Impossible de charger le module de migrations');
        }

        // Initialiser les tâches cron
        CronService.initCronJobs();

        // Démarrage du serveur
        console.log(`📡 Tentative de démarrage sur le port ${PORT}...`);
        const server = app.listen(PORT, () => {
            console.log(`🚀 Serveur démarré sur le port ${PORT}`);
            console.log(`🌍 URL Swagger : http://localhost:${PORT}/api-docs`);
            console.log(`📅 Heure serveur (Locale): ${new Date().toLocaleString('fr-FR')}`);
            console.log(`📅 Heure serveur (ISO): ${new Date().toISOString()}`);
            console.log('✅ Système prêt et opérationnel');
            // Signal PM2 que l'app est prête (évite les 502 pendant démarrage)
            if (process.send) {
                process.send('ready');
            }
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Le port ${PORT} est déjà utilisé. Arrêt du démarrage.`);
            } else {
                console.error('❌ Erreur du serveur HTTP:', err);
            }
            process.exit(1);
        });

    } catch (error) {
        console.error('❌ Erreur critique lors du démarrage du serveur:', error);
        process.exit(1);
    }
}

// Gestion des erreurs globales
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Rejet non géré à:', promise, 'raison:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Exception non capturée:', error);
    process.exit(1);
});

// Lancement
startServer();
