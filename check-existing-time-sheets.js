const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eb_vision_2_0',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function checkAndCleanTimeSheets() {
    const client = await pool.connect();
    try {
        console.log('🔍 Vérification des time sheets existants...');
        
        // Vérifier les time sheets existants pour l'utilisateur
        const userId = 'f6a6567f-b51d-4dbc-872d-1005156bd187';
        
        // Récupérer le collaborateur de l'utilisateur
        const collaborateurResult = await client.query(
            'SELECT id FROM collaborateurs WHERE user_id = $1',
            [userId]
        );
        
        if (collaborateurResult.rows.length === 0) {
            console.log('❌ Aucun collaborateur trouvé pour cet utilisateur');
            return;
        }
        
        const collaborateurId = collaborateurResult.rows[0].id;
        console.log('✅ Collaborateur trouvé:', collaborateurId);
        
        // Vérifier les time sheets existants
        const timeSheetsResult = await client.query(
            'SELECT id, semaine, annee, statut FROM time_sheets WHERE collaborateur_id = $1 ORDER BY annee DESC, semaine DESC',
            [collaborateurId]
        );
        
        console.log('📋 Time sheets existants:');
        timeSheetsResult.rows.forEach(row => {
            console.log(`  - ID: ${row.id}, Semaine: ${row.semaine}/${row.annee}, Statut: ${row.statut}`);
        });
        
        if (timeSheetsResult.rows.length > 0) {
            console.log('🗑️ Suppression des time sheets existants...');
            
            // Supprimer d'abord les time entries associés
            for (const timeSheet of timeSheetsResult.rows) {
                // Supprimer les time_entries_detailed
                await client.query(
                    'DELETE FROM time_entries_detailed WHERE time_sheet_id = $1',
                    [timeSheet.id]
                );
                console.log(`  ✅ Time entries détaillés supprimés pour le time sheet ${timeSheet.id}`);
                
                // Supprimer les time_entries
                await client.query(
                    'DELETE FROM time_entries WHERE time_sheet_id = $1',
                    [timeSheet.id]
                );
                console.log(`  ✅ Time entries supprimés pour le time sheet ${timeSheet.id}`);
            }
            
            // Supprimer les time sheets
            await client.query(
                'DELETE FROM time_sheets WHERE collaborateur_id = $1',
                [collaborateurId]
            );
            console.log('✅ Time sheets supprimés');
        }
        
        console.log('🧪 Test de création d\'un nouveau time sheet...');
        
        // Créer un nouveau time sheet
        const currentDate = new Date();
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Lundi de cette semaine
        
        const weekNumber = getWeekNumber(weekStart);
        const year = weekStart.getFullYear();
        
        const insertResult = await client.query(
            `INSERT INTO time_sheets (collaborateur_id, semaine, annee, statut, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING id`,
            [collaborateurId, weekNumber, year, 'draft']
        );
        
        console.log('✅ Nouveau time sheet créé:', insertResult.rows[0].id);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

checkAndCleanTimeSheets(); 