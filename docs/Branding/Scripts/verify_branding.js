#!/usr/bin/env node
/**
 * Script de Vérification Complète du Branding - EB-Vision 2.0
 * ===========================================================
 * 
 * Version Node.js du script de vérification
 * 
 * Usage:
 *   node verify_branding.js [options]
 *   npm run verify [options]
 * 
 * Options:
 *   -v, --verbose    Mode verbeux
 *   --fix            Correction automatique
 * 
 * @author EB-Vision Team
 * @version 2.0.0
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
    verbose: false,
    autoFix: false,
    results: {
        success: 0,
        warnings: 0,
        errors: 0,
        messages: {
            errors: [],
            warnings: []
        }
    }
};

// Chemins
const getProjectRoot = () => path.resolve(__dirname, '../../..');

const PATHS = {
    root: getProjectRoot(),
    env: path.join(getProjectRoot(), '.env'),
    branding: path.join(getProjectRoot(), 'config', 'branding'),
    assets: path.join(getProjectRoot(), 'public', 'assets', 'brands'),
    src: {
        service: path.join(getProjectRoot(), 'src', 'services', 'brandingService.js'),
        routes: path.join(getProjectRoot(), 'src', 'routes', 'branding.js'),
        loaderFront: path.join(getProjectRoot(), 'public', 'js', 'branding-loader.js'),
        sidebarFront: path.join(getProjectRoot(), 'public', 'js', 'sidebar-branding.js'),
        cssVars: path.join(getProjectRoot(), 'config', 'themes', 'brand-variables.css')
    },
    docs: {
        main: path.join(getProjectRoot(), 'docs', 'Branding', 'README.md'),
        startHere: path.join(getProjectRoot(), 'docs', 'Branding', 'START-HERE.md'),
        reference: path.join(getProjectRoot(), 'docs', 'Branding', 'REFERENCE-RAPIDE.md'),
        guide: path.join(getProjectRoot(), 'docs', 'Branding', 'Guides', 'LISEZ-MOI-EN-PREMIER.md'),
        configGuide: path.join(getProjectRoot(), 'config', 'branding', 'README.md')
    }
};

// Utilitaires d'affichage
const log = {
    header: (text) => {
        console.log('\n' + chalk.cyan.bold('='.repeat(70)));
        console.log(chalk.cyan.bold(text.padStart(35 + text.length / 2).padEnd(70)));
        console.log(chalk.cyan.bold('='.repeat(70)) + '\n');
    },
    section: (text) => {
        console.log('\n' + chalk.yellow.bold(text));
        console.log(chalk.yellow('-'.repeat(text.length)));
    },
    success: (text) => {
        console.log(chalk.green('✓ ' + text));
        CONFIG.results.success++;
    },
    error: (text) => {
        console.log(chalk.red('✗ ' + text));
        CONFIG.results.errors++;
        CONFIG.results.messages.errors.push(text);
    },
    warning: (text) => {
        console.log(chalk.yellow('⚠ ' + text));
        CONFIG.results.warnings++;
        CONFIG.results.messages.warnings.push(text);
    },
    info: (text) => {
        if (CONFIG.verbose) {
            console.log(chalk.blue('ℹ ' + text));
        }
    }
};

// Lire le fichier .env
const readEnvFile = async () => {
    try {
        if (!await fs.pathExists(PATHS.env)) {
            return {};
        }
        const content = await fs.readFile(PATHS.env, 'utf-8');
        const env = {};
        
        content.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#') && line.includes('=')) {
                const [key, ...valueParts] = line.split('=');
                env[key.trim()] = valueParts.join('=').trim();
            }
        });
        
        return env;
    } catch (error) {
        return {};
    }
};

// Écrire le fichier .env
const writeEnvFile = async (env) => {
    try {
        const lines = Object.entries(env).map(([key, value]) => `${key}=${value}`);
        await fs.writeFile(PATHS.env, lines.join('\n') + '\n', 'utf-8');
        return true;
    } catch (error) {
        return false;
    }
};

// Vérification 1: Structure du projet
const verifyProjectStructure = async () => {
    log.section('1. STRUCTURE DU PROJET');
    
    // package.json
    const packageJson = path.join(PATHS.root, 'package.json');
    if (await fs.pathExists(packageJson)) {
        log.success('package.json trouvé');
        log.info(`   Chemin: ${packageJson}`);
    } else {
        log.error('package.json introuvable - Mauvais répertoire?');
        return false;
    }
    
    // config/branding
    if (await fs.pathExists(PATHS.branding) && (await fs.stat(PATHS.branding)).isDirectory()) {
        log.success('Dossier config/branding/ existe');
        
        const files = await fs.readdir(PATHS.branding);
        const configs = files.filter(f => f.endsWith('.json') && f !== 'client-template.json');
        log.info(`   ${configs.length} configurations trouvées`);
    } else {
        log.error('Dossier config/branding/ introuvable');
        return false;
    }
    
    // Dossiers source
    const requiredDirs = [
        [path.join(PATHS.root, 'src', 'services'), 'Services backend'],
        [path.join(PATHS.root, 'src', 'routes'), 'Routes API'],
        [path.join(PATHS.root, 'public', 'js'), 'JavaScript frontend'],
        [PATHS.assets, 'Assets de branding']
    ];
    
    for (const [dir, description] of requiredDirs) {
        if (await fs.pathExists(dir)) {
            log.success(`${description}: ${path.relative(PATHS.root, dir)}`);
        } else {
            log.warning(`${description} manquant: ${path.relative(PATHS.root, dir)}`);
        }
    }
    
    return true;
};

// Vérification 2: Fichier .env
const verifyEnvFile = async () => {
    log.section('2. FICHIER .ENV');
    
    if (!await fs.pathExists(PATHS.env)) {
        log.error('Fichier .env introuvable');
        
        if (CONFIG.autoFix) {
            log.info('Création du fichier .env...');
            await fs.writeFile(PATHS.env, 'BRAND_CONFIG=default\n', 'utf-8');
            log.success('Fichier .env créé avec BRAND_CONFIG=default');
            return [true, 'default'];
        }
        return [false, null];
    }
    
    log.success('Fichier .env existe');
    
    const env = await readEnvFile();
    const brandConfig = env.BRAND_CONFIG;
    
    if (brandConfig) {
        log.success(`BRAND_CONFIG trouvé: ${brandConfig}`);
        log.info(`   Chemin: ${PATHS.env}`);
        return [true, brandConfig];
    } else {
        log.error('BRAND_CONFIG non défini dans .env');
        
        if (CONFIG.autoFix) {
            log.info('Ajout de BRAND_CONFIG=default...');
            env.BRAND_CONFIG = 'default';
            await writeEnvFile(env);
            log.success('BRAND_CONFIG ajouté');
            return [true, 'default'];
        }
        return [false, null];
    }
};

// Vérification 3: Fichier de configuration
const verifyConfigFile = async (configId) => {
    log.section('3. FICHIER DE CONFIGURATION');
    
    const configFile = path.join(PATHS.branding, `${configId}.json`);
    
    if (!await fs.pathExists(configFile)) {
        log.error(`Fichier de configuration introuvable: ${configId}.json`);
        log.info(`   Chemin recherché: ${configFile}`);
        return [false, null];
    }
    
    log.success(`Fichier de configuration existe: ${configId}.json`);
    
    try {
        const configData = await fs.readJson(configFile);
        log.success('JSON valide');
        
        // Vérifier les champs (format flexible pour supporter les deux structures)
        const name = configData.name || configData.app?.name;
        const tagline = configData.tagline || configData.app?.tagline;
        const colors = configData.colors || configData.branding?.colors;
        const footer = configData.footer || configData.ui?.footer;
        
        if (name) {
            log.success('Nom de l\'application: ✓');
            if (CONFIG.verbose) log.info(`   Valeur: ${name}`);
        } else {
            log.warning('Nom de l\'application: manquant');
        }
        
        if (tagline) {
            log.success('Slogan: ✓');
        } else {
            log.warning('Slogan: manquant');
        }
        
        if (colors) {
            log.success('Couleurs: ✓');
            
            const colorFields = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'];
            const missingColors = colorFields.filter(c => !colors[c]);
            
            if (missingColors.length > 0) {
                log.warning(`Couleurs manquantes: ${missingColors.join(', ')}`);
            } else {
                log.success(`Toutes les couleurs définies (${colorFields.length})`);
            }
        } else {
            log.warning('Couleurs: manquantes');
        }
        
        if (footer) {
            log.success('Footer: ✓');
        } else {
            log.warning('Footer: manquant');
        }
        
        return [true, configData];
    } catch (error) {
        log.error(`JSON invalide: ${error.message}`);
        return [false, null];
    }
};

// Vérification 4: Assets
const verifyAssets = async (configId) => {
    log.section('4. ASSETS DE BRANDING');
    
    // Extraire l'ID simple
    const baseId = configId.includes('-') && !isNaN(configId.split('-').pop())
        ? configId.substring(0, configId.lastIndexOf('-'))
        : configId;
    
    const assetsDir = path.join(PATHS.assets, baseId);
    
    if (!await fs.pathExists(assetsDir)) {
        log.warning(`Dossier assets introuvable: ${baseId}/`);
        log.info('   Les assets sont optionnels (FontAwesome utilisé par défaut)');
        
        if (CONFIG.autoFix) {
            log.info('Création du dossier assets...');
            await fs.ensureDir(assetsDir);
            const readme = path.join(assetsDir, 'README.md');
            await fs.writeFile(readme, `# Assets pour ${configId}\n\nPlacez ici vos logos personnalisés.\n`);
            log.success(`Dossier créé: ${assetsDir}`);
        }
        return true;
    }
    
    log.success(`Dossier assets existe: ${baseId}/`);
    
    const logoExtensions = ['.svg', '.png', '.jpg', '.jpeg', '.ico', '.webp'];
    const files = await fs.readdir(assetsDir);
    const logoFiles = files.filter(f => logoExtensions.some(ext => f.toLowerCase().endsWith(ext)));
    
    if (logoFiles.length > 0) {
        log.success(`${logoFiles.length} logo(s) trouvé(s)`);
        if (CONFIG.verbose) {
            for (const logo of logoFiles) {
                const stats = await fs.stat(path.join(assetsDir, logo));
                log.info(`   - ${logo} (${stats.size} bytes)`);
            }
        }
    } else {
        log.info('   Aucun logo personnalisé (utilise FontAwesome)');
    }
    
    return true;
};

// Vérification 5: Fichiers source
const verifySourceFiles = async () => {
    log.section('5. FICHIERS SOURCE');
    
    const sourceFiles = {
        'src/services/brandingService.js': PATHS.src.service,
        'src/routes/branding.js': PATHS.src.routes,
        'public/js/branding-loader.js': PATHS.src.loaderFront,
        'public/js/sidebar-branding.js': PATHS.src.sidebarFront,
        'config/themes/brand-variables.css': PATHS.src.cssVars
    };
    
    let allPresent = true;
    
    for (const [desc, filePath] of Object.entries(sourceFiles)) {
        if (await fs.pathExists(filePath)) {
            log.success(`${desc}: ✓`);
            if (CONFIG.verbose) {
                const stats = await fs.stat(filePath);
                log.info(`   Taille: ${stats.size} bytes`);
            }
        } else {
            log.error(`${desc}: manquant`);
            allPresent = false;
        }
    }
    
    return allPresent;
};

// Vérification 6: Serveur Node.js
const verifyServer = async () => {
    log.section('6. SERVEUR NODE.JS');
    
    try {
        let pids = [];
        
        if (process.platform === 'win32') {
            const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH');
            if (stdout.includes('node.exe')) {
                log.success('Serveur Node.js en cours d\'exécution');
                const lines = stdout.split('\n').filter(l => l.includes('node.exe'));
                lines.forEach(line => {
                    const match = line.match(/"(\d+)"/);
                    if (match) pids.push(match[1]);
                });
                if (pids.length > 0) {
                    log.info(`   PID(s): ${pids.join(', ')}`);
                }
                return [true, pids];
            }
        } else {
            try {
                const { stdout } = await execAsync('pgrep -f node');
                pids = stdout.trim().split('\n').filter(p => p);
                if (pids.length > 0) {
                    log.success('Serveur Node.js en cours d\'exécution');
                    log.info(`   PID(s): ${pids.join(', ')}`);
                    return [true, pids];
                }
            } catch (err) {
                // pgrep retourne 1 si aucun processus trouvé
            }
        }
        
        log.warning('Aucun serveur Node.js en cours');
        log.info('   Démarrez avec: npm start');
        return [false, []];
    } catch (error) {
        log.warning(`Impossible de vérifier le serveur: ${error.message}`);
        return [false, []];
    }
};

// Vérification 7: API de branding
const verifyAPI = async (configData) => {
    log.section('7. API DE BRANDING');
    
    const url = 'http://localhost:3000/api/branding/config';
    
    try {
        log.info(`Test de l'API: ${url}`);
        const response = await axios.get(url, { timeout: 5000 });
        
        if (response.status === 200) {
            log.success('API accessible (HTTP 200)');
            
            const data = response.data;
            
            if (data.data) {
                const apiConfig = data.data;
                const appName = apiConfig.app?.name || apiConfig.name || 'N/A';
                
                log.success(`Nom de l'application: ${appName}`);
                
                // Comparer avec la configuration attendue
                if (configData) {
                    const expectedName = configData.name || configData.app?.name;
                    if (expectedName && appName === expectedName) {
                        log.success('✓ Configuration correcte!');
                    } else if (expectedName) {
                        log.warning(`Configuration différente (attendu: ${expectedName})`);
                        log.info('   → Redémarrez le serveur si vous avez modifié .env');
                    }
                }
                
                if (CONFIG.verbose && apiConfig.app) {
                    log.info(`   ID: ${apiConfig.app.id || 'N/A'}`);
                    log.info(`   Tagline: ${apiConfig.app.tagline || 'N/A'}`);
                }
                
                return true;
            } else {
                log.error('Format de réponse incorrect');
                return false;
            }
        } else {
            log.error(`Erreur HTTP ${response.status}`);
            return false;
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            log.error('Impossible de se connecter à l\'API');
            log.info('   → Le serveur est-il démarré? (npm start)');
        } else if (error.code === 'ECONNABORTED') {
            log.error('Timeout lors de la connexion à l\'API');
        } else {
            log.error(`Erreur lors du test de l'API: ${error.message}`);
        }
        return false;
    }
};

// Vérification 8: Documentation
const verifyDocumentation = async () => {
    log.section('8. DOCUMENTATION');
    
    const docFiles = {
        'Index principal': PATHS.docs.main,
        'Démarrage rapide': PATHS.docs.startHere,
        'Référence rapide': PATHS.docs.reference,
        'Guide démarrage': PATHS.docs.guide,
        'Guide configurations': PATHS.docs.configGuide
    };
    
    let allPresent = true;
    
    for (const [desc, filePath] of Object.entries(docFiles)) {
        if (await fs.pathExists(filePath)) {
            log.success(`${desc}: ✓`);
        } else {
            log.warning(`${desc}: manquant`);
            allPresent = false;
        }
    }
    
    return allPresent;
};

// Résumé
const displaySummary = () => {
    log.header('RÉSUMÉ DE LA VÉRIFICATION');
    
    console.log(chalk.green(`✓ Succès: ${CONFIG.results.success}`));
    console.log(chalk.yellow(`⚠ Avertissements: ${CONFIG.results.warnings}`));
    console.log(chalk.red(`✗ Erreurs: ${CONFIG.results.errors}`));
    
    if (CONFIG.results.messages.errors.length > 0) {
        console.log('\n' + chalk.red.bold('ERREURS CRITIQUES:'));
        CONFIG.results.messages.errors.forEach(err => {
            console.log(chalk.red(`  - ${err}`));
        });
    }
    
    if (CONFIG.results.messages.warnings.length > 0 && CONFIG.results.messages.warnings.length <= 5) {
        console.log('\n' + chalk.yellow.bold('AVERTISSEMENTS:'));
        CONFIG.results.messages.warnings.slice(0, 5).forEach(warn => {
            console.log(chalk.yellow(`  - ${warn}`));
        });
        if (CONFIG.results.messages.warnings.length > 5) {
            console.log(chalk.yellow(`  ... et ${CONFIG.results.messages.warnings.length - 5} autre(s)`));
        }
    }
    
    // Recommandations
    console.log('\n' + chalk.cyan.bold('RECOMMANDATIONS:'));
    
    if (CONFIG.results.errors > 0) {
        console.log(chalk.red('❌ Des erreurs critiques doivent être corrigées'));
    } else if (CONFIG.results.warnings > 0) {
        console.log(chalk.yellow('⚠ Quelques avertissements, mais le système devrait fonctionner'));
    } else {
        console.log(chalk.green('✅ Tout est parfaitement configuré!'));
    }
    
    // Statut global
    process.stdout.write('\n' + chalk.bold('STATUT GLOBAL: '));
    if (CONFIG.results.errors === 0 && CONFIG.results.warnings === 0) {
        console.log(chalk.green.bold('EXCELLENT ✓'));
    } else if (CONFIG.results.errors === 0) {
        console.log(chalk.yellow.bold('BON (avec avertissements) ⚠'));
    } else {
        console.log(chalk.red.bold('PROBLÈMES DÉTECTÉS ✗'));
    }
};

// Fonction principale
const main = async () => {
    try {
        // Analyser les arguments
        const args = process.argv.slice(2);
        CONFIG.verbose = args.includes('-v') || args.includes('--verbose');
        CONFIG.autoFix = args.includes('--fix');
        
        if (args.includes('-h') || args.includes('--help')) {
            console.log('Usage: node verify_branding.js [options]');
            console.log();
            console.log('Options:');
            console.log('  -v, --verbose    Mode verbeux');
            console.log('  --fix            Correction automatique');
            console.log('  -h, --help       Afficher l\'aide');
            process.exit(0);
        }
        
        log.header('VÉRIFICATION COMPLÈTE DU BRANDING');
        
        const now = new Date();
        console.log(chalk.bold('Date:') + ` ${now.toLocaleString('fr-FR')}`);
        console.log(chalk.bold('Système:') + ` ${process.platform} ${process.arch}`);
        console.log(chalk.bold('Node.js:') + ` ${process.version}`);
        console.log(chalk.bold('Répertoire:') + ` ${PATHS.root}`);
        
        // 1. Structure
        if (!await verifyProjectStructure()) {
            log.error('Structure du projet invalide - Arrêt');
            process.exit(1);
        }
        
        // 2. Fichier .env
        const [envOk, configId] = await verifyEnvFile();
        if (!envOk || !configId) {
            log.error('Impossible de déterminer la configuration - Arrêt');
            process.exit(1);
        }
        
        // 3. Fichier de configuration
        const [configOk, configData] = await verifyConfigFile(configId);
        
        // 4. Assets
        await verifyAssets(configId);
        
        // 5. Fichiers source
        await verifySourceFiles();
        
        // 6. Serveur
        const [serverOk] = await verifyServer();
        
        // 7. API
        if (serverOk) {
            await verifyAPI(configData);
        } else {
            log.section('7. API DE BRANDING');
            log.info('Test ignoré (serveur non démarré)');
        }
        
        // 8. Documentation
        await verifyDocumentation();
        
        // Résumé
        displaySummary();
        
        process.exit(CONFIG.results.errors === 0 ? 0 : 1);
        
    } catch (error) {
        console.error('\n' + chalk.red('Erreur inattendue:'), error.message);
        if (CONFIG.verbose) {
            console.error(error);
        }
        process.exit(1);
    }
};

// Exécution
if (require.main === module) {
    main();
}

module.exports = { verifyProjectStructure, verifyEnvFile, verifyConfigFile };

