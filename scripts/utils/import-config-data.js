const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

// Configuration
const EXPORT_DIR = path.join(__dirname, '../database/dumps');

async function importTable(tableName, rows, conflictColumns = ['id']) {
    if (!rows || rows.length === 0) return;
    console.log(`Importing ${rows.length} rows into ${tableName}...`);

    try {
        // Filter out columns that might be generated or problematic
        const columns = Object.keys(rows[0]).filter(c => c !== 'matricule' && c !== 'manager_id');

        let importedCount = 0;

        for (const row of rows) {
            const values = columns.map(col => row[col]);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
            const quotedColumns = columns.map(c => `"${c}"`).join(', ');

            // Exclude conflict columns AND timestamps from UPDATE
            const ignoredInUpdate = [...conflictColumns, 'created_at', 'updated_at'];

            const updateClause = columns
                .filter(col => !ignoredInUpdate.includes(col))
                .map(col => `"${col}" = EXCLUDED."${col}"`)
                .join(', ');

            const conflictStr = conflictColumns.map(c => `"${c}"`).join(', ');

            const doAction = updateClause.length > 0
                ? `DO UPDATE SET ${updateClause}`
                : 'DO NOTHING';

            const query = `
                INSERT INTO "${tableName}" (${quotedColumns}) 
                VALUES (${placeholders}) 
                ON CONFLICT (${conflictStr}) ${doAction}
            `;

            await pool.query(query, values);
            importedCount++;
        }
        console.log(`✅ Imported ${importedCount} rows.`);

    } catch (error) {
        throw error;
    }
}

async function runImport() {
    try {
        let filename = process.argv[2];
        if (!filename) {
            const files = fs.readdirSync(EXPORT_DIR)
                .filter(f => f.endsWith('.json') && f.startsWith('config_export_'))
                .sort()
                .reverse();
            if (files.length === 0) {
                console.error('No export files found in ' + EXPORT_DIR);
                process.exit(1);
            }
            filename = files[0];
            console.log(`Using latest export file: ${filename}`);
        }

        const filePath = path.join(EXPORT_DIR, filename);
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`📖 Loaded configuration data from ${filename}`);

        console.log('🚀 Starting import...');
        await pool.query('BEGIN');

        try {
            await pool.query("SET session_replication_role = 'replica';");
            console.log('  Testing Mode: Triggers disabled (Replication Role Set)');
        } catch (e) {
            console.warn('  ⚠️ Could not disable triggers (insufficient privileges?). Proceeding anyway.');
        }

        // Helper to run import with logging
        const tryImport = async (name, data, conflict) => {
            try {
                await importTable(name, data, conflict);
            } catch (e) {
                console.error(`🚨 FAILED to import table: ${name}`);

                const errLog = `
Table: ${name}
Message: ${e.message}
Code: ${e.code}
Detail: ${e.detail}
Hint: ${e.hint}
Position: ${e.position}
Columns: ${data && data[0] ? Object.keys(data[0]).join(', ') : 'No data'}
                `;
                fs.writeFileSync('import_error.txt', errLog);
                console.error('Details written to import_error.txt');

                // Stop transaction
                throw e;
            }
        };

        // 1. Roles & Permissions
        await tryImport('permissions', data.permissions, ['id']);
        await tryImport('roles', data.roles, ['id']);
        await tryImport('role_permissions', data.role_permissions, ['role_id', 'permission_id']);

        // 2. Users
        await tryImport('users', data.users, ['id']);
        await tryImport('user_roles', data.user_roles, ['user_id', 'role_id']);


        // 3. Organization
        await tryImport('business_units', data.business_units, ['id']);
        await tryImport('divisions', data.divisions, ['id']);
        // Services removed from export
        // await tryImport('services', data.services, ['id']);

        // 4. RH
        await tryImport('grades', data.grades, ['id']);
        await tryImport('postes', data.postes, ['id']);
        await tryImport('types_collaborateurs', data.types_collaborateurs, ['id']);

        // 5. Collaborators
        if (data.collaborators && data.collaborators.length > 0) {
            const collabTable = data._meta?.collaborators_table_name || 'collaborateurs';
            console.log(`Importing collaborators into ${collabTable}...`);
            await tryImport(collabTable, data.collaborators, ['id']);
        }

        // 6. Settings
        await tryImport('financial_settings', data.financial_settings, ['key']);
        await tryImport('notification_settings', data.notification_settings, ['id']);
        await tryImport('objective_types', data.objective_types, ['code']);

        await pool.query('COMMIT');
        console.log('✅ Import completed successfully!');
        process.exit(0);

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Import failed (Rolled back).');
        process.exit(1);
    }
}

runImport();
