const { query } = require('./src/utils/database');
async function run() {
    try {
        const tables = ['global_objectives', 'business_unit_objectives', 'division_objectives', 'individual_objectives'];
        for (const t of tables) {
            const res = await query(`SELECT id, target_value FROM ${t} WHERE id = 38`);
            if (res.rows.length > 0) console.log(`Found ID 38 in ${t}:`, res.rows[0]);
        }

        if (buRes.rows.length > 0) {
            const target = buRes.rows[0].target_value;
            console.log('\n--- Divisions liées à ce parent (Colonnes Modernes) ---');
            const divModernRes = await query('SELECT id, division_id, target_value FROM division_objectives WHERE parent_bu_objective_id = 38');
            console.log('Modern:', divModernRes.rows);

            console.log('\n--- Divisions liées à ce parent (Colonnes Legacy) ---');
            const divLegacyRes = await query('SELECT id, division_id, target_value FROM division_objectives WHERE business_unit_objective_id = 38');
            console.log('Legacy:', divLegacyRes.rows);

            const total = [...divModernRes.rows, ...divLegacyRes.rows].reduce((sum, r) => sum + parseFloat(r.target_value), 0);
            console.log('\nTotal Distribué:', total);
            console.log('Restant theorique:', target - total);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
