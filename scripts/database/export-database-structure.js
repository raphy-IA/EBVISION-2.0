#!/usr/bin/env node

/**
 * Script d'export de la structure de base de données
 * Exporte la structure complète d'une base de données vers un fichier JSON
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration des bases de données - utilise la configuration existante
const LOCAL_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'ebpadfbq_eb_vision_2_0',
    user: 'ebpadfbq_eb_admin20',
    password: '87ifet-Z)&'
};

// Pour la production, utilisez les mêmes paramètres ou modifiez selon vos besoins
const PRODUCTION_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'ebpadfbq_eb_vision_2_0',
    user: 'ebpadfbq_eb_admin20',
    password: '87ifet-Z)&'
};

class DatabaseExporter {
    constructor(config, dbName) {
        this.pool = new Pool(config);
        this.dbName = dbName;
    }

    /**
     * Exporter la structure complète de la base de données
     */
    async exportStructure() {
        console.log(`🔍 Export de la structure de ${this.dbName}...`);
        
        const structure = {
            database: this.dbName,
            exported_at: new Date().toISOString(),
            tables: {},
            sequences: {},
            functions: {},
            views: {}
        };

        try {
            // 1. Exporter les tables
            await this.exportTables(structure);
            
            // 2. Exporter les séquences
            await this.exportSequences(structure);
            
            // 3. Exporter les fonctions
            await this.exportFunctions(structure);
            
            // 4. Exporter les vues
            await this.exportViews(structure);

            return structure;

        } catch (error) {
            console.error(`❌ Erreur lors de l'export de ${this.dbName}:`, error.message);
            throw error;
        }
    }

    /**
     * Exporter les tables
     */
    async exportTables(structure) {
        const tablesQuery = `
            SELECT 
                table_name,
                table_type
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;
        const tablesResult = await this.pool.query(tablesQuery);
        
        for (const table of tablesResult.rows) {
            const tableName = table.table_name;
            console.log(`  📋 Table: ${tableName}`);
            
            // Colonnes
            const columnsQuery = `
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale,
                    ordinal_position
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position;
            `;
            const columnsResult = await this.pool.query(columnsQuery, [tableName]);
            
            // Contraintes
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
            const constraintsResult = await this.pool.query(constraintsQuery, [tableName]);
            
            // Index
            const indexesQuery = `
                SELECT 
                    indexname,
                    indexdef
                FROM pg_indexes 
                WHERE tablename = $1 AND schemaname = 'public'
                ORDER BY indexname;
            `;
            const indexesResult = await this.pool.query(indexesQuery, [tableName]);
            
            // Triggers
            const triggersQuery = `
                SELECT 
                    trigger_name,
                    event_manipulation,
                    action_timing,
                    action_statement
                FROM information_schema.triggers 
                WHERE event_object_table = $1 AND event_object_schema = 'public'
                ORDER BY trigger_name;
            `;
            const triggersResult = await this.pool.query(triggersQuery, [tableName]);

            structure.tables[tableName] = {
                type: table.table_type,
                columns: columnsResult.rows,
                constraints: constraintsResult.rows,
                indexes: indexesResult.rows,
                triggers: triggersResult.rows
            };
        }
    }

    /**
     * Exporter les séquences
     */
    async exportSequences(structure) {
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
        const sequencesResult = await this.pool.query(sequencesQuery);
        structure.sequences = sequencesResult.rows;
    }

    /**
     * Exporter les fonctions
     */
    async exportFunctions(structure) {
        const functionsQuery = `
            SELECT 
                routine_name,
                routine_type,
                data_type,
                routine_definition
            FROM information_schema.routines 
            WHERE routine_schema = 'public'
            ORDER BY routine_name;
        `;
        const functionsResult = await this.pool.query(functionsQuery);
        structure.functions = functionsResult.rows;
    }

    /**
     * Exporter les vues
     */
    async exportViews(structure) {
        const viewsQuery = `
            SELECT 
                table_name,
                view_definition
            FROM information_schema.views 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;
        const viewsResult = await this.pool.query(viewsQuery);
        structure.views = viewsResult.rows;
    }

    /**
     * Sauvegarder la structure dans un fichier
     */
    async saveToFile(structure, filename) {
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, JSON.stringify(structure, null, 2));
        console.log(`📄 Structure sauvegardée: ${filePath}`);
        return filePath;
    }

    /**
     * Fermer la connexion
     */
    async close() {
        await this.pool.end();
    }
}

/**
 * Exporter la structure locale
 */
async function exportLocal() {
    const exporter = new DatabaseExporter(LOCAL_CONFIG, 'LOCAL');
    try {
        const structure = await exporter.exportStructure();
        await exporter.saveToFile(structure, 'database-structure-local.json');
        console.log('✅ Export local terminé');
    } finally {
        await exporter.close();
    }
}

/**
 * Exporter la structure de production
 */
async function exportProduction() {
    const exporter = new DatabaseExporter(PRODUCTION_CONFIG, 'PRODUCTION');
    try {
        const structure = await exporter.exportStructure();
        await exporter.saveToFile(structure, 'database-structure-production.json');
        console.log('✅ Export production terminé');
    } finally {
        await exporter.close();
    }
}

/**
 * Exporter les deux structures
 */
async function exportBoth() {
    console.log('🚀 Export des structures de base de données...\n');
    
    await exportLocal();
    console.log('');
    await exportProduction();
    
    console.log('\n🎉 Export terminé !');
    console.log('📁 Fichiers générés:');
    console.log('  - database-structure-local.json');
    console.log('  - database-structure-production.json');
}

// Exécuter le script
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--local')) {
        exportLocal();
    } else if (args.includes('--production')) {
        exportProduction();
    } else {
        exportBoth();
    }
}

module.exports = { DatabaseExporter, exportLocal, exportProduction, exportBoth };
