const { pool } = require('./src/utils/database');

async function checkTableStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table clients...');
        
        // Vérifier si la table existe
        const tableExistsQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'clients'
            );
        `;
        
        const tableExists = await pool.query(tableExistsQuery);
        console.log('📋 Table clients existe:', tableExists.rows[0].exists);
        
        if (!tableExists.rows[0].exists) {
            console.log('❌ La table clients n\'existe pas!');
            return;
        }
        
        // Obtenir la structure de la table
        const structureQuery = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'clients'
            ORDER BY ordinal_position;
        `;
        
        const structure = await pool.query(structureQuery);
        console.log('📊 Structure de la table clients:');
        structure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        // Compter le nombre de colonnes
        console.log(`📈 Nombre total de colonnes: ${structure.rows.length}`);
        
        // Vérifier les contraintes
        const constraintsQuery = `
            SELECT 
                constraint_name,
                constraint_type
            FROM information_schema.table_constraints 
            WHERE table_schema = 'public' 
            AND table_name = 'clients';
        `;
        
        const constraints = await pool.query(constraintsQuery);
        console.log('🔒 Contraintes de la table:');
        constraints.rows.forEach(constraint => {
            console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkTableStructure(); 