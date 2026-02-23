const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../utils/database');

/**
 * POST /api/auth/check-page-permission
 * Vérifier si l'utilisateur peut accéder à une page
 */
router.post('/check-page-permission', authenticateToken, async (req, res) => {
    try {
        const { pageName } = req.body;

        console.log('🔐 [check-page-permission] Vérification d\'accès pour:', pageName);
        console.log('   👤 User ID:', req.user.id);
        console.log('   📋 req.user.role:', req.user.role);
        console.log('   📋 req.user.roles:', req.user.roles);

        if (!pageName) {
            return res.status(400).json({
                success: false,
                message: 'Nom de page requis'
            });
        }

        // SUPER_ADMIN a accès à tout
        // Vérifier à la fois req.user.role (string) et req.user.roles (array)
        const isSuperAdmin = req.user.role === 'SUPER_ADMIN' ||
            (req.user.roles && req.user.roles.includes('SUPER_ADMIN'));

        console.log('   🔍 isSuperAdmin:', isSuperAdmin);

        if (isSuperAdmin) {
            console.log('   ✅ Accès autorisé (SUPER_ADMIN)');
            return res.json({
                success: true,
                message: 'Accès autorisé (SUPER_ADMIN)',
                pageName
            });
        }

        // 🔒 PROTECTION SPÉCIALE pour permissions-admin 
        // Cette page doit TOUJOURS être limitée à SUPER_ADMIN, ADMIN, ADMIN_IT
        // indépendamment de la configuration en base de données
        if (pageName === 'permissions-admin') {
            const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_IT'];
            const hasAccess = req.user.roles && req.user.roles.some(role => allowedRoles.includes(role));

            if (hasAccess) {
                console.log('   ✅ Accès autorisé à permissions-admin (protection hardcodée)');
                return res.json({
                    success: true,
                    message: 'Accès autorisé (protection spéciale permissions-admin)',
                    pageName,
                    userRoles: req.user.roles
                });
            } else {
                console.log('   ❌ Accès refusé à permissions-admin (protection hardcodée)');
                return res.status(403).json({
                    success: false,
                    message: 'Accès non autorisé à l\'administration des permissions',
                    pageName,
                    userRoles: req.user.roles,
                    requiredRoles: allowedRoles
                });
            }
        }

        // MAPPING DES PAGES VERS LES NOUVELLES PERMISSIONS MENUS
        const PAGE_PERMISSION_MAPPING = {
            // Dashboard
            'dashboard': 'menu.dashboard.dashboard_personnel',
            'dashboard-equipe': 'menu.dashboard.dashboard_equipe',
            'dashboard-direction': 'menu.dashboard.dashboard_direction',
            'dashboard-recouvrement': 'menu.dashboard.dashboard_recouvrement',
            'dashboard-rentabilite': 'menu.dashboard.dashboard_rentabilite',
            'dashboard-chargeabilite': 'menu.dashboard.dashboard_chargeabilite',
            'dashboard-optimise': 'menu.dashboard.dashboard_optimise',

            // Objectifs
            'mes-objectifs': 'menu.objectifs.mes_objectifs',
            'gestion-objectifs': 'menu.objectifs.gestion_des_objectifs',

            // Rapports
            'rapports': 'menu.rapports.rapports_generaux',
            'rapports-missions': 'menu.rapports.rapports_missions',
            'rapports-opportunites': 'menu.rapports.rapports_opportunites',
            'rapports-rh': 'menu.rapports.rapports_rh',
            'rapports-prospection': 'menu.rapports.rapports_de_prospection',

            // Gestion des Temps
            'feuilles-temps': 'menu.gestion_des_temps.saisie_des_temps',
            'validation-temps': 'menu.gestion_des_temps.validation_des_temps',

            // Gestion Mission
            'missions': 'menu.gestion_mission.missions',
            'details-mission': 'menu.gestion_mission.missions', // Accès si accès missions
            'types-mission': 'menu.gestion_mission.types_de_mission',
            'tasks': 'menu.gestion_mission.taches',

            // Market Pipeline
            'client-list': 'menu.market_pipeline.clients_et_prospects', // Anciennement clients.html ?
            'clients': 'menu.market_pipeline.clients_et_prospects',
            'contacts': 'menu.market_pipeline.clients_et_prospects', // Souvent lié aux clients
            'opportunities': 'menu.market_pipeline.opportunites',
            'opportunity-board': 'menu.market_pipeline.opportunites',
            'opportunity-types': 'menu.market_pipeline.types_d_opportunite',
            'prospecting-campaigns': 'menu.market_pipeline.campagnes_de_prospection',
            'campaign-validation': 'menu.market_pipeline.validation_des_campagnes',

            // Gestion RH
            'collaborateurs': 'menu.gestion_rh.collaborateurs',
            'types-collaborateurs': 'menu.gestion_rh.types_collaborateurs',
            'grades': 'menu.gestion_rh.grades',
            'postes': 'menu.gestion_rh.postes',
            'taux-horaires': 'menu.gestion_rh.taux_horaires',
            'objectives-config': 'menu.gestion_rh.configuration_objectifs',
            'managers': 'menu.gestion_rh.collaborateurs', // Pas de menu spécifique, lié aux collabs
            'supervisors': 'menu.gestion_rh.collaborateurs',

            // Configurations
            'fiscal-years': 'menu.configurations.annees_fiscales',
            'pays': 'menu.configurations.pays',
            'configuration-types-opportunites': 'menu.configurations.configuration_types_d_opportunite',
            'sources-entreprises': 'menu.configurations.sources_entreprises',
            'modeles-prospection': 'menu.configurations.modeles_de_prospection',
            'financial-settings': 'menu.configurations.parametres_financiers',

            // Business Unit
            'business-units': 'menu.business_unit.unites_d_affaires',
            'divisions': 'menu.business_unit.divisions',
            'activites-internes': 'menu.business_unit.activites_internes',
            'secteurs-activite': 'menu.business_unit.secteurs_d_activite',

            // Paramètres Administration
            'notification-settings': 'menu.parametres_administration.configuration_notifications',
            'users': 'menu.parametres_administration.utilisateurs',
            'user-list': 'menu.parametres_administration.utilisateurs',
            'permissions-admin': 'menu.parametres_administration.administration_des_permissions'
        };

        const normalizedPageName = pageName.toLowerCase().replace('.html', '');
        const targetPermission = PAGE_PERMISSION_MAPPING[normalizedPageName];

        console.log('   🔍 Page:', normalizedPageName);
        console.log('   🎯 Permission cible (Mapping):', targetPermission);

        if (targetPermission) {
            const permissionQuery = `
                SELECT 1
                FROM permissions p
                WHERE p.code = $1
                AND (
                    -- Via rôles
                    EXISTS (
                        SELECT 1
                        FROM role_permissions rp
                        JOIN user_roles ur ON rp.role_id = ur.role_id
                        WHERE ur.user_id = $2 AND p.id = rp.permission_id
                    )
                    OR
                    -- Permissions directes utilisateur
                    EXISTS (
                        SELECT 1
                        FROM user_permissions up
                        WHERE up.user_id = $2 AND up.permission_id = p.id
                    )
                )
            `;
            const result = await pool.query(permissionQuery, [targetPermission, req.user.id]);

            if (result.rows.length > 0) {
                console.log('   ✅ Accès autorisé (Permission mappée)');
                return res.json({
                    success: true,
                    message: 'Accès autorisé',
                    pageName,
                    mappedPermission: targetPermission
                });
            } else {
                console.log('   ❌ Accès refusé (Permission mappée manquante)');
                return res.status(403).json({
                    success: false,
                    message: `Accès refusé. Permission requise : ${targetPermission}`,
                    pageName,
                    requiredPermission: targetPermission
                });
            }
        }

        console.warn('   ⚠️  Aucun mapping trouvé pour cette page, tentative fallback sur legacy...');

        // Fallback: Vérifier les permissions 'page.*' (Legacy pour compatibilité temporaire)
        // Format du code de permission: 'page.{pageName}'
        // NORMALISATION: Gérer à la fois les tirets et les underscores
        const normalizePermissionCode = (code) => {
            return code.toLowerCase().replace(/-/g, '_');
        };

        const permissionCode = `page.${pageName}`;
        const normalizedCode = normalizePermissionCode(permissionCode);


        console.log('   🔍 Recherche de la permission:', permissionCode);
        console.log('   🔍 Code normalisé:', normalizedCode);

        // Requête avec normalisation pour gérer les variations de nommage
        const permissionQuery = `
            SELECT DISTINCT p.code, p.name
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1 
              AND LOWER(REPLACE(p.code, '-', '_')) = $2
        `;

        const permissionResult = await pool.query(permissionQuery, [req.user.id, normalizedCode]);

        if (permissionResult.rows.length > 0) {
            console.log('   ✅ Accès autorisé via permissions en base de données');
            console.log('   📋 Permission trouvée:', permissionResult.rows[0].name);
            return res.json({
                success: true,
                message: 'Accès autorisé via permission en base de données',
                pageName,
                userRoles: req.user.roles,
                permission: permissionResult.rows[0]
            });
        }

        // Si aucune permission n'est trouvée en base de données,
        // vérifier si la permission existe pour cette page (avec normalisation)
        const permissionExistsQuery = `
            SELECT code, name 
            FROM permissions 
            WHERE LOWER(REPLACE(code, '-', '_')) = $1
        `;

        const permissionExistsResult = await pool.query(permissionExistsQuery, [normalizedCode]);

        if (permissionExistsResult.rows.length > 0) {
            // La permission existe mais l'utilisateur ne l'a pas
            console.log('   ❌ Permission existe mais utilisateur ne l\'a pas');
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé à cette page (permission configurée)',
                pageName,
                userRoles: req.user.roles,
                requiredPermission: permissionCode
            });
        }

        // Si la permission n'existe pas en base de données,
        // accès par défaut pour tous les utilisateurs authentifiés
        console.log('   ℹ️  Permission non configurée en base - accès autorisé par défaut');
        return res.json({
            success: true,
            message: 'Accès autorisé par défaut (permission non configurée)',
            pageName,
            userRoles: req.user.roles
        });

    } catch (error) {
        console.error('Erreur lors de la vérification des permissions de page:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification des permissions'
        });
    }
});

module.exports = router;
