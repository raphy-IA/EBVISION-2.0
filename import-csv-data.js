#!/usr/bin/env node

/**
 * Script d'importation des données CSV existantes
 * EB-Vision 2.0
 */

require('dotenv').config();
const CSVAnalyzer = require('./src/utils/csv-analyzer');
const CSVImporter = require('./src/utils/csv-importer');
const { connectDatabase } = require('./src/utils/database');

async function main() {
    try {
        console.log('🔄 DÉMARRAGE DE L\'IMPORTATION DES DONNÉES CSV');
        console.log('==============================================\n');

        // 1. Connexion à la base de données
        console.log('🔗 Connexion à la base de données...');
        await connectDatabase();
        console.log('✅ Connexion établie\n');

        // 2. Analyser les fichiers CSV existants
        console.log('🔍 ANALYSE DES FICHIERS CSV');
        console.log('==========================');
        const analyzer = new CSVAnalyzer();
        const analyses = await analyzer.analyzeAllFiles();
        const report = analyzer.generateReport(analyses);

        console.log('\n📋 RAPPORT D\'ANALYSE');
        console.log('===================');
        console.log(`📁 Fichiers trouvés: ${report.summary.existingFiles}/${report.summary.totalFiles}`);
        console.log(`📊 Total des lignes: ${report.summary.totalRows}`);

        // Afficher les recommandations
        console.log('\n🎯 RECOMMANDATIONS D\'IMPORTATION');
        console.log('===============================');
        report.recommendations.forEach(rec => {
            console.log(`📄 ${rec.file} → ${rec.targetTable} (${rec.priority})`);
            console.log(`   Mapping: ${Object.keys(rec.mapping).length} colonnes`);
        });

        // 3. Demander confirmation
        console.log('\n❓ Voulez-vous procéder à l\'importation ? (y/n)');
        process.stdin.once('data', async (data) => {
            const answer = data.toString().trim().toLowerCase();
            
            if (answer === 'y' || answer === 'yes' || answer === 'o' || answer === 'oui') {
                console.log('\n🚀 DÉBUT DE L\'IMPORTATION...\n');
                
                try {
                    // 4. Lancer l'importation
                    const importer = new CSVImporter();
                    await importer.importAllCSV();
                    
                    console.log('\n🎉 IMPORTATION TERMINÉE AVEC SUCCÈS !');
                    console.log('=====================================');
                    console.log('✅ Toutes les données ont été importées');
                    console.log('✅ L\'application est prête à être utilisée');
                    console.log('\n🔗 URL: http://localhost:3000');
                    console.log('👤 Admin: admin@eb-vision.com / Admin123!');
                    
                } catch (error) {
                    console.error('\n❌ Erreur lors de l\'importation:', error.message);
                    process.exit(1);
                }
            } else {
                console.log('\n❌ Importation annulée');
            }
            
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non capturée:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesse rejetée non gérée:', reason);
    process.exit(1);
});

// Lancer le script
main(); 