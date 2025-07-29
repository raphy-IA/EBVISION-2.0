const fs = require('fs');
const path = require('path');

// Template de base pour toutes les pages
const baseTemplate = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- Sidebar CSS unifié -->
    <link href="/css/sidebar.css" rel="stylesheet">
    
    <!-- Styles de base -->
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8f9fa;
        }
        
        .main-content {
            margin-left: 250px;
            min-height: 100vh;
            background-color: #ffffff;
        }
        
        .page-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem 0;
            margin-bottom: 2rem;
        }
        
        .page-title {
            font-size: 2.5rem;
            font-weight: 300;
            margin: 0;
        }
        
        .page-subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
            margin: 0.5rem 0 0 0;
        }
        
        .container-fluid {
            padding: 2rem;
        }
        
        .card {
            border: none;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 1.5rem;
        }
        
        .card-header {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            border-radius: 10px 10px 0 0 !important;
            border: none;
            padding: 1rem 1.5rem;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 25px;
            padding: 0.5rem 1.5rem;
            font-weight: 500;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        .table {
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .table thead th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            font-weight: 500;
        }
        
        .alert {
            border-radius: 10px;
            border: none;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .main-content {
                margin-left: 0;
            }
            
            .page-title {
                font-size: 2rem;
            }
            
            .container-fluid {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <!-- Bouton toggle sidebar (mobile) -->
    <button class="sidebar-toggle" id="sidebarToggle" style="display: none;">
        <i class="fas fa-bars"></i>
    </button>

    <!-- Sidebar Container -->
    <div class="sidebar-container" id="sidebarContainer">
        <!-- La sidebar sera générée par sidebar.js -->
    </div>

    <!-- Contenu principal -->
    <div class="main-content" id="mainContent">
        <!-- Header de la page -->
        <div class="page-header">
            <div class="container-fluid">
                <div class="row align-items-center">
                    <div class="col">
                        <h1 class="page-title" id="pageTitle">{{PAGE_TITLE}}</h1>
                        <p class="page-subtitle" id="pageSubtitle">{{PAGE_SUBTITLE}}</p>
                    </div>
                    <div class="col-auto">
                        <!-- Actions spécifiques à la page -->
                        <div id="pageActions">
                            <!-- Les actions seront ajoutées par chaque page -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Contenu de la page -->
        <div class="container-fluid">
            <div class="row">
                <div class="col-12">
                    <div id="pageContent">
                        <!-- Le contenu spécifique sera injecté ici -->
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            Contenu de la page en cours de chargement...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Scripts de l'application -->
    <script src="/js/auth.js"></script>
    <script src="/js/sidebar.js"></script>
    
    <!-- Script spécifique à la page -->
    <script id="pageScript">
        // Script spécifique à la page
        // Sera remplacé par le contenu de chaque page
    </script>

    <script>
        // Configuration de la page
        document.addEventListener('DOMContentLoaded', function() {
            // Configuration par défaut
            const pageConfig = {
                title: '{{PAGE_TITLE}}',
                subtitle: '{{PAGE_SUBTITLE}}',
                showActions: false,
                actions: []
            };

            // Mise à jour du titre et sous-titre
            document.getElementById('pageTitle').textContent = pageConfig.title;
            document.getElementById('pageSubtitle').textContent = pageConfig.subtitle;

            // Gestion du toggle sidebar
            const sidebarToggle = document.getElementById('sidebarToggle');
            const sidebarContainer = document.getElementById('sidebarContainer');
            const mainContent = document.getElementById('mainContent');

            if (sidebarToggle && sidebarContainer) {
                sidebarToggle.addEventListener('click', function() {
                    sidebarContainer.classList.toggle('mobile-open');
                });
            }

            // Fermer la sidebar en cliquant à l'extérieur sur mobile
            document.addEventListener('click', function(e) {
                if (window.innerWidth <= 768) {
                    if (sidebarContainer && !sidebarContainer.contains(e.target) && 
                        !sidebarToggle.contains(e.target)) {
                        sidebarContainer.classList.remove('mobile-open');
                    }
                }
            });

            // Afficher le bouton toggle sur mobile
            function checkMobile() {
                if (window.innerWidth <= 768) {
                    sidebarToggle.style.display = 'block';
                    mainContent.style.marginLeft = '0';
                } else {
                    sidebarToggle.style.display = 'none';
                    mainContent.style.marginLeft = '250px';
                }
            }

            checkMobile();
            window.addEventListener('resize', checkMobile);
        });
    </script>
</body>
</html>`;

// Configuration des pages
const pagesConfig = {
    'dashboard.html': {
        title: 'TRS Dashboard - Gestion des Temps',
        pageTitle: 'Dashboard TRS',
        pageSubtitle: 'Vue d\'ensemble du système de gestion des temps'
    },
    'clients.html': {
        title: 'TRS - Gestion des Clients',
        pageTitle: 'Gestion des Clients',
        pageSubtitle: 'Gestion de la base clients et prospects'
    },
    'collaborateurs.html': {
        title: 'TRS - Gestion des Collaborateurs',
        pageTitle: 'Collaborateurs',
        pageSubtitle: 'Gestion des collaborateurs et équipes'
    },
    'missions.html': {
        title: 'TRS - Gestion des Missions',
        pageTitle: 'Missions',
        pageSubtitle: 'Gestion des missions et projets'
    },
    'time-entries.html': {
        title: 'TRS - Saisie des Temps',
        pageTitle: 'Saisie des Temps',
        pageSubtitle: 'Gestion des saisies de temps'
    },
    'validation.html': {
        title: 'TRS - Validation des Temps',
        pageTitle: 'Validation des Temps',
        pageSubtitle: 'Validation des saisies de temps'
    },
    'reports.html': {
        title: 'TRS - Rapports',
        pageTitle: 'Rapports',
        pageSubtitle: 'Rapports et analyses'
    },
    'opportunities.html': {
        title: 'TRS - Opportunités',
        pageTitle: 'Opportunités',
        pageSubtitle: 'Gestion des opportunités commerciales'
    },
    'analytics.html': {
        title: 'TRS - Analytics',
        pageTitle: 'Analytics',
        pageSubtitle: 'Analyses et statistiques'
    },
    'users.html': {
        title: 'TRS - Utilisateurs',
        pageTitle: 'Utilisateurs',
        pageSubtitle: 'Gestion des utilisateurs et permissions'
    },
    'grades.html': {
        title: 'TRS - Grades',
        pageTitle: 'Grades',
        pageSubtitle: 'Gestion des grades et niveaux'
    },
    'postes.html': {
        title: 'TRS - Postes',
        pageTitle: 'Postes',
        pageSubtitle: 'Gestion des postes et fonctions'
    },
    'taux-horaires.html': {
        title: 'TRS - Taux Horaires',
        pageTitle: 'Taux Horaires',
        pageSubtitle: 'Gestion des taux horaires'
    },
    'business-units.html': {
        title: 'TRS - Business Units',
        pageTitle: 'Business Units',
        pageSubtitle: 'Gestion des unités commerciales'
    },
    'divisions.html': {
        title: 'TRS - Divisions',
        pageTitle: 'Divisions',
        pageSubtitle: 'Gestion des divisions'
    }
};

// Fonction pour corriger une page
function fixPage(pageName) {
    const publicDir = path.join(__dirname, '..', 'public');
    const pagePath = path.join(publicDir, pageName);
    
    if (!fs.existsSync(pagePath)) {
        console.log(`Page ${pageName} n'existe pas, ignorée.`);
        return;
    }
    
    const config = pagesConfig[pageName] || {
        title: `TRS - ${pageName.replace('.html', '')}`,
        pageTitle: pageName.replace('.html', ''),
        pageSubtitle: 'Page de l\'application'
    };
    
    let template = baseTemplate
        .replace(/{{TITLE}}/g, config.title)
        .replace(/{{PAGE_TITLE}}/g, config.pageTitle)
        .replace(/{{PAGE_SUBTITLE}}/g, config.pageSubtitle);
    
    // Ajouter des styles spécifiques selon la page
    if (pageName === 'dashboard.html') {
        template = template.replace('<!-- Styles de base -->', `<!-- Styles de base -->
        <style>
            .stat-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 15px;
                padding: 1.5rem;
                margin-bottom: 1rem;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            
            .stat-card .stat-value {
                font-size: 2.5rem;
                font-weight: bold;
                margin-bottom: 0.5rem;
            }
            
            .stat-card .stat-label {
                font-size: 0.9rem;
                opacity: 0.9;
            }
            
            .chart-container {
                position: relative;
                height: 300px;
                margin: 1rem 0;
            }
        </style>`);
    }
    
    fs.writeFileSync(pagePath, template);
    console.log(`✅ Page ${pageName} corrigée`);
}

// Fonction principale
function fixAllPages() {
    console.log('🔧 Correction de toutes les pages...');
    
    const pages = Object.keys(pagesConfig);
    
    pages.forEach(pageName => {
        fixPage(pageName);
    });
    
    console.log('✅ Toutes les pages ont été corrigées !');
}

// Exécuter le script
if (require.main === module) {
    fixAllPages();
}

module.exports = { fixAllPages, fixPage }; 