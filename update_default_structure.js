require('dotenv').config();
const { pool } = require('./src/utils/database');

async function updateDefaultStructures() {
    console.log('🔄 Updating MissionType default structures...');

    try {
        // Define the new standard structure
        // Changes:
        // 1. "Contrat de mission" (folder)
        // 2. "Lettre de mission" (merged into above or separate folder? User said: "un dossier nommer 'contrat/lettre de mission' qui va donc regrouper la lettre de mission et/ou le contrat")
        // 3. "KYC & Conformité" (folder)

        const newStructure = [
            {
                "name": "01_ADMINISTRATIF",
                "type": "folder",
                "children": [
                    { "name": "Contrat / Lettre de mission", "type": "folder", "children": [] },
                    { "name": "KYC & Conformité", "type": "folder", "children": [] }
                ]
            },
            {
                "name": "02_TRAVAUX",
                "type": "folder",
                "children": [
                    { "name": "Travaux Préparatoires", "type": "folder", "children": [] },
                    { "name": "Feuilles de Maîtresse", "type": "folder", "children": [] },
                    { "name": "Correspondances", "type": "folder", "children": [] }
                ]
            },
            {
                "name": "03_LIVRABLES",
                "type": "folder",
                "children": [
                    { "name": "Rapports provisoires", "type": "folder", "children": [] },
                    { "name": "Rapport final", "type": "folder", "children": [] }
                ]
            },
            {
                "name": "04_FACTURATION",
                "type": "folder",
                "children": [
                    { "name": "Factures émises", "type": "folder", "children": [] },
                    { "name": "Notes de frais", "type": "folder", "children": [] }
                ]
            }
        ];

        // Update ALL mission types to use this new structure (or merge)
        // For simplicity and to meet the user's immediate need, we'll overwrite.
        const query = `UPDATE mission_types SET default_folder_structure = $1`;
        const res = await pool.query(query, [JSON.stringify(newStructure)]);

        console.log(`✅ Updated ${res.rowCount} mission types with new default structure.`);

        // OPTIONAL: Delete existing document trees for the test mission so they regenerate?
        // The user said "impossible to edit...". It implies they might want a reset.
        // I won't auto-reset data, but I'll provide the script if they want to run it manually.

    } catch (error) {
        console.error('❌ Error updating default structures:', error);
    } finally {
        await pool.end();
    }
}

updateDefaultStructures();
