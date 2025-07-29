const db = require('../src/utils/database');

async function checkClientsStructure() {
    try {
        console.log('🔍 Vérification de la structure de la table clients...');
        
        const result = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'clients'
            ORDER BY ordinal_position
        `);
        
        console.log('Structure de la table clients:');
        result.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
        // Vérifier si la colonne created_at existe
        const hasCreatedAt = result.rows.some(col => col.column_name === 'created_at');
        console.log('\nColonne created_at existe:', hasCreatedAt);
        
        if (!hasCreatedAt) {
            console.log('⚠️  La colonne created_at n\'existe pas. Ajout de la colonne...');
            
            await db.query(`
                ALTER TABLE clients 
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            `);
            
            console.log('✅ Colonnes created_at et updated_at ajoutées');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur:', err);
        process.exit(1);
    }
}

checkClientsStructure(); 