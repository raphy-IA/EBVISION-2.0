const { pool } = require('../utils/database');

class OpportunityType {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.default_probability = data.default_probability;
        this.default_duration_days = data.default_duration_days;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Récupérer tous les types d'opportunités
    static async findAll() {
        try {
            const query = `
                SELECT * FROM opportunity_types 
                WHERE is_active = true 
                ORDER BY name ASC
            `;
            const result = await pool.query(query);
            return result.rows.map(row => new OpportunityType(row));
        } catch (error) {
            console.error('Erreur lors de la récupération des types d\'opportunités:', error);
            throw error;
        }
    }

    // Récupérer un type par ID
    static async findById(id) {
        try {
            const query = 'SELECT * FROM opportunity_types WHERE id = $1';
            const result = await pool.query(query, [id]);
            if (result.rows.length === 0) return null;
            return new OpportunityType(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la récupération du type d\'opportunité:', error);
            throw error;
        }
    }

    // Créer un nouveau type
    static async create(data) {
        try {
            const query = `
                INSERT INTO opportunity_types (name, description, default_probability, default_duration_days)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const values = [
                data.name,
                data.description,
                data.default_probability || 50,
                data.default_duration_days || 30
            ];
            const result = await pool.query(query, values);
            return new OpportunityType(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la création du type d\'opportunité:', error);
            throw error;
        }
    }

    // Mettre à jour un type
    async update(data) {
        try {
            const query = `
                UPDATE opportunity_types SET
                    name = COALESCE($1, name),
                    description = COALESCE($2, description),
                    default_probability = COALESCE($3, default_probability),
                    default_duration_days = COALESCE($4, default_duration_days),
                    is_active = COALESCE($5, is_active),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING *
            `;
            const values = [
                data.name,
                data.description,
                data.default_probability,
                data.default_duration_days,
                data.is_active,
                this.id
            ];
            const result = await pool.query(query, values);
            if (result.rows.length > 0) {
                Object.assign(this, result.rows[0]);
            }
            return this;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du type d\'opportunité:', error);
            throw error;
        }
    }

    // Supprimer un type (soft delete)
    async delete() {
        try {
            const query = `
                UPDATE opportunity_types 
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;
            await pool.query(query, [this.id]);
            this.is_active = false;
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression du type d\'opportunité:', error);
            throw error;
        }
    }

    // Récupérer les templates d'étapes pour ce type
    async getStageTemplates() {
        try {
            const query = `
                SELECT * FROM opportunity_stage_templates 
                WHERE opportunity_type_id = $1 
                ORDER BY stage_order ASC
            `;
            const result = await pool.query(query, [this.id]);
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des templates d\'étapes:', error);
            throw error;
        }
    }

    // Créer automatiquement les étapes pour une opportunité
    async createStagesForOpportunity(opportunityId) {
        try {
            // Éviter toute duplication: si des étapes existent déjà pour cette opportunité, ne rien créer
            const existingStages = await pool.query(
                'SELECT 1 FROM opportunity_stages WHERE opportunity_id = $1 LIMIT 1',
                [opportunityId]
            );
            if (existingStages.rows.length > 0) {
                return [];
            }

            const templates = await this.getStageTemplates();
            const stages = [];

            for (const template of templates) {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + template.max_duration_days);

                const query = `
                    INSERT INTO opportunity_stages (
                        opportunity_id, stage_template_id, stage_name, stage_order,
                        status, due_date, notes
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `;
                const values = [
                    opportunityId,
                    template.id,
                    template.stage_name,
                    template.stage_order,
                    template.stage_order === 1 ? 'IN_PROGRESS' : 'PENDING',
                    dueDate,
                    template.description
                ];
                const result = await pool.query(query, values);
                stages.push(result.rows[0]);
            }

            return stages;
        } catch (error) {
            console.error('Erreur lors de la création des étapes pour l\'opportunité:', error);
            throw error;
        }
    }
}

module.exports = OpportunityType; 