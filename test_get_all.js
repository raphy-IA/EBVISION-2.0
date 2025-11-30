const Objective = require('./src/models/Objective');
const { pool } = require('./src/utils/database');

async function testGetAll() {
    try {
        const fiscalYearId = 'aa312d1a-92b6-4462-96e8-8483c9460cb8';
        console.log(`Testing getAllObjectives with FY ${fiscalYearId}...`);
        const objectives = await Objective.getAllObjectives(fiscalYearId);
        console.log('Success! Found', objectives.length, 'objectives.');
        process.exit(0);
    } catch (error) {
        console.error('Error in getAllObjectives:', error);
        process.exit(1);
    }
}

testGetAll();
