const { pool } = require('./src/utils/database');

async function checkDashboardData() {
    console.log('🔍 Vérification des données du dashboard...\n');

    const client = await pool.connect();
    
    try {
        // 1. Vérifier les tables principales
        console.log('1️⃣ Vérification des tables principales...');
        
        const tables = [
            'time_entries',
            'collaborateurs', 
            'business_units',
            'divisions',
            'missions',
            'users'
        ];

        for (const table of tables) {
            const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`   📊 ${table}: ${result.rows[0].count} enregistrements`);
        }

        // 2. Vérifier la structure de time_entries
        console.log('\n2️⃣ Structure de la table time_entries...');
        const timeEntriesStructure = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'time_entries'
            ORDER BY ordinal_position
        `);
        
        console.log('   Colonnes time_entries:');
        timeEntriesStructure.rows.forEach(col => {
            console.log(`     - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // 3. Vérifier quelques données de test
        console.log('\n3️⃣ Données de test...');
        
        // Time entries
        const timeEntries = await client.query('SELECT * FROM time_entries LIMIT 3');
        console.log(`   📝 Time entries (${timeEntries.rows.length}):`);
        timeEntries.rows.forEach(entry => {
            console.log(`     - ID: ${entry.id}, Heures: ${entry.heures}, Status: ${entry.status}, Date: ${entry.date_saisie}`);
        });

        // Collaborateurs
        const collaborateurs = await client.query('SELECT * FROM collaborateurs LIMIT 3');
        console.log(`   👥 Collaborateurs (${collaborateurs.rows.length}):`);
        collaborateurs.rows.forEach(collab => {
            console.log(`     - ${collab.prenom} ${collab.nom} (ID: ${collab.id})`);
        });

        // Business Units
        const businessUnits = await client.query('SELECT * FROM business_units LIMIT 3');
        console.log(`   🏢 Business Units (${businessUnits.rows.length}):`);
        businessUnits.rows.forEach(bu => {
            console.log(`     - ${bu.nom} (ID: ${bu.id})`);
        });

        // 4. Tester la requête du dashboard
        console.log('\n4️⃣ Test de la requête dashboard...');
        try {
            const dashboardQuery = `
                SELECT 
                    SUM(te.heures) as total_heures,
                    SUM(CASE WHEN te.status = 'saved' THEN te.heures ELSE 0 END) as heures_validees,
                    SUM(CASE WHEN te.status = 'submitted' THEN te.heures ELSE 0 END) as heures_soumises,
                    COUNT(DISTINCT te.user_id) as collaborateurs_actifs
                FROM time_entries te
                WHERE te.date_saisie >= CURRENT_DATE - INTERVAL '30 days'
            `;
            
            const dashboardResult = await client.query(dashboardQuery);
            console.log('   ✅ Requête dashboard exécutée avec succès');
            console.log('   📊 Résultats:', dashboardResult.rows[0]);
            
        } catch (error) {
            console.log('   ❌ Erreur requête dashboard:', error.message);
        }

        // 5. Vérifier les relations
        console.log('\n5️⃣ Vérification des relations...');
        
        const relations = await client.query(`
            SELECT 
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name IN ('time_entries', 'collaborateurs', 'divisions')
        `);
        
        console.log('   🔗 Relations trouvées:');
        relations.rows.forEach(rel => {
            console.log(`     - ${rel.table_name}.${rel.column_name} → ${rel.foreign_table_name}.${rel.foreign_column_name}`);
        });

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkDashboardData();


