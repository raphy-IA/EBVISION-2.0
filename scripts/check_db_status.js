const { pool } = require('../src/utils/database');

async function checkDatabaseStatus() {
    try {
        console.log('🔍 Vérification de l\'état de la base de données...\n');

        // Vérifier les tables existantes
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('📋 Tables existantes:');
        tables.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        // Vérifier si la table divisions existe et sa structure
        const divisionsExists = tables.rows.some(row => row.table_name === 'divisions');
        const businessUnitsExists = tables.rows.some(row => row.table_name === 'business_units');

        console.log('\n📊 État des tables clés:');
        console.log(`  - divisions: ${divisionsExists ? '✅ Existe' : '❌ N\'existe pas'}`);
        console.log(`  - business_units: ${businessUnitsExists ? '✅ Existe' : '❌ N\'existe pas'}`);

        if (divisionsExists) {
            const divisionsStructure = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'divisions' 
                ORDER BY ordinal_position
            `);

            console.log('\n📋 Structure de la table divisions:');
            divisionsStructure.rows.forEach(row => {
                console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
            });

            // Vérifier les données
            const divisionsCount = await pool.query('SELECT COUNT(*) as count FROM divisions');
            console.log(`\n📊 Nombre de divisions: ${divisionsCount.rows[0].count}`);
        }

        if (businessUnitsExists) {
            const businessUnitsStructure = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'business_units' 
                ORDER BY ordinal_position
            `);

            console.log('\n📋 Structure de la table business_units:');
            businessUnitsStructure.rows.forEach(row => {
                console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
            });

            // Vérifier les données
            const businessUnitsCount = await pool.query('SELECT COUNT(*) as count FROM business_units');
            console.log(`\n📊 Nombre de business units: ${businessUnitsCount.rows[0].count}`);
        }

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkDatabaseStatus(); 