#!/usr/bin/env node
/**
 * Script de Configuration Branding - EB-Vision 2.0
 * ================================================
 * 
 * Version Node.js du script de configuration
 * 
 * Usage:
 *   node configure_branding.js [nom_configuration]
 *   npm run configure [nom_configuration]
 * 
 * Exemples:
 *   node configure_branding.js eb-vision-2
 *   node configure_branding.js --list
 *   node configure_branding.js --new
 * 
 * @author EB-Vision Team
 * @version 2.0.0
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Chemins
const getProjectRoot = () => {
    return path.resolve(__dirname, '../../..');
};

const PATHS = {
    root: getProjectRoot(),
    env: path.join(getProjectRoot(), '.env'),
    branding: path.join(getProjectRoot(), 'config', 'branding'),
    template: path.join(getProjectRoot(), 'config', 'branding', 'client-template.json'),
    assets: path.join(getProjectRoot(), 'public', 'assets', 'brands')
};

// Utilitaires d'affichage
const log = {
    header: (text) => {
        console.log('\n' + chalk.cyan.bold('='.repeat(70)));
        console.log(chalk.cyan.bold(text.padStart(35 + text.length / 2).padEnd(70)));
        console.log(chalk.cyan.bold('='.repeat(70)) + '\n');
    },
    success: (text) => console.log(chalk.green('✓ ' + text)),
    error: (text) => console.log(chalk.red('✗ ' + text)),
    warning: (text) => console.log(chalk.yellow('⚠ ' + text)),
    info: (text) => console.log(chalk.blue('ℹ ' + text)),
    section: (text) => {
        console.log('\n' + chalk.yellow.bold(text));
        console.log(chalk.yellow('-'.repeat(text.length)));
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
        log.error(`Erreur lecture .env: ${error.message}`);
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
        log.error(`Erreur écriture .env: ${error.message}`);
        return false;
    }
};

// Obtenir la configuration actuelle
const getCurrentConfig = async () => {
    const env = await readEnvFile();
    return env.BRAND_CONFIG || null;
};

// Lister les configurations disponibles
const listConfigs = async () => {
    try {
        if (!await fs.pathExists(PATHS.branding)) {
            return [];
        }
        
        const files = await fs.readdir(PATHS.branding);
        const configs = [];
        
        for (const file of files) {
            if (file.endsWith('.json') && file !== 'client-template.json') {
                try {
                    const configPath = path.join(PATHS.branding, file);
                    const data = await fs.readJson(configPath);
                    
                    // Adapter au format du template
                    const name = data.name || data.app?.name || 'N/A';
                    
                    configs.push({
                        id: path.basename(file, '.json'),
                        name: name,
                        file: file,
                        path: configPath
                    });
                } catch (err) {
                    log.warning(`Impossible de lire ${file}: ${err.message}`);
                }
            }
        }
        
        return configs.sort((a, b) => a.id.localeCompare(b.id));
    } catch (error) {
        log.error(`Erreur listage configs: ${error.message}`);
        return [];
    }
};

// Afficher les configurations disponibles
const displayConfigs = (configs) => {
    log.header('CONFIGURATIONS DISPONIBLES');
    
    if (configs.length === 0) {
        log.error('Aucune configuration trouvée!');
        return;
    }
    
    console.log(chalk.bold('ID'.padEnd(20) + 'Nom'.padEnd(40) + 'Fichier'));
    console.log('-'.repeat(20) + ' ' + '-'.repeat(40) + ' ' + '-'.repeat(30));
    
    configs.forEach(config => {
        console.log(
            chalk.cyan(config.id.padEnd(20)) +
            config.name.padEnd(40) +
            chalk.yellow(config.file)
        );
    });
    
    console.log();
};

// Créer une nouvelle configuration
const createNewConfig = async (configId) => {
    log.header('CRÉATION D\'UNE NOUVELLE CONFIGURATION');
    
    const configFile = path.join(PATHS.branding, `${configId}.json`);
    
    // Template de base si le template n'existe pas
    let templateData;
    
    if (await fs.pathExists(PATHS.template)) {
        templateData = await fs.readJson(PATHS.template);
    } else {
        log.warning('Template introuvable, création template minimal...');
        templateData = {
            app: {
                name: configId.toUpperCase().replace(/-/g, ' '),
                shortName: configId.toUpperCase(),
                tagline: 'Solution de Gestion d\'Entreprise',
                version: '2.0.0'
            },
            branding: {
                logo: {
                    main: `/assets/brands/${configId}/logo.svg`,
                    icon: `/assets/brands/${configId}/icon.svg`,
                    favicon: `/assets/brands/${configId}/favicon.ico`
                },
                colors: {
                    primary: '#2c3e50',
                    secondary: '#3498db',
                    success: '#27ae60',
                    danger: '#e74c3c',
                    warning: '#f39c12',
                    info: '#3498db'
                }
            },
            ui: {
                footer: {
                    text: configId.toUpperCase().replace(/-/g, ' '),
                    copyright: `© 2024 ${configId.toUpperCase().replace(/-/g, ' ')}. Tous droits réservés.`
                }
            },
            localization: {
                defaultLanguage: 'fr',
                dateFormat: 'DD/MM/YYYY',
                currency: 'EUR'
            }
        };
    }
    
    // Questions à l'utilisateur
    log.info(chalk.cyan(`Nouvelle configuration: ${configId}\n`));
    
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'appName',
            message: 'Nom de l\'application:',
            default: configId.toUpperCase().replace(/-/g, ' ')
        },
        {
            type: 'input',
            name: 'tagline',
            message: 'Slogan:',
            default: 'Solution de Gestion d\'Entreprise'
        },
        {
            type: 'input',
            name: 'primaryColor',
            message: 'Couleur primaire (hex):',
            default: '#2c3e50',
            validate: (input) => {
                return /^#[0-9A-Fa-f]{6}$/.test(input) || 'Format invalide (ex: #2c3e50)';
            }
        }
    ]);
    
    // Personnaliser le template
    if (templateData.app) {
        templateData.app.name = answers.appName;
        if (templateData.app.tagline !== undefined) {
            templateData.app.tagline = answers.tagline;
        }
        if (templateData.app.shortName !== undefined) {
            templateData.app.shortName = answers.appName.split(' ').map(w => w[0]).join('').toUpperCase();
        }
    } else {
        templateData.name = answers.appName;
        templateData.tagline = answers.tagline;
    }
    
    // Remplacer les couleurs avec des valeurs réelles
    if (templateData.branding?.colors) {
        templateData.branding.colors.primary = answers.primaryColor;
        // Remplacer les placeholders de couleurs
        if (templateData.branding.colors.secondary === 'YOUR_SECONDARY_COLOR' || templateData.branding.colors.secondary?.includes('YOUR_')) {
            templateData.branding.colors.secondary = '#34495e';
        }
        if (templateData.branding.colors.accent === 'YOUR_ACCENT_COLOR' || templateData.branding.colors.accent?.includes('YOUR_')) {
            templateData.branding.colors.accent = '#3498db';
        }
        if (templateData.branding.colors.dark === 'YOUR_DARK_COLOR' || templateData.branding.colors.dark?.includes('YOUR_')) {
            templateData.branding.colors.dark = '#1a252f';
        }
        if (templateData.branding.colors.light === 'YOUR_LIGHT_COLOR' || templateData.branding.colors.light?.includes('YOUR_')) {
            templateData.branding.colors.light = '#ecf0f1';
        }
    }
    
    // Remplacer [CLIENT-ID] dans les logos
    if (templateData.branding?.logo) {
        if (templateData.branding.logo.main?.includes('[CLIENT-ID]')) {
            templateData.branding.logo.main = templateData.branding.logo.main.replace('[CLIENT-ID]', configId);
        }
        if (templateData.branding.logo.icon?.includes('[CLIENT-ID]')) {
            templateData.branding.logo.icon = templateData.branding.logo.icon.replace('[CLIENT-ID]', configId);
        }
        if (templateData.branding.logo.favicon?.includes('[CLIENT-ID]')) {
            templateData.branding.logo.favicon = templateData.branding.logo.favicon.replace('[CLIENT-ID]', configId);
        }
    }
    
    // Remplacer les placeholders UI
    if (templateData.ui) {
        if (templateData.ui.sidebarTitle === 'VOTRE TITRE' || templateData.ui.sidebarTitle?.includes('VOTRE')) {
            templateData.ui.sidebarTitle = answers.appName;
        }
        if (templateData.ui.sidebarSubtitle === 'Votre sous-titre' || templateData.ui.sidebarSubtitle?.includes('Votre')) {
            templateData.ui.sidebarSubtitle = answers.tagline;
        }
        if (templateData.ui.loginTitle?.includes('[NOM]')) {
            templateData.ui.loginTitle = `Bienvenue sur ${answers.appName}`;
        }
        if (templateData.ui.footer) {
            if (templateData.ui.footer.text === 'Nom de votre entreprise' || templateData.ui.footer.text?.includes('votre')) {
                templateData.ui.footer.text = answers.appName;
            }
            templateData.ui.footer.copyright = `© 2024 ${answers.appName}. Tous droits réservés.`;
        }
    }
    
    // Remplacer les placeholders de contact
    if (templateData.contact) {
        const domainName = configId.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (templateData.contact.email?.includes('votre-entreprise')) {
            templateData.contact.email = `contact@${domainName}.com`;
        }
        if (templateData.contact.website?.includes('votre-entreprise')) {
            templateData.contact.website = `https://${domainName}.com`;
        }
        if (templateData.contact.supportUrl?.includes('votre-entreprise')) {
            templateData.contact.supportUrl = `https://support.${domainName}.com`;
        }
    }
    
    // Sauvegarder
    await fs.writeJson(configFile, templateData, { spaces: 2 });
    
    console.log();
    log.success('Configuration créée avec succès!');
    log.info(`Fichier: ${configFile}`);
    log.info(`Nom: ${answers.appName}`);
    log.info(`Slogan: ${answers.tagline}`);
    log.info(`Couleur: ${answers.primaryColor}`);
    
    // Créer le dossier assets
    const assetsDir = path.join(PATHS.assets, configId);
    if (!await fs.pathExists(assetsDir)) {
        await fs.ensureDir(assetsDir);
        const readme = path.join(assetsDir, 'README.md');
        await fs.writeFile(readme,
            `# Assets pour ${answers.appName}\n\n` +
            'Placez ici vos fichiers de logos et icônes personnalisés:\n\n' +
            '- `logo.svg` ou `logo.png` : Logo principal\n' +
            '- `favicon.ico` : Icône du navigateur\n'
        );
        log.success(`Dossier assets créé: public/assets/brands/${configId}/`);
    }
    
    console.log();
    log.warning('⚠ N\'oubliez pas de personnaliser le fichier JSON si nécessaire!');
    log.info(`   Éditez: config/branding/${configId}.json`);
    
    return true;
};

// Définir la configuration active
const setConfig = async (configId) => {
    const configFile = path.join(PATHS.branding, `${configId}.json`);
    
    if (!await fs.pathExists(configFile)) {
        log.error(`Configuration '${configId}' introuvable!`);
        log.info(`Fichier recherché: ${configFile}`);
        return false;
    }
    
    // Lire et valider
    try {
        const configData = await fs.readJson(configFile);
        const configName = configData.name || configData.app?.name || 'N/A';
        
        // Mettre à jour .env
        const env = await readEnvFile();
        const oldConfig = env.BRAND_CONFIG || 'aucune';
        env.BRAND_CONFIG = configId;
        
        if (await writeEnvFile(env)) {
            log.success('Configuration mise à jour dans .env');
            log.info(`Ancienne configuration: ${oldConfig}`);
            log.info(`Nouvelle configuration: ${configId}`);
            log.info(`Nom de l'application: ${configName}`);
            return true;
        }
        
        return false;
    } catch (error) {
        log.error(`Erreur lors de la configuration: ${error.message}`);
        return false;
    }
};

// Afficher les prochaines étapes
const displayNextSteps = (configId) => {
    log.header('PROCHAINES ÉTAPES');
    
    console.log(chalk.yellow('1. Redémarrer le serveur'));
    console.log('   → npm restart\n');
    
    console.log(chalk.yellow('2. Vider le cache du navigateur'));
    console.log('   → Ctrl + Shift + R (ou Cmd + Shift + R sur Mac)\n');
    
    console.log(chalk.yellow('3. Tester l\'application'));
    console.log('   → http://localhost:3000\n');
    
    console.log(chalk.yellow('4. Vérifier la configuration'));
    console.log('   → node docs/Branding/Scripts/verify_branding.js\n');
};

// Mode interactif
const interactiveMode = async () => {
    log.header('MODE INTERACTIF - CONFIGURATION BRANDING');
    
    const current = await getCurrentConfig();
    if (current) {
        log.info(`Configuration actuelle: ${chalk.cyan(current)}`);
    } else {
        log.warning('Aucune configuration active');
    }
    
    console.log();
    
    const configs = await listConfigs();
    displayConfigs(configs);
    
    console.log(chalk.yellow.bold('OPTIONS:'));
    console.log('  • Entrez l\'ID d\'une configuration existante');
    console.log('  • Entrez un ' + chalk.bold('nouveau nom') + ' pour créer une configuration');
    console.log('  • Tapez \'' + chalk.cyan('new') + '\' pour créer avec assistant');
    console.log('  • Tapez \'' + chalk.red('q') + '\' pour quitter\n');
    
    const { choice } = await inquirer.prompt([
        {
            type: 'input',
            name: 'choice',
            message: 'Votre choix:'
        }
    ]);
    
    if (choice.toLowerCase() === 'q') {
        log.info('Annulé par l\'utilisateur');
        return false;
    }
    
    // Mode création assistée
    if (choice.toLowerCase() === 'new') {
        const { newId } = await inquirer.prompt([
            {
                type: 'input',
                name: 'newId',
                message: 'ID de la nouvelle configuration:',
                validate: (input) => {
                    if (!input) return 'ID vide';
                    if (!/^[a-z0-9-]+$/.test(input)) {
                        return 'ID invalide - Utilisez uniquement lettres minuscules, chiffres et tirets';
                    }
                    return true;
                }
            }
        ]);
        
        if (await createNewConfig(newId)) {
            console.log();
            return await setConfig(newId);
        }
        return false;
    }
    
    // Vérifier si c'est une config existante
    const validIds = configs.map(c => c.id);
    
    if (validIds.includes(choice)) {
        return await setConfig(choice);
    } else {
        // Nouvelle configuration
        console.log();
        log.info(`Configuration '${choice}' introuvable`);
        
        const { create } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'create',
                message: 'Voulez-vous la créer?',
                default: false
            }
        ]);
        
        if (create) {
            // Valider l'ID
            if (!/^[a-z0-9-]+$/.test(choice)) {
                log.error('ID invalide - Utilisez uniquement lettres minuscules, chiffres et tirets');
                return false;
            }
            
            if (await createNewConfig(choice)) {
                console.log();
                return await setConfig(choice);
            }
        } else {
            log.info('Annulé');
        }
        
        return false;
    }
};

// Fonction principale
const main = async () => {
    try {
        log.header('CONFIGURATION BRANDING - EB-VISION 2.0');
        
        // Vérifier qu'on est dans le bon répertoire
        if (!await fs.pathExists(path.join(PATHS.root, 'package.json'))) {
            log.error('Erreur: Ce script doit être exécuté depuis le projet EB-Vision 2.0');
            process.exit(1);
        }
        
        const args = process.argv.slice(2);
        
        // Mode aide
        if (args.includes('-h') || args.includes('--help') || args.includes('help')) {
            console.log('Usage: node configure_branding.js [nom_configuration]');
            console.log();
            console.log('Exemples:');
            console.log('  node configure_branding.js eb-vision-2        # Activer config existante');
            console.log('  node configure_branding.js mon-nouveau-client # Créer si n\'existe pas');
            console.log('  node configure_branding.js --list             # Lister toutes');
            console.log('  node configure_branding.js --new              # Mode création');
            console.log();
            console.log('Sans argument, le script démarre en mode interactif.');
            process.exit(0);
        }
        
        // Mode liste
        if (args.includes('-l') || args.includes('--list') || args.includes('list')) {
            const configs = await listConfigs();
            displayConfigs(configs);
            process.exit(0);
        }
        
        // Mode création
        if (args.includes('-n') || args.includes('--new') || args.includes('new')) {
            const { newId } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'newId',
                    message: 'ID de la nouvelle configuration:',
                    validate: (input) => {
                        if (!input) return 'ID vide';
                        if (!/^[a-z0-9-]+$/.test(input)) {
                            return 'Utilisez uniquement lettres, chiffres et tirets';
                        }
                        return true;
                    }
                }
            ]);
            
            if (await createNewConfig(newId)) {
                console.log();
                if (await setConfig(newId)) {
                    displayNextSteps(newId);
                }
            }
            process.exit(0);
        }
        
        // Mode ligne de commande
        if (args.length > 0) {
            const configId = args[0];
            log.info(`Configuration demandée: ${configId}\n`);
            
            const configFile = path.join(PATHS.branding, `${configId}.json`);
            
            if (!await fs.pathExists(configFile)) {
                log.warning(`Configuration '${configId}' introuvable`);
                
                const { create } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'create',
                        message: 'Voulez-vous la créer?',
                        default: false
                    }
                ]);
                
                if (create) {
                    if (!/^[a-z0-9-]+$/.test(configId)) {
                        log.error('ID invalide - Utilisez uniquement lettres, chiffres et tirets');
                        process.exit(1);
                    }
                    
                    if (!await createNewConfig(configId)) {
                        process.exit(1);
                    }
                    console.log();
                } else {
                    log.error('Configuration introuvable - Annulé');
                    process.exit(1);
                }
            }
            
            if (await setConfig(configId)) {
                console.log();
                displayNextSteps(configId);
                
                const { restart } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'restart',
                        message: 'Voulez-vous redémarrer le serveur maintenant?',
                        default: false
                    }
                ]);
                
                if (restart) {
                    log.info('Redémarrage du serveur...');
                    try {
                        await execAsync('npm restart', { cwd: PATHS.root });
                    } catch (error) {
                        log.error('Erreur lors du redémarrage');
                        log.info('Veuillez redémarrer manuellement: npm restart');
                    }
                } else {
                    log.info('N\'oubliez pas de redémarrer le serveur: npm restart');
                }
            } else {
                process.exit(1);
            }
        } else {
            // Mode interactif
            if (await interactiveMode()) {
                console.log();
                const current = await getCurrentConfig();
                displayNextSteps(current);
                
                const { restart } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'restart',
                        message: 'Voulez-vous redémarrer le serveur maintenant?',
                        default: false
                    }
                ]);
                
                if (restart) {
                    log.info('Redémarrage du serveur...');
                    try {
                        await execAsync('npm restart', { cwd: PATHS.root });
                    } catch (error) {
                        log.error('Erreur lors du redémarrage');
                        log.info('Veuillez redémarrer manuellement: npm restart');
                    }
                } else {
                    log.info('N\'oubliez pas de redémarrer le serveur: npm restart');
                }
            }
        }
        
    } catch (error) {
        if (error.isTtyError) {
            log.error('Environnement TTY non supporté');
        } else {
            log.error(`Erreur: ${error.message}`);
            if (process.env.DEBUG) {
                console.error(error);
            }
        }
        process.exit(1);
    }
};

// Exécution
if (require.main === module) {
    main();
}

module.exports = { listConfigs, setConfig, createNewConfig };

