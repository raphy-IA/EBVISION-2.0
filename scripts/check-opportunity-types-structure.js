require('dotenv').config();
const { pool } = require('../src/utils/database');

async function checkOpportunityTypesStructure() {
    console.log('🔍 Vérification de la structure de la table opportunity_types...\n');

    try {
        // Test 1: Vérifier la connexion
        console.log('📡 Test 1: Vérification de la connexion...');
        const connectionTest = await pool.query('SELECT NOW()');
        console.log('✅ Connexion à la base de données réussie');

        // Test 2: Vérifier la structure de la table opportunity_types
        console.log('\n📋 Test 2: Structure de la table opportunity_types...');
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'opportunity_types'
            ORDER BY ordinal_position
        `;
        const structure = await pool.query(structureQuery);
        console.log('📊 Colonnes de la table opportunity_types:');
        structure.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // Test 3: Vérifier les contraintes
        console.log('\n🔒 Test 3: Contraintes de la table opportunity_types...');
        const constraintsQuery = `
            SELECT conname, contype, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'opportunity_types'::regclass
        `;
        const constraints = await pool.query(constraintsQuery);
        console.log('📊 Contraintes trouvées:');
        constraints.rows.forEach(row => {
            console.log(`  - ${row.conname} (${row.contype}): ${row.definition}`);
        });

        // Test 4: Vérifier les données existantes
        console.log('\n📊 Test 4: Données existantes...');
        const dataQuery = 'SELECT * FROM opportunity_types LIMIT 3';
        const data = await pool.query(dataQuery);
        console.log('📋 Exemples de données:');
        data.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${JSON.stringify(row, null, 2)}`);
        });

    } catch (error) {
        console.error('❌ Erreur générale:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
    }
}

checkOpportunityTypesStructure(); 