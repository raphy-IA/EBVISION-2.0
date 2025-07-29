document.addEventListener('DOMContentLoaded', function() {
    const sidebarContainer = document.querySelector('.sidebar-container');
    const sidebarPath = '/template-modern-sidebar.html'; // Chemin vers le template de la sidebar

    if (sidebarContainer) {
        fetch(sidebarPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur de chargement de la sidebar: ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                // Utiliser DOMParser pour créer un document à partir du HTML de la sidebar
                const parser = new DOMParser();
                const sidebarDoc = parser.parseFromString(html, 'text/html');
                const sidebarContent = sidebarDoc.querySelector('.sidebar-container');

                if (sidebarContent) {
                    // Injecter le contenu de la sidebar
                    sidebarContainer.innerHTML = sidebarContent.innerHTML;
                    
                    // Activer le lien correspondant à la page actuelle
                    setActiveLink();
                    
                    // Gérer le toggle sur mobile
                    setupSidebarToggle();
                } else {
                    console.error("Le contenu de la sidebar (.sidebar-container) n'a pas été trouvé dans le template.");
                    sidebarContainer.innerHTML = '<p class="text-danger p-3">Erreur: Impossible de charger le menu.</p>';
                }
            })
            .catch(error => {
                console.error('Erreur lors du chargement de la sidebar:', error);
                if (sidebarContainer) {
                    sidebarContainer.innerHTML = '<p class="text-danger p-3">Le menu de navigation est indisponible.</p>';
                }
            });
    }

    function setActiveLink() {
        // Récupérer le chemin de la page actuelle (ex: "/dashboard.html")
        const currentPage = window.location.pathname;
        
        // Trouver tous les liens dans la sidebar
        const navLinks = document.querySelectorAll('.sidebar-container .sidebar-nav-link');

        navLinks.forEach(link => {
            const linkPath = new URL(link.href).pathname;

            // Si le chemin du lien correspond à la page actuelle
            if (linkPath === currentPage) {
                link.classList.add('active');

                // Optionnel : ouvrir la section parente si c'est un accordéon
                const parentSection = link.closest('.sidebar-section');
                if (parentSection) {
                    // Logique pour déplier une section si nécessaire (non implémenté dans ce template)
                }
            }
        });
    }

    function setupSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebarToggle'); // Assurez-vous que ce bouton existe dans votre HTML principal
        const sidebar = document.querySelector('.sidebar-container');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open'); // La classe 'open' contrôlera la visibilité sur mobile
            });
        }
    }
});