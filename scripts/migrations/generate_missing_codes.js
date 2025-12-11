require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function generateCodes() {
    console.log('🔢 Generating Missing Mission Codes...');
    const client = await pool.connect();

    try {
        // 1. Find max sequence number across all codes
        const maxSeqRes = await client.query(`
            SELECT MAX(CAST(SUBSTRING(code FROM '[0-9]+$') AS INTEGER)) as max_seq
            FROM missions
            WHERE code IS NOT NULL AND code != 'N/A' AND code ~ '[0-9]+$'
        `);
        let nextSeq = (maxSeqRes.rows[0].max_seq || 0) + 1;
        console.log(`Starting sequence: ${nextSeq}`);

        // 2. Get BU prefix mapping
        const buRes = await client.query('SELECT id, code FROM business_units');
        const buMap = {};
        buRes.rows.forEach(b => {
            // Map BU code like "EB-TAX&LAW" -> "TAX", "EB-DOUANE" -> "DOU", "EXFIN EOLIS" -> "EXF"
            let prefix = 'EB';
            if (b.code) {
                if (b.code.includes('TAX')) prefix = 'TAX';
                else if (b.code.includes('DOUANE') || b.code.includes('DOU')) prefix = 'DOU';
                else if (b.code.includes('EXFIN') || b.code.includes('EOLIS')) prefix = 'EXF';
                else if (b.code.includes('RH')) prefix = 'RH';
                else if (b.code.includes('AUDIT')) prefix = 'AUD';
                else prefix = b.code.substring(0, 3).toUpperCase();
            }
            buMap[b.id] = prefix;
        });

        // 3. Get missions with missing codes
        const missionsRes = await client.query(`
            SELECT m.id, m.nom, m.business_unit_id, bu.code as bu_code
            FROM missions m
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            WHERE m.code IS NULL OR m.code = 'N/A' OR m.code = ''
        `);

        console.log(`Found ${missionsRes.rows.length} missions without valid codes.`);

        for (const m of missionsRes.rows) {
            // Determine prefix based on BU
            let prefix = 'EB';
            if (m.bu_code) {
                if (m.bu_code.includes('TAX')) prefix = 'TAX';
                else if (m.bu_code.includes('DOUANE')) prefix = 'DOU';
                else if (m.bu_code.includes('EXFIN') || m.bu_code.includes('EOLIS')) prefix = 'EXF';
                else if (m.bu_code.includes('RH')) prefix = 'RH';
                else if (m.bu_code.includes('AUDIT')) prefix = 'AUD';
                else prefix = 'EB';
            }

            // Generate code: PREFIX-YY-SEQ
            const year = '25'; // 2025
            const code = `${prefix}-${year}-${nextSeq}`;

            await client.query('UPDATE missions SET code = $1 WHERE id = $2', [code, m.id]);
            console.log(`✅ ${code}: ${m.nom.substring(0, 50)}...`);
            nextSeq++;
        }

        console.log(`\n✅ Generated ${missionsRes.rows.length} mission codes.`);

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

generateCodes();
