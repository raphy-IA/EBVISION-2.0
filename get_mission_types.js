require('dotenv').config();
const { pool } = require('./src/utils/database');
const MissionType = require('./src/models/MissionType');

async function getMissionTypes() {
    try {
        const types = await MissionType.findAll();
        console.log('Mission Types:');
        console.log(JSON.stringify(types, null, 2));
    } catch (error) {
        console.error('Error fetching mission types:', error);
    } finally {
        await pool.end();
    }
}

getMissionTypes();
