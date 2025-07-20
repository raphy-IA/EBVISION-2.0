// Script pour gérer la sidebar de manière cohérente
class SidebarManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '');
        return page || 'dashboard';
    }

    init() {
        this.createSidebar();
        this.highlightCurrentPage();
        this.addEventListeners();
    }

    createSidebar() {
        const sidebarContainer = document.querySelector('.sidebar-container');
        if (!sidebarContainer) return;

        sidebarContainer.innerHTML = `
            <div class="sidebar p-3">
                <!-- Section Dashboard -->
                <div class="mb-4">
                    <h6 class="text-uppercase text-muted mb-3">
                        <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                    </h6>
                    <nav class="nav flex-column">
                        <a class="nav-link" href="/dashboard.html" data-page="dashboard">
                            <i class="fas fa-chart-line"></i>
                            Vue d'ensemble
                        </a>
                    </nav>
                </div>

                <!-- Section Reporting Temps (TRS) -->
                <div class="mb-4">
                    <h6 class="text-uppercase text-muted mb-3">
                        <i class="fas fa-chart-bar me-2"></i>Reporting Temps (TRS)
                    </h6>
                    <nav class="nav flex-column">
                        <a class="nav-link" href="/time-entries.html" data-page="time-entries">
                            <i class="fas fa-clock"></i>
                            Saisie des temps
                        </a>
                        <a class="nav-link" href="/validation.html" data-page="validation">
                            <i class="fas fa-check-circle"></i>
                            Validation des temps
                        </a>
                        <a class="nav-link" href="/reports.html" data-page="reports">
                            <i class="fas fa-chart-pie"></i>
                            Rapports temps
                        </a>
                    </nav>
                </div>

                <!-- Section Gestion Mission -->
                <div class="mb-4">
                    <h6 class="text-uppercase text-muted mb-3">
                        <i class="fas fa-briefcase me-2"></i>Gestion Mission
                    </h6>
                    <nav class="nav flex-column">
                        <a class="nav-link" href="/missions.html" data-page="missions">
                            <i class="fas fa-tasks"></i>
                            Missions
                        </a>
                    </nav>
                </div>

                <!-- Section Gestion Clients -->
                <div class="mb-4">
                    <h6 class="text-uppercase text-muted mb-3">
                        <i class="fas fa-building me-2"></i>Gestion Clients
                    </h6>
                    <nav class="nav flex-column">
                        <a class="nav-link" href="/clients.html" data-page="clients">
                            <i class="fas fa-users"></i>
                            Clients
                        </a>
                    </nav>
                </div>

                <!-- Section Configurations -->
                <div class="mb-4">
                    <h6 class="text-uppercase text-muted mb-3">
                        <i class="fas fa-cogs me-2"></i>Configurations
                    </h6>
                    <nav class="nav flex-column">
                        <a class="nav-link" href="/collaborateurs.html" data-page="collaborateurs">
                            <i class="fas fa-users"></i>
                            Collaborateurs
                        </a>
                        <a class="nav-link" href="/grades.html" data-page="grades">
                            <i class="fas fa-star"></i>
                            Grades
                        </a>
                        <a class="nav-link" href="/taux-horaires.html" data-page="taux-horaires">
                            <i class="fas fa-euro-sign"></i>
                            Taux Horaires
                        </a>
                        <a class="nav-link" href="/business-units.html" data-page="business-units">
                            <i class="fas fa-building"></i>
                            Business Units
                        </a>
                        <a class="nav-link" href="/divisions.html" data-page="divisions">
                            <i class="fas fa-sitemap"></i>
                            Divisions
                        </a>
                        <a class="nav-link" href="/users.html" data-page="users">
                            <i class="fas fa-user-shield"></i>
                            Utilisateurs & Permissions
                        </a>
                    </nav>
                </div>
            </div>
        `;
    }

    highlightCurrentPage() {
        const currentLink = document.querySelector(`[data-page="${this.currentPage}"]`);
        if (currentLink) {
            currentLink.classList.add('active');
        }
    }

    addEventListeners() {
        // Gestion des clics sur les liens de la sidebar
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sidebar .nav-link')) {
                const link = e.target.closest('.sidebar .nav-link');
                const href = link.getAttribute('href');
                
                if (href && href !== window.location.pathname) {
                    // Navigation avec transition
                    this.navigateToPage(href);
                }
            }
        });
    }

    navigateToPage(url) {
        // Ajouter un indicateur de chargement
        this.showLoading();
        
        // Navigation simple sans rechargement
        window.location.href = url;
    }

    showLoading() {
        // Créer un indicateur de chargement
        const loading = document.createElement('div');
        loading.id = 'page-loading';
        loading.innerHTML = `
            <div class="loading-overlay">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
            </div>
        `;
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        document.body.appendChild(loading);
    }
}

// Initialiser la sidebar quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new SidebarManager();
});

// Gestion de la navigation avec historique
window.addEventListener('popstate', (event) => {
    // Recharger la page si nécessaire
    if (event.state && event.state.page) {
        window.location.reload();
    }
}); 