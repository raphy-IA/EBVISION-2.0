const { pool } = require('../src/utils/database');

async function checkMission() {
    try {
        const result = await pool.query("SELECT nom, statut, date_debut FROM missions WHERE nom LIKE '%mission_Test%'");
        console.table(result.rows);
    } catch (error) {
        console.error(error);
    } finally {
        pool.end();
    }
}

checkMission();
