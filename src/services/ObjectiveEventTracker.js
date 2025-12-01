const { query } = require('../utils/database');
const ObjectiveType = require('../models/ObjectiveType');
const { ENTITY_OPERATIONS } = require('../config/entity-operations-config');

/**
 * Service de tracking automatique des objectifs
 * Intercepte les événements métier et met à jour les objectifs concernés
 */
class ObjectiveEventTracker {
    /**
     * Traite un événement métier et met à jour les objectifs concernés
     * 
     * @param {string} entityType - Type d'entité (OPPORTUNITY, CAMPAIGN, etc.)
     * @param {string} operation - Opération effectuée (CREATED, WON, etc.)
     * @param {object} entityData - Données de l'entité
     * @param {string} fiscalYearId - ID de l'exercice fiscal concerné
     * @returns {Promise<object>} Résumé des mises à jour effectuées
     */
    static async trackEvent(entityType, operation, entityData, fiscalYearId) {
        try {
            console.log(`📊 Tracking event: ${entityType} - ${operation}`);

            // 1. Récupérer les types d'objectifs configurés pour cette entité/opération
            const objectiveTypes = await this.getConfiguredObjectiveTypes(entityType, operation);

            if (objectiveTypes.length === 0) {
                console.log(`No objective types configured for ${entityType} - ${operation}`);
                return { updated: 0, skipped: 0 };
            }

            console.log(`Found ${objectiveTypes.length} objective type(s) to update`);

            // 2. Extraire les champs de contexte (créateur, responsable, BU, division)
            const contextFields = ENTITY_OPERATIONS[entityType]?.contextFields;
            if (!contextFields) {
                console.warn(`No context fields defined for ${entityType}`);
                return { updated: 0, skipped: 0, error: 'No context fields' };
            }

            const context = {
                creator: entityData[contextFields.creator],
                assignee: entityData[contextFields.assignee],
                businessUnit: entityData[contextFields.business_unit],
                division: entityData[contextFields.division]
            };

            // 3. Pour chaque type d'objectif, mettre à jour les objectifs concernés
            let totalUpdated = 0;
            let totalSkipped = 0;

            for (const objType of objectiveTypes) {
                const result = await this.updateObjectivesForType(
                    objType,
                    entityData,
                    context,
                    fiscalYearId
                );
                totalUpdated += result.updated;
                totalSkipped += result.skipped;
            }

            console.log(`✅ Tracking complete: ${totalUpdated} updated, ${totalSkipped} skipped`);

            return {
                updated: totalUpdated,
                skipped: totalSkipped,
                objectiveTypes: objectiveTypes.length
            };

        } catch (error) {
            console.error('Error in trackEvent:', error);
            throw error;
        }
    }

    /**
     * Récupère les types d'objectifs configurés pour une entité/opération donnée
     */
    static async getConfiguredObjectiveTypes(entityType, operation) {
        const sql = `
            SELECT id, code, label, entity_type, operation, value_field, unit
            FROM objective_types
            WHERE entity_type = $1 
            AND operation = $2
            AND is_active = TRUE
        `;

        const result = await query(sql, [entityType, operation]);
        return result.rows;
    }

    /**
     * Met à jour tous les objectifs d'un type donné
     */
    static async updateObjectivesForType(objectiveType, entityData, context, fiscalYearId) {
        try {
            // Extraire la valeur du champ configuré
            const value = this.extractValue(entityData, objectiveType.value_field);

            if (value === null || value === undefined) {
                console.warn(`Cannot extract value from field ${objectiveType.value_field}`);
                return { updated: 0, skipped: 1 };
            }

            // Trouver tous les objectifs concernés (Global, BU, Division, Individual)
            const objectives = await this.findAffectedObjectives(
                objectiveType.id,
                context,
                fiscalYearId
            );

            if (objectives.length === 0) {
                console.log(`No objectives found for type ${objectiveType.label}`);
                return { updated: 0, skipped: 0 };
            }

            // Mettre à jour la progression de chaque objectif
            let updated = 0;
            for (const objective of objectives) {
                await this.incrementObjectiveProgress(
                    objective.level,
                    objective.id,
                    value,
                    entityData.id // Pour traçabilité
                );
                updated++;
            }

            return { updated, skipped: 0 };

        } catch (error) {
            console.error(`Error updating objectives for type ${objectiveType.label}:`, error);
            return { updated: 0, skipped: 1 };
        }
    }

    /**
     * Extrait la valeur d'un champ (supporte les champs imbriqués avec dot notation)
     */
    static extractValue(data, fieldPath) {
        if (!fieldPath) return null;

        // Pour le mode COUNT, retourner 1
        if (fieldPath === 'id') return 1;

        // Support de la notation pointée (ex: "customer.name")
        const parts = fieldPath.split('.');
        let value = data;

        for (const part of parts) {
            if (value === null || value === undefined) return null;
            value = value[part];
        }

        return value;
    }

    /**
     * Trouve tous les objectifs affectés par un événement
     */
    static async findAffectedObjectives(objectiveTypeId, context, fiscalYearId) {
        const objectives = [];

        // 1. Objectifs Globaux
        const globalSql = `
            SELECT 'GLOBAL' as level, id, title, target_value, current_value
            FROM global_objectives
            WHERE objective_type_id = $1
            AND fiscal_year_id = $2
            AND is_active = TRUE
        `;
        const globalResult = await query(globalSql, [objectiveTypeId, fiscalYearId]);
        objectives.push(...globalResult.rows);

        // 2. Objectifs Business Unit (si contexte BU disponible)
        if (context.businessUnit) {
            const buSql = `
                SELECT 'BUSINESS_UNIT' as level, id, title, target_value, current_value
                FROM business_unit_objectives
                WHERE objective_type_id = $1
                AND fiscal_year_id = $2
                AND business_unit_id = $3
                AND is_active = TRUE
            `;
            const buResult = await query(buSql, [objectiveTypeId, fiscalYearId, context.businessUnit]);
            objectives.push(...buResult.rows);
        }

        // 3. Objectifs Division (si contexte division disponible)
        if (context.division) {
            const divSql = `
                SELECT 'DIVISION' as level, id, title, target_value, current_value
                FROM division_objectives
                WHERE objective_type_id = $1
                AND fiscal_year_id = $2
                AND division_id = $3
                AND is_active = TRUE
            `;
            const divResult = await query(divSql, [objectiveTypeId, fiscalYearId, context.division]);
            objectives.push(...divResult.rows);
        }

        // 4. Objectifs Individuels (responsable ou créateur)
        const collaboratorIds = [context.assignee, context.creator].filter(Boolean);
        if (collaboratorIds.length > 0) {
            const indSql = `
                SELECT 'INDIVIDUAL' as level, id, title, target_value, current_value
                FROM individual_objectives
                WHERE objective_type_id = $1
                AND fiscal_year_id = $2
                AND collaborator_id = ANY($3)
                AND is_active = TRUE
            `;
            const indResult = await query(indSql, [objectiveTypeId, fiscalYearId, collaboratorIds]);
            objectives.push(...indResult.rows);
        }

        return objectives;
    }

    /**
     * Incrémente la progression d'un objectif
     */
    static async incrementObjectiveProgress(level, objectiveId, incrementValue, sourceEntityId) {
        const tableMap = {
            'GLOBAL': 'global_objectives',
            'BUSINESS_UNIT': 'business_unit_objectives',
            'DIVISION': 'division_objectives',
            'INDIVIDUAL': 'individual_objectives',
            'GRADE': 'grade_objectives'
        };

        const table = tableMap[level];
        if (!table) {
            throw new Error(`Unknown objective level: ${level}`);
        }

        // Incrémenter current_value et mettre à jour le timestamp
        const sql = `
            UPDATE ${table}
            SET current_value = COALESCE(current_value, 0) + $1,
                updated_at = CURRENT_TIMESTAMP,
                last_update_source = $2
            WHERE id = $3
            RETURNING id, current_value, target_value
        `;

        const result = await query(sql, [incrementValue, sourceEntityId, objectiveId]);

        if (result.rows.length > 0) {
            const obj = result.rows[0];
            console.log(`  ✓ Updated ${level} objective ${objectiveId}: ${obj.current_value}/${obj.target_value}`);

            // Enregistrer dans l'historique de progression
            await this.logProgressHistory(level, objectiveId, incrementValue, sourceEntityId);
        }

        return result.rows[0];
    }

    /**
     * Enregistre l'historique de progression
     */
    static async logProgressHistory(level, objectiveId, value, sourceEntityId) {
        const sql = `
            INSERT INTO objective_progress (
                objective_type,
                objective_id,
                previous_value,
                new_value,
                change_value,
                source_entity_id,
                updated_by
            )
            SELECT 
                $1,
                $2,
                current_value - $3,
                current_value,
                $3,
                $4,
                NULL
            FROM (
                SELECT current_value FROM global_objectives WHERE id = $2
                UNION ALL
                SELECT current_value FROM business_unit_objectives WHERE id = $2
                UNION ALL
                SELECT current_value FROM division_objectives WHERE id = $2
                UNION ALL
                SELECT current_value FROM individual_objectives WHERE id = $2
            ) AS obj
            LIMIT 1
        `;

        try {
            await query(sql, [level, objectiveId, value, sourceEntityId]);
        } catch (error) {
            console.warn('Failed to log progress history:', error.message);
            // Non-bloquant
        }
    }
}

module.exports = ObjectiveEventTracker;
