#!/usr/bin/env node

/**
 * Script de comparaison des structures de base de données
 * Compare la structure locale avec celle de production
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration des bases de données
const LOCAL_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'ebpadfbq_eb_vision_2_0',
    user: 'ebpadfbq_eb_admin20',
    password: '87ifet-Z)&'
};

const PRODUCTION_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'ebpadfbq_eb_vision_2_0',
    user: 'ebpadfbq_eb_admin20',
    password: '87ifet-Z)&'
};

class DatabaseComparator {
    constructor() {
        this.localPool = new Pool(LOCAL_CONFIG);
        this.productionPool = new Pool(PRODUCTION_CONFIG);
    }

    /**
     * Récupérer la structure complète d'une base de données
     */
    async getDatabaseStructure(pool, dbName) {
        console.log(`🔍 Analyse de la structure de ${dbName}...`);
        
        const structure = {
            tables: {},
            constraints: {},
            indexes: {},
            sequences: {}
        };

        try {
            // 1. Récupérer toutes les tables
            const tablesQuery = `
                SELECT 
                    table_name,
                    table_type
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            `;
            const tablesResult = await pool.query(tablesQuery);
            
            for (const table of tablesResult.rows) {
                const tableName = table.table_name;
                console.log(`  📋 Table: ${tableName}`);
                
                // Colonnes de la table
                const columnsQuery = `
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default,
                        character_maximum_length,
                        numeric_precision,
                        numeric_scale
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND table_schema = 'public'
                    ORDER BY ordinal_position;
                `;
                const columnsResult = await pool.query(columnsQuery, [tableName]);
                
                structure.tables[tableName] = {
                    type: table.table_type,
                    columns: columnsResult.rows
                };

                // Contraintes de la table
                const constraintsQuery = `
                    SELECT 
                        tc.constraint_name,
                        tc.constraint_type,
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name,
                        '' as constraint_definition
                    FROM information_schema.table_constraints tc
                    LEFT JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name
                    LEFT JOIN information_schema.constraint_column_usage ccu 
                        ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.table_name = $1 AND tc.table_schema = 'public'
                    ORDER BY tc.constraint_type, tc.constraint_name;
                `;
                const constraintsResult = await pool.query(constraintsQuery, [tableName]);
                
                structure.constraints[tableName] = constraintsResult.rows;

                // Index de la table
                const indexesQuery = `
                    SELECT 
                        indexname,
                        indexdef
                    FROM pg_indexes 
                    WHERE tablename = $1 AND schemaname = 'public'
                    ORDER BY indexname;
                `;
                const indexesResult = await pool.query(indexesQuery, [tableName]);
                
                structure.indexes[tableName] = indexesResult.rows;
            }

            // 2. Récupérer les séquences
            const sequencesQuery = `
                SELECT 
                    sequence_name,
                    data_type,
                    start_value,
                    minimum_value,
                    maximum_value,
                    increment,
                    cycle_option
                FROM information_schema.sequences 
                WHERE sequence_schema = 'public'
                ORDER BY sequence_name;
            `;
            const sequencesResult = await pool.query(sequencesQuery);
            structure.sequences = sequencesResult.rows;

        } catch (error) {
            console.error(`❌ Erreur lors de l'analyse de ${dbName}:`, error.message);
        }

        return structure;
    }

    /**
     * Comparer deux structures de base de données
     */
    compareStructures(localStructure, productionStructure) {
        console.log('\n🔍 COMPARAISON DES STRUCTURES\n');
        
        const differences = {
            missingTables: [],
            extraTables: [],
            tableDifferences: {},
            constraintDifferences: {},
            indexDifferences: {}
        };

        // Comparer les tables
        const localTables = Object.keys(localStructure.tables);
        const productionTables = Object.keys(productionStructure.tables);

        // Tables manquantes en production
        differences.missingTables = localTables.filter(table => 
            !productionTables.includes(table)
        );

        // Tables supplémentaires en production
        differences.extraTables = productionTables.filter(table => 
            !localTables.filter(table => 
                !localTables.includes(table)
            )
        );

        // Comparer les tables communes
        const commonTables = localTables.filter(table => 
            productionTables.includes(table)
        );

        for (const tableName of commonTables) {
            const localTable = localStructure.tables[tableName];
            const productionTable = productionStructure.tables[tableName];

            // Comparer les colonnes
            const localColumns = localTable.columns;
            const productionColumns = productionTable.columns;

            const columnDifferences = this.compareColumns(localColumns, productionColumns);
            if (columnDifferences.length > 0) {
                differences.tableDifferences[tableName] = {
                    columns: columnDifferences
                };
            }

            // Comparer les contraintes
            const localConstraints = localStructure.constraints[tableName] || [];
            const productionConstraints = productionStructure.constraints[tableName] || [];
            
            const constraintDifferences = this.compareConstraints(localConstraints, productionConstraints);
            if (constraintDifferences.length > 0) {
                differences.constraintDifferences[tableName] = constraintDifferences;
            }

            // Comparer les index
            const localIndexes = localStructure.indexes[tableName] || [];
            const productionIndexes = productionStructure.indexes[tableName] || [];
            
            const indexDifferences = this.compareIndexes(localIndexes, productionIndexes);
            if (indexDifferences.length > 0) {
                differences.indexDifferences[tableName] = indexDifferences;
            }
        }

        return differences;
    }

    /**
     * Comparer les colonnes de deux tables
     */
    compareColumns(localColumns, productionColumns) {
        const differences = [];
        
        const localColMap = new Map(localColumns.map(col => [col.column_name, col]));
        const productionColMap = new Map(productionColumns.map(col => [col.column_name, col]));

        // Colonnes manquantes en production
        for (const [colName, localCol] of localColMap) {
            if (!productionColMap.has(colName)) {
                differences.push({
                    type: 'missing_column',
                    column: colName,
                    local: localCol,
                    production: null
                });
            } else {
                const productionCol = productionColMap.get(colName);
                const colDiff = this.compareColumnDefinition(localCol, productionCol);
                if (colDiff) {
                    differences.push({
                        type: 'column_difference',
                        column: colName,
                        ...colDiff
                    });
                }
            }
        }

        // Colonnes supplémentaires en production
        for (const [colName, productionCol] of productionColMap) {
            if (!localColMap.has(colName)) {
                differences.push({
                    type: 'extra_column',
                    column: colName,
                    local: null,
                    production: productionCol
                });
            }
        }

        return differences;
    }

    /**
     * Comparer la définition d'une colonne
     */
    compareColumnDefinition(localCol, productionCol) {
        const differences = {};

        if (localCol.data_type !== productionCol.data_type) {
            differences.data_type = {
                local: localCol.data_type,
                production: productionCol.data_type
            };
        }

        if (localCol.is_nullable !== productionCol.is_nullable) {
            differences.is_nullable = {
                local: localCol.is_nullable,
                production: productionCol.is_nullable
            };
        }

        if (localCol.column_default !== productionCol.column_default) {
            differences.column_default = {
                local: localCol.column_default,
                production: productionCol.column_default
            };
        }

        return Object.keys(differences).length > 0 ? differences : null;
    }

    /**
     * Comparer les contraintes
     */
    compareConstraints(localConstraints, productionConstraints) {
        const differences = [];
        
        const localConstraintMap = new Map(localConstraints.map(c => [c.constraint_name, c]));
        const productionConstraintMap = new Map(productionConstraints.map(c => [c.constraint_name, c]));

        // Contraintes manquantes en production
        for (const [constraintName, localConstraint] of localConstraintMap) {
            if (!productionConstraintMap.has(constraintName)) {
                differences.push({
                    type: 'missing_constraint',
                    constraint: constraintName,
                    local: localConstraint,
                    production: null
                });
            }
        }

        // Contraintes supplémentaires en production
        for (const [constraintName, productionConstraint] of productionConstraintMap) {
            if (!localConstraintMap.has(constraintName)) {
                differences.push({
                    type: 'extra_constraint',
                    constraint: constraintName,
                    local: null,
                    production: productionConstraint
                });
            }
        }

        return differences;
    }

    /**
     * Comparer les index
     */
    compareIndexes(localIndexes, productionIndexes) {
        const differences = [];
        
        const localIndexMap = new Map(localIndexes.map(i => [i.indexname, i]));
        const productionIndexMap = new Map(productionIndexes.map(i => [i.indexname, i]));

        // Index manquants en production
        for (const [indexName, localIndex] of localIndexMap) {
            if (!productionIndexMap.has(indexName)) {
                differences.push({
                    type: 'missing_index',
                    index: indexName,
                    local: localIndex,
                    production: null
                });
            }
        }

        // Index supplémentaires en production
        for (const [indexName, productionIndex] of productionIndexMap) {
            if (!localIndexMap.has(indexName)) {
                differences.push({
                    type: 'extra_index',
                    index: indexName,
                    local: null,
                    production: productionIndex
                });
            }
        }

        return differences;
    }

    /**
     * Générer un rapport de comparaison
     */
    generateReport(differences) {
        const report = [];
        
        report.push('# RAPPORT DE COMPARAISON DES BASES DE DONNÉES\n');
        report.push(`Généré le: ${new Date().toISOString()}\n`);

        // Tables manquantes
        if (differences.missingTables.length > 0) {
            report.push('## 🚨 TABLES MANQUANTES EN PRODUCTION\n');
            differences.missingTables.forEach(table => {
                report.push(`- **${table}**`);
            });
            report.push('');
        }

        // Tables supplémentaires
        if (differences.extraTables.length > 0) {
            report.push('## ⚠️ TABLES SUPPLÉMENTAIRES EN PRODUCTION\n');
            differences.extraTables.forEach(table => {
                report.push(`- **${table}**`);
            });
            report.push('');
        }

        // Différences de colonnes
        if (Object.keys(differences.tableDifferences).length > 0) {
            report.push('## 🔍 DIFFÉRENCES DE COLONNES\n');
            for (const [tableName, tableDiff] of Object.entries(differences.tableDifferences)) {
                report.push(`### Table: ${tableName}\n`);
                tableDiff.columns.forEach(diff => {
                    switch (diff.type) {
                        case 'missing_column':
                            report.push(`- **Colonne manquante**: \`${diff.column}\``);
                            report.push(`  - Type: ${diff.local.data_type}`);
                            report.push(`  - Nullable: ${diff.local.is_nullable}`);
                            report.push(`  - Default: ${diff.local.column_default || 'NULL'}`);
                            break;
                        case 'extra_column':
                            report.push(`- **Colonne supplémentaire**: \`${diff.column}\``);
                            report.push(`  - Type: ${diff.production.data_type}`);
                            report.push(`  - Nullable: ${diff.production.is_nullable}`);
                            report.push(`  - Default: ${diff.production.column_default || 'NULL'}`);
                            break;
                        case 'column_difference':
                            report.push(`- **Différence de colonne**: \`${diff.column}\``);
                            Object.entries(diff).forEach(([key, value]) => {
                                if (key !== 'type' && key !== 'column') {
                                    report.push(`  - ${key}: Local=${value.local}, Production=${value.production}`);
                                }
                            });
                            break;
                    }
                    report.push('');
                });
            }
        }

        // Différences de contraintes
        if (Object.keys(differences.constraintDifferences).length > 0) {
            report.push('## 🔒 DIFFÉRENCES DE CONTRAINTES\n');
            for (const [tableName, constraintDiffs] of Object.entries(differences.constraintDifferences)) {
                report.push(`### Table: ${tableName}\n`);
                constraintDiffs.forEach(diff => {
                    switch (diff.type) {
                        case 'missing_constraint':
                            report.push(`- **Contrainte manquante**: \`${diff.constraint}\``);
                            report.push(`  - Type: ${diff.local.constraint_type}`);
                            report.push(`  - Définition: ${diff.local.constraint_definition}`);
                            break;
                        case 'extra_constraint':
                            report.push(`- **Contrainte supplémentaire**: \`${diff.constraint}\``);
                            report.push(`  - Type: ${diff.production.constraint_type}`);
                            report.push(`  - Définition: ${diff.production.constraint_definition}`);
                            break;
                    }
                    report.push('');
                });
            }
        }

        // Différences d'index
        if (Object.keys(differences.indexDifferences).length > 0) {
            report.push('## 📊 DIFFÉRENCES D\'INDEX\n');
            for (const [tableName, indexDiffs] of Object.entries(differences.indexDifferences)) {
                report.push(`### Table: ${tableName}\n`);
                indexDiffs.forEach(diff => {
                    switch (diff.type) {
                        case 'missing_index':
                            report.push(`- **Index manquant**: \`${diff.index}\``);
                            report.push(`  - Définition: ${diff.local.indexdef}`);
                            break;
                        case 'extra_index':
                            report.push(`- **Index supplémentaire**: \`${diff.index}\``);
                            report.push(`  - Définition: ${diff.production.indexdef}`);
                            break;
                    }
                    report.push('');
                });
            }
        }

        return report.join('\n');
    }

    /**
     * Exécuter la comparaison complète
     */
    async run() {
        try {
            console.log('🚀 Début de la comparaison des structures de base de données...\n');

            // Analyser les deux bases
            const localStructure = await this.getDatabaseStructure(this.localPool, 'LOCAL');
            const productionStructure = await this.getDatabaseStructure(this.productionPool, 'PRODUCTION');

            // Comparer les structures
            const differences = this.compareStructures(localStructure, productionStructure);

            // Générer le rapport
            const report = this.generateReport(differences);

            // Sauvegarder le rapport
            const reportPath = path.join(__dirname, 'database-comparison-report.md');
            fs.writeFileSync(reportPath, report);

            console.log('\n✅ Comparaison terminée !');
            console.log(`📄 Rapport sauvegardé: ${reportPath}`);

            // Afficher un résumé
            const totalDifferences = 
                differences.missingTables.length +
                differences.extraTables.length +
                Object.keys(differences.tableDifferences).length +
                Object.keys(differences.constraintDifferences).length +
                Object.keys(differences.indexDifferences).length;

            if (totalDifferences === 0) {
                console.log('🎉 Aucune différence trouvée ! Les structures sont identiques.');
            } else {
                console.log(`⚠️ ${totalDifferences} différence(s) trouvée(s).`);
                console.log('📋 Consultez le rapport pour plus de détails.');
            }

        } catch (error) {
            console.error('❌ Erreur lors de la comparaison:', error);
        } finally {
            await this.localPool.end();
            await this.productionPool.end();
        }
    }
}

// Exécuter le script
if (require.main === module) {
    const comparator = new DatabaseComparator();
    comparator.run();
}

module.exports = DatabaseComparator;
