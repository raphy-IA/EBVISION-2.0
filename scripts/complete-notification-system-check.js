const NotificationSystemTester = require('./test-notification-system');
const NotificationAnomalyFixer = require('./fix-notification-anomalies');

class CompleteNotificationSystemCheck {
    constructor() {
        this.testResults = [];
        this.fixResults = [];
    }

    async runCompleteCheck() {
        console.log('🚀 VÉRIFICATION COMPLÈTE DU SYSTÈME DE NOTIFICATIONS TRS');
        console.log('=' .repeat(80));
        console.log('📅 Date:', new Date().toLocaleString('fr-FR'));
        console.log('🔗 Base de données: eb_vision_2_0');
        console.log('👤 Utilisateur: postgres');
        console.log('');
        
        try {
            // ÉTAPE 1: Tests initiaux
            console.log('🔍 ÉTAPE 1: Tests initiaux du système');
            console.log('-'.repeat(50));
            
            const initialTester = new NotificationSystemTester();
            await initialTester.runAllTests();
            this.testResults.push({
                phase: 'Initial',
                results: initialTester.testResults
            });
            
            // ÉTAPE 2: Analyse des problèmes
            console.log('\n📊 ÉTAPE 2: Analyse des problèmes détectés');
            console.log('-'.repeat(50));
            
            const initialFailures = initialTester.testResults.filter(r => r.status === 'FAIL');
            const initialWarnings = initialTester.testResults.filter(r => r.status === 'WARNING');
            
            if (initialFailures.length > 0 || initialWarnings.length > 0) {
                console.log(`❌ Problèmes détectés:`);
                console.log(`   - Erreurs: ${initialFailures.length}`);
                console.log(`   - Avertissements: ${initialWarnings.length}`);
                
                initialFailures.forEach(failure => {
                    console.log(`   ❌ ${failure.test}: ${failure.details}`);
                });
                
                initialWarnings.forEach(warning => {
                    console.log(`   ⚠️ ${warning.test}: ${warning.details}`);
                });
                
                // ÉTAPE 3: Corrections automatiques
                console.log('\n🔧 ÉTAPE 3: Application des corrections automatiques');
                console.log('-'.repeat(50));
                
                const fixer = new NotificationAnomalyFixer();
                await fixer.runAllFixes();
                this.fixResults = fixer.fixesApplied;
                
                // ÉTAPE 4: Tests post-correction
                console.log('\n✅ ÉTAPE 4: Tests post-correction');
                console.log('-'.repeat(50));
                
                const finalTester = new NotificationSystemTester();
                await finalTester.runAllTests();
                this.testResults.push({
                    phase: 'Post-Correction',
                    results: finalTester.testResults
                });
                
                // ÉTAPE 5: Comparaison des résultats
                await this.compareResults();
                
            } else {
                console.log('✅ Aucun problème détecté - système opérationnel !');
            }
            
            // ÉTAPE 6: Rapport final
            await this.generateFinalReport();
            
        } catch (error) {
            console.error('❌ Erreur critique lors de la vérification complète:', error.message);
        }
    }

    async compareResults() {
        console.log('\n📈 ÉTAPE 5: Comparaison des résultats');
        console.log('-'.repeat(50));
        
        const initialResults = this.testResults[0].results;
        const finalResults = this.testResults[1].results;
        
        const initialPassed = initialResults.filter(r => r.status === 'PASS').length;
        const initialFailed = initialResults.filter(r => r.status === 'FAIL').length;
        const initialWarnings = initialResults.filter(r => r.status === 'WARNING').length;
        
        const finalPassed = finalResults.filter(r => r.status === 'PASS').length;
        const finalFailed = finalResults.filter(r => r.status === 'FAIL').length;
        const finalWarnings = finalResults.filter(r => r.status === 'WARNING').length;
        
        console.log('📊 Comparaison des résultats:');
        console.log(`   Tests initiaux:  ✅ ${initialPassed} | ❌ ${initialFailed} | ⚠️ ${initialWarnings}`);
        console.log(`   Tests finaux:    ✅ ${finalPassed} | ❌ ${finalFailed} | ⚠️ ${finalWarnings}`);
        
        const improvement = finalPassed - initialPassed;
        if (improvement > 0) {
            console.log(`\n🎉 Amélioration: +${improvement} tests réussis`);
        } else if (improvement < 0) {
            console.log(`\n⚠️ Dégradation: ${improvement} tests réussis`);
        } else {
            console.log(`\n➡️ Aucun changement dans le nombre de tests réussis`);
        }
        
        // Identifier les tests qui ont changé de statut
        const statusChanges = [];
        for (let i = 0; i < initialResults.length; i++) {
            const initial = initialResults[i];
            const final = finalResults[i];
            
            if (initial.status !== final.status) {
                statusChanges.push({
                    test: initial.test,
                    from: initial.status,
                    to: final.status
                });
            }
        }
        
        if (statusChanges.length > 0) {
            console.log('\n🔄 Changements de statut:');
            statusChanges.forEach(change => {
                const fromIcon = { 'PASS': '✅', 'FAIL': '❌', 'WARNING': '⚠️', 'SKIP': '⏭️' }[change.from];
                const toIcon = { 'PASS': '✅', 'FAIL': '❌', 'WARNING': '⚠️', 'SKIP': '⏭️' }[change.to];
                console.log(`   ${change.test}: ${fromIcon} → ${toIcon}`);
            });
        }
    }

    async generateFinalReport() {
        console.log('\n📋 RAPPORT FINAL DE VÉRIFICATION COMPLÈTE');
        console.log('=' .repeat(80));
        
        // Résumé des corrections
        if (this.fixResults.length > 0) {
            console.log('\n🔧 Corrections appliquées:');
            this.fixResults.forEach((fix, index) => {
                console.log(`   ${index + 1}. ${fix}`);
            });
        }
        
        // Résumé des tests
        console.log('\n📊 Résumé des tests:');
        this.testResults.forEach((phase, index) => {
            const passed = phase.results.filter(r => r.status === 'PASS').length;
            const failed = phase.results.filter(r => r.status === 'FAIL').length;
            const warnings = phase.results.filter(r => r.status === 'WARNING').length;
            const skipped = phase.results.filter(r => r.status === 'SKIP').length;
            
            console.log(`   ${phase.phase}: ✅ ${passed} | ❌ ${failed} | ⚠️ ${warnings} | ⏭️ ${skipped}`);
        });
        
        // État final du système
        const finalResults = this.testResults[this.testResults.length - 1].results;
        const finalPassed = finalResults.filter(r => r.status === 'PASS').length;
        const totalTests = finalResults.length;
        
        console.log('\n🎯 État final du système:');
        if (finalPassed === totalTests) {
            console.log('   🟢 SYSTÈME OPÉRATIONNEL - Tous les tests réussis !');
        } else if (finalPassed >= totalTests * 0.8) {
            console.log('   🟡 SYSTÈME FONCTIONNEL - La plupart des tests réussis');
        } else {
            console.log('   🔴 SYSTÈME PROBLÉMATIQUE - Nombreux échecs de tests');
        }
        
        // Recommandations
        console.log('\n💡 Recommandations:');
        
        const finalFailures = finalResults.filter(r => r.status === 'FAIL');
        const finalWarnings = finalResults.filter(r => r.status === 'WARNING');
        
        if (finalFailures.length > 0) {
            console.log('   ❌ Actions requises:');
            finalFailures.forEach(failure => {
                console.log(`      - Corriger: ${failure.test} - ${failure.details}`);
            });
        }
        
        if (finalWarnings.length > 0) {
            console.log('   ⚠️ Améliorations recommandées:');
            finalWarnings.forEach(warning => {
                console.log(`      - Améliorer: ${warning.test} - ${warning.details}`);
            });
        }
        
        if (finalPassed === totalTests) {
            console.log('   ✅ Aucune action requise - système optimal');
        }
        
        // Prochaines étapes
        console.log('\n📝 Prochaines étapes:');
        console.log('   1. Configurer le mot de passe email dans l\'interface');
        console.log('   2. Tester manuellement l\'envoi d\'emails');
        console.log('   3. Vérifier les notifications dans l\'interface utilisateur');
        console.log('   4. Surveiller les tâches cron quotidiennes');
        console.log('   5. Planifier des tests réguliers du système');
        
        console.log('\n' + '=' .repeat(80));
        console.log('🏁 Vérification complète terminée');
    }
}

// Exécution du script
async function main() {
    const checker = new CompleteNotificationSystemCheck();
    await checker.runCompleteCheck();
}

// Exécution si le script est appelé directement
if (require.main === module) {
    main().catch(console.error);
}

module.exports = CompleteNotificationSystemCheck;
