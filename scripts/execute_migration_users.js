require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

const USER_PREVIEW = path.join(__dirname, '../backups/Migration/preview_user_mapping_v7.csv');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

function normalizeName(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return { nom: parts[0], prenom: '', initiales: parts[0].substring(0, 2).toUpperCase() };

    const prenom = parts[0];
    const nom = parts.slice(1).join(' ');

    const i1 = prenom.charAt(0);
    const i2 = nom.charAt(0);
    const initiales = (i1 + i2).toUpperCase();

    return { prenom, nom, initiales };
}

async function migrateUsers() {
    console.log('🚀 Starting User Creation (Stubs with Default FKs)...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Fetch Defaults (Order by NOM to match schema)
        const buRes = await client.query('SELECT id FROM business_units LIMIT 1');
        const divRes = await client.query('SELECT id FROM divisions LIMIT 1');
        const gradeRes = await client.query('SELECT id FROM grades ORDER BY nom LIMIT 1');
        const typeRes = await client.query('SELECT id FROM types_collaborateurs ORDER BY nom LIMIT 1');
        const posteRes = await client.query('SELECT id FROM postes ORDER BY nom LIMIT 1');

        if (!buRes.rows.length || !gradeRes.rows.length || !typeRes.rows.length || !posteRes.rows.length) {
            throw new Error('Missing required Reference Data (BU, Grade, Type, or Poste) to create users.');
        }

        const defaults = {
            bu: buRes.rows[0].id,
            div: divRes.rows.length ? divRes.rows[0].id : null,
            grade: gradeRes.rows[0].id,
            type: typeRes.rows[0].id,
            poste: posteRes.rows[0].id
        };

        const rows = [];
        if (fs.existsSync(USER_PREVIEW)) {
            await new Promise((resolve) => {
                fs.createReadStream(USER_PREVIEW)
                    .pipe(csv())
                    .on('data', r => rows.push(r))
                    .on('end', resolve);
            });
        }

        console.log(`   Processing ${rows.length} mappings...`);
        let created = 0;
        let skipped = 0;

        for (const row of rows) {
            if (row.ACTION === 'CREATE_NEW') {
                const fullName = row.SOURCE_NAME;

                let email = row.SOURCE_EMAIL;
                if (!email || email === '(None)' || email === '') {
                    const clean = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    email = `${clean}@migration.temp`;
                }

                // Check by email first
                const emailCheck = await client.query('SELECT id FROM collaborateurs WHERE email = $1', [email]);
                if (emailCheck.rows.length > 0) {
                    skipped++;
                    continue;
                }

                const { nom, prenom, initiales } = normalizeName(fullName);

                const query = `
                    INSERT INTO collaborateurs (
                        nom, prenom, initiales, email, telephone, 
                        business_unit_id, division_id, 
                        type_collaborateur_id, poste_actuel_id, grade_actuel_id, 
                        date_embauche, statut, notes,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
                    RETURNING id
                `;

                await client.query(query, [
                    nom, prenom, initiales, email, '000000000',
                    defaults.bu, defaults.div,
                    defaults.type, defaults.poste, defaults.grade,
                    new Date(), 'ACTIF', 'Created by Migration',
                ]);
                created++;
            } else {
                skipped++;
            }
        }

        await client.query('COMMIT');
        console.log(`✅ User Migration Complete: ${created} Created, ${skipped} Skipped.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ User Migration Failed:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrateUsers();
