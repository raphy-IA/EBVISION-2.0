const { query } = require('../utils/database');

class ObjectiveMetric {
    static async getAll() {
        const sql = `
            SELECT 
                m.id,
                m.code,
                m.label,
                m.description,
                m.calculation_type,
                m.target_unit_id,
                u.code as unit_code,
                u.label as unit_label,
                u.symbol as unit_symbol,
                m.is_active,
                (
                    SELECT json_agg(json_build_object(
                        'id', s.id,
                        'objective_type_id', s.objective_type_id,
                        'objective_type_label', ot.label,
                        'opportunity_type', s.filter_conditions->>'opportunity_type_id',
                        'value_field', s.data_source_value_column
                    ))
                    FROM objective_metric_sources s
                    LEFT JOIN objective_types ot ON s.objective_type_id = ot.id
                    WHERE s.metric_id = m.id
                ) as sources
            FROM objective_metrics m
            LEFT JOIN objective_units u ON m.target_unit_id = u.id
            WHERE m.is_active = TRUE
            ORDER BY m.label
        `;
        const result = await query(sql);
        return result.rows;
    }

    /**
     * Récupérer une métrique par son ID avec ses sources
     */
    static async getById(id) {
        const sql = `
            SELECT 
                m.id,
                m.code,
                m.label,
                m.description,
                m.calculation_type,
                m.target_unit_id,
                u.code as unit_code,
                u.label as unit_label,
                u.symbol as unit_symbol,
                m.is_active
            FROM objective_metrics m
            LEFT JOIN objective_units u ON m.target_unit_id = u.id
            WHERE m.id = $1
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    /**
     * Récupérer les sources d'une métrique
     */
    static async getSources(metricId) {
        const sql = `
            SELECT 
                s.id,
                s.metric_id,
                s.objective_type_id,
                ot.label as type_label,
                s.unit_id,
                u.label as unit_label,
                s.weight,
                s.filter_conditions,
                s.data_source_table,
                s.data_source_value_column,
                s.data_source_filter_column
            FROM objective_metric_sources s
            LEFT JOIN objective_types ot ON s.objective_type_id = ot.id
            LEFT JOIN objective_units u ON s.unit_id = u.id
            WHERE s.metric_id = $1::uuid
            ORDER BY s.weight DESC
        `;
        const result = await query(sql, [metricId]);
        return result.rows;
    }

    /**
     * Créer une nouvelle métrique
     */
    static async create(data) {
        const { code, label, description, calculation_type, target_unit_id } = data;
        const sql = `
            INSERT INTO objective_metrics (code, label, description, calculation_type, target_unit_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await query(sql, [code, label, description, calculation_type, target_unit_id]);
        return result.rows[0];
    }

    /**
     * Mettre à jour une métrique
     */
    static async update(id, data) {
        const { label, description, calculation_type, target_unit_id, is_active } = data;
        const sql = `
            UPDATE objective_metrics
            SET label = $1, 
                description = $2, 
                calculation_type = $3, 
                target_unit_id = $4, 
                is_active = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `;
        const result = await query(sql, [label, description, calculation_type, target_unit_id, is_active, id]);
        return result.rows[0];
    }

    static async addSource(data) {
        const {
            metric_id,
            objective_type_id,
            unit_id,
            weight,
            filter_conditions,
            data_source_table,
            data_source_value_column,
            data_source_filter_column
        } = data;

        const sql = `
            INSERT INTO objective_metric_sources (
                metric_id, 
                objective_type_id, 
                unit_id, 
                weight, 
                filter_conditions,
                data_source_table,
                data_source_value_column,
                data_source_filter_column
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const result = await query(sql, [
            metric_id,
            objective_type_id,
            unit_id,
            weight || 1.0,
            filter_conditions ? JSON.stringify(filter_conditions) : null,
            data_source_table,
            data_source_value_column,
            data_source_filter_column
        ]);

        return result.rows[0];
    }

    /**
     * Supprimer une source
     */
    static async deleteSource(sourceId) {
        const sql = `DELETE FROM objective_metric_sources WHERE id = $1 RETURNING id`;
        const result = await query(sql, [sourceId]);
        return result.rows[0];
    }

    /**
     * Désactiver une métrique
     */
    static async deactivate(id) {
        const sql = `
            UPDATE objective_metrics
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    /**
     * Récupérer les métriques impactées par un type d'objectif
     */
    static async getImpactedByType(objectiveTypeId, unitId) {
        const sql = `
            SELECT DISTINCT
                m.id,
                m.code,
                m.label,
                m.description,
                u.symbol as unit_symbol
            FROM objective_metrics m
            JOIN objective_metric_sources s ON m.id = s.metric_id
            LEFT JOIN objective_units u ON m.target_unit_id = u.id
            WHERE s.objective_type_id = $1
            AND ($2::uuid IS NULL OR s.unit_id = $2)
            AND m.is_active = TRUE
            ORDER BY m.label
        `;
        const result = await query(sql, [objectiveTypeId, unitId || null]);
        return result.rows;
    }
}

module.exports = ObjectiveMetric;
