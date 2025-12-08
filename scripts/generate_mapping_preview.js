require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// Files
const MISSIONS_FILE = path.join(__dirname, '../backups/Migration/EbVision - Mes missions.csv');
const TIMESHEETS_FILE = path.join(__dirname, '../backups/Migration/ebvision_times_entries.csv');
const DB_EXPORT_FILE = path.join(__dirname, '../backups/Migration/db_collaborateurs_export.csv');

// Output Previews
const PREVIEW_USERS = path.join(__dirname, '../backups/Migration/preview_user_mapping_v7.csv');
const PREVIEW_INTERNAL = path.join(__dirname, '../backups/Migration/preview_internal_v7.csv');

// Helper: Levenshtein Distance
function levenshtein(a, b) {
    if (!a) return b ? b.length : 0;
    if (!b) return a ? a.length : 0;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// Helper: Normalize name (lowercase, no special chars, sort tokens)
function getSortedTokens(name) {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .sort()
        .join(' ');
}

async function generateMappingPreviews() {
    console.log('🔍 Generating Comprehensive Mapping Previews (V5 - Strict Email + File Based)...');

    // 1. Load DB Users from CSV Export
    console.log('📥 Loading DB Collaborateurs from CSV Export...');
    const dbUsers = [];
    if (fs.existsSync(DB_EXPORT_FILE)) {
        await new Promise((resolve, reject) => {
            fs.createReadStream(DB_EXPORT_FILE)
                .pipe(csv())
                .on('data', (row) => {
                    // Expecting header: id,nom,prenom,email (case insensitive from csv-parser if match)
                    // csv-parser by default uses header row
                    // Verify headers manually if needed? usually keys match header

                    // row might be { ID: '...', Nom: '...', Prenom: '...', Email: '...' } depending on export script
                    const id = row['ID'] || row['id'];
                    const nom = row['Nom'] || row['nom'];
                    const prenom = row['Prenom'] || row['prenom'];
                    const email = row['Email'] || row['email'];

                    const orig = `${nom} ${prenom}`;
                    dbUsers.push({
                        id: id,
                        email: email ? email.toLowerCase().trim() : '',
                        norm: `${nom} ${prenom}`.toLowerCase().replace(/[^a-z0-9]/g, ''),
                        orig: orig,
                        sortedTokens: getSortedTokens(orig)
                    });
                })
                .on('end', resolve)
                .on('error', reject);
        });
        console.log(`   Loaded ${dbUsers.length} users from File.`);
    } else {
        console.error('❌ DB Export file missing: ' + DB_EXPORT_FILE);
        return;
    }

    // 2. Scan Sources
    console.log('📂 Scanning Source Files...');
    const allEntries = []; // Stores { name, email, source }
    const internalActivities = new Set();

    // A. Missions (CSV)
    if (fs.existsSync(MISSIONS_FILE)) {
        console.log('📖 Reading Missions CSV...');
        await new Promise((resolve, reject) => {
            fs.createReadStream(MISSIONS_FILE)
                .pipe(csv({ separator: ';' }))
                .on('data', (row) => {
                    const incharge = row['Incharge'] || row['Responsable'];
                    const manager = row['Manager'];
                    const associe = row['Associé'];

                    if (incharge) allEntries.push({ name: incharge.trim(), email: '', source: 'Missions' });
                    if (manager) allEntries.push({ name: manager.trim(), email: '', source: 'Missions' });
                    if (associe) allEntries.push({ name: associe.trim(), email: '', source: 'Missions' });
                })
                .on('end', resolve)
                .on('error', reject);
        });
    }

    // B. Timesheets (CSV)
    if (fs.existsSync(TIMESHEETS_FILE)) {
        console.log('📖 Reading Timesheets CSV...');
        await new Promise((resolve, reject) => {
            fs.createReadStream(TIMESHEETS_FILE, { encoding: 'utf8' })
                .pipe(csv({ separator: ';' }))
                .on('data', (cols) => {
                    const nom = cols['Nom'];
                    const email = cols['email'] || cols['Email'];
                    const typeHeure = cols['Type heure'];
                    const activite = cols['Activité'] || cols['ActivitÃ©'] || cols['Activite'] || cols['Code ActvitÃ©'];

                    if (nom) allEntries.push({ name: nom.trim(), email: email ? email.trim().toLowerCase() : '', source: 'Timesheets' });

                    if (typeHeure && (typeHeure.toLowerCase().includes('non chargeable'))) {
                        if (activite) internalActivities.add(activite.trim());
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });
    }

    // 3. Strict Deduplication & Linking
    console.log(`🔄 Deduplicating ${allEntries.length} raw entries (Strict Email V5)...`);

    // Map of Unique Users
    const uniqueUsersMap = new Map();

    // 3.1 First Pass: Process entries WITH Email (Timesheets)
    allEntries.filter(e => e.email).forEach(u => {
        const key = u.email; // Strict Key
        if (!uniqueUsersMap.has(key)) {
            uniqueUsersMap.set(key, {
                email: u.email, // Known email
                aliases: new Set(),
                sources: new Set()
            });
        }
        uniqueUsersMap.get(key).aliases.add(u.name);
        uniqueUsersMap.get(key).sources.add(u.source);
    });

    // 3.2 Second Pass: Process entries WITHOUT Email (Missions)
    const orphans = [];

    allEntries.filter(e => !e.email).forEach(u => {
        const uTokens = getSortedTokens(u.name);
        if (!u.name || u.name.length < 2) return;

        let matchedKey = null;

        // Try to match Orphan Name -> Anchor Alias
        for (const [key, anchor] of uniqueUsersMap.entries()) {
            for (const alias of anchor.aliases) {
                const aliasTokens = getSortedTokens(alias);

                // Exact Token Sort
                if (uTokens === aliasTokens) {
                    matchedKey = key;
                    break;
                }

                // B. Levenshtein (Fuzzy) - Kept to link Missions to Timesheets
                if (u.name.length > 4) {
                    const dist = levenshtein(u.name.toLowerCase(), alias.toLowerCase());
                    if (dist <= 2) {
                        matchedKey = key;
                        break;
                    }
                }

                // C. Token Subset/Superset (New V7 Logic - Set Based)
                // Handles "Robert Songo" <-> "Robert Songo Songo"
                const t1 = new Set(uTokens.split(' '));
                const t2 = new Set(aliasTokens.split(' '));

                // Calculate intersection size
                let intersectSize = 0;
                for (const token of t1) {
                    if (t2.has(token)) intersectSize++;
                }

                // If the smaller set is fully contained in the larger set
                // And we have at least 2 common tokens
                const minSize = Math.min(t1.size, t2.size);

                if (intersectSize >= 2 && intersectSize === minSize) {
                    matchedKey = key;
                    break;
                }
            }
            if (matchedKey) break;
        }

        if (matchedKey) {
            uniqueUsersMap.get(matchedKey).sources.add(u.source);
            uniqueUsersMap.get(matchedKey).aliases.add(u.name);
        } else {
            orphans.push(u);
        }
    });

    // 3.3 Add Orphans to Map
    orphans.forEach(u => {
        const key = getSortedTokens(u.name);
        if (!uniqueUsersMap.has(key)) {
            uniqueUsersMap.set(key, {
                email: '',
                aliases: new Set([u.name]),
                sources: new Set()
            });
        }
        uniqueUsersMap.get(key).sources.add(u.source);
        uniqueUsersMap.get(key).aliases.add(u.name);
    });

    console.log(`   Found ${uniqueUsersMap.size} unique users after strict consolidation.`);

    // 4. Match against DB (Strict User Request Logic)
    const userMappingRows = [];

    for (const [key, user] of uniqueUsersMap) {
        let match = null;
        let method = 'NONE';

        // Pick longest alias for display
        const display_name = Array.from(user.aliases).sort((a, b) => b.length - a.length)[0];

        // Priority 1: Strict Email Match
        if (user.email) {
            match = dbUsers.find(u => u.email === user.email);
            if (match) method = 'EMAIL_STRICT';
        }

        // Priority 2: Name Match (Only if NO email existed for this user at all)
        // If user has email but it didn't match DB, we do NOT fallback to Name search 
        // (unless we assume email typo? User said 'match based on email', implying strictness).
        // However, I'll allow Name search ONLY if email was empty.

        if (!match && !user.email) {
            const cleanName = getSortedTokens(display_name);
            match = dbUsers.find(u => u.sortedTokens === cleanName);
            if (match) method = 'NAME_EXACT_ORPHAN';

            if (!match) {
                // Fuzzy DB
                dbUsers.forEach(dbu => {
                    if (levenshtein(cleanName, dbu.sortedTokens) <= 2) {
                        match = dbu;
                        method = 'FUZZY_NAME_ORPHAN';
                    }
                });
            }
        }

        userMappingRows.push({
            status: match ? 'MATCH' : 'CREATE_NEW',
            source_name: display_name,
            source_email: user.email || '(None)',
            db_match_name: match ? match.orig : 'Will Create Assistant',
            match_method: match ? method : 'FALLBACK',
            aliases: Array.from(user.aliases).join(' / '),
            sources: Array.from(user.sources).join(', ')
        });
    }

    // Sort: Create New first
    userMappingRows.sort((a, b) => a.status.localeCompare(b.status));

    // 5. Write Output
    if (userMappingRows.length > 0) {
        const userCsvWriter = createObjectCsvWriter({
            path: PREVIEW_USERS,
            header: [
                { id: 'status', title: 'ACTION' },
                { id: 'source_name', title: 'SOURCE_NAME' },
                { id: 'source_email', title: 'SOURCE_EMAIL' },
                { id: 'db_match_name', title: 'DB_MATCH' },
                { id: 'match_method', title: 'METHOD' },
                { id: 'aliases', title: 'ALIASES_FOUND' },
                { id: 'sources', title: 'SOURCES' }
            ]
        });
        await userCsvWriter.writeRecords(userMappingRows);
        console.log(`✅ User Mapping Preview: ${PREVIEW_USERS} (${userMappingRows.length} rows)`);
    }

    if (internalActivities.size > 0) {
        const activityRows = Array.from(internalActivities).map(a => ({ name: a, type: 'INTERNAL' }));
        const activityCsvWriter = createObjectCsvWriter({
            path: PREVIEW_INTERNAL,
            header: [
                { id: 'type', title: 'TYPE' },
                { id: 'name', title: 'ACTIVITY_NAME' }
            ]
        });
        await activityCsvWriter.writeRecords(activityRows);
        console.log(`✅ Internal Activities Preview: ${PREVIEW_INTERNAL}`);
    }
}

generateMappingPreviews();
