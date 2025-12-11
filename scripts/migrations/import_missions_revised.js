require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const Mission = require('../../src/models/Mission');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.resolve(__dirname, '../../backups/Migration/revue_Mission.csv');

// Utilitaires de normalisation
const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
};

const levenshtein = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

async function migrate() {
    console.log('🚀 Starting STRICT Mission Migration (Source of Truth = CSV)...');
    const client = await pool.connect();

    try {
        // 1. Charger les données de référence
        const clientsRes = await client.query('SELECT id, nom, sigle FROM clients');
        const clients = clientsRes.rows;

        const buRes = await client.query('SELECT id, nom, code FROM business_units');
        const bus = buRes.rows;

        const divRes = await client.query('SELECT id, nom, code, business_unit_id FROM divisions');
        const divs = divRes.rows;

        // Charger toutes les missions existantes
        // On charge tout pour éviter de créer des doublons si on relance le script plusieurs fois
        const missionsRes = await client.query('SELECT id, nom, client_id, business_unit_id, division_id FROM missions');
        let existingMissions = missionsRes.rows;

        // 2. Lire le CSV (UTF-8)
        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

        console.log(`📂 Processing ${lines.length - 1} entries...`);

        let stats = {
            processed: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: 0
        };

        // Récupérer une année fiscale par défaut (active)
        const fiscalYearRes = await client.query("SELECT id FROM fiscal_years WHERE statut = 'OUVERT' LIMIT 1");
        const fyId = fiscalYearRes.rows.length > 0 ? fiscalYearRes.rows[0].id : null;

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(';').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 2) continue;

            stats.processed++;
            const missionName = cols[0];
            const clientName = cols[1];
            const buName = cols[2];
            const divName = cols[3];

            // --- RESOLUTION DES ENTITÉS ---

            // 1. Client
            let dbClient = clients.find(c => normalize(c.nom) === normalize(clientName));
            if (!dbClient) dbClient = clients.find(c => normalize(c.sigle) === normalize(clientName));
            if (!dbClient) dbClient = clients.find(c => normalize(c.nom).includes(normalize(clientName)));

            if (!dbClient) {
                console.error(`❌ Line ${i + 1}: Client '${clientName}' not found. Skipping.`);
                stats.errors++;
                continue;
            }

            // 2. Business Unit
            let dbBu = null;
            if (buName) {
                dbBu = bus.find(b => normalize(b.nom) === normalize(buName) || normalize(b.code) === normalize(buName));
            }

            // 3. Division
            let dbDiv = null;
            if (divName) {
                dbDiv = divs.find(d => normalize(d.nom) === normalize(divName) || normalize(d.code) === normalize(divName));
            }

            // --- LOGIQUE DE STRICT MATCHING ---

            // Trouver les missions de ce client
            // On refait la query ou filter sur la liste mise à jour (si on vient de créer)
            // Pour simplifier, on regarde dans 'existingMissions' qui n'est pas mis à jour localement, 
            // MAIS si on a créé une mission à l'itération précédente pour le MEME client avec le MEME nom, on doit éviter de la recréer.
            // Donc on devrait vérifier si on l'a déjà traitée dans ce batch ?
            // Le CSV peut contenir des doublons ? On assume que le CSV est propre ou qu'on veut traiter chaque ligne.
            // S'il y a 2 lignes identiques dans le CSV, on aura 2 missions ? 
            // "Même si des missions ont le meme nom, elle n'auront pas le meme client ou la meme BU" -> OK.

            const clientMissions = existingMissions.filter(m => m.client_id === dbClient.id);

            let targetMission = null;

            // Recherche STRICTE ou très proche
            // On NE prend PAS "la seule mission du client" comme target par défaut.

            targetMission = clientMissions.find(m => normalize(m.nom) === normalize(missionName));

            if (!targetMission) {
                // Fuzzy match prudent (typos seulement)
                let bestDist = 999;
                let bestMatch = null;

                for (const m of clientMissions) {
                    const dist = levenshtein(normalize(m.nom), normalize(missionName));
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestMatch = m;
                    }
                }

                // Seuil STRICT: Max 3 caractères de différence ET moins de 20% de la longueur
                const len = normalize(missionName).length;
                if (bestMatch && bestDist <= 3 && (bestDist / len) < 0.2) {
                    targetMission = bestMatch;
                    // console.log(`ℹ️ Fuzzy matched: '${bestMatch.nom}' ~ '${missionName}'`);
                }
            }

            // --- ACTION ---

            if (targetMission) {
                // UPDATE
                let updates = {};
                let hasUpdates = false;

                if (missionName && targetMission.nom !== missionName) {
                    updates.nom = missionName;
                    hasUpdates = true;
                }
                if (dbBu && targetMission.business_unit_id !== dbBu.id) {
                    updates.business_unit_id = dbBu.id;
                    hasUpdates = true;
                }
                if (dbDiv && targetMission.division_id !== dbDiv.id) {
                    updates.division_id = dbDiv.id;
                    hasUpdates = true;
                }

                if (hasUpdates) {
                    await client.query(
                        'UPDATE missions SET nom = COALESCE($1, nom), business_unit_id = COALESCE($2, business_unit_id), division_id = COALESCE($3, division_id), updated_at = NOW() WHERE id = $4',
                        [updates.nom, updates.business_unit_id, updates.division_id, targetMission.id]
                    );
                    stats.updated++;
                } else {
                    stats.skipped++;
                }
            } else {
                // CREATE
                const query = `
                    INSERT INTO missions (
                        nom, description, client_id, statut, type_mission,
                        date_debut, date_fin, budget_estime, priorite,
                        division_id, business_unit_id, fiscal_year_id, notes, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    RETURNING id, nom, client_id, business_unit_id, division_id
                `;

                const values = [
                    missionName,
                    `Import CSV - ${missionName}`,
                    dbClient.id,
                    'EN_COURS',
                    'AUDIT',
                    null, null, 0, 'MOYENNE',
                    dbDiv ? dbDiv.id : null,
                    dbBu ? dbBu.id : null,
                    fyId,
                    'Importé via script de migration strict',
                    null
                ];

                const newRes = await client.query(query, values);
                const newMission = newRes.rows[0];

                // Ajouter à la liste locale pour éviter doublons dans la même exécution si le CSV a des doublons exacts
                existingMissions.push(newMission);

                stats.created++;
                // console.log(`✨ Created: "${missionName}" for ${dbClient.nom}`);
            }
        }

        console.log('\n--- STRICT MIGRATION RESULTS ---');
        console.log(`Processed: ${stats.processed}`);
        console.log(`Created: ${stats.created} (Should fill the gap to 106)`);
        console.log(`Updated: ${stats.updated}`);
        console.log(`Skipped: ${stats.skipped}`);
        console.log(`Errors: ${stats.errors}`);
        console.log('--------------------------------');

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
