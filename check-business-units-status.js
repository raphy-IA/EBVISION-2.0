const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'eb_vision_2_0',
    password: 'password',
    port: 5432,
});

async function checkBusinessUnitsStatus() {
    try {
        console.log('🔍 Vérification de l\'état des Business Units...\n');
        
        // D'abord, vérifier si la table existe
        const tableCheckQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'business_units'
            );
        `;
        
        const tableExists = await pool.query(tableCheckQuery);
        console.log('📋 Table business_units existe:', tableExists.rows[0].exists);
        
        if (!tableExists.rows[0].exists) {
            console.log('❌ La table business_units n\'existe pas !');
            return;
        }
        
        // Vérifier la structure de la table
        const structureQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'business_units'
            ORDER BY ordinal_position;
        `;
        
        const structure = await pool.query(structureQuery);
        console.log('🏗️  Structure de la table business_units:');
        structure.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        console.log('');
        
        // Récupérer toutes les BU avec leur statut
        const query = `
            SELECT 
                id,
                nom,
                code,
                statut,
                created_at,
                updated_at
            FROM business_units 
            ORDER BY nom
        `;
        
        console.log('🔍 Exécution de la requête...');
        const result = await pool.query(query);
        console.log(`📊 Total Business Units trouvées: ${result.rows.length}\n`);
        
        if (result.rows.length === 0) {
            console.log('❌ Aucune Business Unit trouvée dans la base de données');
            return;
        }
        
        // Afficher le détail de chaque BU
        result.rows.forEach((bu, index) => {
            const statusIcon = bu.statut === 'ACTIF' ? '✅' : '❌';
            console.log(`${index + 1}. ${statusIcon} ${bu.nom} (${bu.code})`);
            console.log(`   Statut: ${bu.statut}`);
            console.log(`   ID: ${bu.id}`);
            console.log(`   Créée: ${bu.created_at}`);
            console.log(`   Modifiée: ${bu.updated_at}`);
            console.log('');
        });
        
        // Compter par statut
        const activeCount = result.rows.filter(bu => bu.statut === 'ACTIF').length;
        const inactiveCount = result.rows.filter(bu => bu.statut === 'INACTIF').length;
        
        console.log('📈 Résumé par statut:');
        console.log(`   ✅ ACTIF: ${activeCount}`);
        console.log(`   ❌ INACTIF: ${inactiveCount}`);
        
        // Vérifier les BU inactives
        const inactiveBUs = result.rows.filter(bu => bu.statut === 'INACTIF');
        if (inactiveBUs.length > 0) {
            console.log('\n⚠️  Business Units inactives (supprimées):');
            inactiveBUs.forEach(bu => {
                console.log(`   - ${bu.nom} (${bu.code}) - ID: ${bu.id}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter la vérification
checkBusinessUnitsStatus();
