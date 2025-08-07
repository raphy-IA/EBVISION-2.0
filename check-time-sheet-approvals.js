const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'trs_dashboard',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function checkTimeSheetApprovals() {
    console.log('🔍 Diagnostic du système de validation des feuilles de temps...\n');
    
    const client = await pool.connect();
    
    try {
        // 1. Vérifier la structure des tables
        console.log('📋 1. Vérification de la structure des tables...');
        
        const tables = [
            'time_sheets',
            'time_sheet_supervisors', 
            'time_sheet_approvals',
            'users',
            'collaborateurs'
        ];
        
        for (const table of tables) {
            try {
                const result = await client.query(`
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [table]);
                
                console.log(`\n✅ Table ${table}:`);
                result.rows.forEach(row => {
                    console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
                });
            } catch (error) {
                console.log(`❌ Table ${table}: ${error.message}`);
            }
        }
        
        // 2. Vérifier les données existantes
        console.log('\n📊 2. Vérification des données existantes...');
        
        // Compter les feuilles de temps par statut
        const timeSheetsStats = await client.query(`
            SELECT status, COUNT(*) as count 
            FROM time_sheets 
            GROUP BY status
        `);
        
        console.log('\n📋 Feuilles de temps par statut:');
        timeSheetsStats.rows.forEach(row => {
            console.log(`   - ${row.status || 'NULL'}: ${row.count}`);
        });
        
        // Compter les relations superviseur
        const supervisorStats = await client.query(`
            SELECT COUNT(*) as count 
            FROM time_sheet_supervisors
        `);
        
        console.log(`\n👥 Relations superviseur: ${supervisorStats.rows[0].count}`);
        
        // Compter les approbations
        const approvalStats = await client.query(`
            SELECT action, COUNT(*) as count 
            FROM time_sheet_approvals 
            GROUP BY action
        `);
        
        console.log('\n✅ Approbations par type:');
        approvalStats.rows.forEach(row => {
            console.log(`   - ${row.action}: ${row.count}`);
        });
        
        // 3. Vérifier les utilisateurs et collaborateurs
        console.log('\n👤 3. Vérification des utilisateurs et collaborateurs...');
        
        const usersStats = await client.query(`
            SELECT COUNT(*) as total_users FROM users
        `);
        
        const collaborateursStats = await client.query(`
            SELECT COUNT(*) as total_collaborateurs FROM collaborateurs
        `);
        
        console.log(`   - Utilisateurs: ${usersStats.rows[0].total_users}`);
        console.log(`   - Collaborateurs: ${collaborateursStats.rows[0].total_collaborateurs}`);
        
        // 4. Vérifier les relations superviseur détaillées
        console.log('\n🔗 4. Vérification des relations superviseur...');
        
        const supervisorRelations = await client.query(`
            SELECT 
                c1.prenom || ' ' || c1.nom as collaborateur,
                c2.prenom || ' ' || c2.nom as superviseur,
                tss.created_at
            FROM time_sheet_supervisors tss
            JOIN collaborateurs c1 ON tss.collaborateur_id = c1.id
            JOIN collaborateurs c2 ON tss.supervisor_id = c2.id
            ORDER BY tss.created_at DESC
        `);
        
        if (supervisorRelations.rows.length > 0) {
            console.log('\n📋 Relations superviseur existantes:');
            supervisorRelations.rows.forEach(row => {
                console.log(`   - ${row.collaborateur} → ${row.superviseur} (${row.created_at})`);
            });
        } else {
            console.log('   ⚠️ Aucune relation superviseur configurée');
        }
        
        // 5. Vérifier les feuilles de temps soumises
        console.log('\n📄 5. Vérification des feuilles de temps soumises...');
        
        const submittedTimeSheets = await client.query(`
            SELECT 
                ts.id,
                ts.week_start,
                ts.week_end,
                ts.status,
                u.prenom || ' ' || u.nom as collaborateur,
                ts.created_at
            FROM time_sheets ts
            JOIN users u ON ts.user_id = u.id
            WHERE ts.status IN ('submitted', 'approved', 'rejected')
            ORDER BY ts.created_at DESC
        `);
        
        if (submittedTimeSheets.rows.length > 0) {
            console.log('\n📋 Feuilles de temps soumises:');
            submittedTimeSheets.rows.forEach(row => {
                console.log(`   - ${row.collaborateur}: ${row.week_start} à ${row.week_end} (${row.status})`);
            });
        } else {
            console.log('   ⚠️ Aucune feuille de temps soumise');
        }
        
        // 6. Vérifier les approbations détaillées
        console.log('\n✅ 6. Vérification des approbations...');
        
        const approvals = await client.query(`
            SELECT 
                tsa.action,
                tsa.comment,
                c.prenom || ' ' || c.nom as superviseur,
                ts.week_start,
                tsa.created_at
            FROM time_sheet_approvals tsa
            JOIN collaborateurs c ON tsa.supervisor_id = c.id
            JOIN time_sheets ts ON tsa.time_sheet_id = ts.id
            ORDER BY tsa.created_at DESC
        `);
        
        if (approvals.rows.length > 0) {
            console.log('\n📋 Approbations existantes:');
            approvals.rows.forEach(row => {
                console.log(`   - ${row.superviseur} ${row.action} la semaine ${row.week_start} (${row.created_at})`);
                if (row.comment) {
                    console.log(`     Commentaire: "${row.comment}"`);
                }
            });
        } else {
            console.log('   ⚠️ Aucune approbation enregistrée');
        }
        
        // 7. Vérifier les problèmes potentiels
        console.log('\n⚠️ 7. Vérification des problèmes potentiels...');
        
        // Feuilles soumises sans superviseur
        const sheetsWithoutSupervisor = await client.query(`
            SELECT 
                ts.id,
                u.prenom || ' ' || u.nom as collaborateur,
                ts.week_start
            FROM time_sheets ts
            JOIN users u ON ts.user_id = u.id
            JOIN collaborateurs c ON u.id = c.user_id
            WHERE ts.status = 'submitted'
            AND NOT EXISTS (
                SELECT 1 FROM time_sheet_supervisors tss 
                WHERE tss.collaborateur_id = c.id
            )
        `);
        
        if (sheetsWithoutSupervisor.rows.length > 0) {
            console.log('\n❌ Feuilles soumises sans superviseur configuré:');
            sheetsWithoutSupervisor.rows.forEach(row => {
                console.log(`   - ${row.collaborateur}: semaine ${row.week_start}`);
            });
        } else {
            console.log('   ✅ Toutes les feuilles soumises ont des superviseurs');
        }
        
        // Relations superviseur invalides
        const invalidSupervisorRelations = await client.query(`
            SELECT 
                c1.prenom || ' ' || c1.nom as collaborateur,
                c2.prenom || ' ' || c2.nom as superviseur
            FROM time_sheet_supervisors tss
            JOIN collaborateurs c1 ON tss.collaborateur_id = c1.id
            JOIN collaborateurs c2 ON tss.supervisor_id = c2.id
            WHERE c1.id = c2.id
        `);
        
        if (invalidSupervisorRelations.rows.length > 0) {
            console.log('\n❌ Relations superviseur invalides (auto-supervision):');
            invalidSupervisorRelations.rows.forEach(row => {
                console.log(`   - ${row.collaborateur} supervise lui-même`);
            });
        } else {
            console.log('   ✅ Aucune relation superviseur invalide');
        }
        
        // 8. Recommandations
        console.log('\n💡 8. Recommandations...');
        
        if (supervisorStats.rows[0].count === 0) {
            console.log('   🔧 Configurer au moins une relation superviseur');
        }
        
        if (timeSheetsStats.rows.find(r => r.status === 'draft')?.count > 0) {
            console.log('   📝 Des feuilles de temps sont en brouillon (draft)');
        }
        
        if (submittedTimeSheets.rows.length === 0) {
            console.log('   📤 Aucune feuille de temps soumise pour validation');
        }
        
        console.log('\n✅ Diagnostic terminé');
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le diagnostic
checkTimeSheetApprovals().catch(console.error);
