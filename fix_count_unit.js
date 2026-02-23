
const { query } = require('./src/utils/database');

async function main() {
    try {
        const sql = "UPDATE objective_units SET is_active = TRUE, type = 'COUNT' WHERE code = 'COUNT'";
        const result = await query(sql);
        console.log('Fixed COUNT unit:', result.rowCount, 'rows updated');

        const check = await query("SELECT * FROM objective_units WHERE code = 'COUNT'");
        console.log('Current state of COUNT unit:', JSON.stringify(check.rows[0], null, 2));
    } catch (error) {
        console.error(error);
    }
}

main();
