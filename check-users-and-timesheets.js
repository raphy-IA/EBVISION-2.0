const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eb_vision_2_0',
    user: 'postgres',
    password: 'Canaan@2020'
});

async function checkUsersAndTimeSheets() {
    try {
        console.log('👥 Vérification des utilisateurs et feuilles de temps...\n');
        
        // 1. Lister tous les utilisateurs
        console.log('📋 1. Utilisateurs disponibles:');
        const usersResult = await pool.query(`
            SELECT id, nom, prenom, email, role, statut
            FROM users
            ORDER BY created_at DESC
        `);
        
        usersResult.rows.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.nom} ${user.prenom} (${user.email})`);
            console.log(`     Role: ${user.role}, Status: ${user.statut}`);
        });
        console.log('');
        
        // 2. Lister toutes les feuilles de temps
        console.log('📄 2. Feuilles de temps disponibles:');
        const timeSheetsResult = await pool.query(`
            SELECT 
                ts.id,
                ts.status,
                ts.week_start,
                ts.week_end,
                u.nom,
                u.prenom,
                COUNT(te.id) as entries_count,
                SUM(te.heures) as total_hours
            FROM time_sheets ts
            JOIN users u ON ts.user_id = u.id
            LEFT JOIN time_entries te ON ts.id = te.time_sheet_id
            GROUP BY ts.id, ts.status, ts.week_start, ts.week_end, u.nom, u.prenom
            ORDER BY ts.created_at DESC
            LIMIT 10
        `);
        
        timeSheetsResult.rows.forEach((sheet, index) => {
            console.log(`  ${index + 1}. ID: ${sheet.id}`);
            console.log(`     Utilisateur: ${sheet.nom} ${sheet.prenom}`);
            console.log(`     Semaine: ${sheet.week_start} au ${sheet.week_end}`);
            console.log(`     Status: ${sheet.status}`);
            console.log(`     Entrées: ${sheet.entries_count}`);
            console.log(`     Total heures: ${sheet.total_hours || 0}`);
            console.log('');
        });
        
        // 3. Vérifier les entrées de temps
        console.log('⏰ 3. Entrées de temps disponibles:');
        const entriesResult = await pool.query(`
            SELECT 
                te.id,
                te.type_heures,
                te.heures,
                te.date_saisie,
                ts.status as sheet_status,
                u.nom,
                u.prenom
            FROM time_entries te
            JOIN time_sheets ts ON te.time_sheet_id = ts.id
            JOIN users u ON ts.user_id = u.id
            ORDER BY te.created_at DESC
            LIMIT 10
        `);
        
        entriesResult.rows.forEach((entry, index) => {
            console.log(`  ${index + 1}. ID: ${entry.id}`);
            console.log(`     Utilisateur: ${entry.nom} ${entry.prenom}`);
            console.log(`     Type: ${entry.type_heures}, Heures: ${entry.heures}`);
            console.log(`     Date: ${entry.date_saisie}`);
            console.log(`     Status feuille: ${entry.sheet_status}`);
            console.log('');
        });
        
        // 4. Statistiques générales
        console.log('📊 4. Statistiques générales:');
        const statsResult = await pool.query(`
            SELECT 
                COUNT(DISTINCT ts.id) as total_sheets,
                COUNT(DISTINCT te.id) as total_entries,
                COUNT(DISTINCT ts.user_id) as total_users,
                SUM(te.heures) as total_hours
            FROM time_sheets ts
            LEFT JOIN time_entries te ON ts.id = te.time_sheet_id
        `);
        
        const stats = statsResult.rows[0];
        console.log(`  Total feuilles: ${stats.total_sheets}`);
        console.log(`  Total entrées: ${stats.total_entries}`);
        console.log(`  Total utilisateurs: ${stats.total_users}`);
        console.log(`  Total heures: ${stats.total_hours || 0}`);
        console.log('');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await pool.end();
    }
}

checkUsersAndTimeSheets();
