#!/usr/bin/env node

/**
 * Script de vérification complète du système de notifications TRS
 * 
 * Ce script exécute une vérification complète du système de notifications :
 * 1. Tests initiaux pour identifier les problèmes
 * 2. Corrections automatiques des anomalies détectées
 * 3. Tests post-correction pour valider les corrections
 * 4. Rapport détaillé des résultats
 * 
 * Usage: node scripts/run-notification-check.js
 */

const CompleteNotificationSystemCheck = require('./complete-notification-system-check');

async function main() {
    console.log('🚀 LANCEMENT DE LA VÉRIFICATION COMPLÈTE DU SYSTÈME DE NOTIFICATIONS');
    console.log('📅 Date:', new Date().toLocaleString('fr-FR'));
    console.log('🔗 Base de données: eb_vision_2_0');
    console.log('👤 Utilisateur: postgres');
    console.log('');
    
    try {
        const checker = new CompleteNotificationSystemCheck();
        await checker.runCompleteCheck();
        
        console.log('\n✅ Vérification terminée avec succès !');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Erreur lors de la vérification:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Gestion des signaux pour arrêt propre
process.on('SIGINT', () => {
    console.log('\n⚠️ Arrêt demandé par l\'utilisateur...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️ Arrêt du processus...');
    process.exit(0);
});

// Exécution du script
main();
