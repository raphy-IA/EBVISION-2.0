const { query } = require('../utils/database');
const ObjectiveMetric = require('../models/ObjectiveMetric');

class MetricCalculator {
    /**
     * Calculer la valeur actuelle d'une métrique
     * @param {string} metricId - ID de la métrique
     * @param {object} filters - Filtres additionnels (fiscal_year_id, business_unit_id, etc.)
     * @returns {number} Valeur calculée
     */
    static async calculateMetricValue(metricId, filters = {}) {
        try {
            // Récupérer la métrique et ses sources
            const metric = await ObjectiveMetric.getById(metricId);
            if (!metric) {
                throw new Error(`Métrique ${metricId} non trouvée`);
            }

            const sources = await ObjectiveMetric.getSources(metricId);
            if (sources.length === 0) {
                console.warn(`Aucune source configurée pour la métrique ${metric.code}`);
                return 0;
            }

            let totalValue = 0;

            // Calculer selon le type de calcul
            switch (metric.calculation_type) {
                case 'SUM':
                    totalValue = await this.calculateSum(sources, filters);
                    break;
                case 'COUNT':
                    totalValue = await this.calculateCount(sources, filters);
                    break;
                case 'AVERAGE':
                    totalValue = await this.calculateAverage(sources, filters);
                    break;
                case 'PERCENTAGE':
                    totalValue = await this.calculatePercentage(sources, filters);
                    break;
                default:
                    console.warn(`Type de calcul ${metric.calculation_type} non supporté`);
                    totalValue = 0;
            }

            return totalValue;
        } catch (error) {
            console.error('Erreur lors du calcul de métrique:', error);
            throw error;
        }
    }

    /**
     * Calculer une somme à partir des sources
     */
    static async calculateSum(sources, filters) {
        let total = 0;

        for (const source of sources) {
            if (!source.data_source_table || !source.data_source_value_column) {
                continue;
            }

            const value = await this.querySourceValue(source, filters, 'SUM');
            total += value * (source.weight || 1.0);
        }

        return total;
    }

    /**
     * Calculer un comptage à partir des sources
     */
    static async calculateCount(sources, filters) {
        let total = 0;

        for (const source of sources) {
            if (!source.data_source_table) {
                continue;
            }

            const value = await this.querySourceValue(source, filters, 'COUNT');
            total += value * (source.weight || 1.0);
        }

        return total;
    }

    /**
     * Calculer une moyenne à partir des sources
     */
    static async calculateAverage(sources, filters) {
        if (sources.length === 0) return 0;

        const sum = await this.calculateSum(sources, filters);
        return sum / sources.length;
    }

    /**
     * Calculer un pourcentage à partir des sources
     * Suppose que la première source est le numérateur et la seconde le dénominateur
     */
    static async calculatePercentage(sources, filters) {
        if (sources.length < 2) {
            console.warn('Calcul de pourcentage nécessite au moins 2 sources');
            return 0;
        }

        const numerator = await this.querySourceValue(sources[0], filters, 'COUNT');
        const denominator = await this.querySourceValue(sources[1], filters, 'COUNT');

        if (denominator === 0) return 0;
        return (numerator / denominator) * 100;
    }

    /**
     * Exécuter une requête sur une source de données
     */
    static async querySourceValue(source, filters, aggregation = 'SUM') {
        try {
            const { data_source_table, data_source_value_column, data_source_filter_column, filter_conditions } = source;

            // Construire la requête SQL dynamiquement
            let sql = `SELECT ${aggregation}(`;

            if (aggregation === 'COUNT') {
                sql += '*';
            } else {
                sql += data_source_value_column || '*';
            }

            sql += `) as value FROM ${data_source_table} WHERE 1=1`;

            const params = [];
            let paramIndex = 1;

            // Ajouter les conditions de filtrage de la source
            if (filter_conditions && data_source_filter_column) {
                const conditions = typeof filter_conditions === 'string'
                    ? JSON.parse(filter_conditions)
                    : filter_conditions;

                for (const [key, value] of Object.entries(conditions)) {
                    if (key === data_source_filter_column) {
                        sql += ` AND ${key} = $${paramIndex}`;
                        params.push(value);
                        paramIndex++;
                    }
                }
            }

            // Ajouter les filtres additionnels (fiscal_year_id, business_unit_id, etc.)
            for (const [key, value] of Object.entries(filters)) {
                if (value !== null && value !== undefined) {
                    sql += ` AND ${key} = $${paramIndex}`;
                    params.push(value);
                    paramIndex++;
                }
            }

            const result = await query(sql, params);
            return parseFloat(result.rows[0]?.value || 0);
        } catch (error) {
            console.error(`Erreur lors de la requête sur ${source.data_source_table}:`, error);
            return 0;
        }
    }

    /**
     * Mettre à jour la progression d'un objectif basé sur une métrique
     * @param {string} objectiveId - ID de l'objectif
     * @param {string} objectiveTable - Table de l'objectif (global_objectives, etc.)
     */
    static async updateObjectiveProgress(objectiveId, objectiveTable) {
        try {
            // Récupérer l'objectif
            const objectiveSql = `
                SELECT id, metric_id, target_value, fiscal_year_id, business_unit_id, division_id
                FROM ${objectiveTable}
                WHERE id = $1 AND objective_mode = 'METRIC'
            `;
            const objectiveResult = await query(objectiveSql, [objectiveId]);

            if (objectiveResult.rows.length === 0) {
                return;
            }

            const objective = objectiveResult.rows[0];
            if (!objective.metric_id) {
                return;
            }

            // Construire les filtres selon le niveau
            const filters = {
                fiscal_year_id: objective.fiscal_year_id
            };

            if (objective.business_unit_id) {
                filters.business_unit_id = objective.business_unit_id;
            }
            if (objective.division_id) {
                filters.division_id = objective.division_id;
            }

            // Calculer la valeur actuelle
            const currentValue = await this.calculateMetricValue(objective.metric_id, filters);

            // Calculer le pourcentage de progression
            const progress = objective.target_value > 0
                ? (currentValue / objective.target_value) * 100
                : 0;

            // Mettre à jour l'objectif
            const updateSql = `
                UPDATE ${objectiveTable}
                SET current_value = $1, progress_percentage = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `;
            await query(updateSql, [currentValue, Math.min(progress, 100), objectiveId]);

            console.log(`✅ Progression mise à jour pour objectif ${objectiveId}: ${currentValue}/${objective.target_value} (${progress.toFixed(1)}%)`);
        } catch (error) {
            console.error('Erreur lors de la mise à jour de progression:', error);
        }
    }

    /**
     * Mettre à jour toutes les progressions des objectifs basés sur métriques
     */
    static async updateAllMetricObjectives() {
        const tables = [
            'global_objectives',
            'business_unit_objectives',
            'division_objectives',
            'individual_objectives'
        ];

        for (const table of tables) {
            try {
                const sql = `SELECT id FROM ${table} WHERE objective_mode = 'METRIC' AND metric_id IS NOT NULL`;
                const result = await query(sql);

                for (const row of result.rows) {
                    await this.updateObjectiveProgress(row.id, table);
                }
            } catch (error) {
                console.error(`Erreur lors de la mise à jour de ${table}:`, error);
            }
        }
    }
}

module.exports = MetricCalculator;
