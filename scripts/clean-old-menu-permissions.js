const { pool } = require('../src/utils/database');

async function cleanOldMenuPermissions() {
    console.log('🧹 Nettoyage des anciennes permissions de menu...\n');

    try {
        // Liste des permissions de menu obsolètes à supprimer
        // Ce sont les anciennes permissions qui ne correspondent plus à la structure actuelle
        const obsoletePermissions = [
            // Anciennes permissions "Business Units" (maintenant dispersées)
            'menu.business_units',
            'menu.business_units.campaign_validations',
            'menu.business_units.campaigns',
            'menu.business_units.divisions',
            'menu.business_units.internal_activities',
            'menu.business_units.list',
            'menu.business_units.managers',
            'menu.business_units.opportunity_config',
            'menu.business_units.sectors',
            'menu.business_units.sources',
            'menu.business_units.templates',
            
            // Anciennes permissions "Collaborateurs" (maintenant GESTION RH)
            'menu.collaborateurs',
            'menu.collaborateurs.grades',
            'menu.collaborateurs.list',
            'menu.collaborateurs.positions',
            
            // Anciennes permissions "Dashboard" (avec codes anglais)
            'menu.dashboard',
            'menu.dashboard.analytics',
            'menu.dashboard.chargeability',
            'menu.dashboard.direction',
            'menu.dashboard.main',
            'menu.dashboard.optimized',
            'menu.dashboard.personal',
            'menu.dashboard.profitability',
            'menu.dashboard.recovery',
            'menu.dashboard.team',
            
            // Anciennes permissions "Missions" (maintenant GESTION MISSION)
            'menu.missions',
            'menu.missions.invoices',
            'menu.missions.list',
            'menu.missions.tasks',
            'menu.missions.types',
            
            // Anciennes permissions "Opportunities" (maintenant MARKET PIPELINE)
            'menu.opportunities',
            'menu.opportunities.campaigns',
            'menu.opportunities.clients',
            'menu.opportunities.list',
            'menu.opportunities.types',
            'menu.opportunities.validations',
            
            // Anciennes permissions "Permissions" (maintenant PARAMÈTRES ADMINISTRATION)
            'menu.permissions',
            
            // Anciennes permissions "Reports" (maintenant RAPPORTS)
            'menu.reports',
            'menu.reports.general',
            'menu.reports.hr',
            'menu.reports.missions',
            'menu.reports.opportunities',
            'menu.reports.prospecting',
            
            // Anciennes permissions "Settings" (maintenant CONFIGURATIONS)
            'menu.settings',
            'menu.settings.countries',
            'menu.settings.fiscal_years',
            
            // Anciennes permissions "Time Entries" (maintenant GESTION DES TEMPS)
            'menu.time_entries',
            'menu.time_entries.approval',
            'menu.time_entries.input',
            
            // Anciennes permissions "Users" (maintenant PARAMÈTRES ADMINISTRATION)
            'menu.users',
            'menu.users.list',
            'menu.users.notifications',
            'menu.users.permissions'
        ];

        console.log(`📋 ${obsoletePermissions.length} permissions obsolètes à supprimer\n`);

        // Supprimer chaque permission obsolète
        let deleted = 0;
        for (const permCode of obsoletePermissions) {
            const result = await pool.query(`
                DELETE FROM permissions WHERE code = $1
                RETURNING id, name
            `, [permCode]);

            if (result.rows.length > 0) {
                console.log(`✅ Supprimé: ${permCode}`);
                console.log(`   "${result.rows[0].name}"`);
                deleted++;
            } else {
                console.log(`⚠️  Non trouvé: ${permCode}`);
            }
        }

        console.log(`\n✅ Nettoyage terminé: ${deleted} permissions supprimées`);

        // Afficher les permissions de menu restantes
        const remainingResult = await pool.query(`
            SELECT code, name, category
            FROM permissions
            WHERE code LIKE 'menu.%'
            ORDER BY category, code
        `);

        console.log(`\n📊 Permissions de menu restantes: ${remainingResult.rows.length}`);
        console.log('='.repeat(80));
        
        let currentCategory = '';
        remainingResult.rows.forEach(perm => {
            if (perm.category !== currentCategory) {
                console.log(`\n📁 ${perm.category}:`);
                currentCategory = perm.category;
            }
            console.log(`  ✓ ${perm.code}`);
        });

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

cleanOldMenuPermissions();





