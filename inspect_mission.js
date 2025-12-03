
const { pool } = require('./src/utils/database');

function parsePaymentConditions(conditions) {
    if (!conditions) return [];

    try {
        // Cas 1: C'est déjà un objet/tableau JS
        if (typeof conditions === 'object') {
            if (Array.isArray(conditions)) return conditions;
            return Object.values(conditions);
        }

        // Cas 2: C'est une chaîne
        if (typeof conditions === 'string') {
            // Nettoyage préliminaire
            let cleanStr = conditions.trim();

            // Cas spécial: Format tableau PostgreSQL stringifié "{"...","..."}"
            // On remplace les accolades externes par des crochets pour en faire un tableau JSON valide
            if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
                // Attention: ne pas confondre avec un objet JSON normal qui commence aussi par {
                // Un tableau PG commence par { et contient des valeurs, souvent quotées
                // Un objet JSON commence par { et contient "key": val

                // Si ça ressemble à un objet JSON (clé:valeur), on essaie de le parser directement
                if (cleanStr.includes(':')) {
                    try {
                        const parsed = JSON.parse(cleanStr);
                        if (!Array.isArray(parsed)) return Object.values(parsed);
                        return parsed;
                    } catch (e) {
                        // Si échec, c'est peut-être un tableau PG
                    }
                }

                // Tentative de conversion tableau PG -> Tableau JSON
                try {
                    const arrayStr = cleanStr.replace(/^\{/, '[').replace(/\}$/, ']');
                    const parsedArray = JSON.parse(arrayStr);

                    // Si c'est un tableau de chaînes (double encodage), on parse chaque élément
                    if (Array.isArray(parsedArray)) {
                        return parsedArray.map(item => {
                            if (typeof item === 'string') {
                                try { return JSON.parse(item); } catch (e) { return item; }
                            }
                            return item;
                        });
                    }
                } catch (e) {
                    console.warn('Echec conversion tableau PG -> JSON:', e);
                }
            }

            // Tentative de parsing standard
            let parsed = JSON.parse(cleanStr);

            // Gestion double encodage (string dans string)
            if (typeof parsed === 'string') {
                try {
                    parsed = JSON.parse(parsed);
                } catch (e) {
                    // Ce n'était pas du double encodage
                }
            }

            if (Array.isArray(parsed)) return parsed;
            if (typeof parsed === 'object' && parsed !== null) return Object.values(parsed);
        }

        return [];
    } catch (error) {
        console.error('Erreur parsing conditions paiement:', error);
        return [];
    }
}

async function checkMission() {
    try {
        const res = await pool.query("SELECT id, nom, conditions_paiement FROM missions WHERE code = 'MIS-20251201-836'");
        if (res.rows.length > 0) {
            const raw = res.rows[0].conditions_paiement;
            console.log('RAW TYPE:', typeof raw);
            console.log('RAW VALUE:', raw);

            // Test parsing logic directly here
            console.log('--- TEST PARSING ---');
            const parsed = parsePaymentConditions(raw);
            console.log('PARSED RESULT:', JSON.stringify(parsed, null, 2));
        } else {
            console.log('Mission not found');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkMission();
