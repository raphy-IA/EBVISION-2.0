const { Pool } = require('pg');

// Charger les variables d'environnement
require('dotenv').config();

// Configuration de la base de données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
});

async function checkTimeEntriesDetails() {
    try {
        console.log('🔍 Vérification de la structure et du contenu de la table time_entries...\n');
        console.log('🔧 Tentative de connexion à la base de données...');
        
        // Test de connexion
        const testQuery = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Connexion réussie. Heure actuelle:', testQuery.rows[0].current_time);
        console.log('');

        // 1. Structure de la table
        console.log('📋 STRUCTURE DE LA TABLE time_entries:');
        console.log('=' .repeat(50));
        
        const structureQuery = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' 
            ORDER BY ordinal_position
        `;
        
        const structureResult = await pool.query(structureQuery);
        
        structureResult.rows.forEach(row => {
            console.log(`${row.column_name.padEnd(25)} | ${row.data_type.padEnd(15)} | ${row.is_nullable.padEnd(8)} | ${(row.column_default || 'NULL').padEnd(15)}`);
        });

        // 2. Contraintes de la table
        console.log('\n🔒 CONTRAINTES DE LA TABLE time_entries:');
        console.log('=' .repeat(50));
        
        const constraintsQuery = `
            SELECT 
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints tc
            LEFT JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            LEFT JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'time_entries'
            ORDER BY tc.constraint_type, tc.constraint_name
        `;
        
        const constraintsResult = await pool.query(constraintsQuery);
        
        constraintsResult.rows.forEach(row => {
            if (row.constraint_type === 'FOREIGN KEY') {
                console.log(`${(row.constraint_name || '').padEnd(30)} | ${(row.constraint_type || '').padEnd(15)} | ${(row.column_name || '').padEnd(20)} | ${row.foreign_table_name || ''}.${row.foreign_column_name || ''}`);
            } else {
                console.log(`${(row.constraint_name || '').padEnd(30)} | ${(row.constraint_type || '').padEnd(15)} | ${(row.column_name || '').padEnd(20)}`);
            }
        });

        // 3. Contenu actuel de la table
        console.log('\n📊 CONTENU ACTUEL DE LA TABLE time_entries:');
        console.log('=' .repeat(50));
        
        const contentQuery = `
            SELECT 
                id,
                user_id,
                date_saisie,
                heures,
                mission_id,
                description,
                type_heures,
                statut,
                created_at,
                updated_at
            FROM time_entries 
            ORDER BY created_at DESC 
            LIMIT 20
        `;
        
        const contentResult = await pool.query(contentQuery);
        
        if (contentResult.rows.length === 0) {
            console.log('❌ Aucune entrée trouvée dans la table time_entries');
        } else {
            console.log(`✅ ${contentResult.rows.length} entrées trouvées:`);
            console.log('');
            
            contentResult.rows.forEach((row, index) => {
                console.log(`📝 Entrée ${index + 1}:`);
                console.log(`   ID: ${row.id}`);
                console.log(`   User ID: ${row.user_id}`);
                console.log(`   Date: ${row.date_saisie}`);
                console.log(`   Heures: ${row.heures}`);
                console.log(`   Mission ID: ${row.mission_id || 'NULL'}`);
                console.log(`   Description: ${row.description}`);
                console.log(`   Type heures: ${row.type_heures}`);
                console.log(`   Statut: ${row.statut}`);
                console.log(`   Créé le: ${row.created_at}`);
                console.log(`   Modifié le: ${row.updated_at}`);
                console.log('');
            });
        }

        // 4. Statistiques
        console.log('📈 STATISTIQUES:');
        console.log('=' .repeat(50));
        
        const statsQuery = `
            SELECT 
                COUNT(*) as total_entries,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT date_saisie) as unique_dates,
                SUM(heures) as total_hours,
                AVG(heures) as avg_hours,
                MIN(date_saisie) as earliest_date,
                MAX(date_saisie) as latest_date
            FROM time_entries
        `;
        
        const statsResult = await pool.query(statsQuery);
        const stats = statsResult.rows[0];
        
        console.log(`Total d'entrées: ${stats.total_entries}`);
        console.log(`Utilisateurs uniques: ${stats.unique_users}`);
        console.log(`Dates uniques: ${stats.unique_dates}`);
        console.log(`Total d'heures: ${stats.total_hours || 0}`);
        console.log(`Moyenne d'heures: ${parseFloat(stats.avg_hours || 0).toFixed(2)}`);
        console.log(`Date la plus ancienne: ${stats.earliest_date || 'Aucune'}`);
        console.log(`Date la plus récente: ${stats.latest_date || 'Aucune'}`);

        // 5. Entrées pour l'utilisateur de test spécifique
        console.log('\n👤 ENTREES POUR L\'UTILISATEUR DE TEST:');
        console.log('=' .repeat(50));
        
        const testUserQuery = `
            SELECT 
                id,
                date_saisie,
                heures,
                description,
                type_heures,
                statut,
                created_at
            FROM time_entries 
            WHERE user_id = 'f6a6567f-b51d-4dbc-872d-1005156bd187'
            ORDER BY date_saisie DESC, created_at DESC
        `;
        
        const testUserResult = await pool.query(testUserQuery);
        
        if (testUserResult.rows.length === 0) {
            console.log('❌ Aucune entrée trouvée pour l\'utilisateur de test');
        } else {
            console.log(`✅ ${testUserResult.rows.length} entrées pour l'utilisateur de test:`);
            console.log('');
            
            testUserResult.rows.forEach((row, index) => {
                console.log(`📝 Entrée ${index + 1}:`);
                console.log(`   ID: ${row.id}`);
                console.log(`   Date: ${row.date_saisie}`);
                console.log(`   Heures: ${row.heures}`);
                console.log(`   Description: ${row.description}`);
                console.log(`   Type: ${row.type_heures}`);
                console.log(`   Statut: ${row.statut}`);
                console.log(`   Créé le: ${row.created_at}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        await pool.end();
    }
}

checkTimeEntriesDetails(); 