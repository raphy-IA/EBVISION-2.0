const { pool } = require('../src/utils/database');
            
async function checkMissionsStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table missions...');
        
        // Vérifier la structure de la table missions
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'missions' 
            ORDER BY ordinal_position
        `);
        
        console.log('📊 Structure de la table missions:');
        result.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });
        
        // Vérifier si la table existe
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'missions'
            )
        `);
        
        console.log(`\n📋 Table missions existe: ${tableExists.rows[0].exists}`);
        
        // Compter les missions existantes
        const countResult = await pool.query('SELECT COUNT(*) as count FROM missions');
        console.log(`📊 Nombre de missions existantes: ${countResult.rows[0].count}`);
        
        // Vérifier les contraintes de priorité
        const constraintResult = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'missions'::regclass 
            AND conname = 'check_priorite'
        `);
        
        if (constraintResult.rows.length > 0) {
            console.log(`\n🔒 Contrainte de priorité: ${constraintResult.rows[0].definition}`);
        } else {
            console.log('\n⚠️ Aucune contrainte de priorité trouvée');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}
            
checkMissionsStructure(); 