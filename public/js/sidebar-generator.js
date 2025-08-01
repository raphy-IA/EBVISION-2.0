// Générateur de Sidebar Dynamique
// Ce script génère la sidebar HTML avec tous les liens de navigation

function generateSidebar() {
    const sidebarContainer = document.querySelector('.sidebar-container');
    if (!sidebarContainer) {
        console.warn('Container sidebar non trouvé');
        return;
    }

    const currentPath = window.location.pathname;
    const isActive = (href) => currentPath.includes(href.replace('.html', ''));

    const sidebarHTML = `
        <!-- Bouton toggle pour mobile -->
        <button class="sidebar-toggle" id="sidebarToggle">
            <i class="fas fa-bars"></i>
        </button>

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
                <a href="dashboard.html" class="sidebar-nav-link ${isActive('dashboard.html') ? 'active' : ''}">
                    <i class="fas fa-tachometer-alt"></i>
                    Tableau de bord
                </a>
                <a href="analytics.html" class="sidebar-nav-link ${isActive('analytics.html') ? 'active' : ''}">
                    <i class="fas fa-chart-bar"></i>
                    Analytics
                    <span class="badge">3</span>
                </a>
            </div>

            <!-- Section Gestion -->
            <div class="sidebar-section">
                <div class="sidebar-section-title">GESTION</div>
                <a href="clients.html" class="sidebar-nav-link ${isActive('clients.html') ? 'active' : ''}">
                    <i class="fas fa-users"></i>
                    Clients
                </a>
                <a href="collaborateurs.html" class="sidebar-nav-link ${isActive('collaborateurs.html') ? 'active' : ''}">
                    <i class="fas fa-user-tie"></i>
                    Collaborateurs
                </a>
                <a href="missions.html" class="sidebar-nav-link ${isActive('missions.html') ? 'active' : ''}">
                    <i class="fas fa-briefcase"></i>
                    Missions
                </a>
                <a href="opportunities.html" class="sidebar-nav-link ${isActive('opportunities.html') ? 'active' : ''}">
                    <i class="fas fa-lightbulb"></i>
                    Opportunités
                    <span class="badge">5</span>
                </a>
            </div>

            <!-- Section Temps -->
            <div class="sidebar-section">
                <div class="sidebar-section-title">TEMPS</div>
                <a href="time-entries.html" class="sidebar-nav-link ${isActive('time-entries.html') ? 'active' : ''}">
                    <i class="fas fa-clock"></i>
                    Saisie de temps
                </a>
                <a href="feuilles-temps.html" class="sidebar-nav-link ${isActive('feuilles-temps.html') ? 'active' : ''}">
                    <i class="fas fa-calendar-alt"></i>
                    Feuilles de temps
                </a>
                <a href="taux-horaires.html" class="sidebar-nav-link ${isActive('taux-horaires.html') ? 'active' : ''}">
                    <i class="fas fa-dollar-sign"></i>
                    Taux horaires
                </a>
            </div>

            <!-- Section Configuration -->
            <div class="sidebar-section">
                <div class="sidebar-section-title">CONFIGURATION</div>
                <a href="grades.html" class="sidebar-nav-link ${isActive('grades.html') ? 'active' : ''}">
                    <i class="fas fa-star"></i>
                    Grades
                </a>
                <a href="postes.html" class="sidebar-nav-link ${isActive('postes.html') ? 'active' : ''}">
                    <i class="fas fa-id-badge"></i>
                    Postes
                </a>
                <a href="divisions.html" class="sidebar-nav-link ${isActive('divisions.html') ? 'active' : ''}">
                    <i class="fas fa-sitemap"></i>
                    Divisions
                </a>
                <a href="business-units.html" class="sidebar-nav-link ${isActive('business-units.html') ? 'active' : ''}">
                    <i class="fas fa-building"></i>
                    Unités d'affaires
                </a>
                <a href="pays.html" class="sidebar-nav-link ${isActive('pays.html') ? 'active' : ''}">
                    <i class="fas fa-globe"></i>
                    Pays
                </a>
                <a href="secteurs-activite.html" class="sidebar-nav-link ${isActive('secteurs-activite.html') ? 'active' : ''}">
                    <i class="fas fa-industry"></i>
                    Secteurs d'activité
                </a>
                <a href="opportunity-types.html" class="sidebar-nav-link ${isActive('opportunity-types.html') ? 'active' : ''}">
                    <i class="fas fa-tags"></i>
                    Types d'Opportunités
                </a>
                <a href="mission-types.html" class="sidebar-nav-link ${isActive('mission-types.html') ? 'active' : ''}">
                    <i class="fas fa-tag"></i>
                    Types de Mission
                </a>
                <a href="task-templates.html" class="sidebar-nav-link ${isActive('task-templates.html') ? 'active' : ''}">
                    <i class="fas fa-tasks"></i>
                    Tâches
                </a>
                <a href="fiscal-years.html" class="sidebar-nav-link ${isActive('fiscal-years.html') ? 'active' : ''}">
                    <i class="fas fa-calendar-alt"></i>
                    Exercices Fiscaux
                </a>
            </div>

            <!-- Section Rapports -->
            <div class="sidebar-section">
                <div class="sidebar-section-title">RAPPORTS</div>
                <a href="reports.html" class="sidebar-nav-link ${isActive('reports.html') ? 'active' : ''}">
                    <i class="fas fa-file-alt"></i>
                    Rapports
                </a>
                <a href="validation.html" class="sidebar-nav-link ${isActive('validation.html') ? 'active' : ''}">
                    <i class="fas fa-check-circle"></i>
                    Validation
                    <span class="badge">2</span>
                </a>
            </div>

            <!-- Section Administration -->
            <div class="sidebar-section">
                <div class="sidebar-section-title">ADMINISTRATION</div>
                <a href="users.html" class="sidebar-nav-link ${isActive('users.html') ? 'active' : ''}">
                    <i class="fas fa-user-cog"></i>
                    Utilisateurs
                </a>
                <a href="settings.html" class="sidebar-nav-link ${isActive('settings.html') ? 'active' : ''}">
                    <i class="fas fa-cog"></i>
                    Paramètres
                </a>
            </div>
        </nav>

        <!-- Footer de la sidebar -->
        <div class="sidebar-footer">
            <div class="sidebar-user-info">
                <i class="fas fa-user-circle"></i>
                <span>Administrateur</span>
                <small style="display: block; opacity: 0.7; margin-top: 2px;">Admin</small>
            </div>
            <button class="sidebar-logout-btn" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i>
                Déconnexion
            </button>
        </div>
    `;

    sidebarContainer.innerHTML = sidebarHTML;

    // Initialiser les fonctionnalités de la sidebar
    initSidebarFeatures();
}

function initSidebarFeatures() {
    // Gestion du toggle mobile
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar-container');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            this.classList.toggle('active');
        });
    }

    // Fermer la sidebar en cliquant à l'extérieur (mobile)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('open');
                if (toggleBtn) toggleBtn.classList.remove('active');
            }
        }
    });

    // Animations des liens
    const navLinks = document.querySelectorAll('.sidebar-nav-link');
    navLinks.forEach((link, index) => {
        link.style.animationDelay = `${index * 0.1}s`;
        link.style.opacity = '0';
        link.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            link.style.transition = 'all 0.3s ease';
            link.style.opacity = '1';
            link.style.transform = 'translateX(0)';
        }, 100 + (index * 100));
    });
}

// Fonction de déconnexion
function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        window.location.href = 'login.html';
    }
}

// Générer la sidebar au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    generateSidebar();
});

// Exposer les fonctions globalement
window.SidebarGenerator = {
    generateSidebar,
    initSidebarFeatures
}; 