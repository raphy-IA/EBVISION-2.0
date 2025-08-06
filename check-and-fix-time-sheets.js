const { Pool } = require('pg');

async function checkAndFixTimeSheets() {
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'eb_vision_2_0',
        user: 'postgres',
        password: 'your_password'
    });

    try {
        console.log('🔍 Vérification de la table time_sheets...');

        // 1. Vérifier si la table existe
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'time_sheets'
            ) as exists
        `);
        
        console.log('Table time_sheets existe:', tableExists.rows[0].exists);

        if (!tableExists.rows[0].exists) {
            console.log('❌ Table time_sheets n\'existe pas. Création...');
            
            // Créer la table
            await pool.query(`
                CREATE TABLE time_sheets (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    collaborateur_id UUID NOT NULL,
                    date_debut_semaine DATE NOT NULL,
                    date_fin_semaine DATE NOT NULL,
                    annee INTEGER NOT NULL,
                    semaine INTEGER NOT NULL,
                    statut VARCHAR(20) DEFAULT 'draft' CHECK (statut IN ('draft', 'submitted', 'approved', 'rejected')),
                    
                    -- Validation
                    validateur_id UUID,
                    commentaire TEXT,
                    date_soumission TIMESTAMP,
                    date_validation TIMESTAMP,
                    
                    -- Totaux
                    total_heures DECIMAL(10,2) DEFAULT 0.00,
                    total_heures_chargeables DECIMAL(10,2) DEFAULT 0.00,
                    total_heures_non_chargeables DECIMAL(10,2) DEFAULT 0.00,
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    -- Contraintes de clés étrangères
                    CONSTRAINT fk_time_sheets_collaborateur
                        FOREIGN KEY (collaborateur_id)
                        REFERENCES users(id)
                        ON DELETE CASCADE,
                    
                    CONSTRAINT fk_time_sheets_validateur
                        FOREIGN KEY (validateur_id)
                        REFERENCES users(id)
                        ON DELETE SET NULL,
                    
                    -- Contrainte d'unicité pour éviter les doublons
                    CONSTRAINT unique_time_sheet_week
                        UNIQUE (collaborateur_id, annee, semaine)
                )
            `);
            
            console.log('✅ Table time_sheets créée avec succès');
        } else {
            console.log('✅ Table time_sheets existe déjà');
        }

        // 2. Vérifier la structure de la table
        const columns = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'time_sheets' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Structure de la table time_sheets:');
        columns.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });

        // 3. Vérifier les contraintes
        const constraints = await pool.query(`
            SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints 
            WHERE table_name = 'time_sheets'
        `);
        
        console.log('\n🔒 Contraintes de la table:');
        constraints.rows.forEach(constraint => {
            console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
        });

        // 4. Tester l'insertion d'une feuille de temps
        console.log('\n🧪 Test d\'insertion d\'une feuille de temps...');
        
        const testData = {
            collaborateur_id: '8eb54916-a0b3-4f9e-acd1-75830271feab',
            date_debut_semaine: '2025-08-03',
            date_fin_semaine: '2025-08-09',
            annee: 2025,
            semaine: 32,
            statut: 'draft'
        };

        const insertResult = await pool.query(`
            INSERT INTO time_sheets (
                collaborateur_id, date_debut_semaine, date_fin_semaine, annee, semaine, statut
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, collaborateur_id, statut
        `, [
            testData.collaborateur_id,
            testData.date_debut_semaine,
            testData.date_fin_semaine,
            testData.annee,
            testData.semaine,
            testData.statut
        ]);

        console.log('✅ Insertion réussie:', insertResult.rows[0]);

        // 5. Nettoyer le test
        await pool.query('DELETE FROM time_sheets WHERE id = $1', [insertResult.rows[0].id]);
        console.log('🧹 Test nettoyé');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
    }
}

checkAndFixTimeSheets(); 