require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

const MISSION_PREVIEW = path.join(__dirname, '../backups/Migration/preview_missions_v2_with_bu.csv');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

function cleanName(name) {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Helper to extract DB name from "LINK: Name" or "NEW: Name"
function extractDbName(linkStr) {
    if (!linkStr) return null;
    if (linkStr.startsWith('LINK: ')) return linkStr.substring(6).trim();
    if (linkStr.startsWith('NEW: ')) return linkStr.substring(5).trim();
    return linkStr.trim(); // Fallback
}

async function migrateMissions() {
    console.log('🚀 Starting Mission Migration...');
    const client = await pool.connect();

    try {
        // 1. Load Lookups (Before Transaction)
        console.log('   Loading Reference Maps...');

        // Clients
        const clientRes = await client.query('SELECT id, name FROM companies');
        const clientMap = new Map();
        clientRes.rows.forEach(r => clientMap.set(cleanName(r.name), r.id));

        // Users
        const userRes = await client.query('SELECT id, nom, prenom, email FROM collaborateurs');
        const userMap = new Map();
        userRes.rows.forEach(r => {
            const n1 = cleanName(`${r.nom} ${r.prenom}`);
            const n2 = cleanName(`${r.prenom} ${r.nom}`);
            const em = cleanName(r.email);
            userMap.set(n1, r.id);
            userMap.set(n2, r.id);
            if (em) userMap.set(em, r.id);
        });

        // BUs
        const buRes = await client.query('SELECT id, nom FROM business_units');
        const buMap = new Map();
        buRes.rows.forEach(r => buMap.set(cleanName(r.nom), r.id));

        // Divisions
        const divRes = await client.query('SELECT id, nom FROM divisions');
        const divMap = new Map();
        divRes.rows.forEach(r => divMap.set(cleanName(r.nom), r.id));

        // Fiscal Year
        let finalFyId = null;
        try {
            const fyRes = await client.query('SELECT id FROM fiscal_years WHERE date_debut <= CURRENT_DATE AND date_fin >= CURRENT_DATE LIMIT 1');
            finalFyId = fyRes.rows.length ? fyRes.rows[0].id : null;
            if (!finalFyId) {
                const lastFy = await client.query('SELECT id FROM fiscal_years ORDER BY date_fin DESC LIMIT 1');
                finalFyId = lastFy.rows.length ? lastFy.rows[0].id : null;
            }
        } catch (e) { console.log('   ⚠️ FY Lookup failed'); }

        // Start Transaction
        await client.query('BEGIN');

        // 2. Process CSV
        const rows = [];
        if (fs.existsSync(MISSION_PREVIEW)) {
            await new Promise((resolve) => {
                fs.createReadStream(MISSION_PREVIEW)
                    .pipe(csv())
                    .on('data', r => rows.push(r))
                    .on('end', resolve);
            });
        }

        console.log(`   Processing ${rows.length} missions...`);
        let created = 0;
        let skipped = 0;

        for (const row of rows) {
            const title = row.MISSION_NAME;
            const clientName = row.CLIENT;
            const mappedBu = row['Mapped BU'];
            const mappedDiv = row['Mapped Division'];

            // Resolve Links
            const mgrName = extractDbName(row['Link: Manager']);
            const assocName = extractDbName(row['Link: Associé']);
            const inchName = extractDbName(row['Link: Incharge']);

            const clientId = clientMap.get(cleanName(clientName));

            if (!clientId || !title) {
                skipped++;
                continue;
            }

            // Check using 'nom' (instead of titre)
            // Use ILIKE for title to avoid case dupes
            const check = await client.query('SELECT id FROM missions WHERE nom ILIKE $1 AND client_id = $2', [title, clientId]);
            if (check.rows.length > 0) {
                skipped++;
                continue;
            }

            // Resolve IDs
            const buId = mappedBu ? buMap.get(cleanName(mappedBu)) : null;
            const divId = mappedDiv ? divMap.get(cleanName(mappedDiv)) : null;

            const mgrId = mgrName ? userMap.get(cleanName(mgrName)) : null;
            const assocId = assocName ? userMap.get(cleanName(assocName)) : null;
            const inchId = inchName ? userMap.get(cleanName(inchName)) : null;

            // Use 'nom' column
            const query = `
                INSERT INTO missions (
                    nom, description, client_id, statut,
                    date_debut, date_fin, 
                    business_unit_id, division_id, 
                    collaborateur_id, manager_id, associe_id, 
                    created_by, fiscal_year_id,
                    created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4,
                    CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year',
                    $5, $6,
                    $7, $8, $9,
                    $10, $11,
                    NOW(), NOW()
                )
             `;

            await client.query(query, [
                title, 'Imported from Legacy System', clientId, 'EN_COURS',
                buId, divId,
                inchId, mgrId, assocId,
                mgrId || inchId,
                finalFyId
            ]);
            created++;
        }

        await client.query('COMMIT');
        console.log(`✅ Mission Migration Complete: ${created} Created, ${skipped} Skipped.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Mission Migration Failed:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateMissions();
