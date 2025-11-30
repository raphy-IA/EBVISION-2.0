const { query } = require('./src/utils/database');

async function checkTypes() {
    try {
        const sql = `SELECT * FROM objective_types`;
        const result = await query(sql);
        console.log('Objective Types:', result.rows);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTypes();
