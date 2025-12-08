require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

// Input Files
const CLIENTS_CSV = path.join(__dirname, '../backups/Migration/EbVision - Liste des clients.csv');
const MISSIONS_CSV = path.join(__dirname, '../backups/Migration/EbVision - Mes missions.csv');
const TIMESHEETS_CSV = path.join(__dirname, '../backups/Migration/ebvision_times_entries.csv'); // Creating the Ultimate Source of Truth
const BU_MAPPING_CSV = path.join(__dirname, '../backups/Migration/match_BU_DIV.csv');

// Output Directory
const OUTPUT_DIR = path.join(__dirname, 'migration_data');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

// DB Connection for Lookups
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Helper: Read CSV with configurable separator
function readCSV(filePath, separator = ',') {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv({ separator: separator }))
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
}

// Helper: Normalize String
const normalize = (str) => str ? str.trim().toLowerCase() : '';

// Helper: Generate Code [BU]-25-[SEQ]
function generateMissionCode(buName, index) {
    let acro = "MIS";
    if (buName) {
        if (buName.includes("Générale")) acro = "DG";
        else if (buName.includes("Audit")) acro = "AUD";
        else if (buName.includes("Consulting")) acro = "CST";
        else if (buName.includes("Juridique") || buName.includes("Legal")) acro = "JUR";
        else if (buName.includes("Fiscal") || buName.includes("Tax")) acro = "FIS";
        else if (buName.includes("Douane")) acro = "DOU";
        else if (buName.includes("RH") || buName.includes("Paie")) acro = "RH";
        else acro = buName.substring(0, 3).toUpperCase();
    }
    const seq = String(index + 1).padStart(3, '0');
    return `${acro}-25-${seq}`;
}

async function build() {
    const client = await pool.connect();
    try {
        console.log("🚀 Starting JSON Generation...");

        // 0. Get Fiscal Year ID for FY25 and Users
        const fyRes = await client.query("SELECT id FROM fiscal_years WHERE libelle LIKE '%2025%' LIMIT 1");
        let fy25Id = fyRes.rows[0]?.id;
        if (!fy25Id) {
            const fyAll = await client.query("SELECT id FROM fiscal_years LIMIT 1");
            fy25Id = fyAll.rows[0]?.id;
            console.log("⚠️ FY25 not found, using fallback FY ID:", fy25Id);
        }

        const usersRes = await client.query("SELECT id, nom, prenom, email FROM collaborateurs");
        const users = usersRes.rows;

        // 1. Clients
        console.log("   Building 01_clients.json...");
        const clientsRaw = await readCSV(CLIENTS_CSV, ',');
        const clientMap = new Map();
        const clientSigleMap = new Map(); // Sigle -> Full Name

        clientsRaw.forEach(c => {
            const name = c.Nom || c.Client || c.nom;
            if (name && !clientMap.has(normalize(name))) {
                const normName = normalize(name);
                const sigle = c.Sigle || c.sigle || null;
                clientMap.set(normName, {
                    nom: name.trim(),
                    sigle: sigle,
                    secteur_activite: c.Secteur || c.SECTOR || "Autre",
                    pays: c.Pays || c.COUNTRY || "Cameroun"
                });

                if (sigle) {
                    clientSigleMap.set(normalize(sigle), normName);
                }
            }
        });
        const clientsJson = Array.from(clientMap.values());

        // 2. Mission Types
        console.log("   Building 02_mission_types.json...");
        const missionTypesJson = [
            { libelle: "PREVIOUS ENGAGEMENT", description: "Missions migrées", actif: true }
        ];

        // 3. Internal Activities (Initial List)
        console.log("   Building 03_internal_activities.json...");
        const internalActivitiesJson = [
            { libelle: "Bureau", description: "Travail au bureau", code: "BUR", actif: true },
            { libelle: "Congés", description: "Congés payés", code: "CGE", actif: true },
            { libelle: "Maladie", description: "Congé maladie", code: "MAL", actif: true },
            { libelle: "Formation", description: "Formation interne", code: "FOR", actif: true }
        ];

        // 4. Missions & Tasks
        console.log("   Building 04_missions.json & 05_tasks.json...");

        const mappingRaw = await readCSV(BU_MAPPING_CSV, ';');
        const buMapping = new Map();
        mappingRaw.forEach(r => {
            const oldBu = r['BU OLD'];
            if (oldBu) {
                buMapping.set(normalize(oldBu), {
                    buNew: r['BU NEW'] || "Direction Générale",
                    divNew: r['Division NEW'] || null
                });
            }
        });

        const missionsRaw = await readCSV(MISSIONS_CSV, ';');
        const missionsJson = [];
        const tasksJson = [];
        const missionCodeMap = new Map();
        const clientMissionMap = new Map();

        let seq = 0;
        missionsRaw.forEach(m => {
            const nom = m['Nom'] || m['Nom mission'] || m.Mission || m.nom;
            if (!nom) return;

            const rawBu = m['B.U'] || m['BU'] || "Direction Générale";
            const mapped = buMapping.get(normalize(rawBu)) || { buNew: "Direction Générale", divNew: null };

            const buName = mapped.buNew;
            const divName = mapped.divNew;

            const code = generateMissionCode(buName, seq++);

            const missionObj = {
                code: code,
                nom: nom,
                client_nom: m['Client'] || m.CLIENT || "Client Inconnu",
                bu_nom: buName,
                division_nom: divName,
                responsable_nom: m['Incharge'] || m.INCHARGE || m.responsable,
                manager_nom: m['Manager'] || m.MANAGER || m.manager,
                associe_nom: m['Associé'] || m.ASSOCIE || m.associe,
                type: "PREVIOUS ENGAGEMENT",
                date_debut: "2025-01-01",
                date_fin: "2025-12-31",
                statut: "EN_COURS",
                fiscal_year_id: fy25Id,
                conditions_paiement: JSON.stringify({ honoraires: 100, frais: 0, conditions: "Forfait unique" }),
                description: `Mission migrée (FY25) - ${nom}`
            };

            missionsJson.push(missionObj);

            const normClient = normalize(missionObj.client_nom);
            const key = `${normClient}|${normalize(nom)}`;
            missionCodeMap.set(key, code);

            if (!clientMissionMap.has(normClient)) {
                clientMissionMap.set(normClient, []);
            }
            clientMissionMap.get(normClient).push(code);

            tasksJson.push({
                mission_code: code,
                libelle: "Mission_Task",
                description: "Tâche par défaut",
                statut: "PLANIFIEE"
            });
        });

        // 5. Timesheets
        console.log("   Building 06_timesheets.json...");
        const tsRaw = await readCSV(TIMESHEETS_CSV, ';');

        const userEmailMap = new Map();
        users.forEach(u => {
            const fullname = normalize(`${u.nom} ${u.prenom}`);
            const reverse = normalize(`${u.prenom} ${u.nom}`);
            userEmailMap.set(fullname, u.email);
            userEmailMap.set(reverse, u.email);
            if (u.nom) userEmailMap.set(normalize(u.nom), u.email);
        });

        const internalMap = {
            "fériés": "FER", "feries": "FER", "congés": "CGE", "conges": "CGE",
            "formation": "FOR", "maladie": "MAL", "autres temps disponibles": "AUT",
            "rédaction de propositions": "PROP", "redaction de propositions": "PROP",
            "administratif": "ADM", "bureau": "BUR"
        };
        const internalCodes = new Set(internalActivitiesJson.map(a => a.code));

        const sheets = {};

        const getMonday = (d) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(date.setDate(diff)).toISOString().split('T')[0];
        };

        let skippedUser = 0;
        let skippedMission = 0;
        let fallbackMatches = 0;
        const allUsedMissionCodes = new Set();

        const reportData = { success: [], skipped: [] };

        for (const row of tsRaw) {
            const emailRaw = row.email || row.Email;
            if (!emailRaw) continue;

            const validEmail = emailRaw.toLowerCase().trim();
            const dbRefEmail = Array.from(userEmailMap.values()).find(e => e === validEmail);
            if (!dbRefEmail) {
                skippedUser++;
                continue;
            }

            const monthStr = row['Mois '] || row['Mois'] || row.Mois;
            let year, month;
            if (monthStr && monthStr.includes('/')) {
                const parts = monthStr.split('/');
                if (parts.length === 3) {
                    year = parts[2];
                    month = parts[1];
                }
            }
            if (!year || !month) continue;

            const typeHeure = (row['Type heure'] || '').toLowerCase();
            const activityField = row['Activité'] || row.Activite || '';
            const isChargeable = typeHeure.includes('chargeable') && !typeHeure.includes('non');

            let detectedMissionCode = null;
            let detectedTaskCode = null;
            let isInternal = false;
            let finalInternalCode = null;

            if (isChargeable) {
                const parts = activityField.split(' - ');
                let clientName = (parts.length >= 3) ? parts[0].trim() : "";
                let activityName = (parts.length >= 3) ? parts.slice(2).join(' - ').trim() : activityField;

                const normClient = normalize(clientName);
                const normActivity = normalize(activityName);
                let mCode = null;
                let resolvedClientNorm = normClient;

                // --- Manual Overrides for Known Anomalies ---
                if (normClient === 'access') resolvedClientNorm = normalize("ACCESS BANK PLC");
                else if (normClient === 'miod') resolvedClientNorm = normalize("Mutuelles des inspecteur et officiers des Douanes du Cameroun");
                else if (normClient === 'longstar') resolvedClientNorm = normalize("LONGSTAR EQUIPMENT CAMEROUN");
                else if (normClient === 'gcsa') resolvedClientNorm = normalize("GUINNESS CAMEROUN S.A");
                else if (normClient === 'total') resolvedClientNorm = normalize("TOTALENERGIES MARKETING CAMEROUN S.A");

                // --- Fallback Strategies ---
                if (clientSigleMap.has(resolvedClientNorm)) {
                    resolvedClientNorm = clientSigleMap.get(resolvedClientNorm);
                } else if (resolvedClientNorm.endsWith(" sa") || resolvedClientNorm.endsWith(" s.a")) {
                    const short = resolvedClientNorm.replace(/ s\.?a\.?$/, "").trim();
                    if (clientSigleMap.has(short)) resolvedClientNorm = clientSigleMap.get(short);
                }

                if (resolvedClientNorm && normActivity) {
                    mCode = missionCodeMap.get(`${resolvedClientNorm}|${normActivity}`);
                }

                if (!mCode && resolvedClientNorm) {
                    const codes = clientMissionMap.get(resolvedClientNorm);
                    if (codes && codes.length > 0) mCode = codes[0];
                }

                if (mCode) {
                    detectedMissionCode = mCode;
                    detectedTaskCode = "Mission_Task";
                    allUsedMissionCodes.add(mCode);
                } else {
                    skippedMission++;
                    reportData.skipped.push({
                        client_raw: clientName,
                        activity_raw: activityName,
                        resolved_client: resolvedClientNorm,
                        reason: "Mission Match Failed"
                    });
                    continue;
                }

            } else {
                isInternal = true;
                const actName = activityField.trim();
                if (!actName) continue;

                let code = internalMap[normalize(actName)];
                if (!code) {
                    code = normalize(actName).substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '_');
                    if (!code || code === '_') code = "AUT_DYN";
                }
                finalInternalCode = code;

                if (!internalCodes.has(code)) {
                    internalActivitiesJson.push({ libelle: actName, description: actName, code: code, actif: true });
                    internalCodes.add(code);
                }
            }

            for (let day = 1; day <= 31; day++) {
                const hoursVal = row[String(day)];
                if (!hoursVal) continue;
                const hours = parseFloat(hoursVal.replace(',', '.'));
                if (!hours || hours === 0) continue;

                const dayPadded = String(day).padStart(2, '0');
                const date = `${year}-${month}-${dayPadded}`;

                // Skip invalid dates
                if (date.includes('02-30') || date.includes('02-31') || date.includes('04-31') ||
                    date.includes('06-31') || date.includes('09-31') || date.includes('11-31')) continue;
                // Note: 2025 is not leap year so 02-29 is also invalid
                if (date.endsWith('02-29') && year === '2025') continue;

                const startDate = getMonday(date);
                const sheetKey = `${validEmail}|${startDate}`;

                if (!sheets[sheetKey]) {
                    sheets[sheetKey] = {
                        user_email: validEmail,
                        date_debut: startDate,
                        date_fin: new Date(new Date(startDate).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        statut: "sauvegardé",
                        entries: []
                    };
                }

                const entry = { date: date, heures: hours, statut: "sauvegardé" };
                if (isInternal) {
                    entry.internal_code = finalInternalCode;
                    entry.is_mission = false;
                } else {
                    entry.mission_code = detectedMissionCode;
                    entry.task_code = detectedTaskCode;
                    entry.is_mission = true;
                }
                sheets[sheetKey].entries.push(entry);
            }
        }

        const sheetsJson = Object.values(sheets);

        console.log("   Filtering Unused Data...");

        const uniqueSkipped = new Map();
        reportData.skipped.forEach(s => {
            const key = `${s.client_raw}|${s.activity_raw}`;
            if (!uniqueSkipped.has(key)) uniqueSkipped.set(key, s);
        });

        const filteredMissions = missionsJson.filter(m => allUsedMissionCodes.has(m.code));
        const filteredTasks = tasksJson.filter(t => allUsedMissionCodes.has(t.mission_code));
        const usedClientNames = new Set(filteredMissions.map(m => normalize(m.client_nom)));
        const filteredClients = clientsJson.filter(c => usedClientNames.has(normalize(c.nom)));

        const successList = filteredMissions.map(m => ({
            client: m.client_nom,
            mission: m.nom,
            code: m.code
        }));

        console.log(`      Missions: ${missionsJson.length} -> ${filteredMissions.length}`);
        console.log(`      Tasks: ${tasksJson.length} -> ${filteredTasks.length}`);
        console.log(`      Clients: ${clientsJson.length} -> ${filteredClients.length}`);

        // WRITE FILES
        fs.writeFileSync(path.join(OUTPUT_DIR, '01_clients.json'), JSON.stringify(filteredClients, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, '02_mission_types.json'), JSON.stringify(missionTypesJson, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, '03_internal_activities.json'), JSON.stringify(internalActivitiesJson, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, '04_missions.json'), JSON.stringify(filteredMissions, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, '05_tasks.json'), JSON.stringify(filteredTasks, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, '06_timesheets.json'), JSON.stringify(sheetsJson, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, 'migration_report.json'), JSON.stringify({
            success: successList,
            skipped: Array.from(uniqueSkipped.values())
        }, null, 2));

        console.log(`      Generated ${sheetsJson.length} timesheets.`);
        console.log(`      Generated Migration Report (Skipped Unique: ${uniqueSkipped.size})`);

    } catch (e) {
        console.error("❌ Generation Failed:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

build();
