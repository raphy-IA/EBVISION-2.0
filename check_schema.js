const { query } = require('./src/utils/database');

async function checkSchema() {
    try {
        console.log('Checking division_objectives columns...');
        const res = await query(`
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'division_objectives';
        `);
        console.log(res.rows.map(r => r.column_name));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSchema();
