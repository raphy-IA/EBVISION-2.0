// Gestionnaire de la feuille de temps moderne
class TimeSheetManager {
    constructor() {
        this.currentTimeSheet = null;
        this.activities = [];
        this.currentWeek = this.getCurrentWeek();
        
        this.initializeEventListeners();
        this.loadInitialData();
    }
    
    // Initialiser les écouteurs d'événements
    initializeEventListeners() {
        // Sélecteur de semaine
        document.getElementById('weekSelector').addEventListener('change', (e) => {
            this.loadTimeSheetForWeek(e.target.value);
        });
        
        // Boutons d'action
        document.getElementById('saveBtn').addEventListener('click', () => this.saveTimeSheet());
        document.getElementById('submitBtn').addEventListener('click', () => this.submitTimeSheet());
        document.getElementById('addActivityBtn').addEventListener('click', () => this.showAddActivityModal());
        
        // Modal d'ajout d'activité
        document.getElementById('activityType').addEventListener('change', (e) => this.handleActivityTypeChange(e.target.value));
        document.getElementById('confirmAddActivity').addEventListener('click', () => this.addActivity());
    }
    
    // Charger les données initiales
    async loadInitialData() {
        try {
            this.showLoading(true);
            await this.loadCurrentTimeSheet();
        } catch (error) {
            console.error('Erreur lors du chargement des données initiales:', error);
            this.showAlert('Erreur lors du chargement des données', 'danger');
        } finally {
            this.showLoading(false);
        }
    }
    
    // Obtenir la semaine actuelle
    getCurrentWeek() {
        const now = new Date();
        const year = now.getFullYear();
        const week = this.getWeekNumber(now);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    }
    
    // Calculer le numéro de semaine ISO
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
    
    // Charger la feuille de temps actuelle
    async loadCurrentTimeSheet() {
        try {
            const response = await fetch('/api/time-sheets/current', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentTimeSheet = data.data;
                this.updateWeekSelector();
                this.updateStatusBadge();
                this.loadTimeEntries();
            }
        } catch (error) {
            console.error('Erreur lors du chargement de la feuille de temps actuelle:', error);
        }
    }
    
    // Charger les entrées de temps
    async loadTimeEntries() {
        if (!this.currentTimeSheet) return;
        
        try {
            const response = await fetch(`/api/time-entries?week_start=${this.currentTimeSheet.week_start_date}&week_end=${this.currentTimeSheet.week_end_date}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.activities = this.groupTimeEntriesByActivity(data.data || []);
                this.renderTimeSheet();
                this.updateSummary();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des entrées de temps:', error);
        }
    }
    
    // Grouper les entrées de temps par activité
    groupTimeEntriesByActivity(timeEntries) {
        const grouped = {};
        
        timeEntries.forEach(entry => {
            const key = `${entry.mission_id || 'internal'}_${entry.type_heures}`;
            if (!grouped[key]) {
                grouped[key] = {
                    id: entry.id,
                    mission_id: entry.mission_id,
                    type_heures: entry.type_heures,
                    description: entry.description,
                    monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
                    friday: 0, saturday: 0, sunday: 0, total: 0
                };
            }
            
            const date = new Date(entry.date_saisie);
            const dayOfWeek = date.getDay();
            const hours = parseFloat(entry.heures) || 0;
            
            switch (dayOfWeek) {
                case 1: grouped[key].monday += hours; break;
                case 2: grouped[key].tuesday += hours; break;
                case 3: grouped[key].wednesday += hours; break;
                case 4: grouped[key].thursday += hours; break;
                case 5: grouped[key].friday += hours; break;
                case 6: grouped[key].saturday += hours; break;
                case 0: grouped[key].sunday += hours; break;
            }
            
            grouped[key].total += hours;
        });
        
        return Object.values(grouped);
    }
    
    // Rendre la feuille de temps
    renderTimeSheet() {
        const tbody = document.getElementById('timeSheetBody');
        tbody.innerHTML = '';
        
        this.activities.forEach((activity, index) => {
            const row = this.createActivityRow(activity, index);
            tbody.appendChild(row);
        });
        
        this.updateTotals();
    }
    
    // Créer une ligne d'activité
    createActivityRow(activity, index) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="fw-bold">${this.getActivityName(activity)}</div>
                <small class="text-muted">${activity.description || ''}</small>
            </td>
            <td><input type="number" class="form-control time-input" value="${activity.monday}" min="0" max="24" step="0.5" data-day="monday" data-index="${index}"></td>
            <td><input type="number" class="form-control time-input" value="${activity.tuesday}" min="0" max="24" step="0.5" data-day="tuesday" data-index="${index}"></td>
            <td><input type="number" class="form-control time-input" value="${activity.wednesday}" min="0" max="24" step="0.5" data-day="wednesday" data-index="${index}"></td>
            <td><input type="number" class="form-control time-input" value="${activity.thursday}" min="0" max="24" step="0.5" data-day="thursday" data-index="${index}"></td>
            <td><input type="number" class="form-control time-input" value="${activity.friday}" min="0" max="24" step="0.5" data-day="friday" data-index="${index}"></td>
            <td><input type="number" class="form-control time-input" value="${activity.saturday}" min="0" max="24" step="0.5" data-day="saturday" data-index="${index}"></td>
            <td><input type="number" class="form-control time-input" value="${activity.sunday}" min="0" max="24" step="0.5" data-day="sunday" data-index="${index}"></td>
            <td class="fw-bold">${activity.total.toFixed(1)}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="timeSheetManager.removeActivity(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        // Ajouter les écouteurs d'événements pour les inputs
        row.querySelectorAll('.time-input').forEach(input => {
            input.addEventListener('change', (e) => this.updateActivityHours(e));
        });
        
        return row;
    }
    
    // Obtenir le nom de l'activité
    getActivityName(activity) {
        if (activity.mission_id) {
            return 'Mission';
        } else {
            return 'Activité interne';
        }
    }
    
    // Mettre à jour les heures d'une activité
    updateActivityHours(event) {
        const input = event.target;
        const day = input.dataset.day;
        const index = parseInt(input.dataset.index);
        const hours = parseFloat(input.value) || 0;
        
        this.activities[index][day] = hours;
        this.updateActivityTotal(index);
        this.updateTotals();
        this.updateSummary();
    }
    
    // Mettre à jour le total d'une activité
    updateActivityTotal(index) {
        const activity = this.activities[index];
        activity.total = activity.monday + activity.tuesday + activity.wednesday + 
                       activity.thursday + activity.friday + activity.saturday + activity.sunday;
        
        // Mettre à jour l'affichage du total
        const row = document.querySelector(`[data-index="${index}"]`).closest('tr');
        const totalCell = row.querySelector('td:nth-child(9)');
        totalCell.textContent = activity.total.toFixed(1);
    }
    
    // Mettre à jour les totaux
    updateTotals() {
        const totals = {
            monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
            friday: 0, saturday: 0, sunday: 0, grand: 0
        };
        
        this.activities.forEach(activity => {
            totals.monday += activity.monday;
            totals.tuesday += activity.tuesday;
            totals.wednesday += activity.wednesday;
            totals.thursday += activity.thursday;
            totals.friday += activity.friday;
            totals.saturday += activity.saturday;
            totals.sunday += activity.sunday;
            totals.grand += activity.total;
        });
        
        document.getElementById('totalMonday').textContent = totals.monday.toFixed(1);
        document.getElementById('totalTuesday').textContent = totals.tuesday.toFixed(1);
        document.getElementById('totalWednesday').textContent = totals.wednesday.toFixed(1);
        document.getElementById('totalThursday').textContent = totals.thursday.toFixed(1);
        document.getElementById('totalFriday').textContent = totals.friday.toFixed(1);
        document.getElementById('totalSaturday').textContent = totals.saturday.toFixed(1);
        document.getElementById('totalSunday').textContent = totals.sunday.toFixed(1);
        document.getElementById('grandTotal').textContent = totals.grand.toFixed(1);
    }
    
    // Mettre à jour le résumé
    updateSummary() {
        let totalHours = 0;
        let chargeableHours = 0;
        let nonChargeableHours = 0;
        let daysWorked = 0;
        
        this.activities.forEach(activity => {
            totalHours += activity.total;
            
            if (activity.mission_id) {
                chargeableHours += activity.total;
            } else {
                nonChargeableHours += activity.total;
            }
        });
        
        // Compter les jours travaillés
        const weekTotals = [
            this.getDayTotal('monday'),
            this.getDayTotal('tuesday'),
            this.getDayTotal('wednesday'),
            this.getDayTotal('thursday'),
            this.getDayTotal('friday'),
            this.getDayTotal('saturday'),
            this.getDayTotal('sunday')
        ];
        
        daysWorked = weekTotals.filter(total => total > 0).length;
        
        document.getElementById('totalHours').textContent = totalHours.toFixed(1);
        document.getElementById('chargeableHours').textContent = chargeableHours.toFixed(1);
        document.getElementById('nonChargeableHours').textContent = nonChargeableHours.toFixed(1);
        document.getElementById('daysWorked').textContent = daysWorked;
    }
    
    // Obtenir le total d'un jour
    getDayTotal(day) {
        return this.activities.reduce((total, activity) => total + activity[day], 0);
    }
    
    // Sauvegarder la feuille de temps
    async saveTimeSheet() {
        try {
            this.showLoading(true);
            await this.saveTimeEntries();
            this.showAlert('Feuille de temps sauvegardée avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            this.showAlert('Erreur lors de la sauvegarde', 'danger');
        } finally {
            this.showLoading(false);
        }
    }
    
    // Sauvegarder les entrées de temps
    async saveTimeEntries() {
        const promises = [];
        
        this.activities.forEach(activity => {
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            
            days.forEach((day, dayIndex) => {
                const hours = activity[day];
                if (hours > 0) {
                    const date = this.getDateForDay(dayIndex);
                    
                    const timeEntryData = {
                        date_saisie: date,
                        heures: hours,
                        mission_id: activity.mission_id || null,
                        type_heures: activity.type_heures,
                        description: activity.description
                    };
                    
                    promises.push(this.saveTimeEntry(timeEntryData));
                }
            });
        });
        
        await Promise.all(promises);
    }
    
    // Sauvegarder une entrée de temps
    async saveTimeEntry(timeEntryData) {
        const response = await fetch('/api/time-entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(timeEntryData)
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors de la sauvegarde de l\'entrée de temps');
        }
    }
    
    // Obtenir la date pour un jour de la semaine
    getDateForDay(dayIndex) {
        const weekStart = new Date(this.currentTimeSheet.week_start_date);
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + dayIndex);
        return date.toISOString().split('T')[0];
    }
    
    // Soumettre la feuille de temps
    async submitTimeSheet() {
        try {
            this.showLoading(true);
            
            // Sauvegarder d'abord
            await this.saveTimeEntries();
            
            // Puis soumettre
            const response = await fetch(`/api/time-sheets/${this.currentTimeSheet.id}/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentTimeSheet = data.data;
                this.updateStatusBadge();
                this.showAlert('Feuille de temps soumise avec succès', 'success');
            } else {
                throw new Error('Erreur lors de la soumission');
            }
        } catch (error) {
            console.error('Erreur lors de la soumission:', error);
            this.showAlert('Erreur lors de la soumission', 'danger');
        } finally {
            this.showLoading(false);
        }
    }
    
    // Afficher le modal d'ajout d'activité
    showAddActivityModal() {
        const modal = new bootstrap.Modal(document.getElementById('addActivityModal'));
        modal.show();
    }
    
    // Gérer le changement de type d'activité
    handleActivityTypeChange(type) {
        const missionSection = document.getElementById('missionSection');
        const internalSection = document.getElementById('internalSection');
        
        missionSection.style.display = type === 'mission' ? 'block' : 'none';
        internalSection.style.display = type === 'internal' ? 'block' : 'none';
    }
    
    // Ajouter une activité
    addActivity() {
        const activityType = document.getElementById('activityType').value;
        const description = document.getElementById('activityDescription').value;
        
        if (!activityType) {
            this.showAlert('Veuillez sélectionner un type d\'activité', 'warning');
            return;
        }
        
        const newActivity = {
            id: Date.now(),
            mission_id: activityType === 'mission' ? 'temp-mission-id' : null,
            type_heures: activityType === 'mission' ? 'chargeable' : 'non-chargeable',
            description: description,
            monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
            friday: 0, saturday: 0, sunday: 0, total: 0
        };
        
        this.activities.push(newActivity);
        this.renderTimeSheet();
        this.updateSummary();
        
        // Fermer le modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addActivityModal'));
        modal.hide();
        
        this.showAlert('Activité ajoutée avec succès', 'success');
    }
    
    // Supprimer une activité
    removeActivity(index) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette activité ?')) {
            this.activities.splice(index, 1);
            this.renderTimeSheet();
            this.updateSummary();
            this.showAlert('Activité supprimée', 'info');
        }
    }
    
    // Mettre à jour le sélecteur de semaine
    updateWeekSelector() {
        if (this.currentTimeSheet) {
            const weekValue = `${this.currentTimeSheet.year}-W${this.currentTimeSheet.week_number.toString().padStart(2, '0')}`;
            document.getElementById('weekSelector').value = weekValue;
        }
    }
    
    // Mettre à jour le badge de statut
    updateStatusBadge() {
        if (!this.currentTimeSheet) return;
        
        const badge = document.getElementById('statusBadge');
        badge.className = `status-badge status-${this.currentTimeSheet.status}`;
        
        const statusTexts = {
            'draft': 'Brouillon',
            'submitted': 'Soumise',
            'approved': 'Approuvée',
            'rejected': 'Rejetée'
        };
        
        badge.textContent = statusTexts[this.currentTimeSheet.status] || 'Inconnu';
    }
    
    // Afficher/masquer le chargement
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.style.display = show ? 'block' : 'none';
    }
    
    // Afficher une alerte
    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-modern alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.main-content-area');
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-dismiss après 5 secondes
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Initialiser le gestionnaire de feuille de temps
let timeSheetManager;

document.addEventListener('DOMContentLoaded', () => {
    timeSheetManager = new TimeSheetManager();
}); 