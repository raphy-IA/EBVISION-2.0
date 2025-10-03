#!/usr/bin/env node

/**
 * Script simple de vérification des différences de base de données
 * Se concentre sur les problèmes critiques uniquement
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de la base de données
const DB_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'ebpadfbq_eb_vision_2_0',
    user: 'ebpadfbq_eb_admin20',
    password: '87ifet-Z)&'
};

class SimpleDatabaseChecker {
    constructor() {
        this.pool = new Pool(DB_CONFIG);
    }

    /**
     * Vérifier les problèmes critiques
     */
    async checkCriticalIssues() {
        console.log('🔍 Vérification des problèmes critiques...\n');
        
        const issues = [];

        try {
            // 1. Vérifier la table prospecting_campaign_companies
            console.log('📋 Vérification de la table prospecting_campaign_companies...');
            
            // Vérifier si la clé primaire composite existe
            const primaryKeyCheck = await this.pool.query(`
                SELECT COUNT(*) as count
                FROM information_schema.table_constraints 
                WHERE table_name = 'prospecting_campaign_companies' 
                AND constraint_type = 'PRIMARY KEY'
                AND table_schema = 'public'
            `);
            
            if (parseInt(primaryKeyCheck.rows[0].count) === 0) {
                issues.push({
                    type: 'missing_primary_key',
                    table: 'prospecting_campaign_companies',
                    description: 'Clé primaire composite manquante',
                    fix: `ALTER TABLE prospecting_campaign_companies 
                          ADD CONSTRAINT prospecting_campaign_companies_pkey 
                          PRIMARY KEY (campaign_id, company_id);`
                });
                console.log('  ❌ Clé primaire composite manquante');
            } else {
                console.log('  ✅ Clé primaire composite présente');
            }

            // Vérifier la colonne status
            const statusColumnCheck = await this.pool.query(`
                SELECT column_default, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'prospecting_campaign_companies' 
                AND column_name = 'status'
                AND table_schema = 'public'
            `);
            
            if (statusColumnCheck.rows.length > 0) {
                const statusCol = statusColumnCheck.rows[0];
                if (!statusCol.column_default) {
                    issues.push({
                        type: 'missing_default_value',
                        table: 'prospecting_campaign_companies',
                        column: 'status',
                        description: 'Valeur par défaut manquante pour la colonne status',
                        fix: `ALTER TABLE prospecting_campaign_companies 
                              ALTER COLUMN status SET DEFAULT 'PENDING';`
                    });
                    console.log('  ❌ Valeur par défaut manquante pour status');
                } else {
                    console.log('  ✅ Valeur par défaut présente pour status');
                }
            } else {
                console.log('  ❌ Colonne status non trouvée');
            }

            // 2. Vérifier les méthodes manquantes dans le modèle
            console.log('\n📋 Vérification des méthodes du modèle...');
            
            // Vérifier si la méthode delete existe pour ProspectingCampaign
            const modelFile = path.join(__dirname, '../src/models/Prospecting.js');
            if (fs.existsSync(modelFile)) {
                const modelContent = fs.readFileSync(modelFile, 'utf8');
                if (!modelContent.includes('static async delete(campaignId)')) {
                    issues.push({
                        type: 'missing_method',
                        file: 'src/models/Prospecting.js',
                        description: 'Méthode delete manquante pour ProspectingCampaign',
                        fix: 'Ajouter la méthode delete à la classe ProspectingCampaign'
                    });
                    console.log('  ❌ Méthode delete manquante pour ProspectingCampaign');
                } else {
                    console.log('  ✅ Méthode delete présente pour ProspectingCampaign');
                }
            }

            // 3. Vérifier les contraintes de clés étrangères
            console.log('\n📋 Vérification des contraintes de clés étrangères...');
            
            const foreignKeysCheck = await this.pool.query(`
                SELECT 
                    tc.table_name,
                    tc.constraint_name,
                    tc.constraint_type,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints tc
                LEFT JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                LEFT JOIN information_schema.constraint_column_usage ccu 
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
                ORDER BY tc.table_name, tc.constraint_name
            `);
            
            console.log(`  📊 ${foreignKeysCheck.rows.length} contraintes de clés étrangères trouvées`);

        } catch (error) {
            console.error('❌ Erreur lors de la vérification:', error.message);
            issues.push({
                type: 'error',
                description: `Erreur lors de la vérification: ${error.message}`
            });
        }

        return issues;
    }

    /**
     * Appliquer les corrections automatiques
     */
    async applyAutomaticFixes(issues) {
        console.log('\n🔧 Application des corrections automatiques...\n');
        
        for (const issue of issues) {
            if (issue.type === 'missing_primary_key' || issue.type === 'missing_default_value') {
                try {
                    console.log(`🔧 Application: ${issue.description}`);
                    await this.pool.query(issue.fix);
                    console.log(`  ✅ Correction appliquée avec succès`);
                } catch (error) {
                    if (error.message.includes('already exists') || error.message.includes('déjà existe')) {
                        console.log(`  ✅ Déjà appliqué`);
                    } else {
                        console.log(`  ❌ Erreur: ${error.message}`);
                    }
                }
            }
        }
    }

    /**
     * Générer le rapport
     */
    generateReport(issues) {
        const report = [];
        
        report.push('# RAPPORT DE VÉRIFICATION DE BASE DE DONNÉES\n');
        report.push(`Généré le: ${new Date().toISOString()}\n`);

        if (issues.length === 0) {
            report.push('🎉 **Aucun problème critique détecté !**\n');
        } else {
            report.push(`⚠️ **${issues.length} problème(s) détecté(s):**\n`);
            
            issues.forEach((issue, index) => {
                report.push(`## ${index + 1}. ${issue.description}\n`);
                report.push(`- **Type**: ${issue.type}`);
                if (issue.table) report.push(`- **Table**: ${issue.table}`);
                if (issue.column) report.push(`- **Colonne**: ${issue.column}`);
                if (issue.file) report.push(`- **Fichier**: ${issue.file}`);
                if (issue.fix) {
                    report.push(`- **Correction**:`);
                    report.push('```sql');
                    report.push(issue.fix);
                    report.push('```');
                }
                report.push('');
            });
        }

        return report.join('\n');
    }

    /**
     * Exécuter la vérification complète
     */
    async run() {
        try {
            console.log('🚀 Début de la vérification de base de données...\n');

            // Vérifier les problèmes
            const issues = await this.checkCriticalIssues();

            // Appliquer les corrections automatiques
            await this.applyAutomaticFixes(issues);

            // Générer le rapport
            const report = this.generateReport(issues);
            const reportPath = path.join(__dirname, 'database-check-report.md');
            fs.writeFileSync(reportPath, report);

            console.log('\n✅ Vérification terminée !');
            console.log(`📄 Rapport sauvegardé: ${reportPath}`);

            if (issues.length === 0) {
                console.log('🎉 Aucun problème critique détecté !');
            } else {
                console.log(`⚠️ ${issues.length} problème(s) détecté(s).`);
                console.log('📋 Consultez le rapport pour plus de détails.');
            }

        } catch (error) {
            console.error('❌ Erreur lors de la vérification:', error);
        } finally {
            await this.pool.end();
        }
    }
}

// Exécuter le script
if (require.main === module) {
    const checker = new SimpleDatabaseChecker();
    checker.run();
}

module.exports = SimpleDatabaseChecker;








