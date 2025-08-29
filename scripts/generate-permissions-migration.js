const fs = require('fs');
const path = require('path');

// Définition des permissions par catégorie
const permissions = {
    dashboard: [
        { code: 'dashboard.view', name: 'Voir le dashboard', description: 'Accès au tableau de bord principal' },
        { code: 'dashboard.edit', name: 'Modifier le dashboard', description: 'Modification des widgets et configuration' },
        { code: 'dashboard.admin', name: 'Administrer le dashboard', description: 'Configuration complète du dashboard' }
    ],
    opportunities: [
        { code: 'opportunities.view', name: 'Voir les opportunités', description: 'Lecture des opportunités' },
        { code: 'opportunities.create', name: 'Créer des opportunités', description: 'Création de nouvelles opportunités' },
        { code: 'opportunities.edit', name: 'Modifier les opportunités', description: 'Modification des opportunités existantes' },
        { code: 'opportunities.delete', name: 'Supprimer les opportunités', description: 'Suppression d\'opportunités' },
        { code: 'opportunities.validate', name: 'Valider les étapes', description: 'Validation des étapes d\'opportunités' }
    ],
    campaigns: [
        { code: 'campaigns.view', name: 'Voir les campagnes', description: 'Lecture des campagnes de prospection' },
        { code: 'campaigns.create', name: 'Créer des campagnes', description: 'Création de nouvelles campagnes' },
        { code: 'campaigns.edit', name: 'Modifier les campagnes', description: 'Modification des campagnes existantes' },
        { code: 'campaigns.delete', name: 'Supprimer les campagnes', description: 'Suppression de campagnes' },
        { code: 'campaigns.execute', name: 'Exécuter les campagnes', description: 'Exécution des campagnes de prospection' },
        { code: 'campaigns.validate', name: 'Valider les campagnes', description: 'Validation des campagnes' }
    ],
    missions: [
        { code: 'missions.view', name: 'Voir les missions', description: 'Lecture des missions' },
        { code: 'missions.create', name: 'Créer des missions', description: 'Création de nouvelles missions' },
        { code: 'missions.edit', name: 'Modifier les missions', description: 'Modification des missions existantes' },
        { code: 'missions.delete', name: 'Supprimer les missions', description: 'Suppression de missions' },
        { code: 'missions.assign', name: 'Assigner des missions', description: 'Assignation de missions aux collaborateurs' }
    ],
    clients: [
        { code: 'clients.view', name: 'Voir les clients', description: 'Lecture des données clients' },
        { code: 'clients.create', name: 'Créer des clients', description: 'Création de nouveaux clients' },
        { code: 'clients.edit', name: 'Modifier les clients', description: 'Modification des données clients' },
        { code: 'clients.delete', name: 'Supprimer les clients', description: 'Suppression de clients' }
    ],
    users: [
        { code: 'users.view', name: 'Voir les utilisateurs', description: 'Lecture des données utilisateurs' },
        { code: 'users.create', name: 'Créer des utilisateurs', description: 'Création de nouveaux utilisateurs' },
        { code: 'users.edit', name: 'Modifier les utilisateurs', description: 'Modification des données utilisateurs' },
        { code: 'users.delete', name: 'Supprimer les utilisateurs', description: 'Suppression d\'utilisateurs' },
        { code: 'users.permissions', name: 'Gérer les permissions', description: 'Gestion des permissions utilisateurs' }
    ],
    reports: [
        { code: 'reports.view', name: 'Voir les rapports', description: 'Accès aux rapports' },
        { code: 'reports.create', name: 'Créer des rapports', description: 'Création de nouveaux rapports' },
        { code: 'reports.export', name: 'Exporter les rapports', description: 'Export des rapports' },
        { code: 'reports.admin', name: 'Administrer les rapports', description: 'Configuration des rapports' }
    ],
    config: [
        { code: 'config.view', name: 'Voir la configuration', description: 'Lecture de la configuration système' },
        { code: 'config.edit', name: 'Modifier la configuration', description: 'Modification de la configuration' },
        { code: 'config.admin', name: 'Administrer la configuration', description: 'Configuration complète du système' },
        { code: 'permissions.manage', name: 'Gérer les permissions', description: 'Gestion du système de permissions' }
    ]
};

function generatePermissionsSQL() {
    let sql = '-- Insertion des permissions par catégorie\n';
    
    Object.entries(permissions).forEach(([category, perms]) => {
        sql += `-- ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
        sql += 'INSERT INTO permissions (code, name, nom, description, category, module) VALUES\n';
        
        const values = perms.map(perm => 
            `('${perm.code}', '${perm.name}', '${perm.name}', '${perm.description}', '${category}', '${category}')`
        );
        
        sql += values.join(',\n') + '\nON CONFLICT (code) DO NOTHING;\n\n';
    });
    
    return sql;
}

// Générer le SQL
const permissionsSQL = generatePermissionsSQL();

// Écrire dans un fichier temporaire
const outputPath = path.join(__dirname, '../database/migrations/046_generated_permissions.sql');
fs.writeFileSync(outputPath, permissionsSQL);

console.log('✅ Migration des permissions générée avec succès');
console.log(`📁 Fichier créé: ${outputPath}`);
console.log('\n📋 Contenu généré:');
console.log(permissionsSQL);
