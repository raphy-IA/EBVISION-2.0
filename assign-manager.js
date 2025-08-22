const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'trs_dashboard',
    user: 'postgres',
    password: 'postgres'
});

async function assignManager() {
    try {
        console.log('🔍 Recherche du collaborateur Raphaël Ngos...');
        
        // Trouver le collaborateur Raphaël Ngos
        const collaborateurResult = await pool.query(
            'SELECT id FROM collaborateurs WHERE nom = $1 AND prenom = $2',
            ['Ngos', 'Raphaël']
        );
        
        if (collaborateurResult.rows.length === 0) {
            console.error('❌ Collaborateur Raphaël Ngos non trouvé');
            return;
        }
        
        const collaborateurId = collaborateurResult.rows[0].id;
        console.log('✅ Collaborateur trouvé:', collaborateurId);
        
        // Trouver la Business Unit "Direction Générale"
        console.log('🔍 Recherche de la Business Unit "Direction Générale"...');
        const buResult = await pool.query(
            'SELECT id FROM business_units WHERE nom = $1',
            ['Direction Générale']
        );
        
        if (buResult.rows.length === 0) {
            console.error('❌ Business Unit "Direction Générale" non trouvée');
            return;
        }
        
        const buId = buResult.rows[0].id;
        console.log('✅ Business Unit trouvée:', buId);
        
        // Assigner Raphaël Ngos comme responsable principal
        console.log('🔧 Assignation comme responsable principal...');
        await pool.query(
            'UPDATE business_units SET responsable_principal_id = $1 WHERE id = $2',
            [collaborateurId, buId]
        );
        
        console.log('✅ Raphaël Ngos a été assigné comme responsable principal de la Direction Générale');
        
        // Vérifier l'assignation
        const verificationResult = await pool.query(
            `SELECT bu.nom as bu_name, c.nom, c.prenom 
             FROM business_units bu 
             LEFT JOIN collaborateurs c ON bu.responsable_principal_id = c.id 
             WHERE bu.id = $1`,
            [buId]
        );
        
        console.log('📋 Vérification:', verificationResult.rows[0]);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

assignManager();
