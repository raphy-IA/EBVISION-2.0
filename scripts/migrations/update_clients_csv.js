const path = require('path');
// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Pool } = require('pg');
const fs = require('fs');
const Client = require('../../src/models/Client');

// Use local configuration parameters as requested
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'EB-Vision 2.0',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    try {
        console.log('🚀 Démarrage de la migration Clients...\n');

        // CSV Path
        const csvPath = path.join(__dirname, '../../backups/Migration/revue_client.csv');
        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.trim().split('\n').slice(1);

        console.log(`Lecture de ${lines.length} lignes...`);

        // Check/Create 'Miscellaneous' Sector
        let miscSectorId = null;
        const miscCheck = await pool.query("SELECT id FROM secteurs_activite WHERE code = 'MISC'");
        if (miscCheck.rows.length === 0) {
            console.log('✨ Création du secteur MISC (Miscellaneous)...');
            const newSector = await pool.query(
                "INSERT INTO secteurs_activite (nom, code, couleur, description) VALUES ($1, $2, $3, $4) RETURNING id",
                ['Miscellaneous', 'MISC', '#90A4AE', 'Secteur divers']
            );
            miscSectorId = newSector.rows[0].id;
        } else {
            console.log('✅ Secteur MISC existant.');
            miscSectorId = miscCheck.rows[0].id;
        }

        // Check 'Banque' Sector ID
        let banqueSectorId = null;
        const banqueCheck = await pool.query("SELECT id FROM secteurs_activite WHERE code = 'BANQUE'");
        if (banqueCheck.rows.length > 0) banqueSectorId = banqueCheck.rows[0].id;

        let successCount = 0;
        let failCount = 0;

        // Note: 'updated_by' references 'utilisateurs' which is empty, so we cannot set it efficiently without FK violation.
        // Leaving it null/unchanged for now.

        for (const line of lines) {
            const [id, newName, newSigle, sectorRaw, adminRaw] = line.split(';').map(s => s.trim());

            if (!id) continue;

            try {
                // Use local pool for finding client to avoid model connection issues if any
                // But actually Client.findById uses the pool from utils/database which might be different
                // However, since we are running a script, we should probably stick to the model if it works
                // But let's check if we need to patch the model's pool usage.
                // For now, assuming Client model works if env vars are loaded.

                const client = await Client.findById(id);
                if (!client) {
                    console.warn(`⚠️  Client introuvable ID: ${id}`);
                    failCount++;
                    continue;
                }

                const updates = {};
                let hasUpdates = false;

                // 1. Nom / Sigle
                if (newName && newName !== client.nom) {
                    updates.nom = newName;
                    hasUpdates = true;
                }
                if (newSigle && newSigle !== client.sigle) {
                    updates.sigle = newSigle;
                    hasUpdates = true;
                }

                // 2. Secteur
                if (sectorRaw) {
                    if (sectorRaw.toLowerCase() === 'miscellaneous') {
                        if (client.secteur_activite_id !== miscSectorId) {
                            updates.secteur_activite_id = miscSectorId;
                            updates.secteur_activite = 'Miscellaneous'; // Legacy field sync
                            hasUpdates = true;
                        }
                    } else if (sectorRaw.toLowerCase() === 'bank' && banqueSectorId) {
                        if (client.secteur_activite_id !== banqueSectorId) {
                            updates.secteur_activite_id = banqueSectorId;
                            updates.secteur_activite = 'Banque'; // Legacy
                            hasUpdates = true;
                        }
                    }
                }

                // 3. Administrateur -> administrateur_nom
                if (adminRaw) {
                    if (client.administrateur_nom !== adminRaw) {
                        updates.administrateur_nom = adminRaw;
                        hasUpdates = true;
                    }
                }

                if (hasUpdates) {
                    await client.update(updates);
                    console.log(`✅ MAJ Client: ${client.nom} -> ${updates.nom || '(Nom inchangé)'} | Admin: ${updates.administrateur_nom || '-'}`);
                    successCount++;
                } else {
                    console.log(`ℹ️  Aucun changement pour: ${client.nom}`);
                }

            } catch (err) {
                console.error(`❌ Erreur sur ${id}:`, err.message);
                failCount++;
            }
        }

        console.log(`\n🎉 Migration terminée: ${successCount} mis à jour, ${failCount} échecs.`);
        process.exit(0);

    } catch (e) {
        console.error('Erreur Critique:', e);
        process.exit(1);
    }
}

runMigration();
