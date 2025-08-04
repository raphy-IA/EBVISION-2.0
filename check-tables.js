const { pool } = require('./src/utils/database');

async function checkTables() {
    try {
        console.log('🔍 Vérification des tables opportunities...\n');
        
        // 1. Vérifier si la table opportunities existe
        console.log('1️⃣ Table opportunities:');
        const opportunitiesResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM information_schema.tables 
            WHERE table_name = 'opportunities'
        `);
        
        if (opportunitiesResult.rows[0].count > 0) {
            console.log('✅ Table opportunities existe');
            
            const opportunitiesData = await pool.query(`
                SELECT COUNT(*) as count
                FROM opportunities
            `);
            console.log(`   - ${opportunitiesData.rows[0].count} enregistrements`);
        } else {
            console.log('❌ Table opportunities n\'existe pas');
        }
        
        // 2. Vérifier si la table opportunites existe
        console.log('\n2️⃣ Table opportunites:');
        const opportunitesResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM information_schema.tables 
            WHERE table_name = 'opportunites'
        `);
        
        if (opportunitesResult.rows[0].count > 0) {
            console.log('✅ Table opportunites existe');
            
            const opportunitesData = await pool.query(`
                SELECT COUNT(*) as count
                FROM opportunites
            `);
            console.log(`   - ${opportunitesData.rows[0].count} enregistrements`);
        } else {
            console.log('❌ Table opportunites n\'existe pas');
        }
        
        // 3. Vérifier la contrainte de clé étrangère
        console.log('\n3️⃣ Contrainte de clé étrangère missions_opportunity_id_fkey:');
        const constraintResult = await pool.query(`
            SELECT 
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.constraint_name = 'missions_opportunity_id_fkey'
        `);
        
        if (constraintResult.rows.length > 0) {
            console.log('✅ Contrainte trouvée:', constraintResult.rows[0]);
        } else {
            console.log('❌ Contrainte non trouvée');
        }
        
        // 4. Vérifier les données dans les deux tables
        if (opportunitiesResult.rows[0].count > 0) {
            console.log('\n4️⃣ Données dans opportunities:');
            const opportunitiesData = await pool.query(`
                SELECT id, nom, statut
                FROM opportunities 
                ORDER BY created_at DESC
                LIMIT 3
            `);
            
            opportunitiesData.rows.forEach((opp, index) => {
                console.log(`  ${index + 1}. ID: ${opp.id}`);
                console.log(`     Nom: ${opp.nom}`);
                console.log(`     Statut: ${opp.statut}`);
                console.log('');
            });
        }
        
        if (opportunitesResult.rows[0].count > 0) {
            console.log('5️⃣ Données dans opportunites:');
            const opportunitesData = await pool.query(`
                SELECT id, titre, statut
                FROM opportunites 
                ORDER BY date_creation DESC
                LIMIT 3
            `);
            
            opportunitesData.rows.forEach((opp, index) => {
                console.log(`  ${index + 1}. ID: ${opp.id}`);
                console.log(`     Titre: ${opp.titre}`);
                console.log(`     Statut: ${opp.statut}`);
                console.log('');
            });
        }
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

checkTables(); 