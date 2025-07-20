#!/usr/bin/env node

/**
 * Script de génération du rapport d'importation
 * EB-Vision 2.0
 */

require('dotenv').config();
const { query } = require('./src/utils/database');
const fs = require('fs');
const path = require('path');

async function generateReport() {
    try {
        console.log('📊 GÉNÉRATION DU RAPPORT D\'IMPORTATION');
        console.log('=====================================\n');

        // Connexion à la base de données
        const { connectDatabase } = require('./src/utils/database');
        await connectDatabase();

        const report = {
            timestamp: new Date().toISOString(),
            summary: {},
            tables: {},
            recommendations: []
        };

        // Statistiques générales
        console.log('🔍 Collecte des statistiques...');
        
        const tables = [
            'users', 'divisions', 'clients', 'contacts', 'fiscal_years',
            'missions', 'time_entries', 'invoices', 'opportunities', 'hourly_rates'
        ];

        for (const table of tables) {
            try {
                const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = parseInt(result.rows[0].count);
                report.tables[table] = count;
                console.log(`   📊 ${table}: ${count} enregistrements`);
            } catch (error) {
                console.log(`   ❌ ${table}: Erreur - ${error.message}`);
                report.tables[table] = 0;
            }
        }

        // Statistiques détaillées
        console.log('\n📈 Statistiques détaillées...');

        // Utilisateurs par division
        const usersByDivision = await query(`
            SELECT d.nom as division, COUNT(u.id) as count
            FROM divisions d
            LEFT JOIN users u ON d.id = u.division_id
            GROUP BY d.id, d.nom
            ORDER BY count DESC
        `);
        report.usersByDivision = usersByDivision.rows;

        // Missions par statut
        const missionsByStatus = await query(`
            SELECT statut, COUNT(*) as count
            FROM missions
            GROUP BY statut
            ORDER BY count DESC
        `);
        report.missionsByStatus = missionsByStatus.rows;

        // Clients par statut
        const clientsByStatus = await query(`
            SELECT statut, COUNT(*) as count
            FROM clients
            GROUP BY statut
            ORDER BY count DESC
        `);
        report.clientsByStatus = clientsByStatus.rows;

        // Saisies de temps par mois
        const timeEntriesByMonth = await query(`
            SELECT 
                DATE_TRUNC('month', date_saisie) as month,
                COUNT(*) as count,
                SUM(heures) as total_hours,
                SUM(perdiem + transport + hotel + restaurant + divers) as total_expenses
            FROM time_entries
            GROUP BY DATE_TRUNC('month', date_saisie)
            ORDER BY month DESC
            LIMIT 12
        `);
        report.timeEntriesByMonth = timeEntriesByMonth.rows;

        // Factures par statut
        const invoicesByStatus = await query(`
            SELECT statut, COUNT(*) as count, SUM(montant_ttc) as total_amount
            FROM invoices
            GROUP BY statut
            ORDER BY count DESC
        `);
        report.invoicesByStatus = invoicesByStatus.rows;

        // Calcul des totaux
        report.summary = {
            totalUsers: report.tables.users || 0,
            totalDivisions: report.tables.divisions || 0,
            totalClients: report.tables.clients || 0,
            totalMissions: report.tables.missions || 0,
            totalTimeEntries: report.tables.time_entries || 0,
            totalInvoices: report.tables.invoices || 0,
            totalOpportunities: report.tables.opportunities || 0
        };

        // Recommandations
        console.log('\n💡 Génération des recommandations...');
        
        if (report.summary.totalUsers === 0) {
            report.recommendations.push({
                priority: 'HIGH',
                category: 'USERS',
                message: 'Aucun utilisateur importé. Créez des comptes utilisateurs.',
                action: 'Utiliser l\'API /api/users pour créer des utilisateurs'
            });
        }

        if (report.summary.totalClients === 0) {
            report.recommendations.push({
                priority: 'HIGH',
                category: 'CLIENTS',
                message: 'Aucun client importé. Importez les données clients.',
                action: 'Vérifier les fichiers CSV clients et relancer l\'importation'
            });
        }

        if (report.summary.totalMissions === 0) {
            report.recommendations.push({
                priority: 'MEDIUM',
                category: 'MISSIONS',
                message: 'Aucune mission importée. Importez les données missions.',
                action: 'Vérifier le fichier liste des missions.csv'
            });
        }

        if (report.summary.totalTimeEntries === 0) {
            report.recommendations.push({
                priority: 'MEDIUM',
                category: 'TIME_ENTRIES',
                message: 'Aucune saisie de temps importée. Importez les données TRS.',
                action: 'Vérifier le fichier données_TRS.csv'
            });
        }

        // Vérification de la cohérence des données
        const orphanTimeEntries = await query(`
            SELECT COUNT(*) as count
            FROM time_entries te
            LEFT JOIN users u ON te.user_id = u.id
            WHERE u.id IS NULL
        `);

        if (parseInt(orphanTimeEntries.rows[0].count) > 0) {
            report.recommendations.push({
                priority: 'MEDIUM',
                category: 'DATA_CONSISTENCY',
                message: `${orphanTimeEntries.rows[0].count} saisies de temps sans utilisateur associé.`,
                action: 'Nettoyer les données orphelines'
            });
        }

        // Sauvegarder le rapport
        const reportPath = path.join(process.cwd(), 'IMPORT_REPORT.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Afficher le résumé
        console.log('\n📋 RÉSUMÉ DE L\'IMPORTATION');
        console.log('==========================');
        console.log(`👥 Utilisateurs: ${report.summary.totalUsers}`);
        console.log(`🏢 Divisions: ${report.summary.totalDivisions}`);
        console.log(`🏢 Clients: ${report.summary.totalClients}`);
        console.log(`🎯 Missions: ${report.summary.totalMissions}`);
        console.log(`⏰ Saisies de temps: ${report.summary.totalTimeEntries}`);
        console.log(`🧾 Factures: ${report.summary.totalInvoices}`);
        console.log(`🎯 Opportunités: ${report.summary.totalOpportunities}`);

        console.log('\n💡 RECOMMANDATIONS');
        console.log('=================');
        report.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. [${rec.priority}] ${rec.message}`);
            console.log(`   Action: ${rec.action}`);
        });

        console.log(`\n📄 Rapport complet sauvegardé: ${reportPath}`);
        console.log('✅ Rapport généré avec succès !');

    } catch (error) {
        console.error('❌ Erreur lors de la génération du rapport:', error);
        process.exit(1);
    }
}

// Lancer la génération du rapport
generateReport(); 