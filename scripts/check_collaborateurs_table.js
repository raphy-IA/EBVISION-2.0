const { pool } = require('../src/utils/database');

async function checkCollaborateursTable() {
    try {
        console.log('🔍 Vérification de la table collaborateurs...\n');

        // Vérifier la structure de la table
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'collaborateurs' 
            ORDER BY ordinal_position
        `);

        console.log('📋 Structure de la table collaborateurs:');
        structure.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // Vérifier les données
        const count = await pool.query('SELECT COUNT(*) as count FROM collaborateurs');
        console.log(`\n📊 Nombre de collaborateurs: ${count.rows[0].count}`);

        // Vérifier si la colonne grade existe
        const gradeExists = structure.rows.some(row => row.column_name === 'grade');
        console.log(`\n🔍 Colonne 'grade' existe: ${gradeExists ? '✅ Oui' : '❌ Non'}`);

        if (!gradeExists) {
            console.log('\n📝 Ajout de la colonne grade...');
            await pool.query('ALTER TABLE collaborateurs ADD COLUMN grade VARCHAR(50)');
            console.log('✅ Colonne grade ajoutée');
        }

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkCollaborateursTable(); 