#!/usr/bin/env node

/**
 * Script de réorganisation des scripts dans des sous-dossiers
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const scriptsDir = __dirname;

// Définition des catégories et leurs scripts
const categories = {
    'database': {
        description: 'Scripts de base de données (initialisation, migrations, structure)',
        scripts: [
            '1-init-database-tables.js',
            '2-create-super-admin.js',
            '3-assign-all-permissions.js',
            'init-super-admin-complete.js',
            'check-database-consistency.js',
            'check-database-status.js',
            'check-missing-tables.js',
            'check-tables-structure.js',
            'check-users-table-structure.js',
            'check-collaborateurs-table-structure.js',
            'check-permissions-table-structure.js',
            'check-role-permissions-structure.js',
            'check-roles-table.js',
            'check-rh-tables.js',
            'check-secteurs-db.js',
            'compare-database-structure.js',
            'create-clean-backup.js',
            'create-clean-dump.js',
            'create-clean-local-dump.js',
            'create-production-dump.js',
            'database-structure-local.json',
            'export-database-structure-local.js',
            'export-database-structure-production.js',
            'export-database-structure.js',
            'fix-database-consistency.js',
            'fix-database-differences.js',
            'fix-missing-tables-production.js',
            'fix-missing-tables.js',
            'simple-database-check.js',
            'simple-db-test.js',
            'test-database.js',
            'test-local-db-connection.js',
            'diagnose-database.js',
            'count-records.js',
            'test-sql-query.js',
            'apply-2fa-migration.js',
            'run-super-admin-migration.js',
            'run-sync-migration.js',
            'migrate-to-multi-roles.js',
            'migrate-to-multiple-roles.js'
        ]
    },
    'testing': {
        description: 'Scripts de tests (API, UI, fonctionnalités)',
        scripts: [
            'test-api-simple.js',
            'test-api-real-token.js',
            'test-api-with-token.js',
            'test-production-api.js',
            'test-auth-flow.js',
            'test-login.js',
            'test-2fa-optional.js',
            'test-auto-generation.js',
            'test-user-creation.js',
            'test-api-user-creation.js',
            'test-button-fix.js',
            'test-collaborateurs-fixes.js',
            'test-collaborateurs-pagination-fix.js',
            'test-default-date-type-modification.js',
            'test-migration-success.js',
            'test-modal-close-on-success.js',
            'test-modal-fixes.js',
            'test-modal-id-fix.js',
            'test-multiple-roles.js',
            'test-all-modal-close-functions.js',
            'test-password-change-fix-final.js',
            'test-password-change-fix.js',
            'test-password-change-route.js',
            'test-password-fix-final.js',
            'test-password-patterns.js',
            'test-specific-password.js',
            'test-photo-upload.js',
            'test-refresh-improvements.js',
            'test-refresh-order-fix.js',
            'test-rh-modal-improvements.js',
            'test-roles-api-call.js',
            'test-roles-api-endpoint.js',
            'test-roles-api.js',
            'test-roles-endpoint.js',
            'test-secteurs-api.js',
            'test-super-admin-login.js',
            'test-unified-layout.js',
            'test-users-page-fix.js'
        ]
    },
    'deployment': {
        description: 'Scripts de déploiement et synchronisation',
        scripts: [
            'deploy-all-security-fixes.sh',
            'deploy-button-fix.js',
            'deploy-collaborateurs-fixes.js',
            'deploy-complete-modal-close-solution.js',
            'deploy-default-date-type-modification.js',
            'deploy-fixed-permissions.js',
            'deploy-menu-permissions-fix.sh',
            'deploy-modal-close-solution.js',
            'deploy-modal-id-fix.js',
            'deploy-permissions-sync.sh',
            'deploy-planethoster.js',
            'deploy-production-fixes.js',
            'deploy-production-sync-complete.sh',
            'deploy-refresh-fixes.js',
            'deploy-refresh-order-fix.js',
            'deploy-restart-script.sh',
            'deploy-rh-modal-improvements.js',
            'deploy-security-fixes.ps1',
            'deploy-security-fixes.sh',
            'deploy-sync-migration-production.sh',
            'migrate-production.js',
            'sync-opportunity-types-to-production.js',
            'sync-permissions-complete.js',
            'sync-to-production.sh',
            'configure-production-sync.js',
            'import-to-production.js',
            'restart-application.js',
            'restart-server-fixed.sh',
            'restart-server-production.sh',
            'restart-server.sh',
            'verify-deployment.js'
        ]
    },
    'maintenance': {
        description: 'Scripts de maintenance et nettoyage',
        scripts: [
            'aggressive-clean.js',
            'clean-and-recreate-from-local.js',
            'clean-backup-file.js',
            'clean-old-menu-permissions.js',
            'cleanup-duplicate-collaborateur-types.js',
            'cleanup-exposed-credentials.js',
            'cleanup-remaining-files.js',
            'final-cleanup.js',
            'simple-cleanup.js',
            'fix-all-opportunity-type-names.js',
            'fix-and-sync-opportunity-types.js',
            'fix-backup-encoding.js',
            'fix-collaborateur-names.js',
            'fix-copy-commands.js',
            'fix-duplicate-declaration.js',
            'fix-non-bcrypt-passwords.js',
            'fix-notifications-loop.js',
            'fix-null-names-before-sync.js',
            'fix-production-backup.js',
            'fix-production-dump.js',
            'fix-uploads-permissions.sh',
            'fix-utf16.js',
            'fix-vente-standard-name.js',
            'restore-original-collaborateur-name.js',
            'restore-original-design.js',
            'restore-css-styles.js',
            'optimize-collaborateurs-performance.js',
            'organize-files-bash.sh',
            'organize-production-files.js',
            'organize-project-files.js'
        ]
    },
    'security': {
        description: 'Scripts de sécurité et audits',
        scripts: [
            'comprehensive-security-audit.js',
            'security-audit-passwords.js',
            'security-audit.js',
            'security-verification-final.js',
            'test-super-admin-security.js',
            'penetration-test.js',
            'configure-2fa-policy.js',
            'fix-csp-production.js',
            'generate-secure-jwt-key.js',
            'verify-server-security.js',
            'verify-csp-fix.sh',
            'setup-https.sh',
            'verify-existing-ssl.sh',
            'check-prerequisites.sh'
        ]
    },
    'debugging': {
        description: 'Scripts de débogage et diagnostic',
        scripts: [
            'debug-403-user-generation-persistent.js',
            'debug-auth-token.js',
            'debug-campaign-submission-correct.js',
            'debug-campaign-submission-final.js',
            'debug-campaign-submission-fixed.js',
            'debug-campaign-submission.js',
            'debug-collaborateur-display-issue.js',
            'debug-collaborateur-types-duplication.js',
            'debug-collaborateurs-pagination.js',
            'debug-frontend-permissions.js',
            'debug-menu-visibility-production.js',
            'debug-password-validation.js',
            'debug-rh-evolution-errors.js',
            'debug-user-collaborateur-association.js',
            'debug-user-generation-403.js',
            'diagnose-auth-issue.js',
            'diagnose-env.js',
            'diagnose-user-password-issue.js',
            'diagnostic-production-500.js',
            'diagnostic-rapide.js',
            'final-diagnosis.js',
            'check-server-logs.js'
        ]
    },
    'utilities': {
        description: 'Scripts utilitaires divers',
        scripts: [
            'check-env-loading.js',
            'config-database.sh',
            'config.production.js',
            'create-utf8-dump-simple.ps1',
            'create-utf8-dump-with-app-config.js',
            'create-utf8-dump.ps1',
            'ecosystem.config.js',
            'extract-local-data.js',
            'complete-local-extract.js',
            'complete-production-import-fixed.js',
            'complete-production-import.js',
            'import-clean-dump.js',
            'recreate-from-extracted.js',
            'verify-dump.js',
            'verify-final-import.js',
            'get-super-admin-credentials.js',
            'find-user-songo.js',
            'install-nodejs-nvm.sh',
            'install-nodejs.sh',
            'install.sh',
            'identify-unused-js-files.js',
            'move-unused-js-files.js',
            'move-user-modals.js',
            'start-application.js'
        ]
    },
    'analysis': {
        description: 'Scripts d\'analyse et vérification',
        scripts: [
            'analyze-campaign-submission-permissions.js',
            'analyze-extracted-data.js',
            'analyze-opportunity-types-config.js',
            'analyze-profile-sections.js',
            'check-admin-permissions.js',
            'check-collaborateurs-display.js',
            'check-extracted-data.js',
            'check-import-status.js',
            'check-local-data.js',
            'check-menu-structure.js',
            'check-permissions-api.js',
            'check-permissions-structure.js',
            'check-profile-scripts.js',
            'check-roles-structure.js',
            'check-sidebar-loading.js',
            'check-users-columns-production.js',
            'check-users-structure.js',
            'check-user-role-permissions.js',
            'opportunity-types-config-local.json',
            'verify-all-profile-modals.js',
            'verify-layout-consistency.js',
            'verify-migration-final.js',
            'verify-organization-final.js',
            'verify-production-code.js',
            'verify-profile-modals-final.js',
            'verify-super-admin-production.js',
            'README-database-comparison.md'
        ]
    },
    'permissions': {
        description: 'Scripts de gestion des permissions',
        scripts: [
            'associate-permissions-fixed.js',
            'associate-permissions.js',
            'create-api-permissions.js',
            'create-menu-permissions.js',
            'fix-admin-permissions.js',
            'fix-permissions-complete.js',
            'fix-permissions-middleware.js',
            'fix-permissions-production.js',
            'fix-permissions-simple.js',
            'fix-permissions-system-definitive.js',
            'manual-sync-permissions-menus.js',
            'setup-roles-system.js',
            'update-sidebar-permissions.js'
        ]
    },
    'ui': {
        description: 'Scripts d\'interface utilisateur',
        scripts: [
            'add-branding-to-all-pages.js',
            'add-sidebar-to-missing-pages.js',
            'fix-collaborateurs-responsiveness.js',
            'fix-multiple-roles-display.js',
            'fix-profile-modals-consistency.js',
            'fix-profile-scripts.js',
            'fix-rh-evolution-endpoints.js',
            'fix-user-collaborateur-association.js',
            'fix-user-role-assignment.js',
            'migrate-pages-to-unified-layout.js',
            'create-admin-user.js',
            'create-vente-standard-type.js'
        ]
    }
};

async function organizeScripts() {
    console.log(chalk.yellow.bold('\n╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.yellow.bold('║     RÉORGANISATION DES SCRIPTS                               ║'));
    console.log(chalk.yellow.bold('╚══════════════════════════════════════════════════════════════╝\n'));

    let movedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Créer les dossiers de catégories
    console.log(chalk.cyan('📁 Création de la structure de dossiers...\n'));
    for (const [category, info] of Object.entries(categories)) {
        const categoryPath = path.join(scriptsDir, category);
        await fs.ensureDir(categoryPath);
        console.log(chalk.gray(`   ✓ ${category}/ - ${info.description}`));
    }

    console.log(chalk.cyan('\n📦 Déplacement des scripts...\n'));

    // Déplacer les scripts dans leurs catégories
    for (const [category, info] of Object.entries(categories)) {
        console.log(chalk.white(`\n${category.toUpperCase()}/`));
        console.log(chalk.gray('─'.repeat(50)));

        for (const script of info.scripts) {
            const sourcePath = path.join(scriptsDir, script);
            const destPath = path.join(scriptsDir, category, script);

            try {
                if (await fs.pathExists(sourcePath)) {
                    await fs.move(sourcePath, destPath, { overwrite: false });
                    console.log(chalk.green(`   ✓ ${script}`));
                    movedCount++;
                } else {
                    console.log(chalk.gray(`   - ${script} (non trouvé)`));
                    skippedCount++;
                }
            } catch (error) {
                if (error.code === 'EEXIST') {
                    console.log(chalk.yellow(`   ⚠ ${script} (existe déjà)`));
                    skippedCount++;
                } else {
                    console.log(chalk.red(`   ✗ ${script} (erreur: ${error.message})`));
                    errorCount++;
                }
            }
        }
    }

    // Créer un fichier README dans le dossier scripts
    const readmePath = path.join(scriptsDir, 'README.md');
    let readmeContent = `# Scripts Organisation

Ce dossier contient tous les scripts utilitaires de l'application EB-Vision 2.0, organisés par catégorie.

## 📁 Structure

`;

    for (const [category, info] of Object.entries(categories)) {
        readmeContent += `### \`${category}/\`\n${info.description}\n\n`;
    }

    readmeContent += `## 🚀 Utilisation

Pour exécuter un script, utilisez Node.js :

\`\`\`bash
node scripts/[categorie]/[nom-du-script].js
\`\`\`

## 🔑 Scripts principaux

### Initialisation de la base de données
\`\`\`bash
# All-in-one (recommandé pour démarrer)
node scripts/database/init-super-admin-complete.js

# Ou modulaire
node scripts/database/1-init-database-tables.js
node scripts/database/2-create-super-admin.js
node scripts/database/3-assign-all-permissions.js
\`\`\`

### Tests
\`\`\`bash
# Tests API simples
node scripts/testing/test-api-simple.js

# Tests d'authentification
node scripts/testing/test-auth-flow.js
\`\`\`

### Maintenance
\`\`\`bash
# Nettoyage
node scripts/maintenance/simple-cleanup.js
\`\`\`

## 📊 Statistiques

- **Scripts déplacés**: ${movedCount}
- **Scripts ignorés**: ${skippedCount}
- **Erreurs**: ${errorCount}
- **Total de catégories**: ${Object.keys(categories).length}
`;

    await fs.writeFile(readmePath, readmeContent, 'utf8');

    // Résumé final
    console.log(chalk.yellow.bold('\n╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.yellow.bold('║     RÉSUMÉ DE LA RÉORGANISATION                              ║'));
    console.log(chalk.yellow.bold('╚══════════════════════════════════════════════════════════════╝\n'));
    
    console.log(chalk.green(`✓ Scripts déplacés: ${movedCount}`));
    console.log(chalk.gray(`- Scripts ignorés: ${skippedCount}`));
    if (errorCount > 0) {
        console.log(chalk.red(`✗ Erreurs: ${errorCount}`));
    }
    console.log(chalk.cyan(`\n📁 ${Object.keys(categories).length} catégories créées`));
    console.log(chalk.cyan(`📄 README.md créé dans scripts/\n`));

    console.log(chalk.white('📂 Structure finale:'));
    console.log(chalk.gray('─'.repeat(50)));
    for (const category of Object.keys(categories)) {
        console.log(chalk.white(`   scripts/${category}/`));
    }
    console.log('');
}

organizeScripts().catch(error => {
    console.error(chalk.red('❌ Erreur lors de la réorganisation:'), error);
    process.exit(1);
});

