const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

// Configuration
const EXPORT_DIR = path.join(__dirname, '../database/dumps');

// Helper to find a suitable sort column
function getSortColumn(columns, preferred) {
    if (columns.includes(preferred)) return preferred;
    const candidates = ['name', 'nom', 'code', 'title', 'titre', 'email', 'username', 'label', 'libelle', 'created_at', 'id'];
    return candidates.find(c => columns.includes(c)) || columns[0];
}

async function fetchTableData(tableName, preferredSort = 'created_at') {
    console.log(`Fetching table: ${tableName}...`);
    try {
        // Check table exists
        const checkTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            );
        `, [tableName]);

        if (!checkTable.rows[0].exists) {
            console.log(`⚠️ Table ${tableName} does not exist, skipping.`);
            return null;
        }

        // Get columns to find sort column
        const colsResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1
        `, [tableName]);

        const dbColumns = colsResult.rows.map(r => r.column_name);
        const sortCol = getSortColumn(dbColumns, preferredSort);

        const result = await pool.query(`SELECT * FROM "${tableName}" ORDER BY "${sortCol}"`);
        return result.rows;

    } catch (error) {
        console.warn(`Error fetching ${tableName}:`, error.message);
        throw error;
    }
}

async function generateExport() {
    try {
        // Ensure dump dir exists
        if (!fs.existsSync(EXPORT_DIR)) {
            fs.mkdirSync(EXPORT_DIR, { recursive: true });
        }

        const exportData = {};

        // 1. Roles & Permissions (Foundation)
        exportData.permissions = await fetchTableData('permissions', 'name');
        exportData.roles = await fetchTableData('roles', 'name');

        // Join tables often don't have 'id', but here we just dump rows
        exportData.role_permissions = await fetchTableData('role_permissions', 'role_id');

        // 2. Users foundation
        exportData.users = await fetchTableData('users', 'email');
        exportData.user_roles = await fetchTableData('user_roles', 'user_id');


        // 3. Organization Structure
        exportData.business_units = await fetchTableData('business_units', 'name');
        exportData.divisions = await fetchTableData('divisions', 'nom_division');
        // Services table does not exist in current schema (verified via grep)
        // exportData.services = await fetchTableData('services', 'nom_service');

        // 4. RH Reference Data
        exportData.grades = await fetchTableData('grades', 'code');
        exportData.postes = await fetchTableData('postes', 'titre');

        // Correct name is plural: types_collaborateurs
        exportData.types_collaborateurs = await fetchTableData('types_collaborateurs', 'nom_type');

        // 5. Collaborateurs
        // Determine table name (collaborateurs vs collaborators)
        let collabTable = 'collaborateurs';
        const checkCollabs = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collaborateurs')`);
        if (!checkCollabs.rows[0].exists) {
            const checkCollabsEn = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collaborators')`);
            if (checkCollabsEn.rows[0].exists) collabTable = 'collaborators';
            else collabTable = null;
        }

        if (collabTable) {
            // We just dump raw data, the importer will handle self-ref complexity
            exportData.collaborators = await fetchTableData(collabTable, 'created_at');
            exportData._meta = { collaborators_table_name: collabTable }; // Hint for importer
        }

        // 6. Settings
        exportData.financial_settings = await fetchTableData('financial_settings', 'created_at');
        exportData.notification_settings = await fetchTableData('notification_settings', 'created_at');
        exportData.objective_types = await fetchTableData('objective_types', 'code');

        // Filter out nulls (tables that didn't exist)
        Object.keys(exportData).forEach(key => {
            if (exportData[key] === null) delete exportData[key];
        });

        const filename = `config_export_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${Date.now()}.json`;
        const filePath = path.join(EXPORT_DIR, filename);

        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        console.log(`✅ Export completed successfully!`);
        console.log(`📁 JSON saved to: ${filePath}`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Export failed:', error);
        process.exit(1);
    }
}

generateExport();
