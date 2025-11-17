// Cache global pour la sidebar
let sidebarCache = {
    html: null,
    timestamp: 0,
    expiry: 1 * 60 * 1000 // 1 minute (réduit pour le développement)
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation du chargement de la sidebar...');
    const sidebarContainer = document.querySelector('.sidebar-container');
    const sidebarPath = '/template-modern-sidebar.html'; // Chemin vers le template de la sidebar

    if (sidebarContainer) {
        console.log('✅ Container sidebar trouvé, chargement en cours...');
        // Attendre un peu que l'authentification soit vérifiée
        setTimeout(() => {
            loadSidebar(sidebarContainer, sidebarPath);
        }, 500);
    } else {
        console.error('❌ Container sidebar non trouvé!');
        // Retry après un délai
        setTimeout(() => {
            const retryContainer = document.querySelector('.sidebar-container');
            if (retryContainer) {
                console.log('✅ Container sidebar trouvé lors du retry, chargement en cours...');
                loadSidebar(retryContainer, sidebarPath);
            } else {
                console.error('❌ Container sidebar toujours non trouvé après retry!');
            }
        }, 1000);
    }

    async function loadSidebar(container, path) {
        try {
            // Vérifier le cache en premier
            const cachedSidebar = getCachedSidebar();
            if (cachedSidebar) {
                console.log('📋 Utilisation de la sidebar en cache');
                injectSidebarContent(container, cachedSidebar);
                return;
            }

            console.log('🔄 Chargement de la sidebar depuis le serveur');
            const response = await fetch(path);
            
            if (!response.ok) {
                throw new Error(`Erreur de chargement de la sidebar: ${response.statusText}`);
            }
            
            const html = await response.text();
            
            // Mettre en cache la sidebar
            cacheSidebar(html);
            
            // Injecter le contenu
            injectSidebarContent(container, html);
            
        } catch (error) {
            console.error('Erreur lors du chargement de la sidebar:', error);
            if (container) {
                container.innerHTML = '<p class="text-danger p-3">Le menu de navigation est indisponible.</p>';
            }
        }
    }

    function injectSidebarContent(container, html) {
        // Utiliser DOMParser pour créer un document à partir du HTML de la sidebar
        const parser = new DOMParser();
        const sidebarDoc = parser.parseFromString(html, 'text/html');
        const sidebarContent = sidebarDoc.querySelector('.sidebar-container');

        if (sidebarContent) {
            // Injecter le contenu de la sidebar
            container.innerHTML = sidebarContent.innerHTML;
            
            // Injecter les modals en dehors de la sidebar
            injectModals(sidebarDoc);
            
            // Activer le lien correspondant à la page actuelle
            setActiveLink();
            
            // Gérer le toggle sur mobile
            setupSidebarToggle();
            
            // Gérer l'expansion/réduction des sections
            setupSectionToggle();
            
            // Ajouter les indicateurs visuels pour l'expansion
            addExpandIndicators();
            
            // Forcer la mise à jour de l'affichage utilisateur après l'injection de la sidebar
            if (window.UserHeaderManager && window.UserHeaderManager.instance) {
                setTimeout(() => {
                    window.UserHeaderManager.instance.forceUpdateUserDisplay();
                }, 100);
            }
            
            // Réappliquer le branding après le chargement de la sidebar
            if (window.whenBrandingReady) {
                window.whenBrandingReady(function(config) {
                    if (config && window.SidebarBranding) {
                        console.log('🎨 Réapplication du branding à la sidebar...');
                        window.SidebarBranding.apply(config);
                    }
                });
            }

            // Mettre à jour la carte utilisateur de la sidebar avec les infos collaborateur
            if (window.sessionManager) {
                try {
                    window.sessionManager.initialize()
                        .then(() => {
                            // Mise à jour immédiate
                            updateSidebarUserCardFromSession();

                            // Mise à jour différée pour écraser d'éventuelles réécritures (ex: "COLLABORATEUR")
                            setTimeout(() => {
                                try {
                                    updateSidebarUserCardFromSession();
                                } catch (e) {
                                    console.warn('⚠️ Erreur lors de la mise à jour différée de la carte utilisateur sidebar:', e);
                                }
                            }, 800);
                        })
                        .catch(err => {
                            console.warn('⚠️ Impossible de charger la session pour la sidebar:', err);
                        });
                } catch (error) {
                    console.warn('⚠️ Erreur lors de la mise à jour de la carte utilisateur sidebar:', error);
                }
            }
            
            console.log('✅ Sidebar chargée et configurée avec succès');
        } else {
            console.error("Le contenu de la sidebar (.sidebar-container) n'a pas été trouvé dans le template.");
            container.innerHTML = '<p class="text-danger p-3">Erreur: Impossible de charger le menu.</p>';
        }
    }

    function injectModals(sidebarDoc) {
        // Récupérer tous les modals du template
        const modals = sidebarDoc.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            const modalId = modal.id;
            
            // Vérifier si le modal existe déjà dans le DOM
            if (!document.getElementById(modalId)) {
                // Injecter le modal dans le body
                document.body.appendChild(modal.cloneNode(true));
                console.log(`✅ Modal ${modalId} injecté`);
            } else {
                console.log(`⚠️ Modal ${modalId} existe déjà`);
            }
        });
    }

    // Cache de la sidebar
    function cacheSidebar(html) {
        sidebarCache = {
            html: html,
            timestamp: Date.now()
        };
        
        // Sauvegarder dans localStorage aussi
        try {
            localStorage.setItem('sidebarCache', JSON.stringify({
                html: html,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Impossible de sauvegarder la sidebar dans localStorage:', error);
        }
    }

    function getCachedSidebar() {
        const now = Date.now();
        
        // Vérifier le cache mémoire
        if (sidebarCache.html && (now - sidebarCache.timestamp) < sidebarCache.expiry) {
            return sidebarCache.html;
        }
        
        // Vérifier le localStorage
        try {
            const cached = localStorage.getItem('sidebarCache');
            if (cached) {
                const { html, timestamp } = JSON.parse(cached);
                if ((now - timestamp) < sidebarCache.expiry) {
                    // Mettre à jour le cache mémoire
                    sidebarCache = {
                        html: html,
                        timestamp: timestamp
                    };
                    return html;
                }
            }
        } catch (error) {
            console.warn('Erreur lors de la lecture du cache sidebar:', error);
        }
        
        return null;
    }

    // Fonction pour invalider le cache de la sidebar
    window.invalidateSidebarCache = function() {
        sidebarCache = {
            html: null,
            timestamp: 0
        };
        localStorage.removeItem('sidebarCache');
        console.log('🗑️ Cache de la sidebar invalidé');
    };

    // Fonction pour forcer le rechargement de la sidebar
    window.reloadSidebar = function() {
        const sidebarContainer = document.querySelector('.sidebar-container');
        if (sidebarContainer) {
            console.log('🔄 Rechargement forcé de la sidebar');
            invalidateSidebarCache();
            loadSidebar(sidebarContainer, '/template-modern-sidebar.html');
        }
    };

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
                
                // Ouvrir la section cliquée si elle n'était pas déjà ouverte
                if (!isExpanded) {
                    section.classList.add('expanded');
                }
            });
        });
    }

    function addExpandIndicators() {
        // Ajouter des indicateurs visuels pour les sections expansibles
        const sectionTitles = document.querySelectorAll('.sidebar-section-title');
        
        sectionTitles.forEach(title => {
            const section = title.closest('.sidebar-section');
            const hasChildren = section.querySelector('.sidebar-nav-link');
            
            if (hasChildren) {
                // Ajouter une icône de flèche si elle n'existe pas déjà
                if (!title.querySelector('.expand-indicator')) {
                    const indicator = document.createElement('i');
                    indicator.className = 'fas fa-chevron-right expand-indicator';
                    indicator.style.transition = 'transform 0.3s ease';
                    title.appendChild(indicator);
                }
            }
        });
        
        // Mettre à jour les indicateurs quand les sections changent
        const observer = new MutationObserver(() => {
            document.querySelectorAll('.sidebar-section').forEach(section => {
                const title = section.querySelector('.sidebar-section-title');
                const indicator = title?.querySelector('.expand-indicator');
                
                if (indicator) {
                    if (section.classList.contains('expanded')) {
                        indicator.style.transform = 'rotate(90deg)';
                    } else {
                        indicator.style.transform = 'rotate(0deg)';
                    }
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    // Met à jour la carte utilisateur de la sidebar à partir du SessionManager
    function updateSidebarUserCardFromSession() {
        if (!window.sessionManager || !window.sessionManager.isLoaded) {
            return;
        }

        let user = null;
        let collaborateur = null;

        try {
            user = window.sessionManager.getUser();
            collaborateur = window.sessionManager.getCollaborateur();
        } catch (error) {
            console.warn('⚠️ Impossible de récupérer les informations de session pour la sidebar:', error);
            return;
        }

        const nameElement = document.getElementById('userName');
        const roleElement = document.getElementById('userRole');
        const photoContainer = document.getElementById('sidebar-user-photo');

        // Nom complet
        if (nameElement && user) {
            const prenom = user.prenom || '';
            const nom = user.nom || '';
            const fullName = `${prenom} ${nom}`.trim();
            if (fullName) {
                nameElement.textContent = fullName;
            }
        }

        // Poste/grade OU rôles utilisateur
        if (roleElement) {
            let poste = null;
            let grade = null;

            if (collaborateur) {
                // Utilisateur avec compte collaborateur → poste + grade
                poste = collaborateur.poste_nom || null;
                grade = collaborateur.grade_nom || null;

                if (poste || grade) {
                    applyPosteGradeToRoleElement(roleElement, poste, grade);
                } else if (collaborateur.id) {
                    // Si poste/grade pas encore en session, essayer de les charger via l'API collaborateurs
                    fetchCollaborateurPosteGrade(collaborateur.id, roleElement);
                }
            } else if (user) {
                // Utilisateur SANS compte collaborateur → afficher les rôles
                let rolesText = null;

                if (Array.isArray(user.roles) && user.roles.length > 0) {
                    rolesText = user.roles.join(', ');
                } else if (user.role) {
                    rolesText = user.role;
                }

                roleElement.textContent = rolesText || 'Aucun rôle';
            }
        }

        // Photo du collaborateur
        if (photoContainer) {
            let photoUrl = null;

            if (user && user.collaborateur_photo_url) {
                photoUrl = user.collaborateur_photo_url;
            }

            // Nettoyer le contenu actuel
            photoContainer.innerHTML = '';

            if (photoUrl) {
                const img = document.createElement('img');
                img.src = `/${photoUrl}`;
                img.alt = user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : 'Photo collaborateur';
                img.className = 'sidebar-user-avatar-img';
                img.onerror = () => {
                    // Fallback sur les initiales si la photo ne se charge pas
                    renderSidebarInitials(photoContainer, user);
                };
                photoContainer.appendChild(img);
            } else {
                // Fallback sur les initiales si pas de photo
                renderSidebarInitials(photoContainer, user);
            }
        }
    }

    function renderSidebarInitials(container, user) {
        const initials = getUserInitials(user);
        const div = document.createElement('div');
        div.className = 'sidebar-user-avatar-initials';
        div.textContent = initials;
        container.innerHTML = '';
        container.appendChild(div);
    }

    function getUserInitials(user) {
        if (!user) return '';
        const nomInitial = user.nom ? user.nom.charAt(0).toUpperCase() : '';
        const prenomInitial = user.prenom ? user.prenom.charAt(0).toUpperCase() : '';
        return `${prenomInitial}${nomInitial}` || '';
    }

    function applyPosteGradeToRoleElement(roleElement, poste, grade) {
        if (!roleElement) return;

        if (poste && grade) {
            // Poste sur la première ligne, grade sur la ligne du dessous
            roleElement.innerHTML = `${poste}<br><small>${grade}</small>`;
        } else if (poste) {
            roleElement.textContent = poste;
        } else if (grade) {
            roleElement.textContent = grade;
        }
    }

    function fetchCollaborateurPosteGrade(collaborateurId, roleElement) {
        try {
            const token = localStorage.getItem('authToken');
            if (!token || !collaborateurId) return;

            fetch(`/api/collaborateurs/${collaborateurId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) throw new Error('Erreur API collaborateurs');
                return response.json();
            })
            .then(data => {
                const collab = data.data || data;
                const poste = collab.poste_nom || null;
                const grade = collab.grade_nom || null;
                applyPosteGradeToRoleElement(roleElement, poste, grade);
            })
            .catch(err => {
                console.warn('⚠️ Impossible de charger poste/grade collaborateur pour la sidebar:', err);
            });
        } catch (error) {
            console.warn('⚠️ Erreur lors du chargement collaborateur pour la sidebar:', error);
        }
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