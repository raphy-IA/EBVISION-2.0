// Script pour créer les permissions de menu manquantes
require('dotenv').config();
const { Pool } = require('pg');

async function createMenuPermissions() {
    console.log('🔧 Création des permissions de menu manquantes...\n');
    
    try {
        const productionPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'ebpadfbq_eb_vision_2_0',
            user: process.env.DB_USER || 'ebpadfbq_eb_admin20',
            password: process.env.DB_PASSWORD || '87ifet-Z)&',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            ssl: false,
            family: 4
        });

        console.log('1️⃣ Test de connexion...');
        const testResult = await productionPool.query('SELECT NOW() as current_time');
        console.log(`✅ Connexion réussie - Heure: ${testResult.rows[0].current_time}`);

        console.log('\n2️⃣ Création des permissions de menu...');
        
        // Toutes les permissions de menu nécessaires
        const menuPermissions = [
            // Dashboard
            { name: 'menu.dashboard.main', description: 'Accès au tableau de bord principal' },
            { name: 'menu.dashboard.personal', description: 'Accès au dashboard personnel' },
            { name: 'menu.dashboard.team', description: 'Accès au dashboard équipe' },
            { name: 'menu.dashboard.direction', description: 'Accès au dashboard direction' },
            { name: 'menu.dashboard.recovery', description: 'Accès au dashboard recouvrement' },
            { name: 'menu.dashboard.profitability', description: 'Accès au dashboard rentabilité' },
            { name: 'menu.dashboard.chargeability', description: 'Accès au dashboard chargeabilité' },
            { name: 'menu.dashboard.analytics', description: 'Accès aux analytics et indicateurs' },
            { name: 'menu.dashboard.optimized', description: 'Accès au dashboard optimisé' },
            
            // Rapports
            { name: 'menu.reports.general', description: 'Accès aux rapports généraux' },
            { name: 'menu.reports.missions', description: 'Accès aux rapports missions' },
            { name: 'menu.reports.opportunities', description: 'Accès aux rapports opportunités' },
            { name: 'menu.reports.hr', description: 'Accès aux rapports RH' },
            { name: 'menu.reports.prospecting', description: 'Accès aux rapports de prospection' },
            
            // Gestion des temps
            { name: 'menu.time_entries.input', description: 'Accès à la saisie des temps' },
            { name: 'menu.time_entries.approval', description: 'Accès à la validation des temps' },
            
            // Gestion mission
            { name: 'menu.missions.list', description: 'Accès à la liste des missions' },
            { name: 'menu.missions.types', description: 'Accès aux types de mission' },
            { name: 'menu.missions.tasks', description: 'Accès aux tâches' },
            { name: 'menu.missions.invoices', description: 'Accès aux factures et paiements' },
            
            // Market Pipeline
            { name: 'menu.opportunities.clients', description: 'Accès aux clients et prospects' },
            { name: 'menu.opportunities.list', description: 'Accès à la liste des opportunités' },
            { name: 'menu.opportunities.types', description: 'Accès aux types d\'opportunité' },
            { name: 'menu.opportunities.campaigns', description: 'Accès aux campagnes de prospection' },
            { name: 'menu.opportunities.validations', description: 'Accès à la validation des campagnes' },
            
            // Gestion RH
            { name: 'menu.collaborateurs.list', description: 'Accès à la liste des collaborateurs' },
            { name: 'menu.collaborateurs.grades', description: 'Accès aux grades' },
            { name: 'menu.collaborateurs.positions', description: 'Accès aux postes' },
            
            // Configurations
            { name: 'menu.settings.fiscal_years', description: 'Accès aux années fiscales' },
            { name: 'menu.settings.countries', description: 'Accès aux pays' },
            
            // Business Unit
            { name: 'menu.business_units.list', description: 'Accès aux unités d\'affaires' },
            { name: 'menu.business_units.divisions', description: 'Accès aux divisions' },
            { name: 'menu.business_units.managers', description: 'Accès aux responsables BU/Division' },
            { name: 'menu.business_units.internal_activities', description: 'Accès aux activités internes' },
            { name: 'menu.business_units.sectors', description: 'Accès aux secteurs d\'activité' },
            { name: 'menu.business_units.opportunity_config', description: 'Accès à la configuration types d\'opportunité' },
            { name: 'menu.business_units.sources', description: 'Accès aux sources et entreprises' },
            { name: 'menu.business_units.templates', description: 'Accès aux modèles de prospection' },
            { name: 'menu.business_units.campaigns', description: 'Accès aux campagnes de prospection' },
            { name: 'menu.business_units.campaign_validations', description: 'Accès aux validations de campagnes' },
            
            // Administration
            { name: 'menu.users.notifications', description: 'Accès à la configuration des notifications' },
            { name: 'menu.users.list', description: 'Accès à la liste des utilisateurs' },
            { name: 'menu.users.permissions', description: 'Accès à l\'administration des permissions' }
        ];

        let createdCount = 0;
        let errorCount = 0;

        for (const permission of menuPermissions) {
            try {
                await productionPool.query(`
                    INSERT INTO permissions (id, name, description, category) 
                    VALUES (gen_random_uuid(), $1, $2, 'menu')
                    ON CONFLICT (name) DO NOTHING
                `, [permission.name, permission.description]);
                
                // Vérifier si l'insertion a réussi
                const checkResult = await productionPool.query(
                    'SELECT id FROM permissions WHERE name = $1', 
                    [permission.name]
                );
                
                if (checkResult.rows.length > 0) {
                    console.log(`   ✅ ${permission.name}`);
                    createdCount++;
                } else {
                    console.log(`   ⚠️ ${permission.name} - déjà existante`);
                }
                
            } catch (error) {
                console.log(`   ❌ ${permission.name} - ${error.message}`);
                errorCount++;
            }
        }

        console.log('\n3️⃣ Association des permissions au rôle SUPER_ADMIN...');
        
        // Récupérer le rôle SUPER_ADMIN
        const superAdminRole = await productionPool.query(
            'SELECT id FROM roles WHERE name = $1', 
            ['SUPER_ADMIN']
        );
        
        if (superAdminRole.rows.length > 0) {
            const roleId = superAdminRole.rows[0].id;
            let associatedCount = 0;
            
            // Associer toutes les permissions de menu au rôle SUPER_ADMIN
            for (const permission of menuPermissions) {
                try {
                    const permissionResult = await productionPool.query(
                        'SELECT id FROM permissions WHERE name = $1', 
                        [permission.name]
                    );
                    
                    if (permissionResult.rows.length > 0) {
                        const permissionId = permissionResult.rows[0].id;
                        
                        await productionPool.query(`
                            INSERT INTO role_permissions (id, role_id, permission_id) 
                            VALUES (gen_random_uuid(), $1, $2)
                            ON CONFLICT (role_id, permission_id) DO NOTHING
                        `, [roleId, permissionId]);
                        
                        associatedCount++;
                    }
                } catch (error) {
                    console.log(`   ❌ Erreur association ${permission.name}: ${error.message}`);
                }
            }
            
            console.log(`   ✅ ${associatedCount} permissions associées au rôle SUPER_ADMIN`);
        }

        await productionPool.end();
        
        console.log('\n🎉 Création des permissions terminée !');
        console.log(`📊 Résumé:`);
        console.log(`   ✅ Permissions créées: ${createdCount}`);
        console.log(`   ❌ Erreurs: ${errorCount}`);
        console.log(`   📋 Total permissions de menu: ${menuPermissions.length}`);
        
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Redémarrez l\'application: pm2 restart eb-vision-2-0');
        console.log('2. Rechargez la page des utilisateurs');
        console.log('3. Tous les menus devraient maintenant être visibles !');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

createMenuPermissions().catch(console.error);









