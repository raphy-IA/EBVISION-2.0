const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../roles-permissions.json');

try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    console.log(`📊 Avant nettoyage : ${data.permissions.length} permissions`);

    const legacyPermissions = [
        'dashboard.chargeabilite',
        'dashboard.rentabilite',
        'dashboard.direction',
        'dashboard.recouvrement',
        'dashboard.personnel',
        'dashboard.equipe',
        'dashboard.optimise',
        'dashboard.commercial'
    ];

    // Filtrer les permissions
    const initialCount = data.permissions.length;
    data.permissions = data.permissions.filter(p => !legacyPermissions.includes(p.code));
    const removedCount = initialCount - data.permissions.length;

    console.log(`🧹 ${removedCount} permissions obsolètes supprimées de la liste des permissions.`);

    // Nettoyer aussi les associations role_permissions
    const initialLinksCount = data.rolePermissions.length;
    data.rolePermissions = data.rolePermissions.filter(rp => !legacyPermissions.includes(rp.permission_code));
    const removedLinksCount = initialLinksCount - data.rolePermissions.length;

    console.log(`🔗 ${removedLinksCount} associations obsolètes supprimées.`);

    console.log(`📊 Après nettoyage : ${data.permissions.length} permissions`);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ Fichier roles-permissions.json mis à jour avec succès.');

} catch (error) {
    console.error('❌ Erreur:', error);
}
