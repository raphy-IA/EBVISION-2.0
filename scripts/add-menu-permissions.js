const { pool } = require('../src/utils/database');

async function addMenuPermissions() {
    let client;
    try {
        console.log('🔄 Ajout des permissions de menu...');
        client = await pool.connect();

        // Permissions de menu à ajouter
        const menuPermissions = [
            { code: 'menu.dashboard', name: 'Voir le menu Dashboard', description: 'Accès au menu Dashboard', category: 'menu' },
            { code: 'menu.reports', name: 'Voir le menu Rapports', description: 'Accès au menu Rapports', category: 'menu' },
            { code: 'menu.time_entries', name: 'Voir le menu Feuilles de temps', description: 'Accès au menu Feuilles de temps', category: 'menu' },
            { code: 'menu.missions', name: 'Voir le menu Missions', description: 'Accès au menu Missions', category: 'menu' },
            { code: 'menu.opportunities', name: 'Voir le menu Opportunités', description: 'Accès au menu Opportunités', category: 'menu' },
            { code: 'menu.collaborateurs', name: 'Voir le menu Collaborateurs', description: 'Accès au menu Collaborateurs', category: 'menu' },
            { code: 'menu.settings', name: 'Voir le menu Paramètres', description: 'Accès au menu Paramètres', category: 'menu' },
            { code: 'menu.business_units', name: 'Voir le menu Business Units', description: 'Accès au menu Business Units', category: 'menu' },
            { code: 'menu.users', name: 'Voir le menu Utilisateurs', description: 'Accès au menu Utilisateurs', category: 'menu' },
            { code: 'menu.permissions', name: 'Voir le menu Permissions', description: 'Accès au menu Administration des Permissions', category: 'menu' }
        ];

        // Ajouter chaque permission
        for (const permission of menuPermissions) {
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

        // Attribuer les permissions de menu aux rôles par défaut
        console.log('🔗 Attribution des permissions de menu aux rôles...');
        
        const rolePermissions = {
            'SUPER_ADMIN': menuPermissions.map(p => p.code), // Toutes les permissions
            'ADMIN': [
                'menu.dashboard', 'menu.reports', 'menu.time_entries', 'menu.missions',
                'menu.opportunities', 'menu.collaborateurs', 'menu.settings', 'menu.business_units',
                'menu.users', 'menu.permissions'
            ],
            'MANAGER': [
                'menu.dashboard', 'menu.reports', 'menu.time_entries', 'menu.missions',
                'menu.opportunities', 'menu.collaborateurs'
            ],
            'CONSULTANT': [
                'menu.dashboard', 'menu.time_entries', 'menu.missions', 'menu.opportunities'
            ],
            'COLLABORATEUR': [
                'menu.dashboard', 'menu.time_entries', 'menu.missions'
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

        console.log('✅ Permissions de menu ajoutées avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout des permissions de menu:', error);
    } finally {
        if (client) {
            client.release();
        }
        process.exit(0);
    }
}

// Exécuter le script
addMenuPermissions();
