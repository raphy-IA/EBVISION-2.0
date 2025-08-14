require('dotenv').config();
const { pool } = require('./src/utils/database');

async function checkMissionsStructure() {
    console.log('🔍 Vérification de la structure missions...\n');

    const client = await pool.connect();
    
    try {
        // 1. Structure de la table missions
        console.log('1️⃣ Structure de la table missions...');
        const structure = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'missions'
            ORDER BY ordinal_position
        `);
        
        console.log('   Colonnes missions:');
        structure.rows.forEach(col => {
            console.log(`     - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // 2. Vérifier les colonnes financières
        console.log('\n2️⃣ Colonnes financières...');
        const financialColumns = structure.rows.filter(col => 
            col.column_name.includes('montant') || 
            col.column_name.includes('budget') ||
            col.column_name.includes('facture') ||
            col.column_name.includes('cout') ||
            col.column_name.includes('prix')
        );
        
        if (financialColumns.length > 0) {
            console.log('   Colonnes financières trouvées:');
            financialColumns.forEach(col => {
                console.log(`     - ${col.column_name}: ${col.data_type}`);
            });
        } else {
            console.log('   ❌ Aucune colonne financière trouvée');
        }

        // 3. Données de test
        console.log('\n3️⃣ Données de test...');
        const testData = await client.query('SELECT * FROM missions LIMIT 3');
        console.log(`   Missions (${testData.rows.length}):`);
        testData.rows.forEach(mission => {
            console.log(`     - ${mission.titre} (ID: ${mission.id})`);
            console.log(`       Statut: ${mission.statut}`);
            console.log(`       Colonnes disponibles: ${Object.keys(mission).join(', ')}`);
        });

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkMissionsStructure(); 