const { query } = require('./src/utils/database');

async function checkTasksTableStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table tasks...\n');
        
        // 1. Vérifier la structure de la table
        console.log('📋 Structure de la table tasks:');
        const structureResult = await query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            ORDER BY ordinal_position
        `);
        
        if (structureResult.rows.length > 0) {
            console.log('✅ Colonnes trouvées:');
            structureResult.rows.forEach((column, index) => {
                console.log(`  ${index + 1}. ${column.column_name} (${column.data_type}) - Nullable: ${column.is_nullable} - Default: ${column.column_default || 'NULL'}`);
            });
        } else {
            console.log('❌ Aucune colonne trouvée dans la table tasks');
        }
        
        // 2. Vérifier les contraintes
        console.log('\n📋 Contraintes de la table tasks:');
        const constraintsResult = await query(`
            SELECT conname, contype, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'tasks'::regclass
        `);
        
        if (constraintsResult.rows.length > 0) {
            console.log('✅ Contraintes trouvées:');
            constraintsResult.rows.forEach((constraint, index) => {
                console.log(`  ${index + 1}. ${constraint.conname} (${constraint.contype}): ${constraint.definition}`);
            });
        } else {
            console.log('❌ Aucune contrainte trouvée');
        }
        
        // 3. Vérifier les données existantes
        console.log('\n📋 Données existantes dans la table tasks:');
        const dataResult = await query('SELECT * FROM tasks LIMIT 5');
        
        if (dataResult.rows.length > 0) {
            console.log(`✅ ${dataResult.rows.length} tâches trouvées:`);
            dataResult.rows.forEach((task, index) => {
                console.log(`  ${index + 1}. ID: ${task.id} | Description: ${task.description || 'NULL'} | Autres champs:`, task);
            });
        } else {
            console.log('❌ Aucune tâche trouvée en base de données');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
    }
}

checkTasksTableStructure(); 