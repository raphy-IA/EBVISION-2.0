require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');

// Input Files
const CLIENTS_CSV = path.join(__dirname, '../backups/Migration/EbVision - Liste des clients.csv');
const MISSIONS_CSV = path.join(__dirname, '../backups/Migration/preview_missions_v2_with_bu.csv');
const TIMESHEETS_CSV = path.join(__dirname, '../backups/Migration/preview_timesheets_v3.csv');

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

// Helper: Read CSV
function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv({ separator: ',' }))
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
        else if (buName.includes("Juridique")) acro = "JUR";
        else if (buName.includes("Fiscal")) acro = "FIS";
        else acro = buName.substring(0, 3).toUpperCase();
    }
    const seq = String(index + 1).padStart(3, '0');
    return `${acro}-25-${seq}`;
}

async function build() {
    const client = await pool.connect();
    try {
        console.log("🚀 Starting JSON Generation...");


        // 1. Clients
        console.log("   Building 01_clients.json...");
        const clientsRaw = await readCSV(CLIENTS_CSV);
        const clientMap = new Map();
        clientsRaw.forEach(c => {
            const name = c.Nom || c.Client || c.nom;
            if (name && !clientMap.has(normalize(name))) {
                clientMap.set(normalize(name), {
                    nom: name.trim(),
                    sigle: c.Sigle || c.sigle || null,
                    secteur_activite: c.Secteur || c.SECTOR || "Autre",
                    pays: c.Pays || c.COUNTRY || "Cameroun"
                });
            }
        });
        const clientsJson = Array.from(clientMap.values());
        fs.writeFileSync(path.join(OUTPUT_DIR, '01_clients.json'), JSON.stringify(clientsJson, null, 2));

        // 2. Mission Types
        console.log("   Building 02_mission_types.json...");
        const missionTypesJson = [
            { libelle: "PREVIOUS ENGAGEMENT", description: "Missions migrées", actif: true }
        ];
        fs.writeFileSync(path.join(OUTPUT_DIR, '02_mission_types.json'), JSON.stringify(missionTypesJson, null, 2));

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
        const missionsRaw = await readCSV(MISSIONS_CSV);
        const missionsJson = [];
        const tasksJson = [];
        const missionCodeMap = new Map(); // Name -> Code
        const clientMissionMap = new Map(); // Client Name -> [Codes]

        let seq = 0;
        missionsRaw.forEach(m => {
            const nom = m.MISSION_NAME || m['Nom mission'] || m.Mission || m.nom;
            if (!nom) return;

            const buName = m['Mappage BU'] || m.SOURCE_BU || "Direction Générale";
            const code = generateMissionCode(buName, seq++);

            const dateDebut = "2025-01-01";
            const dateFin = "2025-12-31";
            const payment = { honoraires: 100, frais: 0, conditions: "Forfait unique" };
            const clientName = m.CLIENT || m.Client || m.client || "Client Inconnu";

            const missionObj = {
                code: code,
                nom: nom,
                client_nom: clientName,
                bu_nom: buName,
                responsable_nom: m.INCHARGE || m.responsable,
                manager_nom: m.MANAGER || m.manager,
                associe_nom: m.ASSOCIE || m.associe,
                type: "PREVIOUS ENGAGEMENT",
                date_debut: dateDebut,
                date_fin: dateFin,
                statut: "EN_COURS",
                fiscal_year_id: fy25Id,
                conditions_paiement: JSON.stringify(payment),
                description: `Mission migrée (FY25) - ${nom}`
            };

            missionsJson.push(missionObj);

            const normNom = normalize(nom);
            missionCodeMap.set(normNom, code);

            const normClient = normalize(clientName);
            if (!clientMissionMap.has(normClient)) {
                clientMissionMap.set(normClient, []);
            }
            clientMissionMap.get(normClient).push(code);

            tasksJson.push({
                mission_code: code,
                libelle: "Mission_Task",
                description: "Tâche par défaut pour saisie des heures",
                statut: "PLANIFIEE"
            });
        });

        fs.writeFileSync(path.join(OUTPUT_DIR, '04_missions.json'), JSON.stringify(missionsJson, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, '05_tasks.json'), JSON.stringify(tasksJson, null, 2));

        // 5. Timesheets
        console.log("   Building 06_timesheets.json...");
        const tsRaw = await readCSV(TIMESHEETS_CSV);

        const userEmailMap = new Map();
        users.forEach(u => {
            const fullname = normalize(`${u.nom} ${u.prenom}`);
            const reverse = normalize(`${u.prenom} ${u.nom}`);
            userEmailMap.set(fullname, u.email);
            userEmailMap.set(reverse, u.email);
            if (u.nom) userEmailMap.set(normalize(u.nom), u.email);
        });

        const internalMap = {
            "fériés": "FER", "feries": "FER",
            "congés": "CGE", "conges": "CGE",
            "formation": "FOR",
            "maladie": "MAL",
            "autres temps disponibles": "AUT",
            "rédaction de propositions": "PROP", "redaction de propositions": "PROP",
            "administratif": "ADM",
            "bureau": "BUR"
        };
        const internalCodes = new Set(internalActivitiesJson.map(a => a.code));

        const sheets = {}; // Key: email|date

        const getMonday = (d) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(date.setDate(diff)).toISOString().split('T')[0];
        };

        let skippedUser = 0;
        let skippedMission = 0;
        let fallbackMatches = 0;

        for (const row of tsRaw) {
            let userName = row.USER || row.Consultant;
            if (userName && userName.startsWith('LINK: ')) userName = userName.replace('LINK: ', '');

            const email = userEmailMap.get(normalize(userName));
            if (!email) {
                skippedUser++;
                continue;
            }

            const date = row.DATE || row.Date;
            if (!date || date.includes('2025-02-29') || date.includes('2025-04-31')) continue;

            const startDate = getMonday(date);
            const sheetKey = `${email}|${startDate}`;

            if (!sheets[sheetKey]) {
                sheets[sheetKey] = {
                    user_email: email,
                    date_debut: startDate,
                    date_fin: new Date(new Date(startDate).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    statut: "sauvegardé",
                    entries: []
                };
            }

            const hours = parseFloat(row.HOURS || row.Heures) || 0;
            if (hours === 0) continue;

            const type = (row.TYPE || '').toUpperCase();
            const activityOrClient = row.ACTIVITY || row.CLIENT || row.Client;

            const entry = {
                date: date,
                heures: hours,
                statut: "sauvegardé"
            };

            if (type.includes('INTERNAL') || (!type && internalMap[normalize(activityOrClient)])) {
                const actName = (row.ACTIVITY || 'Autre').trim();
                let code = internalMap[normalize(actName)] || "AUT";

                if (!internalCodes.has(code)) {
                    internalActivitiesJson.push({
                        libelle: actName,
                        description: actName,
                        code: code,
                        actif: true
                    });
                    internalCodes.add(code);
                    internalMap[normalize(actName)] = code;
                }
                entry.internal_code = code;
                entry.is_mission = false;
            } else {
                const missionName = row.CLIENT || row.Client;
                const normName = normalize(missionName);
                let mCode = missionCodeMap.get(normName);

                if (!mCode) {
                    const codes = clientMissionMap.get(normName);
                    if (codes && codes.length > 0) {
                        mCode = codes[0];
                        fallbackMatches++;
                    }
                }

                if (mCode) {
                    entry.mission_code = mCode;
                    entry.task_code = "Mission_Task";
                    entry.is_mission = true;
                } else if (!entry.internal_code) {
                    skippedMission++;
                    continue;
                }
            }
            sheets[sheetKey].entries.push(entry);
        }

        const sheetsJson = Object.values(sheets);
        fs.writeFileSync(path.join(OUTPUT_DIR, '06_timesheets.json'), JSON.stringify(sheetsJson, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, '03_internal_activities.json'), JSON.stringify(internalActivitiesJson, null, 2));

        console.log(`      Generated ${sheetsJson.length} timesheets.`);
        console.log(`      Skipped ${skippedUser} entries (User not found).`);
        console.log(`      Skipped ${skippedMission} entries (Mission not found).`);
        console.log(`      Fallback Matches: ${fallbackMatches} (Mapped via Client Name).`);

    } catch (e) {
        console.error("❌ Generation Failed:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

build();
