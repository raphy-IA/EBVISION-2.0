const { pool } = require('../src/utils/database');

async function fixOpportunitiesData() {
    try {
        console.log('🔧 Diagnostic et correction des données d\'opportunités...\n');
        
        // 1. Vérifier si la table opportunity_types existe
        console.log('1. Vérification de la table opportunity_types...');
        const opportunityTypesExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'opportunity_types'
            );
        `);
        
        if (!opportunityTypesExists.rows[0].exists) {
            console.log('❌ Table opportunity_types n\'existe pas. Création...');
            await createOpportunityTypesTable();
        } else {
            console.log('✅ Table opportunity_types existe');
        }
        
        // 2. Vérifier la structure de la table opportunity_types
        console.log('\n2. Vérification de la structure opportunity_types...');
        const opportunityTypesStructure = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'opportunity_types'
            ORDER BY ordinal_position;
        `);
        
        console.log('Structure actuelle:');
        opportunityTypesStructure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
        
        // 3. Vérifier si des données existent
        console.log('\n3. Vérification des données...');
        const opportunityTypesCount = await pool.query('SELECT COUNT(*) FROM opportunity_types');
        console.log(`Nombre de types d'opportunités: ${opportunityTypesCount.rows[0].count}`);
        
        if (parseInt(opportunityTypesCount.rows[0].count) === 0) {
            console.log('❌ Aucune donnée. Insertion des données de base...');
            await insertBaseOpportunityTypes();
        }
        
        // 4. Vérifier la table clients
        console.log('\n4. Vérification de la table clients...');
        const clientsExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'clients'
            );
        `);
        
        if (!clientsExists.rows[0].exists) {
            console.log('❌ Table clients n\'existe pas');
        } else {
            const clientsCount = await pool.query('SELECT COUNT(*) FROM clients');
            console.log(`Nombre de clients: ${clientsCount.rows[0].count}`);
        }
        
        // 5. Vérifier la table opportunities
        console.log('\n5. Vérification de la table opportunities...');
        const opportunitiesExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'opportunities'
            );
        `);
        
        if (!opportunitiesExists.rows[0].exists) {
            console.log('❌ Table opportunities n\'existe pas. Création...');
            await createOpportunitiesTable();
        } else {
            console.log('✅ Table opportunities existe');
            const opportunitiesCount = await pool.query('SELECT COUNT(*) FROM opportunities');
            console.log(`Nombre d'opportunités: ${opportunitiesCount.rows[0].count}`);
        }
        
        // 6. Tester les requêtes API
        console.log('\n6. Test des requêtes API...');
        await testAPIQueries();
        
        console.log('\n✅ Diagnostic terminé');
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    } finally {
        await pool.end();
    }
}

async function createOpportunityTypesTable() {
    const createTableSQL = `
        CREATE TABLE opportunity_types (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL UNIQUE,
            nom VARCHAR(100),
            code VARCHAR(50),
            description TEXT,
            couleur VARCHAR(20),
            default_probability INTEGER DEFAULT 50,
            default_duration_days INTEGER DEFAULT 30,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    await pool.query(createTableSQL);
    console.log('✅ Table opportunity_types créée');
}

async function insertBaseOpportunityTypes() {
    const insertSQL = `
        INSERT INTO opportunity_types (name, nom, code, description, default_probability, default_duration_days) VALUES
        ('Audit', 'Audit', 'AUDIT', 'Mission d''audit comptable et financier', 80, 45),
        ('Conseil', 'Conseil', 'CONSEIL', 'Mission de conseil en gestion', 70, 30),
        ('Formation', 'Formation', 'FORMATION', 'Formation professionnelle', 90, 15),
        ('Expertise', 'Expertise', 'EXPERTISE', 'Expertise comptable et fiscale', 75, 25),
        ('Consulting', 'Consulting', 'CONSULTING', 'Consulting en organisation', 65, 40)
        ON CONFLICT (name) DO NOTHING;
    `;
    
    await pool.query(insertSQL);
    console.log('✅ Données de base insérées');
}

async function createOpportunitiesTable() {
    const createTableSQL = `
        CREATE TABLE opportunities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nom VARCHAR(255) NOT NULL,
            description TEXT,
            client_id UUID,
            collaborateur_id UUID,
            business_unit_id UUID,
            opportunity_type_id UUID,
            statut VARCHAR(50) NOT NULL DEFAULT 'NOUVELLE',
            source VARCHAR(100),
            probabilite INTEGER DEFAULT 0,
            montant_estime DECIMAL(15,2),
            devise VARCHAR(5) DEFAULT 'EUR',
            date_fermeture_prevue DATE,
            date_fermeture_reelle DATE,
            notes TEXT,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_by UUID,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    await pool.query(createTableSQL);
    console.log('✅ Table opportunities créée');
}

async function testAPIQueries() {
    try {
        // Test des types d'opportunités
        console.log('  - Test des types d\'opportunités...');
        const opportunityTypes = await pool.query(`
            SELECT id, name, nom, code, description 
            FROM opportunity_types 
            WHERE is_active = true 
            ORDER BY name ASC
        `);
        console.log(`    ${opportunityTypes.rows.length} types trouvés`);
        
        // Test des clients
        console.log('  - Test des clients...');
        const clients = await pool.query(`
            SELECT id, nom, raison_sociale, email 
            FROM clients 
            ORDER BY nom ASC
        `);
        console.log(`    ${clients.rows.length} clients trouvés`);
        
        // Test des business units
        console.log('  - Test des business units...');
        const businessUnits = await pool.query(`
            SELECT id, nom 
            FROM business_units 
            ORDER BY nom ASC
        `);
        console.log(`    ${businessUnits.rows.length} business units trouvées`);
        
        // Test des collaborateurs
        console.log('  - Test des collaborateurs...');
        const collaborateurs = await pool.query(`
            SELECT id, nom, prenom, email 
            FROM collaborateurs 
            WHERE statut = 'ACTIF'
            ORDER BY nom ASC
        `);
        console.log(`    ${collaborateurs.rows.length} collaborateurs trouvés`);
        
    } catch (error) {
        console.error('  ❌ Erreur lors des tests:', error.message);
    }
}

// Exécuter le script
fixOpportunitiesData().catch(console.error); 