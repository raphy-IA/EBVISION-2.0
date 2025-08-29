const fs = require('fs');
const path = require('path');
const { pool } = require('../src/utils/database');

async function cleanPermissionsTables() {
    const client = await pool.connect();
    
    try {
        console.log('🧹 Nettoyage complet des tables de permissions...');
        
        // Suppression des tables dans l'ordre (pour éviter les erreurs de contraintes)
        const tablesToDrop = [
            'permission_audit_log',
            'user_business_unit_access', 
            'user_permissions',
            'role_permissions',
            'permissions',
            'roles'
        ];
        
        for (const table of tablesToDrop) {
            try {
                await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
                console.log(`   ✅ Table ${table} supprimée`);
            } catch (error) {
                console.log(`   ⚠️ Erreur lors de la suppression de ${table}: ${error.message}`);
            }
        }
        
        console.log('✅ Nettoyage terminé');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        throw error;
    } finally {
        client.release();
    }
}

cleanPermissionsTables()
    .then(() => {
        console.log('✅ Nettoyage complété');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Échec du nettoyage:', error);
        process.exit(1);
    });
