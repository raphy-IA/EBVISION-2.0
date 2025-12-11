const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');
const Client = require('../../src/models/Client');

async function previewMigration() {
    try {
        console.log('🔍 Analyse de la migration Clients...\n');

        // 1. Check Schema for 'administrateur' column
        const schema = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'clients' AND column_name IN ('administrateur', 'contact_principal', 'nom_contact')
        `);
        const columns = schema.rows.map(r => r.column_name);
        console.log('Colonnes disponibles pour Administrateur:', columns);

        let adminCol = 'notes'; // Fallback
        if (columns.includes('administrateur')) adminCol = 'administrateur';
        else if (columns.includes('nom_contact')) adminCol = 'nom_contact';
        else if (columns.includes('contact_principal')) adminCol = 'contact_principal';

        console.log(`➡️  MAPPING: Colonne 'Administrateur' (CSV) -> Colonne '${adminCol}' (DB)\n`);

        // 2. Read CSV
        const csvPath = path.join(__dirname, '../../backups/Migration/revue_client.csv');
        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.trim().split('\n').slice(1); // Skip header

        console.log('--- TABLEAU DE PRÉVISUALISATION ---');
        console.log('| Client Actuel | Nouveau Nom | Nouveau Sigle | Secteur -> Code | Admin (Mapping) |');
        console.log('|---|---|---|---|---|');

        for (const line of lines) {
            const [id, newName, newSigle, sectorRaw, adminRaw] = line.split(';').map(s => s.trim());

            // Fetch current
            const client = await Client.findById(id);
            if (!client) {
                console.log(`| ❌ ID INCONNU (${id}) | - | - | - | - |`);
                continue;
            }

            // Logic for Sector
            let sectorAction = 'No Change';
            if (sectorRaw) {
                if (sectorRaw.toLowerCase() === 'miscellaneous') sectorAction = 'CREATE: MISC';
                else if (sectorRaw.toLowerCase() === 'bank') sectorAction = 'LINK: BANQUE';
                else sectorAction = `LINK: ${sectorRaw.toUpperCase()}`;
            }

            // Logic for Admin
            let adminAction = '-';
            if (adminRaw) {
                adminAction = `UPDATE (${adminCol}): ${adminRaw.substring(0, 15)}...`;
            }

            console.log(`| ${client.nom} | ${newName || client.nom} | ${newSigle || client.sigle} | ${sectorAction} | ${adminAction} |`);
        }

        console.log('\n✅ Fin de la prévisualisation.');
        process.exit(0);

    } catch (e) {
        console.error('Erreur:', e);
        process.exit(1);
    }
}

previewMigration();
