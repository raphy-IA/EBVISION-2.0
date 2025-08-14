const { pool } = require('./src/utils/database');

async function checkCollaborateursStructure() {
    console.log('🔍 Vérification de la structure collaborateurs...\n');

    const client = await pool.connect();
    
    try {
        // 1. Structure de la table collaborateurs
        console.log('1️⃣ Structure de la table collaborateurs...');
        const structure = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'collaborateurs'
            ORDER BY ordinal_position
        `);
        
        console.log('   Colonnes collaborateurs:');
        structure.rows.forEach(col => {
            console.log(`     - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // 2. Vérifier si taux_horaire existe
        console.log('\n2️⃣ Recherche de taux_horaire...');
        const tauxHoraireExists = structure.rows.some(col => col.column_name === 'taux_horaire');
        console.log(`   taux_horaire existe: ${tauxHoraireExists ? '✅ OUI' : '❌ NON'}`);

        // 3. Vérifier les colonnes liées aux taux
        console.log('\n3️⃣ Colonnes liées aux taux...');
        const tauxColumns = structure.rows.filter(col => 
            col.column_name.includes('taux') || 
            col.column_name.includes('horaire') ||
            col.column_name.includes('salaire')
        );
        
        if (tauxColumns.length > 0) {
            console.log('   Colonnes trouvées:');
            tauxColumns.forEach(col => {
                console.log(`     - ${col.column_name}: ${col.data_type}`);
            });
        } else {
            console.log('   ❌ Aucune colonne de taux trouvée');
        }

        // 4. Vérifier la table grades
        console.log('\n4️⃣ Vérification de la table grades...');
        const gradesStructure = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'grades'
            ORDER BY ordinal_position
        `);
        
        console.log('   Colonnes grades:');
        gradesStructure.rows.forEach(col => {
            console.log(`     - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // 5. Tester une requête corrigée
        console.log('\n5️⃣ Test de requête corrigée...');
        try {
            const correctedQuery = `
                SELECT 
                    SUM(te.heures) as total_heures,
                    SUM(CASE WHEN te.status = 'saved' THEN te.heures ELSE 0 END) as heures_validees,
                    SUM(CASE WHEN te.status = 'submitted' THEN te.heures ELSE 0 END) as heures_soumises,
                    COUNT(DISTINCT te.user_id) as collaborateurs_actifs,
                    SUM(COALESCE(te.heures * COALESCE(g.taux_horaire, 0), 0)) as cout_total
                FROM time_entries te
                LEFT JOIN users u ON te.user_id = u.id
                LEFT JOIN collaborateurs c ON u.collaborateur_id = c.id
                LEFT JOIN grades g ON c.grade_actuel_id = g.id
                WHERE te.date_saisie >= CURRENT_DATE - INTERVAL '30 days'
            `;
            
            const result = await client.query(correctedQuery);
            console.log('   ✅ Requête corrigée exécutée avec succès');
            console.log('   📊 Résultats:', result.rows[0]);
            
        } catch (error) {
            console.log('   ❌ Erreur requête corrigée:', error.message);
        }

        // 6. Vérifier les données de test
        console.log('\n6️⃣ Données de test...');
        const testData = await client.query(`
            SELECT 
                c.id,
                c.nom,
                c.prenom,
                g.nom as grade_nom,
                g.taux_horaire,
                u.email
            FROM collaborateurs c
            LEFT JOIN grades g ON c.grade_actuel_id = g.id
            LEFT JOIN users u ON c.user_id = u.id
            LIMIT 3
        `);
        
        console.log('   Données collaborateurs avec grades:');
        testData.rows.forEach(row => {
            console.log(`     - ${row.prenom} ${row.nom} (Grade: ${row.grade_nom}, Taux: ${row.taux_horaire})`);
        });

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkCollaborateursStructure(); 