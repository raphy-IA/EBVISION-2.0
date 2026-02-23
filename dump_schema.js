
const { query } = require('./src/utils/database');

async function main() {
    try {
        const tableName = process.argv[2] || 'permissions';
        const result = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1
            ORDER BY ordinal_position
        `, [tableName]);
        console.log(`Schema for ${tableName}:`);
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (error) {
        console.error(error);
    }
}

main();
