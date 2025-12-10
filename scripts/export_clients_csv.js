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

async function exportClients() {
    const client = await pool.connect();
    try {
        console.log("📊 Exporting Clients table...");

        // 1. Get all columns dynamically
        const res = await client.query("SELECT * FROM clients ORDER BY nom ASC");

        if (res.rows.length === 0) {
            console.log("⚠️ No clients found in database.");
            return;
        }

        const headers = Object.keys(res.rows[0]);
        const csvRows = [];

        // Add Header
        csvRows.push(headers.join(';')); // Using semi-colon for Excel compatibility in FR regions

        // Add Data
        res.rows.forEach(row => {
            const values = headers.map(header => {
                let val = row[header];
                if (val === null || val === undefined) return '';
                val = String(val).replace(/"/g, '""'); // Escape double quotes
                if (val.includes(';') || val.includes('\n') || val.includes('"')) {
                    return `"${val}"`;
                }
                return val;
            });
            csvRows.push(values.join(';'));
        });

        const outputPath = path.join(__dirname, '..', 'clients_export_verification.csv');
        fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf8');

        console.log(`✅ Export successful: ${outputPath}`);
        console.log(`   Count: ${res.rows.length} clients`);

    } catch (e) {
        console.error("❌ Export failed:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

exportClients();
