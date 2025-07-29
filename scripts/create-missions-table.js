const { pool } = require('../src/utils/database');

async function createMissionsTable() {
    try {
        console.log('🚀 Création de la table missions...\n');
        
        // Étape 1: Vérifier si la table existe déjà
        console.log('1. Vérification de l\'existence de la table...');
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'missions'
            );
        `);
        
        if (tableExists.rows[0].exists) {
            console.log('⚠️ La table missions existe déjà');
            console.log('2. Suppression de la table existante...');
            await pool.query('DROP TABLE IF EXISTS missions CASCADE;');
            console.log('✅ Table existante supprimée');
        }
        
        // Étape 2: Créer la nouvelle table
        console.log('3. Création de la nouvelle table missions...');
        await pool.query(`
            CREATE TABLE missions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nom VARCHAR(255) NOT NULL,
                description TEXT,
                client_id UUID,
                collaborateur_id UUID,
                statut VARCHAR(50) NOT NULL DEFAULT 'PLANIFIEE',
                type_mission VARCHAR(100),
                priorite VARCHAR(20) DEFAULT 'MOYENNE',
                date_debut DATE,
                date_fin DATE,
                date_debut_reelle DATE,
                date_fin_reelle DATE,
                budget_estime DECIMAL(15,2),
                budget_reel DECIMAL(15,2),
                devise VARCHAR(5) DEFAULT 'FCFA',
                notes TEXT,
                created_by UUID,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_by UUID,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Table missions créée');
        
        // Étape 3: Ajouter les contraintes CHECK
        console.log('4. Ajout des contraintes CHECK...');
        await pool.query(`
            ALTER TABLE missions 
            ADD CONSTRAINT check_statut 
            CHECK (statut IN ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE', 'SUSPENDUE'));
        `);
        
        await pool.query(`
            ALTER TABLE missions 
            ADD CONSTRAINT check_priorite 
            CHECK (priorite IN ('BASSE', 'MOYENNE', 'HAUTE', 'URGENTE'));
        `);
        console.log('✅ Contraintes CHECK ajoutées');
        
        // Étape 4: Créer les index
        console.log('5. Création des index...');
        await pool.query('CREATE INDEX idx_missions_client_id ON missions(client_id);');
        await pool.query('CREATE INDEX idx_missions_collaborateur_id ON missions(collaborateur_id);');
        await pool.query('CREATE INDEX idx_missions_statut ON missions(statut);');
        await pool.query('CREATE INDEX idx_missions_priorite ON missions(priorite);');
        await pool.query('CREATE INDEX idx_missions_date_debut ON missions(date_debut);');
        await pool.query('CREATE INDEX idx_missions_date_fin ON missions(date_fin);');
        await pool.query('CREATE INDEX idx_missions_created_at ON missions(created_at);');
        console.log('✅ Index créés');
        
        // Étape 5: Créer le trigger
        console.log('6. Création du trigger...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_missions_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);
        
        await pool.query(`
            CREATE TRIGGER update_missions_updated_at
                BEFORE UPDATE ON missions
                FOR EACH ROW
                EXECUTE FUNCTION update_missions_updated_at();
        `);
        console.log('✅ Trigger créé');
        
        // Étape 6: Ajouter des données de test
        console.log('7. Ajout de données de test...');
        await pool.query(`
            INSERT INTO missions (
                nom, description, statut, type_mission, priorite, 
                date_debut, date_fin, budget_estime, devise, notes
            ) VALUES 
            ('Mission Test 1', 'Description de la mission test 1', 'PLANIFIEE', 'CONSULTING', 'MOYENNE', '2025-01-15', '2025-03-15', 25000.00, 'FCFA', 'Note de test 1'),
            ('Mission Test 2', 'Description de la mission test 2', 'EN_COURS', 'DEVELOPPEMENT', 'HAUTE', '2025-02-01', '2025-04-30', 45000.00, 'FCFA', 'Note de test 2'),
            ('Mission Test 3', 'Description de la mission test 3', 'TERMINEE', 'FORMATION', 'BASSE', '2025-01-01', '2025-01-31', 15000.00, 'FCFA', 'Note de test 3');
        `);
        console.log('✅ Données de test ajoutées');
        
        console.log('\n🎉 Table missions créée avec succès !');
        
        // Étape 7: Vérifier la structure
        console.log('\n8. Vérification de la structure:');
        const structure = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'missions'
            ORDER BY ordinal_position;
        `);
        
        structure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'}`);
        });
        
        const count = await pool.query('SELECT COUNT(*) as total FROM missions;');
        console.log(`\n📊 Nombre de missions: ${count.rows[0].total}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la création:', error);
    } finally {
        await pool.end();
    }
}

createMissionsTable(); 