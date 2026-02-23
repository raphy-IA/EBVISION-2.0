// ============================================
// BIBLIOTHÈQUE DE TEMPLATES D'OBJECTIFS
// Permet au DG de créer des objectifs globaux
// depuis les 12 templates standards en 3 clics.
// ============================================

const categoryMeta = {
    COMMERCIAL: {
        label: 'Commercial',
        icon: 'fas fa-handshake',
        color: 'primary',
        bg: 'rgba(13,110,253,0.08)'
    },
    OPERATIONNEL: {
        label: 'Opérationnel',
        icon: 'fas fa-cogs',
        color: 'success',
        bg: 'rgba(25,135,84,0.08)'
    },
    RH: {
        label: 'Ressources Humaines',
        icon: 'fas fa-users',
        color: 'warning',
        bg: 'rgba(255,193,7,0.08)'
    },
    FINANCIER: {
        label: 'Financier',
        icon: 'fas fa-chart-line',
        color: 'info',
        bg: 'rgba(13,202,240,0.08)'
    }
};

let allTemplates = [];
let selectedTemplates = {}; // { code: { target_value } }

/**
 * Ouvrir le modal de bibliothèque de templates
 */
async function openTemplateLibraryModal() {
    // Label de l'exercice
    const fySelect = document.getElementById('fiscalYearSelect');
    const fyLabel = fySelect ? fySelect.options[fySelect.selectedIndex]?.text : 'exercice courant';
    const fyEl = document.getElementById('tplFiscalYearLabel');
    if (fyEl) fyEl.textContent = fyLabel;

    // Afficher le modal
    const modal = new bootstrap.Modal(document.getElementById('templateLibraryModal'));
    modal.show();

    // Charger les templates si pas déjà chargé
    await loadTemplates();
    renderTemplateLibrary();
}

/**
 * Charger les templates depuis l'API
 */
async function loadTemplates() {
    if (allTemplates.length > 0) return; // cache

    try {
        const response = await fetch('/api/objectives/templates', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            const data = await response.json();
            allTemplates = data.templates || [];
        } else {
            console.error('Erreur chargement templates:', response.status);
        }
    } catch (err) {
        console.error('Erreur fetch templates:', err);
    }
}

/**
 * Rendre la liste des templates dans le modal
 */
function renderTemplateLibrary() {
    const container = document.getElementById('templateLibraryContent');
    if (!container) return;

    if (!allTemplates.length) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Aucun template disponible. Vérifiez que la migration 037 a bien été exécutée.
            </div>`;
        return;
    }

    // Grouper par catégorie
    const grouped = {};
    allTemplates.forEach(t => {
        if (!grouped[t.category]) grouped[t.category] = [];
        grouped[t.category].push(t);
    });

    let html = '';
    Object.entries(grouped).forEach(([cat, templates]) => {
        const meta = categoryMeta[cat] || { label: cat, icon: 'fas fa-bullseye', color: 'secondary', bg: '#f8f9fa' };
        html += `
        <div class="mb-4">
            <div class="d-flex align-items-center mb-3 p-2 rounded" style="background:${meta.bg}">
                <i class="${meta.icon} text-${meta.color} me-2 fa-fw"></i>
                <h6 class="mb-0 fw-bold text-${meta.color}">${meta.label}</h6>
                <span class="badge bg-${meta.color} ms-2 opacity-75">${templates.length}</span>
            </div>
            <div class="row g-3">
        `;

        templates.forEach(t => {
            const isSelected = selectedTemplates[t.code] !== undefined;
            const trackingBadge = t.tracking_type === 'AUTOMATIC'
                ? '<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 small"><i class="fas fa-robot me-1"></i>Auto</span>'
                : '<span class="badge bg-secondary bg-opacity-10 text-secondary border small"><i class="fas fa-hand-paper me-1"></i>Manuel</span>';

            html += `
            <div class="col-md-6">
                <div class="card h-100 border-2 template-card ${isSelected ? 'border-' + meta.color + ' selected' : 'border-light'}"
                     id="tpl-card-${t.code}"
                     style="cursor:pointer; transition: all 0.2s;"
                     onclick="toggleTemplateSelection('${t.code}', '${meta.color}')">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div class="form-check mb-0">
                                <input class="form-check-input border-${meta.color}" type="checkbox"
                                       id="tpl-check-${t.code}"
                                       ${isSelected ? 'checked' : ''}
                                       onclick="event.stopPropagation(); toggleTemplateSelection('${t.code}', '${meta.color}')">
                                <label class="form-check-label fw-semibold" for="tpl-check-${t.code}">
                                    ${t.label}
                                </label>
                            </div>
                            ${trackingBadge}
                        </div>
                        <p class="text-muted small mb-2">${t.description || ''}</p>
                        ${t.metric_label ? `<div class="text-muted small"><i class="fas fa-chart-bar me-1"></i>Mesure : ${t.metric_label}</div>` : ''}

                        <!-- Champ valeur cible (visible seulement si sélectionné) -->
                        <div id="tpl-target-${t.code}" class="${isSelected ? 'd-block' : 'd-none'} mt-3" onclick="event.stopPropagation()">
                            <label class="form-label small fw-semibold">Valeur Cible <span class="text-danger">*</span></label>
                            <div class="input-group input-group-sm">
                                <input type="number" class="form-control"
                                       id="tpl-value-${t.code}"
                                       placeholder="Ex: 500000000"
                                       value="${selectedTemplates[t.code]?.target_value || ''}"
                                       min="0" step="any"
                                       oninput="updateTemplateTargetValue('${t.code}', this.value)">
                                <span class="input-group-text">${t.unit_code || ''}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        });

        html += `</div></div>`;
    });

    container.innerHTML = html;
    updateSelectionCount();
}

/**
 * Toggle la sélection d'un template
 */
function toggleTemplateSelection(code, color) {
    const checkbox = document.getElementById(`tpl-check-${code}`);
    const card = document.getElementById(`tpl-card-${code}`);
    const targetDiv = document.getElementById(`tpl-target-${code}`);

    if (selectedTemplates[code] !== undefined) {
        // Désélectionner
        delete selectedTemplates[code];
        if (checkbox) checkbox.checked = false;
        if (card) {
            card.classList.remove(`border-${color}`, 'selected');
            card.classList.add('border-light');
        }
        if (targetDiv) targetDiv.classList.replace('d-block', 'd-none');
    } else {
        // Sélectionner
        selectedTemplates[code] = { target_value: '' };
        if (checkbox) checkbox.checked = true;
        if (card) {
            card.classList.remove('border-light');
            card.classList.add(`border-${color}`, 'selected');
        }
        if (targetDiv) targetDiv.classList.replace('d-none', 'd-block');
    }

    updateSelectionCount();
}

/**
 * Mettre à jour la valeur cible d'un template
 */
function updateTemplateTargetValue(code, value) {
    if (selectedTemplates[code] !== undefined) {
        selectedTemplates[code].target_value = value;
    }
    updateSelectionCount();
}

/**
 * Mettre à jour le compteur et l'état du bouton
 */
function updateSelectionCount() {
    const count = Object.keys(selectedTemplates).length;
    const countEl = document.getElementById('tplSelectionCount');
    const btnEl = document.getElementById('tplCreateBtn');

    if (countEl) countEl.textContent = `${count} objectif(s) sélectionné(s)`;
    if (btnEl) {
        const allHaveValues = Object.values(selectedTemplates).every(v => v.target_value && parseFloat(v.target_value) > 0);
        btnEl.disabled = count === 0 || !allHaveValues;
    }
}

/**
 * Créer tous les objectifs sélectionnés depuis les templates
 */
async function createFromSelectedTemplates() {
    const codes = Object.keys(selectedTemplates);
    if (!codes.length) return;

    const fiscalYearId = typeof currentFiscalYearId !== 'undefined' ? currentFiscalYearId : null;
    if (!fiscalYearId) {
        alert('⚠️ Veuillez sélectionner un exercice fiscal d\'abord.');
        return;
    }

    const btn = document.getElementById('tplCreateBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Création en cours...'; }

    let successCount = 0;
    let errors = [];

    for (const code of codes) {
        const { target_value } = selectedTemplates[code];
        if (!target_value || parseFloat(target_value) <= 0) {
            errors.push(`Valeur cible manquante pour ${code}`);
            continue;
        }

        try {
            const response = await fetch('/api/objectives/from-template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    template_code: code,
                    fiscal_year_id: fiscalYearId,
                    target_value: parseFloat(target_value)
                })
            });

            const data = await response.json();
            if (response.ok) {
                successCount++;
            } else {
                errors.push(`${code}: ${data.message}`);
            }
        } catch (err) {
            errors.push(`${code}: Erreur réseau`);
        }
    }

    if (btn) {
        btn.innerHTML = '<i class="fas fa-plus me-2"></i>Créer les objectifs sélectionnés';
    }

    // Fermer le modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('templateLibraryModal'));
    if (modal) modal.hide();

    // Reset sélection
    selectedTemplates = {};
    allTemplates = []; // Force reload next time

    // Feedback
    if (successCount > 0) {
        console.log(`✅ ${successCount} objectif(s) créé(s) depuis les templates`);
        if (errors.length === 0) {
            showNotification(`✅ ${successCount} objectif(s) créé(s) avec succès !`, 'success');
        } else {
            showNotification(`✅ ${successCount} créé(s), ⚠️ ${errors.length} erreur(s) : ${errors.join(', ')}`, 'warning');
        }
    } else {
        showNotification(`❌ Erreurs : ${errors.join(', ')}`, 'danger');
    }

    // Recharger les objectifs
    if (typeof loadObjectives === 'function') loadObjectives();
}

/**
 * Afficher une notification temporaire
 */
function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible position-fixed bottom-0 end-0 m-3 shadow`;
    toast.style.zIndex = '9999';
    toast.style.maxWidth = '400px';
    toast.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}
