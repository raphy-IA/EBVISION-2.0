const { query } = require('../utils/database');

class Objective {
    // === TYPES D'OBJECTIFS ===

    static async getAllTypes() {
        const sql = `
            SELECT id, code, label, category, unit, is_financial, description
            FROM objective_types
            WHERE is_active = TRUE
            ORDER BY category, label
        `;
        const result = await query(sql);
        return result.rows;
    }

    static async getTypeByCode(code) {
        const sql = `SELECT * FROM objective_types WHERE code = $1`;
        const result = await query(sql, [code]);
        return result.rows[0];
    }

    // === OBJECTIFS GLOBAUX ===

    static async getGlobalObjectives(fiscalYearId) {
        const sql = `
            SELECT 
                go.id,
                go.fiscal_year_id,
                go.objective_type_id,
                ot.code,
                ot.label,
                ot.category,
                ot.unit,
                go.target_value,
                go.description,
                go.weight,
                (
                    SELECT COALESCE(SUM(buo.target_value), 0)
                    FROM business_unit_objectives buo
                    WHERE buo.global_objective_id = go.id
                ) as distributed_value,
                (
                    SELECT COALESCE(SUM(op.current_value), 0)
                    FROM objective_progress op
                    WHERE op.objective_type = 'GLOBAL' AND op.objective_id = go.id
                ) as current_value
            FROM global_objectives go
            JOIN objective_types ot ON go.objective_type_id = ot.id
            WHERE go.fiscal_year_id = $1
            ORDER BY ot.category, ot.label
        `;
        const result = await query(sql, [fiscalYearId]);
        return result.rows;
    }

    static async createGlobalObjective(data) {
        const { fiscal_year_id, objective_type_id, target_value, description, created_by, tracking_type, metric_code } = data;
        const sql = `
            INSERT INTO global_objectives (fiscal_year_id, objective_type_id, target_value, description, created_by, tracking_type, metric_code)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const result = await query(sql, [fiscal_year_id, objective_type_id, target_value, description, created_by, tracking_type || 'MANUAL', metric_code]);

        await this.initProgress('GLOBAL', result.rows[0].id, target_value, created_by);

        return result.rows[0];
    }

    static async updateGlobalObjective(id, data) {
        const { target_value, description } = data;
        const sql = `
            UPDATE global_objectives
            SET target_value = $1, description = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;
        const result = await query(sql, [target_value, description, id]);

        if (result.rows[0]) {
            await this.updateProgressTarget('GLOBAL', id, target_value);
        }

        return result.rows[0];
    }

    static async deleteGlobalObjective(id) {
        const sql = `DELETE FROM global_objectives WHERE id = $1 RETURNING id`;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // === OBJECTIFS BUSINESS UNIT ===

    static async getBusinessUnitObjectives(businessUnitId, fiscalYearId) {
        const sql = `
            SELECT 
                buo.id,
                buo.global_objective_id,
                buo.parent_global_objective_id,
                buo.is_cascaded,
                ot.code,
                ot.label,
                ot.unit,
                buo.target_value,
                go.target_value as global_target,
                buo.description,
                (
                    SELECT COALESCE(SUM(do.target_value), 0)
                    FROM division_objectives do
                    WHERE do.business_unit_objective_id = buo.id
                ) as distributed_value,
                (
                    SELECT COALESCE(SUM(op.current_value), 0)
                    FROM objective_progress op
                    WHERE op.objective_type = 'BUSINESS_UNIT' AND op.objective_id = buo.id
                ) as current_value
            FROM business_unit_objectives buo
            JOIN global_objectives go ON buo.global_objective_id = go.id
            JOIN objective_types ot ON go.objective_type_id = ot.id
            WHERE buo.business_unit_id = $1 AND go.fiscal_year_id = $2
        `;
        const result = await query(sql, [businessUnitId, fiscalYearId]);
        return result.rows;
    }

    static async distributeToBusinessUnit(data) {
        const { global_objective_id, business_unit_id, target_value, description, assigned_by, parent_global_objective_id, is_cascaded } = data;

        // Si cascadé, vérifier le montant restant
        if (is_cascaded && parent_global_objective_id) {
            const remaining = await this.getRemainingAmount('GLOBAL', parent_global_objective_id);
            if (target_value > remaining) {
                console.warn(`⚠️ Sur-distribution: ${target_value} > ${remaining} restant`);
            }
        }

        const checkSql = `
            SELECT id FROM business_unit_objectives 
            WHERE global_objective_id = $1 AND business_unit_id = $2
        `;
        const checkResult = await query(checkSql, [global_objective_id, business_unit_id]);

        let result;
        if (checkResult.rows.length > 0) {
            const sql = `
                UPDATE business_unit_objectives
                SET target_value = $1, description = $2, assigned_by = $3, parent_global_objective_id = $4, is_cascaded = $5, updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING *
            `;
            result = await query(sql, [target_value, description, assigned_by, parent_global_objective_id, is_cascaded || false, checkResult.rows[0].id]);
        } else {
            const sql = `
                INSERT INTO business_unit_objectives (global_objective_id, business_unit_id, target_value, description, assigned_by, tracking_type, metric_code, parent_global_objective_id, is_cascaded)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;
            result = await query(sql, [global_objective_id, business_unit_id, target_value, description, assigned_by, data.tracking_type || 'MANUAL', data.metric_code, parent_global_objective_id, is_cascaded || false]);
        }

        await this.initProgress('BUSINESS_UNIT', result.rows[0].id, target_value, assigned_by);

        return result.rows[0];
    }

    // === OBJECTIFS DIVISION ===

    static async getDivisionObjectives(divisionId, fiscalYearId) {
        const sql = `
            SELECT 
                do.id,
                do.business_unit_objective_id,
                do.parent_bu_objective_id,
                do.is_cascaded,
                ot.code,
                ot.label,
                ot.unit,
                do.target_value,
                buo.target_value as bu_target,
                do.description,
                (
                    SELECT COALESCE(SUM(io.target_value), 0)
                    FROM individual_objectives io
                    WHERE io.division_objective_id = do.id
                ) as distributed_value,
                (
                    SELECT COALESCE(SUM(op.current_value), 0)
                    FROM objective_progress op
                    WHERE op.objective_type = 'DIVISION' AND op.objective_id = do.id
                ) as current_value
            FROM division_objectives do
            JOIN business_unit_objectives buo ON do.business_unit_objective_id = buo.id
            JOIN global_objectives go ON buo.global_objective_id = go.id
            JOIN objective_types ot ON go.objective_type_id = ot.id
            WHERE do.division_id = $1 AND go.fiscal_year_id = $2
        `;
        const result = await query(sql, [divisionId, fiscalYearId]);
        return result.rows;
    }

    static async distributeToDivision(data) {
        const { business_unit_objective_id, division_id, target_value, description, assigned_by, parent_bu_objective_id, is_cascaded } = data;

        // Si cascadé, vérifier le montant restant
        if (is_cascaded && parent_bu_objective_id) {
            const remaining = await this.getRemainingAmount('BUSINESS_UNIT', parent_bu_objective_id);
            if (target_value > remaining) {
                console.warn(`⚠️ Sur-distribution: ${target_value} > ${remaining} restant`);
            }
        }

        const checkSql = `
            SELECT id FROM division_objectives 
            WHERE business_unit_objective_id = $1 AND division_id = $2
        `;
        const checkResult = await query(checkSql, [business_unit_objective_id, division_id]);

        let result;
        if (checkResult.rows.length > 0) {
            const sql = `
                UPDATE division_objectives
                SET target_value = $1, description = $2, assigned_by = $3, parent_bu_objective_id = $4, is_cascaded = $5, updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING *
            `;
            result = await query(sql, [target_value, description, assigned_by, parent_bu_objective_id, is_cascaded || false, checkResult.rows[0].id]);
        } else {
            const sql = `
                INSERT INTO division_objectives (business_unit_objective_id, division_id, target_value, description, assigned_by, tracking_type, metric_code, parent_bu_objective_id, is_cascaded)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;
            result = await query(sql, [business_unit_objective_id, division_id, target_value, description, assigned_by, data.tracking_type || 'MANUAL', data.metric_code, parent_bu_objective_id, is_cascaded || false]);
        }

        await this.initProgress('DIVISION', result.rows[0].id, target_value, assigned_by);

        return result.rows[0];
    }

    // === OBJECTIFS INDIVIDUELS ===

    static async getIndividualObjectives(collaboratorId, fiscalYearId) {
        const sql = `
            SELECT 
                io.id,
                io.division_objective_id,
                io.parent_division_objective_id,
                io.is_cascaded,
                ot.code,
                ot.label,
                ot.unit,
                io.target_value,
                do.target_value as division_target,
                io.description,
                io.start_date,
                io.end_date,
                (
                    SELECT current_value
                    FROM objective_progress op
                    WHERE op.objective_type = 'INDIVIDUAL' AND op.objective_id = io.id
                ) as current_value,
                (
                    SELECT achievement_rate
                    FROM objective_progress op
                    WHERE op.objective_type = 'INDIVIDUAL' AND op.objective_id = io.id
                ) as achievement_rate
            FROM individual_objectives io
            JOIN division_objectives do ON io.division_objective_id = do.id
            JOIN business_unit_objectives buo ON do.business_unit_objective_id = buo.id
            JOIN global_objectives go ON buo.global_objective_id = go.id
            JOIN objective_types ot ON go.objective_type_id = ot.id
            WHERE io.collaborator_id = $1 AND go.fiscal_year_id = $2
        `;
        const result = await query(sql, [collaboratorId, fiscalYearId]);
        return result.rows;
    }

    static async assignToIndividual(data) {
        const { division_objective_id, collaborator_id, target_value, description, assigned_by, start_date, end_date, tracking_type, metric_code, target_grade_id, parent_division_objective_id, is_cascaded } = data;

        const sql = `
            INSERT INTO individual_objectives (division_objective_id, collaborator_id, target_value, description, assigned_by, start_date, end_date, tracking_type, metric_code, target_grade_id, parent_division_objective_id, is_cascaded)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        const result = await query(sql, [division_objective_id, collaborator_id, target_value, description, assigned_by, start_date, end_date, tracking_type || 'MANUAL', metric_code, target_grade_id, parent_division_objective_id, is_cascaded || false]);

        await this.initProgress('INDIVIDUAL', result.rows[0].id, target_value, assigned_by);

        return result.rows[0];
    }

    static async assignToGrade(data) {
        const { division_objective_id, grade_id, target_value, description, assigned_by, start_date, end_date, tracking_type, metric_code } = data;

        const usersSql = `
            SELECT u.id 
            FROM users u
            JOIN collaborateurs c ON u.id = c.user_id
            WHERE c.grade_id = $1 AND u.is_active = TRUE
        `;
        const usersResult = await query(usersSql, [grade_id]);
        const users = usersResult.rows;

        const createdObjectives = [];

        for (const user of users) {
            const objective = await this.assignToIndividual({
                division_objective_id,
                collaborator_id: user.id,
                target_value,
                description,
                assigned_by,
                start_date,
                end_date,
                tracking_type,
                metric_code,
                target_grade_id: grade_id
            });
            createdObjectives.push(objective);
        }

        return createdObjectives;
    }

    // === CALCUL MONTANT RESTANT (CASCADE) ===

    static async getRemainingAmount(type, objectiveId) {
        const tableMap = {
            'GLOBAL': { parent: 'global_objectives', children: 'business_unit_objectives', parentCol: 'parent_global_objective_id' },
            'BUSINESS_UNIT': { parent: 'business_unit_objectives', children: 'division_objectives', parentCol: 'parent_bu_objective_id' },
            'DIVISION': { parent: 'division_objectives', children: 'individual_objectives', parentCol: 'parent_division_objective_id' }
        };

        const config = tableMap[type];
        if (!config) throw new Error(`Type invalide: ${type}`);

        // Récupérer la valeur cible du parent
        const parentSql = `SELECT target_value FROM ${config.parent} WHERE id = $1`;
        const parentResult = await query(parentSql, [objectiveId]);
        if (parentResult.rows.length === 0) throw new Error(`Objectif parent ${objectiveId} introuvable`);

        const parentTarget = parseFloat(parentResult.rows[0].target_value);

        // Calculer la somme déjà distribuée aux enfants cascadés
        const childrenSql = `
            SELECT COALESCE(SUM(target_value), 0) as distributed
            FROM ${config.children}
            WHERE ${config.parentCol} = $1 AND is_cascaded = true
        `;
        const childrenResult = await query(childrenSql, [objectiveId]);
        const distributed = parseFloat(childrenResult.rows[0].distributed);

        return parentTarget - distributed;
    }

    // === OBJECTIFS PARENTS DISPONIBLES ===

    static async getAvailableParents(type, filters = {}) {
        const tableMap = {
            'BUSINESS_UNIT': { table: 'global_objectives', label: 'Global' },
            'DIVISION': { table: 'business_unit_objectives', label: 'BU', filter: 'business_unit_id' },
            'INDIVIDUAL': { table: 'division_objectives', label: 'Division', filter: 'division_id' }
        };

        const config = tableMap[type];
        if (!config) return [];

        let sql = `SELECT id, description, target_value FROM ${config.table} WHERE 1=1`;
        const params = [];

        if (config.filter && filters[config.filter]) {
            params.push(filters[config.filter]);
            sql += ` AND ${config.filter} = $${params.length}`;
        }

        const result = await query(sql, params);
        return result.rows;
    }

    // === PROGRESSION ===

    static async initProgress(type, id, targetValue, userId) {
        const checkSql = `SELECT id FROM objective_progress WHERE objective_type = $1 AND objective_id = $2`;
        const checkResult = await query(checkSql, [type, id]);

        if (checkResult.rows.length === 0) {
            const sql = `
                INSERT INTO objective_progress (objective_type, objective_id, target_value, updated_by)
                VALUES ($1, $2, $3, $4)
            `;
            await query(sql, [type, id, targetValue, userId]);
        } else {
            await this.updateProgressTarget(type, id, targetValue);
        }
    }

    static async updateProgressTarget(type, id, targetValue) {
        const sql = `
            UPDATE objective_progress
            SET target_value = $1
            WHERE objective_type = $2 AND objective_id = $3
        `;
        await query(sql, [targetValue, type, id]);
    }

    static async updateProgress(objectiveType, objectiveId, currentValue, notes, userId) {
        const sql = `
            UPDATE objective_progress
            SET current_value = $1, notes = $2, updated_by = $3, measured_at = CURRENT_TIMESTAMP
            WHERE objective_type = $4 AND objective_id = $5
            RETURNING *
        `;
        const result = await query(sql, [currentValue, notes, userId, objectiveType, objectiveId]);
        return result.rows[0];
    }
}

module.exports = Objective;
