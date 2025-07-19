const { pool } = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

async function generateSystemReport() {
    console.log('📊 Génération du rapport complet du système...\n');
    
    try {
        const report = {
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            summary: {},
            details: {}
        };
        
        // 1. Résumé général
        console.log('1. 📋 Collecte du résumé général...');
        const summaryQueries = [
            { name: 'grades', query: 'SELECT COUNT(*) as count FROM grades' },
            { name: 'collaborateurs', query: 'SELECT COUNT(*) as count FROM collaborateurs' },
            { name: 'missions', query: 'SELECT COUNT(*) as count FROM missions' },
            { name: 'feuilles_temps', query: 'SELECT COUNT(*) as count FROM feuilles_temps' },
            { name: 'time_entries', query: 'SELECT COUNT(*) as count FROM time_entries' },
            { name: 'users', query: 'SELECT COUNT(*) as count FROM users' },
            { name: 'clients', query: 'SELECT COUNT(*) as count FROM clients' }
        ];
        
        for (const item of summaryQueries) {
            const result = await pool.query(item.query);
            report.summary[item.name] = parseInt(result.rows[0].count);
        }
        
        // 2. Statistiques détaillées des time entries
        console.log('2. ⏰ Statistiques détaillées des time entries...');
        const timeEntriesStats = await pool.query(`
            SELECT 
                COUNT(*) as total_entries,
                COUNT(CASE WHEN statut_validation = 'SAISIE' THEN 1 END) as saisies,
                COUNT(CASE WHEN statut_validation = 'SOUMISE' THEN 1 END) as soumises,
                COUNT(CASE WHEN statut_validation = 'VALIDEE' THEN 1 END) as validees,
                COUNT(CASE WHEN statut_validation = 'REJETEE' THEN 1 END) as rejetees,
                COALESCE(SUM(heures), 0) as total_heures,
                COALESCE(SUM(heures * COALESCE(taux_horaire_applique, 0)), 0) as cout_total,
                COALESCE(AVG(heures), 0) as moyenne_heures_par_entry,
                COUNT(DISTINCT type_heures) as types_heures_utilises,
                COUNT(DISTINCT user_id) as utilisateurs_actifs,
                COUNT(DISTINCT mission_id) as missions_actives
            FROM time_entries
        `);
        report.details.time_entries_stats = timeEntriesStats.rows[0];
        
        // 3. Répartition par type d'heures
        console.log('3. ⏰ Répartition par type d\'heures...');
        const typesHeures = await pool.query(`
            SELECT type_heures, COUNT(*) as nb_entries, SUM(heures) as total_heures,
                   AVG(heures) as moyenne_heures, SUM(heures * COALESCE(taux_horaire_applique, 0)) as cout_total
            FROM time_entries
            GROUP BY type_heures
            ORDER BY type_heures
        `);
        report.details.types_heures = typesHeures.rows;
        
        // 4. Répartition par utilisateur
        console.log('4. 👤 Répartition par utilisateur...');
        const usersStats = await pool.query(`
            SELECT 
                u.nom, u.prenom, u.initiales,
                COUNT(te.id) as nb_entries,
                COALESCE(SUM(te.heures), 0) as total_heures,
                COALESCE(SUM(te.heures * COALESCE(te.taux_horaire_applique, 0)), 0) as cout_total,
                COUNT(CASE WHEN te.statut_validation = 'VALIDEE' THEN 1 END) as entries_validees
            FROM users u
            LEFT JOIN time_entries te ON u.id = te.user_id
            GROUP BY u.id, u.nom, u.prenom, u.initiales
            ORDER BY total_heures DESC
        `);
        report.details.users_stats = usersStats.rows;
        
        // 5. Répartition par mission
        console.log('5. 🎯 Répartition par mission...');
        const missionsStats = await pool.query(`
            SELECT 
                m.titre, m.statut,
                COUNT(te.id) as nb_entries,
                COALESCE(SUM(te.heures), 0) as total_heures,
                COALESCE(SUM(te.heures * COALESCE(te.taux_horaire_applique, 0)), 0) as cout_total
            FROM missions m
            LEFT JOIN time_entries te ON m.id = te.mission_id
            GROUP BY m.id, m.titre, m.statut
            ORDER BY total_heures DESC
        `);
        report.details.missions_stats = missionsStats.rows;
        
        // 6. Évolution temporelle
        console.log('6. 📅 Évolution temporelle...');
        const evolutionTemporelle = await pool.query(`
            SELECT 
                date_saisie,
                COUNT(*) as nb_entries,
                SUM(heures) as total_heures,
                SUM(heures * COALESCE(taux_horaire_applique, 0)) as cout_jour
            FROM time_entries
            GROUP BY date_saisie
            ORDER BY date_saisie
        `);
        report.details.evolution_temporelle = evolutionTemporelle.rows;
        
        // 7. Performance et métriques
        console.log('7. 📈 Performance et métriques...');
        const performance = await pool.query(`
            SELECT 
                COUNT(*) as total_entries,
                COALESCE(SUM(heures), 0) as total_heures,
                COALESCE(SUM(heures * COALESCE(taux_horaire_applique, 0)), 0) as cout_total,
                COALESCE(AVG(heures), 0) as moyenne_heures_par_entry,
                COALESCE(MAX(heures), 0) as max_heures_par_entry,
                COALESCE(MIN(heures), 0) as min_heures_par_entry,
                COUNT(DISTINCT date_saisie) as jours_actifs,
                COALESCE(SUM(heures) / COUNT(DISTINCT date_saisie), 0) as moyenne_heures_par_jour
            FROM time_entries
        `);
        report.details.performance = performance.rows[0];
        
        // 8. Alertes et recommandations
        console.log('8. ⚠️ Génération des alertes et recommandations...');
        const alertes = [];
        
        // Vérifier les time entries non validées depuis longtemps
        const anciennesNonValidees = await pool.query(`
            SELECT COUNT(*) as count
            FROM time_entries
            WHERE statut_validation = 'SAISIE'
            AND date_saisie < CURRENT_DATE - INTERVAL '7 days'
        `);
        if (parseInt(anciennesNonValidees.rows[0].count) > 0) {
            alertes.push({
                type: 'warning',
                message: `${anciennesNonValidees.rows[0].count} time entries non validées depuis plus de 7 jours`,
                action: 'Revoir et valider les anciennes saisies'
            });
        }
        
        // Vérifier les time entries avec beaucoup d'heures
        const entriesLongues = await pool.query(`
            SELECT COUNT(*) as count
            FROM time_entries
            WHERE heures > 12
        `);
        if (parseInt(entriesLongues.rows[0].count) > 0) {
            alertes.push({
                type: 'info',
                message: `${entriesLongues.rows[0].count} time entries avec plus de 12 heures`,
                action: 'Vérifier la validité de ces saisies'
            });
        }
        
        // Vérifier la répartition des types d'heures
        const typesHeuresCount = await pool.query(`
            SELECT type_heures, COUNT(*) as count
            FROM time_entries
            GROUP BY type_heures
            HAVING COUNT(*) > 5
        `);
        if (typesHeuresCount.rows.length > 0) {
            alertes.push({
                type: 'info',
                message: `Types d'heures les plus utilisés: ${typesHeuresCount.rows.map(r => `${r.type_heures} (${r.count})`).join(', ')}`,
                action: 'Analyser les patterns d\'utilisation'
            });
        }
        
        report.details.alertes = alertes;
        
        // 9. Sauvegarder le rapport
        console.log('9. 💾 Sauvegarde du rapport...');
        const reportPath = path.join(__dirname, 'system_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // 10. Afficher le résumé
        console.log('\n📊 RÉSUMÉ DU SYSTÈME:');
        console.log('='.repeat(50));
        console.log(`📅 Date: ${new Date().toLocaleString()}`);
        console.log(`📊 Version: ${report.version}`);
        console.log('');
        console.log('📋 DONNÉES PRINCIPALES:');
        Object.entries(report.summary).forEach(([key, value]) => {
            console.log(`   - ${key}: ${value}`);
        });
        console.log('');
        console.log('⏰ TIME ENTRIES:');
        const stats = report.details.time_entries_stats;
        console.log(`   - Total: ${stats.total_entries}`);
        console.log(`   - Heures totales: ${stats.total_heures}`);
        console.log(`   - Coût total: ${parseFloat(stats.cout_total).toFixed(2)}€`);
        console.log(`   - Répartition: SAISIE(${stats.saisies}) SOUMISE(${stats.soumises}) VALIDEE(${stats.validees}) REJETEE(${stats.rejetees})`);
        console.log('');
        console.log('💰 COÛTS:');
        console.log(`   - Coût total: ${parseFloat(stats.cout_total).toFixed(2)}€`);
        console.log(`   - Coût moyen par entry: ${parseFloat(stats.cout_total / stats.total_entries).toFixed(2)}€`);
        console.log(`   - Coût moyen par heure: ${parseFloat(stats.cout_total / stats.total_heures).toFixed(2)}€`);
        console.log('');
        console.log('⚠️ ALERTES:');
        if (alertes.length === 0) {
            console.log('   ✅ Aucune alerte détectée');
        } else {
            alertes.forEach(alerte => {
                console.log(`   - ${alerte.type.toUpperCase()}: ${alerte.message}`);
            });
        }
        console.log('');
        console.log(`💾 Rapport sauvegardé: ${reportPath}`);
        console.log('='.repeat(50));
        
        console.log('\n🎉 Rapport du système généré avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la génération du rapport:', error.message);
    } finally {
        await pool.end();
    }
}

generateSystemReport(); 