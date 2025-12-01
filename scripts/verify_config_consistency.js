const { pool } = require('../src/utils/database');
const { ENTITY_OPERATIONS } = require('../src/config/entity-operations-config');

async function verifyConsistency() {
    try {
        const res = await pool.query(`
            SELECT id, code, label, entity_type, operation, value_field 
            FROM objective_types 
            WHERE is_active = TRUE
            ORDER BY id
        `);

        console.log(`Checking ${res.rowCount} objective types against configuration...`);
        let errors = 0;

        res.rows.forEach(obj => {
            const entityConfig = ENTITY_OPERATIONS[obj.entity_type];

            if (!entityConfig) {
                console.error(`[${obj.id}] ${obj.code}: Invalid entity_type '${obj.entity_type}'`);
                errors++;
                return;
            }

            if (!entityConfig.operations[obj.operation]) {
                console.error(`[${obj.id}] ${obj.code}: Invalid operation '${obj.operation}' for entity '${obj.entity_type}'`);
                errors++;
            }

            // Check value field
            // The value_field in DB should match one of the 'field' properties in valueFields
            const validFields = Object.values(entityConfig.valueFields).map(f => f.field);

            // Special case for count mode where value_field might be 'id' or similar
            // But usually count mode uses 'id'.

            if (!validFields.includes(obj.value_field)) {
                console.error(`[${obj.id}] ${obj.code}: Invalid value_field '${obj.value_field}' for entity '${obj.entity_type}'. Valid fields: ${validFields.join(', ')}`);
                errors++;
            }
        });

        if (errors === 0) {
            console.log('✅ All objective types are consistent with configuration.');
        } else {
            console.log(`❌ Found ${errors} consistency errors.`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

verifyConsistency();
