#!/usr/bin/env node

/**
 * Script d'import des types d'opportunités
 * Importe depuis un fichier JSON vers la base de données de production
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

async function importOpportunityTypes(filename) {
    try {
        console.log(chalk.yellow.bold('\n╔══════════════════════════════════════════════════════════════╗'));
        console.log(chalk.yellow.bold('║     IMPORT DES TYPES D\'OPPORTUNITÉS                          ║'));
        console.log(chalk.yellow.bold('╚══════════════════════════════════════════════════════════════╝\n'));

        // Vérifier le fichier
        if (!filename) {
            console.error(chalk.red('❌ Erreur: Nom de fichier manquant'));
            console.log(chalk.yellow('\nUsage:'));
            console.log(chalk.white('  node scripts/database/import-opportunity-types.js <filename>\n'));
            console.log(chalk.gray('Exemple:'));
            console.log(chalk.gray('  node scripts/database/import-opportunity-types.js opportunity-types-export-2025-11-03.json\n'));
            process.exit(1);
        }

        // Chercher le fichier
        let filepath;
        if (fs.existsSync(filename)) {
            filepath = filename;
        } else if (fs.existsSync(path.join(__dirname, '../../exports', filename))) {
            filepath = path.join(__dirname, '../../exports', filename);
        } else if (fs.existsSync(path.join(process.cwd(), filename))) {
            filepath = path.join(process.cwd(), filename);
        } else {
            console.error(chalk.red(`❌ Fichier introuvable: ${filename}\n`));
            process.exit(1);
        }

        console.log(chalk.cyan(`📂 Lecture du fichier: ${path.basename(filepath)}`));
        const importData = await fs.readJson(filepath);
        console.log(chalk.green('✓ Fichier chargé'));
        console.log(chalk.gray(`  Export du: ${new Date(importData.exportDate).toLocaleString()}`));
        console.log(chalk.gray(`  Base source: ${importData.database}\n`));

        // Connexion
        console.log(chalk.cyan('📡 Connexion à la base de données...'));
        await pool.query('SELECT NOW()');
        console.log(chalk.green(`✓ Connecté à: ${process.env.DB_NAME}`));
        console.log(chalk.gray(`  Hôte: ${process.env.DB_HOST}:${process.env.DB_PORT}\n`));

        // Statistiques
        console.log(chalk.cyan('📊 Contenu du fichier:'));
        console.log(chalk.white(`   Types d'opportunités: ${importData.opportunityTypes.length}`));
        console.log(chalk.white(`   Stages: ${importData.stageTemplates.length}`));
        console.log(chalk.white(`   Actions requises: ${importData.requiredActions.length}`));
        console.log(chalk.white(`   Documents requis: ${importData.requiredDocuments.length}\n`));

        // Confirmation
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise(resolve => {
            rl.question(chalk.yellow('⚠️  Confirmer l\'import dans cette base? (yes/no): '), resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'yes') {
            console.log(chalk.yellow('\n✋ Import annulé\n'));
            return;
        }

        console.log(chalk.cyan('\n🔄 Démarrage de l\'import...\n'));

        // Mapping des anciens IDs vers les nouveaux
        const typeIdMap = new Map();
        const stageIdMap = new Map();

        // Détecter la structure de la table opportunity_types
        console.log(chalk.gray('   → Détection de la structure de la table...'));
        const columnsResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'opportunity_types'
        `);
        const availableColumns = columnsResult.rows.map(r => r.column_name);
        console.log(chalk.gray(`     Colonnes disponibles: ${availableColumns.join(', ')}`));

        // Construire la requête dynamiquement selon les colonnes disponibles
        const columnsToImport = ['code', 'nom', 'description'];
        const optionalColumns = ['default_probability', 'default_amount', 'duree_moyenne_jours', 'is_active', 'created_at', 'updated_at'];
        
        optionalColumns.forEach(col => {
            if (availableColumns.includes(col)) {
                columnsToImport.push(col);
            }
        });

        console.log(chalk.gray(`     Colonnes à importer: ${columnsToImport.join(', ')}\n`));

        // 1. Importer les types d'opportunités
        console.log(chalk.gray('   → Import des types d\'opportunités...'));
        for (const type of importData.opportunityTypes) {
            const oldId = type.id;
            
            // Préparer les valeurs et placeholders dynamiquement
            const values = columnsToImport.map(col => type[col]);
            const placeholders = columnsToImport.map((_, i) => `$${i + 1}`).join(', ');
            const updateSet = columnsToImport
                .filter(col => col !== 'code') // code est la clé unique
                .map(col => `${col} = EXCLUDED.${col}`)
                .join(', ');
            
            const query = `
                INSERT INTO opportunity_types (${columnsToImport.join(', ')})
                VALUES (${placeholders})
                ON CONFLICT (code) DO UPDATE SET ${updateSet}
                RETURNING id
            `;

            const result = await pool.query(query, values);
            typeIdMap.set(oldId, result.rows[0].id);
        }
        console.log(chalk.green(`   ✓ ${importData.opportunityTypes.length} types importés`));

        // 2. Importer les stages
        console.log(chalk.gray('   → Import des stages...'));
        for (const stage of importData.stageTemplates) {
            const oldId = stage.id;
            const newTypeId = typeIdMap.get(stage.opportunity_type_id);

            if (!newTypeId) {
                console.log(chalk.yellow(`   ⚠ Stage ${stage.stage_name} ignoré (type parent non trouvé)`));
                continue;
            }

            const result = await pool.query(`
                INSERT INTO opportunity_stage_templates (
                    opportunity_type_id, stage_name, stage_order, 
                    description, is_mandatory, requires_validation, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `, [
                newTypeId,
                stage.stage_name,
                stage.stage_order,
                stage.description,
                stage.is_mandatory,
                stage.requires_validation,
                stage.created_at,
                stage.updated_at
            ]);

            stageIdMap.set(oldId, result.rows[0].id);
        }
        console.log(chalk.green(`   ✓ ${importData.stageTemplates.length} stages importés`));

        // 3. Importer les actions requises
        console.log(chalk.gray('   → Import des actions requises...'));
        for (const action of importData.requiredActions) {
            const newStageId = stageIdMap.get(action.stage_template_id);

            if (!newStageId) {
                console.log(chalk.yellow(`   ⚠ Action ignorée (stage parent non trouvé)`));
                continue;
            }

            await pool.query(`
                INSERT INTO stage_required_actions (
                    stage_template_id, action_type, is_mandatory, validation_order
                ) VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING
            `, [
                newStageId,
                action.action_type,
                action.is_mandatory,
                action.validation_order
            ]);
        }
        console.log(chalk.green(`   ✓ ${importData.requiredActions.length} actions importées`));

        // 4. Importer les documents requis
        console.log(chalk.gray('   → Import des documents requis...'));
        for (const doc of importData.requiredDocuments) {
            const newStageId = stageIdMap.get(doc.stage_template_id);

            if (!newStageId) {
                console.log(chalk.yellow(`   ⚠ Document ignoré (stage parent non trouvé)`));
                continue;
            }

            await pool.query(`
                INSERT INTO stage_required_documents (
                    stage_template_id, document_type, is_mandatory
                ) VALUES ($1, $2, $3)
                ON CONFLICT DO NOTHING
            `, [
                newStageId,
                doc.document_type,
                doc.is_mandatory
            ]);
        }
        console.log(chalk.green(`   ✓ ${importData.requiredDocuments.length} documents importés\n`));

        console.log(chalk.green.bold('✅ IMPORT TERMINÉ AVEC SUCCÈS!\n'));

    } catch (error) {
        console.error(chalk.red('\n❌ Erreur lors de l\'import:'), error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Récupérer le nom de fichier depuis les arguments
const filename = process.argv[2];
importOpportunityTypes(filename).catch(error => {
    console.error(error);
    process.exit(1);
});

