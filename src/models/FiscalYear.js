const { query } = require('../utils/database');

class FiscalYear {
    // Créer une nouvelle année fiscale
    static async create(fiscalYearData) {
        const {
            annee,
            libelle,
            date_debut,
            date_fin,
            statut
        } = fiscalYearData;

        const sql = `
            INSERT INTO fiscal_years (annee, libelle, date_debut, date_fin, budget_global, statut)
            VALUES ($1, $2, $3, $4, NULL, $5)
            RETURNING id, annee, libelle, date_debut, date_fin, budget_global, statut, created_at
        `;

        const result = await query(sql, [annee, libelle || `FY${annee}`, date_debut, date_fin, statut || 'OUVERTE']);
        return result.rows[0];
    }

    // Récupérer une année fiscale par ID
    static async findById(id) {
        const sql = `
            SELECT id, annee, libelle, date_debut, date_fin, budget_global, statut, created_at, updated_at
            FROM fiscal_years
            WHERE id = $1
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Récupérer une année fiscale par année
    static async findByYear(annee) {
        const sql = `
            SELECT id, annee, libelle, date_debut, date_fin, budget_global, statut, created_at, updated_at
            FROM fiscal_years
            WHERE annee = $1
        `;

        const result = await query(sql, [annee]);
        return result.rows[0] || null;
    }

    // Récupérer l'année fiscale actuelle
    static async getCurrent() {
        const sql = `
            SELECT id, annee, libelle, date_debut, date_fin, budget_global, statut, created_at, updated_at
            FROM fiscal_years
            WHERE statut = 'EN_COURS'
            LIMIT 1
        `;

        const result = await query(sql);
        return result.rows[0] || null;
    }

    // Récupérer toutes les années fiscales
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            statut = ''
        } = options;

        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];

        if (statut) {
            conditions.push(`statut = $${params.length + 1}`);
            params.push(statut);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Requête pour le total
        const countSql = `
            SELECT COUNT(*) as total
            FROM fiscal_years
            ${whereClause}
        `;

        const countResult = await query(countSql, params);
        const total = parseInt(countResult.rows[0].total);

        // Requête pour les données
        const sql = `
            SELECT id, annee, libelle, date_debut, date_fin, budget_global, statut, created_at, updated_at
            FROM fiscal_years
            ${whereClause}
            ORDER BY annee DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const result = await query(sql, [...params, limit, offset]);

        return {
            fiscalYears: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Récupérer toutes les années fiscales (pour les listes déroulantes)
    static async findActive() {
        const sql = `
            SELECT id, annee, libelle, date_debut, date_fin, budget_global, statut
            FROM fiscal_years
            WHERE statut IN ('OUVERTE', 'EN_COURS')
            ORDER BY annee DESC
        `;

        const result = await query(sql);
        return result.rows;
    }

    // Mettre à jour une année fiscale
    static async update(id, updateData) {
        const allowedFields = ['libelle', 'date_debut', 'date_fin', 'budget_global', 'statut'];
        const updates = [];
        const values = [];

        // Construire la requête de mise à jour dynamiquement
        Object.keys(updateData).forEach((key, index) => {
            if (allowedFields.includes(key) && updateData[key] !== undefined) {
                updates.push(`${key} = $${index + 2}`);
                values.push(updateData[key]);
            }
        });

        if (updates.length === 0) {
            throw new Error('Aucun champ valide à mettre à jour');
        }

        const sql = `
            UPDATE fiscal_years 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, annee, libelle, date_debut, date_fin, budget_global, statut, updated_at
        `;

        const result = await query(sql, [id, ...values]);
        return result.rows[0] || null;
    }

    // Supprimer une année fiscale
    static async delete(id) {
        const sql = `
            DELETE FROM fiscal_years 
            WHERE id = $1
            RETURNING id, annee, statut
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Fermer une année fiscale
    static async close(id) {
        const sql = `
            UPDATE fiscal_years 
            SET statut = 'FERMEE', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, annee, statut, updated_at
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Ouvrir une année fiscale
    static async open(id) {
        // Ne fermer AUCUNE autre année (selon les exigences utilisateur)
        // L'ouverture ne doit affecter que l'année concernée

        const sql = `
            UPDATE fiscal_years 
            SET statut = 'OUVERTE', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, annee, statut, updated_at
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Marquer une année comme en cours
    static async setAsCurrent(id) {
        // Fermer seulement les autres années en cours (pas les années ouvertes)
        const sqlCloseOthers = `
            UPDATE fiscal_years 
            SET statut = 'FERMEE', updated_at = CURRENT_TIMESTAMP
            WHERE statut = 'EN_COURS' AND id != $1
        `;
        await query(sqlCloseOthers, [id]);

        const sql = `
            UPDATE fiscal_years 
            SET statut = 'EN_COURS', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, annee, statut, updated_at
        `;

        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Fermer toutes les années ouvertes
    static async closeAllOpen() {
        const sql = `
            UPDATE fiscal_years 
            SET statut = 'FERMEE', updated_at = CURRENT_TIMESTAMP
            WHERE statut IN ('OUVERTE', 'EN_COURS')
        `;

        await query(sql);
    }

    // Récupérer les statistiques d'une année fiscale
    static async getStats(fiscalYearId) {
        const sql = `
            SELECT 
                fy.id,
                fy.annee,
                fy.budget_global,
                fy.statut,
                COUNT(DISTINCT d.id) as total_divisions,
                SUM(d.budget_annuel) as total_budget_divisions,
                COUNT(DISTINCT u.id) as total_users,
                COUNT(CASE WHEN u.statut = 'ACTIF' THEN 1 END) as active_users,
                AVG(u.taux_horaire) as avg_hourly_rate,
                SUM(u.taux_horaire) as total_hourly_rate
            FROM fiscal_years fy
            LEFT JOIN divisions d ON d.statut = 'ACTIF'
            LEFT JOIN users u ON u.division_id = d.id AND u.statut = 'ACTIF'
            WHERE fy.id = $1
            GROUP BY fy.id, fy.annee, fy.budget_global, fy.statut
        `;

        const result = await query(sql, [fiscalYearId]);
        return result.rows[0] || null;
    }

    // Récupérer les statistiques globales des années fiscales
    static async getGlobalStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_fiscal_years,
                COUNT(CASE WHEN statut = 'OUVERTE' THEN 1 END) as open_years,
                COUNT(CASE WHEN statut = 'EN_COURS' THEN 1 END) as current_years,
                COUNT(CASE WHEN statut = 'FERMEE' THEN 1 END) as closed_years,
                SUM(budget_global) as total_budget,
                AVG(budget_global) as avg_budget,
                MIN(annee) as min_year,
                MAX(annee) as max_year
            FROM fiscal_years
        `;

        const result = await query(sql);
        return result.rows[0];
    }

    // Récupérer l'utilisation du budget par division pour une année fiscale
    static async getBudgetUsageByDivision(fiscalYearId) {
        const sql = `
            SELECT 
                d.id,
                d.nom,
                d.code,
                d.budget_annuel,
                COUNT(u.id) as user_count,
                COALESCE(SUM(u.taux_horaire * 160 * 12), 0) as estimated_cost_per_year,
                CASE 
                    WHEN d.budget_annuel > 0 THEN 
                        (COALESCE(SUM(u.taux_horaire * 160 * 12), 0) / d.budget_annuel) * 100
                    ELSE 0 
                END as budget_usage_percentage
            FROM fiscal_years fy
            CROSS JOIN divisions d
            LEFT JOIN users u ON d.id = u.division_id AND u.statut = 'ACTIF'
            WHERE fy.id = $1 AND d.statut = 'ACTIF'
            GROUP BY d.id, d.nom, d.code, d.budget_annuel
            ORDER BY budget_usage_percentage DESC
        `;

        const result = await query(sql, [fiscalYearId]);
        return result.rows;
    }

    // Vérifier si une année fiscale peut être supprimée
    static async canDelete(fiscalYearId) {
        const fiscalYear = await this.findById(fiscalYearId);
        if (!fiscalYear) {
            return false;
        }

        // Ne peut pas supprimer une année en cours ou ouverte
        if (fiscalYear.statut === 'EN_COURS' || fiscalYear.statut === 'OUVERTE') {
            return false;
        }

        return true;
    }

    // Récupérer les années fiscales avec leur utilisation de budget
    static async getFiscalYearsWithBudgetUsage() {
        const sql = `
            SELECT 
                fy.id,
                fy.annee,
                fy.date_debut,
                fy.date_fin,
                fy.budget_global,
                fy.statut,
                COALESCE(SUM(d.budget_annuel), 0) as total_division_budget,
                CASE 
                    WHEN fy.budget_global > 0 THEN 
                        (COALESCE(SUM(d.budget_annuel), 0) / fy.budget_global) * 100
                    ELSE 0 
                END as budget_allocation_percentage
            FROM fiscal_years fy
            LEFT JOIN divisions d ON d.statut = 'ACTIF'
            GROUP BY fy.id, fy.annee, fy.date_debut, fy.date_fin, fy.budget_global, fy.statut
            ORDER BY fy.annee DESC
        `;

        const result = await query(sql);
        return result.rows;
    }

    // Récupérer les années fiscales récentes
    static async getRecentFiscalYears(limit = 5) {
        const sql = `
            SELECT id, annee, date_debut, date_fin, budget_global, statut
            FROM fiscal_years
            ORDER BY annee DESC
            LIMIT $1
        `;

        const result = await query(sql, [limit]);
        return result.rows;
    }

    // Vérifier si une date appartient à une année fiscale
    static async getFiscalYearForDate(date) {
        const sql = `
            SELECT id, annee, date_debut, date_fin, budget_global, statut
            FROM fiscal_years
            WHERE $1::date BETWEEN date_debut AND date_fin
            LIMIT 1
        `;

        const result = await query(sql, [date]);
        return result.rows[0] || null;
    }

    // Créer automatiquement les années fiscales pour une plage d'années
    static async createRange(startYear, endYear) {
        const fiscalYears = [];

        for (let year = startYear; year <= endYear; year++) {
            const dateDebut = `${year}-01-01`;
            const dateFin = `${year}-12-31`;
            const budgetGlobal = 2500000; // Budget par défaut

            try {
                const fiscalYear = await this.create({
                    annee: year,
                    date_debut: dateDebut,
                    date_fin: dateFin,
                    budget_global: budgetGlobal
                });

                fiscalYears.push(fiscalYear);
            } catch (error) {
                // Ignorer les erreurs de doublon
                if (error.code !== '23505') {
                    throw error;
                }
            }
        }

        return fiscalYears;
    }
    // Calculer et mettre à jour le budget global basé sur les objectifs
    static async calculateGlobalBudget(id) {
        // Calculer le budget via la fonction SQL
        const sqlCalc = `SELECT calculate_global_budget($1) as calculated_budget`;
        const resultCalc = await query(sqlCalc, [id]);
        const calculatedBudget = resultCalc.rows[0].calculated_budget;

        // Mettre à jour le champ budget_global pour la performance
        const sqlUpdate = `
            UPDATE fiscal_years 
            SET budget_global = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING budget_global
        `;
        await query(sqlUpdate, [id, calculatedBudget]);

        return calculatedBudget;
    }
}

module.exports = FiscalYear; 