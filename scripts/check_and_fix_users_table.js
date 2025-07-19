const { pool } = require('../src/utils/database');

async function checkAndFixUsersTable() {
    console.log('🔍 Vérification de la structure de la table users...');
    
    try {
        // Vérifier la structure actuelle
        const structureResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Structure actuelle de la table users:');
        structureResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
        
        // Vérifier si les colonnes manquantes existent
        const expectedColumns = ['nom', 'prenom', 'initiales', 'grade', 'division_id', 'date_embauche', 'taux_horaire'];
        const existingColumns = structureResult.rows.map(row => row.column_name);
        const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length > 0) {
            console.log(`❌ Colonnes manquantes: ${missingColumns.join(', ')}`);
            console.log('🔧 Application de la migration manquante...');
            
            // Appliquer la migration manquante
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN nom VARCHAR(50),
                ADD COLUMN prenom VARCHAR(50),
                ADD COLUMN initiales VARCHAR(5),
                ADD COLUMN grade VARCHAR(20),
                ADD COLUMN division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
                ADD COLUMN date_embauche DATE,
                ADD COLUMN taux_horaire DECIMAL(10,2) DEFAULT 0
            `);
            
            // Ajouter les contraintes
            await pool.query(`
                ALTER TABLE users 
                ALTER COLUMN nom SET NOT NULL,
                ALTER COLUMN prenom SET NOT NULL,
                ALTER COLUMN initiales SET NOT NULL,
                ALTER COLUMN grade SET NOT NULL,
                ALTER COLUMN date_embauche SET NOT NULL
            `);
            
            // Ajouter les contraintes de vérification
            await pool.query(`
                ALTER TABLE users 
                ADD CONSTRAINT users_grade_check CHECK (grade IN ('ASSISTANT', 'SENIOR', 'MANAGER', 'DIRECTOR', 'PARTNER'))
            `);
            
            // Ajouter les contraintes uniques
            await pool.query(`
                ALTER TABLE users 
                ADD CONSTRAINT users_initiales_unique UNIQUE (initiales)
            `);
            
            console.log('✅ Migration appliquée avec succès!');
        } else {
            console.log('✅ Toutes les colonnes attendues sont présentes');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkAndFixUsersTable(); 