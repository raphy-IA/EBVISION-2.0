const { query } = require('../src/utils/database');

async function checkTimeSheetsStructure() {
    console.log('🔍 VÉRIFICATION DE LA STRUCTURE TIME_SHEETS');
    console.log('==========================================');

    try {
        // 1. Vérifier la structure de la table
        console.log('\n📋 1. STRUCTURE DE LA TABLE TIME_SHEETS');
        
        const structure = await query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'time_sheets' 
            ORDER BY ordinal_position
        `);

        console.log('Colonnes de la table time_sheets:');
        structure.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // 2. Vérifier les contraintes
        console.log('\n🔗 2. CONTRAINTES DE LA TABLE');
        
        const constraints = await query(`
            SELECT 
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            LEFT JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'time_sheets'
            ORDER BY tc.constraint_name
        `);

        console.log('Contraintes trouvées:');
        constraints.rows.forEach(constraint => {
            console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_type}`);
            if (constraint.foreign_table_name) {
                console.log(`     -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
            }
        });

        // 3. Vérifier les données existantes
        console.log('\n📊 3. DONNÉES EXISTANTES');
        
        const count = await query('SELECT COUNT(*) as count FROM time_sheets');
        console.log(`Nombre total de feuilles de temps: ${count.rows[0].count}`);

        if (count.rows[0].count > 0) {
            const sample = await query('SELECT * FROM time_sheets LIMIT 3');
            console.log('Exemple de données:');
            sample.rows.forEach((row, index) => {
                console.log(`   - Ligne ${index + 1}:`, row);
            });
        }

        // 4. Vérifier les valeurs de statut
        console.log('\n📊 4. VALEURS DE STATUT');
        
        const statusValues = await query(`
            SELECT DISTINCT statut, COUNT(*) as count
            FROM time_sheets 
            WHERE statut IS NOT NULL
            GROUP BY statut
        `);

        console.log('Valeurs de statut:');
        statusValues.rows.forEach(status => {
            console.log(`   - ${status.statut}: ${status.count} occurrences`);
        });

        console.log('\n✅ VÉRIFICATION TERMINÉE');

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
        throw error;
    }
}

// Exécuter la vérification
if (require.main === module) {
    checkTimeSheetsStructure().then(() => {
        console.log('\n🎉 Vérification terminée');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });
}

module.exports = { checkTimeSheetsStructure }; 