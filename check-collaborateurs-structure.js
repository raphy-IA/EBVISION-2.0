const { pool } = require('./src/utils/database');

async function checkCollaborateursStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table collaborateurs...');
        
        const query = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'collaborateurs'
            ORDER BY ordinal_position
        `;
        
        const result = await pool.query(query);
        
        console.log('📋 Structure de la table collaborateurs:');
        result.rows.forEach(column => {
            console.log(`  - ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`);
        });
        
        // Vérifier s'il y a des données
        const countQuery = `SELECT COUNT(*) as total FROM collaborateurs`;
        const countResult = await pool.query(countQuery);
        console.log(`📊 Nombre total de collaborateurs: ${countResult.rows[0].total}`);
        
        // Afficher quelques exemples
        const sampleQuery = `SELECT id, nom, prenom FROM collaborateurs LIMIT 5`;
        const sampleResult = await pool.query(sampleQuery);
        console.log('👥 Exemples de collaborateurs:');
        sampleResult.rows.forEach(collab => {
            console.log(`  - ${collab.nom} ${collab.prenom} (${collab.id})`);
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkCollaborateursStructure(); 