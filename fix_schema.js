const { query } = require('./src/utils/database');

async function fixSchema() {
    try {
        console.log('Adding objective_type_id to division_objectives...');
        await query(`
            ALTER TABLE division_objectives 
            ADD COLUMN IF NOT EXISTS objective_type_id INTEGER REFERENCES objective_types(id);
        `);

        console.log('Adding objective_type_id to grade_objectives...');
        await query(`
            ALTER TABLE grade_objectives 
            ADD COLUMN IF NOT EXISTS objective_type_id INTEGER REFERENCES objective_types(id);
        `);

        console.log('Adding objective_type_id to individual_objectives...');
        await query(`
            ALTER TABLE individual_objectives 
            ADD COLUMN IF NOT EXISTS objective_type_id INTEGER REFERENCES objective_types(id);
        `);

        console.log('Schema updated successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

fixSchema();
