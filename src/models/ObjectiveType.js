const { query } = require('../utils/database');

class ObjectiveType {
    /**
     * Récupérer tous les types d'objectifs actifs
     */
    static async getAll() {
        const sql = `
            SELECT id, code, label, category, unit, is_financial, description, is_active,
                   entity_type, operation, value_field
            FROM objective_types
            WHERE is_active = TRUE
            ORDER BY category, label
        `;
        const result = await query(sql);
        return result.rows;
    }

    /**
     * Récupérer un type par son ID
     */
    static async getById(id) {
        const sql = `SELECT * FROM objective_types WHERE id = $1`;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    /**
     * Créer un nouveau type d'objectif
     */
    static async create(data) {
        console.log('🔍 ObjectiveType.create - Données reçues:', JSON.stringify(data, null, 2));

        let { code, label, category, unit, is_financial, description, entity_type, operation, value_field } = data;

        console.log('🔍 Avant normalisation - entity_type:', entity_type, 'type:', typeof entity_type);

        // Normaliser les chaînes vides en null
        entity_type = entity_type || null;
        operation = operation || null;
        value_field = value_field || null;
        unit = unit || null;

        console.log('🔍 Après normalisation - entity_type:', entity_type, 'operation:', operation, 'value_field:', value_field);

        // Validation: si entity_type est fourni, operation et value_field doivent l'être aussi
        if (entity_type && (!operation || !value_field)) {
            console.error('❌ Validation échouée - entity_type:', entity_type, 'operation:', operation, 'value_field:', value_field);
            throw new Error('Si entity_type est fourni, operation et value_field sont requis');
        }

        const sql = `
            INSERT INTO objective_types (code, label, category, unit, is_financial, description, entity_type, operation, value_field)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const result = await query(sql, [
            code,
            label,
            category || 'STRATEGIC',
            unit,
            is_financial || false,
            description,
            entity_type || null,
            operation || null,
            value_field || null
        ]);
        return result.rows[0];
    }

    /**
     * Mettre à jour un type d'objectif
     */
    static async update(id, data) {
        let { label, category, unit, is_financial, description, is_active, entity_type, operation, value_field } = data;

        // Normaliser les chaînes vides en null
        entity_type = entity_type || null;
        operation = operation || null;
        value_field = value_field || null;
        unit = unit || null;

        // Validation: si entity_type est fourni, operation et value_field doivent l'être aussi
        if (entity_type && (!operation || !value_field)) {
            throw new Error('Si entity_type est fourni, operation et value_field sont requis');
        }

        const sql = `
            UPDATE objective_types
            SET label = $1, category = $2, unit = $3, is_financial = $4, description = $5, is_active = $6,
                entity_type = $7, operation = $8, value_field = $9, updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `;
        const result = await query(sql, [
            label,
            category,
            unit,
            is_financial,
            description,
            is_active,
            entity_type || null,
            operation || null,
            value_field || null,
            id
        ]);
        return result.rows[0];
    }

    /**
     * Désactiver un type d'objectif
     */
    static async delete(id) {
        const sql = `
            UPDATE objective_types
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }
}

module.exports = ObjectiveType;
