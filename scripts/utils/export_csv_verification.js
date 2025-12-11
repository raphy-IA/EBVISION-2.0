require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.resolve(__dirname, '../../exports_csv/verification_missions.csv');

async function exportCsv() {
    console.log('Exporting Mission Verification CSV...');
    const client = await pool.connect();

    try {
        const query = `
            SELECT 
                m.id,
                m.nom as "Mission",
                c.nom as "Client",
                bu.nom as "Business Unit",
                d.nom as "Division",
                m.description as "Description",
                m.type_mission as "Type Mission",
                CONCAT(collab_resp.prenom, ' ', collab_resp.nom) as "Responsable",
                CONCAT(collab_man.prenom, ' ', collab_man.nom) as "Manager",
                CONCAT(collab_ass.prenom, ' ', collab_ass.nom) as "Associé"
            FROM missions m
            LEFT JOIN clients c ON m.client_id = c.id
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            LEFT JOIN collaborateurs collab_resp ON m.collaborateur_id = collab_resp.id
            LEFT JOIN collaborateurs collab_man ON m.manager_id = collab_man.id
            LEFT JOIN collaborateurs collab_ass ON m.associe_id = collab_ass.id
            ORDER BY c.nom, m.nom
        `;

        const res = await client.query(query);
        const rows = res.rows;

        // Header
        const header = ["Mission", "Client", "Business Unit", "Division", "Description", "Type Mission", "Responsable", "Manager", "Associé"];

        let csvContent = header.join(';') + '\n';

        rows.forEach(r => {
            const line = [
                r['Mission'] || '',
                r['Client'] || '',
                r['Business Unit'] || '',
                r['Division'] || '',
                (r['Description'] || '').replace(/[\r\n]+/g, ' '), // Clean newlines
                r['Type Mission'] || '',
                r['Responsable'] || '',
                r['Manager'] || '',
                r['Associé'] || ''
            ].map(val => `"${val.toString().replace(/"/g, '""')}"`).join(';'); // Escape quotes
            csvContent += line + '\n';
        });

        // Ensure directory exists
        const dir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_PATH, csvContent, 'utf-8'); // Using UTF-8 as standard
        console.log(`✅ Exported ${rows.length} missions to: ${OUTPUT_PATH}`);

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

exportCsv();
