/**
 * Utility for unified Fiscal Year selection and status-based UI enforcement.
 * Usage: Load this script on any page needing fiscal year filtering.
 */

const FiscalYearSelector = {
    _data: [],
    _currentId: null,
    _selectedId: null,
    _storageKey: 'ebvision_selected_fiscal_year_id',

    /**
     * Initialize the selector and populate the provided <select> element.
     * @param {string} selectId - ID of the <select> element.
     * @param {Function} onChange - Callback when the selection changes.
     */
    async init(selectId, onChange) {
        try {
            const response = await fetch('/api/fiscal-years', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const result = await response.json();
            this._data = result.data || result.data.fiscalYears || [];

            // Identify "EN_COURS"
            const current = this._data.find(fy => fy.statut === 'EN_COURS');
            this._currentId = current ? current.id : (this._data.length > 0 ? this._data[0].id : null);

            // Recall selection or default to current
            const stored = sessionStorage.getItem(this._storageKey);
            // Use stored value only if it's a real ID (non-null, non-empty)
            this._selectedId = (stored && stored.length > 0) ? stored : this._currentId;

            this.populateSelect(selectId);
            this.enforceStatusRules();

            if (onChange) {
                document.getElementById(selectId).addEventListener('change', (e) => {
                    this._selectedId = e.target.value;
                    sessionStorage.setItem(this._storageKey, this._selectedId);
                    this.enforceStatusRules();
                    onChange(this._selectedId);
                });
                // Initial trigger
                onChange(this._selectedId);
            }
        } catch (error) {
            console.error('Error initializing FiscalYearSelector:', error);
        }
    },

    /**
     * Fill the dropdown with available years.
     */
    populateSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Always show all fiscal years — no empty option (year is always required)
        select.innerHTML = this._data.map(fy => `
            <option value="${fy.id}" ${fy.id == this._selectedId ? 'selected' : ''}>
                ${fy.libelle || fy.annee} ${fy.statut === 'EN_COURS' ? '(En cours)' : (fy.statut === 'FERMEE' ? '(Clos)' : '')}
            </option>
        `).join('');

        // Apply the selected value on the DOM element
        if (this._selectedId) select.value = this._selectedId;
    },

    /**
     * Returns the currently selected year object.
     */
    getSelectedYear() {
        return this._data.find(fy => fy.id == this._selectedId);
    },

    /**
     * Logic for Disabling/Hiding UI elements based on Fiscal Year status.
     * Rules: 
     * - Create only if "EN_COURS"
     * - Edit allowed if "EN_COURS" or "OUVERTE"
     * - Read-only if "FERMEE"
     */
    enforceStatusRules() {
        const selected = this.getSelectedYear();
        if (!selected) return;

        // Elements to disable for creation (CSS classes or custom IDs)
        const createButtons = document.querySelectorAll('.btn-create-new, #btn-create-new, #btn-create-from-opp');
        const editButtons = document.querySelectorAll('.btn-edit, .btn-modify');

        if (selected.statut !== 'EN_COURS') {
            createButtons.forEach(btn => btn.classList.add('d-none'));
        } else {
            createButtons.forEach(btn => btn.classList.remove('d-none'));
        }

        if (selected.statut === 'FERMEE') {
            editButtons.forEach(btn => btn.classList.add('d-none'));
            // Potential alert for read-only mode
            this.showReadOnlyAlert();
        } else {
            editButtons.forEach(btn => btn.classList.remove('d-none'));
            this.hideReadOnlyAlert();
        }
    },

    showReadOnlyAlert() {
        if (!document.getElementById('readonly-alert')) {
            const alert = document.createElement('div');
            alert.id = 'readonly-alert';
            alert.className = 'alert alert-warning py-2 mb-3';
            alert.innerHTML = '<i class="fas fa-lock me-2"></i>Cette année fiscale est clôturée. L\'affichage est en lecture seule.';
            const container = document.querySelector('.main-content-area .container-fluid');
            if (container) container.prepend(alert);
        }
    },

    hideReadOnlyAlert() {
        const alert = document.getElementById('readonly-alert');
        if (alert) alert.remove();
    }
};
