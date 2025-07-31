const { pool } = require('../src/utils/database');

async function checkMissionTypes() {
    try {
        console.log('🔍 Vérification des types de mission existants');
        console.log('=============================================');

        const result = await pool.query(`
            SELECT id, codification, libelle, actif 
            FROM mission_types 
            ORDER BY codification
        `);

        console.log(`✅ Types de mission trouvés: ${result.rows.length}`);
        result.rows.forEach(type => {
            const status = type.actif ? 'ACTIF' : 'INACTIF';
            console.log(`   - ${type.codification}: ${type.libelle} (${status})`);
        });

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkMissionTypes(); 