const { pool } = require('../src/utils/database');

async function debugMissionData() {
    try {
        console.log('🔍 Débogage des données de mission...');
        
        // Vérifier les clients disponibles
        const clientsResult = await pool.query('SELECT id, nom FROM clients LIMIT 5');
        console.log('📋 Clients disponibles:');
        clientsResult.rows.forEach(client => {
            console.log(`   - ${client.id}: ${client.nom}`);
        });
        
        // Vérifier les opportunités disponibles
        const opportunitiesResult = await pool.query('SELECT id, titre, client_id FROM opportunites LIMIT 5');
        console.log('📋 Opportunités disponibles:');
        opportunitiesResult.rows.forEach(opp => {
            console.log(`   - ${opp.id}: ${opp.titre} (Client: ${opp.client_id})`);
        });
        
        // Vérifier les types de mission
        const missionTypesResult = await pool.query('SELECT id, codification, libelle FROM mission_types LIMIT 5');
        console.log('📋 Types de mission disponibles:');
        missionTypesResult.rows.forEach(type => {
            console.log(`   - ${type.id}: ${type.codification} - ${type.libelle}`);
        });
        
        // Vérifier les collaborateurs
        const collaborateursResult = await pool.query('SELECT id, nom, prenom, statut FROM collaborateurs WHERE statut = \'ACTIF\' LIMIT 5');
        console.log('📋 Collaborateurs actifs:');
        collaborateursResult.rows.forEach(collab => {
            console.log(`   - ${collab.id}: ${collab.nom} ${collab.prenom} (${collab.statut})`);
        });
        
        // Vérifier les tâches
        const tasksResult = await pool.query('SELECT id, code, libelle, obligatoire FROM tasks LIMIT 5');
        console.log('📋 Tâches disponibles:');
        tasksResult.rows.forEach(task => {
            console.log(`   - ${task.id}: ${task.code} - ${task.libelle} (Obligatoire: ${task.obligatoire})`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

debugMissionData(); 