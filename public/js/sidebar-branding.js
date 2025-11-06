/**
 * Script d'application du branding spécifique à la sidebar
 * Complète le branding-loader pour la sidebar
 */

// Attendre que le branding soit chargé
window.whenBrandingReady(function(config) {
    console.log('🎨 Application du branding à la sidebar...');
    
    applySidebarBranding(config);
});

function applySidebarBranding(config) {
    // Appliquer le nom de l'application (utiliser sidebarTitle en priorité)
    const appName = document.getElementById('app-name');
    if (appName) {
        const title = config.ui?.sidebarTitle || config.app?.name || config.app?.shortName;
        if (title) {
            appName.textContent = title;
            console.log('  ✓ Nom sidebar:', title);
        }
    }
    
    // Appliquer le tagline
    const appTagline = document.getElementById('app-tagline');
    if (appTagline) {
        const subtitle = config.ui?.sidebarSubtitle || config.app?.tagline;
        if (subtitle) {
            appTagline.textContent = subtitle;
            console.log('  ✓ Tagline sidebar:', subtitle);
        }
    }
    
    // Appliquer le footer
    const footerText = document.getElementById('footer-text');
    if (footerText && config.ui?.footer?.copyright) {
        footerText.textContent = config.ui.footer.copyright;
        console.log('  ✓ Footer copyright:', config.ui.footer.copyright);
    }
    
    const footerSubtitle = document.getElementById('footer-subtitle');
    if (footerSubtitle && config.ui?.footer?.text) {
        footerSubtitle.textContent = config.ui.footer.text;
        console.log('  ✓ Footer text:', config.ui.footer.text);
    }
    
    // Si un logo est défini, le charger
    if (config.branding?.logo?.icon) {
        loadBrandLogo(config.branding.logo.icon);
    }
    
    console.log('✅ Branding sidebar appliqué');
}

function loadBrandLogo(logoUrl) {
    // Vérifier si le logo existe sur le serveur
    fetch(logoUrl, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                // Remplacer l'icône par l'image du logo
                const sidebarHeader = document.querySelector('.sidebar-header h3');
                if (sidebarHeader) {
                    const icon = sidebarHeader.querySelector('i');
                    if (icon) {
                        // Créer un élément img pour le logo
                        const logoImg = document.createElement('img');
                        logoImg.src = logoUrl;
                        logoImg.alt = 'Logo';
                        logoImg.className = 'brand-logo-sidebar';
                        logoImg.style.cssText = 'height: 30px; width: auto; vertical-align: middle; margin-right: 10px;';
                        
                        // Gérer les erreurs de chargement de l'image
                        logoImg.onerror = () => {
                            // Si l'image ne charge pas, garder l'icône par défaut
                            console.debug('Logo non chargé, utilisation de l\'icône par défaut');
                        };
                        
                        // Remplacer l'icône par le logo
                        icon.replaceWith(logoImg);
                    }
                }
            } else {
                // Fichier non trouvé, utiliser l'icône par défaut (pas d'erreur dans la console)
                console.debug('Logo non trouvé, utilisation de l\'icône par défaut');
            }
        })
        .catch(error => {
            // Erreur silencieuse - c'est normal si le fichier n'existe pas
            // On utilise console.debug au lieu de console.warn pour éviter de polluer la console
            console.debug('Logo non disponible, utilisation de l\'icône par défaut');
        });
}

// Exposer les fonctions globalement
window.SidebarBranding = {
    apply: applySidebarBranding,
    loadLogo: loadBrandLogo
};

