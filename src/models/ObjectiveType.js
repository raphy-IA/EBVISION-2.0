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

        let { code, label, category, unit, is_financial, description, is_active, entity_type, operation, value_field } = data;

        console.log('🔍 Avant normalisation - entity_type:', entity_type, 'type:', typeof entity_type);

        // Normaliser les chaînes vides en null
        entity_type = entity_type || null;
        operation = operation || null;
        value_field = value_field || null;
        unit = unit || null;
        const finalIsActive = is_active !== undefined ? is_active : true;

        console.log('🔍 Après normalisation - entity_type:', entity_type, 'operation:', operation, 'value_field:', value_field);

        // Validation: si entity_type est fourni, operation et value_field doivent l'être aussi
        if (entity_type && (!operation || !value_field)) {
            console.error('❌ Validation échouée - entity_type:', entity_type, 'operation:', operation, 'value_field:', value_field);
            throw new Error('Si entity_type est fourni, operation et value_field sont requis');
        }

        const sql = `
            INSERT INTO objective_types(code, label, category, unit, is_financial, description, is_active, entity_type, operation, value_field)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        const result = await query(sql, [
            code,
            label,
            category || 'STRATEGIC',
            unit,
            is_financial || false,
            description,
            finalIsActive,
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
        const current = await this.getById(id);
        if (!current) return null;

        let { label, category, unit, is_financial, description, is_active, entity_type, operation, value_field } = data;

        const finalLabel = label !== undefined ? label : current.label;
        const finalCategory = category !== undefined ? category : current.category;
        const finalUnit = unit !== undefined ? unit : current.unit;
        const finalIsFinancial = is_financial !== undefined ? is_financial : current.is_financial;
        const finalDescription = description !== undefined ? description : current.description;
        const finalIsActive = is_active !== undefined ? is_active : current.is_active;
        const finalEntityType = entity_type !== undefined ? entity_type : current.entity_type;
        const finalOperation = operation !== undefined ? operation : current.operation;
        const finalValueField = value_field !== undefined ? value_field : current.value_field;

        // Normaliser les chaînes vides en null pour les champs optionnels fournis
        const normEntityType = finalEntityType || null;
        const normOperation = finalOperation || null;
        const normValueField = finalValueField || null;

        // Validation: si entity_type est fourni (final ou existant), operation et value_field doivent l'être aussi
        if (normEntityType && (!normOperation || !normValueField)) {
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
            finalLabel,
            finalCategory,
            finalUnit,
            finalIsFinancial,
            finalDescription,
            finalIsActive,
            normEntityType,
            normOperation,
            normValueField,
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
