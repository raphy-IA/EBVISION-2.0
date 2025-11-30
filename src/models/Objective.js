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

    // Helper pour trouver le type d'un objectif par son ID
    static async getObjectiveTypeById(id) {
        // Vérifier Global
        const globalRes = await query('SELECT id FROM global_objectives WHERE id = $1', [id]);
        if (globalRes.rows.length > 0) return 'GLOBAL';

        // Vérifier BU
        const buRes = await query('SELECT id FROM business_unit_objectives WHERE id = $1', [id]);
        if (buRes.rows.length > 0) return 'BUSINESS_UNIT';

        // Vérifier Division
        const divRes = await query('SELECT id FROM division_objectives WHERE id = $1', [id]);
        if (divRes.rows.length > 0) return 'DIVISION';

        // Vérifier Grade
        const gradeRes = await query('SELECT id FROM grade_objectives WHERE id = $1', [id]);
        if (gradeRes.rows.length > 0) return 'GRADE';

        // Vérifier Individuel
        const indRes = await query('SELECT id FROM individual_objectives WHERE id = $1', [id]);
        if (indRes.rows.length > 0) return 'INDIVIDUAL';

        return null;
    }

    // === OBJECTIFS GLOBAUX ===

    static async getGlobalObjectives(fiscalYearId) {
        const sql = `
            SELECT 
                go.id,
                go.fiscal_year_id,
                go.objective_mode,
                go.metric_id,
                go.objective_type_id,
                go.unit_id,
                COALESCE(ot.code, om.code) as code,
                COALESCE(ot.label, om.label) as label,
                COALESCE(ot.category, 'STRATEGIC') as category,
                COALESCE(ot.unit, ou.symbol) as unit,
                go.target_value,
                go.description,
                go.weight,
                go.tracking_type,
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
            LEFT JOIN objective_types ot ON go.objective_type_id = ot.id
            LEFT JOIN objective_metrics om ON go.metric_id = om.id
            LEFT JOIN objective_units ou ON go.unit_id = ou.id
            WHERE go.fiscal_year_id = $1
            ORDER BY COALESCE(ot.category, 'STRATEGIC'), COALESCE(ot.label, om.label)
        `;
        const result = await query(sql, [fiscalYearId]);
        return result.rows;
    }

    static async getAllObjectives(fiscalYearId) {
        // Fetch Global
        const globalSql = `
            SELECT 
                go.*, 
                'GLOBAL' as scope,
                COALESCE(ot.code, om.code) as type_code,
                COALESCE(ot.label, om.label) as type_label,
                ot.category as type_category,
                ot.is_financial as is_financial
            FROM global_objectives go
            LEFT JOIN objective_types ot ON go.objective_type_id = ot.id
            LEFT JOIN objective_metrics om ON go.metric_id = om.id
            WHERE go.fiscal_year_id = $1
        `;
        const globalResult = await query(globalSql, [fiscalYearId]);

        // Fetch BU
        const buSql = `
            SELECT 
                buo.*, 
                'BU' as scope,
                COALESCE(ot.code, om.code) as type_code,
                COALESCE(ot.label, om.label) as type_label,
                ot.category as type_category,
                ot.is_financial as is_financial,
                bu.nom as business_unit_name
            FROM business_unit_objectives buo
            JOIN global_objectives go ON buo.global_objective_id = go.id
            LEFT JOIN business_units bu ON buo.business_unit_id = bu.id
            LEFT JOIN objective_types ot ON buo.objective_type_id = ot.id
            LEFT JOIN objective_metrics om ON buo.metric_id = om.id
            WHERE go.fiscal_year_id = $1
        `;
        const buResult = await query(buSql, [fiscalYearId]);

        // Fetch Division
        const divSql = `
            SELECT 
                div_obj.*, 
                'DIVISION' as scope,
                COALESCE(ot.code, om.code) as type_code,
                COALESCE(ot.label, om.label) as type_label,
                ot.category as type_category,
                ot.is_financial as is_financial,
                d.nom as division_name
            FROM division_objectives div_obj
            JOIN business_unit_objectives buo ON div_obj.parent_bu_objective_id = buo.id
            JOIN global_objectives go ON buo.global_objective_id = go.id
            LEFT JOIN divisions d ON div_obj.division_id = d.id
            LEFT JOIN objective_types ot ON div_obj.objective_type_id = ot.id
            LEFT JOIN objective_metrics om ON div_obj.metric_id = om.id
            WHERE go.fiscal_year_id = $1
        `;
        const divResult = await query(divSql, [fiscalYearId]);

        return [
            ...globalResult.rows,
            ...buResult.rows,
            ...divResult.rows
        ];
    }

    static async createGlobalObjective(data) {
        const {
            fiscal_year_id,
            title,
            description,
            target_value,
            weight,
            objective_mode,
            metric_id,
            objective_type_id,
            unit_id,
            tracking_type,
            created_by
        } = data;

        const sql = `
            INSERT INTO global_objectives (
                fiscal_year_id, 
                title,
                description, 
                target_value, 
                weight,
                objective_mode,
                metric_id,
                objective_type_id,
                unit_id,
                tracking_type,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const result = await query(sql, [
            fiscal_year_id,
            title,
            description,
            target_value,
            weight || 100,
            objective_mode,
            metric_id || null,
            objective_type_id || null,
            unit_id || null,
            tracking_type || 'MANUAL',
            created_by
        ]);

        await this.initProgress('GLOBAL', result.rows[0].id, target_value, created_by);

        return result.rows[0];
    }

    static async updateGlobalObjective(id, data) {
        const { target_value, description, weight, tracking_type, metric_code, objective_type_id } = data;
        const sql = `
            UPDATE global_objectives
            SET target_value = $1, description = $2, weight = $3, tracking_type = $4, metric_code = $5, objective_type_id = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
        RETURNING *
            `;
        const result = await query(sql, [target_value, description, weight, tracking_type, metric_code, objective_type_id, id]);

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

    static async deleteBusinessUnitObjective(id) {
        const sql = `DELETE FROM business_unit_objectives WHERE id = $1 RETURNING id`;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    static async deleteDivisionObjective(id) {
        const sql = `DELETE FROM division_objectives WHERE id = $1 RETURNING id`;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    static async deleteGradeObjective(id) {
        const sql = `DELETE FROM grade_objectives WHERE id = $1 RETURNING id`;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    static async deleteIndividualObjective(id) {
        const sql = `DELETE FROM individual_objectives WHERE id = $1 RETURNING id`;
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
                console.warn(`⚠️ Sur - distribution: ${target_value} > ${remaining} restant`);
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
                INSERT INTO business_unit_objectives(global_objective_id, business_unit_id, target_value, description, assigned_by, tracking_type, metric_code, parent_global_objective_id, is_cascaded)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
                console.warn(`⚠️ Sur - distribution: ${target_value} > ${remaining} restant`);
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
                INSERT INTO division_objectives(business_unit_objective_id, division_id, target_value, description, assigned_by, tracking_type, metric_code, parent_bu_objective_id, is_cascaded)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
            `;
            result = await query(sql, [business_unit_objective_id, division_id, target_value, description, assigned_by, data.tracking_type || 'MANUAL', data.metric_code, parent_bu_objective_id, is_cascaded || false]);
        }

        await this.initProgress('DIVISION', result.rows[0].id, target_value, assigned_by);

        return result.rows[0];
    }

    // === OBJECTIFS INDIVIDUELS ===

    static async getIndividualObjectives(collaboratorId, fiscalYearId) {
        const sql = 'SELECT io.id, io.division_objective_id, io.parent_division_objective_id, io.is_cascaded, ' +
            'COALESCE(ot.code, io_ot.code) as code, COALESCE(ot.label, io_ot.label) as label, COALESCE(ot.unit, io_ot.unit) as unit, ' +
            'io.target_value, dobj.target_value as division_target, io.description, io.start_date, io.end_date, ' +
            '(SELECT current_value FROM objective_progress op WHERE op.objective_type = \'INDIVIDUAL\' AND op.objective_id = io.id) as current_value, ' +
            '(SELECT achievement_rate FROM objective_progress op WHERE op.objective_type = \'INDIVIDUAL\' AND op.objective_id = io.id) as achievement_rate ' +
            'FROM individual_objectives io ' +
            'LEFT JOIN division_objectives dobj ON io.division_objective_id = dobj.id ' +
            'LEFT JOIN business_unit_objectives buo ON dobj.business_unit_objective_id = buo.id ' +
            'LEFT JOIN global_objectives go ON buo.global_objective_id = go.id ' +
            'LEFT JOIN objective_types ot ON go.objective_type_id = ot.id ' +
            'LEFT JOIN objective_types io_ot ON io.objective_type_id = io_ot.id ' +
            'WHERE io.collaborator_id = $1 AND (go.fiscal_year_id = $2 OR io.fiscal_year_id = $2)';
        const result = await query(sql, [collaboratorId, fiscalYearId]);
        return result.rows;
    }

    static async assignToIndividual(data) {
        const {
            division_objective_id, collaborator_id, target_value, description, assigned_by,
            start_date, end_date, tracking_type, metric_code, target_grade_id,
            parent_division_objective_id, is_cascaded,
            fiscal_year_id, objective_type_id, objective_mode, metric_id, unit_id, title
        } = data;

        const sql = `
            INSERT INTO individual_objectives(
                division_objective_id, collaborator_id, target_value, description, assigned_by, 
                start_date, end_date, tracking_type, metric_code, target_grade_id, 
                parent_division_objective_id, is_cascaded,
                fiscal_year_id, objective_type_id, objective_mode, metric_id, unit_id, title
            )
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *
        `;
        const result = await query(sql, [
            division_objective_id || null,
            collaborator_id,
            target_value,
            description,
            assigned_by,
            start_date || null,
            end_date || null,
            tracking_type || 'MANUAL',
            metric_code,
            target_grade_id,
            parent_division_objective_id,
            is_cascaded || false,
            fiscal_year_id,
            objective_type_id,
            objective_mode,
            metric_id,
            unit_id,
            title
        ]);

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
                ...data, // Pass all data (including fiscal_year_id, objective_type_id, etc.)
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
        if (!config) throw new Error(`Type invalide: ${type} `);

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

        let sql = `SELECT id, description, target_value, objective_type_id, tracking_type, metric_code FROM ${config.table} WHERE 1 = 1`;
        const params = [];

        if (config.filter && filters[config.filter]) {
            params.push(filters[config.filter]);
            sql += ` AND ${config.filter} = $${params.length} `;
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
                INSERT INTO objective_progress(objective_type, objective_id, target_value, updated_by)
        VALUES($1, $2, $3, $4)
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

    // === DISTRIBUTION MULTI-ENFANTS ===

    /**
     * Générer le titre d'un objectif enfant
     */
    static generateChildTitle(parentTitle, childType, childName) {
        const typeLabels = {
            'BUSINESS_UNIT': 'BU',
            'DIVISION': 'Division',
            'GRADE': 'Grade',
            'INDIVIDUAL': ''
        };

        const typeLabel = typeLabels[childType] || childType;
        return typeLabel ? `${parentTitle} - ${typeLabel} ${childName} ` : `${parentTitle} - ${childName} `;
    }

    /**
     * Récupérer le résumé de distribution d'un objectif parent
     */
    static async getDistributionSummary(parentId) {
        // Déterminer le type de l'objectif parent
        const parentInfo = await this.getObjectiveInfo(parentId);
        if (!parentInfo) {
            throw new Error('Objectif parent introuvable');
        }

        const { type: parentType, table: parentTable } = parentInfo;

        // Calculer le montant distribué
        const childTableMap = {
            'GLOBAL': 'business_unit_objectives',
            'BUSINESS_UNIT': 'division_objectives',
            'DIVISION': 'grade_objectives',
            'GRADE': 'individual_objectives'
        };

        const childTable = childTableMap[parentType];
        if (!childTable) {
            return {
                total_target: parentInfo.target_value,
                distributed: 0,
                remaining: parentInfo.target_value,
                distribution_percentage: 0,
                children_count: 0
            };
        }

        const parentColumnMap = {
            'GLOBAL': 'global_objective_id',
            'BUSINESS_UNIT': 'parent_bu_objective_id',
            'DIVISION': 'parent_division_objective_id',
            'GRADE': 'parent_grade_objective_id'
        };

        const parentColumn = parentColumnMap[parentType];

        const sql = `
        SELECT
        COUNT(*) as children_count,
            COALESCE(SUM(target_value), 0) as distributed
            FROM ${childTable}
            WHERE ${parentColumn} = $1
        `;

        const result = await query(sql, [parentId]);
        const { children_count, distributed } = result.rows[0];

        const remaining = parentInfo.target_value - parseFloat(distributed);
        const distribution_percentage = parentInfo.target_value > 0
            ? (parseFloat(distributed) / parentInfo.target_value) * 100
            : 0;

        return {
            parent_id: parentId,
            parent_type: parentType,
            parent_title: parentInfo.title || parentInfo.description,
            total_target: parseFloat(parentInfo.target_value),
            weight: parseFloat(parentInfo.weight),
            distributed: parseFloat(distributed),
            remaining: remaining,
            distribution_percentage: Math.round(distribution_percentage * 100) / 100,
            children_count: parseInt(children_count),
            objective_type_id: parentInfo.objective_type_id,
            tracking_type: parentInfo.tracking_type,
            metric_code: parentInfo.metric_code
        };
    }

    /**
     * Récupérer les informations d'un objectif (type, table, données)
     */
    static async getObjectiveInfo(objectiveId) {
        const tables = [
            { type: 'GLOBAL', table: 'global_objectives' },
            { type: 'BUSINESS_UNIT', table: 'business_unit_objectives' },
            { type: 'DIVISION', table: 'division_objectives' },
            { type: 'GRADE', table: 'grade_objectives' },
            { type: 'INDIVIDUAL', table: 'individual_objectives' }
        ];

        for (const { type, table } of tables) {
            try {
                const sql = `SELECT * FROM ${table} WHERE id = $1`;
                const result = await query(sql, [objectiveId]);
                if (result.rows.length > 0) {
                    return { ...result.rows[0], type, table };
                }
            } catch (error) {
                // Ignore errors related to invalid ID format (e.g. uuid vs int)
                // console.warn(`Skipping table ${table} for id ${objectiveId}: ${error.message}`);
                continue;
            }
        }

        return null;
    }

    /**
     * Récupérer les entités disponibles pour distribution
     * @param {string} parentId - ID de l'objectif parent
     * @param {string} childType - Type d'enfant (BUSINESS_UNIT, DIVISION, INDIVIDUAL)
     * @param {string} gradeId - Optionnel : ID du grade pour filtrer les collaborateurs
     */
    static async getAvailableChildren(parentId, childType, gradeId = null) {
        const parentInfo = await this.getObjectiveInfo(parentId);
        if (!parentInfo) {
            throw new Error('Objectif parent introuvable');
        }

        // Déterminer la table des entités et la table des objectifs enfants
        const entityTableMap = {
            'BUSINESS_UNIT': { entityTable: 'business_units', entityIdColumn: 'id', entityNameColumn: 'nom' },
            'DIVISION': { entityTable: 'divisions', entityIdColumn: 'id', entityNameColumn: 'nom' },
            'GRADE': { entityTable: 'grades', entityIdColumn: 'id', entityNameColumn: 'name' },
            'INDIVIDUAL': { entityTable: 'collaborateurs', entityIdColumn: 'id', entityNameColumn: 'nom' }
        };

        const config = entityTableMap[childType];
        if (!config) {
            throw new Error('Type d\'enfant invalide');
        }

        const childTableMap = {
            'BUSINESS_UNIT': 'business_unit_objectives',
            'DIVISION': 'division_objectives',
            'GRADE': 'grade_objectives',
            'INDIVIDUAL': 'individual_objectives'
        };

        const childTable = childTableMap[childType];
        const parentColumnMap = {
            'BUSINESS_UNIT': 'global_objective_id',
            'DIVISION': 'parent_bu_objective_id',
            'GRADE': 'parent_division_objective_id',
            'INDIVIDUAL': 'parent_grade_objective_id'
        };

        const parentColumn = parentColumnMap[childType];

        // Récupérer toutes les entités (avec filtrage selon le parent)
        let entitiesSql = `SELECT ${config.entityIdColumn} as id, ${config.entityNameColumn} as name FROM ${config.entityTable}`;
        const queryParams = [];

        // Filtrer les entités selon la hiérarchie
        if (childType === 'DIVISION' && parentInfo.business_unit_id) {
            // Filtrer les divisions par BU
            entitiesSql += ` WHERE business_unit_id = $1`;
            queryParams.push(parentInfo.business_unit_id);
        } else if (childType === 'INDIVIDUAL') {
            // Pour les collaborateurs, filtrer par division_id (requis) 
            // ET optionnellement par grade_id si fourni
            const conditions = [];

            if (parentInfo.division_id) {
                conditions.push(`division_id = $${queryParams.length + 1}`);
                queryParams.push(parentInfo.division_id);
            }

            // Si un gradeId est fourni, filtrer également par grade
            if (gradeId) {
                conditions.push(`grade_id = $${queryParams.length + 1}`);
                queryParams.push(gradeId);
            }

            if (conditions.length > 0) {
                entitiesSql += ` WHERE ${conditions.join(' AND ')}`;
            }
        }

        const entitiesResult = await query(entitiesSql, queryParams);

        // Récupérer les entités qui ont déjà un objectif lié à ce parent
        const existingSql = `
            SELECT DISTINCT ${childType === 'BUSINESS_UNIT' ? 'business_unit_id' : childType === 'DIVISION' ? 'division_id' : childType === 'GRADE' ? 'grade_id' : 'collaborator_id'} as entity_id
            FROM ${childTable}
            WHERE ${parentColumn} = $1
        `;
        const existingResult = await query(existingSql, [parentId]);
        const existingIds = new Set(existingResult.rows.map(r => r.entity_id));

        // Filtrer les entités disponibles
        const availableChildren = entitiesResult.rows
            .filter(entity => !existingIds.has(entity.id))
            .map(entity => ({
                id: entity.id,
                name: entity.name,
                suggested_title: this.generateChildTitle(
                    parentInfo.description || 'Objectif',
                    childType,
                    entity.name
                )
            }));

        return availableChildren;
    }

    /**
     * Distribuer un objectif à plusieurs enfants
     */
    static async distributeToMultipleChildren(parentObjectiveId, children, userId) {
        const parentInfo = await this.getObjectiveInfo(parentObjectiveId);
        if (!parentInfo) {
            throw new Error('Objectif parent introuvable');
        }

        // Validation métier : Les objectifs MÉTRIQUE ne peuvent pas être affectés aux collaborateurs
        if (parentInfo.type === 'DIVISION' && parentInfo.objective_mode === 'METRIC') {
            throw new Error('Les objectifs en mode MÉTRIQUE ne peuvent pas être distribués aux collaborateurs. Veuillez utiliser un objectif de type TYPE.');
        }

        // Calculer le montant total demandé
        const totalRequested = children.reduce((sum, child) => sum + parseFloat(child.target_value || 0), 0);

        // Récupérer le résumé de distribution
        const summary = await this.getDistributionSummary(parentObjectiveId);

        // Valider que le montant total ne dépasse pas le montant restant
        if (totalRequested > summary.remaining) {
            throw new Error(`Le montant total demandé(${totalRequested}) dépasse le montant restant(${summary.remaining})`);
        }

        // Déterminer le type d'enfant et la table cible (GRADE supprimé de la hiérarchie)
        const childTypeMap = {
            'GLOBAL': { type: 'BUSINESS_UNIT', table: 'business_unit_objectives', entityColumn: 'business_unit_id', parentColumn: 'global_objective_id' },
            'BUSINESS_UNIT': { type: 'DIVISION', table: 'division_objectives', entityColumn: 'division_id', parentColumn: 'parent_bu_objective_id' },
            'DIVISION': { type: 'INDIVIDUAL', table: 'individual_objectives', entityColumn: 'collaborator_id', parentColumn: 'parent_division_objective_id' }
            // GRADE supprimé - affectation directe de DIVISION vers INDIVIDUAL
        };

        const childConfig = childTypeMap[parentInfo.type];
        if (!childConfig) {
            throw new Error('Type de parent invalide pour distribution');
        }

        // Créer les objectifs enfants
        const createdObjectives = [];

        for (const child of children) {
            const title = this.generateChildTitle(
                parentInfo.description || 'Objectif',
                childConfig.type,
                child.entity_name || child.name || 'Entité'
            );

            const sql = `
                INSERT INTO ${childConfig.table} (
            ${childConfig.entityColumn},
                    ${childConfig.parentColumn},
        objective_type_id,
            target_value,
            description,
            weight,
            tracking_type,
            metric_code,
            assigned_by,
            is_cascaded,
            title,
            objective_mode,
            metric_id,
            unit_id
                )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
            `;

            const result = await query(sql, [
                child.entity_id,
                parentObjectiveId,
                parentInfo.objective_type_id,
                child.target_value,
                child.description || parentInfo.description,
                child.weight || 0,
                parentInfo.tracking_type,
                parentInfo.metric_code,
                userId,
                true,
                title,
                parentInfo.objective_mode || 'METRIC',
                parentInfo.metric_id,
                parentInfo.unit_id
            ]);

            const createdObjective = result.rows[0];

            // Initialiser la progression
            await this.initProgress(childConfig.type, createdObjective.id, child.target_value, userId);

            createdObjectives.push({
                ...createdObjective,
                title: title
            });
        }

        return {
            success: true,
            parent_id: parentObjectiveId,
            created_count: createdObjectives.length,
            objectives: createdObjectives,
            summary: await this.getDistributionSummary(parentObjectiveId)
        };
    }
}


module.exports = Objective;
