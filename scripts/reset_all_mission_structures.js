require('dotenv').config();
const { pool } = require('../src/utils/database');

async function resetAllMissionStructures() {
    console.log('🚀 Starting Global Mission Structure Reset...');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get all missions that have a mission type
        const missionsQuery = `
            SELECT m.id, m.nom, m.mission_type_id, mt.libelle as type_libelle, mt.default_folder_structure
            FROM missions m
            JOIN mission_types mt ON m.mission_type_id = mt.id
            WHERE mt.default_folder_structure IS NOT NULL
        `;
        const res = await client.query(missionsQuery);
        const missions = res.rows;

        console.log(`Found ${missions.length} missions to process.`);

        for (const mission of missions) {
            console.log(`\n🔄 Processing Mission: "${mission.nom}" (${mission.type_libelle})...`);

            // 2. DELETE existing structure
            // WARNING: This deletes ALL document references for this mission.
            await client.query('DELETE FROM mission_documents WHERE mission_id = $1', [mission.id]);
            console.log(`   🗑️  Cleared existing documents.`);

            // 3. REGENERATE structure
            if (mission.default_folder_structure) {
                await createNodes(client, mission.default_folder_structure, mission.id, null);
                console.log(`   ✅ Generated new structure.`);
            }
        }

        await client.query('COMMIT');
        console.log('\n🎉 All missions have been reset to current Default Structure.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error during reset:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Helper to recursively create nodes
async function createNodes(client, nodes, missionId, parentId) {
    for (const node of nodes) {
        // Use locking from JSON if specified, otherwise default to true for template items
        const isLocked = node.is_locked !== undefined ? node.is_locked : true;

        const query = `
            INSERT INTO mission_documents (mission_id, parent_id, name, type, is_locked, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;
        // created_by is null for system generation
        const res = await client.query(query, [missionId, parentId, node.name, node.type, isLocked, null]);
        const newId = res.rows[0].id;

        if (node.children && node.children.length > 0) {
            await createNodes(client, node.children, missionId, newId);
        }
    }
}

resetAllMissionStructures();
