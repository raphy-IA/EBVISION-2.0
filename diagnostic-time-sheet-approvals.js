require('dotenv').config();
const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function diagnosticTimeSheetApprovals() {
    console.log('🔍 Diagnostic du système de validation des feuilles de temps...\n');
    
    const client = await pool.connect();
    
    try {
        // 1. Vérifier les tables existantes
        console.log('📋 1. Vérification des tables...');
        
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('time_sheets', 'time_sheet_supervisors', 'time_sheet_approvals', 'users', 'collaborateurs')
            ORDER BY table_name
        `);
        
        console.log('✅ Tables trouvées:');
        tables.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
        // 2. Vérifier les données de base
        console.log('\n📊 2. Statistiques des données...');
        
        // Feuilles de temps
        const timeSheetsCount = await client.query('SELECT COUNT(*) as count FROM time_sheets');
        console.log(`   - Feuilles de temps: ${timeSheetsCount.rows[0].count}`);
        
        // Relations superviseur
        const supervisorCount = await client.query('SELECT COUNT(*) as count FROM time_sheet_supervisors');
        console.log(`   - Relations superviseur: ${supervisorCount.rows[0].count}`);
        
        // Approbations
        const approvalCount = await client.query('SELECT COUNT(*) as count FROM time_sheet_approvals');
        console.log(`   - Approbations: ${approvalCount.rows[0].count}`);
        
        // 3. Vérifier les statuts des feuilles de temps
        console.log('\n📄 3. Statuts des feuilles de temps...');
        
        const statusStats = await client.query(`
            SELECT status, COUNT(*) as count 
            FROM time_sheets 
            GROUP BY status
        `);
        
        statusStats.rows.forEach(row => {
            console.log(`   - ${row.status || 'NULL'}: ${row.count}`);
        });
        
        // 4. Vérifier les relations superviseur
        console.log('\n👥 4. Relations superviseur...');
        
        const supervisorRelations = await client.query(`
            SELECT 
                c1.prenom || ' ' || c1.nom as collaborateur,
                c2.prenom || ' ' || c2.nom as superviseur
            FROM time_sheet_supervisors tss
            JOIN collaborateurs c1 ON tss.collaborateur_id = c1.id
            JOIN collaborateurs c2 ON tss.supervisor_id = c2.id
        `);
        
        if (supervisorRelations.rows.length > 0) {
            console.log('✅ Relations configurées:');
            supervisorRelations.rows.forEach(row => {
                console.log(`   - ${row.collaborateur} → ${row.superviseur}`);
            });
        } else {
            console.log('⚠️ Aucune relation superviseur configurée');
        }
        
        // 5. Vérifier les feuilles soumises
        console.log('\n📤 5. Feuilles de temps soumises...');
        
        const submittedSheets = await client.query(`
            SELECT 
                ts.id,
                u.prenom || ' ' || u.nom as collaborateur,
                ts.week_start,
                ts.status
            FROM time_sheets ts
            JOIN users u ON ts.user_id = u.id
            WHERE ts.status IN ('submitted', 'approved', 'rejected')
            ORDER BY ts.created_at DESC
        `);
        
        if (submittedSheets.rows.length > 0) {
            console.log('✅ Feuilles soumises:');
            submittedSheets.rows.forEach(row => {
                console.log(`   - ${row.collaborateur}: ${row.week_start} (${row.status})`);
            });
        } else {
            console.log('⚠️ Aucune feuille de temps soumise');
        }
        
        // 6. Vérifier les approbations
        console.log('\n✅ 6. Approbations enregistrées...');
        
        const approvals = await client.query(`
            SELECT 
                tsa.action,
                c.prenom || ' ' || c.nom as superviseur,
                ts.week_start
            FROM time_sheet_approvals tsa
            JOIN collaborateurs c ON tsa.supervisor_id = c.id
            JOIN time_sheets ts ON tsa.time_sheet_id = ts.id
            ORDER BY tsa.created_at DESC
        `);
        
        if (approvals.rows.length > 0) {
            console.log('✅ Approbations:');
            approvals.rows.forEach(row => {
                console.log(`   - ${row.superviseur} ${row.action} la semaine ${row.week_start}`);
            });
        } else {
            console.log('⚠️ Aucune approbation enregistrée');
        }
        
        // 7. Problèmes potentiels
        console.log('\n⚠️ 7. Problèmes potentiels...');
        
        // Feuilles soumises sans superviseur
        const sheetsWithoutSupervisor = await client.query(`
            SELECT COUNT(*) as count
            FROM time_sheets ts
            JOIN users u ON ts.user_id = u.id
            JOIN collaborateurs c ON u.id = c.user_id
            WHERE ts.status = 'submitted'
            AND NOT EXISTS (
                SELECT 1 FROM time_sheet_supervisors tss 
                WHERE tss.collaborateur_id = c.id
            )
        `);
        
        if (parseInt(sheetsWithoutSupervisor.rows[0].count) > 0) {
            console.log(`❌ ${sheetsWithoutSupervisor.rows[0].count} feuille(s) soumise(s) sans superviseur`);
        } else {
            console.log('✅ Toutes les feuilles soumises ont des superviseurs');
        }
        
        // 8. Recommandations
        console.log('\n💡 8. Recommandations...');
        
        if (parseInt(supervisorCount.rows[0].count) === 0) {
            console.log('🔧 Configurer au moins une relation superviseur');
        }
        
        if (parseInt(submittedSheets.rows.length) === 0) {
            console.log('📝 Aucune feuille de temps soumise pour validation');
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
diagnosticTimeSheetApprovals().catch(console.error);
