/**
 * sidebar.js - Gestion du chargement et du cache de la sidebar moderne
 */

// Cache global pour la sidebar
let sidebarCache = {
    html: null,
    timestamp: 0,
    expiry: 1 * 60 * 1000 // 1 minute (réduit pour le développement)
};

// --- FONCTIONS EXPOSÉES GLOBALEMENT ---

/**
 * Invalide le cache de la sidebar (mémoire + localStorage)
 */
window.invalidateSidebarCache = function () {
    sidebarCache.html = null;
    sidebarCache.timestamp = 0;
    localStorage.removeItem('sidebarCache');
    console.log('🗑️ Cache de la sidebar moderne invalidé');
};

/**
 * Force le rechargement immédiat de la sidebar
 */
window.reloadSidebar = function () {
    const container = document.querySelector('.sidebar-container');
    if (container) {
        console.log('🔄 Rechargement forcé de la sidebar...');
        window.invalidateSidebarCache();
        loadSidebar(container, '/template-modern-sidebar.html');
    }
};

/**
 * Charge le template de la sidebar et l'injecte dans le conteneur
 */
async function loadSidebar(container, path) {
    try {
        // 1. Vérifier le cache
        const cached = getCachedSidebar();
        if (cached) {
            console.log('📋 Sidebar chargée depuis le cache');
            injectSidebarContent(container, cached);
            return;
        }

        // 2. Charger depuis le serveur
        console.log('🔄 Chargement de la sidebar depuis le serveur...');
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const html = await response.text();

        // 3. Mettre en cache
        cacheSidebar(html);

        // 4. Injecter
        injectSidebarContent(container, html);

    } catch (error) {
        console.error('❌ Erreur lors du chargement de la sidebar:', error);
        if (container) {
            container.innerHTML = '<p class="text-danger p-3">Navigation indisponible.</p>';
        }
    }
}

// --- FONCTIONS INTERNES ---

function getCachedSidebar() {
    const now = Date.now();

    // Cache mémoire
    if (sidebarCache.html && (now - sidebarCache.timestamp) < sidebarCache.expiry) {
        return sidebarCache.html;
    }

    // localStorage
    try {
        const stored = localStorage.getItem('sidebarCache');
        if (stored) {
            const { html, timestamp } = JSON.parse(stored);
            if ((now - timestamp) < sidebarCache.expiry) {
                sidebarCache.html = html;
                sidebarCache.timestamp = timestamp;
                return html;
            }
        }
    } catch (e) { }
    return null;
}

function cacheSidebar(html) {
    const timestamp = Date.now();
    sidebarCache.html = html;
    sidebarCache.timestamp = timestamp;
    try {
        localStorage.setItem('sidebarCache', JSON.stringify({ html, timestamp }));
    } catch (e) { }
}

function injectSidebarContent(container, html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const content = doc.querySelector('.sidebar-container');

    if (content) {
        container.innerHTML = content.innerHTML;

        // Initialiser les fonctionnalités
        injectModals(doc);
        setActiveLink();
        setupSidebarToggle();
        setupSectionToggle();
        addExpandIndicators();
        ensureSidebarUserCardUpdatedWithRetry();

        // Branding
        if (window.whenBrandingReady && window.SidebarBranding) {
            window.whenBrandingReady(config => window.SidebarBranding.apply(config));
        }

        // User Header Sync
        if (window.UserHeaderManager?.instance) {
            setTimeout(() => window.UserHeaderManager.instance.forceUpdateUserDisplay(), 100);
        }

        console.log('✅ Sidebar injectée et initialisée');
    }
}

function injectModals(doc) {
    doc.querySelectorAll('.modal').forEach(modal => {
        if (!document.getElementById(modal.id)) {
            document.body.appendChild(modal.cloneNode(true));
        }
    });
}

function setActiveLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.sidebar-nav-link');

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('active');
            const section = link.closest('.sidebar-section');
            if (section) section.classList.add('expanded');
        }
    });
}

function setupSidebarToggle() {
    const toggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar-container');
    if (toggle && sidebar) {
        toggle.onclick = () => sidebar.classList.toggle('open');
    }
}

function setupSectionToggle() {
    document.querySelectorAll('.sidebar-section-title').forEach(title => {
        title.onclick = function () {
            const section = this.closest('.sidebar-section');
            const wasExpanded = section.classList.contains('expanded');

            // Fermer les autres
            document.querySelectorAll('.sidebar-section').forEach(s => s.classList.remove('expanded'));

            // Toggle celle-ci
            if (!wasExpanded) section.classList.add('expanded');
        };
    });
}

function addExpandIndicators() {
    document.querySelectorAll('.sidebar-section-title').forEach(title => {
        const section = title.closest('.sidebar-section');
        if (section.querySelector('.sidebar-nav-link') && !title.querySelector('.expand-indicator')) {
            const i = document.createElement('i');
            i.className = 'fas fa-chevron-right expand-indicator';
            title.appendChild(i);
        }
    });
}

function ensureSidebarUserCardUpdatedWithRetry(retries = 5) {
    const update = (count) => {
        if (window.sessionManager) {
            window.sessionManager.initialize()
                .then(() => updateSidebarUserCard())
                .catch(() => { });
        } else if (count < retries) {
            setTimeout(() => update(count + 1), 300);
        }
    };
    update(0);
}

function updateSidebarUserCard() {
    if (!window.sessionManager?.isLoaded) return;
    const user = window.sessionManager.getUser();
    const collab = window.sessionManager.getCollaborateur();

    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    const photoEl = document.getElementById('sidebar-user-photo');

    if (nameEl && user) nameEl.textContent = `${user.prenom || ''} ${user.nom || ''}`.trim();
    if (roleEl) {
        if (collab?.poste_nom) {
            roleEl.innerHTML = `${collab.poste_nom}<br><small>${collab.grade_nom || ''}</small>`;
        } else if (user?.role) {
            roleEl.textContent = Array.isArray(user.roles) ? user.roles.join(', ') : user.role;
        }
    }
    // Photo handling logic omitted for brevity but can be restored if needed
}

// --- INITIALISATION ---

document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.sidebar-container');
    if (container) {
        setTimeout(() => loadSidebar(container, '/template-modern-sidebar.html'), 500);
    }
});