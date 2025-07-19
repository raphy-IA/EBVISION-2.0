const { pool } = require('../src/utils/database');

async function enhanceTimeEntries() {
    console.log('🚀 Amélioration des time entries avec des fonctionnalités avancées...\n');
    
    try {
        // 1. Soumettre quelques time entries pour validation
        console.log('1. 📤 Soumission de time entries pour validation...');
        const soumettreResult = await pool.query(`
            UPDATE time_entries 
            SET statut_validation = 'SOUMISE'
            WHERE id IN (
                SELECT id FROM time_entries 
                WHERE statut_validation = 'SAISIE' 
                LIMIT 3
            )
            RETURNING id, date_saisie, heures, description
        `);
        console.log(`   ✅ ${soumettreResult.rows.length} time entries soumises pour validation`);
        soumettreResult.rows.forEach(row => {
            console.log(`      - ${row.date_saisie}: ${row.heures}h - ${row.description}`);
        });
        
        // 2. Valider quelques time entries
        console.log('\n2. ✅ Validation de time entries...');
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');
        const validateurId = userResult.rows[0].id;
        
        const validerResult = await pool.query(`
            UPDATE time_entries 
            SET statut_validation = 'VALIDEE',
                validateur_id = $1,
                date_validation = CURRENT_TIMESTAMP,
                commentaire_validation = 'Validé automatiquement'
            WHERE id IN (
                SELECT id FROM time_entries 
                WHERE statut_validation = 'SOUMISE' 
                LIMIT 2
            )
            RETURNING id, date_saisie, heures, description
        `, [validateurId]);
        console.log(`   ✅ ${validerResult.rows.length} time entries validées`);
        validerResult.rows.forEach(row => {
            console.log(`      - ${row.date_saisie}: ${row.heures}h - ${row.description}`);
        });
        
        // 3. Ajouter des taux horaires appliqués
        console.log('\n3. 💰 Application de taux horaires...');
        const tauxResult = await pool.query(`
            UPDATE time_entries 
            SET taux_horaire_applique = 85.00
            WHERE taux_horaire_applique IS NULL
            RETURNING id, heures, taux_horaire_applique
        `);
        console.log(`   ✅ ${tauxResult.rows.length} time entries avec taux horaire appliqué (85€/h)`);
        
        // 4. Calculer les coûts totaux
        console.log('\n4. 💵 Calcul des coûts totaux...');
        const coutsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_entries,
                SUM(heures) as total_heures,
                SUM(heures * COALESCE(taux_horaire_applique, 0)) as cout_total,
                AVG(heures * COALESCE(taux_horaire_applique, 0)) as cout_moyen_par_entry
            FROM time_entries
            WHERE taux_horaire_applique IS NOT NULL
        `);
        const couts = coutsResult.rows[0];
        console.log(`   ✅ Total entries avec coût: ${couts.total_entries}`);
        console.log(`   ✅ Total heures: ${couts.total_heures}`);
        console.log(`   ✅ Coût total: ${parseFloat(couts.cout_total).toFixed(2)}€`);
        console.log(`   ✅ Coût moyen par entry: ${parseFloat(couts.cout_moyen_par_entry).toFixed(2)}€`);
        
        // 5. Créer des time entries supplémentaires avec différents types
        console.log('\n5. ➕ Création de time entries supplémentaires...');
        const missionResult = await pool.query('SELECT id FROM missions LIMIT 1');
        const missionId = missionResult.rows[0].id;
        
        const nouvellesEntries = [
            {
                user_id: userResult.rows[0].id,
                mission_id: missionId,
                date_saisie: '2024-01-20',
                heures: 3.5,
                type_heures: 'NUIT',
                description: 'Support technique nocturne',
                statut: 'SAISIE',
                semaine: 4,
                annee: 2024
            },
            {
                user_id: userResult.rows[0].id,
                mission_id: missionId,
                date_saisie: '2024-01-21',
                heures: 6.0,
                type_heures: 'WEEKEND',
                description: 'Développement urgent - Weekend',
                statut: 'SAISIE',
                semaine: 4,
                annee: 2024
            },
            {
                user_id: userResult.rows[0].id,
                mission_id: missionId,
                date_saisie: '2024-01-22',
                heures: 4.0,
                type_heures: 'FERIE',
                description: 'Maintenance système - Jour férié',
                statut: 'SAISIE',
                semaine: 4,
                annee: 2024
            }
        ];
        
        for (const entry of nouvellesEntries) {
            const insertResult = await pool.query(`
                INSERT INTO time_entries (
                    user_id, mission_id, date_saisie, heures, type_heures, 
                    description, statut_validation, semaine, annee, taux_horaire_applique
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, date_saisie, heures, type_heures, description
            `, [
                entry.user_id, entry.mission_id, entry.date_saisie, entry.heures,
                entry.type_heures, entry.description, entry.statut, entry.semaine, 
                entry.annee, 85.00
            ]);
            console.log(`   ✅ Nouvelle entry créée: ${insertResult.rows[0].date_saisie} - ${insertResult.rows[0].heures}h ${insertResult.rows[0].type_heures} - ${insertResult.rows[0].description}`);
        }
        
        // 6. Statistiques finales
        console.log('\n6. 📊 Statistiques finales...');
        const statsFinales = await pool.query(`
            SELECT 
                COUNT(*) as total_entries,
                COUNT(CASE WHEN statut_validation = 'SAISIE' THEN 1 END) as saisies,
                COUNT(CASE WHEN statut_validation = 'SOUMISE' THEN 1 END) as soumises,
                COUNT(CASE WHEN statut_validation = 'VALIDEE' THEN 1 END) as validees,
                COUNT(CASE WHEN statut_validation = 'REJETEE' THEN 1 END) as rejetees,
                COALESCE(SUM(heures), 0) as total_heures,
                COALESCE(SUM(heures * COALESCE(taux_horaire_applique, 0)), 0) as cout_total,
                COUNT(DISTINCT type_heures) as types_heures_utilises
            FROM time_entries
        `);
        const stats = statsFinales.rows[0];
        console.log(`   ✅ Total entries: ${stats.total_entries}`);
        console.log(`   ✅ Répartition par statut:`);
        console.log(`      - SAISIE: ${stats.saisies}`);
        console.log(`      - SOUMISE: ${stats.soumises}`);
        console.log(`      - VALIDEE: ${stats.validees}`);
        console.log(`      - REJETEE: ${stats.rejetees}`);
        console.log(`   ✅ Total heures: ${stats.total_heures}`);
        console.log(`   ✅ Coût total: ${parseFloat(stats.cout_total).toFixed(2)}€`);
        console.log(`   ✅ Types d'heures utilisés: ${stats.types_heures_utilises}`);
        
        // 7. Répartition par type d'heures
        console.log('\n7. ⏰ Répartition par type d\'heures...');
        const typesResult = await pool.query(`
            SELECT type_heures, COUNT(*) as nb_entries, SUM(heures) as total_heures
            FROM time_entries
            GROUP BY type_heures
            ORDER BY type_heures
        `);
        typesResult.rows.forEach(row => {
            console.log(`   ✅ ${row.type_heures}: ${row.nb_entries} entries, ${row.total_heures}h`);
        });
        
        console.log('\n🎉 Amélioration des time entries terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'amélioration:', error.message);
    } finally {
        await pool.end();
    }
}

enhanceTimeEntries(); 