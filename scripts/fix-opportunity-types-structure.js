const { pool } = require('../src/utils/database');

async function fixOpportunityTypesStructure() {
    try {
        console.log('🔧 Correction de la structure opportunity_types...\n');
        
        // 1. Vérifier la structure actuelle
        console.log('1. Structure actuelle:');
        const structure = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'opportunity_types'
            ORDER BY ordinal_position;
        `);
        
        structure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
        
        // 2. Ajouter les colonnes manquantes
        console.log('\n2. Ajout des colonnes manquantes...');
        
        // Vérifier si la colonne 'nom' existe
        const nomExists = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'opportunity_types' 
                AND column_name = 'nom'
            );
        `);
        
        if (!nomExists.rows[0].exists) {
            console.log('  - Ajout de la colonne nom...');
            await pool.query('ALTER TABLE opportunity_types ADD COLUMN nom VARCHAR(100)');
        }
        
        // Vérifier si la colonne 'code' existe
        const codeExists = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'opportunity_types' 
                AND column_name = 'code'
            );
        `);
        
        if (!codeExists.rows[0].exists) {
            console.log('  - Ajout de la colonne code...');
            await pool.query('ALTER TABLE opportunity_types ADD COLUMN code VARCHAR(50)');
        }
        
        // Vérifier si la colonne 'couleur' existe
        const couleurExists = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'opportunity_types' 
                AND column_name = 'couleur'
            );
        `);
        
        if (!couleurExists.rows[0].exists) {
            console.log('  - Ajout de la colonne couleur...');
            await pool.query('ALTER TABLE opportunity_types ADD COLUMN couleur VARCHAR(20)');
        }
        
        // 3. Mettre à jour les données existantes
        console.log('\n3. Mise à jour des données existantes...');
        await pool.query(`
            UPDATE opportunity_types 
            SET nom = name, 
                code = UPPER(name),
                couleur = CASE 
                    WHEN name = 'Audit' THEN '#e74c3c'
                    WHEN name = 'Conseil' THEN '#3498db'
                    WHEN name = 'Formation' THEN '#f39c12'
                    WHEN name = 'Expertise' THEN '#9b59b6'
                    WHEN name = 'Consulting' THEN '#2ecc71'
                    ELSE '#95a5a6'
                END
            WHERE nom IS NULL;
        `);
        
        // 4. Vérifier les données
        console.log('\n4. Vérification des données...');
        const types = await pool.query(`
            SELECT id, name, nom, code, description, couleur 
            FROM opportunity_types 
            WHERE is_active = true
            ORDER BY name;
        `);
        
        console.log('Types d\'opportunités:');
        types.rows.forEach(type => {
            console.log(`  - ${type.name} (${type.nom}) - ${type.code} - ${type.couleur}`);
        });
        
        console.log('\n✅ Structure corrigée avec succès');
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
fixOpportunityTypesStructure().catch(console.error); 