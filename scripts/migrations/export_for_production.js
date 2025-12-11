require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('../../src/utils/database');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '../../exports_sql');

// Escape SQL string values
const esc = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'number') return val.toString();
    if (val instanceof Date) return `'${val.toISOString()}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
};

async function exportDataForProduction() {
    console.log('🚀 Exporting Data for Production Sync...\n');

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const client = await pool.connect();
    const sqlFiles = [];

    try {
        // 1. CLIENTS - Export all clients with UPSERT
        console.log('📦 Exporting clients...');
        const clientsRes = await client.query('SELECT * FROM clients ORDER BY nom');
        let clientsSql = '-- Clients Sync\n-- Generated: ' + new Date().toISOString() + '\n\n';

        for (const c of clientsRes.rows) {
            clientsSql += `INSERT INTO clients (id, nom, sigle, email, telephone, adresse, ville, code_postal, pays, secteur_activite, taille_entreprise, statut, type, source_prospection, notes, created_at, updated_at)
VALUES (${esc(c.id)}, ${esc(c.nom)}, ${esc(c.sigle)}, ${esc(c.email)}, ${esc(c.telephone)}, ${esc(c.adresse)}, ${esc(c.ville)}, ${esc(c.code_postal)}, ${esc(c.pays)}, ${esc(c.secteur_activite)}, ${esc(c.taille_entreprise)}, ${esc(c.statut)}, ${esc(c.type)}, ${esc(c.source_prospection)}, ${esc(c.notes)}, ${esc(c.created_at)}, NOW())
ON CONFLICT (id) DO UPDATE SET 
    nom = EXCLUDED.nom, sigle = EXCLUDED.sigle, statut = EXCLUDED.statut, type = EXCLUDED.type, updated_at = NOW();\n\n`;
        }

        fs.writeFileSync(path.join(OUTPUT_DIR, '01_clients.sql'), clientsSql);
        sqlFiles.push('01_clients.sql');
        console.log(`   ${clientsRes.rows.length} clients exported`);

        // 2. MISSIONS - Export all missions
        console.log('📦 Exporting missions...');
        const missionsRes = await client.query(`
            SELECT m.*, bu.nom as bu_nom, d.nom as div_nom
            FROM missions m
            LEFT JOIN business_units bu ON m.business_unit_id = bu.id
            LEFT JOIN divisions d ON m.division_id = d.id
            ORDER BY m.nom
        `);

        let missionsSql = '-- Missions Sync\n-- Generated: ' + new Date().toISOString() + '\n\n';

        for (const m of missionsRes.rows) {
            missionsSql += `INSERT INTO missions (id, nom, code, client_id, business_unit_id, division_id, type_mission, statut, priorite, description, collaborateur_id, manager_id, associe_id, date_debut, date_fin, created_at, updated_at)
VALUES (${esc(m.id)}, ${esc(m.nom)}, ${esc(m.code)}, ${esc(m.client_id)}, ${esc(m.business_unit_id)}, ${esc(m.division_id)}, ${esc(m.type_mission)}, ${esc(m.statut)}, ${esc(m.priorite)}, ${esc(m.description)}, ${esc(m.collaborateur_id)}, ${esc(m.manager_id)}, ${esc(m.associe_id)}, ${esc(m.date_debut)}, ${esc(m.date_fin)}, ${esc(m.created_at)}, NOW())
ON CONFLICT (id) DO UPDATE SET 
    nom = EXCLUDED.nom, code = EXCLUDED.code, business_unit_id = EXCLUDED.business_unit_id, division_id = EXCLUDED.division_id,
    type_mission = EXCLUDED.type_mission, collaborateur_id = EXCLUDED.collaborateur_id, manager_id = EXCLUDED.manager_id, 
    associe_id = EXCLUDED.associe_id, description = EXCLUDED.description, updated_at = NOW();\n\n`;
        }

        fs.writeFileSync(path.join(OUTPUT_DIR, '02_missions.sql'), missionsSql);
        sqlFiles.push('02_missions.sql');
        console.log(`   ${missionsRes.rows.length} missions exported`);

        // 3. MISSION_TASKS
        console.log('📦 Exporting mission_tasks...');
        const mtRes = await client.query('SELECT * FROM mission_tasks');

        let mtSql = '-- Mission Tasks Sync\n-- Generated: ' + new Date().toISOString() + '\n\n';

        for (const mt of mtRes.rows) {
            mtSql += `INSERT INTO mission_tasks (id, mission_id, task_id, statut, date_debut, date_fin, created_at)
VALUES (${esc(mt.id)}, ${esc(mt.mission_id)}, ${esc(mt.task_id)}, ${esc(mt.statut)}, ${esc(mt.date_debut)}, ${esc(mt.date_fin)}, ${esc(mt.created_at)})
ON CONFLICT (id) DO NOTHING;\n`;
        }

        fs.writeFileSync(path.join(OUTPUT_DIR, '03_mission_tasks.sql'), mtSql);
        sqlFiles.push('03_mission_tasks.sql');
        console.log(`   ${mtRes.rows.length} mission_tasks exported`);

        // 4. EQUIPES_MISSION
        console.log('📦 Exporting equipes_mission...');
        const eqRes = await client.query('SELECT * FROM equipes_mission');

        let eqSql = '-- Equipes Mission Sync\n-- Generated: ' + new Date().toISOString() + '\n\n';

        for (const eq of eqRes.rows) {
            eqSql += `INSERT INTO equipes_mission (id, mission_id, collaborateur_id, role, taux_horaire_mission, pourcentage_charge, date_debut_participation, date_fin_participation, date_creation)
VALUES (${esc(eq.id)}, ${esc(eq.mission_id)}, ${esc(eq.collaborateur_id)}, ${esc(eq.role)}, ${esc(eq.taux_horaire_mission)}, ${esc(eq.pourcentage_charge)}, ${esc(eq.date_debut_participation)}, ${esc(eq.date_fin_participation)}, ${esc(eq.date_creation)})
ON CONFLICT (id) DO NOTHING;\n`;
        }

        fs.writeFileSync(path.join(OUTPUT_DIR, '04_equipes_mission.sql'), eqSql);
        sqlFiles.push('04_equipes_mission.sql');
        console.log(`   ${eqRes.rows.length} equipes_mission exported`);

        // 5. INTERNAL_ACTIVITIES
        console.log('📦 Exporting internal_activities...');
        const iaRes = await client.query('SELECT * FROM internal_activities');

        let iaSql = '-- Internal Activities Sync\n-- Generated: ' + new Date().toISOString() + '\n\n';

        for (const ia of iaRes.rows) {
            iaSql += `INSERT INTO internal_activities (id, name, code, description, is_active, created_at, updated_at)
VALUES (${esc(ia.id)}, ${esc(ia.name)}, ${esc(ia.code)}, ${esc(ia.description)}, ${esc(ia.is_active)}, ${esc(ia.created_at)}, NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, description = EXCLUDED.description;\n`;
        }

        fs.writeFileSync(path.join(OUTPUT_DIR, '05_internal_activities.sql'), iaSql);
        sqlFiles.push('05_internal_activities.sql');
        console.log(`   ${iaRes.rows.length} internal_activities exported`);

        // 6. BU_INTERNAL_ACTIVITIES
        console.log('📦 Exporting bu_internal_activities...');
        const buiaRes = await client.query('SELECT * FROM bu_internal_activities');

        let buiaSql = '-- BU Internal Activities Sync\n-- Generated: ' + new Date().toISOString() + '\n\n';

        for (const buia of buiaRes.rows) {
            buiaSql += `INSERT INTO bu_internal_activities (business_unit_id, internal_activity_id)
VALUES (${esc(buia.business_unit_id)}, ${esc(buia.internal_activity_id)})
ON CONFLICT DO NOTHING;\n`;
        }

        fs.writeFileSync(path.join(OUTPUT_DIR, '06_bu_internal_activities.sql'), buiaSql);
        sqlFiles.push('06_bu_internal_activities.sql');
        console.log(`   ${buiaRes.rows.length} bu_internal_activities exported`);

        // 7. TIME_SHEETS
        console.log('📦 Exporting time_sheets...');
        const tsRes = await client.query('SELECT * FROM time_sheets');

        let tsSql = '-- Time Sheets Sync\n-- Generated: ' + new Date().toISOString() + '\n\n';

        for (const ts of tsRes.rows) {
            tsSql += `INSERT INTO time_sheets (id, user_id, week_start, week_end, statut, created_at, updated_at)
VALUES (${esc(ts.id)}, ${esc(ts.user_id)}, ${esc(ts.week_start)}, ${esc(ts.week_end)}, ${esc(ts.statut)}, ${esc(ts.created_at)}, NOW())
ON CONFLICT (id) DO NOTHING;\n`;
        }

        fs.writeFileSync(path.join(OUTPUT_DIR, '07_time_sheets.sql'), tsSql);
        sqlFiles.push('07_time_sheets.sql');
        console.log(`   ${tsRes.rows.length} time_sheets exported`);

        // 8. TIME_ENTRIES
        console.log('📦 Exporting time_entries...');
        const teRes = await client.query('SELECT * FROM time_entries');

        let teSql = '-- Time Entries Sync\n-- Generated: ' + new Date().toISOString() + '\n\n';
        teSql += '-- First, clear existing time entries (optional, comment out if you want to merge)\nDELETE FROM time_entries;\n\n';

        for (const te of teRes.rows) {
            teSql += `INSERT INTO time_entries (id, time_sheet_id, user_id, date_saisie, heures, type_heures, statut, mission_id, task_id, internal_activity_id, created_at, updated_at)
VALUES (${esc(te.id)}, ${esc(te.time_sheet_id)}, ${esc(te.user_id)}, ${esc(te.date_saisie)}, ${esc(te.heures)}, ${esc(te.type_heures)}, ${esc(te.statut)}, ${esc(te.mission_id)}, ${esc(te.task_id)}, ${esc(te.internal_activity_id)}, ${esc(te.created_at)}, NOW())
ON CONFLICT (id) DO NOTHING;\n`;
        }

        fs.writeFileSync(path.join(OUTPUT_DIR, '08_time_entries.sql'), teSql);
        sqlFiles.push('08_time_entries.sql');
        console.log(`   ${teRes.rows.length} time_entries exported`);

        // Create master file that runs all
        let masterSql = '-- MASTER SYNC FILE\n-- Generated: ' + new Date().toISOString() + '\n';
        masterSql += '-- Run this file to sync all data to production\n\n';
        masterSql += 'BEGIN;\n\n';

        for (const file of sqlFiles) {
            masterSql += `\\i ${file}\n`;
        }

        masterSql += '\nCOMMIT;\n';
        masterSql += '\n-- If any errors occur, the transaction will be rolled back automatically\n';

        fs.writeFileSync(path.join(OUTPUT_DIR, '00_master_sync.sql'), masterSql);

        console.log('\n✅ Export Complete!');
        console.log('📁 Files generated in:', OUTPUT_DIR);
        console.log('\nFiles:');
        console.log('  - 00_master_sync.sql (run this to import all)');
        sqlFiles.forEach(f => console.log('  - ' + f));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        process.exit(0);
    }
}

exportDataForProduction();
