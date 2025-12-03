
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

async function simulateNextBilling() {
    try {
        const res = await pool.query("SELECT * FROM missions WHERE code = 'MIS-20251201-836'");
        if (res.rows.length === 0) {
            console.log('Mission not found');
            process.exit(0);
        }
        const mission = res.rows[0];
        const missionId = mission.id;

        // 2. Récupérer le total déjà facturé
        const invoicesQuery = `
            SELECT SUM(montant_ht) as total_facture
            FROM invoices 
            WHERE mission_id = $1 AND statut != 'ANNULEE'
        `;
        const invoicesResult = await pool.query(invoicesQuery, [missionId]);
        const totalFacture = parseFloat(invoicesResult.rows[0].total_facture || 0);
        console.log('Total Facturé:', totalFacture);

        // 3. Analyser les conditions de paiement
        const conditions = parsePaymentConditions(mission.conditions_paiement);
        console.log('Conditions:', JSON.stringify(conditions, null, 2));

        let nextBilling = null;
        let cumulAttendu = 0;

        // Chercher la prochaine condition non atteinte
        for (let i = 0; i < conditions.length; i++) {
            const cond = conditions[i];

            // Gestion des clés snake_case (DB) et camelCase (Frontend)
            const montantHonoraires = parseFloat(cond.montant_honoraires || cond.montantHonoraires || 0);
            const montantDebours = parseFloat(cond.montant_debours || cond.montantDebours || 0);
            const datePrevue = cond.date_prevue || cond.datePrevisionnelle;
            const details = cond.details || cond.description || `Tranche ${i + 1}`;

            const montantPrevu = montantHonoraires + montantDebours;
            cumulAttendu += montantPrevu;

            console.log(`Condition ${i}: Prevu=${montantPrevu}, Cumul=${cumulAttendu}, TotalFacture=${totalFacture}`);

            if (totalFacture < cumulAttendu - 1) { // Marge d'erreur de 1
                nextBilling = {
                    type: 'CONDITION',
                    condition_index: i,
                    description: details,
                    montant_honoraires: montantHonoraires,
                    montant_debours: montantDebours,
                    date_prevue: datePrevue,
                    montant_total: montantPrevu
                };
                // Ajuster si partiel (cas rare mais possible)
                const dejaPayeSurTranche = totalFacture - (cumulAttendu - montantPrevu);
                if (dejaPayeSurTranche > 0) {
                    nextBilling.montant_total -= dejaPayeSurTranche;
                    nextBilling.description += ' (Solde tranche)';
                }
                break;
            }
        }

        // Si toutes les conditions sont passées (ou pas de conditions), proposer le solde du budget
        if (!nextBilling) {
            console.log('No condition matched, checking balance...');
            const budgetTotal = parseFloat(mission.montant_honoraires || 0) + parseFloat(mission.montant_debours || 0);
            const resteAFacturer = budgetTotal - totalFacture;

            if (resteAFacturer > 1) { // Marge d'erreur
                nextBilling = {
                    type: 'BALANCE',
                    description: 'Solde de la mission',
                    montant_honoraires: Math.max(0, parseFloat(mission.montant_honoraires || 0) - totalFacture), // Simplification
                    montant_debours: parseFloat(mission.montant_debours || 0), // Simplification
                    montant_total: resteAFacturer,
                    date_prevue: null
                };
            }
        }

        console.log('RESULT:', JSON.stringify(nextBilling, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

simulateNextBilling();
