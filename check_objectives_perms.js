
const { query } = require('./src/utils/database');

async function main() {
    try {
        const sql = "SELECT code, label FROM permissions WHERE code LIKE 'objectives%'";
        const result = await query(sql);
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (error) {
        console.error(error);
    }
}

main();
