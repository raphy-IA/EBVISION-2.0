const { pool } = require('../src/utils/database');

async function executeRefactorStepByStep() {
    try {
        console.log('🔄 Exécution de la refactorisation étape par étape...\n');

        // Étape 1: Renommer la table divisions en business_units
        console.log('📝 Étape 1: Renommer divisions en business_units...');
        await pool.query('ALTER TABLE divisions RENAME TO business_units');
        console.log('✅ Table divisions renommée en business_units');

        // Étape 2: Créer la nouvelle table divisions
        console.log('\n📝 Étape 2: Créer la nouvelle table divisions...');
        const createDivisionsSQL = `
            CREATE TABLE divisions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                nom VARCHAR(100) NOT NULL,
                code VARCHAR(10) NOT NULL UNIQUE,
                description TEXT,
                business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
                statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await pool.query(createDivisionsSQL);
        console.log('✅ Nouvelle table divisions créée');

        // Étape 3: Créer les index pour divisions
        console.log('\n📝 Étape 3: Créer les index pour divisions...');
        await pool.query('CREATE INDEX idx_divisions_code ON divisions(code)');
        await pool.query('CREATE INDEX idx_divisions_statut ON divisions(statut)');
        await pool.query('CREATE INDEX idx_divisions_business_unit_id ON divisions(business_unit_id)');
        console.log('✅ Index pour divisions créés');

        // Étape 4: Créer les triggers pour divisions
        console.log('\n📝 Étape 4: Créer les triggers pour divisions...');
        await pool.query('CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON divisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()');
        console.log('✅ Trigger pour divisions créé');

        // Étape 5: Créer les index pour business_units
        console.log('\n📝 Étape 5: Créer les index pour business_units...');
        await pool.query('CREATE INDEX idx_business_units_code ON business_units(code)');
        await pool.query('CREATE INDEX idx_business_units_statut ON business_units(statut)');
        console.log('✅ Index pour business_units créés');

        // Étape 6: Créer les triggers pour business_units
        console.log('\n📝 Étape 6: Créer les triggers pour business_units...');
        await pool.query('CREATE TRIGGER update_business_units_updated_at BEFORE UPDATE ON business_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()');
        console.log('✅ Trigger pour business_units créé');

        // Étape 7: Ajouter la colonne description à business_units si elle n'existe pas
        console.log('\n📝 Étape 7: Ajouter la colonne description à business_units...');
        try {
            await pool.query('ALTER TABLE business_units ADD COLUMN description TEXT');
            console.log('✅ Colonne description ajoutée à business_units');
        } catch (error) {
            if (error.code === '42701') { // colonne déjà existe
                console.log('ℹ️ Colonne description existe déjà dans business_units');
            } else {
                throw error;
            }
        }

        // Vérification finale
        console.log('\n🔍 Vérification finale...');
        
        const businessUnitsCount = await pool.query('SELECT COUNT(*) as count FROM business_units');
        const divisionsCount = await pool.query('SELECT COUNT(*) as count FROM divisions');
        
        console.log(`📊 Nombre de business units: ${businessUnitsCount.rows[0].count}`);
        console.log(`📊 Nombre de divisions: ${divisionsCount.rows[0].count}`);

        // Vérifier la structure des tables
        const businessUnitsStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'business_units' 
            ORDER BY ordinal_position
        `);

        console.log('\n📋 Structure finale de business_units:');
        businessUnitsStructure.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        const divisionsStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'divisions' 
            ORDER BY ordinal_position
        `);

        console.log('\n📋 Structure finale de divisions:');
        divisionsStructure.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        console.log('\n🎉 Refactorisation terminée avec succès !');

    } catch (error) {
        console.error('❌ Erreur lors de la refactorisation:', error);
        console.error('Détails:', error.message);
    } finally {
        await pool.end();
    }
}

executeRefactorStepByStep(); 