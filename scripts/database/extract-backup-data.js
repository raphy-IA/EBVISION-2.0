#!/usr/bin/env node
/**
 * Script pour extraire les données du backup SQL et les convertir en JSON
 */

const fs = require('fs');
const path = require('path');

function parseCopyData(content, tableName) {
    const pattern = new RegExp(`COPY public\\.${tableName}.*?FROM stdin;([\\s\\S]*?)\\\\\\.`, 'm');
    const match = content.match(pattern);
    
    if (!match) {
        return [];
    }
    
    const dataBlock = match[1].trim();
    const lines = dataBlock.split('\n').map(l => l.trim()).filter(l => l);
    
    return lines;
}

function parseTsvLine(line) {
    const parts = line.split('\t');
    return parts.map(p => p === '\\N' ? null : p);
}

function extractCompaniesAndSources(backupPath) {
    console.log('📖 Lecture du backup SQL...');
    const content = fs.readFileSync(backupPath, 'utf-8');
    
    // Extraire les sources
    console.log('🏢 Extraction des sources...');
    const sourcesLines = parseCopyData(content, 'company_sources');
    const sources = [];
    const sourceIdMap = {};
    
    for (const line of sourcesLines) {
        const parts = parseTsvLine(line);
        if (parts.length >= 4) {
            const sourceId = parts[0];
            const sourceName = parts[1];
            sourceIdMap[sourceId] = sourceName;
            sources.push({
                name: sourceName,
                description: parts[2] || ''
            });
        }
    }
    
    console.log(`   ✓ ${sources.length} sources extraites`);
    
    // Extraire les entreprises
    console.log('🏢 Extraction des entreprises...');
    const companiesLines = parseCopyData(content, 'companies');
    const companies = [];
    
    for (const line of companiesLines) {
        const parts = parseTsvLine(line);
        if (parts.length >= 14) {
            // Format: id, source_id, name, industry, email, phone, website, country, city, address, siret, size_label, created_at, updated_at, sigle
            const sourceId = parts[1];
            const sourceName = sourceIdMap[sourceId] || 'SOURCES -EB GROUP';
            
            companies.push({
                nom: parts[2],
                sigle: parts.length > 14 && parts[14] ? parts[14] : parts[2],
                source: sourceName,
                secteur_activite: parts[3] || '',
                pays: parts[7] || '',
                ville: parts[8] || '',
                adresse: parts[9] || '',
                telephone: parts[5] || '',
                email: parts[4] || '',
                site_web: parts[6] || ''
            });
        }
    }
    
    console.log(`   ✓ ${companies.length} entreprises extraites (limitées à 100)`);
    
    return {
        sources: sources,
        companies: companies.slice(0, 100) // Limiter à 100 entreprises
    };
}

function extractOpportunityTypes(backupPath) {
    const content = fs.readFileSync(backupPath, 'utf-8');
    
    // Extraire les types d'opportunités
    console.log('🎯 Extraction des types d\'opportunités...');
    const typesLines = parseCopyData(content, 'opportunity_types');
    const typesDict = {};
    
    for (const line of typesLines) {
        const parts = parseTsvLine(line);
        if (parts.length >= 11) {
            // Format: id, name, description, default_probability, default_duration_days, is_active, created_at, updated_at, nom, code, couleur
            const typeId = parts[0];
            const typeName = parts[1];
            
            // Exclure les types de test
            if (typeName && !typeName.toLowerCase().includes('test')) {
                typesDict[typeId] = {
                    type: {
                        name: typeName,
                        code: parts[9] || typeName,
                        description: parts[2] || '',
                        default_probability: parts[3] ? parseInt(parts[3]) : 50,
                        default_duration_days: parts[4] ? parseInt(parts[4]) : 30,
                        couleur: parts[10] || null
                    },
                    stages: []
                };
            }
        }
    }
    
    console.log(`   ✓ ${Object.keys(typesDict).length} types extraits`);
    
    // Extraire les étapes
    console.log('📋 Extraction des étapes...');
    const stagesLines = parseCopyData(content, 'opportunity_stage_templates');
    
    for (const line of stagesLines) {
        const parts = parseTsvLine(line);
        if (parts.length >= 13) {
            // Format: id, opportunity_type_id, stage_name, stage_order, description, required_documents, required_actions, max_duration_days, min_duration_days, is_mandatory, validation_required, ...
            const typeId = parts[1];
            
            if (typesDict[typeId]) {
                let requiredDocs = [];
                let requiredActions = [];
                
                try {
                    if (parts[5] && parts[5] !== '[]') {
                        requiredDocs = JSON.parse(parts[5]);
                    }
                } catch (e) {
                    console.warn(`   ⚠️  Erreur parsing required_documents: ${parts[5]}`);
                }
                
                try {
                    if (parts[6] && parts[6] !== '[]') {
                        requiredActions = JSON.parse(parts[6]);
                    }
                } catch (e) {
                    console.warn(`   ⚠️  Erreur parsing required_actions: ${parts[6]}`);
                }
                
                const stage = {
                    stage_name: parts[2],
                    stage_order: parseInt(parts[3]),
                    description: parts[4] || '',
                    required_documents: requiredDocs,
                    required_actions: requiredActions,
                    max_duration_days: parts[7] ? parseInt(parts[7]) : 10,
                    min_duration_days: parts[8] ? parseInt(parts[8]) : 1,
                    is_mandatory: parts[9] === 't',
                    validation_required: parts[11] === 't'
                };
                
                typesDict[typeId].stages.push(stage);
            }
        }
    }
    
    // Trier les étapes par stage_order et filtrer les types sans étapes
    const validTypes = [];
    for (const typeData of Object.values(typesDict)) {
        typeData.stages.sort((a, b) => a.stage_order - b.stage_order);
        if (typeData.stages.length > 0) {
            validTypes.push(typeData);
        }
    }
    
    const totalStages = validTypes.reduce((sum, t) => sum + t.stages.length, 0);
    console.log(`   ✓ ${validTypes.length} types avec ${totalStages} étapes valides`);
    
    return { opportunityTypes: validTypes };
}

function main() {
    const backupPath = path.resolve(__dirname, '../../backups/Backup Pure/backup_BD_reference.sql');
    const outputDir = path.resolve(__dirname, 'data');
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     EXTRACTION DES DONNÉES DU BACKUP SQL                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    try {
        // Extraire et sauvegarder les entreprises et sources
        const companiesData = extractCompaniesAndSources(backupPath);
        
        const companiesFile = path.join(outputDir, 'companies-and-sources.json');
        fs.writeFileSync(companiesFile, JSON.stringify(companiesData, null, 2), 'utf-8');
        console.log(`   📁 Sauvegardé: ${companiesFile}\n`);
        
        // Extraire et sauvegarder les types d'opportunités
        const opportunitiesData = extractOpportunityTypes(backupPath);
        
        const opportunitiesFile = path.join(outputDir, 'opportunity-types-config.json');
        fs.writeFileSync(opportunitiesFile, JSON.stringify(opportunitiesData, null, 2), 'utf-8');
        console.log(`   📁 Sauvegardé: ${opportunitiesFile}\n`);
        
        console.log('✅ Extraction terminée avec succès!\n');
        
    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error(error);
        process.exit(1);
    }
}

main();
