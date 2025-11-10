#!/usr/bin/env node

/**
 * Script d'export des types d'opportunités
 * Exporte depuis la base de données locale vers un fichier JSON
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

// Configuration de la connexion
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function exportOpportunityTypes() {
    try {
        console.log(chalk.yellow.bold('\n╔══════════════════════════════════════════════════════════════╗'));
        console.log(chalk.yellow.bold('║     EXPORT DES TYPES D\'OPPORTUNITÉS                          ║'));
        console.log(chalk.yellow.bold('╚══════════════════════════════════════════════════════════════╝\n'));

        // Connexion
        console.log(chalk.cyan('📡 Connexion à la base de données...'));
        await pool.query('SELECT NOW()');
        console.log(chalk.green(`✓ Connecté à: ${process.env.DB_NAME}`));
        console.log(chalk.gray(`  Hôte: ${process.env.DB_HOST}:${process.env.DB_PORT}\n`));

        // 1. Exporter les types d'opportunités
        console.log(chalk.cyan('📊 Export des types d\'opportunités...'));
        const typesResult = await pool.query(`
            SELECT * FROM opportunity_types 
            ORDER BY created_at
        `);
        console.log(chalk.green(`✓ ${typesResult.rows.length} types d'opportunités trouvés`));

        // 2. Exporter les stages pour chaque type
        console.log(chalk.cyan('📋 Export des stages d\'opportunités...'));
        const stagesResult = await pool.query(`
            SELECT * FROM opportunity_stage_templates 
            ORDER BY opportunity_type_id, stage_order
        `);
        console.log(chalk.green(`✓ ${stagesResult.rows.length} stages trouvés`));

        // 3. Exporter les actions requises
        console.log(chalk.cyan('📝 Export des actions requises...'));
        const actionsResult = await pool.query(`
            SELECT * FROM stage_required_actions 
            ORDER BY stage_template_id, validation_order
        `);
        console.log(chalk.green(`✓ ${actionsResult.rows.length} actions requises trouvées`));

        // 4. Exporter les documents requis
        console.log(chalk.cyan('📄 Export des documents requis...'));
        const documentsResult = await pool.query(`
            SELECT * FROM stage_required_documents 
            ORDER BY stage_template_id
        `);
        console.log(chalk.green(`✓ ${documentsResult.rows.length} documents requis trouvés\n`));

        // Créer la structure de données
        const exportData = {
            exportDate: new Date().toISOString(),
            database: process.env.DB_NAME,
            opportunityTypes: typesResult.rows,
            stageTemplates: stagesResult.rows,
            requiredActions: actionsResult.rows,
            requiredDocuments: documentsResult.rows
        };

        // Sauvegarder dans un fichier JSON
        const exportDir = path.join(__dirname, '../../exports');
        await fs.ensureDir(exportDir);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `opportunity-types-export-${timestamp}.json`;
        const filepath = path.join(exportDir, filename);

        await fs.writeJson(filepath, exportData, { spaces: 2 });

        console.log(chalk.green.bold('✅ EXPORT RÉUSSI!\n'));
        console.log(chalk.white('📁 Fichier créé:'));
        console.log(chalk.cyan(`   ${filepath}\n`));
        
        console.log(chalk.yellow('📤 PROCHAINES ÉTAPES:'));
        console.log(chalk.white('   1. Copiez ce fichier sur votre serveur de production'));
        console.log(chalk.gray('      scp exports/' + filename + ' user@server:~/\n'));
        console.log(chalk.white('   2. Sur le serveur, exécutez:'));
        console.log(chalk.gray('      node scripts/database/import-opportunity-types.js ' + filename + '\n'));

    } catch (error) {
        console.error(chalk.red('❌ Erreur lors de l\'export:'), error);
        throw error;
    } finally {
        await pool.end();
    }
}

exportOpportunityTypes().catch(error => {
    console.error(error);
    process.exit(1);
});










