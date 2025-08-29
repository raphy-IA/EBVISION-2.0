const { pool } = require('../src/utils/database');

async function addGranularMenuPermissions() {
    let client;
    try {
        console.log('🔄 Ajout des permissions granulaires de menu...');
        client = await pool.connect();

        // Permissions granulaires pour chaque lien de menu
        const granularPermissions = [
            // Dashboard
            { code: 'menu.dashboard.main', name: 'Voir le Dashboard principal', description: 'Accès au tableau de bord principal', category: 'menu' },
            { code: 'menu.dashboard.personal', name: 'Voir le Dashboard Personnel', description: 'Accès au dashboard personnel', category: 'menu' },
            { code: 'menu.dashboard.team', name: 'Voir le Dashboard Équipe', description: 'Accès au dashboard équipe', category: 'menu' },
            { code: 'menu.dashboard.direction', name: 'Voir le Dashboard Direction', description: 'Accès au dashboard direction', category: 'menu' },
            { code: 'menu.dashboard.recovery', name: 'Voir le Dashboard Recouvrement', description: 'Accès au dashboard recouvrement', category: 'menu' },
            { code: 'menu.dashboard.profitability', name: 'Voir le Dashboard Rentabilité', description: 'Accès au dashboard rentabilité', category: 'menu' },
            { code: 'menu.dashboard.chargeability', name: 'Voir le Dashboard Chargeabilité', description: 'Accès au dashboard chargeabilité', category: 'menu' },
            { code: 'menu.dashboard.analytics', name: 'Voir Analytics & Indicateurs', description: 'Accès aux analytics et indicateurs', category: 'menu' },
            { code: 'menu.dashboard.optimized', name: 'Voir le Dashboard Optimisé', description: 'Accès au dashboard optimisé', category: 'menu' },

            // Rapports
            { code: 'menu.reports.general', name: 'Voir les Rapports généraux', description: 'Accès aux rapports généraux', category: 'menu' },
            { code: 'menu.reports.missions', name: 'Voir les Rapports missions', description: 'Accès aux rapports missions', category: 'menu' },
            { code: 'menu.reports.opportunities', name: 'Voir les Rapports opportunités', description: 'Accès aux rapports opportunités', category: 'menu' },
            { code: 'menu.reports.hr', name: 'Voir les Rapports RH', description: 'Accès aux rapports RH', category: 'menu' },
            { code: 'menu.reports.prospecting', name: 'Voir les Rapports de prospection', description: 'Accès aux rapports de prospection', category: 'menu' },

            // Gestion des Temps
            { code: 'menu.time_entries.input', name: 'Voir la Saisie des temps', description: 'Accès à la saisie des temps', category: 'menu' },
            { code: 'menu.time_entries.approval', name: 'Voir la Validation des temps', description: 'Accès à la validation des temps', category: 'menu' },

            // Gestion Mission
            { code: 'menu.missions.list', name: 'Voir les Missions', description: 'Accès à la liste des missions', category: 'menu' },
            { code: 'menu.missions.types', name: 'Voir les Types de mission', description: 'Accès aux types de mission', category: 'menu' },
            { code: 'menu.missions.tasks', name: 'Voir les Tâches', description: 'Accès aux tâches', category: 'menu' },
            { code: 'menu.missions.invoices', name: 'Voir les Factures et paiements', description: 'Accès aux factures et paiements', category: 'menu' },

            // Market Pipeline
            { code: 'menu.opportunities.clients', name: 'Voir les Clients et prospects', description: 'Accès aux clients et prospects', category: 'menu' },
            { code: 'menu.opportunities.list', name: 'Voir les Opportunités', description: 'Accès à la liste des opportunités', category: 'menu' },
            { code: 'menu.opportunities.types', name: 'Voir les Types d\'opportunité', description: 'Accès aux types d\'opportunité', category: 'menu' },
            { code: 'menu.opportunities.campaigns', name: 'Voir les Campagnes de prospection', description: 'Accès aux campagnes de prospection', category: 'menu' },
            { code: 'menu.opportunities.validations', name: 'Voir la Validation des campagnes', description: 'Accès à la validation des campagnes', category: 'menu' },

            // Gestion RH
            { code: 'menu.collaborateurs.list', name: 'Voir les Collaborateurs', description: 'Accès à la liste des collaborateurs', category: 'menu' },
            { code: 'menu.collaborateurs.grades', name: 'Voir les Grades', description: 'Accès aux grades', category: 'menu' },
            { code: 'menu.collaborateurs.positions', name: 'Voir les Postes', description: 'Accès aux postes', category: 'menu' },

            // Configurations
            { code: 'menu.settings.fiscal_years', name: 'Voir les Années fiscales', description: 'Accès aux années fiscales', category: 'menu' },
            { code: 'menu.settings.countries', name: 'Voir les Pays', description: 'Accès aux pays', category: 'menu' },

            // Business Unit
            { code: 'menu.business_units.list', name: 'Voir les Unités d\'affaires', description: 'Accès aux unités d\'affaires', category: 'menu' },
            { code: 'menu.business_units.divisions', name: 'Voir les Divisions', description: 'Accès aux divisions', category: 'menu' },
            { code: 'menu.business_units.managers', name: 'Voir les Responsables BU/Division', description: 'Accès aux responsables BU/Division', category: 'menu' },
            { code: 'menu.business_units.internal_activities', name: 'Voir les Activités internes', description: 'Accès aux activités internes', category: 'menu' },
            { code: 'menu.business_units.sectors', name: 'Voir les Secteurs d\'activité', description: 'Accès aux secteurs d\'activité', category: 'menu' },
            { code: 'menu.business_units.opportunity_config', name: 'Voir la Configuration types d\'opportunité', description: 'Accès à la configuration des types d\'opportunité', category: 'menu' },
            { code: 'menu.business_units.sources', name: 'Voir les Sources & Entreprises', description: 'Accès aux sources et entreprises', category: 'menu' },
            { code: 'menu.business_units.templates', name: 'Voir les Modèles de prospection', description: 'Accès aux modèles de prospection', category: 'menu' },
            { code: 'menu.business_units.campaigns', name: 'Voir les Campagnes de prospection (BU)', description: 'Accès aux campagnes de prospection', category: 'menu' },
            { code: 'menu.business_units.campaign_validations', name: 'Voir les Validations de campagnes', description: 'Accès aux validations de campagnes', category: 'menu' },

            // Paramètres Administration
            { code: 'menu.users.notifications', name: 'Voir la Configuration notifications', description: 'Accès à la configuration des notifications', category: 'menu' },
            { code: 'menu.users.list', name: 'Voir les Utilisateurs', description: 'Accès à la liste des utilisateurs', category: 'menu' },
            { code: 'menu.users.permissions', name: 'Voir l\'Administration des Permissions', description: 'Accès à l\'administration des permissions', category: 'menu' }
        ];

        // Ajouter chaque permission
        for (const permission of granularPermissions) {
            console.log(`📝 Ajout de la permission: ${permission.code}`);
            
            const result = await client.query(`
                INSERT INTO permissions (code, name, description, category)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (code) DO NOTHING
                RETURNING id
            `, [permission.code, permission.name, permission.description, permission.category]);

            if (result.rows.length > 0) {
                console.log(`✅ Permission ajoutée: ${permission.code} (ID: ${result.rows[0].id})`);
            } else {
                console.log(`⚠️ Permission déjà existante: ${permission.code}`);
            }
        }

        // Attribuer les permissions granulaires aux rôles par défaut
        console.log('🔗 Attribution des permissions granulaires aux rôles...');
        
        const rolePermissions = {
            'SUPER_ADMIN': granularPermissions.map(p => p.code), // Toutes les permissions
            'ADMIN': [
                // Dashboard - tout
                'menu.dashboard.main', 'menu.dashboard.personal', 'menu.dashboard.team', 'menu.dashboard.direction',
                'menu.dashboard.recovery', 'menu.dashboard.profitability', 'menu.dashboard.chargeability',
                'menu.dashboard.analytics', 'menu.dashboard.optimized',
                // Rapports - tout
                'menu.reports.general', 'menu.reports.missions', 'menu.reports.opportunities', 'menu.reports.hr', 'menu.reports.prospecting',
                // Temps - tout
                'menu.time_entries.input', 'menu.time_entries.approval',
                // Missions - tout
                'menu.missions.list', 'menu.missions.types', 'menu.missions.tasks', 'menu.missions.invoices',
                // Opportunités - tout
                'menu.opportunities.clients', 'menu.opportunities.list', 'menu.opportunities.types',
                'menu.opportunities.campaigns', 'menu.opportunities.validations',
                // Collaborateurs - tout
                'menu.collaborateurs.list', 'menu.collaborateurs.grades', 'menu.collaborateurs.positions',
                // Configurations - tout
                'menu.settings.fiscal_years', 'menu.settings.countries',
                // Business Unit - tout
                'menu.business_units.list', 'menu.business_units.divisions', 'menu.business_units.managers',
                'menu.business_units.internal_activities', 'menu.business_units.sectors',
                'menu.business_units.opportunity_config', 'menu.business_units.sources',
                'menu.business_units.templates', 'menu.business_units.campaigns', 'menu.business_units.campaign_validations',
                // Administration - tout
                'menu.users.notifications', 'menu.users.list', 'menu.users.permissions'
            ],
            'MANAGER': [
                // Dashboard - limité
                'menu.dashboard.main', 'menu.dashboard.personal', 'menu.dashboard.team',
                // Rapports - tout
                'menu.reports.general', 'menu.reports.missions', 'menu.reports.opportunities', 'menu.reports.hr', 'menu.reports.prospecting',
                // Temps - tout
                'menu.time_entries.input', 'menu.time_entries.approval',
                // Missions - tout
                'menu.missions.list', 'menu.missions.types', 'menu.missions.tasks', 'menu.missions.invoices',
                // Opportunités - tout
                'menu.opportunities.clients', 'menu.opportunities.list', 'menu.opportunities.types',
                'menu.opportunities.campaigns', 'menu.opportunities.validations',
                // Collaborateurs - limité
                'menu.collaborateurs.list'
            ],
            'CONSULTANT': [
                // Dashboard - limité
                'menu.dashboard.main', 'menu.dashboard.personal',
                // Temps - tout
                'menu.time_entries.input', 'menu.time_entries.approval',
                // Missions - limité
                'menu.missions.list', 'menu.missions.tasks',
                // Opportunités - limité
                'menu.opportunities.clients', 'menu.opportunities.list'
            ],
            'COLLABORATEUR': [
                // Dashboard - limité
                'menu.dashboard.main', 'menu.dashboard.personal',
                // Temps - limité
                'menu.time_entries.input',
                // Missions - limité
                'menu.missions.list', 'menu.missions.tasks'
            ]
        };

        for (const [roleName, permissions] of Object.entries(rolePermissions)) {
            console.log(`🔗 Attribution des permissions au rôle: ${roleName}`);
            
            // Récupérer l'ID du rôle
            const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [roleName]);
            if (roleResult.rows.length === 0) {
                console.log(`⚠️ Rôle non trouvé: ${roleName}`);
                continue;
            }
            
            const roleId = roleResult.rows[0].id;
            
            // Attribuer chaque permission
            for (const permissionCode of permissions) {
                const permResult = await client.query('SELECT id FROM permissions WHERE code = $1', [permissionCode]);
                if (permResult.rows.length === 0) {
                    console.log(`⚠️ Permission non trouvée: ${permissionCode}`);
                    continue;
                }
                
                const permissionId = permResult.rows[0].id;
                
                await client.query(`
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES ($1, $2)
                    ON CONFLICT (role_id, permission_id) DO NOTHING
                `, [roleId, permissionId]);
                
                console.log(`✅ Permission ${permissionCode} attribuée au rôle ${roleName}`);
            }
        }

        console.log('✅ Permissions granulaires de menu ajoutées avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout des permissions granulaires:', error);
    } finally {
        if (client) {
            client.release();
        }
        process.exit(0);
    }
}

// Exécuter le script
addGranularMenuPermissions();
