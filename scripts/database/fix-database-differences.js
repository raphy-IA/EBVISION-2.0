#!/usr/bin/env node

/**
 * Script de correction automatique des différences de base de données
 * Applique les corrections nécessaires pour synchroniser la production avec le local
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de la base de données de production
const PRODUCTION_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'ebpadfbq_eb_vision_2_0',
    user: 'ebpadfbq_eb_admin20',
    password: '87ifet-Z)&'
};

class DatabaseFixer {
    constructor() {
        this.pool = new Pool(PRODUCTION_CONFIG);
        this.fixes = [];
    }

    /**
     * Lire le rapport de comparaison
     */
    readComparisonReport() {
        const reportPath = path.join(__dirname, 'database-comparison-report.md');
        if (!fs.existsSync(reportPath)) {
            throw new Error('Rapport de comparaison non trouvé. Exécutez d\'abord compare-database-structure.js');
        }
        return fs.readFileSync(reportPath, 'utf8');
    }

    /**
     * Analyser le rapport et générer les corrections
     */
    analyzeReport(report) {
        const fixes = [];

        // Analyser les tables manquantes
        const missingTablesMatch = report.match(/## 🚨 TABLES MANQUANTES EN PRODUCTION\n([\s\S]*?)(?=##|$)/);
        if (missingTablesMatch) {
            const tables = missingTablesMatch[1].match(/- \*\*(.*?)\*\*/g);
            if (tables) {
                tables.forEach(table => {
                    const tableName = table.replace(/- \*\*(.*?)\*\*/, '$1');
                    fixes.push({
                        type: 'create_table',
                        table: tableName,
                        description: `Créer la table manquante: ${tableName}`
                    });
                });
            }
        }

        // Analyser les colonnes manquantes
        const columnDifferencesMatch = report.match(/## 🔍 DIFFÉRENCES DE COLONNES\n([\s\S]*?)(?=##|$)/);
        if (columnDifferencesMatch) {
            const sections = columnDifferencesMatch[1].split('### Table:');
            sections.forEach(section => {
                if (section.trim()) {
                    const lines = section.split('\n');
                    const tableName = lines[0].trim();
                    
                    // Chercher les colonnes manquantes
                    const missingColumns = section.match(/- \*\*Colonne manquante\*\*: `(.*?)`/g);
                    if (missingColumns) {
                        missingColumns.forEach(col => {
                            const columnName = col.match(/`(.*?)`/)[1];
                            fixes.push({
                                type: 'add_column',
                                table: tableName,
                                column: columnName,
                                description: `Ajouter la colonne manquante: ${tableName}.${columnName}`
                            });
                        });
                    }

                    // Chercher les différences de colonnes
                    const columnDiffs = section.match(/- \*\*Différence de colonne\*\*: `(.*?)`/g);
                    if (columnDiffs) {
                        columnDiffs.forEach(col => {
                            const columnName = col.match(/`(.*?)`/)[1];
                            fixes.push({
                                type: 'modify_column',
                                table: tableName,
                                column: columnName,
                                description: `Modifier la colonne: ${tableName}.${columnName}`
                            });
                        });
                    }
                }
            });
        }

        // Analyser les contraintes manquantes
        const constraintDifferencesMatch = report.match(/## 🔒 DIFFÉRENCES DE CONTRAINTES\n([\s\S]*?)(?=##|$)/);
        if (constraintDifferencesMatch) {
            const sections = constraintDifferencesMatch[1].split('### Table:');
            sections.forEach(section => {
                if (section.trim()) {
                    const lines = section.split('\n');
                    const tableName = lines[0].trim();
                    
                    const missingConstraints = section.match(/- \*\*Contrainte manquante\*\*: `(.*?)`/g);
                    if (missingConstraints) {
                        missingConstraints.forEach(constraint => {
                            const constraintName = constraint.match(/`(.*?)`/)[1];
                            fixes.push({
                                type: 'add_constraint',
                                table: tableName,
                                constraint: constraintName,
                                description: `Ajouter la contrainte manquante: ${tableName}.${constraintName}`
                            });
                        });
                    }
                }
            });
        }

        // Analyser les index manquants
        const indexDifferencesMatch = report.match(/## 📊 DIFFÉRENCES D'INDEX\n([\s\S]*?)(?=##|$)/);
        if (indexDifferencesMatch) {
            const sections = indexDifferencesMatch[1].split('### Table:');
            sections.forEach(section => {
                if (section.trim()) {
                    const lines = section.split('\n');
                    const tableName = lines[0].trim();
                    
                    const missingIndexes = section.match(/- \*\*Index manquant\*\*: `(.*?)`/g);
                    if (missingIndexes) {
                        missingIndexes.forEach(index => {
                            const indexName = index.match(/`(.*?)`/)[1];
                            fixes.push({
                                type: 'add_index',
                                table: tableName,
                                index: indexName,
                                description: `Ajouter l'index manquant: ${tableName}.${indexName}`
                            });
                        });
                    }
                }
            });
        }

        return fixes;
    }

    /**
     * Générer les commandes SQL de correction
     */
    generateFixSQL(fixes) {
        const sqlCommands = [];

        fixes.forEach(fix => {
            switch (fix.type) {
                case 'add_column':
                    sqlCommands.push({
                        description: fix.description,
                        sql: `-- ${fix.description}\n-- TODO: Définir le type et les propriétés de la colonne\n-- ALTER TABLE ${fix.table} ADD COLUMN ${fix.column} <TYPE>;`
                    });
                    break;

                case 'modify_column':
                    sqlCommands.push({
                        description: fix.description,
                        sql: `-- ${fix.description}\n-- TODO: Définir la modification de la colonne\n-- ALTER TABLE ${fix.table} ALTER COLUMN ${fix.column} <MODIFICATION>;`
                    });
                    break;

                case 'add_constraint':
                    sqlCommands.push({
                        description: fix.description,
                        sql: `-- ${fix.description}\n-- TODO: Définir la contrainte\n-- ALTER TABLE ${fix.table} ADD CONSTRAINT ${fix.constraint} <CONSTRAINT_DEFINITION>;`
                    });
                    break;

                case 'add_index':
                    sqlCommands.push({
                        description: fix.description,
                        sql: `-- ${fix.description}\n-- TODO: Définir l'index\n-- CREATE INDEX ${fix.index} ON ${fix.table} (<COLUMNS>);`
                    });
                    break;

                case 'create_table':
                    sqlCommands.push({
                        description: fix.description,
                        sql: `-- ${fix.description}\n-- TODO: Définir la structure de la table\n-- CREATE TABLE ${fix.table} (\n--   <COLUMNS>\n-- );`
                    });
                    break;
            }
        });

        return sqlCommands;
    }

    /**
     * Appliquer les corrections spécifiques connues
     */
    async applyKnownFixes() {
        console.log('🔧 Application des corrections connues...\n');

        const knownFixes = [
            {
                description: 'Ajouter la clé primaire composite à prospecting_campaign_companies',
                sql: `ALTER TABLE prospecting_campaign_companies 
                      ADD CONSTRAINT prospecting_campaign_companies_pkey 
                      PRIMARY KEY (campaign_id, company_id);`,
                check: `SELECT COUNT(*) as constraint_exists 
                        FROM information_schema.table_constraints 
                        WHERE table_name = 'prospecting_campaign_companies' 
                        AND constraint_type = 'PRIMARY KEY';`
            },
            {
                description: 'Vérifier que la colonne status a une valeur par défaut',
                sql: `ALTER TABLE prospecting_campaign_companies 
                      ALTER COLUMN status SET DEFAULT 'PENDING';`,
                check: `SELECT column_default 
                        FROM information_schema.columns 
                        WHERE table_name = 'prospecting_campaign_companies' 
                        AND column_name = 'status';`
            }
        ];

        for (const fix of knownFixes) {
            try {
                console.log(`🔍 Vérification: ${fix.description}`);
                
                // Vérifier si la correction est nécessaire
                const checkResult = await this.pool.query(fix.check);
                
                if (fix.check.includes('constraint_exists')) {
                    const constraintExists = parseInt(checkResult.rows[0].constraint_exists) > 0;
                    if (constraintExists) {
                        console.log(`  ✅ Déjà appliqué`);
                        continue;
                    }
                } else if (fix.check.includes('column_default')) {
                    const hasDefault = checkResult.rows[0].column_default !== null;
                    if (hasDefault) {
                        console.log(`  ✅ Déjà appliqué`);
                        continue;
                    }
                }

                // Appliquer la correction
                console.log(`  🔧 Application de la correction...`);
                await this.pool.query(fix.sql);
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

    /**
     * Générer le script de correction
     */
    generateFixScript(fixes) {
        const sqlCommands = this.generateFixSQL(fixes);
        
        let script = `-- Script de correction des différences de base de données
-- Généré le: ${new Date().toISOString()}
-- ATTENTION: Vérifiez chaque commande avant de l'exécuter !

`;

        sqlCommands.forEach((cmd, index) => {
            script += `-- ${index + 1}. ${cmd.description}\n`;
            script += `${cmd.sql}\n\n`;
        });

        return script;
    }

    /**
     * Exécuter le processus de correction
     */
    async run() {
        try {
            console.log('🚀 Début de la correction des différences de base de données...\n');

            // Appliquer les corrections connues
            await this.applyKnownFixes();

            // Lire et analyser le rapport
            console.log('\n📋 Analyse du rapport de comparaison...');
            const report = this.readComparisonReport();
            const fixes = this.analyzeReport(report);

            if (fixes.length === 0) {
                console.log('🎉 Aucune correction automatique nécessaire !');
                return;
            }

            console.log(`\n🔍 ${fixes.length} correction(s) identifiée(s):`);
            fixes.forEach((fix, index) => {
                console.log(`  ${index + 1}. ${fix.description}`);
            });

            // Générer le script de correction
            const fixScript = this.generateFixScript(fixes);
            const scriptPath = path.join(__dirname, 'database-fix-script.sql');
            fs.writeFileSync(scriptPath, fixScript);

            console.log(`\n📄 Script de correction généré: ${scriptPath}`);
            console.log('⚠️  IMPORTANT: Vérifiez le script avant de l\'exécuter !');

        } catch (error) {
            console.error('❌ Erreur lors de la correction:', error);
        } finally {
            await this.pool.end();
        }
    }
}

// Exécuter le script
if (require.main === module) {
    const fixer = new DatabaseFixer();
    fixer.run();
}

module.exports = DatabaseFixer;
