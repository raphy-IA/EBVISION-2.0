const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'eb_vision_2_0',
    password: 'password',
    port: 5432,
});

async function restoreBusinessUnitDirect() {
    try {
        console.log('🔧 Restauration directe de la Business Unit supprimée...\n');
        
        // ID de la BU supprimée
        const buId = '6e4b98fc-a29a-4652-8f12-496778fc5197';
        
        // D'abord, vérifier l'état actuel de la BU
        console.log('📋 Vérification de l\'état actuel...');
        const checkQuery = `
            SELECT id, nom, code, statut, updated_at
            FROM business_units 
            WHERE id = $1
        `;
        
        const checkResult = await pool.query(checkQuery, [buId]);
        
        if (checkResult.rows.length === 0) {
            console.log('❌ Business Unit non trouvée');
            return;
        }
        
        const bu = checkResult.rows[0];
        console.log(`✅ BU trouvée: ${bu.nom} (${bu.code})`);
        console.log(`   Statut actuel: ${bu.statut}`);
        console.log(`   Dernière modification: ${bu.updated_at}`);
        
        if (bu.statut === 'ACTIF') {
            console.log('✅ La BU est déjà active, aucune action nécessaire');
            return;
        }
        
        // Restaurer la BU en la remettant à ACTIF
        console.log('🔄 Restauration de la BU...');
        const restoreQuery = `
            UPDATE business_units 
            SET statut = 'ACTIF', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, nom, code, statut, updated_at
        `;
        
        const restoreResult = await pool.query(restoreQuery, [buId]);
        
        if (restoreResult.rows.length > 0) {
            const restoredBU = restoreResult.rows[0];
            console.log('✅ Business Unit restaurée avec succès !');
            console.log(`   Nom: ${restoredBU.nom}`);
            console.log(`   Code: ${restoredBU.code}`);
            console.log(`   Nouveau statut: ${restoredBU.statut}`);
            console.log(`   Restaurée le: ${restoredBU.updated_at}`);
        } else {
            console.log('❌ Erreur lors de la restauration');
        }
        
        // Vérifier le résultat final
        console.log('\n🔍 Vérification du résultat final...');
        const finalCheckQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE statut = 'ACTIF') as active_count,
                COUNT(*) FILTER (WHERE statut = 'INACTIF') as inactive_count,
                COUNT(*) as total_count
            FROM business_units
        `;
        
        const finalResult = await pool.query(finalCheckQuery);
        const stats = finalResult.rows[0];
        
        console.log(`📈 Statistiques finales:`);
        console.log(`   ✅ BU Actives: ${stats.active_count}`);
        console.log(`   ❌ BU Inactives: ${stats.inactive_count}`);
        console.log(`   📊 Total: ${stats.total_count}`);
        
        // Vérifier spécifiquement notre BU restaurée
        const specificCheck = await pool.query(checkQuery, [buId]);
        if (specificCheck.rows.length > 0) {
            const finalBU = specificCheck.rows[0];
            console.log(`\n✅ Vérification finale:`);
            console.log(`   La BU "${finalBU.nom}" est maintenant ${finalBU.statut}`);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la restauration
restoreBusinessUnitDirect();
