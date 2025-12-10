require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function exportAllTables() {
    const client = await pool.connect();
    try {
        console.log("📊 Starting Full Database Export to CSV...");

        const outputDir = path.join(__dirname, '..', 'exports_csv');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 1. Get List of Tables
        const resTables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        const tables = resTables.rows.map(r => r.table_name);
        console.log(`🔎 Found ${tables.length} tables to export: ${tables.join(', ')}`);

        for (const tableName of tables) {
            console.log(`   ⬇️ Exporting ${tableName}...`);
            const resData = await client.query(`SELECT * FROM "${tableName}"`);

            if (resData.rows.length === 0) {
                console.log(`      ⚠️ Empty table, creating empty file.`);
                // Still create file with headers if possible, or just empty
                // To get headers for empty table, we need to check columns. 
                // For now, let's just skip writing data but create file.
            }

            let csvContent = "";

            if (resData.rows.length > 0) {
                const headers = Object.keys(resData.rows[0]);
                csvContent += headers.join(';') + "\n"; // Header

                const rows = resData.rows.map(row => {
                    return headers.map(header => {
                        let val = row[header];
                        if (val === null || val === undefined) return '';
                        val = String(val).replace(/"/g, '""'); // Escape double quotes
                        // Check for chars requiring quotes (separator, newline)
                        if (val.includes(';') || val.includes('\n') || val.includes('\r')) {
                            return `"${val}"`;
                        }
                        return val;
                    }).join(';');
                });
                csvContent += rows.join('\n');
            } else {
                // Try to get headers even if empty
                const resCols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`, [tableName]);
                const headers = resCols.rows.map(r => r.column_name);
                csvContent += headers.join(';') + "\n";
            }

            const filePath = path.join(outputDir, `${tableName}.csv`);
            fs.writeFileSync(filePath, csvContent, 'utf8');
        }

        console.log(`✅ All tables exported to: ${outputDir}`);

    } catch (e) {
        console.error("❌ Export failed:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

exportAllTables();
