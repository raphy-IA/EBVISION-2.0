require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');

async function fix() {
    console.log('Running Smart Fix for Encoded Characters...');
    const client = await pool.connect();

    try {
        // Fetch corrupted missions
        const res = await client.query(`SELECT id, nom FROM missions WHERE nom LIKE '%' OR nom LIKE '%?%'`);
        const missions = res.rows;

        console.log(`Found ${missions.length} potentially corrupted missions.`);

        const replacements = [
            { pattern: /s.minaire/gi, replace: 'séminaire' },
            { pattern: /contr.le/gi, replace: 'contrôle' },
            { pattern: /.valuation/gi, replace: 'évaluation' },
            { pattern: /soci.t./gi, replace: 'société' },
            { pattern: /soci.te/gi, replace: 'société' },
            { pattern: /post.riori/gi, replace: 'posteriori' },
            { pattern: /d.pense/gi, replace: 'dépense' },
            { pattern: /cr.ances/gi, replace: 'créances' },
            { pattern: /cl.ture/gi, replace: 'clôture' },
            { pattern: /r.gularisation/gi, replace: 'régularisation' },
            { pattern: /francaise/gi, replace: 'française' }, // Often without accent in legacy data
            { pattern: /d.claration/gi, replace: 'déclaration' },
            { pattern: /d.douanement/gi, replace: 'dédouanement' },
            { pattern: /facilit.s/gi, replace: 'facilités' },
            { pattern: /douani.res/gi, replace: 'douanières' },
            { pattern: /douani.re/gi, replace: 'douanière' },
            { pattern: /r.vision/gi, replace: 'révision' },
            { pattern: /proche.o/gi, replace: 'Prochéo' },
            { pattern: /imp.t/gi, replace: 'impôt' },
            { pattern: /b.timent/gi, replace: 'bâtiment' },
            { pattern: /.tat/gi, replace: 'état' },
            { pattern: /.tranger/gi, replace: 'étranger' },
            { pattern: /fran.ais/gi, replace: 'français' },
            // Generic fallbacks for common single chars if context matches
            { pattern: / d /gi, replace: ' à ' }, // "Assistance d la..." -> "Assistance à la" (common scanno)
            { pattern: /Assistance ./gi, replace: 'Assistance à' }
        ];

        let updatedCount = 0;

        for (const m of missions) {
            let newName = m.nom;

            // Apply specific replacements
            for (const r of replacements) {
                // If the pattern matches AND specifically hits the corrupted char place
                // Note: The regex '.' matches the  char
                if (newName.match(r.pattern)) {
                    newName = newName.replace(r.pattern, r.replace);
                }
            }

            // Generic  replacement if still present? 
            // Risky to guess blindly.

            if (newName !== m.nom) {
                console.log(`Fixing: "${m.nom}" -> "${newName}"`);
                await client.query('UPDATE missions SET nom = $1 WHERE id = $2', [newName, m.id]);
                updatedCount++;
            } else {
                console.log(`Could not auto-fix: "${m.nom}"`);
            }
        }

        console.log(`\nFixed ${updatedCount}/${missions.length} missions.`);

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit(0);
    }
}

fix();
