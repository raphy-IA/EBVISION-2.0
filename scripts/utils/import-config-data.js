const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

// Configuration
const EXPORT_DIR = path.join(__dirname, '../database/dumps');

async function importTable(tableName, rows, conflictColumns = ['id'], strategy = 'UPSERT') {
    if (!rows || rows.length === 0) return;
    console.log(`Importing ${rows.length} rows into ${tableName}... (${strategy})`);

    try {
        // Filter out columns that might be generated or problematic
        const columns = Object.keys(rows[0]).filter(c => c !== 'matricule' && c !== 'manager_id');

        let importedCount = 0;

        for (const row of rows) {
            const values = columns.map(col => row[col]);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
            const quotedColumns = columns.map(c => `"${c}"`).join(', ');

            const conflictStr = conflictColumns.map(c => `"${c}"`).join(', ');

            let doAction;
            if (strategy === 'INSERT_ONLY') {
                // DO NOTHING - garde les données existantes, ajoute seulement les nouvelles
                doAction = 'DO NOTHING';
            } else {
                // UPSERT - met à jour les données existantes
                // Exclude conflict columns AND timestamps from UPDATE
                const ignoredInUpdate = [...conflictColumns, 'created_at', 'updated_at'];

                const updateClause = columns
                    .filter(col => !ignoredInUpdate.includes(col))
                    .map(col => `"${col}" = EXCLUDED."${col}"`)
                    .join(', ');

                doAction = updateClause.length > 0
                    ? `DO UPDATE SET ${updateClause}`
                    : 'DO NOTHING';
            }

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

        // Helper with strategy support
        const tryImportWithStrategy = async (name, data, conflict, strategy = 'UPSERT') => {
            try {
                await importTable(name, data, conflict, strategy);
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

        // 1. Permissions = INSERT_ONLY (fusionner avec permissions locales)
        await tryImportWithStrategy('permissions', data.permissions, ['code'], 'INSERT_ONLY');

        // 2. Roles = INSERT_ONLY (garder locaux, ajouter nouveaux)
        await tryImportWithStrategy('roles', data.roles, ['name'], 'INSERT_ONLY');

        // 2b. Role Permissions = UPSERT (synchroniser permissions des rôles avec prod)
        await tryImportWithStrategy('role_permissions', data.role_permissions, ['role_id', 'permission_id'], 'UPSERT');

        // 3. Users = INSERT_ONLY (ajouter uniquement nouveaux)
        await tryImportWithStrategy('users', data.users, ['email'], 'INSERT_ONLY');
        await tryImportWithStrategy('user_roles', data.user_roles, ['user_id', 'role_id'], 'INSERT_ONLY');


        // 4. Organization = INSERT_ONLY (ajouter uniquement nouveaux)
        await tryImportWithStrategy('business_units', data.business_units, ['code'], 'INSERT_ONLY');
        await tryImportWithStrategy('divisions', data.divisions, ['code'], 'INSERT_ONLY');
        // Services removed from export
        // await tryImportWithStrategy('services', data.services, ['id'], 'INSERT_ONLY');

        // 5. RH = INSERT_ONLY (données de référence)
        await tryImportWithStrategy('grades', data.grades, ['code'], 'INSERT_ONLY');
        await tryImportWithStrategy('postes', data.postes, ['code'], 'INSERT_ONLY');
        await tryImportWithStrategy('types_collaborateurs', data.types_collaborateurs, ['code'], 'INSERT_ONLY');

        // 6. Collaborators = INSERT_ONLY (ajouter uniquement nouveaux)
        if (data.collaborators && data.collaborators.length > 0) {
            const collabTable = data._meta?.collaborators_table_name || 'collaborateurs';
            console.log(`Importing collaborators into ${collabTable}...`);
            await tryImportWithStrategy(collabTable, data.collaborators, ['email'], 'INSERT_ONLY');
        }

        // 7. Settings = INSERT_ONLY
        await tryImportWithStrategy('financial_settings', data.financial_settings, ['key'], 'INSERT_ONLY');
        await tryImportWithStrategy('notification_settings', data.notification_settings, ['id'], 'INSERT_ONLY');
        await tryImportWithStrategy('objective_types', data.objective_types, ['code'], 'INSERT_ONLY');

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
