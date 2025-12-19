require('dotenv').config();
const { pool } = require('./src/utils/database');

async function debugMissionStruct() {
    const missionCode = 'MIS-20251218-659';

    console.log(`🔍 Searching for mission with code: ${missionCode}`);

    try {
        // 1. Get Mission
        const missionRes = await pool.query('SELECT id, nom, mission_type_id FROM missions WHERE code = $1', [missionCode]);
        if (missionRes.rows.length === 0) {
            console.log('❌ Mission not found!');
            return;
        }
        const mission = missionRes.rows[0];
        console.log('✅ Mission found:', mission);

        // 2. Check Mission Documents
        const docsRes = await pool.query('SELECT * FROM mission_documents WHERE mission_id = $1', [mission.id]);
        console.log(`📂 Existing documents count: ${docsRes.rows.length}`);
        if (docsRes.rows.length > 0) {
            console.log('Documents:', docsRes.rows);
        }

        // 3. Check Mission Type
        if (mission.mission_type_id) {
            const typeRes = await pool.query('SELECT id, libelle, default_folder_structure FROM mission_types WHERE id = $1', [mission.mission_type_id]);
            const type = typeRes.rows[0];
            console.log('📋 Mission Type:', {
                id: type.id,
                libelle: type.libelle,
                has_default_structure: !!type.default_folder_structure,
                structure_preview: type.default_folder_structure ? JSON.stringify(type.default_folder_structure).substring(0, 100) + '...' : 'NULL'
            });
        } else {
            console.log('⚠️ Mission has no mission_type_id!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

debugMissionStruct();
