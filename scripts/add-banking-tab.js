/**
 * Script pour ajouter l'onglet Gestion Bancaire à financial-settings.html
 * Usage: node scripts/add-banking-tab.js
 */

const fs = require('fs');
const path = require('path');

const FINANCIAL_SETTINGS_PATH = path.join(__dirname, '..', 'public', 'financial-settings.html');

// Backup du fichier original
function backupFile() {
    const backupPath = FINANCIAL_SETTINGS_PATH + '.backup';
    fs.copyFileSync(FINANCIAL_SETTINGS_PATH, backupPath);
    console.log('✅ Backup créé:', backupPath);
}

// Restaurer depuis le backup
function restoreBackup() {
    const backupPath = FINANCIAL_SETTINGS_PATH + '.backup';
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, FINANCIAL_SETTINGS_PATH);
        console.log('✅ Fichier restauré depuis le backup');
    }
}

// Ajouter le bouton d'onglet
function addTabButton(content) {
    const taxesTabButton = `                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="taxes-tab" data-bs-toggle="tab" data-bs-target="#taxes" type="button"
                        role="tab">
                        <i class="fas fa-percentage me-2"></i>Catalogue Taxes
                    </button>
                </li>`;

    const bankingTabButton = `                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="taxes-tab" data-bs-toggle="tab" data-bs-target="#taxes" type="button"
                        role="tab">
                        <i class="fas fa-percentage me-2"></i>Catalogue Taxes
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="banking-tab" data-bs-toggle="tab" data-bs-target="#banking" type="button"
                        role="tab">
                        <i class="fas fa-university me-2"></i>Gestion Bancaire
                    </button>
                </li>`;

    if (content.includes('id="banking-tab"')) {
        console.log('⚠️  L\'onglet Gestion Bancaire existe déjà');
        return content;
    }

    content = content.replace(taxesTabButton, bankingTabButton);
    console.log('✅ Bouton d\'onglet ajouté');
    return content;
}

// Ajouter le contenu de l'onglet
function addTabContent(content) {
    const taxesTabEnd = `                </div>

                <!-- Onglet Configuration BU -->`;

    const bankingTabContent = `                </div>

                <!-- Onglet Gestion Bancaire -->
                <div class="tab-pane fade" id="banking" role="tabpanel">
                    <!-- Section Établissements Financiers -->
                    <div class="config-section mb-4">
                        <div class="config-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <h3 class="mb-0"><i class="fas fa-university me-2"></i>Établissements Financiers</h3>
                            <button class="btn btn-light btn-sm" onclick="openInstitutionModal()">
                                <i class="fas fa-plus me-2"></i>Nouvel Établissement
                            </button>
                        </div>
                        <div class="config-body">
                            <p class="text-muted mb-3">
                                <i class="fas fa-info-circle me-2"></i>
                                Gérez les banques et institutions de mobile money disponibles
                            </p>
                            <div class="table-responsive">
                                <table class="table table-hover" id="institutionsTable">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Nom</th>
                                            <th>Type</th>
                                            <th>Pays</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody><!-- Rempli par JS --></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Section Comptes Bancaires -->
                    <div class="config-section">
                        <div class="config-header bg-success text-white d-flex justify-content-between align-items-center">
                            <h3 class="mb-0"><i class="fas fa-wallet me-2"></i>Comptes Bancaires par BU</h3>
                            <button class="btn btn-light btn-sm" onclick="openBankAccountModal()">
                                <i class="fas fa-plus me-2"></i>Nouveau Compte
                            </button>
                        </div>
                        <div class="config-body">
                            <p class="text-muted mb-3">
                                <i class="fas fa-info-circle me-2"></i>
                                Configurez les comptes bancaires pour chaque Business Unit
                            </p>
                            
                            <!-- Filtres -->
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <label class="form-label">Filtrer par BU</label>
                                    <select class="form-select" id="filterBankAccountBU" onchange="loadBankAccounts()">
                                        <option value="">Toutes les BU</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Filtrer par Établissement</label>
                                    <select class="form-select" id="filterBankAccountInst" onchange="loadBankAccounts()">
                                        <option value="">Tous les établissements</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="table-responsive">
                                <table class="table table-hover" id="bankAccountsTable">
                                    <thead>
                                        <tr>
                                            <th>Business Unit</th>
                                            <th>Établissement</th>
                                            <th>N° Compte</th>
                                            <th>Nom du Compte</th>
                                            <th>Par Défaut</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody><!-- Rempli par JS --></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Onglet Configuration BU -->`;

    if (content.includes('id="banking"')) {
        console.log('⚠️  Le contenu de l\'onglet Gestion Bancaire existe déjà');
        return content;
    }

    // Trouver la fin de l'onglet Taxes
    const taxesEndIndex = content.indexOf(taxesTabEnd);
    if (taxesEndIndex === -1) {
        console.error('❌ Impossible de trouver la fin de l\'onglet Taxes');
        return content;
    }

    content = content.replace(taxesTabEnd, bankingTabContent);
    console.log('✅ Contenu de l\'onglet ajouté');
    return content;
}

// Ajouter les modals avant </body>
function addModals(content) {
    const modalsHTML = `
    <!-- Modal Établissement Financier -->
    <div class="modal fade" id="institutionModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-university me-2"></i>Établissement Financier
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="institutionForm">
                        <input type="hidden" id="institutionId">
                        <div class="mb-3">
                            <label class="form-label">Code *</label>
                            <input type="text" id="institutionCode" class="form-control" 
                                placeholder="Ex: SGBC" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nom *</label>
                            <input type="text" id="institutionName" class="form-control" 
                                placeholder="Ex: Société Générale" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Type *</label>
                            <select id="institutionType" class="form-select" required>
                                <option value="BANK">Banque</option>
                                <option value="MOBILE_MONEY">Mobile Money</option>
                                <option value="OTHER">Autre</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Pays</label>
                            <input type="text" id="institutionCountry" class="form-control" value="Cameroun">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                    <button type="button" class="btn btn-primary" onclick="saveInstitution()">
                        <i class="fas fa-save me-2"></i>Enregistrer
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Compte Bancaire -->
    <div class="modal fade" id="bankAccountModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-wallet me-2"></i>Compte Bancaire
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="bankAccountForm">
                        <input type="hidden" id="bankAccountId">
                        <div class="mb-3">
                            <label class="form-label">Business Unit *</label>
                            <select id="bankAccountBU" class="form-select" required>
                                <option value="">Sélectionner...</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Établissement Financier *</label>
                            <select id="bankAccountInstitution" class="form-select" required>
                                <option value="">Sélectionner...</option>
                            </select>
                            <div class="form-text">
                                <i class="fas fa-lightbulb"></i> 
                                Créez d'abord l'établissement dans la section ci-dessus si nécessaire
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Numéro de Compte *</label>
                            <input type="text" id="bankAccountNumber" class="form-control" 
                                placeholder="Ex: 12345678901" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nom du Compte *</label>
                            <input type="text" id="bankAccountName" class="form-control" 
                                placeholder="Ex: Compte Principal" required>
                        </div>
                        <div class="mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="bankAccountDefault">
                                <label class="form-check-label" for="bankAccountDefault">
                                    <strong>Compte par défaut pour cette BU</strong>
                                    <div class="form-text">
                                        Utilisé automatiquement pour les paiements de cette BU
                                    </div>
                                </label>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                    <button type="button" class="btn btn-success" onclick="saveBankAccount()">
                        <i class="fas fa-save me-2"></i>Enregistrer
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>`;

    if (content.includes('id="institutionModal"')) {
        console.log('⚠️  Les modals existent déjà');
        return content;
    }

    content = content.replace(
        '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>',
        modalsHTML
    );
    console.log('✅ Modals ajoutés');
    return content;
}

// Ajouter le script JS
function addJSScript(content) {
    const scriptTag = '<script src="js/banking-settings.js" defer></script>\n</body>';

    if (content.includes('banking-settings.js')) {
        console.log('⚠️  Le script banking-settings.js est déjà inclus');
        return content;
    }

    content = content.replace('</body>', scriptTag);
    console.log('✅ Script JS ajouté');
    return content;
}

// Fonction principale
function main() {
    try {
        console.log('🚀 Début de l\'ajout de l\'onglet Gestion Bancaire...\n');

        // Créer un backup
        backupFile();

        // Lire le fichier
        let content = fs.readFileSync(FINANCIAL_SETTINGS_PATH, 'utf8');
        console.log('✅ Fichier lu\n');

        // Appliquer les modifications
        content = addTabButton(content);
        content = addTabContent(content);
        content = addModals(content);
        content = addJSScript(content);

        // Écrire le fichier modifié
        fs.writeFileSync(FINANCIAL_SETTINGS_PATH, content, 'utf8');
        console.log('\n✅ Fichier modifié avec succès!');
        console.log('📁 Fichier:', FINANCIAL_SETTINGS_PATH);
        console.log('\n🎉 L\'onglet Gestion Bancaire a été ajouté!');
        console.log('\n📋 Prochaines étapes:');
        console.log('   1. Créez le fichier public/js/banking-settings.js');
        console.log('   2. Copiez le code JavaScript depuis bank_accounts_tabs_guide.md');
        console.log('   3. Testez la page /financial-settings.html');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.log('\n🔄 Tentative de restauration du backup...');
        restoreBackup();
        process.exit(1);
    }
}

// Exécuter
main();
