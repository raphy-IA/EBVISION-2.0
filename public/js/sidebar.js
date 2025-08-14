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
                    
                    // Gérer l'expansion/réduction des sections
                    setupSectionToggle();
                    
                    // Ajouter les indicateurs visuels pour l'expansion
                    addExpandIndicators();
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
        const currentSearch = window.location.search;
        
        // Trouver tous les liens dans la sidebar
        const navLinks = document.querySelectorAll('.sidebar-container .sidebar-nav-link');

        navLinks.forEach(link => {
            const linkUrl = new URL(link.href);
            const linkPath = linkUrl.pathname;
            const linkSearch = linkUrl.search;

            // Si le chemin du lien correspond à la page actuelle
            if (linkPath === currentPage) {
                // Vérifier aussi les paramètres de recherche si présents
                if (linkSearch === currentSearch || (!linkSearch && !currentSearch)) {
                    link.classList.add('active');
                    
                    // Ouvrir la section parente
                    const parentSection = link.closest('.sidebar-section');
                    if (parentSection) {
                        parentSection.classList.add('expanded');
                    }
                }
            }
        });
    }

    function setupSidebarToggle() {
        const sidebarToggle = document.querySelector('.sidebar-toggle'); // Utiliser la classe au lieu de l'ID
        const sidebar = document.querySelector('.sidebar-container');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open'); // La classe 'open' contrôlera la visibilité sur mobile
            });
        }
    }

    function setupSectionToggle() {
        // Ajouter des écouteurs d'événements pour les titres de section
        const sectionTitles = document.querySelectorAll('.sidebar-section-title');
        
        sectionTitles.forEach(title => {
            title.addEventListener('click', function() {
                const section = this.closest('.sidebar-section');
                const isExpanded = section.classList.contains('expanded');
                
                // Fermer toutes les autres sections
                document.querySelectorAll('.sidebar-section').forEach(s => {
                    s.classList.remove('expanded');
                });
                
                // Basculer l'état de la section actuelle
                if (!isExpanded) {
                    section.classList.add('expanded');
                }
            });
            
            // Ajouter le curseur pointer pour indiquer que c'est cliquable
            title.style.cursor = 'pointer';
        });
    }

    function addExpandIndicators() {
        // Ajouter des indicateurs visuels pour l'expansion
        const sectionTitles = document.querySelectorAll('.sidebar-section-title');
        
        sectionTitles.forEach(title => {
            // Ajouter une icône de flèche après le titre
            const arrow = document.createElement('i');
            arrow.className = 'fas fa-chevron-down expand-arrow';
            arrow.style.marginLeft = 'auto';
            arrow.style.transition = 'transform 0.3s ease';
            
            title.appendChild(arrow);
            
            // Mettre à jour l'icône quand la section est étendue
            const section = title.closest('.sidebar-section');
            if (section.classList.contains('expanded')) {
                arrow.style.transform = 'rotate(180deg)';
            }
            
            // Écouter les changements de classe pour mettre à jour l'icône
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        if (section.classList.contains('expanded')) {
                            arrow.style.transform = 'rotate(180deg)';
                        } else {
                            arrow.style.transform = 'rotate(0deg)';
                        }
                    }
                });
            });
            
            observer.observe(section, { attributes: true });
        });
    }

    // Fonction pour mettre à jour les informations utilisateur
    window.updateUserInfo = function(name, role) {
        const userInfo = document.querySelector('.sidebar-user-info');
        if (userInfo) {
            const nameSpan = userInfo.querySelector('span');
            const roleSmall = userInfo.querySelector('small');
            
            if (nameSpan) nameSpan.textContent = name;
            if (roleSmall) roleSmall.textContent = role;
        }
    };

    // Fonction pour ajouter un badge de notification
    window.addNotificationBadge = function(selector, count) {
        const link = document.querySelector(selector);
        if (link) {
            // Supprimer l'ancien badge s'il existe
            const existingBadge = link.querySelector('.notification-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Ajouter le nouveau badge
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.textContent = count;
            badge.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                background: #dc3545;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            `;
            
            link.style.position = 'relative';
            link.appendChild(badge);
        }
    };

    // Fonction pour ajouter un indicateur de statut
    window.addStatusIndicator = function(selector, status) {
        const link = document.querySelector(selector);
        if (link) {
            // Supprimer l'ancien indicateur s'il existe
            const existingIndicator = link.querySelector('.status-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            // Ajouter le nouvel indicateur
            const indicator = document.createElement('span');
            indicator.className = 'status-indicator';
            indicator.style.cssText = `
                position: absolute;
                top: 50%;
                right: 10px;
                transform: translateY(-50%);
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${status === 'success' ? '#28a745' : 
                           status === 'warning' ? '#ffc107' : 
                           status === 'error' ? '#dc3545' : '#6c757d'};
            `;
            
            link.style.position = 'relative';
            link.appendChild(indicator);
        }
    };
});