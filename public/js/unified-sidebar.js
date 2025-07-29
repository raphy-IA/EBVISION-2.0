// Sidebar Unifiée - Script centralisé pour toutes les pages

class UnifiedSidebar {
    constructor() {
        this.init();
    }

    init() {
        this.generateSidebar();
        this.setupEventListeners();
        this.setActivePage();
    }

    generateSidebar() {
        const sidebarContainer = document.querySelector('.sidebar-container');
        if (!sidebarContainer) {
            console.warn('Container sidebar non trouvé');
            return;
        }

        // Vider le conteneur existant
        sidebarContainer.innerHTML = '';

        // Générer la sidebar complète
        sidebarContainer.innerHTML = this.getSidebarHTML();
    }

    getSidebarHTML() {
        return `
            <!-- Header de la sidebar -->
            <div class="sidebar-header">
                <h3>
                    <i class="fas fa-chart-line"></i>
                    TRS Dashboard
                </h3>
                <p>Gestion des Temps & Ressources</p>
            </div>

            <!-- Navigation principale -->
            <nav class="sidebar-nav">
                <!-- Section Dashboard -->
                <div class="sidebar-section">
                    <div class="sidebar-section-title">DASHBOARD</div>
                    <a href="dashboard.html" class="sidebar-nav-link">
                        <i class="fas fa-tachometer-alt"></i>
                        Tableau de bord
                    </a>
                    <a href="analytics.html" class="sidebar-nav-link">
                        <i class="fas fa-chart-bar"></i>
                        Analytics
                        <span class="badge">3</span>
                    </a>
                </div>

                <!-- Section Gestion -->
                <div class="sidebar-section">
                    <div class="sidebar-section-title">GESTION</div>
                    <a href="clients.html" class="sidebar-nav-link">
                        <i class="fas fa-users"></i>
                        Clients
                    </a>
                    <a href="collaborateurs.html" class="sidebar-nav-link">
                        <i class="fas fa-user-tie"></i>
                        Collaborateurs
                    </a>
                    <a href="missions.html" class="sidebar-nav-link">
                        <i class="fas fa-briefcase"></i>
                        Missions
                    </a>
                    <a href="opportunities.html" class="sidebar-nav-link">
                        <i class="fas fa-lightbulb"></i>
                        Opportunités
                        <span class="badge">5</span>
                    </a>
                </div>

                <!-- Section Temps -->
                <div class="sidebar-section">
                    <div class="sidebar-section-title">TEMPS</div>
                    <a href="time-entries.html" class="sidebar-nav-link">
                        <i class="fas fa-clock"></i>
                        Saisie de temps
                    </a>
                    <a href="feuilles-temps.html" class="sidebar-nav-link">
                        <i class="fas fa-calendar-alt"></i>
                        Feuilles de temps
                    </a>
                    <a href="taux-horaires.html" class="sidebar-nav-link">
                        <i class="fas fa-dollar-sign"></i>
                        Taux horaires
                    </a>
                </div>

                <!-- Section Configuration -->
                <div class="sidebar-section">
                    <div class="sidebar-section-title">CONFIGURATION</div>
                    <a href="grades.html" class="sidebar-nav-link">
                        <i class="fas fa-star"></i>
                        Grades
                    </a>
                    <a href="postes.html" class="sidebar-nav-link">
                        <i class="fas fa-id-badge"></i>
                        Postes
                    </a>
                    <a href="divisions.html" class="sidebar-nav-link">
                        <i class="fas fa-sitemap"></i>
                        Divisions
                    </a>
                    <a href="business-units.html" class="sidebar-nav-link">
                        <i class="fas fa-building"></i>
                        Unités d'affaires
                    </a>
                </div>

                <!-- Section Rapports -->
                <div class="sidebar-section">
                    <div class="sidebar-section-title">RAPPORTS</div>
                    <a href="reports.html" class="sidebar-nav-link">
                        <i class="fas fa-file-alt"></i>
                        Rapports
                    </a>
                    <a href="validation.html" class="sidebar-nav-link">
                        <i class="fas fa-check-circle"></i>
                        Validation
                        <span class="badge">2</span>
                    </a>
                </div>

                <!-- Section Administration -->
                <div class="sidebar-section">
                    <div class="sidebar-section-title">ADMINISTRATION</div>
                    <a href="users.html" class="sidebar-nav-link">
                        <i class="fas fa-user-cog"></i>
                        Utilisateurs
                    </a>
                </div>
            </nav>

            <!-- Footer de la sidebar -->
            <div class="sidebar-footer">
                <div class="sidebar-user-info">
                    <i class="fas fa-user-circle"></i>
                    <span>Admin User</span>
                    <small style="display: block; opacity: 0.7; margin-top: 2px;">Administrateur</small>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Gestion du toggle mobile
        const toggleBtn = document.querySelector('.sidebar-toggle');
        const sidebar = document.querySelector('.sidebar-container');
        
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                toggleBtn.classList.toggle('active');
            });
        }

        // Fermer la sidebar en cliquant à l'extérieur (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (sidebar && !sidebar.contains(e.target) && toggleBtn && !toggleBtn.contains(e.target)) {
                    sidebar.classList.remove('open');
                    if (toggleBtn) toggleBtn.classList.remove('active');
                }
            }
        });

        // Gestion des liens de navigation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sidebar-nav-link')) {
                const link = e.target.closest('.sidebar-nav-link');
                this.setActiveLink(link);
            }
        });
    }

    setActivePage() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.sidebar-nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && currentPath.includes(href.replace('.html', ''))) {
                this.setActiveLink(link);
            }
        });
    }

    setActiveLink(activeLink) {
        // Retirer la classe active de tous les liens
        document.querySelectorAll('.sidebar-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Ajouter la classe active au lien cliqué
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // Méthode pour mettre à jour les informations utilisateur
    updateUserInfo(username, role) {
        const userInfo = document.querySelector('.sidebar-user-info');
        if (userInfo) {
            userInfo.innerHTML = `
                <i class="fas fa-user-circle"></i>
                <span>${username}</span>
                <small style="display: block; opacity: 0.7; margin-top: 2px;">${role}</small>
            `;
        }
    }

    // Méthode pour ajouter des notifications
    addNotificationBadge(linkSelector, count) {
        const link = document.querySelector(linkSelector);
        if (link && count > 0) {
            let badge = link.querySelector('.badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge';
                link.appendChild(badge);
            }
            badge.textContent = count;
        }
    }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', function() {
    window.unifiedSidebar = new UnifiedSidebar();
});

// Exposer la classe globalement
window.UnifiedSidebar = UnifiedSidebar; 