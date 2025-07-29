// Sidebar Moderne - JavaScript Amélioré

document.addEventListener('DOMContentLoaded', function() {
    // Initialisation de la sidebar moderne
    initModernSidebar();
    
    // Gestion du responsive
    handleResponsiveSidebar();
    
    // Animations et interactions
    setupSidebarAnimations();
});

function initModernSidebar() {
    const sidebar = document.querySelector('.sidebar-container');
    const toggleBtn = document.querySelector('.sidebar-toggle');
    
    if (!sidebar) {
        console.warn('Sidebar container non trouvé');
        return;
    }
    
    // Initialiser l'état actif
    setActiveNavItem();
    
    // Gestion du toggle mobile
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            this.classList.toggle('active');
            
            // Animation du bouton
            this.style.transform = this.classList.contains('active') 
                ? 'scale(1.1) rotate(180deg)' 
                : 'scale(1) rotate(0deg)';
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
}

function setActiveNavItem() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar-nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href.replace('.html', ''))) {
            link.classList.add('active');
            
            // Animation d'entrée pour l'élément actif
            setTimeout(() => {
                link.style.animation = 'slideInActive 0.5s ease';
            }, 100);
        }
    });
}

function handleResponsiveSidebar() {
    const sidebar = document.querySelector('.sidebar-container');
    const mainContent = document.querySelector('.main-content');
    
    function adjustLayout() {
        if (window.innerWidth > 768) {
            if (mainContent) {
                mainContent.style.marginLeft = '300px';
                mainContent.style.transition = 'margin-left 0.3s ease';
            }
        } else {
            if (mainContent) {
                mainContent.style.marginLeft = '0';
            }
        }
    }
    
    // Ajuster au chargement
    adjustLayout();
    
    // Ajuster au redimensionnement
    window.addEventListener('resize', adjustLayout);
}

function setupSidebarAnimations() {
    const navLinks = document.querySelectorAll('.sidebar-nav-link');
    
    navLinks.forEach((link, index) => {
        // Animation d'entrée progressive
        link.style.animationDelay = `${index * 0.1}s`;
        link.style.opacity = '0';
        link.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            link.style.transition = 'all 0.3s ease';
            link.style.opacity = '1';
            link.style.transform = 'translateX(0)';
        }, 100 + (index * 100));
        
        // Effet de hover amélioré
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(8px) scale(1.02)';
        });
        
        link.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateX(0) scale(1)';
            }
        });
    });
}

// Fonction pour ajouter des notifications dynamiques
function addNotificationBadge(linkSelector, count) {
    const link = document.querySelector(linkSelector);
    if (link && count > 0) {
        let badge = link.querySelector('.badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'badge';
            link.appendChild(badge);
        }
        badge.textContent = count;
        badge.style.animation = 'pulse 2s infinite';
    }
}

// Fonction pour mettre à jour les informations utilisateur
function updateUserInfo(username, role) {
    const userInfo = document.querySelector('.sidebar-user-info');
    if (userInfo) {
        userInfo.innerHTML = `
            <i class="fas fa-user-circle"></i>
            <span>${username}</span>
            <small style="display: block; opacity: 0.7; margin-top: 2px;">${role}</small>
        `;
    }
}

// Animation CSS pour l'élément actif
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInActive {
        0% {
            transform: translateX(-20px) scale(0.95);
            opacity: 0;
        }
        100% {
            transform: translateX(8px) scale(1);
            opacity: 1;
        }
    }
    
    .sidebar-nav-link {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .sidebar-nav-link:hover {
        transform: translateX(8px) scale(1.02);
    }
    
    .sidebar-nav-link.active {
        transform: translateX(8px) scale(1.02);
    }
`;
document.head.appendChild(style);

// Exposer les fonctions globalement
window.SidebarManager = {
    addNotificationBadge,
    updateUserInfo,
    setActiveNavItem
};
