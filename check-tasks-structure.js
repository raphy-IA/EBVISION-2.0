const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    database: 'trs_affichage',
    user: 'postgres',
    password: 'password',
    port: 5432
});

async function checkTasksStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table tasks...');
        
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Colonnes de la table tasks:');
        result.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type}`);
        });
        
        // Vérifier si libelle ou task_libelle existe
        const hasLibelle = result.rows.some(row => row.column_name === 'libelle');
        const hasTaskLibelle = result.rows.some(row => row.column_name === 'task_libelle');
        
        console.log('\n🔍 Analyse:');
        console.log(`  - Colonne 'libelle' existe: ${hasLibelle}`);
        console.log(`  - Colonne 'task_libelle' existe: ${hasTaskLibelle}`);
        
        if (!hasLibelle && !hasTaskLibelle) {
            console.log('\n❌ ERREUR: Aucune colonne libelle ou task_libelle trouvée!');
        } else if (hasLibelle && !hasTaskLibelle) {
            console.log('\n✅ La colonne correcte est "libelle"');
        } else if (!hasLibelle && hasTaskLibelle) {
            console.log('\n✅ La colonne correcte est "task_libelle"');
        } else {
            console.log('\n⚠️  Les deux colonnes existent!');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkTasksStructure();
